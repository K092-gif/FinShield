// Backend service for portfolio calculations and simulator logic

// No imports from data/assets anymore
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Add a function to get all bank tiers from DB
export async function getBankTiers() {
  const tiers = await prisma.bankTier.findMany({
    orderBy: { minBalance: 'asc' },
  });

  // Group by bankId
  const bankMap: Record<string, { name: string; tiers: any[] }> = {};
  for (const t of tiers) {
    if (!bankMap[t.bankId]) {
      bankMap[t.bankId] = { name: t.bankName, tiers: [] };
    }
    bankMap[t.bankId].tiers.push({
      minBalance: t.minBalance,
      rate: t.interestRate,
    });
  }
  return bankMap;
}

export interface PortfolioAllocation {
  assetId: string;
  allocation: number; // percentage 0-100
}

export interface PortfolioMetrics {
  totalAllocation: number;
  weightedYield: number;
  riskScore: number;
  categoryAllocation: Record<string, number>;
}

export interface BankCalculationResult {
  initialCapital: number;
  monthlyContribution: number;
  years: number;
  finalBalance: number;
  totalInterest: number;
  monthlyBreakdown: Array<{ month: number; balance: number; interest: number }>;
}

export interface WealthCalculationResult {
  currentAge: number;
  retirementAge: number;
  years: number;
  initialCapital: number;
  monthlySavings: number;
  netInitialCapital: number;
  netMonthlySavings: number;
  bankBalance: number;
  portfolioValue: number;
  totalWealth: number;
  monthlyDividends: number;
  annualDividends: number;
}

export interface InflationImpactResult {
  timeline: number;
  currentMonthlyExpense: number;
  futureMonthlyExpense: number;
  monthlyDifference: number;
  annualFutureExpense: number;
  inflationRate: number;
  cumulativeInflation: number;
}

export interface EmergencyFundResult {
  monthlyIncome: number;
  fixedCosts: number;
  variableCosts: number;
  totalMonthlyExpense: number;
  jobRiskMultiplier: number;
  recommendedEmergencyFund: number;
  currentEmergencyFund: number;
  readinessPercentage: number;
  monthsUntilFull: number;
}

// Get asset by ID (removed synchronous version)

// Calculate portfolio metrics
export async function calculatePortfolioMetrics(
  allocations: PortfolioAllocation[]
): Promise<PortfolioMetrics> {
  let totalAllocation = 0;
  let totalYield = 0;
  let totalRisk = 0;
  const categoryAlloc: Record<string, number> = {};

  const dbAssets = await prisma.asset.findMany({
    where: { symbol: { in: allocations.map(a => a.assetId) } }
  });

  allocations.forEach((alloc) => {
    totalAllocation += alloc.allocation;

    const asset = dbAssets.find(a => a.symbol === alloc.assetId);
    if (asset) {
      totalYield += asset.yield * (alloc.allocation / 100);
      totalRisk += asset.risk * (alloc.allocation / 100);

      categoryAlloc[asset.category] =
        (categoryAlloc[asset.category] || 0) + alloc.allocation;
    }
  });

  return {
    totalAllocation,
    weightedYield: Math.round(totalYield * 100) / 100,
    riskScore: Math.round(totalRisk * 10) / 10,
    categoryAllocation: categoryAlloc,
  };
}

// Calculate bank savings with tiered interest
export async function calculateBankBalance(
  initialCapital: number,
  monthlyContribution: number,
  years: number,
  bankId: string
): Promise<BankCalculationResult> {
  const bankTiers = await getBankTiers();
  const bankInfo = bankTiers[bankId];
  if (!bankInfo) {
    throw new Error(`Bank ${bankId} not found`);
  }

  let balance = initialCapital;
  let totalInterest = 0;
  const monthlyBreakdown = [];

  for (let month = 1; month <= years * 12; month++) {
    balance += monthlyContribution;

    // Apply tiered interest
    let monthlyInterest = 0;
    let remaining = balance;

    for (let i = 0; i < bankInfo.tiers.length; i++) {
      const currentTier = bankInfo.tiers[i];
      const nextTier = bankInfo.tiers[i + 1];
      const tierLimit = nextTier
        ? nextTier.minBalance
        : Number.MAX_SAFE_INTEGER;

      if (remaining > currentTier.minBalance) {
        const tierAmount = Math.min(
          remaining - currentTier.minBalance,
          tierLimit - currentTier.minBalance
        );
        monthlyInterest += (tierAmount * currentTier.rate) / 12;
      }
    }

    balance += monthlyInterest;
    totalInterest += monthlyInterest;

    if (month % 12 === 0 || month === 1) {
      monthlyBreakdown.push({
        month,
        balance: Math.round(balance),
        interest: Math.round(monthlyInterest),
      });
    }
  }

  return {
    initialCapital,
    monthlyContribution,
    years,
    finalBalance: Math.round(balance),
    totalInterest: Math.round(totalInterest),
    monthlyBreakdown,
  };
}

// Calculate inflation impact
export function calculateInflationImpact(
  currentExpense: number,
  years: number,
  inflationRate: number = 0.03
): InflationImpactResult {
  const cumulativeInflation = Math.pow(1 + inflationRate, years) - 1;
  const futureExpense = currentExpense * (1 + cumulativeInflation);
  const difference = futureExpense - currentExpense;
  const annualFutureExpense = futureExpense * 12;

  return {
    timeline: years,
    currentMonthlyExpense: Math.round(currentExpense),
    futureMonthlyExpense: Math.round(futureExpense),
    monthlyDifference: Math.round(difference),
    annualFutureExpense: Math.round(annualFutureExpense),
    inflationRate: inflationRate * 100,
    cumulativeInflation: Math.round(cumulativeInflation * 10000) / 100,
  };
}

