/**
 * Dividend Calendar Service
 * คำนวณ dividend ที่คาดว่าจะได้รับในแต่ละเดือน
 * ใช้ข้อมูลจาก MASTER_ASSETS (static)
 */
import { Asset } from '@prisma/client';
import { prisma } from '../prisma';

export interface DividendAllocation {
  id: string;          // Ticker symbol (e.g. "PTT", "VOO")
  allocation: number;  // % allocation (0-100)
  expectedYield: number; // Annual yield %
  annualDividendGross?: number; // Annual gross dividend in THB = shares × DPS
  category?: string;     // Passed from frontend
  currentValue?: number; // Real current value of the asset
}

export interface DividendMonth {
  month: string;       // Thai month label (ม.ค., ก.พ., ...)
  monthIndex: number;  // 0-11
  amount: number;      // Net amount after 10% tax
  assets: { symbol: string; amount: number }[];
}

// ─── Thai Dividend Pay Months (Based on typical SET/Thai market patterns) ───
// Thai stocks: usually Q1 (Apr/May) and Q2 (Aug/Sep)
// REITs/IFF:   quarterly (Mar, Jun, Sep, Dec) or semi-annual
// US stocks / ETFs: quarterly (Mar, Jun, Sep, Dec)
// DR/DRx:      annually (Dec) or no dividend

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function getPayMonths(asset: Partial<Asset>): number[] {
  if (!asset.paysDividend) return [];

  switch (asset.category) {
    case 'thai-stock':
      return [3, 8]; // Apr(3), Sep(8)
    case 'reit':
      return [2, 5, 8, 11]; // Mar, Jun, Sep, Dec
    case 'us-stock':
      return [2, 5, 8, 11];
    case 'etf-bond':
      return [2, 5, 8, 11];
    case 'dr':
      return [11]; // Dec
    default:
      return [2, 5, 8, 11]; // default quarterly for unknown
  }
}

// ─── Main Function ────────────────────────────────────────────────────────────
export const getDividendCalendar = async (
  totalWealth: number,
  allocations: DividendAllocation[]
): Promise<DividendMonth[]> => {
  const payouts: { amount: number; assets: Record<string, number> }[] = Array.from(
    { length: 12 },
    () => ({ amount: 0, assets: {} })
  );

  const dbAssets = await prisma.asset.findMany({
    where: { symbol: { in: allocations.map(a => a.id) } }
  });

  for (const alloc of allocations) {
    if (alloc.allocation <= 0 && !alloc.currentValue) continue;
    if (alloc.expectedYield <= 0) continue; // Skip if no expected yield

    const dbAsset = dbAssets.find(a => a.symbol === alloc.id);
    
    // Construct mock asset from frontend data if not in DB
    const asset: Partial<Asset> = {
      category: alloc.category || dbAsset?.category || 'us-stock',
      paysDividend: true // We know it pays dividend because expectedYield > 0
    };

    const annualDiv = alloc.annualDividendGross !== undefined && alloc.annualDividendGross > 0
      ? alloc.annualDividendGross
      : alloc.currentValue !== undefined
      ? alloc.currentValue * (alloc.expectedYield / 100)
      : totalWealth * (alloc.allocation / 100) * (alloc.expectedYield / 100);
    if (annualDiv <= 0) continue;

    const payMonths = getPayMonths(asset);
    if (payMonths.length === 0) continue;

    const perPayment = annualDiv / payMonths.length;

    for (const m of payMonths) {
      payouts[m].amount += perPayment;
      payouts[m].assets[alloc.id] = (payouts[m].assets[alloc.id] || 0) + perPayment;
    }
  }

  // Format result (apply 10% withholding tax for Thai stocks/REITs)
  return payouts
    .map((p, i) => {
      const assetList = Object.entries(p.assets)
        .map(([symbol, amt]) => ({
          symbol,
          amount: Math.round(amt * 0.9 * 100) / 100,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        month: THAI_MONTHS[i],
        monthIndex: i,
        amount: Math.round(p.amount * 0.9 * 100) / 100, // after 10% tax
        assets: assetList,
      };
    })
    .filter(p => p.amount > 0)
    .sort((a, b) => a.monthIndex - b.monthIndex);
};
