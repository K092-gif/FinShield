import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import * as https from 'https';

const fetchJson = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    https.get(url, { 
      family: 4, // Force IPv4
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
    }).on('error', reject);
  });
};

let cache = {
  data: {} as Record<string, { price: number; changePercent: number }>,
  lastFetch: 0
};

const CACHE_DURATION = 60 * 1000;

export const getMarketData = async () => {
  if (Date.now() - cache.lastFetch < CACHE_DURATION && Object.keys(cache.data).length > 0) {
    return cache.data;
  }

  const allAssets = await prisma.asset.findMany();
  
  const symbolsMap = new Map<string, string>();
  const querySymbols = allAssets.map(asset => {
    let sym = asset.symbol;
    if (['thai-stock', 'reit', 'dr'].includes(asset.category)) sym = `${asset.symbol}.BK`;
    symbolsMap.set(sym, asset.symbol);
    return sym;
  });

  const currencySymbol = 'USDTHB=X';
  querySymbols.push(currencySymbol);

  try {
    const results: Record<string, { price: number; changePercent: number }> = {};
    const chunkSize = 20;
    
    for (let i = 0; i < querySymbols.length; i += chunkSize) {
      const chunk = querySymbols.slice(i, i + chunkSize);
      const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(chunk.join(','))}&range=1d&interval=1d`;
      
      const data = await fetchJson(url);
      if (data?.spark?.result) {
        for (const item of data.spark.result) {
          const sym = item.symbol;
          if (item.response?.[0]?.meta) {
            const meta = item.response[0].meta;
            const price = meta.regularMarketPrice || 0;
            const prevClose = meta.chartPreviousClose || price;
            const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
            
            if (sym === currencySymbol) {
              results['USDTHB'] = { price, changePercent };
            } else {
              const ourId = symbolsMap.get(sym);
              if (ourId) results[ourId] = { price, changePercent };
            }
          }
        }
      }
    }

    cache.data = results;
    cache.lastFetch = Date.now();
    return results;
  } catch (error) {
    console.error("Error fetching market data from Spark API:", error);
    return cache.data;
  }
};