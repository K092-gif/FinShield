import { Request, Response, Router } from "express";
import {
    BANK_TIERS,
    MASTER_ASSETS,
} from "../data/assets";
import {
    calculateBankBalance,
    calculateEmergencyFund,
    calculateInflationImpact,
    calculatePortfolioMetrics,
    calculateWealthProjection,
    PortfolioAllocation,
    runStressTest,
} from "../services/simulationService";

const router = Router();

// GET all assets
router.get("/assets", (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;

  if (category) {
    const filtered = MASTER_ASSETS.filter((a) => a.category === category);
    return res.json(filtered);
  }

  res.json(MASTER_ASSETS);
});

// GET asset by ID
router.get("/assets/:id", (req: Request, res: Response) => {
  const asset = MASTER_ASSETS.find((a) => a.id === req.params.id);
  if (!asset) {
    return res.status(404).json({ error: "Asset not found" });
  }
  res.json(asset);
});

// GET bank information
router.get("/banks", (req: Request, res: Response) => {
  const banks = Object.entries(BANK_TIERS).map(([id, data]) => ({
    id,
    name: data.name,
    tiers: data.tiers,
  }));
  res.json(banks);
});

// POST calculate portfolio metrics
router.post("/calculate-portfolio", (req: Request, res: Response) => {
  try {
    const { allocations } = req.body as {
      allocations: PortfolioAllocation[];
    };

    if (!allocations || !Array.isArray(allocations)) {
      return res.status(400).json({ error: "Invalid allocations" });
    }

    const metrics = calculatePortfolioMetrics(allocations);
    res.json(metrics);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
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
router.post("/calculate-bank-savings", (req: Request, res: Response) => {
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

    const result = calculateBankBalance(
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
router.post("/calculate-wealth", (req: Request, res: Response) => {
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

    const result = calculateWealthProjection(
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

export default router;
