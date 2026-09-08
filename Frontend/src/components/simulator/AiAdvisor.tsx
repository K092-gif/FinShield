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
    shortfall?: number;
    isSurviving?: boolean;
    targetFund?: number;
    dcaAmount?: number;
    monthlyDca?: number;
    dcaDay?: number;
  };
  /** Optional context items to display */
  contextItems?: { label: string; value: string }[];
  /** Allow showing a custom prompt input */
  showCustomPrompt?: boolean;
  /** Automatically start the recommendation on mount */
  autoStart?: boolean;
  /** Called when user clicks "+ Add to My Portfolio" on a suggestion row */
  onAddToPortfolio?: (suggestion: PortfolioSuggestion) => void;
  /** Called when user clicks "Remove" on a suggestion row */
  onRemoveFromPortfolio?: (suggestion: PortfolioSuggestion) => void;
  /** Currently added portfolio IDs */
  currentPortfolioIds?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────
function getRiskClass(level: string): string {
  const l = (level || "").toLowerCase();
  if (l.includes("ต่ำ") || l.includes("low")) return "low";
  if (l.includes("สูง") || l.includes("high")) return "high";
  return "medium";
}

function getMarketClass(market: string): string {
  const m = (market || "").toUpperCase();
  if (m === "TH") return "th";
  if (m === "US") return "us";
  return "global";
}

function getMarketLabel(market: string): string {
  const m = (market || "").toUpperCase();
  if (m === "TH") return "TH";
  if (m === "US") return "US";
  return "Global";
}

