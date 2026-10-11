import YahooFinance from 'yahoo-finance2';
import { prisma } from '../prisma';

// @ts-ignore
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// ─── DRx underlying US stock symbol map ──────────────────────────────────────
// DRx are Thai certificates representing fractional ownership in US stocks.
// Price = US stock price * USDTHB rate * (1/80) = US stock price * USDTHB / 80
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

interface PriceData {
  price: number;
  changePercent: number;
  ts: number;
}

const priceCache = new Map<string, PriceData>();
const CACHE_DURATION = 60 * 1000; // 1 minute per symbol

export const getMarketData = async (requestedSymbols?: string[]) => {
  const now = Date.now();

  // If specific symbols are requested, check if all of them are already fresh in cache
  if (requestedSymbols && requestedSymbols.length > 0) {
    const cleanRequested = requestedSymbols.map(s => s.trim().toUpperCase()).filter(Boolean);
    const hasUsdThb = priceCache.has('USDTHB') && (now - (priceCache.get('USDTHB')?.ts || 0) < CACHE_DURATION);
    const allFresh = hasUsdThb && cleanRequested.every(sym => {
      const entry = priceCache.get(sym);
      return entry && now - entry.ts < CACHE_DURATION;
    });

    if (allFresh) {
      const res: Record<string, { price: number; changePercent: number }> = {};
      for (const sym of cleanRequested) {
        const e = priceCache.get(sym);
        if (e) res[sym] = { price: e.price, changePercent: e.changePercent };
      }
      if (priceCache.has('USDTHB')) {
        const u = priceCache.get('USDTHB')!;
        res['USDTHB'] = { price: u.price, changePercent: u.changePercent };
      }
      return res;
    }
  }

  // Determine symbols to fetch
  let targetSymbols: string[] = [];
  if (requestedSymbols && requestedSymbols.length > 0) {
    targetSymbols = Array.from(new Set(requestedSymbols.map(s => s.trim().toUpperCase()).filter(Boolean)));
  } else {
    // Default / initial fetch: benchmark symbols + top Thai bluechips + US leaders
    targetSymbols = [
      'DELTA', 'PTT', 'ADVANC', 'CPALL', 'GULF', 'AOT', 'SCB', 'KBANK', 'BDMS', 'TRUE',
      'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'SPY', 'QQQ', 'VOO',
      'AAPL80X', 'NVDA80X', 'MSFT80X', 'TSLA80X'
    ];
  }

  // Lookup categories for target symbols from DB
  const dbAssets = await prisma.asset.findMany({
    where: { symbol: { in: targetSymbols } },
    select: { symbol: true, category: true }
  });
  const categoryMap = new Map<string, string>(dbAssets.map(a => [a.symbol, a.category]));

  const symbolsMap = new Map<string, string>(); // yahoo_symbol -> DB symbol
  const drxAssets: string[] = [];
  const querySymbols: string[] = [];

  for (const rawSym of targetSymbols) {
    const sym = rawSym.replace(/\.BK$/i, '');
    if (sym in DRX_UNDERLYING) {
      drxAssets.push(sym);
      const underlying = DRX_UNDERLYING[sym];
      if (!symbolsMap.has(underlying)) {
        symbolsMap.set(underlying, underlying);
        querySymbols.push(underlying);
      }
    } else {
      const cat = categoryMap.get(sym);
      const isThai = cat === 'thai-stock' || cat === 'reit' || cat === 'dr' || rawSym.endsWith('.BK');
      const yahooSym = isThai ? `${sym}.BK` : sym;
      symbolsMap.set(yahooSym, sym);
      querySymbols.push(yahooSym);
    }
  }

  const currencySymbol = 'USDTHB=X';
  if (!querySymbols.includes(currencySymbol)) {
    querySymbols.push(currencySymbol);
  }

  const rawPrices: Record<string, { price: number; changePercent: number }> = {};

  try {
    const quotes: any[] = await yahooFinance.quote(querySymbols, {}, { validateResult: false } as any);
    if (Array.isArray(quotes)) {
      for (const item of quotes) {
        const ySym: string = item.symbol;
        const price = item.regularMarketPrice || 0;
        const changePercent = typeof item.regularMarketChangePercent === 'number'
          ? item.regularMarketChangePercent
          : (item.regularMarketPreviousClose ? ((price - item.regularMarketPreviousClose) / item.regularMarketPreviousClose) * 100 : 0);

        if (ySym === currencySymbol) {
          rawPrices['USDTHB'] = { price, changePercent };
          priceCache.set('USDTHB', { price, changePercent, ts: now });
        } else {
          const ourId = symbolsMap.get(ySym) || ySym;
          rawPrices[ourId] = { price, changePercent };
          priceCache.set(ourId, { price, changePercent, ts: now });
        }
      }
    }
  } catch (error) {
    console.warn(`[marketDataService] Yahoo quote failed for [${querySymbols.slice(0, 5).join(',')}...]:`, (error as Error).message);
  }

  // Derive DRx prices
  const usdthb = rawPrices['USDTHB']?.price || priceCache.get('USDTHB')?.price || 35;
  for (const drxSymbol of drxAssets) {
    const underlying = DRX_UNDERLYING[drxSymbol];
    const usData = rawPrices[underlying] || (priceCache.get(underlying) ? { price: priceCache.get(underlying)!.price, changePercent: priceCache.get(underlying)!.changePercent } : null);
    if (usData && usData.price > 0) {
      const drxPrice = (usData.price / 80) * usdthb;
      const data = {
        price: Math.round(drxPrice * 100) / 100,
        changePercent: usData.changePercent,
      };
      rawPrices[drxSymbol] = data;
      priceCache.set(drxSymbol, { ...data, ts: now });
    }
  }

  // Return all currently cached + fetched prices
  const response: Record<string, { price: number; changePercent: number }> = {};
  for (const [sym, entry] of priceCache.entries()) {
    response[sym] = { price: entry.price, changePercent: entry.changePercent };
  }

  return response;
};
