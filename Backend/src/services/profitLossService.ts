/**
 * Profit/Loss Service — fetches historical prices from Yahoo Finance
 * to calculate real P&L based on user-selected buy dates.
 */
import * as https from 'https';
import { MASTER_ASSETS } from '../data/assets';

// ─── Types ────────────────────────────────────────────────────────────
interface PnlAssetInput {
  id: string;           // Ticker (e.g. PTT, AAPL)
  allocation: number;   // Percentage (0-100)
  buyDate: string;      // ISO date string e.g. "2025-06-01"
}

interface PnlAssetResult {
  id: string;
  name: string;
  category: string;
  buyDate: string;
  costPrice: number;        // Price on buy date (THB)
  currentPrice: number;     // Current price (THB)
  shares: number;           // Number of shares bought
  invested: number;         // Amount invested (THB)
  currentValue: number;     // Current value (THB)
  profitLoss: number;       // Profit/Loss in THB
  profitLossPct: number;    // Profit/Loss in %
  currency: string;         // "THB" or "USD"
  costPriceRaw: number;     // Raw price in original currency
  currentPriceRaw: number;  // Raw price in original currency
}

interface PnlResult {
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPct: number;
  usdThb: number;
  assets: PnlAssetResult[];
}

// ─── Helpers ──────────────────────────────────────────────────────────
const fetchJson = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    https.get(url, {
      family: 4,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Yahoo API error: ${res.statusCode} for ${url}`));
      }
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(rawData)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
};

const getYahooSymbol = (id: string): string => {
  const asset = MASTER_ASSETS.find(a => a.id === id);
  if (!asset) return id;
  if (['thai-stock', 'reit', 'dr'].includes(asset.category)) {
    return `${id}.BK`;
  }
  return id;
};

const isUsdAsset = (id: string): boolean => {
  const asset = MASTER_ASSETS.find(a => a.id === id);
  if (!asset) return false;
  return ['us-stock', 'etf-bond'].includes(asset.category);
};

/**
 * Fetch historical close price for a symbol on/near a specific date.
 * Uses Yahoo Chart API with range from buyDate to buyDate+7 days,
 * daily interval. Takes the first available close price.
 */
async function getHistoricalPrice(symbol: string, buyDate: string): Promise<{ price: number; actualDate: string }> {
  const buyTs = Math.floor(new Date(buyDate).getTime() / 1000);
  // Fetch a 10-day range to handle weekends/holidays
  const endTs = buyTs + 10 * 86400;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${buyTs}&period2=${endTs}&interval=1d`;

  const data = await fetchJson(url);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No chart data for ${symbol}`);

  const timestamps: number[] = result.timestamp || [];
  const closes: number[] = result.indicators?.quote?.[0]?.close || [];

  // Find first valid close price
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null && !isNaN(closes[i])) {
      const d = new Date(timestamps[i] * 1000);
      const dateStr = d.toISOString().split('T')[0];
      return { price: closes[i], actualDate: dateStr };
    }
  }

  throw new Error(`No valid price found for ${symbol} near ${buyDate}`);
}

/**
 * Fetch current price for a symbol via Yahoo Spark API.
 */
async function getCurrentPrice(symbol: string): Promise<number> {
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbol)}&range=1d&interval=1d`;
  const data = await fetchJson(url);
  const item = data?.spark?.result?.[0];
  if (!item?.response?.[0]?.meta?.regularMarketPrice) {
    throw new Error(`No current price for ${symbol}`);
  }
  return item.response[0].meta.regularMarketPrice;
}

// ─── Main Function ────────────────────────────────────────────────────
export async function calculatePortfolioPnl(
  totalSavings: number,
  allocations: PnlAssetInput[]
): Promise<PnlResult> {
  const investmentAmount = totalSavings * 0.4; // 40% of total savings

  // Fetch USD/THB rate
  let usdThb = 33;
  try {
    usdThb = await getCurrentPrice('USDTHB=X');
  } catch (err) {
    console.error('[profitLossService] Failed to fetch USD/THB, using default 33');
  }

  const results: PnlAssetResult[] = [];

  // Process each asset in parallel
  await Promise.all(
    allocations.map(async (alloc) => {
      if (alloc.allocation <= 0 || !alloc.buyDate) return;

      const assetInfo = MASTER_ASSETS.find(a => a.id === alloc.id);
      if (!assetInfo) return;

      const symbol = getYahooSymbol(alloc.id);
      const isUsd = isUsdAsset(alloc.id);
      const invested = investmentAmount * (alloc.allocation / 100);

      try {
        // Fetch historical and current prices in parallel
        const [historical, currentPriceRaw] = await Promise.all([
          getHistoricalPrice(symbol, alloc.buyDate),
          getCurrentPrice(symbol),
        ]);

        const costPriceRaw = historical.price;

        // Convert to THB
        const costPriceTHB = isUsd ? costPriceRaw * usdThb : costPriceRaw;
        const currentPriceTHB = isUsd ? currentPriceRaw * usdThb : currentPriceRaw;

        // Calculate shares and P&L
        const shares = costPriceTHB > 0 ? invested / costPriceTHB : 0;
        const currentValue = shares * currentPriceTHB;
        const profitLoss = currentValue - invested;
        const profitLossPct = invested > 0 ? (profitLoss / invested) * 100 : 0;

        results.push({
          id: alloc.id,
          name: assetInfo.name,
          category: assetInfo.category,
          buyDate: historical.actualDate,
          costPrice: costPriceTHB,
          currentPrice: currentPriceTHB,
          shares,
          invested,
          currentValue,
          profitLoss,
          profitLossPct,
          currency: isUsd ? 'USD' : 'THB',
          costPriceRaw,
          currentPriceRaw,
        });
      } catch (err) {
        console.error(`[profitLossService] Error for ${alloc.id}:`, err);
        // Return zero entry so user sees the asset with an error state
        results.push({
          id: alloc.id,
          name: assetInfo.name,
          category: assetInfo.category,
          buyDate: alloc.buyDate,
          costPrice: 0,
          currentPrice: 0,
          shares: 0,
          invested,
          currentValue: 0,
          profitLoss: 0,
          profitLossPct: 0,
          currency: isUsd ? 'USD' : 'THB',
          costPriceRaw: 0,
          currentPriceRaw: 0,
        });
      }
    })
  );

  // Calculate totals
  const totalInvested = results.reduce((s, r) => s + r.invested, 0);
  const totalCurrentValue = results.reduce((s, r) => s + r.currentValue, 0);
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalProfitLossPct = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  return {
    totalInvested,
    totalCurrentValue,
    totalProfitLoss,
    totalProfitLossPct,
    usdThb,
    assets: results,
  };
}
