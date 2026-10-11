import YahooFinance from 'yahoo-finance2';
import { prisma } from '../prisma';

// @ts-ignore
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const KNOWN_DRS = new Set([
  'AAPL80X', 'MSFT80X', 'GOOG80X', 'TSLA80X', 'NVDA80X', 'AMZN80X', 'META80X', 'NFLX80X',
  'SBUX80X', 'BKNG80X', 'E1VFVN3001', 'FUEVFVND01', 'JAPAN13', 'HK13', 'HK01', 'SP50001',
  'NDX01', 'BABA80', 'BIDU80', 'TENCENT80', 'XIAOMI80', 'BYD80', 'SINGTEL80', 'ASML01', 'TSMC01'
]);

const KNOWN_THAI_REITS = new Set([
  'CPNREIT', 'WHART', 'IMPACT', 'FTREIT', 'DIF', 'JASIF', '3BBIF', 'EGATIF', 'TFFIF',
  'FUTUREPF', 'ALLY', 'INETREIT', 'BAREIT', 'LHHOTEL', 'GVREIT', 'SPRIME', 'CPTGF',
  'TTLPF', 'POPF', 'QHPF', 'CPNCG', 'BKKCP', 'KPNPF', 'URBNPF', 'MIT', 'PROSPECT',
  'AIMIRT', 'AIMCG', 'HYDROGEN', 'GROREIT', 'B-WORK', 'CTARAF', 'ERWPF', 'GAHREIT',
  'HPF', 'KNPF', 'MJLF', 'MNIT', 'MNIT2', 'MNRF', 'M-II', 'M-STOR', 'OHTL', 'PBIF',
  'PPF', 'SIRIP', 'SSPF', 'TCIF', 'TFUND', 'TIF', 'TLHPF', 'TLOGIS', 'TPRIME', 'WHABT'
]);

function mapBetaToRisk(beta?: number): number {
  if (beta === undefined || beta === null) return 7; // Default risk
  if (beta < 0.5) return 3;
  if (beta < 1.0) return 5;
  if (beta < 1.5) return 7;
  return 9; // High volatility
}

export function determineCategory(
  symbol: string,
  country?: string,
  quoteType?: string,
  longName?: string
): 'thai-stock' | 'reit' | 'dr' | 'us-stock' | 'etf-bond' {
  const cleanSym = symbol.replace(/\.BK$/i, '').toUpperCase();
  const text = `${cleanSym} ${longName || ''}`.toLowerCase();

  // 1. DR / DRx Check
  if (KNOWN_DRS.has(cleanSym) || cleanSym.endsWith('80X') || /^[A-Z0-9]+(01|13|80|80X|3001)$/.test(cleanSym)) {
    return 'dr';
  }

  // 2. Thai REIT / Infrastructure Fund Check
  if (
    KNOWN_THAI_REITS.has(cleanSym) ||
    cleanSym.endsWith('REIT') ||
    cleanSym.endsWith('IF') ||
    cleanSym.endsWith('PF') ||
    cleanSym.endsWith('GF') ||
    (country === 'Thailand' && text.includes('reit'))
  ) {
    return 'reit';
  }

  // 3. Thai Stock Check
  if (symbol.endsWith('.BK') || country === 'Thailand') {
    return 'thai-stock';
  }

  // 4. ETF / Bond Check
  if (
    quoteType === 'ETF' ||
    text.includes('etf') ||
    text.includes('treasury') ||
    text.includes('bond') ||
    (text.includes('trust') && text.includes('index'))
  ) {
    return 'etf-bond';
  }

  // 5. Default US / Foreign Equity
  return 'us-stock';
}

/**
 * Translates Yahoo Finance sector & industry into a clear Thai sector name.
 */
