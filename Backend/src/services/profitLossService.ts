/**
 * Profit/Loss Service — fetches historical prices from Yahoo Finance
 * to calculate real P&L based on user-selected buy dates.
 * 
 * Enhanced: includes 1-Day Change (weighted average) per the Dime! Analytics formula:
 *   portfolioOneDayChangePct = Σ(changePct_i × prevValue_i) / Σ(prevValue_i)
 * 
 * Fresh Dividend Yield: Fetches latest Forward/Trailing Dividend Yield from
 * Yahoo Finance on every P&L calculation to ensure accuracy.
 */
import * as https from 'https';
import { PrismaClient } from '@prisma/client';
import YahooFinance from 'yahoo-finance2';
const prisma = new PrismaClient();
// @ts-ignore
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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
  freshDividendYield: number; // Fresh dividend yield % from Yahoo Finance (Forward or Trailing)
  dividendPerShare: number;   // Annual dividend per share in original currency (Forward or Trailing)
  dividendPerShareCurrency: string; // Currency of DPS ("THB" or "USD")
  historicalCAGR: number;     // Historical CAGR % (5-year trailing, capped at 20%)
}

interface PnlResult {
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPct: number;
  portfolioOneDayChangePct: number;   // Weighted avg 1-day change (%)
  portfolioOneDayChangeTHB: number;   // Total 1-day change amount (THB)
  portfolioWeightedCAGR: number;      // Weighted avg Historical CAGR (%)
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
 * Fetch 5-year trailing CAGR for a symbol.
 * CAGR = (currentPrice / pastPrice) ^ (1/years) - 1
 * Uses monthly interval for efficiency. Capped at 20% to prevent unrealistic projections.
 * Regression to the Mean: blends raw CAGR with long-term market average
 * to reduce bias from recent bull/bear cycles.
 */
async function getHistoricalCAGR(symbol: string, years: number = 5): Promise<number> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const pastTs = Math.floor(now - (years * 365.25 * 86400));
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${pastTs}&period2=${now}&interval=1mo`;

    const data = await fetchJson(url);
    const result = data?.chart?.result?.[0];
    if (!result) return 0;

    const closes: number[] = result.indicators?.quote?.[0]?.close || [];
    if (closes.length < 2) return 0;

    // ราคาแรกที่มี (ใกล้ 5 ปีก่อน) และราคาสุดท้ายที่มี (ปัจจุบัน)
    const pastPrice = closes.find((c: number) => c != null && !isNaN(c));
    const currentPrice = [...closes].reverse().find((c: number) => c != null && !isNaN(c));

    if (!pastPrice || !currentPrice || pastPrice <= 0) return 0;

    // คำนวณจำนวนปีจริง (จาก timestamps) เพื่อความแม่นยำ
    const timestamps: number[] = result.timestamp || [];
    const actualYears = timestamps.length > 1
      ? (timestamps[timestamps.length - 1] - timestamps[0]) / (365.25 * 86400)
      : years;
    if (actualYears < 0.5) return 0; // ข้อมูลน้อยเกินไป

    const rawCAGR = (Math.pow(currentPrice / pastPrice, 1 / actualYears) - 1) * 100;

    // Regression to the Mean: blend raw CAGR กับค่าเฉลี่ยตลาดระยะยาว
    // เพื่อลด bias จากตลาดหมี/กระทิงในช่วง 5 ปีนั้น
    // S&P 500 long-term avg ~10%, SET Index ~7%
    const isThaiAsset = symbol.endsWith('.BK');
    const marketAvg = isThaiAsset ? 7.0 : 10.0;
    const blendedCAGR = rawCAGR * 0.7 + marketAvg * 0.3;

    // Cap at 20% — แทบไม่มีนักลงทุนรักษาผลตอบแทนเกิน 20%/ปี ได้อย่างยั่งยืน
    const cappedCAGR = Math.min(Math.max(blendedCAGR, -20), 20);

    return Math.round(cappedCAGR * 100) / 100; // Round to 2 decimals
  } catch (err) {
    console.error(`[profitLossService] Failed to calculate CAGR for ${symbol}:`, err);
    return 0;
  }
}

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
  const investmentAmount = totalSavings; // Use 100% of the provided savings

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
          freshDividendYield: assetInfo.yield, // Will be updated below
          dividendPerShare: 0,  // Will be updated below
          dividendPerShareCurrency: isUsd ? 'USD' : 'THB',
          historicalCAGR: 0,    // Will be updated below
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
          freshDividendYield: 0,
          dividendPerShare: 0,
          dividendPerShareCurrency: isUsd ? 'USD' : 'THB',
          historicalCAGR: 0,
        });
      }
    })
  );

  // ─── Batch Refresh Dividend Yields from Yahoo Finance ────────────────
  // Uses Forward Dividend Yield (preferred) or Trailing Annual Dividend Yield
  try {
    const symbolMap = new Map<string, string>(); // yahooSymbol -> ourSymbol
    for (const asset of dbAssets) {
      symbolMap.set(getYahooSymbol(asset), asset.symbol);
    }
    const yahooSymbols = Array.from(symbolMap.keys());

    if (yahooSymbols.length > 0) {
      const quotesArray: any[] = [];
      const chunkSize = 5; // Batch in smaller chunks to prevent fetch ETIMEDOUT
      for (let i = 0; i < yahooSymbols.length; i += chunkSize) {
        const chunk = yahooSymbols.slice(i, i + chunkSize);
        try {
          const quotes: any = await yahooFinance.quote(chunk);
          quotesArray.push(...(Array.isArray(quotes) ? quotes : [quotes]));
        } catch (err) {
          console.error(`[profitLossService] Failed to fetch dividend yields for chunk ${chunk.join(',')}:`, err);
        }
      }

      for (const q of quotesArray) {
        if (!q || !q.symbol) continue;
        const ourSymbol = symbolMap.get(q.symbol) || q.symbol.replace('.BK', '');

        // yahoo-finance2 quote() คืนค่า 2 field ที่มี format ต่างกัน:
        //   trailingAnnualDividendYield = decimal   (เช่น 0.0076 = 0.76%)  ← ต้อง ×100
        //   dividendYield               = percentage (เช่น 3.3   = 3.3%)  ← ใช้ตรงๆ
        const trailingYieldPct = (q.trailingAnnualDividendYield || 0) * 100; // decimal → %
        const forwardYieldPct  = q.dividendYield || 0;                       // already %

        let freshYieldPct: number;
        let dps: number;

        // Sanity Check: ป้องกัน Stock Split (เช่น AVGO)
        // ถ้า Trailing สูงกว่า Forward เกิน 3 เท่า → ใช้ Forward แทน
        if (trailingYieldPct > 0 && forwardYieldPct > 0 && trailingYieldPct > forwardYieldPct * 3) {
          freshYieldPct = forwardYieldPct;
          dps = q.dividendRate || q.trailingAnnualDividendRate || 0;
        } else if (trailingYieldPct > 0) {
          // ใช้ Trailing เป็นหลัก (ข้อมูลจริงย้อนหลัง 12 เดือน)
          freshYieldPct = trailingYieldPct;
          dps = q.trailingAnnualDividendRate || q.dividendRate || 0;
        } else {
          // Fallback ไปใช้ Forward
          freshYieldPct = forwardYieldPct;
          dps = q.dividendRate || q.trailingAnnualDividendRate || 0;
        }

        // Hard Limit: yield > 15% มักเป็น data anomaly → fallback ไปใช้ค่าจาก DB
        if (freshYieldPct > 15) {
          freshYieldPct = 0;
          dps = 0;
        }

        // Update in results
        const assetResult = results.find(r => r.id === ourSymbol);
        if (assetResult) {
          assetResult.freshDividendYield = freshYieldPct;
          assetResult.dividendPerShare = dps;
        }

        // Update DB (fire-and-forget)
        if (freshYieldPct > 0) {
          prisma.asset.update({
            where: { symbol: ourSymbol },
            data: { yield: freshYieldPct }
          }).catch(() => {});
        }
      }
    }
    console.log(`[profitLossService] Refreshed dividend yields for ${results.length} assets`);
  } catch (err) {
    console.error('[profitLossService] Failed to refresh dividend yields:', err);
    // Keep the DB yields as fallback — already set above
  }

  // ─── Batch Calculate Historical CAGR per Asset ──────────────────────
  try {
    await Promise.all(
      results.map(async (assetResult) => {
        const assetInfo = dbAssets.find(a => a.symbol === assetResult.id);
        if (!assetInfo) return;
        const symbol = getYahooSymbol(assetInfo);
        assetResult.historicalCAGR = await getHistoricalCAGR(symbol, 5);
      })
    );
    console.log(`[profitLossService] Calculated CAGR for ${results.length} assets`);
  } catch (err) {
    console.error('[profitLossService] Failed to calculate CAGR:', err);
  }

  // Calculate totals
  const totalInvested = results.reduce((s, r) => s + r.invested, 0);
  const totalCurrentValue = results.reduce((s, r) => s + r.currentValue, 0);
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalProfitLossPct = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  // ─── Weighted 1-Day Change ───────────────────────────────────────────
  const totalPreviousValue = results.reduce((s, r) => s + r.previousValue, 0);
  const portfolioOneDayChangePct = totalPreviousValue > 0
    ? results.reduce((s, r) => s + (r.oneDayChangePct * r.previousValue), 0) / totalPreviousValue
    : 0;
  const portfolioOneDayChangeTHB = results.reduce((s, r) => s + r.oneDayChangeTHB, 0);

  // ─── Weighted Portfolio CAGR ────────────────────────────────────────
  // Formula: Σ(CAGR_i × currentValue_i) / Σ(currentValue_i)
  const portfolioWeightedCAGR = totalCurrentValue > 0
    ? results.reduce((s, r) => s + (r.historicalCAGR * r.currentValue), 0) / totalCurrentValue
    : 0;

  return {
    totalInvested,
    totalCurrentValue,
    totalProfitLoss,
    totalProfitLossPct,
    portfolioOneDayChangePct,
    portfolioOneDayChangeTHB,
    portfolioWeightedCAGR: Math.round(portfolioWeightedCAGR * 100) / 100,
    usdThb,
    assets: results,
  };
}