// ─── Component ────────────────────────────────────────────────────────
export default function AiAdvisor({ goal, context, contextItems, showCustomPrompt, autoStart, onAddToPortfolio, onRemoveFromPortfolio, currentPortfolioIds }: AiAdvisorProps) {
  const { user } = useAuth();
  const [result, setResult] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offshorePlatform, setOffshorePlatform] = useState<"dime" | "innovestx" | "ksec">("dime");
  const [customPrompt, setCustomPrompt] = useState("");
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});
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

  // Use investmentAmount if available, otherwise fall back to currentSavings
  const baseAmount = context.investmentAmount || context.currentSavings || 0;

  let feeBreakdown = { th: 0, offshore: 0, fund: 0, total: 0 };
  let netInvestmentAmount = baseAmount;
  let thAllocPct = 0;
  let offshoreAllocPct = 0;
  let fundAllocPct = 0;

  if (result && baseAmount > 0 && result.portfolioSuggestions?.length > 0) {
    const totalAlloc = result.portfolioSuggestions.reduce((sum, item) => sum + (Number(item.allocation) || 0), 0) || 100;

    result.portfolioSuggestions.forEach(item => {
      // Normalize allocation ratio so 100% of baseAmount is correctly distributed
      const normalizedRatio = (Number(item.allocation) || 0) / totalAlloc;
      const portion = baseAmount * normalizedRatio;
      const allocShare = Math.round(((Number(item.allocation) || 0) / totalAlloc) * 100);

      if (item.type.includes("กองทุน") || item.type.includes("Mutual Fund")) {
        let rate = getRiskClass(item.riskLevel) === "low" ? 0 : 1.0;
        feeBreakdown.fund += portion * (rate / 100);
        fundAllocPct += allocShare;
      } else if (getMarketClass(item.market) === "us" || getMarketClass(item.market) === "global") {
        feeBreakdown.offshore += portion * (offshoreRate / 100);
        offshoreAllocPct += allocShare;
      } else if (getMarketClass(item.market) === "th") {
        feeBreakdown.th += portion * (0.17 / 100);
        thAllocPct += allocShare;
      }
    });
    feeBreakdown.total = feeBreakdown.th + feeBreakdown.offshore + feeBreakdown.fund;
    netInvestmentAmount -= feeBreakdown.total;
  }

  const feeLines: string[] = [];
  const platName = offshorePlatform === 'dime' ? 'Dime' : offshorePlatform === 'innovestx' ? 'InnovestX' : 'KSec';
  const totalPct = context.investmentAmount && feeBreakdown.total > 0
    ? ((feeBreakdown.total / context.investmentAmount) * 100).toFixed(2)
    : "0.00";

  if (context.investmentAmount && feeBreakdown.total > 0) {
    feeLines.push(`หักค่าธรรมเนียมรวม ${totalPct}%`);
    if (feeBreakdown.th > 0) {
      feeLines.push(`• สินทรัพย์ไทย (0.17%): -฿${Math.round(feeBreakdown.th).toLocaleString()}`);
    }
    if (feeBreakdown.offshore > 0) {
      feeLines.push(`• สินทรัพย์ต่างประเทศ (${platName} ${offshoreRate}%): -฿${Math.round(feeBreakdown.offshore).toLocaleString()}`);
    }
    if (feeBreakdown.fund > 0) {
      feeLines.push(`• กองทุนรวม (1.00%): -฿${Math.round(feeBreakdown.fund).toLocaleString()}`);
    }
  }
  const feeTooltipText = feeLines.join('\n');

  const fetchSuggestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAddedMap({});

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
  }, [goal, context, customPrompt, user]);

  useEffect(() => {
    if (autoStart && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      const storageKey = `finshield-ai-${goal}-${user?.uid || 'guest'}`;
      localStorage.removeItem(storageKey);
      fetchSuggestion();
    }
  }, [autoStart, fetchSuggestion, goal, user]);

  const handleAddClick = (item: PortfolioSuggestion) => {
    if (onAddToPortfolio) {
      onAddToPortfolio(item);
      setAddedMap(prev => ({ ...prev, [item.name]: true }));
    }
  };

  const handleRemoveClick = (item: PortfolioSuggestion) => {
    if (onRemoveFromPortfolio) {
      onRemoveFromPortfolio(item);
    }
    setAddedMap(prev => {
      const copy = { ...prev };
      delete copy[item.name];
      return copy;
    });
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 sm:space-y-6 overflow-x-hidden">

      {/* Custom Prompt Input */}
      {showCustomPrompt && !loading && (
        <div className="ai-card">
          <div className="text-sm font-bold text-[#1e1c10] dark:text-white flex items-center gap-2 mb-3">
            <i className="fi fi-sr-comment-alt-dots text-purple-600"></i>
            <span>กำหนดความต้องการเพิ่มเติม</span>
            <span className="font-normal text-xs text-[#747878]">(ไม่บังคับ)</span>
            <InfoTooltip title="คำแนะนำเพิ่มเติม" position="bottom" align="left">
              AI จะพยายามตอบโจทย์ตามที่คุณระบุ แต่ยังคงยึดหลักให้ผลตอบแทนที่ดีที่สุดในเงินลงทุนที่มี
            </InfoTooltip>
          </div>
          <textarea
            className={`w-full p-3.5 sm:p-4 bg-[#faf3e0] dark:bg-gray-900/60 border border-[#e0dac7] dark:border-gray-700 rounded-2xl text-xs sm:text-sm text-[#1e1c10] dark:text-white resize-y min-h-[70px] outline-none focus:ring-2 focus:ring-[#fed330] placeholder-[#a09e99] leading-relaxed transition-all ${result ? 'mb-3' : ''}`}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="เช่น อยากได้พอร์ตที่เน้นปันผลรายเดือน, ไม่อยากลงทุนหุ้นต่างประเทศ, เน้นกองทุนความเสี่ยงต่ำ, อยากได้ผลตอบแทน 8% ขึ้นไป ฯลฯ"
            rows={3}
          />
          {result && (
            <button
              className="ai-secondary-btn mt-2"
              onClick={fetchSuggestion}
            >
              <i className="fi fi-rr-refresh text-xs"></i> อัปเดตคำแนะนำ
            </button>
          )}
        </div>
      )}

      {/* Generate Button */}
      {!result && !loading && (
        <button
          className="ai-primary-btn"
          onClick={fetchSuggestion}
          disabled={loading}
        >
          <i className="fi fi-sr-sparkles text-amber-300"></i>
          <span>
            {goal === "inflation"
              ? "ขอคำแนะนำพอร์ตสู้เงินเฟ้อจาก AI"
              : goal === "wealth_plan"
              ? "ให้ AI ช่วยจัดสรรพอร์ต"
              : "ขอคำแนะนำพอร์ตเงินสำรองจาก AI"}
          </span>
        </button>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-14 px-4 bg-white dark:bg-gray-800 rounded-3xl border border-[#e0dac7] dark:border-gray-700 shadow-sm space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#fed330] animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#f472b6] animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
          <div className="text-sm font-bold text-[#747878] dark:text-gray-300">
            AI กำลังวิเคราะห์และจัดสัดส่วนพอร์ตที่เหมาะสมที่สุดสำหรับคุณ...
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="ai-error-card">
          <i className="fi fi-sr-exclamation text-rose-600 text-2xl mb-2"></i>
          <div className="text-rose-600 text-sm font-bold mb-1">เกิดข้อผิดพลาด</div>
          <div className="text-[#747878] text-xs mb-4">{error}</div>
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
        <div className="space-y-5 animate-fade-in">
          {/* Summary */}
          <div className="ai-summary-box">
            <div className="text-xs font-black text-purple-700 dark:text-purple-300 flex items-center justify-between gap-2 mb-2.5 uppercase tracking-wider flex-wrap">
              <div className="flex items-center gap-2">
                <i className="fi fi-sr-sparkles text-sm"></i> สรุปคำแนะนำจาก AI
              </div>
              {contextItems && contextItems.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#747878] bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-[#e0dac7] dark:border-gray-700 normal-case tracking-normal shadow-xs">
                  ข้อมูลที่ใช้วิเคราะห์
                  <InfoTooltip title="ข้อมูลที่ใช้วิเคราะห์" align="right" position="bottom">
                    <div className="flex flex-col gap-2 w-full min-w-[230px] max-w-[280px]">
                      {contextItems.map((item, i) => (
                        <div key={i} className="bg-[#faf3e0] dark:bg-gray-900 rounded-xl p-2 border border-[#e0dac7] text-left">
                          <div className="text-[10px] font-bold text-[#747878] uppercase">{item.label}:</div> 
                          <div className="font-mono text-xs font-extrabold text-[#1e1c10] dark:text-white mt-0.5">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </InfoTooltip>
                </div>
              )}
            </div>
            <div className="text-xs sm:text-sm text-[#1e1c10] dark:text-gray-100 leading-relaxed font-normal">
              {result.summary.replace(/[*#]/g, '')}
            </div>
          </div>

          {/* Portfolio Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {context.investmentAmount ? (
              <div className="ai-stat-card">
                <div className="text-[11px] font-bold text-[#747878] mb-1 flex items-center justify-between">
                  <span>เงินลงทุนรวม</span>
                  {context.dcaAmount && context.dcaAmount > 0 ? (
                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full">
                      รวม DCA
                    </span>
                  ) : null}
                </div>
                <div className="font-mono text-lg sm:text-xl font-black text-[#065f46] dark:text-emerald-400">
                  ฿{Math.round(netInvestmentAmount).toLocaleString()}
                </div>
                {feeBreakdown.total > 0 && (
                  <div className="text-[10px] text-[#747878] mt-1 flex items-center flex-wrap gap-1">
                    <span>ทุน ฿{Math.round(context.investmentAmount).toLocaleString()}</span>
                    <span 
                      className="text-rose-600 dark:text-rose-400 border-b border-dotted border-rose-400 cursor-help"
                      title={feeTooltipText}
                    >
                      (-฿{Math.round(feeBreakdown.total).toLocaleString()})
                    </span>
                    <InfoTooltip title="รายละเอียดค่าธรรมเนียมซื้อ" position="top" align="left">
                      <div className="space-y-1.5 text-[11px] min-w-[210px]">
                        <div className="font-bold text-[#1e1c10] dark:text-white border-b border-[#e0dac7] dark:border-gray-700 pb-1 flex justify-between gap-2">
                          <span>หักค่าธรรมเนียมรวม:</span>
                          <span className="font-mono text-rose-600 dark:text-rose-400">{totalPct}%</span>
                        </div>
                        {feeBreakdown.th > 0 && (
                          <div className="flex justify-between gap-2 text-[#1e1c10] dark:text-gray-200">
                            <span>สินทรัพย์ไทย {thAllocPct < 100 ? `(${thAllocPct}%, เรท 0.17%)` : '(0.17%)'}:</span>
                            <span className="font-bold font-mono text-rose-600 dark:text-rose-400">-฿{Math.round(feeBreakdown.th).toLocaleString()}</span>
                          </div>
                        )}
                        {feeBreakdown.offshore > 0 && (
                          <div className="flex justify-between gap-2 text-[#1e1c10] dark:text-gray-200">
                            <span>สินทรัพย์ต่างประเทศ {offshoreAllocPct < 100 ? `(${offshoreAllocPct}%, เรท ${platName} ${offshoreRate}%)` : `(${platName} ${offshoreRate}%)`}:</span>
                            <span className="font-bold font-mono text-rose-600 dark:text-rose-400">-฿{Math.round(feeBreakdown.offshore).toLocaleString()}</span>
                          </div>
                        )}
                        {feeBreakdown.fund > 0 && (
                          <div className="flex justify-between gap-2 text-[#1e1c10] dark:text-gray-200">
                            <span>กองทุนรวม {fundAllocPct < 100 ? `(${fundAllocPct}%, เรท 1.00%)` : '(1.00%)'}:</span>
                            <span className="font-bold font-mono text-rose-600 dark:text-rose-400">-฿{Math.round(feeBreakdown.fund).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-2 pt-1 border-t border-gray-200 dark:border-gray-700 font-bold text-[#1e1c10] dark:text-white">
                          <span>รวมหักทั้งหมด:</span>
                          <span className="font-mono text-rose-600 dark:text-rose-400">-฿{Math.round(feeBreakdown.total).toLocaleString()}</span>
                        </div>
                      </div>
                    </InfoTooltip>
                  </div>
                )}
                {context.dcaAmount && context.dcaAmount > 0 ? (
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    (DCA สะสม +฿{context.dcaAmount.toLocaleString()})
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="ai-stat-card">
              <div className="text-[11px] font-bold text-[#747878] mb-1">Expected Yield</div>
              <div className="font-mono text-lg sm:text-xl font-black text-[#065f46] dark:text-emerald-400">
                {result.expectedPortfolioYield}%
              </div>
              {context.investmentAmount ? (
                <div className="text-[10px] font-bold text-[#065f46] dark:text-emerald-400 mt-0.5">
                  +฿{Math.round((context.investmentAmount || 0) * (result.expectedPortfolioYield / 100)).toLocaleString()}/ปี
                </div>
              ) : null}
            </div>

            <div className="ai-stat-card">
              <div className="text-[11px] font-bold text-[#747878] mb-1">ระดับความเสี่ยง</div>
              <div className={`font-mono text-lg sm:text-xl font-black ${getRiskClass(result.riskAssessment) === 'low' ? 'text-emerald-600 dark:text-emerald-400' : getRiskClass(result.riskAssessment) === 'high' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {result.riskAssessment}
              </div>
            </div>

            <div className="ai-stat-card">
              <div className="text-[11px] font-bold text-[#747878] mb-1">จำนวนสินทรัพย์</div>
              <div className="font-mono text-lg sm:text-xl font-black text-[#8b5cf6]">
                {result.portfolioSuggestions.length} รายการ
              </div>
            </div>
          </div>

          {/* Portfolio Table */}
          <div className="ai-card">
            <div className="text-sm sm:text-base font-extrabold text-[#1e1c10] dark:text-white flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <i className="fi fi-sr-chart-pie-alt text-amber-500"></i>
                <span>พอร์ตที่แนะนำ</span>
                {result.disclaimer && (
                  <InfoTooltip title="ข้อควรระวัง" position="bottom" align="left">
                    {result.disclaimer}
                  </InfoTooltip>
                )}
              </div>
              {feeBreakdown.offshore > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#747878]">Platform ลงทุน:</span>
                  <select 
                    className="bg-[#faf3e0] dark:bg-gray-900 border border-[#e0dac7] dark:border-gray-700 py-1.5 px-3 text-xs font-bold rounded-full outline-none text-[#1e1c10] dark:text-white" 
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

            <div className="overflow-x-auto max-w-full rounded-2xl border border-[#f0e9d6] dark:border-gray-700/60">
              <table className="w-full border-collapse text-xs sm:text-sm min-w-[580px]">
                <thead>
                  <tr className="bg-[#faf3e0] dark:bg-gray-900 text-[#747878] text-[11px] uppercase tracking-wider font-bold">
                    <th className="p-3.5 sm:p-4 text-left border-b border-[#f0e9d6] dark:border-gray-700/60">สินทรัพย์</th>
                    <th className="p-3.5 sm:p-4 text-left border-b border-[#f0e9d6] dark:border-gray-700/60">ตลาด</th>
                    <th className="p-3.5 sm:p-4 text-center border-b border-[#f0e9d6] dark:border-gray-700/60">สัดส่วน</th>
                    <th className="p-3.5 sm:p-4 text-center border-b border-[#f0e9d6] dark:border-gray-700/60">ผลตอบแทน/ปี</th>
                    <th className="p-3.5 sm:p-4 text-center border-b border-[#f0e9d6] dark:border-gray-700/60">คาดการณ์กำไร (ปี)</th>
                    <th className="p-3.5 sm:p-4 text-center border-b border-[#f0e9d6] dark:border-gray-700/60">ความเสี่ยง</th>
                    <th className="p-3.5 sm:p-4 text-left border-b border-[#f0e9d6] dark:border-gray-700/60">เหตุผล</th>
                    {onAddToPortfolio && (
                      <th className="p-3.5 sm:p-4 text-center border-b border-[#f0e9d6] dark:border-gray-700/60">การดำเนินการ</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0e9d6] dark:divide-gray-700/60">
                  {result.portfolioSuggestions.map((item, i) => {
                    const itemId = item.name.replace(/\s+/g, '_').toUpperCase();
                    const isAdded = currentPortfolioIds ? currentPortfolioIds.includes(itemId) : Boolean(addedMap[item.name]);

                    return (
                      <tr key={i} className="hover:bg-[#faf3e0]/50 dark:hover:bg-gray-900/30 transition-colors">
                        <td className="p-3.5 sm:p-4 text-left">
                          <div className="font-bold text-[#1e1c10] dark:text-white">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-[#747878] mt-0.5">{item.type}</div>
                        </td>
                        <td className="p-3.5 sm:p-4 text-left">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            getMarketClass(item.market) === 'th'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : getMarketClass(item.market) === 'us'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                              : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                          }`}>
                            {getMarketLabel(item.market)}
                          </span>
                        </td>
                        <td className="p-3.5 sm:p-4 text-center">
                          <div className="font-mono font-bold text-[#1e1c10] dark:text-white">
                            {item.allocation}%
                          </div>
                          <div className="w-16 mx-auto h-1.5 bg-[#f0e9d6] dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                            <div className="h-full rounded-full bg-[#8b5cf6]" style={{ width: `${item.allocation}%` }}></div>
                          </div>
                        </td>
                        <td className="p-3.5 sm:p-4 text-center font-mono font-bold text-[#065f46] dark:text-emerald-400">
                          {item.expectedYield}%
                        </td>
                        <td className="p-3.5 sm:p-4 text-center font-mono font-black text-[#065f46] dark:text-emerald-400">
                          +฿{Math.round(
                            baseAmount *
                            (item.allocation / 100) *
                            (item.expectedYield / 100)
                          ).toLocaleString()}
                        </td>
                        <td className="p-3.5 sm:p-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            getRiskClass(item.riskLevel) === 'low'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : getRiskClass(item.riskLevel) === 'medium'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {item.riskLevel}
                          </span>
                        </td>
                        <td className="p-3.5 sm:p-4 text-left">
                          <div className="text-xs text-[#747878] dark:text-gray-300 leading-relaxed max-w-[210px]">{item.reason}</div>
                        </td>
                        {onAddToPortfolio && (
                          <td className="p-3.5 sm:p-4 text-center">
                            {isAdded ? (
                              <button
                                onClick={() => handleRemoveClick(item)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white shadow-xs"
                                title={`คลิกเพื่อลบ ${item.name} ออกจากพอร์ต AI`}
                              >
                                <i className="fi fi-rr-trash text-[10px]"></i>
                                <span>ลบออก</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddClick(item)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 whitespace-nowrap cursor-pointer border-0 bg-[#1e1c10] hover:bg-black text-white dark:bg-[#fed330] dark:text-[#1e1c10] dark:hover:bg-[#fec810] hover:scale-105 active:scale-95 shadow-sm"
                                title={`เพิ่ม ${item.name} ลงพอร์ต AI`}
                              >
                                <i className="fi fi-rr-plus text-xs"></i>
                                <span>เพิ่ม</span>
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-3xl p-5 sm:p-6 mb-5">
              <div className="text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-extrabold flex items-center gap-2 mb-2 uppercase tracking-wide">
                <i className="fi fi-sr-exclamation text-amber-600"></i> คำเตือน
              </div>
              <ul className="m-0 pl-5 text-[#1e1c10] dark:text-gray-200 text-xs sm:text-sm leading-relaxed space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Regenerate */}
          <div className="flex justify-center pt-2">
            <button className="ai-secondary-btn" onClick={fetchSuggestion} disabled={loading}>
              <i className="fi fi-rr-refresh text-xs"></i>
              <span>ขอคำแนะนำใหม่</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
