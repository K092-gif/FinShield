import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
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
import { savePortfolioToDb, getUserPortfolios, saveDiaryScore, getDiaryScores } from "../services/databaseService";

const router = Router();

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

// GET inflation rate
router.get("/inflation", async (req: Request, res: Response) => {
  try {
    const response = await fetch("https://scanner.tradingview.com/global/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbols: { tickers: ["ECONOMICS:THIRYY"] },
        columns: ["close"]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch inflation data: ${response.status}`);
    }
    
    const data: any = await response.json();
    if (data && data.data && data.data.length > 0 && data.data[0].d && data.data[0].d.length > 0) {
      const inflation = data.data[0].d[0];
      res.json({ inflationRate: inflation });
    } else {
      // Fallback
      res.json({ inflationRate: 3.0 });
    }
  } catch (error) {
    console.error("Inflation fetch error:", error);
    res.json({ inflationRate: 3.0 }); // Default fallback
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

// GET macroeconomic data (e.g., Thailand Inflation Rate)
const handleInflationRequest = async (req: Request, res: Response) => {
  try {
    // Fetch Thailand Inflation YoY (THIRYY) from TradingView Free Scanner API
    const response = await fetch("https://scanner.tradingview.com/global/scan", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols: { tickers: ['ECONOMICS:THIRYY'] },
        columns: ['close']
      })
    });
    
    const data: any = await response.json();
    if (data && data.data && data.data.length > 0) {
      const closeValue = data.data[0].d[0];
      if (closeValue !== undefined && closeValue !== null) {
        const rateVal = Number(closeValue.toFixed(2));
        res.json({ 
          country: "Thailand", 
          year: new Date().getFullYear(), 
          rate: rateVal,
          inflationRate: rateVal,
          source: "TradingView (THIRYY)"
        });
        return;
      }
    }
    // Fallback if API fails or parsing fails
    res.json({ country: "Thailand", year: new Date().getFullYear(), rate: 1.95, inflationRate: 1.95, source: "Default (1.95%)" });
  } catch (error) {
    // Fallback on error
    res.json({ country: "Thailand", year: new Date().getFullYear(), rate: 1.95, inflationRate: 1.95, source: "Default (1.95%)" });
  }
};

router.get("/macro/inflation", handleInflationRequest);
router.get("/inflation", handleInflationRequest);

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

// POST save diary score
router.post("/diary-scores", async (req: Request, res: Response) => {
  try {
    const { firebaseUid, evaluationType, periodKey, score, review } = req.body;
    if (!firebaseUid || !evaluationType || !periodKey || score === undefined || !review) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const savedScore = await saveDiaryScore(firebaseUid, evaluationType, periodKey, score, review);
    res.json(savedScore);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET user diary scores
router.get("/diary-scores", async (req: Request, res: Response) => {
  try {
    const firebaseUid = req.query.firebaseUid as string;
    if (!firebaseUid) {
      return res.status(400).json({ error: "Missing firebaseUid" });
    }
    const scores = await getDiaryScores(firebaseUid);
    res.json(scores);
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

    const validTypes = ["job", "sick", "accident"];
    if (!crisisType || !validTypes.includes(crisisType)) {
      return res.status(400).json({ error: "Invalid crisisType. Must be 'job', 'sick', or 'accident'" });
    }

    if (emergencyFund === undefined || monthlyExpense === undefined || isNaN(Number(emergencyFund)) || isNaN(Number(monthlyExpense))) {
      return res.status(400).json({ error: "emergencyFund and monthlyExpense are required and must be numbers" });
    }

    const result = runStressTest(Number(emergencyFund), Number(monthlyExpense), crisisType);
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
