/**
 * Asset discovery — proactively pulls NEW assets from Yahoo Finance into the Asset table,
 * on top of the ones that already exist (MASTER_ASSETS seed + user-searched assets), so that
 * production has a growing catalog without anyone having to add tickers locally first.
 *
 * Tier-based Ingestion:
 *   - Tier 1: Large Cap & High-Interest NASDAQ/NYSE Leaders & Core ETFs (Highest Priority)
 *   - Tier 2: Mid Cap & Growth / Trending (Secondary Priority)
 *   - Tier 3: Small Cap (Tertiary Priority)
 *
 * Rate limiting & safeguards:
 *   - at most ASSET_DISCOVERY_MAX_PER_RUN new assets are inserted per run (default: 15)
 *   - never grows the table beyond ASSET_DISCOVERY_MAX_TOTAL rows (default: 1000)
 *   - sequential requests with ASSET_DISCOVERY_DELAY_MS between them (default: 800ms)
 *   - the run is aborted after 3 consecutive upstream failures (e.g. 429 / blocked IP)
 *   - symbols that failed are remembered in memory and not retried for 24h
 *   - only one run at a time
 */
import { prisma } from '../prisma';
import {
  fetchDiscoveryCandidates,
  getOrFetchAssetDetails,
  type DiscoveryCandidate,
} from './yahooSearchService';

export interface DiscoveryResult {
  status: 'ok' | 'skipped' | 'aborted' | 'error';
  reason?: string;
  candidates: number;
  added: string[];
  addedDetails: Array<{ symbol: string; tier: number; tierLabel: string; source: string }>;
  byTier: {
    tier1LargeCap: number;
    tier2MidCap: number;
    tier3SmallCap: number;
  };
  failed: string[];
  totalAssets: number;
}

const envInt = (name: string, fallback: number, min = 0): number => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : fallback;
};

const getConfig = () => ({
  enabled: (process.env.ASSET_DISCOVERY_ENABLED ?? 'true').toLowerCase() !== 'false',
  maxPerRun: envInt('ASSET_DISCOVERY_MAX_PER_RUN', 30, 1),
  maxTotal: envInt('ASSET_DISCOVERY_MAX_TOTAL', 10000, 1),
  intervalHours: envInt('ASSET_DISCOVERY_INTERVAL_HOURS', 2, 1),
  delayMs: envInt('ASSET_DISCOVERY_DELAY_MS', 1200, 0),
  startupDelayMs: envInt('ASSET_DISCOVERY_STARTUP_DELAY_MS', 30_000, 0),
});

const FAILED_RETRY_AFTER_MS = 24 * 60 * 60 * 1000; // don't retry a failed symbol for 24h
const MAX_CONSECUTIVE_FAILURES = 3;

const failedAt = new Map<string, number>();
let running = false;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function discoverNewAssets(): Promise<DiscoveryResult> {
  const cfg = getConfig();
  const result: DiscoveryResult = {
    status: 'ok',
    candidates: 0,
    added: [],
    addedDetails: [],
    byTier: { tier1LargeCap: 0, tier2MidCap: 0, tier3SmallCap: 0 },
    failed: [],
    totalAssets: 0,
  };

  if (running) {
    return { ...result, status: 'skipped', reason: 'A discovery run is already in progress' };
  }
  running = true;

  try {
    const totalBefore = await prisma.asset.count();
    result.totalAssets = totalBefore;

    const room = cfg.maxTotal - totalBefore;
    if (room <= 0) {
      return {
        ...result,
        status: 'skipped',
        reason: `Asset table already has ${totalBefore} rows (limit ${cfg.maxTotal})`,
      };
    }
    const budget = Math.min(cfg.maxPerRun, room);

    const candidates: DiscoveryCandidate[] = await fetchDiscoveryCandidates();
    result.candidates = candidates.length;
    if (candidates.length === 0) {
      return { ...result, status: 'aborted', reason: 'Yahoo returned no candidates (blocked or rate limited?)' };
    }

    const existing = new Set(
      (
        await prisma.asset.findMany({
          where: { symbol: { in: candidates.map(c => c.symbol) } },
          select: { symbol: true },
        })
      ).map(a => a.symbol)
    );
    const now = Date.now();

    // Strictly preserve tier ordering: Tier 1 (Large Cap) -> Tier 2 (Mid Cap) -> Tier 3 (Small Cap)
    const fresh = candidates.filter(cand => {
      if (existing.has(cand.symbol)) return false;
      const last = failedAt.get(cand.symbol);
      return !(last && now - last < FAILED_RETRY_AFTER_MS);
    });

    let consecutiveFailures = 0;
    for (const cand of fresh) {
      if (result.added.length >= budget) break;

      try {
        await getOrFetchAssetDetails(cand.symbol, { onlyEquityOrEtf: true });
        result.added.push(cand.symbol);
        result.addedDetails.push({
          symbol: cand.symbol,
          tier: cand.tier,
          tierLabel: cand.tierLabel,
          source: cand.source,
        });

        if (cand.tier === 1) result.byTier.tier1LargeCap++;
        else if (cand.tier === 2) result.byTier.tier2MidCap++;
        else if (cand.tier === 3) result.byTier.tier3SmallCap++;

        consecutiveFailures = 0;
      } catch (error) {
        failedAt.set(cand.symbol, Date.now());
        result.failed.push(cand.symbol);
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          result.status = 'aborted';
          result.reason = `Stopped after ${MAX_CONSECUTIVE_FAILURES} consecutive failures: ${(error as Error).message}`;
          break;
        }
      }

      if (cfg.delayMs > 0) await sleep(cfg.delayMs);
    }

    result.totalAssets = totalBefore + result.added.length;
    console.log(
      `[assetDiscovery] status=${result.status} candidates=${result.candidates} added=${result.added.length} ` +
      `(T1 Large=${result.byTier.tier1LargeCap}, T2 Mid=${result.byTier.tier2MidCap}, T3 Small=${result.byTier.tier3SmallCap}) ` +
      `failed=${result.failed.length} total=${result.totalAssets}/${cfg.maxTotal}` +
      (result.added.length ? ` new=[${result.added.join(',')}]` : '') +
      (result.reason ? ` reason="${result.reason}"` : '')
    );
    return result;
  } catch (error) {
    console.error('[assetDiscovery] run failed:', error);
    return { ...result, status: 'error', reason: (error as Error).message };
  } finally {
    running = false;
  }
}

/**
 * Starts the background job: first run shortly after boot, then every ASSET_DISCOVERY_INTERVAL_HOURS.
 * Timers are unref'd so they never keep the process alive on their own.
 */
export function startAssetDiscoveryScheduler(): void {
  const cfg = getConfig();
  if (!cfg.enabled) {
    console.log('[assetDiscovery] disabled (ASSET_DISCOVERY_ENABLED=false)');
    return;
  }

  console.log(
    `[assetDiscovery] enabled: up to ${cfg.maxPerRun} new assets per run, every ${cfg.intervalHours}h, ` +
    `max ${cfg.maxTotal} assets total (Prioritizing Large Cap -> Mid Cap -> Small Cap)`
  );

  const first = setTimeout(() => { void discoverNewAssets(); }, cfg.startupDelayMs);
  first.unref?.();

  const timer = setInterval(() => { void discoverNewAssets(); }, cfg.intervalHours * 60 * 60 * 1000);
  timer.unref?.();
}
