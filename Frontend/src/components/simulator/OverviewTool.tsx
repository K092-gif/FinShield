"use client";
import "../ui/PortnTax.css";
import "../ui/AiAdvisor.css";
import "../ui/OverviewTool.css";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFinance } from "@/contexts/FinanceContext";
import { API_BASE_URL } from "@/lib/api";
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

  const [selectedBank] = useLocalStorage("rt_selectedBank", "kkp_dime");
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

  const loadRetirementPortfolio = async () => {
    try {
      const assetsRes = await fetch(`${API_BASE_URL}/simulator/assets`);
      if (assetsRes.ok) {
        const assets: any[] = await assetsRes.json();
        const storageKey = `finshield-portfolio-state-${user?.uid || 'guest'}`;
        const savedTransactionsStr = localStorage.getItem(storageKey);

        if (savedTransactionsStr) {
          const txns = JSON.parse(savedTransactionsStr);
          let totalAlloc = 0;
          let weightedYield = 0;
          const suggestions: PortfolioSuggestion[] = [];

          Object.keys(txns).forEach(assetId => {
            const assetInfo = assets.find(a => a.id === assetId);
            const assetAlloc = txns[assetId].reduce((sum: number, t: any) => sum + Number(t.allocation || 0), 0);

            if (assetAlloc > 0 && assetInfo) {
              totalAlloc += assetAlloc;
              const yieldVal = assetInfo.yield || 0;
              weightedYield += (assetAlloc / 100) * yieldVal;

              suggestions.push({
                name: assetInfo.id,
                type: assetInfo.type || "Asset",
                allocation: assetAlloc,
                expectedYield: yieldVal,
                riskLevel: "User Select",
                reason: assetInfo.name,
                market: assetInfo.market || "Unknown",
              });
            }
          });

          if (totalAlloc > 0 && totalAlloc !== 100) {
            suggestions.forEach(s => s.allocation = Math.round((s.allocation / totalAlloc) * 100));
          }

          setRetirementUser({
            summary: "พอร์ตเกษียณที่คุณจัดสรรด้วยตัวเองจากหน้าวางแผนเกษียณ",
            expectedPortfolioYield: Number(weightedYield.toFixed(2)),
            riskAssessment: "ตามสินทรัพย์ที่เลือก",
            portfolioSuggestions: suggestions.sort((a, b) => b.allocation - a.allocation)
          });
        } else {
          setRetirementUser({
            summary: "ยังไม่มีข้อมูลพอร์ตเกษียณ กรุณาจัดพอร์ตในหน้าแรก",
            expectedPortfolioYield: 0,
            riskAssessment: "N/A",
            portfolioSuggestions: []
          });
        }
      }
    } catch (e) {
      console.error("Failed to load retirement user portfolio", e);
    }
  };

  useEffect(() => {
    const wpKey = `finshield-ai-wealth_plan-${user?.uid || 'guest'}`;
    const wp = localStorage.getItem(wpKey);

    if (wp) setWealthPlanAi(JSON.parse(wp));

    loadRetirementPortfolio();
  }, [user]);

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

  const investData = [];
  const expenseData = [];

  const investRate = (wealthPlanAi?.expectedPortfolioYield || 5) / 100;
  const userInvestRate = (retirementUser?.expectedPortfolioYield || 0) / 100;
  const [actualInflation] = useLocalStorage("wpt_inflationRate", 3);
  const actualRate = actualInflation / 100;
  const inflationRate = 0.03;

  let currentInvest = currentCapital;
  let currentUserInvest = currentCapital;
  let currentBank = currentCapital;
  let currentFutExp = totalExpenses;

  const bankInfo = bankTiers[selectedBank as string];

  for (let i = 0; i <= 10; i++) {
    if (i > 0) {
      currentInvest = (currentInvest + monthlySavings * 12) * (1 + investRate);
      currentUserInvest = (currentUserInvest + monthlySavings * 12) * (1 + userInvestRate);

      for (let m = 0; m < 12; m++) {
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
        <div className="card pot-loading-card pot-card-wrapper">
          <div className="pot-loading-text">กำลังวิเคราะห์ข้อมูล...</div>
        </div>
      );
    }

    const isExpanded = expandedCard === title;
    const itemsToShow = isExpanded ? data.portfolioSuggestions : data.portfolioSuggestions.slice(0, 5);
    const isAi = !isUser;

    return (
      <div className="card pot-card-container pot-card-wrapper">
        <div className="pot-card-top-bar" style={{ background: color }}></div>
        <div className="pot-card-header">
          <i className={`fi ${icon} pot-card-icon`} style={{ color }}></i>
          <h3 className="pot-card-title">{title}</h3>
        </div>

        <div className="pot-card-desc">
          {data.summary}
        </div>

        <div className="pot-stats-row pot-margin-auto">
          <div className="pot-stat-box">
            <div className="pot-stat-label">คาดการณ์ผลตอบแทน (ต่อปี)</div>
            <div className="pot-stat-val-yield">
              ฿{Math.round((financeData.assets.currentCapital || 0) * ((data.expectedPortfolioYield || 0) / 100)).toLocaleString()} <span className="pot-stat-yield-pct">({data.expectedPortfolioYield}%)</span>
            </div>
          </div>
          <div className="pot-stat-box">
            <div className="pot-stat-label">ระดับความเสี่ยง</div>
            <div className="pot-stat-val-risk">{data.riskAssessment}</div>
          </div>
        </div>

        <div className="pot-alloc-label">
          {isUser ? "สินทรัพย์ที่คุณเลือก" : "สินทรัพย์ที่ AI แนะนำ"}
        </div>

        <div className="pot-items-list">
          {data.portfolioSuggestions.length > 0 ? (
            itemsToShow.map((item, idx) => (
              <div key={idx} className="pot-item-row">
                <div>
                  <div className="pot-item-name">{item.name}</div>
                  <div className="pot-item-type">{item.type}</div>
                </div>
                <div className="pot-item-right">
                  <div className="pot-item-alloc">{item.allocation}%</div>
                  <div className="pot-item-yield">Yield {Number(item.expectedYield).toFixed(2)}%</div>
                </div>
              </div>
            ))
          ) : (
            <div className="pot-empty-alloc">
              ไม่มีข้อมูลจัดพอร์ตสำหรับเป้าหมายนี้
            </div>
          )}

          {data.portfolioSuggestions.length > 5 && (
            <div
              className="pot-expand-btn"
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
      <div className="tool-page active pot-page-wrapper">
        <div className="tool-header pot-header-margin">
          <div className="tool-title pot-title-large">Dashboard <span>& Comparison</span></div>
          <div className="tool-sub pot-sub-large">
            สรุปข้อมูลภาพรวมทางการเงินและเปรียบเทียบพอร์ตการลงทุนที่คุณจัดสรรเองกับพอร์ตที่ AI แนะนำ
          </div>
        </div>

        {/* ── Summary Dashboard ── */}
        <div className="pot-summary-grid">
          <div className="card pot-summary-card">
            <div className="pot-summary-card-title">
              <i className="fi fi-sr-wallet"></i> เงินเก็บ / เงินตั้งต้น
            </div>
            <div className="pot-summary-card-value pot-val-main">
              ฿{(financeData.assets.currentCapital || 0).toLocaleString()}
            </div>
          </div>

          <div className="card pot-summary-card">
            <div className="pot-summary-card-title">
              <i className="fi fi-sr-shield-check"></i> สำรองฉุกเฉินเป้าหมาย
            </div>
            <div className="pot-summary-card-value pot-val-blue">
              ฿{(financeData.assets.emergencyFund || 0).toLocaleString()}
            </div>
          </div>

          <div className="card pot-summary-card">
            <div className="pot-summary-card-title">
              <i className="fi fi-sr-receipt"></i> รายจ่ายรวม (ต่อเดือน)
            </div>
            <div className="pot-summary-card-value pot-val-red">
              ฿{totalExpenses.toLocaleString()}
            </div>
          </div>
        </div>

        {/* ── Graphs Section ── */}
        <div className="pot-graphs-section">

          {/* Graph 1: Invest vs Bank */}
          <div className="card pot-graph-card">
            <div
              className="pot-graph-accordion-header"
              onClick={() => setShowInvestGraph(!showInvestGraph)}
            >
              <div className="pot-graph-accordion-title">
                <i className="fi fi-sr-chart-line-up pot-icon-blue"></i>
                เปรียบเทียบการลงทุน vs ฝากเงินธนาคาร (10 ปี)
                <i 
                  className="fi fi-rr-info" 
                  style={{ color: 'var(--text-muted)', fontSize: '14px', marginLeft: '6px', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInvestInfo(!showInvestInfo);
                  }}
                  title="ดูคำอธิบายที่มาของมูลค่าพอร์ต"
                ></i>
              </div>
              <i className={`fi ${showInvestGraph ? 'fi-rr-angle-small-up' : 'fi-rr-angle-small-down'} pot-accordion-icon`}></i>
            </div>

            {showInvestGraph && (
              <div className="pot-graph-container" style={{ height: 'auto' }}>
                {showInvestInfo && (
                  <div style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px' }}>ที่มาของการคำนวณมูลค่าพอร์ต:</div>
                    <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                      <li><b>นำเงินไปลงทุน (ตามผลตอบแทน AI):</b> คิดจากเงินตั้งต้น + เงินออมต่อเดือน นำไปทบต้นด้วย <b>ผลตอบแทนคาดหวัง {Number(wealthPlanAi?.expectedPortfolioYield || 5).toFixed(2)}% ต่อปี</b></li>
                      <li><b>นำเงินไปลงทุน (พอร์ตของคุณ):</b> คิดจากเงินตั้งต้น + เงินออมต่อเดือน นำไปทบต้นด้วย <b>ผลตอบแทนคาดหวัง {Number(retirementUser?.expectedPortfolioYield || 0).toFixed(2)}% ต่อปี</b></li>
                      <li><b>ฝากธนาคาร:</b> คิดจากเงินตั้งต้น + เงินออมต่อเดือน นำไปทบต้นด้วย <b>อัตราดอกเบี้ยเงินฝากแบบขั้นบันไดของ {bankInfo?.name || 'ดอกเบี้ยทั่วไป (1%)'}</b></li>
                    </ul>
                  </div>
                )}
                <div style={{ height: '350px' }}>
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

          {/* Graph 2: Current vs Future Expenses */}
          <div className="card pot-graph-card">
            <div
              className="pot-graph-accordion-header"
              onClick={() => setShowExpenseGraph(!showExpenseGraph)}
            >
              <div className="pot-graph-accordion-title">
                <i className="fi fi-sr-money-bill-wave pot-icon-red"></i>
                รายจ่ายปัจจุบันเทียบกับอนาคต
                <i 
                  className="fi fi-rr-info" 
                  style={{ color: 'var(--text-muted)', fontSize: '14px', marginLeft: '6px', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExpenseInfo(!showExpenseInfo);
                  }}
                  title="ดูคำอธิบายวิธีคิดเงินเฟ้อ"
                ></i>
              </div>
              <i className={`fi ${showExpenseGraph ? 'fi-rr-angle-small-up' : 'fi-rr-angle-small-down'} pot-accordion-icon`}></i>
            </div>

            {showExpenseGraph && (
              <div className="pot-graph-container" style={{ height: 'auto' }}>
                {showExpenseInfo && (
                  <div style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px' }}>ที่มาของการคำนวณเงินเฟ้อ:</div>
                    <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                      <li><b>ปีแรก (ปัจจุบัน):</b> ใช้ข้อมูลอัตราเงินเฟ้อจริงที่ดึงจากระบบ หรือค่าที่คุณกำหนด <b>({actualInflation}%)</b></li>
                      <li><b>ปีถัดๆ ไป (อนาคต):</b> ตั้งสมมติฐานให้เงินเฟ้อเพิ่มขึ้นคงที่ในอัตรา <b>3% ต่อปี</b></li>
                    </ul>
                  </div>
                )}
                <div style={{ height: '350px' }}>
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
          <div className="pot-empty-state-card">
            <div className="pot-empty-state-icon-wrapper">
              <i className="fi fi-sr-chart-mixed pot-empty-state-icon"></i>
            </div>
            <h2 className="pot-empty-state-title">วิเคราะห์และเปรียบเทียบพอร์ตแบบเจาะลึก</h2>
            <p className="pot-empty-state-desc">
              ระบบจะทำการดึงข้อมูล AI เพื่อจัดพอร์ตภาพรวมให้เหมาะสมที่สุดในสถานการณ์ปัจจุบัน นำมาเทียบกับพอร์ตเกษียณที่คุณจัดไว้เอง
            </p>
            <button
              className="btn btn-primary pot-empty-state-btn"
              onClick={() => fetchData(false)}
            >
              <i className="fi fi-sr-sparkles"></i> เริ่มการวิเคราะห์เปรียบเทียบ
            </button>
          </div>
        ) : (
          <>
            <div className="pot-portfolios-grid">
              {renderCard("พอร์ตเกษียณ (ของคุณ)", "fi-sr-user-check", "var(--green)", retirementUser, true)}
              {renderCard("พอร์ต AI แนะนำภาพรวม", "fi-sr-robot", "var(--accent-blue)", wealthPlanAi)}
            </div>

            {/* Economic Map Card */}
            <div className="card pot-economic-card">
              <div className="card-title pot-economic-title">
                <i className="fi fi-sr-globe pot-economic-icon"></i> แผนที่เศรษฐกิจทั่วโลก (Economic Map)
              </div>
              <div className="pot-economic-map-container">
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
