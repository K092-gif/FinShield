"use client";
import "../ui/OverviewTool.css";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFinance } from "@/contexts/FinanceContext";
import { API_BASE_URL } from "@/lib/api";
import { fetchBanksCached, fetchAssetsCached } from "@/lib/apiCache";
import { SkeletonBox, SkeletonTableRows } from "./PageSkeleton";

// Same key used by PortfolioBuilder to cache the asset list
const LS_ASSETS_KEY = "finshield-assets-cache";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import Script from "next/script";
import InfoTooltip from "./InfoTooltip";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

interface PortfolioSuggestion {
  name: string;
  type: string;
  allocation: number;
  expectedYield: number;
  riskLevel: string;
  reason: string;
  market: string;
}

interface AiResponse {
  summary: string;
  portfolioSuggestions: PortfolioSuggestion[];
  expectedPortfolioYield: number;
  riskAssessment: string;
}

const DEFAULT_AI_PORTFOLIO: AiResponse = {
  summary: "พอร์ตแนะนำแบบกระจายความเสี่ยง (AI Balanced Allocation) ผสมผสานหุ้นเติบโต กองทุนดัชนี และตราสารหนี้เพื่อผลตอบแทนที่ยั่งยืน",
  expectedPortfolioYield: 7.2,
  riskAssessment: "ปานกลาง",
  portfolioSuggestions: [
    {
      name: "S&P 500 ETF (VOO)",
      type: "US Growth / ETF",
      allocation: 40,
      expectedYield: 9.5,
      riskLevel: "สูง",
      reason: "หุ้นชั้นนำ 500 บริษัทสหรัฐฯ สร้างการเติบโตของเงินทุนระยะยาว",
      market: "US",
    },
    {
      name: "SET50 Index Fund",
      type: "TH หุ้นปันผล & บลูชิพไทย",
      allocation: 25,
      expectedYield: 6.0,
      riskLevel: "สูง",
      reason: "หุ้นขนาดใหญ่ชั้นนำในไทย มีประวัติจ่ายเงินปันผลสม่ำเสมอ",
      market: "TH",
    },
    {
      name: "Global REITs / Real Estate",
      type: "REITs/IFF",
      allocation: 15,
      expectedYield: 5.5,
      riskLevel: "ปานกลาง",
      reason: "กองทุนอสังหาริมทรัพย์และโครงสร้างพื้นฐาน กระจายความเสี่ยงและรับผลตอบแทนสม่ำเสมอ",
      market: "Global",
    },
    {
      name: "Government Bond Fund",
      type: "ETF/ตราสารหนี้",
      allocation: 20,
      expectedYield: 2.8,
      riskLevel: "ต่ำ",
      reason: "พันธบัตรรัฐบาลระยะกลาง ลดความผันผวนของพอร์ตรวมและรักษาสภาพคล่อง",
      market: "TH",
    },
  ],
};

