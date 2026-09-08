import { prisma } from '../prisma';
import * as https from 'https';

// ─── DRx underlying US stock symbol map ──────────────────────────────────────
// DRx are Thai certificates representing fractional ownership in US stocks.
// Price = US stock price * USDTHB rate * (1/80) = US stock price * USDTHB / 80
// We derive DRx prices from Yahoo Finance US quotes to avoid SET scraping.
const DRX_UNDERLYING: Record<string, string> = {
  'AAPL80X': 'AAPL',
  'MSFT80X': 'MSFT',
  'GOOG80X': 'GOOG',
  'TSLA80X': 'TSLA',
  'NVDA80X': 'NVDA',
  'AMZN80X': 'AMZN',
  'META80X': 'META',
  'NFLX80X': 'NFLX',
  'SBUX80X': 'SBUX',
  'BKNG80X': 'BKNG',
};

const fetchJson = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
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
        try { resolve(JSON.parse(rawData)); } catch(e) { reject(e); }
      });
    });
    req.setTimeout(10000, () => req.destroy(new Error(`Timeout for ${url}`)));
    req.on('error', reject);
  });
};

let cache = {
  data: {} as Record<string, { price: number; changePercent: number }>,
  lastFetch: 0
};

const CACHE_DURATION = 60 * 1000; // 1 minute

export const getMarketData = async () => {
  if (Date.now() - cache.lastFetch < CACHE_DURATION && Object.keys(cache.data).length > 0) {
    return cache.data;
  }

  const allAssets = await prisma.asset.findMany();

  // Build Yahoo query symbols
  // - thai-stock, reit: add .BK
  // - dr: add .BK (Yahoo has some DR like NDX01.BK, JAPAN13.BK, BABA80.BK)
  // - DRx (80X suffix): skip from direct query; will derive from US stock price
  // - us-stock, etf-bond: use symbol as-is
  const symbolsMap = new Map<string, string>(); // yahoo_symbol -> our DB symbol
  const drxAssets: string[] = []; // DB symbols for DRx (will compute from US stock)

  const querySymbols: string[] = [];

  for (const asset of allAssets) {
    if (asset.symbol in DRX_UNDERLYING) {
      // DRx: don't add to direct query; we'll derive price from underlying
      drxAssets.push(asset.symbol);
    } else if (['thai-stock', 'reit', 'dr'].includes(asset.category)) {
      const sym = `${asset.symbol}.BK`;
      symbolsMap.set(sym, asset.symbol);
      querySymbols.push(sym);
    } else {
      // us-stock, etf-bond, etc.
      symbolsMap.set(asset.symbol, asset.symbol);
      querySymbols.push(asset.symbol);
    }
  }

  // Also need underlying US stocks for DRx computation
  const underlyingSet = new Set(Object.values(DRX_UNDERLYING));
  const underlyingSymbols = Array.from(underlyingSet);
  for (const us of underlyingSymbols) {
    if (!symbolsMap.has(us)) {
      symbolsMap.set(us, us); // temporary key, won't be in allAssets
      querySymbols.push(us);
    }
  }

  const currencySymbol = 'USDTHB=X';
  querySymbols.push(currencySymbol);

  const rawPrices: Record<string, { price: number; changePercent: number }> = {};

  try {
    const chunkSize = 20;

    for (let i = 0; i < querySymbols.length; i += chunkSize) {
      const chunk = querySymbols.slice(i, i + chunkSize);
      const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(chunk.join(','))}&range=1d&interval=1d`;

      try {
        const data = await fetchJson(url);
        if (data?.spark?.result) {
          for (const item of data.spark.result) {
            const sym: string = item.symbol;
            if (item.response?.[0]?.meta) {
              const meta = item.response[0].meta;
              const price = meta.regularMarketPrice || 0;
              const prevClose = meta.chartPreviousClose || price;
              const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

              if (sym === currencySymbol) {
                rawPrices['USDTHB'] = { price, changePercent };
              } else {
                const ourId = symbolsMap.get(sym);
                if (ourId) rawPrices[ourId] = { price, changePercent };
              }
            }
          }
        }
      } catch (error) {
        console.warn(`[marketDataService] Yahoo chunk failed (${chunk.slice(0,3).join(',')}...):`, (error as Error).message);
      }
    }

    // ── Derive DRx prices from underlying US stock + USDTHB rate ──────────────
    // DRx ratio: 1 DRx = 1/80 of the underlying US stock in THB
    const usdthb = rawPrices['USDTHB']?.price || 35; // fallback rate
    for (const drxSymbol of drxAssets) {
      const underlying = DRX_UNDERLYING[drxSymbol];
      const usData = rawPrices[underlying];
      if (usData && usData.price > 0) {
        const drxPrice = (usData.price / 80) * usdthb;
        rawPrices[drxSymbol] = {
          price: Math.round(drxPrice * 100) / 100,
          changePercent: usData.changePercent, // same % change as underlying
        };
      } else {
        console.warn(`[marketDataService] No price for underlying ${underlying} of DRx ${drxSymbol}`);
      }
    }

    // ── Clean up: remove US stock entries that aren't in our DB ───────────────
    const results: Record<string, { price: number; changePercent: number }> = {};
    const dbSymbols = new Set(allAssets.map(a => a.symbol));
    for (const [sym, data] of Object.entries(rawPrices)) {
      if (sym === 'USDTHB' || dbSymbols.has(sym)) {
        results[sym] = data;
      }
    }

    cache.data = results;
    cache.lastFetch = Date.now();
    return results;
  } catch (error) {
    console.error('[marketDataService] Fatal error fetching market data:', error);
    return cache.data;
  }
};