export function mapSectorToThai(
  rawSector?: string,
  quoteType?: string,
  name?: string,
  industry?: string
): string {
  if (quoteType === 'ETF') {
    const text = `${name || ''} ${rawSector || ''} ${industry || ''}`.toLowerCase();
    if (text.includes('bond') || text.includes('treasury') || text.includes('fixed income') || text.includes('debt') || text.includes('yield')) {
      return 'กองทุนตราสารหนี้';
    }
    if (text.includes('gold') || text.includes('silver') || text.includes('commodity') || text.includes('oil')) {
      return 'กองทุนสินค้าโภคภัณฑ์';
    }
    if (text.includes('real estate') || text.includes('reit')) {
      return 'กองทุนอสังหาริมทรัพย์';
    }
    if (text.includes('index') || text.includes('500') || text.includes('nasdaq') || text.includes('dow') || text.includes('russell') || text.includes('total market')) {
      return 'กองทุนดัชนี';
    }
    return 'กองทุน ETF';
  }

  // Refine by Industry if available
  if (industry) {
    const ind = industry.toLowerCase();
    if (ind.includes('semiconductor')) return 'เซมิคอนดักเตอร์';
    if (ind.includes('software - application') || ind.includes('software - infrastructure') || ind.includes('software')) return 'ซอฟต์แวร์';
    if (ind.includes('auto manufacturers') || ind.includes('automotive')) return 'ยานยนต์';
    if (ind.includes('biotechnology') || ind.includes('drug manufacturers')) return 'การแพทย์/ยา';
    if (ind.includes('internet content') || ind.includes('internet retail')) return 'อินเทอร์เน็ต/อีคอมเมิร์ซ';
    if (ind.includes('banks') || ind.includes('banking')) return 'การธนาคาร';
    if (ind.includes('credit services')) return 'การเงิน/บัตรเครดิต';
    if (ind.includes('insurance')) return 'ประกันภัย';
    if (ind.includes('cybersecurity')) return 'ความปลอดภัยไซเบอร์';
    if (ind.includes('aerospace') || ind.includes('defense')) return 'กลาโหม/อากาศยาน';
  }

  if (!rawSector || rawSector.trim() === '' || rawSector === 'Unknown') {
    return 'อื่นๆ';
  }

  const s = rawSector.trim().toLowerCase();
  if (s.includes('technology') || s.includes('information technology')) return 'เทคโนโลยี';
  if (s.includes('financial services') || s.includes('financials') || s.includes('financial') || s.includes('banking')) return 'การเงิน';
  if (s.includes('healthcare') || s.includes('health care') || s.includes('pharmaceutical')) return 'การแพทย์และสุขภาพ';
  if (s.includes('consumer cyclical') || s.includes('consumer discretionary')) return 'สินค้าฟุ่มเฟือย/บริการ';
  if (s.includes('consumer defensive') || s.includes('consumer staples')) return 'สินค้าอุปโภคบริโภค';
  if (s.includes('energy') || s.includes('oil') || s.includes('gas')) return 'พลังงาน';
  if (s.includes('industrials') || s.includes('industrial')) return 'อุตสาหกรรม';
  if (s.includes('basic materials') || s.includes('materials')) return 'วัสดุพื้นฐาน';
  if (s.includes('communication services') || s.includes('telecommunication') || s.includes('communications')) return 'สื่อสารและโทรคมนาคม';
  if (s.includes('real estate') || s.includes('reit')) return 'อสังหาริมทรัพย์';
  if (s.includes('utilities') || s.includes('utility')) return 'สาธารณูปโภค';

  // If already in Thai characters, keep it
  if (/[\u0E00-\u0E7F]/.test(rawSector)) {
    return rawSector;
  }

  return rawSector;
}

function determineBadge(yieldPct: number, sector: string): string {
  if (yieldPct >= 4.0) return 'div'; // High dividend
  const sec = sector.toLowerCase();
  if (
    sec.includes('technology') ||
    sec.includes('tech') ||
    sec.includes('เทคโนโลยี') ||
    sec.includes('ซอฟต์แวร์') ||
    sec.includes('เซมิคอนดักเตอร์') ||
    sec.includes('healthcare') ||
    sec.includes('การแพทย์')
  ) {
    return 'growth';
  }
  return 'alt';
}

