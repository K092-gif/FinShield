"use client";
import "../ui/OverviewTool.css";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFinance } from "@/contexts/FinanceContext";
import { API_BASE_URL } from "@/lib/api";

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

export default function OverviewTool() {
  const { user } = useAuth();
  const { financeData, loading: financeLoading } = useFinance();

  const [loading, setLoading] = useState(false);
  const [wealthPlanAi, setWealthPlanAi] = useState<AiResponse | null>(null);
  const [retirementUser, setRetirementUser] = useState<AiResponse | null>(null);

  const [selectedBank] = useLocalStorage("wpt_selectedBank", "kkp_dime");
  const [bankTiers, setBankTiers] = useState<Record<string, { name: string; tiers: Array<{ minBalance: number; rate: number }> }>>({});

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/simulator/banks`);
        if (res.ok) {
          const banks = await res.json();
          const banksMap: Record<string, any> = {};
          banks.forEach((b: any) => banksMap[b.id] = { name: b.name, tiers: b.tiers });
          setBankTiers(banksMap);
        }
      } catch (err) {
        console.error("Failed to fetch bank tiers", err);
      }
    };
    fetchBanks();
  }, []);

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

    // 2. Fallback to localStorage transactions
    const storageKey = `finshield-portfolio-myport-${user?.uid || 'guest'}`;
    const fallbackKey = `finshield-portfolio-state-${user?.uid || 'guest'}`;
    const savedStr = localStorage.getItem(storageKey) || localStorage.getItem(fallbackKey);

    if (!savedStr) {
      setRetirementUser({
        summary: "ยังไม่มีข้อมูลพอร์ตเกษียณ กรุณาจัดพอร์ตในหน้าเป้าหมายการเงิน",
        expectedPortfolioYield: 0,
        riskAssessment: "N/A",
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
          market: assetInfo?.category === 'us-stock' ? 'US' : 'TH',
        });
      });

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
    }
  }, [user]);

  // Load portfolio: read from cache instantly, then fetch assets if cache is empty
  const loadRetirementPortfolio = useCallback(async () => {
    try {
      let cachedAssets: any[] = [];
      try {
        const raw = localStorage.getItem(LS_ASSETS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.data) && parsed.data.length > 0) {
            cachedAssets = parsed.data;
          }
        }
      } catch {}

      if (cachedAssets.length > 0) {
        computeAndSetPortfolio(cachedAssets);
      }

      if (cachedAssets.length === 0) {
        try {
          const res = await fetch(`${API_BASE_URL}/simulator/assets`);
          if (res.ok) {
            const assetsRaw: any[] = await res.json();
            if (assetsRaw.length > 0) {
              try {
                localStorage.setItem(LS_ASSETS_KEY, JSON.stringify({ data: assetsRaw, ts: Date.now() }));
              } catch {}
              computeAndSetPortfolio(assetsRaw);
            }
          }
        } catch (fetchErr) {
          console.error("Failed to fetch assets for portfolio", fetchErr);
          computeAndSetPortfolio([]);
        }
      }
    } catch (e) {
      console.error("Failed to load retirement user portfolio", e);
    }
  }, [user, computeAndSetPortfolio]);

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
          const risk = parsed.some((p: any) => p.riskLevel?.toLowerCase().includes('สูง') || p.riskLevel?.toLowerCase().includes('high')) ? 'สูง'
            : parsed.every((p: any) => p.riskLevel?.toLowerCase().includes('ต่ำ') || p.riskLevel?.toLowerCase().includes('low')) ? 'ต่ำ' : 'ปานกลาง';

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
    const wpKey = `finshield-ai-wealth_plan-${user?.uid || 'guest'}`;
    const wp = localStorage.getItem(wpKey);
    if (wp) {
      try {
        setWealthPlanAi(JSON.parse(wp));
      } catch (e) {
        console.error("Failed to parse wpKey", e);
      }
    }
  }, [user]);

  useEffect(() => {
    loadAiPortfolio();
    loadRetirementPortfolio();
  }, [user, loadAiPortfolio, loadRetirementPortfolio]);

  // Re-read portfolio from localStorage whenever user returns to this tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadAiPortfolio();
        loadRetirementPortfolio();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadAiPortfolio, loadRetirementPortfolio]);

  useEffect(() => {
    if (financeLoading) return;
    const wpKey = `finshield-ai-wealth_plan-${user?.uid || 'guest'}`;
    if (!localStorage.getItem(wpKey) && wealthPlanAi) {
      fetchData(false);
    }
  }, [financeLoading, user, wealthPlanAi]);

  const fetchData = async (force: boolean = false) => {
    if (financeLoading) return;
    setLoading(true);

    try {
      const wpKey = `finshield-ai-wealth_plan-${user?.uid || 'guest'}`;
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

        const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal: "wealth_plan", context: financeData.assets }),
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(wpKey, JSON.stringify(data));
          setWealthPlanAi(data);
        }
      }

      await loadRetirementPortfolio();

    } catch (err) {
      console.error("Failed to load overview data:", err);
    } finally {
      setLoading(false);
    }
  };

  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showInvestGraph, setShowInvestGraph] = useState(true);
  const [showInvestInfo, setShowInvestInfo] = useState(false);
  const [showExpenseGraph, setShowExpenseGraph] = useState(true);
  const [showExpenseInfo, setShowExpenseInfo] = useState(false);

  // Generate Graph Data
  const currentCapital = financeData.assets.currentCapital || 0;
  const monthlySavings = financeData.assets.monthlySavings || 0;
  const totalExpenses = Object.values(financeData.expenses || {}).reduce((sum, val) => sum + (val || 0), 0);
  const emergencyFund = financeData.assets.emergencyFund || (totalExpenses * 6);
  const initialInvestment = Math.max(0, currentCapital - emergencyFund);

  const investData = [];
  const expenseData = [];

  const investRate = (wealthPlanAi?.expectedPortfolioYield || 5) / 100;
  const userInvestRate = (retirementUser?.expectedPortfolioYield || 0) / 100;
  const [actualInflation] = useLocalStorage("wpt_inflationRate", 3);
  const actualRate = actualInflation / 100;
  const inflationRate = 0.03;

  let currentInvest = initialInvestment;
  let currentUserInvest = initialInvestment;
  let currentBank = initialInvestment;
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

  const renderCard = (title: string, icon: string, color: string, data: AiResponse | null, isUser: boolean = false) => {
    if (!data) {
      return (
        <div className="ot-compare-card justify-center items-center">
          <div className="text-[var(--text-muted)] text-[14px]">กำลังวิเคราะห์ข้อมูล...</div>
        </div>
      );
    }

    const isExpanded = expandedCard === title;
    const itemsToShow = isExpanded ? data.portfolioSuggestions : data.portfolioSuggestions.slice(0, 5);
    const isAi = !isUser;

    return (
      <div className="ot-compare-card">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color }}></div>
        <div className="flex items-center gap-2 mb-4 mt-1">
          <i className={`fi ${icon} text-[20px]`} style={{ color }}></i>
          <h3 className="m-0 text-[16px] font-bold">{title}</h3>
        </div>

        <div className="mb-5 text-[13px] text-[var(--text-muted)] min-h-[40px]">
          {data.summary}
        </div>

        <div className="flex gap-4 mb-6 mt-auto">
          <div className="flex-1 bg-[var(--bg-sub)] p-3 rounded-lg text-center">
            <div className="text-[11px] text-[var(--text-muted)] mb-1">คาดการณ์ผลตอบแทน (ต่อปี)</div>
            <div className="text-[15px] font-bold text-[var(--green)] font-['Space_Mono']">
              ฿{Math.round((financeData.assets.currentCapital || 0) * ((data.expectedPortfolioYield || 0) / 100)).toLocaleString()} <span className="text-[12px] opacity-80">({data.expectedPortfolioYield}%)</span>
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
            <div className="text-center text-[12px] text-[var(--text-muted)] mt-5">
              ไม่มีข้อมูลจัดพอร์ตสำหรับเป้าหมายนี้
            </div>
          )}

          {data.portfolioSuggestions.length > 5 && (
            <div
              className="text-center text-[11px] text-[var(--accent-blue)] mt-1 cursor-pointer font-bold py-1"
              onClick={() => setExpandedCard(isExpanded ? null : title)}
            >
              {isExpanded ? "ย่อลง" : `+ อีก ${data.portfolioSuggestions.length - 5} สินทรัพย์ (คลิกเพื่อดู)`}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Compute some totals for the dashboard


  return (
    <div className="tool-screen active">
      <div className="tool-page active max-w-[1400px] mx-auto pb-10">
        <div className="tool-header mb-6">
          <div className="tool-title text-[28px]">Dashboard <span>& Comparison</span></div>
          <div className="tool-sub text-[15px]">
            สรุปข้อมูลภาพรวมทางการเงินและเปรียบเทียบพอร์ตการลงทุนที่คุณจัดสรรเองกับพอร์ตที่ AI แนะนำ
          </div>
        </div>

        {/* ── Summary Dashboard ── */}
        <div className="ot-summary-grid">
          <div className="ot-summary-card">
            <div className="ot-summary-header">
              <i className="fi fi-sr-wallet"></i> เงินเก็บ / เงินตั้งต้น
            </div>
            <div className="ot-summary-value text-[var(--text-main)]">
              ฿{(financeData.assets.currentCapital || 0).toLocaleString()}
            </div>
          </div>

          <div className="ot-summary-card">
            <div className="ot-summary-header">
              <i className="fi fi-sr-shield-check"></i> สำรองฉุกเฉินเป้าหมาย
            </div>
            <div className="ot-summary-value text-[var(--accent-blue)]">
              ฿{(financeData.assets.emergencyFund || 0).toLocaleString()}
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

        {/* ── Graphs Section ── */}
        <div className="flex flex-col gap-4 mb-8">

          {/* Graph 1: Invest vs Bank */}
          <div className="ot-graph-card">
            <div
              className="ot-graph-header"
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
              className="ot-graph-header"
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
                    <Bar dataKey="current" name="รายจ่ายปัจจุบัน" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="future" name="รายจ่ายในอนาคต (เงินเฟ้อ)" fill="#fb923c" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Portfolios Section ── */}

        {(!wealthPlanAi && !loading) ? (
          <div className="ot-empty-state">
            <div className="w-[80px] h-[80px] bg-[var(--bg-sub)] rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fi fi-sr-chart-mixed text-[32px] text-[var(--accent-blue)]"></i>
            </div>
            <h2 className="text-[20px] mb-3">วิเคราะห์และเปรียบเทียบพอร์ตแบบเจาะลึก</h2>
            <p className="text-[var(--text-muted)] max-w-[500px] mx-auto mb-8">
              ระบบจะทำการดึงข้อมูล AI เพื่อจัดพอร์ตภาพรวมให้เหมาะสมที่สุดในสถานการณ์ปัจจุบัน นำมาเทียบกับพอร์ตเกษียณที่คุณจัดไว้เอง
            </p>
            <button
              className="btn btn-primary px-8 py-3 text-[16px]"
              onClick={() => fetchData(false)}
            >
              <i className="fi fi-sr-sparkles"></i> เริ่มการวิเคราะห์เปรียบเทียบ
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-6 justify-center items-stretch">
              {renderCard("พอร์ตเกษียณ (ของคุณ)", "fi-sr-user-check", "var(--green)", retirementUser, true)}
              {renderCard("พอร์ต AI แนะนำภาพรวม", "fi-sr-robot", "var(--accent-blue)", wealthPlanAi)}
            </div>

            {/* Economic Map Card */}
            <div className="ot-map-card">
              <div className="ot-map-title">
                <i className="fi fi-sr-globe text-[18px]"></i> แผนที่เศรษฐกิจทั่วโลก (Economic Map)
              </div>
              <div className="mt-4 h-[600px] w-full rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg-main)]">
                <Script type="module" src="https://widgets.tradingview-widget.com/w/th_TH/tv-economic-map.js" strategy="lazyOnload" />
                {React.createElement("tv-economic-map", { metric: "iryy", metrics: "iryy,gdg,intr" })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
