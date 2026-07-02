"use client";
import '../ui/AiAdvisor.css';

import React, { useState, useCallback } from "react";

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
  goal: "inflation" | "emergency";
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
  return "🌐 Global";
}

// ─── Component ────────────────────────────────────────────────────────
export default function AiAdvisor({ goal, context, contextItems }: AiAdvisorProps) {
  const [result, setResult] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      {/* Context Display */}
      {contextItems && contextItems.length > 0 && (
        <div className="ai-context-card">
          <div className="ai-context-title">
            <i className="fi fi-rr-info" style={{ fontSize: '18px', fontWeight: 'bold' }}></i> ข้อมูลที่ใช้วิเคราะห์
          </div>
          <div className="ai-context-grid">
            {contextItems.map((item, i) => (
              <div key={i} className="ai-context-item">
                <div className="label">{item.label}</div>
                <div className="value">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div className="ai-loading-text" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            AI กำลังวิเคราะห์พอร์ตที่เหมาะกับคุณ...
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="ai-error">
          <i className="fi fi-sr-exclamation error-icon" style={{ fontSize: '32px', color: 'var(--red)' }}></i>
          <div className="error-text">เกิดข้อผิดพลาด</div>
          <div className="error-sub">{error}</div>
          <button
            className="ai-regen-btn"
            onClick={fetchSuggestion}
            style={{ marginTop: '16px', width: 'auto', display: 'inline-flex' }}
          >
            <i className="fi fi-rr-refresh" style={{ fontSize: '16px', fontWeight: 'bold' }}></i> ลองใหม่
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="ai-result">
          {/* Summary */}
          <div className="ai-summary-card">
            <div className="ai-summary-title">
              <i className="fi fi-sr-sparkles" style={{ fontSize: '16px' }}></i> สรุปคำแนะนำจาก AI
            </div>
            <div className="ai-summary-text">{result.summary}</div>
          </div>

          {/* Portfolio Stats */}
          <div className="ai-port-summary">
            <div className="ai-port-stat">
              <div className="stat-label">ผลตอบแทนรวมพอร์ต</div>
              <div className="stat-value green">
                {result.expectedPortfolioYield}%
                {context.investmentAmount ? (
                  <span style={{ fontSize: '14px', marginLeft: '8px', opacity: 0.9 }}>
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

          {/* Portfolio Table */}
          <div className="ai-table-card">
            <div className="ai-table-title">
              <i className="fi fi-sr-chart-pie-alt" style={{ fontSize: '18px', fontWeight: 'bold' }}></i> พอร์ตที่แนะนำ
            </div>
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

          {/* Disclaimer */}
          {result.disclaimer && (
            <div className="ai-disclaimer" style={{ display: 'flex', gap: '8px' }}>
              <i className="fi fi-rr-info" style={{ flexShrink: 0, marginTop: '2px', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-muted)' }}></i>
              <span>{result.disclaimer}</span>
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
