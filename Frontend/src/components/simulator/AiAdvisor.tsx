"use client";
import '../ui/AiAdvisor.css';

import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import InfoTooltip from "../ui/InfoTooltip";

import { API_BASE_URL } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────
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
  warnings: string[];
  disclaimer: string;
}

interface AiAdvisorProps {
  goal: "inflation" | "emergency" | "wealth_plan" | "overall";
  context: {
    investmentAmount?: number;
    timeline?: number;
    monthlySalary?: number;
    monthlyExpense?: number;
    inflationRate?: number;
    emergencyFund?: number;
    riskTolerance?: "low" | "medium" | "high";
    currentSavings?: number;
    scenarioType?: string;
    expectedYieldTarget?: number;
  };
  /** Optional context items to display */
  contextItems?: { label: string; value: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────
function getRiskClass(level: string): string {
  const l = level.toLowerCase();
  if (l.includes("ต่ำ") || l.includes("low")) return "low";
  if (l.includes("สูง") || l.includes("high")) return "high";
  return "medium";
}

function getMarketClass(market: string): string {
  const m = market.toUpperCase();
  if (m === "TH") return "th";
  if (m === "US") return "us";
  return "global";
}

function getMarketLabel(market: string): string {
  const m = market.toUpperCase();
  if (m === "TH") return "🇹🇭 TH";
  if (m === "US") return "🇺🇸 US";
  return "Global";
}

// ─── Component ────────────────────────────────────────────────────────
export default function AiAdvisor({ goal, context, contextItems }: AiAdvisorProps) {
  const { user } = useAuth();
  const [result, setResult] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offshorePlatform, setOffshorePlatform] = useState<"dime" | "innovestx" | "ksec">("dime");

  useEffect(() => {
    const storageKey = `finshield-ai-${goal}-${user?.uid || 'guest'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setResult(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse cached AI response:", e);
      }
    }
  }, [goal, user]);

  const platformRates = { dime: 0.65, innovestx: 0.65, ksec: 0.70 };
  const offshoreRate = platformRates[offshorePlatform];

  let feeBreakdown = { th: 0, offshore: 0, fund: 0, total: 0 };
  let netInvestmentAmount = context.investmentAmount || 0;

  if (result && context.investmentAmount) {
    result.portfolioSuggestions.forEach(item => {
      let portion = context.investmentAmount! * (item.allocation / 100);
      if (item.type.includes("กองทุน") || item.type.includes("Mutual Fund")) {
        let rate = getRiskClass(item.riskLevel) === "low" ? 0 : 1.0;
        feeBreakdown.fund += portion * (rate / 100);
      } else if (getMarketClass(item.market) === "us" || getMarketClass(item.market) === "global") {
        feeBreakdown.offshore += portion * (offshoreRate / 100);
      } else if (getMarketClass(item.market) === "th") {
        feeBreakdown.th += portion * (0.17 / 100);
      }
    });
    feeBreakdown.total = feeBreakdown.th + feeBreakdown.offshore + feeBreakdown.fund;
    netInvestmentAmount -= feeBreakdown.total;
  }

  const fetchSuggestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, context }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      const data: AiResponse = await res.json();
      setResult(data);
      const storageKey = `finshield-ai-${goal}-${user?.uid || 'guest'}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err: any) {
      console.error("[AiAdvisor] error:", err);
      setError(err.message || "ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }, [goal, context]);

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="ai-advisor">


      {/* Generate Button */}
      {!result && !loading && (
        <button
          className="ai-generate-btn"
          onClick={fetchSuggestion}
          disabled={loading}
        >
          {goal === "inflation"
            ? "ขอคำแนะนำพอร์ตสู้เงินเฟ้อจาก AI"
            : "ขอคำแนะนำพอร์ตเงินสำรองจาก AI"}
        </button>
      )}

      {/* Loading State */}
      {loading && (
        <div className="ai-loading">
          <div className="ai-loading-dots">
            <span></span><span></span><span></span>
          </div>
          <div className="ai-loading-text ai-loading-text-flex">
            AI กำลังวิเคราะห์พอร์ตที่เหมาะกับคุณ...
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="ai-error">
          <i className="fi fi-sr-exclamation error-icon ai-icon-error"></i>
          <div className="error-text">เกิดข้อผิดพลาด</div>
          <div className="error-sub">{error}</div>
          <button
            className="ai-regen-btn ai-regen-btn-mod"
            onClick={fetchSuggestion}
          >
            <i className="fi fi-rr-refresh ai-icon-refresh"></i> ลองใหม่
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="ai-result">
          {/* Summary */}
          <div className="ai-summary-card">
            <div className="ai-summary-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><i className="fi fi-sr-sparkles ai-icon-sparkles"></i> สรุปคำแนะนำจาก AI</div>
              {contextItems && contextItems.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: 'var(--text-main)', textTransform: 'none', letterSpacing: 'normal', fontWeight: 'normal' }}>
                  ข้อมูลที่ใช้วิเคราะห์
                  <InfoTooltip title="ข้อมูลที่ใช้วิเคราะห์" align="right">
                    <div className="ai-context-list" style={{ marginTop: '8px' }}>
                      {contextItems.map((item, i) => (
                        <div key={i} style={{ marginBottom: '4px' }}>
                          <span className="ai-context-label">{item.label}:</span> <span className="ai-context-value">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </InfoTooltip>
                </div>
              )}
            </div>
            <div className="ai-summary-text">{result.summary}</div>
          </div>

          {/* Portfolio Stats */}
          <div className="ai-port-summary">
            {context.investmentAmount ? (
              <div className="ai-port-stat">
                <div className="stat-label">เงินลงทุนรวม</div>
                <div className="stat-value green ai-port-stat-mono">
                  ฿{Math.round(netInvestmentAmount).toLocaleString()}
                </div>
                {feeBreakdown.total > 0 && (
                  <div className="ai-port-fee-note">
                    ทุน ฿{Math.round(context.investmentAmount).toLocaleString()}
                    <span 
                      className="ai-port-fee-link"
                      title={`หักค่าธรรมเนียมรวม ${((feeBreakdown.total/context.investmentAmount)*100).toFixed(2)}%\n- หุ้นไทย: ${feeBreakdown.th > 0 ? (feeBreakdown.th/context.investmentAmount*100).toFixed(2) : 0}%\n- หุ้นตปท. (${offshorePlatform}): ${feeBreakdown.offshore > 0 ? (feeBreakdown.offshore/context.investmentAmount*100).toFixed(2) : 0}%\n- กองทุนรวม: ${feeBreakdown.fund > 0 ? (feeBreakdown.fund/context.investmentAmount*100).toFixed(2) : 0}%`}
                    >
                      (หัก ฿{Math.round(feeBreakdown.total).toLocaleString()})
                    </span>
                  </div>
                )}
              </div>
            ) : null}
            <div className="ai-port-stat">
              <div className="stat-label">ผลตอบแทนรวมพอร์ต</div>
              <div className="stat-value green">
                {result.expectedPortfolioYield}%
                {context.investmentAmount ? (
                  <span className="ai-port-yield-note">
                    (+฿{Math.round((context.investmentAmount || 0) * (result.expectedPortfolioYield / 100)).toLocaleString()}/ปี)
                  </span>
                ) : null}
              </div>
            </div>
            <div className="ai-port-stat">
              <div className="stat-label">ระดับความเสี่ยง</div>
              <div className={`stat-value ${getRiskClass(result.riskAssessment) === 'low' ? 'green' : getRiskClass(result.riskAssessment) === 'high' ? '' : 'gold'}`} style={getRiskClass(result.riskAssessment) === 'high' ? { color: 'var(--red)' } : undefined}>
                {result.riskAssessment}
              </div>
            </div>
            <div className="ai-port-stat">
              <div className="stat-label">จำนวนสินทรัพย์</div>
              <div className="stat-value blue">{result.portfolioSuggestions.length}</div>
            </div>
          </div>

          {/* Emergency Fund + Investment Check */}
          {goal === "emergency" && context.emergencyFund !== undefined && context.shortfall !== undefined && (
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              {(() => {
                const expectedProfit = Math.round((context.investmentAmount || 0) * (result.expectedPortfolioYield / 100));
                const currentShortfall = context.shortfall;
                const newShortfall = Math.max(0, currentShortfall - expectedProfit);
                const isNowSurviving = context.isSurviving || newShortfall === 0;

                return (
                  <div style={{ padding: '16px', borderRadius: '12px', background: isNowSurviving ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${isNowSurviving ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}` }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: isNowSurviving ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      {isNowSurviving ? <i className="fi fi-sr-shield-check"></i> : <i className="fi fi-sr-shield-exclamation"></i>}
                      เงินสำรอง + การลงทุน {isNowSurviving ? 'เพียงพอรับมือวิกฤต!' : 'ยังไม่เพียงพอ'}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>เงินสำรองที่ขาดอยู่ (ก่อนลงทุน)</span>
                        <span style={{ fontWeight: 600, color: currentShortfall > 0 ? 'var(--red)' : 'var(--text-main)' }}>
                          {currentShortfall > 0 ? `฿${currentShortfall.toLocaleString()}` : 'เงินเพียงพออยู่แล้ว'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>คาดการณ์กำไรจากพอร์ต (1 ปี)</span>
                        <span style={{ fontWeight: 600, color: 'var(--green)' }}>+฿{expectedProfit.toLocaleString()}</span>
                      </div>
                      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>สถานะ (หลังรวมกำไร)</span>
                        <span style={{ fontWeight: 800, fontFamily: "'Space Mono', monospace", fontSize: '15px', color: isNowSurviving ? 'var(--green)' : 'var(--red)' }}>
                          {isNowSurviving ? 'พอดี / เกินอยู่' : `ขาด ฿${newShortfall.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Portfolio Table */}
          <div className="ai-table-card">
            <div className="ai-table-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <i className="fi fi-sr-chart-pie-alt" style={{ fontSize: '18px', fontWeight: 'bold', marginRight: '6px' }}></i> พอร์ตที่แนะนำ
                {result.disclaimer && (
                  <InfoTooltip title="ข้อควรระวัง">
                    {result.disclaimer}
                  </InfoTooltip>
                )}
              </div>
              {feeBreakdown.offshore > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Platform ลงทุน:</span>
                  <select 
                    className="form-input" 
                    style={{ padding: '2px 6px', fontSize: '12px', minHeight: 'auto', width: 'auto' }}
                    value={offshorePlatform} 
                    onChange={(e) => setOffshorePlatform(e.target.value as "dime" | "innovestx" | "ksec")}
                  >
                    <option value="dime">Dime (0.65%)</option>
                    <option value="innovestx">InnovestX (0.65%)</option>
                    <option value="ksec">KSecurities (0.70%)</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="ai-table">
                <thead>
                <tr>
                  <th>สินทรัพย์</th>
                  <th>ตลาด</th>
                  <th style={{ textAlign: 'center' }}>สัดส่วน</th>
                  <th style={{ textAlign: 'center' }}>ผลตอบแทน/ปี</th>
                  <th style={{ textAlign: 'center' }}>คาดการณ์กำไร (ปี)</th>
                  <th style={{ textAlign: 'center' }}>ความเสี่ยง</th>
                  <th>เหตุผล</th>
                </tr>
              </thead>
              <tbody>
                {result.portfolioSuggestions.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div className="ai-asset-name">
                        {item.name}
                      </div>
                      <div className="ai-asset-type">{item.type}</div>
                    </td>
                    <td>
                      <span className={`ai-market-badge ${getMarketClass(item.market)}`}>
                        {getMarketLabel(item.market)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: 'var(--text-main)' }}>
                        {item.allocation}%
                      </div>
                      <div className="ai-alloc-bar">
                        <div className="ai-alloc-fill" style={{ width: `${item.allocation}%` }}></div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="ai-yield-val">{item.expectedYield}%</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: 'var(--green)', fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
                        +฿{Math.round((context.investmentAmount || 0) * (item.allocation / 100) * (item.expectedYield / 100)).toLocaleString()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`ai-risk-badge ${getRiskClass(item.riskLevel)}`}>
                        {item.riskLevel}
                      </span>
                    </td>
                    <td>
                      <div className="ai-reason-text">{item.reason}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="ai-warnings">
              <div className="warn-title">
                <i className="fi fi-sr-exclamation" style={{ fontSize: '16px', fontWeight: 'bold' }}></i> คำเตือน
              </div>
              <ul>
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}


          {/* Regenerate */}
          <button className="ai-regen-btn" onClick={fetchSuggestion} disabled={loading}>
            <i className="fi fi-rr-refresh" style={{ fontSize: '16px', fontWeight: 'bold' }}></i>
            ขอคำแนะนำใหม่
          </button>
        </div>
      )}
    </div>
  );
}
