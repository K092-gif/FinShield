"use client";
import "../ui/AiAdvisor.css";
import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import InfoTooltip from "./InfoTooltip";

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
    severity?: string;
  };
  /** Optional context items to display */
  contextItems?: { label: string; value: string }[];
  /** Allow showing a custom prompt input */
  showCustomPrompt?: boolean;
  /** Automatically start the recommendation on mount */
  autoStart?: boolean;
  /** Called when user clicks "+ Add to My Portfolio" on a suggestion row */
  onAddToPortfolio?: (suggestion: PortfolioSuggestion) => void;
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
  if (m === "TH") return "TH";
  if (m === "US") return "US";
  return "Global";
}

// ─── Component ────────────────────────────────────────────────────────
export default function AiAdvisor({ goal, context, contextItems, showCustomPrompt, autoStart, onAddToPortfolio }: AiAdvisorProps) {
  const { user } = useAuth();
  const [result, setResult] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offshorePlatform, setOffshorePlatform] = useState<"dime" | "innovestx" | "ksec">("dime");
  const [customPrompt, setCustomPrompt] = useState("");
  const hasAutoStarted = React.useRef(false);

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

  // Use investmentAmount if available, otherwise fall back to currentSavings (e.g. when all capital = emergency fund)
  const baseAmount = context.investmentAmount || context.currentSavings || 0;

  let feeBreakdown = { th: 0, offshore: 0, fund: 0, total: 0 };
  let netInvestmentAmount = baseAmount;

  if (result && baseAmount > 0) {
    result.portfolioSuggestions.forEach(item => {
      let portion = baseAmount * (item.allocation / 100);
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
        body: JSON.stringify({ goal, context, customPrompt: customPrompt.trim() || undefined }),
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
  }, [goal, context, customPrompt]);

  useEffect(() => {
    if (autoStart && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      // We clear the cache to ensure a fresh recommendation based on new inputs
      const storageKey = `finshield-ai-${goal}-${user?.uid || 'guest'}`;
      localStorage.removeItem(storageKey);
      fetchSuggestion();
    }
  }, [autoStart, fetchSuggestion, goal, user]);

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="w-full">

      {/* Custom Prompt Input */}
      {showCustomPrompt && !loading && (
        <div className="ai-card">
          <div className="text-[14px] font-[700] text-[var(--text-main)] flex items-center gap-[8px] mb-[12px]">
            <i className="fi fi-sr-comment-alt-dots" style={{ fontSize: '16px' }}></i>
            กำหนดความต้องการเพิ่มเติม <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--text-muted)' }}>(ไม่บังคับ)</span><div className="inline-flex items-center ml-1"><InfoTooltip>
              AI จะพยายามตอบโจทย์ตามที่คุณระบุ แต่ยังคงยึดหลักให้ผลตอบแทนที่ดีที่สุดในเงินลงทุนที่มี
            </InfoTooltip></div>
          </div>
          <textarea
            className={`w-full p-[14px_16px] bg-[var(--bg-sub)] border-[1.5px] border-[var(--border)] rounded-[12px] font-['Google_Sans_Flex','Kanit',sans-serif] text-[14px] text-[var(--text-main)] resize-y min-h-[60px] transition-all duration-200 leading-[1.6] focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_rgba(66,133,244,0.15)] placeholder-[var(--text-muted)] placeholder:text-[13px] ${result ? 'mb-[12px]' : ''}`}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="เช่น อยากได้พอร์ตที่เน้นปันผลรายเดือน, ไม่อยากลงทุนหุ้นต่างประเทศ, เน้นกองทุนความเสี่ยงต่ำ, อยากได้ผลตอบแทน 8% ขึ้นไป ฯลฯ"
            rows={3}
          />
          {result && (
            <button
              className="ai-secondary-btn mt-[12px]"
              onClick={fetchSuggestion}
            >
              <i className="fi fi-rr-refresh"></i> อัปเดตคำแนะนำ
            </button>
          )}
        </div>
      )}

      {/* Generate Button */}
      {!result && !loading && (
        <button
          className="ai-primary-btn mb-[24px]"
          onClick={fetchSuggestion}
          disabled={loading}
        >
          {goal === "inflation"
            ? "ขอคำแนะนำพอร์ตสู้เงินเฟ้อจาก AI"
            : goal === "wealth_plan"
            ? "ให้ AI ช่วยจัดสรรพอร์ต"
            : "ขอคำแนะนำพอร์ตเงินสำรองจาก AI"}
        </button>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center p-[48px_24px]">
          <div className="flex items-center justify-center gap-[8px] mb-[16px]">
            <span className="w-[10px] h-[10px] rounded-full bg-[var(--accent-blue)] animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-[10px] h-[10px] rounded-full bg-[var(--accent-blue)] animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-[10px] h-[10px] rounded-full bg-[var(--accent-blue)] animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
          <div className="text-[14px] font-[600] text-[var(--text-muted)] flex items-center justify-center gap-2">
            AI กำลังวิเคราะห์พอร์ตที่เหมาะกับคุณ...
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="ai-error-card">
          <i className="fi fi-sr-exclamation text-[var(--red)] text-[24px] mb-[12px]"></i>
          <div className="text-[var(--red)] text-[15px] font-[700] mb-[4px]">เกิดข้อผิดพลาด</div>
          <div className="text-[var(--text-muted)] text-[13px] mb-[16px]">{error}</div>
          <button
            className="ai-secondary-btn mx-auto"
            onClick={fetchSuggestion}
          >
            <i className="fi fi-rr-refresh"></i> ลองใหม่
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="animate-[fadeIn_0.5s_ease]">
          {/* Summary */}
          <div className="ai-summary-box">
            <div className="text-[13px] font-[800] text-[#8b5cf6] flex items-center justify-between gap-[6px] mb-[10px] uppercase tracking-[0.5px] flex-wrap">
              <div className="flex items-center gap-[8px]"><i className="fi fi-sr-sparkles"></i> สรุปคำแนะนำจาก AI</div>
              {contextItems && contextItems.length > 0 && (
                <div className="flex items-center gap-[6px] text-[11px] font-[700] text-[var(--text-muted)] bg-[var(--bg-sub)] px-[10px] py-[4px] rounded-[100px] border border-[var(--border)] normal-case tracking-normal">
                  ข้อมูลที่ใช้วิเคราะห์
                  <InfoTooltip title="ข้อมูลที่ใช้วิเคราะห์" align="right">
                    <div className="flex flex-col gap-[8px] max-w-[200px]">
                      {contextItems.map((item, i) => (
                        <div key={i} className="bg-[var(--bg-sub)] rounded-[8px] p-[8px_10px] border border-[var(--border)] text-left">
                          <div className="text-[10px] font-[600] text-[var(--text-muted)] uppercase tracking-[0.5px] mb-[2px]">{item.label}:</div> 
                          <div className="font-['Space_Mono',monospace] text-[13px] font-[700] text-[var(--text-main)]">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </InfoTooltip>
                </div>
              )}
            </div>
            <div className="text-[14px] text-[var(--text-main)] leading-[1.7]">{result.summary.replace(/[*#]/g, '')}</div>
          </div>

          {/* Portfolio Stats */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[16px] mb-[20px]">
            {context.investmentAmount ? (
              <div className="ai-stat-card">
                <div className="text-[12px] font-[600] text-[var(--text-muted)] mb-[6px] flex items-center justify-center gap-[6px]">เงินลงทุนรวม</div>
                <div className="font-['Space_Mono',monospace] text-[22px] font-[800] text-[var(--green)] flex items-baseline justify-center gap-[8px] flex-wrap">
                  ฿{Math.round(netInvestmentAmount).toLocaleString()}
                </div>
                {feeBreakdown.total > 0 && (
                  <div className="text-[11px] text-[var(--text-muted)] mt-[6px]">
                    ทุน ฿{Math.round(context.investmentAmount).toLocaleString()}
                    <span 
                      className="text-[var(--red)] border-b border-dotted border-[var(--red)] ml-[4px] cursor-help"
                      title={`หักค่าธรรมเนียมรวม ${((feeBreakdown.total/context.investmentAmount)*100).toFixed(2)}%\n- หุ้นไทย: ${feeBreakdown.th > 0 ? (feeBreakdown.th/context.investmentAmount*100).toFixed(2) : 0}%\n- หุ้นตปท. (${offshorePlatform}): ${feeBreakdown.offshore > 0 ? (feeBreakdown.offshore/context.investmentAmount*100).toFixed(2) : 0}%\n- กองทุนรวม: ${feeBreakdown.fund > 0 ? (feeBreakdown.fund/context.investmentAmount*100).toFixed(2) : 0}%`}
                    >
                      (หัก ฿{Math.round(feeBreakdown.total).toLocaleString()})
                    </span>
                  </div>
                )}
              </div>
            ) : null}
            <div className="ai-stat-card">
              <div className="text-[12px] font-[600] text-[var(--text-muted)] mb-[6px] flex items-center justify-center gap-[6px]">ผลตอบแทนรวมพอร์ต</div>
              <div className="font-['Space_Mono',monospace] text-[22px] font-[800] text-[var(--green)] flex items-baseline justify-center gap-[8px] flex-wrap">
                {result.expectedPortfolioYield}%
                {context.investmentAmount ? (
                  <span className="text-[12px] font-[700] text-[var(--green)] opacity-80">
                    (+฿{Math.round((context.investmentAmount || 0) * (result.expectedPortfolioYield / 100)).toLocaleString()}/ปี)
                  </span>
                ) : null}
              </div>
            </div>
            <div className="ai-stat-card">
              <div className="text-[12px] font-[600] text-[var(--text-muted)] mb-[6px] flex items-center justify-center gap-[6px]">ระดับความเสี่ยง</div>
              <div className={`font-['Space_Mono',monospace] text-[22px] font-[800] flex items-baseline justify-center gap-[8px] flex-wrap ${getRiskClass(result.riskAssessment) === 'low' ? 'text-[var(--green)]' : getRiskClass(result.riskAssessment) === 'high' ? 'text-[var(--red)]' : 'text-[var(--gold)]'}`}>
                {result.riskAssessment}
              </div>
            </div>
            <div className="ai-stat-card">
              <div className="text-[12px] font-[600] text-[var(--text-muted)] mb-[6px] flex items-center justify-center gap-[6px]">จำนวนสินทรัพย์</div>
              <div className="font-['Space_Mono',monospace] text-[22px] font-[800] text-[var(--accent-blue)] flex items-baseline justify-center gap-[8px] flex-wrap">{result.portfolioSuggestions.length}</div>
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
                    
                    <div className="bg-white rounded-[8px] p-[12px_16px] border border-[var(--border)]">
                      <div className="flex justify-between items-center mb-[8px] font-[13px]">
                        <span className="text-[var(--text-muted)] font-[500]">เงินสำรองที่ขาดอยู่ (ก่อนลงทุน)</span>
                        <span style={{ fontWeight: 600, color: currentShortfall > 0 ? 'var(--red)' : 'var(--text-main)' }}>
                          {currentShortfall > 0 ? `฿${currentShortfall.toLocaleString()}` : 'เงินเพียงพออยู่แล้ว'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-[8px] font-[13px]">
                        <span className="text-[var(--text-muted)] font-[500]">คาดการณ์กำไรจากพอร์ต (1 ปี)</span>
                        <span style={{ fontWeight: 600, color: 'var(--green)' }}>+฿{expectedProfit.toLocaleString()}</span>
                      </div>
                      <hr className="h-[1px] bg-[var(--border)] my-[12px] border-none" />
                      <div className="flex justify-between items-center font-[13px]">
                        <span className="text-[var(--text-main)] font-[700]">สถานะ (หลังรวมกำไร)</span>
                        <span className="font-['Space_Mono',monospace] text-[16px] font-[800]" style={{ color: isNowSurviving ? 'var(--green)' : 'var(--red)' }}>
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
          <div className="ai-card">
            <div className="text-[15px] font-[800] text-[var(--text-main)] flex items-center justify-between mb-[16px] flex-wrap gap-2">
              <div className="flex items-center gap-[8px]">
                <i className="fi fi-sr-chart-pie-alt"></i> พอร์ตที่แนะนำ
                {result.disclaimer && (
                  <InfoTooltip title="ข้อควรระวัง">
                    {result.disclaimer}
                  </InfoTooltip>
                )}
              </div>
              {feeBreakdown.offshore > 0 && (
                <div className="flex items-center gap-[8px]">
                  <span className="text-[13px] font-[600] text-[var(--text-muted)]">Platform ลงทุน:</span>
                  <select 
                    className="form-input p-[6px_12px] text-[13px] rounded-[8px] w-auto min-w-[130px]" 
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                <tr>
                  <th className="bg-[var(--bg-sub)] p-[10px_14px] text-left font-[700] text-[var(--text-muted)] text-[11px] uppercase tracking-[0.5px] border-b-[2px] border-[var(--border)] rounded-tl-[8px]">สินทรัพย์</th>
                  <th className="bg-[var(--bg-sub)] p-[10px_14px] text-left font-[700] text-[var(--text-muted)] text-[11px] uppercase tracking-[0.5px] border-b-[2px] border-[var(--border)]">ตลาด</th>
                  <th className="bg-[var(--bg-sub)] p-[10px_14px] text-center font-[700] text-[var(--text-muted)] text-[11px] uppercase tracking-[0.5px] border-b-[2px] border-[var(--border)]">สัดส่วน</th>
                  <th className="bg-[var(--bg-sub)] p-[10px_14px] text-center font-[700] text-[var(--text-muted)] text-[11px] uppercase tracking-[0.5px] border-b-[2px] border-[var(--border)]">ผลตอบแทน/ปี</th>
                  <th className="bg-[var(--bg-sub)] p-[10px_14px] text-center font-[700] text-[var(--text-muted)] text-[11px] uppercase tracking-[0.5px] border-b-[2px] border-[var(--border)]">คาดการณ์กำไร (ปี)</th>
                  <th className="bg-[var(--bg-sub)] p-[10px_14px] text-center font-[700] text-[var(--text-muted)] text-[11px] uppercase tracking-[0.5px] border-b-[2px] border-[var(--border)]">ความเสี่ยง</th>
                  <th className="bg-[var(--bg-sub)] p-[10px_14px] text-left font-[700] text-[var(--text-muted)] text-[11px] uppercase tracking-[0.5px] border-b-[2px] border-[var(--border)] rounded-tr-[8px]">เหตุผล</th>
                </tr>
              </thead>
              <tbody>
                {result.portfolioSuggestions.map((item, i) => (
                  <tr key={i} className="hover:bg-[rgba(99,102,241,0.03)] group">
                    <td className="ai-table-cell text-left">
                      <div className="font-[700] text-[var(--text-main)] flex items-center gap-[6px]">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-[2px]">{item.type}</div>
                    </td>
                    <td className="ai-table-cell text-left">
                      <span className={`inline-flex items-center p-[2px_8px] rounded-[100px] text-[10px] font-[800] tracking-[0.5px] border ${getMarketClass(item.market) === 'th' ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]' : getMarketClass(item.market) === 'us' ? 'bg-[rgba(59,130,246,0.1)] text-[#3b82f6] border-[rgba(59,130,246,0.2)]' : 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6] border-[rgba(139,92,246,0.2)]'}`}>
                        {getMarketLabel(item.market)}
                      </span>
                    </td>
                    <td className="ai-table-cell text-center">
                      <div className="font-[700]">
                        {item.allocation}%
                      </div>
                      <div className="w-full h-[6px] bg-[var(--bg-sub)] rounded-[3px] mt-[4px] overflow-hidden">
                        <div className="h-full rounded-[3px] bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] transition-all duration-500" style={{ width: `${item.allocation}%` }}></div>
                      </div>
                    </td>
                    <td className="ai-table-cell text-center">
                      <span className="font-['Space_Mono',monospace] font-[700] text-[var(--green)]">{item.expectedYield}%</span>
                    </td>
                    <td className="ai-table-cell text-center">
                      <span className="font-['Space_Mono',monospace] font-[700] text-[var(--green)]">
                        +฿{Math.round(
                          baseAmount *
                          (item.allocation / 100) *
                          (item.expectedYield / 100)
                        ).toLocaleString()}
                      </span>
                    </td>
                    <td className="ai-table-cell text-center">
                      <span className={`inline-flex p-[3px_10px] rounded-[100px] text-[11px] font-[700] ${getRiskClass(item.riskLevel) === 'low' ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]' : getRiskClass(item.riskLevel) === 'medium' ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' : 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]'}`}>
                        {item.riskLevel}
                      </span>
                    </td>
                    <td className="ai-table-cell text-left">
                      <div className="text-[12px] text-[var(--text-muted)] leading-[1.5] max-w-[200px]">{item.reason}</div>
                    </td>
                    {onAddToPortfolio && (
                      <td className="ai-table-cell text-center">
                        <button
                          onClick={() => onAddToPortfolio(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-dark)] transition-colors whitespace-nowrap"
                          title={`เพิ่ม ${item.name} ลง My Portfolio`}
                        >
                          <i className="fi fi-rr-plus text-[10px]"></i> เพิ่ม
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-[12px] p-[16px_20px] mb-[24px]">
              <div className="text-[var(--gold)] text-[13px] font-[800] flex items-center gap-[8px] mb-[10px] uppercase tracking-[0.5px]">
                <i className="fi fi-sr-exclamation" style={{ fontSize: '16px', fontWeight: 'bold' }}></i> คำเตือน
              </div>
              <ul className="m-0 pl-[24px] text-[var(--text-main)] text-[13px] leading-[1.6]">
                {result.warnings.map((w, i) => (
                  <li key={i} className="mb-[6px] last:mb-0">{w}</li>
                ))}
              </ul>
            </div>
          )}


          {/* Regenerate */}
          <div className="flex justify-center">
            <button className="ai-secondary-btn" onClick={fetchSuggestion} disabled={loading}>
              <i className="fi fi-rr-refresh" style={{ fontSize: '16px', fontWeight: 'bold' }}></i>
              ขอคำแนะนำใหม่
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
