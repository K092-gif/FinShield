import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import {
    getBankTiers,
    calculateBankBalance,
    calculateEmergencyFund,
    calculateInflationImpact,
    calculatePortfolioMetrics,
    calculateWealthProjection,
    PortfolioAllocation,
    runStressTest,
} from "../services/simulationService";
import { getMarketData } from "../services/marketDataService";
import { getDividendCalendar } from "../services/dividendService";
import { calculatePortfolioPnl } from "../services/profitLossService";
import { seedBankTiersIfEmpty } from "../utils/seedBankTiers";
import { searchAssets, getOrFetchAssetDetails } from "../services/yahooSearchService";
import { savePortfolioToDb, getUserPortfolios } from "../services/databaseService";

const router = Router();
const prisma = new PrismaClient();

// GET available assets
router.get("/assets", async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    let assets;
    if (category) {
      assets = await prisma.asset.findMany({ where: { category } });
    } else {
      assets = await prisma.asset.findMany();
    }
    // Rename symbol to id to match frontend expectation
    const formattedAssets = assets.map(a => ({
      ...a,
      id: a.symbol,
    }));
    res.json(formattedAssets);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assets" });
  }
});

// GET asset search (Yahoo Finance)
router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q) {
      res.json([]);
      return;
    }
    const results = await searchAssets(q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Failed to search assets" });
  }
});

// GET specific asset details (Dynamic fetch & cache)
router.get("/assets/:id", async (req: Request, res: Response) => {
  try {
    const asset = await getOrFetchAssetDetails(req.params.id);
    res.json({ ...asset, id: asset.symbol });
  } catch (error) {
    res.status(404).json({ error: "Asset not found or invalid symbol" });
  }
});

// --- Database Routes ---
// POST save portfolio
router.post("/portfolios", async (req: Request, res: Response) => {
  try {
    const { firebaseUid, name, transactions } = req.body;
    if (!firebaseUid || !name || !transactions) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const portfolio = await savePortfolioToDb(firebaseUid, name, transactions);
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET user portfolios
router.get("/portfolios", async (req: Request, res: Response) => {
  try {
    const firebaseUid = req.query.firebaseUid as string;
    if (!firebaseUid) {
      return res.status(400).json({ error: "Missing firebaseUid" });
    }
    const portfolios = await getUserPortfolios(firebaseUid);
    res.json(portfolios);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});


// GET force seed banks (for debugging)
router.get("/seed-banks-force", async (req: Request, res: Response) => {
  try {
    await seedBankTiersIfEmpty();
    res.json({ success: true, message: "Seeding triggered. Check server console or DB." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// GET bank information
router.get("/banks", async (req: Request, res: Response) => {
  try {
    const bankTiers = await getBankTiers();
    const banks = Object.entries(bankTiers).map(([id, data]: [string, any]) => ({
      id,
      name: data.name,
      tiers: data.tiers,
    }));
    res.json(banks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bank data" });
  }
});

// GET market data (real-time prices and USD/THB)
router.get("/market-data", async (req: Request, res: Response) => {
  try {
    const data = await getMarketData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch market data" });
  }
});

// POST calculate portfolio metrics
router.post("/calculate-portfolio", async (req: Request, res: Response) => {
  try {
    const allocations: PortfolioAllocation[] = req.body.allocations || [];
    const metrics = await calculatePortfolioMetrics(allocations);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate metrics" });
  }
});

// POST calculate inflation impact
router.post("/calculate-inflation", (req: Request, res: Response) => {
  try {
    const {
      currentExpense,
      years,
      inflationRate,
    } = req.body as {
      currentExpense: number;
      years: number;
      inflationRate?: number;
    };

    const result = calculateInflationImpact(
      currentExpense,
      years,
      inflationRate || 0.03
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST calculate bank savings
router.post("/calculate-bank-savings", async (req: Request, res: Response) => {
  try {
    const {
      initialCapital,
      monthlyContribution,
      years,
      bankId,
    } = req.body as {
      initialCapital: number;
      monthlyContribution: number;
      years: number;
      bankId: string;
    };

    const result = await calculateBankBalance(
      initialCapital,
      monthlyContribution,
      years,
      bankId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST calculate wealth projection
router.post("/calculate-wealth", async (req: Request, res: Response) => {
  try {
    const {
      currentAge,
      retirementAge,
      initialCapital,
      monthlySavings,
      selectedBank,
      portfolioAllocations,
    } = req.body as {
      currentAge: number;
      retirementAge: number;
      initialCapital: number;
      monthlySavings: number;
      selectedBank: string;
      portfolioAllocations: PortfolioAllocation[];
    };

    const result = await calculateWealthProjection(
      currentAge,
      retirementAge,
      initialCapital,
      monthlySavings,
      selectedBank,
      portfolioAllocations
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST calculate emergency fund
router.post("/calculate-emergency-fund", (req: Request, res: Response) => {
  try {
    const {
      monthlyIncome,
      fixedRent,
      fixedLoan,
      fixedInsurance,
      fixedCard,
      variableFood,
      variableTravel,
      variableMisc,
      jobRiskLevel,
      currentEmergencyFund,
      monthlySavingRate,
    } = req.body as {
      monthlyIncome: number;
      fixedRent: number;
      fixedLoan: number;
      fixedInsurance: number;
      fixedCard: number;
      variableFood: number;
      variableTravel: number;
      variableMisc: number;
      jobRiskLevel: number;
      currentEmergencyFund: number;
      monthlySavingRate: number;
    };

    const result = calculateEmergencyFund(
      monthlyIncome,
      fixedRent,
      fixedLoan,
      fixedInsurance,
      fixedCard,
      variableFood,
      variableTravel,
      variableMisc,
      jobRiskLevel,
      currentEmergencyFund,
      monthlySavingRate
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST run stress test
router.post("/stress-test", (req: Request, res: Response) => {
  try {
    const {
      emergencyFund,
      monthlyExpense,
      crisisType,
    } = req.body as {
      emergencyFund: number;
      monthlyExpense: number;
      crisisType: "job" | "sick" | "accident";
    };

    const result = runStressTest(emergencyFund, monthlyExpense, crisisType);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
// POST calculate dividend calendar using Yahoo Finance
router.post("/dividend-calendar", async (req: Request, res: Response) => {
  try {
    const { totalWealth, allocations } = req.body as {
      totalWealth: number;
      allocations: { id: string; allocation: number; expectedYield: number }[];
    };

    if (!totalWealth || !allocations || !Array.isArray(allocations)) {
      return res.status(400).json({ error: "Invalid parameters for dividend calendar" });
    }

    const result = await getDividendCalendar(totalWealth, allocations);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST calculate portfolio profit/loss from real Yahoo Finance prices
router.post("/portfolio-pnl", async (req: Request, res: Response) => {
  try {
    const { totalSavings, allocations } = req.body as {
      totalSavings: number;
      allocations: { id: string; transactions: { allocation: number; buyDate: string }[] }[];
    };

    if (!totalSavings || !allocations || !Array.isArray(allocations)) {
      return res.status(400).json({ error: "Invalid parameters for portfolio P&L" });
    }

    const result = await calculatePortfolioPnl(totalSavings, allocations);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