export const searchAssets = async (query: string) => {
  try {
    const results: any = await yahooFinance.search(query, { quotesCount: 10 });
    
    if (!results.quotes || results.quotes.length === 0) {
      return [];
    }

    // Filter to only equities/ETFs
    return results.quotes
      .filter((q: any) => q.isYahooFinance === true && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
      .map((q: any) => {
        const rawSym = q.symbol || '';
        const cleanSym = rawSym.replace(/\.BK$/i, '').toUpperCase();
        return {
          symbol: cleanSym,
          rawSymbol: rawSym,
          name: q.shortname || q.longname || cleanSym,
          exchange: q.exchDisp,
          type: q.quoteType
        };
      });
  } catch (error) {
    console.error("Error searching Yahoo Finance:", error);
    throw new Error("Failed to search assets");
  }
};

export const getOrFetchAssetDetails = async (rawSymbol: string, opts?: { onlyEquityOrEtf?: boolean }) => {
  try {
    const cleanSymbol = rawSymbol.trim().toUpperCase().replace(/\.BK$/i, '');

    // 1. Check if we already have it in DB
    const existingAsset = await prisma.asset.findUnique({
      where: { symbol: cleanSymbol }
    });
    
    if (existingAsset) {
      return existingAsset;
    }

    // 2. Fetch from yahoo-finance2
    const isExplicitBk = rawSymbol.trim().toUpperCase().endsWith('.BK');
    const isThaiCandidate = isExplicitBk || KNOWN_THAI_REITS.has(cleanSymbol) || KNOWN_DRS.has(cleanSymbol);

    let lookupSymbol = isThaiCandidate && !cleanSymbol.endsWith('80X') ? `${cleanSymbol}.BK` : cleanSymbol;
    let result: any = null;

    try {
      result = await yahooFinance.quoteSummary(
        lookupSymbol,
        { modules: ['assetProfile', 'defaultKeyStatistics', 'summaryDetail', 'price'] },
        { validateResult: false }
      );
    } catch (firstErr) {
      // If direct lookup without .BK failed, retry with .BK (e.g. Thai stocks queried with clean symbol)
      if (!lookupSymbol.endsWith('.BK')) {
        try {
          lookupSymbol = `${cleanSymbol}.BK`;
          result = await yahooFinance.quoteSummary(
            lookupSymbol,
            { modules: ['assetProfile', 'defaultKeyStatistics', 'summaryDetail', 'price'] },
            { validateResult: false }
          );
        } catch (secondErr) {
          throw firstErr;
        }
      } else {
        throw firstErr;
      }
    }
    
    if (!result) {
      throw new Error(`Asset details not found for ${rawSymbol}`);
    }

    const profile = result.assetProfile || {};
    const stats = result.defaultKeyStatistics || {};
    const detail = result.summaryDetail || {};
    const price = result.price || {};

    if (opts?.onlyEquityOrEtf && price.quoteType !== 'EQUITY' && price.quoteType !== 'ETF') {
      throw new Error(`Unsupported quote type for ${rawSymbol}: ${price.quoteType}`);
    }

    const name = price.shortName || price.longName || cleanSymbol;
    const country = profile.country;
    const rawSector = profile.sector;
    const industry = profile.industry;
    const sector = mapSectorToThai(rawSector, price.quoteType, name, industry);

    const beta = stats.beta || stats.beta3Year;
    const divYieldRaw = detail.dividendYield || detail.trailingAnnualDividendYield || 0;
    
    const yieldPct = Number((divYieldRaw * 100).toFixed(2));
    const risk = mapBetaToRisk(beta);
    const category = determineCategory(lookupSymbol, country, price.quoteType, name);
    const taxBase = category === 'thai-stock' || category === 'reit' ? 20 : 0;
    const paysDividend = yieldPct > 0;
    const badge = determineBadge(yieldPct, sector);

    // 3. Save to DB strictly with cleanSymbol (never with .BK suffix)
    try {
      const newAsset = await prisma.asset.create({
        data: {
          symbol: cleanSymbol,
          name,
          sector,
          category,
          yield: yieldPct,
          risk,
          badge,
          taxBase,
          paysDividend
        }
      });

      console.log(`[yahooSearchService] Cached new asset: ${cleanSymbol} (${category} | ${sector})`);
      return newAsset;
    } catch (createError: any) {
      if (createError?.code === 'P2002') {
        const raced = await prisma.asset.findUnique({ where: { symbol: cleanSymbol } });
        if (raced) return raced;
      }
      throw createError;
    }

  } catch (error) {
    console.error(`Error fetching details for ${rawSymbol}:`, error);
    throw error;
  }
};

export type AssetTier = 1 | 2 | 3;
export type AssetTierLabel = 'Large Cap' | 'Mid Cap' | 'Small Cap';

export interface DiscoveryCandidate {
  symbol: string;
  tier: AssetTier;
  tierLabel: AssetTierLabel;
  source: string;
}

/**
 * Curated Top NASDAQ & NYSE Large/Mega-Caps (First priority in Tier 1).
 */
const CURATED_NASDAQ_NYSE_LARGE_CAPS = [
  // Mega / Large Cap Tech & Leaders
  'NVDA', 'MSFT', 'AAPL', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSLA', 'AVGO', 'ORCL',
  'ASML', 'TSM', 'CSCO', 'ADBE', 'CRM', 'AMD', 'NFLX', 'INTC', 'QCOM', 'TXN',
  'AMAT', 'INTU', 'IBM', 'NOW', 'AMGN', 'PANW', 'MU', 'LRCX', 'KLAC', 'SNPS',
  'CDNS', 'ADI', 'NXPI', 'MAR', 'ABNB', 'CRWD', 'PLTR', 'DELL', 'APP', 'ARM',
  'DASH', 'SMCI',
  // Finance, Healthcare, Industrial, Consumer Giants (NYSE & NASDAQ)
  'BRK-B', 'LLY', 'JPM', 'V', 'UNH', 'XOM', 'MA', 'JNJ', 'PG', 'HD',
  'COST', 'ABBV', 'MRK', 'WMT', 'BAC', 'MCD', 'ACN', 'PEP', 'KO', 'TMO',
  'LIN', 'DIS', 'CVX', 'PM', 'WFC', 'GE', 'CAT', 'RTX', 'MS', 'GS',
  'BLK', 'BKNG', 'ISRG', 'UNP', 'SCHW', 'SYK', 'TJX', 'VRTX', 'BSX', 'MDT',
  'PGR', 'GILD', 'CB', 'C', 'HON', 'ADP', 'COP', 'BAX'
];

/**
 * Curated Global Benchmark ETFs (Second priority in Tier 1).
 */
const CURATED_GLOBAL_ETFS = [
  'SPY', 'QQQ', 'VOO', 'IVV', 'DIA', 'IWM', 'VTI', 'SCHD', 'VIG', 'XLK',
  'XLF', 'XLE', 'XLV', 'XLI', 'XLY', 'XLP', 'XLU', 'XLB', 'VNQ', 'SMH',
  'SOXX', 'ARKK', 'VEA', 'VWO', 'EEM', 'BND', 'TLT', 'IEF', 'SHY', 'AGG',
  'LQD', 'HYG', 'GLD', 'IAU', 'SLV', 'VT', 'VXUS', 'JEPI', 'JEPQ'
];

/**
 * Curated Top Thai DRs & DRx (Second priority in Tier 1 - stored as clean symbols).
 */
const CURATED_THAI_DRS = [
  'AAPL80X', 'NVDA80X', 'MSFT80X', 'GOOG80X', 'TSLA80X', 'AMZN80X', 'META80X', 'NFLX80X',
  'SBUX80X', 'BKNG80X', 'E1VFVN3001', 'FUEVFVND01', 'JAPAN13', 'HK13', 'HK01',
  'SP50001', 'NDX01', 'BABA80', 'BIDU80', 'TENCENT80', 'XIAOMI80', 'BYD80',
  'SINGTEL80', 'ASML01', 'TSMC01'
];

/**
 * Curated Top Thai Equities & REITs/IFF (Last priority in Tier 1 - stored as clean symbols).
 */
const CURATED_THAI_BLUECHIPS_AND_REITS = [
  'PTT', 'CPALL', 'ADVANC', 'DELTA', 'GULF', 'AOT', 'BDMS', 'BH',
  'SCB', 'KBANK', 'KTB', 'BBL', 'CPN', 'MINT', 'TRUE', 'INTUCH',
  'CRC', 'TISCO', 'TOP', 'OR', 'HMPRO', 'GLOBAL', 'GPSC', 'BGRIM',
  'KCE', 'HANA', 'WHA', 'AMATA', 'BEM', 'BTS', 'CPF', 'TU',
  'TLI', 'BLA', 'SIRI', 'SPALI', 'AP', 'LH', 'ORI', 'IVL',
  'BCP', 'BCPG', 'GUNKUL', 'SCGP', 'CENTEL', 'ERW', 'COM7', 'SYNEX',
  'KTC', 'JMT', 'BAM', 'MTC', 'SAWAD', 'TIDLOR', 'BA', 'AAV',
  // REITs / IFF
  'CPNREIT', 'WHART', 'IMPACT', 'FTREIT', 'DIF', 'JASIF', '3BBIF',
  'EGATIF', 'TFFIF', 'FUTUREPF', 'ALLY', 'INETREIT', 'BAREIT', 'LHHOTEL',
  'GVREIT', 'SPRIME', 'AIMIRT', 'AIMCG', 'HYDROGEN', 'PROSPECT', 'TPRIME', 'WHABT'
];

/**
 * Ranked discovery candidates grouped by Tier across all categories:
 *   Priority in each Tier:
 *     1. NASDAQ & NYSE US Equities (FIRST)
 *     2. Global ETFs & Foreign DRs (SECOND)
 *     3. Thai SET/MAI & Thai REITs (LAST)
 */
export const fetchDiscoveryCandidates = async (): Promise<DiscoveryCandidate[]> => {
  const ALLOWED_EXCHANGES = new Set(['NMS', 'NYQ', 'NGM', 'NCM', 'ASE', 'PCX', 'BTS', 'SET', 'MAI']);
  const SYMBOL_RE = /^[A-Z0-9]{1,12}(\.[A-Z]{2}|-[A-Z])?$/;
  const seen = new Set<string>();
  const candidates: DiscoveryCandidate[] = [];

  const add = (tier: AssetTier, tierLabel: AssetTierLabel, source: string, item: any) => {
    let sym = typeof item === 'string' ? item.toUpperCase() : item?.symbol?.toUpperCase();
    if (!sym) return;
    sym = sym.replace(/\.BK$/i, ''); // Strip .BK suffix from all candidates
    if (seen.has(sym)) return;
    if (typeof item === 'object' && item !== null) {
      if (item.quoteType && item.quoteType !== 'EQUITY' && item.quoteType !== 'ETF') return;
      if (item.exchange && !ALLOWED_EXCHANGES.has(item.exchange)) return;
    }
    if (!SYMBOL_RE.test(sym)) return;
    seen.add(sym);
    candidates.push({ symbol: sym, tier, tierLabel, source });
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // TIER 1 (LARGE CAP)
  // ══════════════════════════════════════════════════════════════════════════════

  // 1.1 NASDAQ & NYSE Large Caps (Top Priority)
  for (const sym of CURATED_NASDAQ_NYSE_LARGE_CAPS) {
    add(1, 'Large Cap', 'curated_us_large_cap', sym);
  }

  // 1.2 Yahoo Tier 1 Screeners (NASDAQ / NYSE Large Caps)
  const tier1Screeners = ['undervalued_large_caps', 'most_actives', 'growth_technology_stocks'];
  for (const scr of tier1Screeners) {
    try {
      const res: any = await yahooFinance.screener({ scrIds: scr, count: 50 } as any, undefined, { validateResult: false } as any);
      (res?.quotes || []).forEach((q: any) => add(1, 'Large Cap', `screener:${scr}`, q));
    } catch (e) {
      console.warn(`[assetDiscovery] Tier 1 screener ${scr} failed:`, (e as Error).message);
    }
  }

  // 1.3 Other Global Markets / ETFs & DRs (Second Priority in Tier 1)
  for (const sym of CURATED_GLOBAL_ETFS) {
    add(1, 'Large Cap', 'curated_global_etf', sym);
  }
  for (const sym of CURATED_THAI_DRS) {
    add(1, 'Large Cap', 'curated_dr', sym);
  }

  // 1.4 Thai Bluechips & REITs (Last Priority in Tier 1)
  for (const sym of CURATED_THAI_BLUECHIPS_AND_REITS) {
    add(1, 'Large Cap', 'curated_thai', sym);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TIER 2 (MID CAP)
  // ══════════════════════════════════════════════════════════════════════════════

  // 2.1 US Mid Caps (Top Priority in Tier 2)
  const tier2Screeners = ['undervalued_growth_stocks', 'day_gainers'];
  for (const scr of tier2Screeners) {
    try {
      const res: any = await yahooFinance.screener({ scrIds: scr, count: 50 } as any, undefined, { validateResult: false } as any);
      (res?.quotes || []).forEach((q: any) => add(2, 'Mid Cap', `screener:${scr}`, q));
    } catch (e) {
      console.warn(`[assetDiscovery] Tier 2 screener ${scr} failed:`, (e as Error).message);
    }
  }

  try {
    const tr: any = await yahooFinance.trendingSymbols('US', { count: 40 } as any, { validateResult: false } as any);
    (tr?.quotes || []).forEach((q: any) => add(2, 'Mid Cap', 'trending:US', q));
  } catch (e) {
    console.warn('[assetDiscovery] Trending symbols failed:', (e as Error).message);
  }

  // 2.2 Other Global Funds (Second Priority in Tier 2)
  try {
    const res: any = await yahooFinance.screener({ scrIds: 'top_mutual_funds', count: 50 } as any, undefined, { validateResult: false } as any);
    (res?.quotes || []).forEach((q: any) => add(2, 'Mid Cap', 'screener:top_mutual_funds', q));
  } catch (e) {
    console.warn('[assetDiscovery] Tier 2 screener top_mutual_funds failed:', (e as Error).message);
  }

  // 2.3 Thai Mid Caps (Last Priority in Tier 2)
  const THAI_MID_CAPS = [
    'MEGA', 'STA', 'STGT', 'SAPPE', 'ICHI', 'TKN', 'DOHOME', 'ILM',
    'KAMART', 'KLINIQ', 'MASTER', 'CHAYO', 'AEONTS', 'STANLY', 'AH',
    'SJWD', 'III', 'WARRIX', 'MEB', 'NSL', 'SNNP', 'COCOCO'
  ];
  for (const sym of THAI_MID_CAPS) {
    add(2, 'Mid Cap', 'curated_thai_mid', sym);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TIER 3 (SMALL CAP)
  // ══════════════════════════════════════════════════════════════════════════════

  // 3.1 US Small Caps (Top Priority in Tier 3)
  const tier3Screeners = ['small_cap_gainers', 'aggressive_small_caps'];
  for (const scr of tier3Screeners) {
    try {
      const res: any = await yahooFinance.screener({ scrIds: scr, count: 50 } as any, undefined, { validateResult: false } as any);
      (res?.quotes || []).forEach((q: any) => add(3, 'Small Cap', `screener:${scr}`, q));
    } catch (e) {
      console.warn(`[assetDiscovery] Tier 3 screener ${scr} failed:`, (e as Error).message);
    }
  }

  // 3.2 Global High Yield (Second Priority in Tier 3)
  try {
    const res: any = await yahooFinance.screener({ scrIds: 'high_yield_bond', count: 50 } as any, undefined, { validateResult: false } as any);
    (res?.quotes || []).forEach((q: any) => add(3, 'Small Cap', 'screener:high_yield_bond', q));
  } catch (e) {
    console.warn('[assetDiscovery] Tier 3 screener high_yield_bond failed:', (e as Error).message);
  }

  return candidates;
};