// Calculate wealth projection
export async function calculateWealthProjection(
  currentAge: number,
  retirementAge: number,
  initialCapital: number,
  monthlySavings: number,
  selectedBank: string,
  portfolioAllocations: PortfolioAllocation[]
): Promise<WealthCalculationResult> {
  const years = retirementAge - currentAge;
  const baseFee = initialCapital * 0.00157; // 0.157% fee
  const netInitialCapital = Math.max(0, initialCapital - baseFee);
  const monthlyFee = (monthlySavings * 0.00157) / 12;
  const netMonthlySavings = Math.max(0, monthlySavings - monthlyFee);

  // Calculate bank balance
  const bankResult = await calculateBankBalance(
    netInitialCapital,
    netMonthlySavings,
    years,
    selectedBank
  );

  // Calculate portfolio value (assuming portfolio grows with weighted yield)
  const metrics = await calculatePortfolioMetrics(portfolioAllocations);
  let portfolioValue = netInitialCapital * 0.6; // Assume 60% goes to portfolio
  const monthlyPortfolioContribution = netMonthlySavings * 0.6;

  for (let i = 0; i < years * 12; i++) {
    portfolioValue = portfolioValue * (1 + metrics.weightedYield / 100 / 12);
    portfolioValue += monthlyPortfolioContribution;
  }

  const totalWealth = bankResult.finalBalance + portfolioValue;
  const monthlyDividends = (totalWealth * (metrics.weightedYield / 100)) / 12;
  const annualDividends = monthlyDividends * 12;

  return {
    currentAge,
    retirementAge,
    years,
    initialCapital,
    monthlySavings,
    netInitialCapital: Math.round(netInitialCapital),
    netMonthlySavings: Math.round(netMonthlySavings),
    bankBalance: bankResult.finalBalance,
    portfolioValue: Math.round(portfolioValue),
    totalWealth: Math.round(totalWealth),
    monthlyDividends: Math.round(monthlyDividends),
    annualDividends: Math.round(annualDividends),
  };
}

// Calculate emergency fund requirement
export function calculateEmergencyFund(
  monthlyIncome: number,
  fixedRent: number,
  fixedLoan: number,
  fixedInsurance: number,
  fixedCard: number,
  variableFood: number,
  variableTravel: number,
  variableMisc: number,
  jobRiskLevel: number,
  currentEmergencyFund: number,
  monthlySavingRate: number
): EmergencyFundResult {
  const fixedCosts = fixedRent + fixedLoan + fixedInsurance + fixedCard;
  const variableCosts = variableFood + variableTravel + variableMisc;
  const totalMonthlyExpense = fixedCosts + variableCosts;

  const recommendedEmergencyFund = totalMonthlyExpense * jobRiskLevel;
  const readinessPercentage =
    recommendedEmergencyFund > 0
      ? Math.round((currentEmergencyFund / recommendedEmergencyFund) * 100)
      : 0;

  const shortfall = Math.max(
    0,
    recommendedEmergencyFund - currentEmergencyFund
  );
  const monthsUntilFull =
    monthlySavingRate > 0 ? Math.ceil(shortfall / monthlySavingRate) : 0;

  return {
    monthlyIncome,
    fixedCosts,
    variableCosts,
    totalMonthlyExpense,
    jobRiskMultiplier: jobRiskLevel,
    recommendedEmergencyFund: Math.round(recommendedEmergencyFund),
    currentEmergencyFund: Math.round(currentEmergencyFund),
    readinessPercentage,
    monthsUntilFull,
  };
}

// Stress test scenarios
export function runStressTest(
  emergencyFund: number,
  monthlyExpense: number,
  crisisType: "job" | "sick" | "accident"
): {
  scenarioName: string;
  initialFund: number;
  monthlyImpact: number;
  durationMonths: number;
  totalCost: number;
  finalBalance: number;
  survivalMonths: number;
  survived: boolean;
} {
  let monthlyImpact = monthlyExpense;
  let durationMonths = 0;
  let extraCost = 0;

  switch (crisisType) {
    case "job":
      monthlyImpact = monthlyExpense;
      durationMonths = 6;
      break;
    case "sick":
      extraCost = 80000;
      monthlyImpact = monthlyExpense * 0.5; // 50% income
      durationMonths = 4;
      break;
    case "accident":
      extraCost = 50000;
      monthlyImpact = monthlyExpense; // Full expenses
      durationMonths = 2;
      break;
  }

  const totalCost = extraCost + monthlyImpact * durationMonths;
  const finalBalance = emergencyFund - totalCost;
  const survivalMonths = Math.floor(
    (emergencyFund - extraCost) / (monthlyImpact + 0.01)
  );
  const survived = finalBalance >= 0;

  return {
    scenarioName: crisisType,
    initialFund: emergencyFund,
    monthlyImpact: Math.round(monthlyImpact),
    durationMonths,
    totalCost: Math.round(totalCost),
    finalBalance: Math.round(Math.max(finalBalance, 0)),
    survivalMonths: Math.max(0, survivalMonths),
    survived,
  };
}
