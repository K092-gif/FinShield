"use client";
import "../ui/RetirementTool.css";
import "../ui/AiAdvisor.css";
import "../ui/PortfolioOverviewTool.css";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFinance } from "@/contexts/FinanceContext";
import { API_BASE_URL } from "@/lib/api";
import Script from "next/script";

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

export default function PortfolioOverviewTool() {
  const { user } = useAuth();
  const { financeData, loading: financeLoading } = useFinance();
  
  const [loading, setLoading] = useState(false);
  const [wealthPlanAi, setWealthPlanAi] = useState<AiResponse | null>(null);
  const [retirementUser, setRetirementUser] = useState<AiResponse | null>(null);

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
            portfolioSuggestions: suggestions.sort((a,b) => b.allocation - a.allocation)
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

  const renderCard = (title: string, icon: string, color: string, data: AiResponse | null, isUser: boolean = false) => {
    if (!data) {
      return (
        <div className="card pot-loading-card" style={{ flex: 1, minWidth: '350px', maxWidth: '600px' }}>
          <div className="pot-loading-text">กำลังวิเคราะห์ข้อมูล...</div>
        </div>
      );
    }

    const isExpanded = expandedCard === title;
    const itemsToShow = isExpanded ? data.portfolioSuggestions : data.portfolioSuggestions.slice(0, 5);
    const isAi = !isUser;

    return (
      <div className="card pot-card-container" style={{ flex: 1, minWidth: '350px', maxWidth: '600px', display: 'flex', flexDirection: 'column' }}>
        <div className="pot-card-top-bar" style={{ background: color }}></div>
        <div className="pot-card-header">
          <i className={`fi ${icon} pot-card-icon`} style={{ color }}></i>
          <h3 className="pot-card-title">{title}</h3>
        </div>
        
        <div className="pot-card-desc">
          {data.summary}
        </div>

        <div className="pot-stats-row" style={{ marginTop: 'auto' }}>
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
                  <div className="pot-item-yield">Yield {item.expectedYield}%</div>
                </div>
              </div>
            ))
          ) : (
            <div className="pot-empty-alloc">
              ไม่มีข้อมูลจัดพอร์ตสำหรับเป้าหมายนี้
            </div>
          )}
          
          {isAi && (
            <div onClick={() => fetchData(true)} className="pot-reload-btn">
              ↻ วิเคราะห์ใหม่
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
  const totalExpenses = Object.values(financeData.expenses || {}).reduce((sum, val) => sum + (val || 0), 0);

  return (
    <div className="tool-screen active">
      <div className="tool-page active" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
        <div className="tool-header" style={{ marginBottom: '24px' }}>
          <div className="tool-title" style={{ fontSize: '28px' }}>Dashboard <span>& Comparison</span></div>
          <div className="tool-sub" style={{ fontSize: '15px' }}>
            สรุปข้อมูลภาพรวมทางการเงินและเปรียบเทียบพอร์ตการลงทุนที่คุณจัดสรรเองกับพอร์ตที่ AI แนะนำ
          </div>
        </div>

        {/* ── Summary Dashboard ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fi fi-sr-wallet"></i> เงินเก็บ / เงินตั้งต้น
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)' }}>
              ฿{(financeData.assets.currentCapital || 0).toLocaleString()}
            </div>
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fi fi-sr-shield-check"></i> สำรองฉุกเฉินเป้าหมาย
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-blue)' }}>
              ฿{(financeData.assets.emergencyFund || 0).toLocaleString()}
            </div>
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fi fi-sr-receipt"></i> รายจ่ายรวม (ต่อเดือน)
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--red)' }}>
              ฿{totalExpenses.toLocaleString()}
            </div>
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fi fi-sr-calendar-clock"></i> อายุเกษียณเป้าหมาย
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--gold)' }}>
              {financeData.retirement.retirementAge || 60} <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)' }}>ปี</span>
            </div>
          </div>
          
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fi fi-sr-coins"></i> เป้าหมายปันผล (ต่อปี)
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--green)' }}>
              ฿{((financeData.retirement.dividendGoal || 0) * 12).toLocaleString()}
            </div>
          </div>
        </div>

        {(!wealthPlanAi && !loading) ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
            <div style={{ width: '80px', height: '80px', background: 'var(--bg-sub)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <i className="fi fi-sr-chart-mixed" style={{ fontSize: '32px', color: 'var(--accent-blue)' }}></i>
            </div>
            <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>วิเคราะห์และเปรียบเทียบพอร์ตแบบเจาะลึก</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
              ระบบจะทำการดึงข้อมูล AI เพื่อจัดพอร์ตภาพรวมให้เหมาะสมที่สุดในสถานการณ์ปัจจุบัน นำมาเทียบกับพอร์ตเกษียณที่คุณจัดไว้เอง
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => fetchData(false)}
              style={{ padding: '12px 32px', fontSize: '16px' }}
            >
              <i className="fi fi-sr-magic-wand"></i> เริ่มการวิเคราะห์เปรียบเทียบ
            </button>
          </div>
        ) : (
          <>
            {loading && (
              <div className="pot-loading-banner" style={{ marginBottom: '24px' }}>
                <div className="ai-loading-dots pot-loading-dots-wrap"><span></span><span></span><span></span></div>
                กำลังเรียกข้อมูล & วิเคราะห์พอร์ตล่าสุดจาก AI...
              </div>
            )}
            
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              justifyContent: 'center',
              alignItems: 'stretch'
            }}>
              {renderCard("พอร์ตเกษียณ (ของคุณ)", "fi-sr-user-check", "var(--green)", retirementUser, true)}
              {renderCard("พอร์ต AI แนะนำภาพรวม", "fi-sr-robot", "var(--accent-blue)", wealthPlanAi)}
            </div>

            {/* Economic Map Card */}
            <div className="card" style={{ marginTop: '32px' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fi fi-sr-globe" style={{ fontSize: '18px' }}></i> แผนที่เศรษฐกิจทั่วโลก (Economic Map)
              </div>
              <div style={{ marginTop: '16px', height: '600px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
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
