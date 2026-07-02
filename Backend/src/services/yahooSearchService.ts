import YahooFinance from 'yahoo-finance2';
import { PrismaClient } from '@prisma/client';

// @ts-ignore
const yahooFinance = new YahooFinance();

const prisma = new PrismaClient();

function mapBetaToRisk(beta?: number): number {
  if (beta === undefined || beta === null) return 7; // Default risk
  if (beta < 0.5) return 3;
  if (beta < 1.0) return 5;
  if (beta < 1.5) return 7;
  return 9; // High volatility
}

function determineCategory(symbol: string, country?: string): string {
  if (symbol.endsWith('.BK') || country === 'Thailand') {
    return 'thai-stock';
  }
  // Simplified logic, default everything else to us-stock
  return 'us-stock';
}

function determineBadge(yieldPct: number, sector: string): string {
  if (yieldPct >= 4.0) return 'div'; // High dividend
  if (sector.toLowerCase().includes('technology') || sector.toLowerCase().includes('healthcare')) return 'growth';
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
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp,
        type: q.quoteType
      }));
  } catch (error) {
    console.error("Error searching Yahoo Finance:", error);
    throw new Error("Failed to search assets");
  }
};

export const getOrFetchAssetDetails = async (symbol: string) => {
  try {
    // 1. Check if we already have it in DB
    const existingAsset = await prisma.asset.findUnique({
      where: { symbol }
    });
    
    if (existingAsset) {
      return existingAsset;
    }

    // 2. Fetch from yahoo-finance2 (which automatically handles Crumb and Cookies!)
    const result: any = await yahooFinance.quoteSummary(symbol, {
      modules: ['assetProfile', 'defaultKeyStatistics', 'summaryDetail', 'price']
    });
    
    if (!result) {
      throw new Error(`Asset details not found for ${symbol}`);
    }

    const profile = result.assetProfile || {};
    const stats = result.defaultKeyStatistics || {};
    const detail = result.summaryDetail || {};
    const price = result.price || {};

    const name = price.shortName || price.longName || symbol;
    const country = profile.country;
    const sector = profile.sector || 'Unknown';
    // yahoo-finance2 returns the actual number, not a nested .raw object
    const beta = stats.beta || stats.beta3Year;
    const divYieldRaw = detail.dividendYield || detail.trailingAnnualDividendYield || 0;
    
    const yieldPct = divYieldRaw * 100;
    const risk = mapBetaToRisk(beta);
    const category = determineCategory(symbol, country);
    const taxBase = category === 'thai-stock' ? 20 : 0;
    const paysDividend = yieldPct > 0;
    const badge = determineBadge(yieldPct, sector);

    // 3. Save to DB so it becomes part of our catalog!
    const newAsset = await prisma.asset.create({
      data: {
        symbol,
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

    console.log(`[yahooSearchService] Successfully fetched and cached new asset: ${symbol}`);
    return newAsset;

  } catch (error) {
    console.error(`Error fetching details for ${symbol}:`, error);
    throw error;
  }
};
