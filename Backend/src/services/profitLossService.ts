/**
 * Profit/Loss Service — fetches historical prices from Yahoo Finance
 * to calculate real P&L based on user-selected buy dates.
 * 
 * Enhanced: includes 1-Day Change (weighted average) per the Dime! Analytics formula:
 *   portfolioOneDayChangePct = Σ(changePct_i × prevValue_i) / Σ(prevValue_i)
 */
import * as https from 'https';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ─── Types ────────────────────────────────────────────────────────────
interface PnlTransactionInput {
  allocation: number;   // Percentage (0-100)
  buyDate: string;      // ISO date string e.g. "2025-06-01"
}

interface PnlAssetInput {
  id: string;           // Ticker (e.g. PTT, AAPL)
  transactions: PnlTransactionInput[];
}

interface PnlAssetResult {
  id: string;
  name: string;
  category: string;
  buyDate: string;
  costPrice: number;          // Price on buy date (THB)
  currentPrice: number;       // Current price (THB)
  previousClose: number;      // Previous day close price (THB)
  shares: number;             // Number of shares bought
  invested: number;           // Amount invested (THB)
  currentValue: number;       // Current value (THB)
  previousValue: number;      // Value at previous close (THB) = shares × previousClose
  profitLoss: number;         // Profit/Loss since buy date (THB)
  profitLossPct: number;      // Profit/Loss since buy date (%)
  oneDayChangePct: number;    // 1-day change (%) = (current - prevClose) / prevClose
  oneDayChangeTHB: number;    // 1-day change amount (THB) = currentValue - previousValue
  currency: string;           // "THB" or "USD"
  costPriceRaw: number;       // Raw cost price in original currency
  currentPriceRaw: number;    // Raw current price in original currency
  previousCloseRaw: number;   // Raw previous close in original currency
}