export default function OverviewTool() {
  const { user } = useAuth();
  const { financeData, loading: financeLoading } = useFinance();

  const [loading, setLoading] = useState(false);
  const [wealthPlanAi, setWealthPlanAi] = useState<AiResponse | null>(null);
  const [retirementUser, setRetirementUser] = useState<AiResponse | null>(null);

  const [selectedBank] = useLocalStorage("wpt_selectedBank", "kkp_dime");
  const [bankTiers, setBankTiers] = useState<Record<string, { name: string; tiers: Array<{ minBalance: number; rate: number }> }>>({});

  // Economic Map Update Time state
  const [mapUpdatedAt, setMapUpdatedAt] = useState<string>("");
  const [isMapRefreshing, setIsMapRefreshing] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    const now = new Date();
    setMapUpdatedAt(now.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }));
  }, []);

  const handleRefreshMap = () => {
    setIsMapRefreshing(true);
    setMapKey(prev => prev + 1);
    const now = new Date();
    setMapUpdatedAt(now.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }));
    setTimeout(() => setIsMapRefreshing(false), 600);
  };

  useEffect(() => {
    fetchBanksCached().then((banks) => {
      if (banks && banks.length > 0) {
        const banksMap: Record<string, any> = {};
        banks.forEach((b: any) => banksMap[b.id] = { name: b.name, tiers: b.tiers });
        setBankTiers(banksMap);
      }
    });
  }, []);

  // ── Helper functions to safely read amounts from localStorage with fallback ──
  const getLsNumber = useCallback((key: string): number => {
    if (typeof window === "undefined") return 0;
    try {
      const val = localStorage.getItem(key);
      if (!val) return 0;
      const num = Number(JSON.parse(val));
      return isNaN(num) ? 0 : num;
    } catch {
      const num = Number(localStorage.getItem(key));
      return isNaN(num) ? 0 : num;
    }
  }, []);

  const getLsExpenses = useCallback((): number => {
    if (typeof window === "undefined") return 0;
    try {
      const val = localStorage.getItem("wpt_expenses");
      if (!val) return 0;
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
      }
      return 0;
    } catch {
      return 0;
    }
  }, []);

  const [, setRefreshTick] = useState(0);

  // Resolved financial amounts: prioritize localStorage (from Wealth Plan edits) or financeData
  const lsTotalCapital = getLsNumber("wpt_totalCapital");
  const lsMonthlyInvestment = getLsNumber("wpt_monthlyInvestment");
  const lsReserveMonths = getLsNumber("wpt_reserveMonths") || 6;
  const lsExpensesTotal = getLsExpenses();

  const financeExpensesTotal = Object.values(financeData.expenses || {}).reduce((sum, val) => sum + (Number(val) || 0), 0);

  const currentCapital = lsTotalCapital > 0
    ? lsTotalCapital
    : (financeData.assets.currentCapital || 0);

  const monthlySavings = lsMonthlyInvestment > 0
    ? lsMonthlyInvestment
    : (financeData.assets.monthlySavings || 0);

  const totalExpenses = lsExpensesTotal > 0
    ? lsExpensesTotal
    : financeExpensesTotal;

  const emergencyFund = (financeData.assets.emergencyFund && financeData.assets.emergencyFund > 0)
    ? financeData.assets.emergencyFund
    : (totalExpenses * lsReserveMonths);

  const initialInvestment = Math.max(0, currentCapital - emergencyFund);

  // Helper: compute retirementUser from a given assets list or Wealth Plan state
  const computeAndSetPortfolio = useCallback((assets: any[]) => {
    // 1. Check direct Wealth Plan myPortfolio state first
    try {
      const myPortRaw = localStorage.getItem("wpt_myPortfolio");
      if (myPortRaw) {
        const parsed = JSON.parse(myPortRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const totalAlloc = parsed.reduce((sum: number, item: any) => sum + Number(item.allocation || 0), 0);
          const weightedYield = totalAlloc > 0
            ? parsed.reduce((sum: number, item: any) => sum + (Number(item.allocation || 0) * Number(item.expectedYield || 0)) / 100, 0)
            : 0;

          setRetirementUser({
            summary: "พอร์ตเกษียณที่คุณจัดสรรจากหน้าเป้าหมายการเงิน",
            expectedPortfolioYield: Number(weightedYield.toFixed(2)),
            riskAssessment: "ตามสินทรัพย์ที่เลือก",
            portfolioSuggestions: parsed.map((item: any) => ({
              name: item.name || item.id,
              type: item.type || "Asset",
              allocation: Number(item.allocation || 0),
              expectedYield: Number(item.expectedYield || 0),
              riskLevel: item.riskLevel || "User Select",
              reason: item.name || item.id,
              market: item.market || "TH",
            })).sort((a: any, b: any) => b.allocation - a.allocation),
          });
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse wpt_myPortfolio", e);
    }

    // 2. Check wpt_myPortfolioBuilderData from Wealth Plan
    try {
      const builderRaw = localStorage.getItem("wpt_myPortfolioBuilderData");
      if (builderRaw) {
        const parsed = JSON.parse(builderRaw);
        if (parsed?.selectedAssets && Array.isArray(parsed.selectedAssets) && parsed.selectedAssets.length > 0) {
          const txs = parsed.transactions || {};
          let totalAlloc = 0;
          let weightedYield = 0;
          const suggestions: PortfolioSuggestion[] = [];

          parsed.selectedAssets.forEach((asset: any) => {
            const assetTxs = txs[asset.id] || [];
            const alloc = assetTxs.reduce((sum: number, t: any) => sum + Number(t.allocation || 0), 0);
            if (alloc <= 0) return;
            totalAlloc += alloc;
            const yieldVal = Number(asset.yield || 0);
            weightedYield += (alloc / 100) * yieldVal;
            suggestions.push({
              name: asset.id,
              type: asset.categoryDisplay || asset.category || "Asset",
              allocation: alloc,
              expectedYield: yieldVal,
              riskLevel: asset.risk <= 4 ? "ต่ำ" : asset.risk <= 7 ? "ปานกลาง" : "สูง",
              reason: asset.name || asset.id,
              market: asset.category === "us-stock" ? "US" : "TH",
            });
          });

          if (suggestions.length > 0) {
            if (totalAlloc > 0 && totalAlloc !== 100) {
              suggestions.forEach(s => { s.allocation = Math.round((s.allocation / totalAlloc) * 100); });
            }
            setRetirementUser({
              summary: "พอร์ตเกษียณที่คุณจัดสรรจากหน้าเป้าหมายการเงิน",
              expectedPortfolioYield: Number(weightedYield.toFixed(2)),
              riskAssessment: "ตามสินทรัพย์ที่เลือก",
              portfolioSuggestions: suggestions.sort((a, b) => b.allocation - a.allocation),
            });
            return;
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse wpt_myPortfolioBuilderData", e);
    }

    // 3. Fallback to localStorage transactions
    const storageKey = `finshield-portfolio-myport-${user?.uid || "guest"}`;
    const fallbackKey = `finshield-portfolio-state-${user?.uid || "guest"}`;
    const savedStr = localStorage.getItem(storageKey) || localStorage.getItem(fallbackKey);

    if (!savedStr) {
      setRetirementUser({
        summary: "ยังไม่มีข้อมูลพอร์ตเกษียณ กรุณาจัดพอร์ตในหน้าเป้าหมายการเงิน",
        expectedPortfolioYield: 0,
        riskAssessment: "ยังไม่ระบุ",
        portfolioSuggestions: [],
      });
      return;
    }

    try {
      const txns = JSON.parse(savedStr);
      let totalAlloc = 0;
      let weightedYield = 0;
      const suggestions: PortfolioSuggestion[] = [];

      Object.keys(txns).forEach(assetId => {
        const assetAlloc = (txns[assetId] as any[]).reduce(
          (sum: number, t: any) => sum + Number(t.allocation || 0), 0
        );
        if (assetAlloc <= 0) return;
        totalAlloc += assetAlloc;
        const assetInfo = assets.find((a: any) => a.id === assetId);
        const yieldVal = assetInfo?.yield || 0;
        weightedYield += (assetAlloc / 100) * yieldVal;
        suggestions.push({
          name: assetId,
          type: assetInfo?.categoryDisplay || assetInfo?.category || "Asset",
          allocation: assetAlloc,
          expectedYield: yieldVal,
          riskLevel: "User Select",
          reason: assetInfo?.name || assetId,
          market: assetInfo?.category === "us-stock" ? "US" : "TH",
        });
      });

      if (suggestions.length === 0) {
        setRetirementUser({
          summary: "ยังไม่มีข้อมูลพอร์ตเกษียณ กรุณาจัดพอร์ตในหน้าเป้าหมายการเงิน",
          expectedPortfolioYield: 0,
          riskAssessment: "ยังไม่ระบุ",
          portfolioSuggestions: [],
        });
        return;
      }

      if (totalAlloc > 0 && totalAlloc !== 100) {
        suggestions.forEach(s => { s.allocation = Math.round((s.allocation / totalAlloc) * 100); });
      }

      setRetirementUser({
        summary: "พอร์ตเกษียณที่คุณจัดสรรด้วยตัวเองจากหน้าวางแผนเกษียณ",
        expectedPortfolioYield: Number(weightedYield.toFixed(2)),
        riskAssessment: "ตามสินทรัพย์ที่เลือก",
        portfolioSuggestions: suggestions.sort((a, b) => b.allocation - a.allocation),
      });
    } catch (e) {
      console.error("Failed to compute portfolio", e);
      setRetirementUser({
        summary: "ยังไม่มีข้อมูลพอร์ตเกษียณ กรุณาจัดพอร์ตในหน้าเป้าหมายการเงิน",
        expectedPortfolioYield: 0,
        riskAssessment: "ยังไม่ระบุ",
        portfolioSuggestions: [],
      });
    }
  }, [user]);

  // Load portfolio: read from cache instantly, then fetch assets if cache is empty
  const loadRetirementPortfolio = useCallback(async () => {
    try {
      const assets = await fetchAssetsCached();
      if (assets && assets.length > 0) {
        computeAndSetPortfolio(assets);
      } else {
        computeAndSetPortfolio([]);
      }
    } catch (e) {
      console.error("Failed to load retirement user portfolio", e);
    }
  }, [computeAndSetPortfolio]);

  const loadAiPortfolio = useCallback(() => {
    // 1. Check wpt_aiPortfolio from Wealth Plan first
    try {
      const aiPortRaw = localStorage.getItem("wpt_aiPortfolio");
      if (aiPortRaw) {
        const parsed = JSON.parse(aiPortRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const totalAlloc = parsed.reduce((sum: number, item: any) => sum + Number(item.allocation || 0), 0);
          const weightedYield = totalAlloc > 0
            ? parsed.reduce((sum: number, item: any) => sum + (Number(item.allocation || 0) * Number(item.expectedYield || 0)) / 100, 0)
            : 0;
          const risk = parsed.some((p: any) => p.riskLevel?.toLowerCase().includes("สูง") || p.riskLevel?.toLowerCase().includes("high")) ? "สูง"
            : parsed.every((p: any) => p.riskLevel?.toLowerCase().includes("ต่ำ") || p.riskLevel?.toLowerCase().includes("low")) ? "ต่ำ" : "ปานกลาง";

          setWealthPlanAi({
            summary: "พอร์ตแนะนำที่ AI วิเคราะห์และจัดสรรให้จากหน้าเป้าหมายการเงิน",
            expectedPortfolioYield: Number(weightedYield.toFixed(2)),
            riskAssessment: risk,
            portfolioSuggestions: parsed.map((item: any) => ({
              name: item.name || item.id,
              type: item.type || "Asset",
              allocation: Number(item.allocation || 0),
              expectedYield: Number(item.expectedYield || 0),
              riskLevel: item.riskLevel || "AI Suggest",
              reason: item.reason || item.name || item.id,
              market: item.market || "Global",
            })).sort((a: any, b: any) => b.allocation - a.allocation),
          });
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse wpt_aiPortfolio", e);
    }

    // 2. Fallback to cached finshield-ai-wealth_plan
    const wpKey = `finshield-ai-wealth_plan-${user?.uid || "guest"}`;
    const wp = localStorage.getItem(wpKey);
    if (wp) {
      try {
        const parsed = JSON.parse(wp);
        if (parsed && Array.isArray(parsed.portfolioSuggestions) && parsed.portfolioSuggestions.length > 0) {
          setWealthPlanAi(parsed);
          return;
        }
      } catch (e) {
        console.error("Failed to parse wpKey", e);
      }
    }

    // 3. Fallback to balanced default AI portfolio so view is immediately populated
    setWealthPlanAi(DEFAULT_AI_PORTFOLIO);
  }, [user]);

  useEffect(() => {
    loadAiPortfolio();
    loadRetirementPortfolio();
  }, [user, loadAiPortfolio, loadRetirementPortfolio]);

  // Re-read portfolio and amounts whenever user returns to this tab
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      setRefreshTick(prev => prev + 1);
      loadAiPortfolio();
      loadRetirementPortfolio();
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("storage", handleVisibilityOrFocus);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleVisibilityOrFocus();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("storage", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadAiPortfolio, loadRetirementPortfolio]);

  const fetchData = async (force: boolean = false) => {
    if (financeLoading) return;
    setLoading(true);

    try {
      const wpKey = `finshield-ai-wealth_plan-${user?.uid || "guest"}`;
      let missing = false;

      if (!force) {
        missing = !localStorage.getItem(wpKey);
      } else {
        missing = true;
      }

      if (missing) {
        if (force) {
          setWealthPlanAi(null);
        }

        const effectiveContext = {
          currentSavings: currentCapital,
          investmentAmount: initialInvestment,
          monthlySalary: financeData.assets.monthlyIncome || getLsNumber("wpt_salary") || 0,
          monthlyExpense: totalExpenses,
          emergencyFund: emergencyFund,
          dcaAmount: monthlySavings,
          monthlyDca: monthlySavings,
        };

        const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal: "wealth_plan", context: effectiveContext }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.portfolioSuggestions) && data.portfolioSuggestions.length > 0) {
            localStorage.setItem(wpKey, JSON.stringify(data));
            setWealthPlanAi(data);
          } else if (!wealthPlanAi) {
            setWealthPlanAi(DEFAULT_AI_PORTFOLIO);
          }
        } else {
          if (!wealthPlanAi) {
            setWealthPlanAi(DEFAULT_AI_PORTFOLIO);
          }
        }
      }

      await loadRetirementPortfolio();

    } catch (err) {
      console.error("Failed to load overview data:", err);
      if (!wealthPlanAi) {
        setWealthPlanAi(DEFAULT_AI_PORTFOLIO);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (financeLoading) return;
    const wpKey = `finshield-ai-wealth_plan-${user?.uid || "guest"}`;
    const hasWpCache = localStorage.getItem(wpKey);
    const hasAiPort = localStorage.getItem("wpt_aiPortfolio");
    if (!hasWpCache && !hasAiPort && !loading) {
      fetchData(false);
    }
  }, [financeLoading, user]);

  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showInvestGraph, setShowInvestGraph] = useState(true);
  const [showInvestInfo, setShowInvestInfo] = useState(false);
  const [showExpenseGraph, setShowExpenseGraph] = useState(true);
  const [showExpenseInfo, setShowExpenseInfo] = useState(false);

  const investData = [];
  const expenseData = [];

  const investRate = (wealthPlanAi?.expectedPortfolioYield || 7.2) / 100;
  const userInvestRate = (retirementUser?.expectedPortfolioYield || 0) / 100;
  const [actualInflation] = useLocalStorage("wpt_inflationRate", 3);
  const actualRate = actualInflation / 100;
  const inflationRate = 0.03;

  const startingInvestBase = initialInvestment > 0 ? initialInvestment : (monthlySavings > 0 ? 0 : currentCapital);
  let currentInvest = startingInvestBase;
  let currentUserInvest = startingInvestBase;
  let currentBank = startingInvestBase;
  let currentFutExp = totalExpenses;

  const bankInfo = bankTiers[selectedBank as string];

  for (let i = 0; i <= 10; i++) {
    if (i > 0) {
      for (let m = 0; m < 12; m++) {
        currentInvest += monthlySavings;
        currentInvest += (currentInvest * investRate) / 12;

        currentUserInvest += monthlySavings;
        currentUserInvest += (currentUserInvest * userInvestRate) / 12;

        currentBank += monthlySavings;
        if (bankInfo) {
          let monthlyInterest = 0;
          let remaining = currentBank;
          for (let t = 0; t < bankInfo.tiers.length; t++) {
            const cur = bankInfo.tiers[t];
            const next = bankInfo.tiers[t + 1];
            const limit = next ? next.minBalance : Number.MAX_SAFE_INTEGER;
            if (remaining > cur.minBalance) {
              const amount = Math.min(remaining - cur.minBalance, limit - cur.minBalance);
              monthlyInterest += (amount * cur.rate) / 12;
            }
          }
          currentBank += monthlyInterest;
        } else {
          currentBank += (currentBank * 0.01) / 12;
        }
      }

      currentFutExp = currentFutExp * (1 + inflationRate);
    } else {
      currentFutExp = currentFutExp * (1 + actualRate);
    }
    const currentYear = new Date().getFullYear();
    const thaiYear = currentYear + 543;

    investData.push({
      year: (thaiYear + i).toString(),
      aiInvest: Math.round(currentInvest),
      userInvest: Math.round(currentUserInvest),
      bank: Math.round(currentBank),
    });
    expenseData.push({
      year: (thaiYear + i).toString(),
      current: totalExpenses,
      future: Math.round(currentFutExp),
    });
  }

  const renderCard = (title: string, data: AiResponse | null, isUser: boolean = false) => {
    if (!data) {
      return (
        <div className="ot-compare-card justify-center items-center">
          <div className="text-[var(--text-muted)] text-[14px]">กำลังวิเคราะห์ข้อมูล...</div>
        </div>
      );
    }

    const isExpanded = expandedCard === title;
    const itemsToShow = isExpanded ? data.portfolioSuggestions : data.portfolioSuggestions.slice(0, 3);
    const isAi = !isUser;

    return (
      <div className="ot-compare-card">
        <div className="flex items-center justify-between mb-4 mt-1">
          <h3 className="m-0 text-[16px] font-bold text-[#1e1c10] dark:text-white flex items-center gap-2">
            <i className={`fi ${isUser ? "fi-sr-user text-[var(--text-muted)]" : "fi-sr-sparkles text-purple-600"}`}></i>
            <span>{title}</span>
          </h3>
          {isAi ? (
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-sub)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-0 cursor-pointer flex items-center gap-1 font-medium"
              title="วิเคราะห์พอร์ตใหม่ด้วย AI"
            >
              <i className={`fi fi-rr-refresh text-[10px] ${loading ? "animate-spin" : ""}`}></i>
              <span>{loading ? "กำลังวิเคราะห์..." : "วิเคราะห์ใหม่"}</span>
            </button>
          ) : (
            <a
              href="/simulator/wealth-plan"
              className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-sub)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-0 cursor-pointer flex items-center gap-1 font-medium no-underline"
              title="ไปที่หน้าเป้าหมายการเงินเพื่อปรับแต่งพอร์ต"
            >
              <i className="fi fi-rr-edit text-[10px]"></i>
              <span>ปรับแต่งพอร์ต</span>
            </a>
          )}
        </div>

        <div className="mb-5 text-[13px] text-[var(--text-muted)] min-h-[40px]">
          {data.summary}
        </div>

        <div className="flex gap-4 mb-6 mt-auto">
          <div className="flex-1 bg-[var(--bg-sub)] p-3 rounded-lg text-center">
            <div className="text-[11px] text-[var(--text-muted)] mb-1">คาดการณ์ผลตอบแทน (ต่อปี)</div>
            <div className="text-[15px] font-bold text-[var(--green)] font-['Space_Mono']">
              ฿{Math.round(currentCapital * ((data.expectedPortfolioYield || 0) / 100)).toLocaleString()} <span className="text-[12px] opacity-80">({data.expectedPortfolioYield}%)</span>
            </div>
          </div>
          <div className="flex-1 bg-[var(--bg-sub)] p-3 rounded-lg text-center">
            <div className="text-[11px] text-[var(--text-muted)] mb-1">ระดับความเสี่ยง</div>
            <div className="text-[14px] font-bold text-[var(--gold)] mt-1">{data.riskAssessment}</div>
          </div>
        </div>

        <div className="text-[14px] font-bold mb-3">
          {isUser ? "สินทรัพย์ที่คุณเลือก" : "สินทรัพย์ที่ AI แนะนำ"}
        </div>

        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {data.portfolioSuggestions.length > 0 ? (
            itemsToShow.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-[var(--bg-sub)] rounded-md">
                <div>
                  <div className="font-bold text-[13px]">{item.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{item.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[14px] font-['Space_Mono']">{item.allocation}%</div>
                  <div className="text-[10px] text-[var(--green)]">Yield {Number(item.expectedYield).toFixed(2)}%</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-[12px] text-[var(--text-muted)] py-6 flex flex-col items-center justify-center gap-2">
              <span>{isUser ? "ยังไม่มีรายการสินทรัพย์ในพอร์ตของคุณ" : "ไม่มีข้อมูลจัดพอร์ตสำหรับเป้าหมายนี้"}</span>
              {isUser && (
                <a
                  href="/simulator/wealth-plan"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-blue)] text-white text-xs font-semibold no-underline hover:opacity-90 transition-opacity"
                >
                  <i className="fi fi-rr-plus text-[10px]"></i>
                  <span>จัดพอร์ตในหน้าเป้าหมายการเงิน</span>
                </a>
              )}
            </div>
          )}

          {data.portfolioSuggestions.length > 3 && (
            <div
              className="text-center text-[11px] text-[var(--accent-blue)] mt-1 cursor-pointer font-bold py-1"
              onClick={() => setExpandedCard(isExpanded ? null : title)}
            >
              {isExpanded ? "ย่อลง" : `+ อีก ${data.portfolioSuggestions.length - 3} สินทรัพย์ (คลิกเพื่อดู)`}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Compute some totals for the dashboard


  return (
    <div className="tool-screen active">
      <div className="tool-page active w-full max-w-[1400px] mx-auto pb-10 overflow-hidden sm:overflow-visible">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-1 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1e1c10] dark:text-white tracking-tight m-0 pb-1 flex items-center gap-2">
              Dashboard <span className="font-medium text-[#747878] dark:text-gray-400">& Comparison</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 m-0">
              สรุปข้อมูลภาพรวมทางการเงินและเปรียบเทียบพอร์ตการลงทุนที่คุณจัดสรรเองกับพอร์ตที่ AI แนะนำ
            </p>
          </div>
        </div>

        {/* ── Summary Dashboard ── */}
        <div className="ot-summary-grid">
          <div className="ot-summary-card">
            <div className="ot-summary-header">
              <i className="fi fi-sr-wallet"></i> เงินเก็บ / เงินตั้งต้น
            </div>
            <div className="ot-summary-value text-[var(--text-main)]">
              ฿{currentCapital.toLocaleString()}
            </div>
          </div>

          <div className="ot-summary-card">
            <div className="ot-summary-header">
              <i className="fi fi-sr-shield-check"></i> สำรองฉุกเฉินเป้าหมาย
            </div>
            <div className="ot-summary-value text-[var(--accent-blue)]">
              ฿{emergencyFund.toLocaleString()}
            </div>
          </div>

          <div className="ot-summary-card">
            <div className="ot-summary-header">
              <i className="fi fi-sr-receipt"></i> รายจ่ายรวม (ต่อเดือน)
            </div>
            <div className="ot-summary-value text-[var(--red)]">
              ฿{totalExpenses.toLocaleString()}
            </div>
          </div>
        </div>

        {/* ── Graphs Section: ซ้าย = กราฟเส้นการลงทุน, ขวา = แผนภูมิรายจ่าย ── */}
        <div className="ot-graphs-grid">

          {/* Graph 1: Invest vs Bank */}
          <div className="ot-graph-card">
            <div
              className={`ot-graph-header ${!showInvestGraph ? '!border-b-0' : ''}`}
              onClick={() => setShowInvestGraph(!showInvestGraph)}
            >
              <div className="text-[16px] font-bold text-[var(--text-main)] flex items-center gap-2">
                <i className="fi fi-sr-chart-line-up text-[var(--accent-blue)]"></i>
                เปรียบเทียบการลงทุน vs ฝากเงินธนาคาร (10 ปี)
                <i 
                  className="fi fi-rr-info text-[var(--text-muted)] text-[14px] ml-[6px] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInvestInfo(!showInvestInfo);
                  }}
                  title="ดูคำอธิบายที่มาของมูลค่าพอร์ต"
                ></i>
              </div>
              <i className={`fi ${showInvestGraph ? 'fi-rr-angle-small-up' : 'fi-rr-angle-small-down'} text-[20px]`}></i>
            </div>

            {showInvestGraph && (
              <div className="p-5 h-auto">
                {showInvestInfo && (
                  <div className="p-4 bg-[var(--bg-main)] rounded-lg mb-4 text-[13px] text-[var(--text-muted)] border border-[var(--border)]">
                    <div className="font-bold text-[var(--text-main)] mb-2">ที่มาของการคำนวณมูลค่าพอร์ต:</div>
                    <ul className="pl-5 flex flex-col gap-1 m-0">
                      <li><b>นำเงินไปลงทุน (ตามผลตอบแทน AI):</b> คิดจากเงินลงทุนตั้งต้น ฿{initialInvestment.toLocaleString()} (หักเงินสำรองฉุกเฉินแล้ว) + เงินออม ฿{monthlySavings.toLocaleString()}/เดือน นำไปทบต้นด้วย <b>ผลตอบแทนคาดหวัง {Number(wealthPlanAi?.expectedPortfolioYield || 5).toFixed(2)}% ต่อปี</b></li>
                      <li><b>นำเงินไปลงทุน (พอร์ตของคุณ):</b> คิดจากเงินลงทุนตั้งต้น ฿{initialInvestment.toLocaleString()} (หักเงินสำรองฉุกเฉินแล้ว) + เงินออม ฿{monthlySavings.toLocaleString()}/เดือน นำไปทบต้นด้วย <b>ผลตอบแทนคาดหวัง {Number(retirementUser?.expectedPortfolioYield || 0).toFixed(2)}% ต่อปี</b></li>
                      <li><b>ฝากธนาคาร:</b> คิดจากเงินลงทุนตั้งต้น ฿{initialInvestment.toLocaleString()} (หักเงินสำรองฉุกเฉินแล้ว) + เงินออม ฿{monthlySavings.toLocaleString()}/เดือน นำไปทบต้นด้วย <b>อัตราดอกเบี้ยเงินฝากแบบขั้นบันไดของ {bankInfo?.name || 'ดอกเบี้ยทั่วไป (1%)'}</b></li>
                    </ul>
                  </div>
                )}
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={investData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => [`฿${value.toLocaleString()}`, '']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-sm)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="aiInvest" name="นำเงินไปลงทุน (ตามผลตอบแทน AI)" stroke="var(--accent-blue)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="userInvest" name="นำเงินไปลงทุน (พอร์ตของคุณ)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="bank" name={`ฝากธนาคาร (${bankInfo?.name || 'ดอกเบี้ย 1%'})`} stroke="var(--text-muted)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Graph 2: Expense vs Inflation */}
          <div className="ot-graph-card">
            <div
              className={`ot-graph-header ${!showExpenseGraph ? '!border-b-0' : ''}`}
              onClick={() => setShowExpenseGraph(!showExpenseGraph)}
            >
              <div className="text-[16px] font-bold text-[var(--text-main)] flex items-center gap-2">
                <i className="fi fi-sr-money-bill-wave text-[var(--red)]"></i>
                รายจ่ายปัจจุบันเทียบกับอนาคต
                <i 
                  className="fi fi-rr-info text-[var(--text-muted)] text-[14px] ml-[6px] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExpenseInfo(!showExpenseInfo);
                  }}
                  title="ดูคำอธิบายวิธีคิดเงินเฟ้อ"
                ></i>
              </div>
              <i className={`fi ${showExpenseGraph ? 'fi-rr-angle-small-up' : 'fi-rr-angle-small-down'} text-[20px]`}></i>
            </div>

            {showExpenseGraph && (
              <div className="p-5 h-auto">
                {showExpenseInfo && (
                  <div className="p-4 bg-[var(--bg-main)] rounded-lg mb-4 text-[13px] text-[var(--text-muted)] border border-[var(--border)]">
                    <div className="font-bold text-[var(--text-main)] mb-2">ที่มาของการคำนวณเงินเฟ้อ:</div>
                    <ul className="pl-5 flex flex-col gap-1 m-0">
                      <li><b>ปีแรก (ปัจจุบัน):</b> ใช้ข้อมูลอัตราเงินเฟ้อจริงที่ดึงจากระบบ หรือค่าที่คุณกำหนด <b>({actualInflation}%)</b></li>
                      <li><b>ปีถัดๆ ไป (อนาคต):</b> ตั้งสมมติฐานให้เงินเฟ้อเพิ่มขึ้นคงที่ในอัตรา <b>3% ต่อปี</b></li>
                    </ul>
                  </div>
                )}
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => [`฿${value.toLocaleString()}`, '']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-sm)' }}
                      cursor={{ fill: 'var(--bg-sub)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="current" name="รายจ่ายปัจจุบัน" fill="#fed330" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="future" name="รายจ่ายในอนาคต (เงินเฟ้อ)" fill="#f472b6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Portfolios Section ── */}

        {loading && !wealthPlanAi ? (
          <div className="flex flex-col lg:flex-row gap-6 justify-center items-stretch w-full">
            <div className="ot-compare-card">
              <SkeletonBox style={{ width: 180, height: 20, marginBottom: 12 }} />
              <SkeletonBox style={{ width: '100%', height: 40, marginBottom: 20 }} />
              <div className="flex gap-4 mb-6 mt-auto">
                <SkeletonBox style={{ flex: 1, height: 60, borderRadius: 12 }} />
                <SkeletonBox style={{ flex: 1, height: 60, borderRadius: 12 }} />
              </div>
              <SkeletonBox style={{ width: 140, height: 16, marginBottom: 12 }} />
              <SkeletonTableRows count={3} />
            </div>
            <div className="ot-compare-card">
              <SkeletonBox style={{ width: 180, height: 20, marginBottom: 12 }} />
              <SkeletonBox style={{ width: '100%', height: 40, marginBottom: 20 }} />
              <div className="flex gap-4 mb-6 mt-auto">
                <SkeletonBox style={{ flex: 1, height: 60, borderRadius: 12 }} />
                <SkeletonBox style={{ flex: 1, height: 60, borderRadius: 12 }} />
              </div>
              <SkeletonBox style={{ width: 140, height: 16, marginBottom: 12 }} />
              <SkeletonTableRows count={3} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 justify-center items-stretch w-full">
            {renderCard("พอร์ตเกษียณ (ของคุณ)", retirementUser, true)}
            {renderCard("พอร์ต AI แนะนำภาพรวม", wealthPlanAi || DEFAULT_AI_PORTFOLIO)}
          </div>
        )}

        {/* Economic Map Card */}
            <div className="ot-map-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--border)]">
                <div className="ot-map-title flex items-center gap-2 font-bold text-sm sm:text-base text-[var(--text-main)]">
                  <i className="fi fi-sr-globe text-[18px] text-[var(--accent-blue,#0284c7)]"></i>
                  <span>แผนที่เศรษฐกิจทั่วโลก (Economic Map)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    TradingView Live Feed
                  </span>
                  {mapUpdatedAt && (
                    <span className="text-[11px]">
                      อัปเดตล่าสุด: <strong className="text-[var(--text-main)] font-semibold">{mapUpdatedAt} น.</strong>
                    </span>
                  )}
                  <button 
                    onClick={handleRefreshMap}
                    className="p-1 rounded-full hover:bg-[var(--bg-sub)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-0 bg-transparent cursor-pointer flex items-center justify-center"
                    title="รีเฟรชข้อมูลแผนที่"
                  >
                    <i className={`fi fi-rr-refresh text-xs ${isMapRefreshing ? 'animate-spin' : ''}`}></i>
                  </button>
                </div>
              </div>
              <div key={mapKey} className="ot-map-container mt-4 w-full rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-main)]">
                <Script type="module" src="https://widgets.tradingview-widget.com/w/th_TH/tv-economic-map.js" strategy="lazyOnload" />
                {React.createElement("tv-economic-map", { metric: "iryy", metrics: "iryy,gdg,intr" })}
              </div>
            </div>
      </div>
    </div>
  );
}
