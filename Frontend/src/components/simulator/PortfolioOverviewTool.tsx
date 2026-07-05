"use client";
import "../ui/RetirementTool.css";
import "../ui/AiAdvisor.css";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFinance } from "@/contexts/FinanceContext";
import { API_BASE_URL } from "@/lib/api";

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
  const [inflationAi, setInflationAi] = useState<AiResponse | null>(null);
  const [emergencyAi, setEmergencyAi] = useState<AiResponse | null>(null);
  const [overallAi, setOverallAi] = useState<AiResponse | null>(null);
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
    const infKey = `finshield-ai-inflation-${user?.uid || 'guest'}`;
    const emgKey = `finshield-ai-emergency-${user?.uid || 'guest'}`;
    const ovrKey = `finshield-ai-overall-${user?.uid || 'guest'}`;
    
    const inf = localStorage.getItem(infKey);
    const emg = localStorage.getItem(emgKey);
    const ovr = localStorage.getItem(ovrKey);

    if (inf) setInflationAi(JSON.parse(inf));
    if (emg) setEmergencyAi(JSON.parse(emg));
    if (ovr) setOverallAi(JSON.parse(ovr));
    
    loadRetirementPortfolio();
  }, [user]);

  useEffect(() => {
    if (financeLoading) return;
    const goals = ["inflation", "emergency", "overall"];
    const missingGoals = goals.filter(goal => !localStorage.getItem(`finshield-ai-${goal}-${user?.uid || 'guest'}`));
    if (missingGoals.length > 0 && (inflationAi || emergencyAi || overallAi)) {
      // If some exist but others are missing, auto fetch the missing ones
      fetchData(false);
    }
  }, [financeLoading, user, inflationAi, emergencyAi, overallAi]);

  const fetchData = async (force: boolean = false) => {
    if (financeLoading) return;
    setLoading(true);
    
    try {
      const goals = ["inflation", "emergency", "overall"];
      let missingGoals = goals;
      
      if (!force) {
        missingGoals = goals.filter(goal => !localStorage.getItem(`finshield-ai-${goal}-${user?.uid || 'guest'}`));
      }

      if (missingGoals.length > 0) {
        if (force) {
          // Clear current states if force fetching to show "รอการประมวลผล..."
          setInflationAi(null);
          setEmergencyAi(null);
          setOverallAi(null);
        }

        const aiPromises = missingGoals.map(goal => 
          fetch(`${API_BASE_URL}/ai/suggest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ goal, context: financeData.assets }),
          })
          .then(res => res.ok ? res.json() : null)
          .then(res => {
            if (res) {
              const storageKey = `finshield-ai-${goal}-${user?.uid || 'guest'}`;
              localStorage.setItem(storageKey, JSON.stringify(res));
              if (goal === "inflation") setInflationAi(res);
              if (goal === "emergency") setEmergencyAi(res);
              if (goal === "overall") setOverallAi(res);
            }
          })
          .catch(err => console.error(`Failed to fetch ${goal}:`, err))
        );

        await Promise.all(aiPromises);
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
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '300px', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>รอการประมวลผล...</div>
        </div>
      );
    }

    const isExpanded = expandedCard === title;
    const itemsToShow = isExpanded ? data.portfolioSuggestions : data.portfolioSuggestions.slice(0, 5);

    return (
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: color }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', marginTop: '4px' }}>
          <i className={`fi ${icon}`} style={{ fontSize: '20px', color }}></i>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{title}</h3>
        </div>
        
        <div style={{ marginBottom: '20px', fontSize: '13px', color: 'var(--text-muted)', minHeight: '40px' }}>
          {data.summary}
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: 'var(--bg-sub)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>เงินปันผล/ผลตอบแทนคาดหวัง (ปี)</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--green)', fontFamily: "'Space Mono'" }}>
              ฿{Math.round((financeData.assets.currentCapital || 0) * ((data.expectedPortfolioYield || 0) / 100)).toLocaleString()} <span style={{ fontSize: '12px', opacity: 0.8 }}>({data.expectedPortfolioYield}%)</span>
            </div>
          </div>
          <div style={{ flex: 1, background: 'var(--bg-sub)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>ความเสี่ยง</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--gold)', marginTop: '4px' }}>{data.riskAssessment}</div>
          </div>
        </div>

        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
          {isUser ? "สินทรัพย์ที่คุณเลือก" : "สินทรัพย์ที่ AI แนะนำ"}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
          {data.portfolioSuggestions.length > 0 ? (
            itemsToShow.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-sub)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{item.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', fontFamily: "'Space Mono'" }}>{item.allocation}%</div>
                  <div style={{ fontSize: '10px', color: 'var(--green)' }}>Yield {item.expectedYield}%</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>
              ยังไม่มีข้อมูลสินทรัพย์
            </div>
          )}
          
          {data.portfolioSuggestions.length > 5 && (
            <div 
              style={{ textAlign: 'center', fontSize: '11px', color: 'var(--accent-blue)', marginTop: '4px', cursor: 'pointer', fontWeight: 'bold', padding: '4px 0' }}
              onClick={() => setExpandedCard(isExpanded ? null : title)}
            >
              {isExpanded ? "ย่อลง" : `+ อีก ${data.portfolioSuggestions.length - 5} สินทรัพย์ (คลิกเพื่อดู)`}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="tool-screen active">
      <div className="tool-page active" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
        <div className="tool-header" style={{ marginBottom: '32px' }}>
          <div className="tool-title" style={{ fontSize: '28px' }}>Portfolio <span>Overview & Comparison</span></div>
          <div className="tool-sub" style={{ fontSize: '15px' }}>
            เปรียบเทียบพอร์ตการลงทุนทั้ง 4 รูปแบบ เพื่อให้คุณเห็นภาพรวมและสามารถเลือกกลยุทธ์ที่เหมาะสมที่สุด
          </div>
        </div>

        {(!inflationAi && !loading) ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
            <div style={{ width: '80px', height: '80px', background: 'var(--bg-sub)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <i className="fi fi-sr-chart-mixed" style={{ fontSize: '32px', color: 'var(--accent-blue)' }}></i>
            </div>
            <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>วิเคราะห์และเปรียบเทียบพอร์ตแบบเจาะลึก</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
              ระบบจะทำการดึงข้อมูล AI สำหรับการสู้เงินเฟ้อ, การจัดเตรียมเงินสำรองฉุกเฉิน, และใช้ AI สรุปพอร์ตที่ดีที่สุดในสถานการณ์ปัจจุบัน นำมาเทียบกับพอร์ตเกษียณที่คุณจัดไว้เอง
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
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '20px', background: 'var(--bg-sub)', borderRadius: '12px', marginBottom: '24px', color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                <div className="ai-loading-dots" style={{ margin: 0 }}><span></span><span></span><span></span></div>
                AI กำลังประมวลผลพอร์ตการลงทุน...
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginTop: '24px' }}>
              {renderCard("พอร์ตสู้เงินเฟ้อ", "fi-sr-stats", "var(--gold)", inflationAi)}
              {renderCard("พอร์ตเงินสำรองฉุกเฉิน", "fi-sr-shield-check", "var(--accent-blue)", emergencyAi)}
              {renderCard("พอร์ตเกษียณ (ของคุณ)", "fi-sr-user-check", "var(--green)", retirementUser, true)}
              {renderCard("พอร์ต AI แนะนำภาพรวม", "fi-sr-robot", "#92400e", overallAi)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