interface PnlResult {
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPct: number;
  portfolioOneDayChangePct: number;   // Weighted avg 1-day change (%)
  portfolioOneDayChangeTHB: number;   // Total 1-day change amount (THB)
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

const getYahooSymbol = (asset: { category: string; symbol: string } | undefined): string => {
  if (!asset) return '';
  if (['thai-stock', 'reit', 'dr'].includes(asset.category)) {
    return `${asset.symbol}.BK`;
  }
  return asset.symbol;
};

const isUsdAsset = (asset: { category: string } | undefined): boolean => {
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
 * Fetch current price AND previous close for a symbol via Yahoo Spark API.
 * Returns both regularMarketPrice and chartPreviousClose.
 */
async function getCurrentPriceWithPrevClose(symbol: string): Promise<{ price: number; previousClose: number }> {
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbol)}&range=1d&interval=1d`;
  const data = await fetchJson(url);
  const item = data?.spark?.result?.[0];
  if (!item?.response?.[0]?.meta?.regularMarketPrice) {
    throw new Error(`No current price for ${symbol}`);
  }
  const meta = item.response[0].meta;
  const price = meta.regularMarketPrice;
  const previousClose = meta.chartPreviousClose || price; // Fallback to current if unavailable
  return { price, previousClose };
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
    const usdThbData = await getCurrentPriceWithPrevClose('USDTHB=X');
    usdThb = usdThbData.price;
  } catch (err) {
    console.error('[profitLossService] Failed to fetch USD/THB, using default 33');
  }

  const dbAssets = await prisma.asset.findMany({
    where: { symbol: { in: allocations.map(a => a.id) } }
  });

  const results: PnlAssetResult[] = [];

  // Process each asset in parallel
  await Promise.all(
    allocations.map(async (alloc) => {
      if (!alloc.transactions || alloc.transactions.length === 0) return;

      const assetInfo = dbAssets.find(a => a.symbol === alloc.id);
      if (!assetInfo) return;

      const symbol = getYahooSymbol(assetInfo);
      const isUsd = isUsdAsset(assetInfo);

      try {
        // Fetch current price
        const currentData = await getCurrentPriceWithPrevClose(symbol);
        const currentPriceRaw = currentData.price;
        const previousCloseRaw = currentData.previousClose;

        // Convert current to THB
        const currentPriceTHB = isUsd ? currentPriceRaw * usdThb : currentPriceRaw;
        const previousCloseTHB = isUsd ? previousCloseRaw * usdThb : previousCloseRaw;

        let totalShares = 0;
        let totalInvestedTHB = 0;
        let totalCostRaw = 0; // Weighted avg cost in original currency

        // Process all transactions
        await Promise.all(alloc.transactions.map(async (txn) => {
          if (txn.allocation <= 0 || !txn.buyDate) return;
          const invested = investmentAmount * (txn.allocation / 100);
          
          try {
            const historical = await getHistoricalPrice(symbol, txn.buyDate);
            const costPriceRaw = historical.price;
            const costPriceTHB = isUsd ? costPriceRaw * usdThb : costPriceRaw;
            
            const shares = costPriceTHB > 0 ? invested / costPriceTHB : 0;
            
            totalShares += shares;
            totalInvestedTHB += invested;
            totalCostRaw += (costPriceRaw * shares);
          } catch (err) {
            console.error(`[profitLossService] Error fetching historical price for ${symbol} on ${txn.buyDate}:`, err);
            // Ignore this transaction if it fails, or maybe record it with 0 shares
          }
        }));

        if (totalShares === 0) {
          throw new Error("No valid transactions found");
        }

        const avgCostPriceTHB = totalInvestedTHB / totalShares;
        const avgCostPriceRaw = totalCostRaw / totalShares;

        // Calculate values based on aggregated totals
        const currentValue = totalShares * currentPriceTHB;
        const previousValue = totalShares * previousCloseTHB;
        const profitLoss = currentValue - totalInvestedTHB;
        const profitLossPct = totalInvestedTHB > 0 ? (profitLoss / totalInvestedTHB) * 100 : 0;

        // 1-Day change
        const oneDayChangePct = previousCloseRaw > 0
          ? ((currentPriceRaw - previousCloseRaw) / previousCloseRaw) * 100
          : 0;
        const oneDayChangeTHB = currentValue - previousValue;

        // For display purposes, pick the first valid buyDate or indicate DCA
        const displayDate = alloc.transactions.length > 1 
          ? "หลายรายการ (DCA)" 
          : alloc.transactions[0].buyDate;

        results.push({
          id: alloc.id,
          name: assetInfo.name,
          category: assetInfo.category,
          buyDate: displayDate,
          costPrice: avgCostPriceTHB,
          currentPrice: currentPriceTHB,
          previousClose: previousCloseTHB,
          shares: totalShares,
          invested: totalInvestedTHB,
          currentValue,
          previousValue,
          profitLoss,
          profitLossPct,
          oneDayChangePct,
          oneDayChangeTHB,
          currency: isUsd ? 'USD' : 'THB',
          costPriceRaw: avgCostPriceRaw,
          currentPriceRaw,
          previousCloseRaw,
        });
      } catch (err) {
        console.error(`[profitLossService] Error for ${alloc.id}:`, err);
        results.push({
          id: alloc.id,
          name: assetInfo.name,
          category: assetInfo.category,
          buyDate: alloc.transactions[0]?.buyDate || "",
          costPrice: 0,
          currentPrice: 0,
          previousClose: 0,
          shares: 0,
          invested: alloc.transactions.reduce((s, t) => s + (investmentAmount * (t.allocation / 100)), 0),
          currentValue: 0,
          previousValue: 0,
          profitLoss: 0,
          profitLossPct: 0,
          oneDayChangePct: 0,
          oneDayChangeTHB: 0,
          currency: isUsd ? 'USD' : 'THB',
          costPriceRaw: 0,
          currentPriceRaw: 0,
          previousCloseRaw: 0,
        });
      }
    })
  );

  // Calculate totals
  const totalInvested = results.reduce((s, r) => s + r.invested, 0);
  const totalCurrentValue = results.reduce((s, r) => s + r.currentValue, 0);
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalProfitLossPct = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  // ─── Weighted 1-Day Change ───────────────────────────────────────────
  // Formula: Σ(oneDayChangePct_i × previousValue_i) / Σ(previousValue_i)
  // Example: (15% × 200 + 20% × 100) / (200 + 100) = 16.67%
  const totalPreviousValue = results.reduce((s, r) => s + r.previousValue, 0);
  const portfolioOneDayChangePct = totalPreviousValue > 0
    ? results.reduce((s, r) => s + (r.oneDayChangePct * r.previousValue), 0) / totalPreviousValue
    : 0;
  const portfolioOneDayChangeTHB = results.reduce((s, r) => s + r.oneDayChangeTHB, 0);

  return {
    totalInvested,
    totalCurrentValue,
    totalProfitLoss,
    totalProfitLossPct,
    portfolioOneDayChangePct,
    portfolioOneDayChangeTHB,
    usdThb,
    assets: results,
  };
}
