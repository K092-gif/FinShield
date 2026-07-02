/**
 * Dividend Calendar Service
 * คำนวณ dividend ที่คาดว่าจะได้รับในแต่ละเดือน
 * ใช้ข้อมูลจาก MASTER_ASSETS (static)
 */
import { PrismaClient, Asset } from '@prisma/client';
const prisma = new PrismaClient();

export interface DividendAllocation {
  id: string;          // Ticker symbol (e.g. "PTT", "VOO")
  allocation: number;  // % allocation (0-100)
  expectedYield: number; // Annual yield %
}

export interface DividendMonth {
  month: string;       // Thai month label (ม.ค., ก.พ., ...)
  monthIndex: number;  // 0-11
  amount: number;      // Net amount after 10% tax
  assets: string;      // Comma-separated ticker list
}

// ─── Thai Dividend Pay Months (Based on typical SET/Thai market patterns) ───
// Thai stocks: usually Q1 (Apr/May) and Q2 (Aug/Sep)
// REITs/IFF:   quarterly (Mar, Jun, Sep, Dec) or semi-annual
// US stocks / ETFs: quarterly (Mar, Jun, Sep, Dec)
// DR/DRx:      annually (Dec) or no dividend

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function getPayMonths(asset: Asset): number[] {
  if (!asset.paysDividend) return [];

  switch (asset.category) {
    case 'thai-stock':
      // Thai blue-chips typically pay semi-annual: ~April + ~September
      return [3, 8]; // Apr(3), Sep(8)

    case 'reit':
      // Thai REITs pay quarterly: Mar, Jun, Sep, Dec
      return [2, 5, 8, 11]; // Mar, Jun, Sep, Dec

    case 'us-stock':
      // US dividend stocks pay quarterly: Mar, Jun, Sep, Dec
      return [2, 5, 8, 11];

    case 'etf-bond':
      // ETFs pay quarterly: Mar, Jun, Sep, Dec
      return [2, 5, 8, 11];

    case 'dr':
      // DR/DRx that pay dividends usually do it once/year in Dec
      return [11]; // Dec

    default:
      return [11];
  }
}

// ─── Main Function ────────────────────────────────────────────────────────────
export const getDividendCalendar = async (
  totalWealth: number,
  allocations: DividendAllocation[]
): Promise<DividendMonth[]> => {
  // Monthly bucket: index 0-11
  const payouts: { amount: number; assets: Set<string> }[] = Array.from(
    { length: 12 },
    () => ({ amount: 0, assets: new Set<string>() })
  );

  const dbAssets = await prisma.asset.findMany({
    where: { symbol: { in: allocations.map(a => a.id) } }
  });

  for (const alloc of allocations) {
    if (alloc.allocation <= 0) continue;
    
    const asset = dbAssets.find(a => a.symbol === alloc.id);
    if (!asset || !asset.paysDividend) continue;

    // Annual expected dividend for this allocation
    const annualDiv = totalWealth * (alloc.allocation / 100) * (alloc.expectedYield / 100);
    if (annualDiv <= 0) continue;

    const payMonths = getPayMonths(asset);
    if (payMonths.length === 0) continue;

    const perPayment = annualDiv / payMonths.length;

    for (const m of payMonths) {
      payouts[m].amount += perPayment;
      payouts[m].assets.add(alloc.id);
    }
  }

  // Format result (apply 10% withholding tax for Thai stocks/REITs)
  return payouts
    .map((p, i) => ({
      month: THAI_MONTHS[i],
      monthIndex: i,
      amount: Math.round(p.amount * 0.9 * 100) / 100, // after 10% tax
      assets: Array.from(p.assets).join(', '),
    }))
    .filter(p => p.amount > 0)
    .sort((a, b) => a.monthIndex - b.monthIndex);
};
