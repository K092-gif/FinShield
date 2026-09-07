import React, { useState, useEffect } from 'react';
import InfoTooltip from '../InfoTooltip';

interface DashboardViewProps {
  state: any;
  actions: any;
}

/* ── Pastel palette per asset category (circular ticker badges) ── */
const TICKER_STYLE: Record<string, string> = {
  'thai-stock': 'bg-[#FED330] text-[#1e1c10]',
  'reit': 'bg-[#FFD8E7] text-[#361928]',
  'dr': 'bg-[#E9D5FF] text-[#5B21B6]',
  'us-stock': 'bg-[#DBEAFE] text-[#1E40AF]',
  'etf-bond': 'bg-[#CFFAFE] text-[#155E75]',
};
const defaultTicker = 'bg-[#F4EEDB] text-[#1e1c10]';

export default function DashboardView({ state, actions }: DashboardViewProps) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  useEffect(() => {
    if (state.myDivCalendar && state.myDivCalendar.length > 0) {
      const firstActive = state.myDivCalendar.find((d: any) => d.amount > 0);
      if (firstActive) {
        setSelectedMonthIndex(firstActive.monthIndex);
      } else {
        setSelectedMonthIndex(state.myDivCalendar[0].monthIndex);
      }
    }
  }, [state.myDivCalendar]);

  const myWeightedYield = state.myPortfolio.length > 0
    ? state.myPortfolio.reduce((s: number, p: any) => s + (p.allocation * p.expectedYield / 100), 0)
    : 0;
  const aiWeightedYield = state.aiPortfolio.length > 0
    ? state.aiPortfolio.reduce((s: number, p: any) => s + (p.allocation * p.expectedYield / 100), 0)
    : 0;
  const aiRisk = state.aiPortfolio.length > 0
    ? (state.aiPortfolio.some((p: any) => p.riskLevel?.toLowerCase().includes('สูง') || p.riskLevel?.toLowerCase().includes('high')) ? 'สูง'
      : state.aiPortfolio.every((p: any) => p.riskLevel?.toLowerCase().includes('ต่ำ') || p.riskLevel?.toLowerCase().includes('low')) ? 'ต่ำ' : 'ปานกลาง')
    : '-';

  // ── Calculation strictly synchronized: Portfolio Value = Invested + PnL ──
  const dcaAccumulated = state.dcaInfo?.totalDcaAmount || 0;
  const basePnlInvested = (state.myPnlData?.totalInvested && state.myPnlData.totalInvested > 0)
    ? state.myPnlData.totalInvested
    : (state.initialInvestment || 0);

  // Check if myPnlData already incorporates the accumulated DCA
  const isDcaAlreadyInPnl = state.myPnlData?.dcaIncluded === true;
  const investedAmount = isDcaAlreadyInPnl
    ? basePnlInvested
    : (basePnlInvested + dcaAccumulated);

  const rawPnl = state.myPnlData ? (state.myPnlData.totalProfitLoss || 0) : 0;
  const currentValue = state.myPnlData
    ? ((state.myPnlData.totalCurrentValue ?? (basePnlInvested + rawPnl)) + (isDcaAlreadyInPnl ? 0 : dcaAccumulated))
    : (investedAmount + rawPnl);

  const actualPnl = currentValue - investedAmount;
  const pnlPct = investedAmount > 0
    ? (actualPnl / investedAmount) * 100
    : (state.myPnlData?.totalProfitLossPct || 0);

  const bankBalance = state.projectedBankBalance || 0;

  /* ── Dividend accumulation with monthly DCA (net of 10% tax) ── */
  const monthlyDca = state.monthlyInvestment || 0;
  const calcAccumulatedDiv = (years: number, yieldRate: number) => {
    let cap = investedAmount || 0;
    let totalDiv = 0;
    for (let m = 1; m <= years * 12; m++) {
      cap += monthlyDca;
      totalDiv += (cap * yieldRate * 0.9) / 12;
    }
    return totalDiv;
  };
  const targetYear = typeof state.investmentYears === 'number' && state.investmentYears > 0 ? state.investmentYears : (parseInt(state.investmentYears, 10) || 10);
  const milestones = Array.from(new Set([1, 3, 5, 10, targetYear].filter((y: number) => y > 0).sort((a: number, b: number) => a - b)));
  const barData = milestones.map((y: number) => ({
    year: y,
    mine: calcAccumulatedDiv(y, myWeightedYield / 100),
    ai: calcAccumulatedDiv(y, aiWeightedYield / 100),
  }));
  const maxBar = Math.max(...barData.flatMap(d => [d.mine, d.ai]), 1);

  const handleRemoveAiAsset = (idToRemove: string) => {
    actions.setAiPortfolio((prev: any[]) => {
      const remaining = (prev || []).filter((item: any) => item.id !== idToRemove);
      if (remaining.length === 0) return [];
      
      const totalAlloc = remaining.reduce((sum: number, item: any) => sum + (Number(item.allocation) || 0), 0);
      if (totalAlloc > 0) {
        let accumulated = 0;
        return remaining.map((item: any, idx: number) => {
          if (idx === remaining.length - 1) {
            const lastAlloc = Math.max(1, 100 - accumulated);
            return { ...item, allocation: lastAlloc };
          }
          const proportional = Math.max(1, Math.round((item.allocation / totalAlloc) * 100));
          accumulated += proportional;
          return { ...item, allocation: proportional };
        });
      }
      return remaining;
    });
  };

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header & Sub-tab Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1e1c10] dark:text-white tracking-tight m-0 pb-1 flex items-center gap-2">
            Portfolio <span className="font-medium text-[#747878] dark:text-gray-400">Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 m-0">
            ภาพรวมการลงทุน การเติบโตของพอร์ต และการคาดการณ์ปันผลสะสม
          </p>
        </div>
        <div className="flex w-full sm:w-auto bg-[#faf3e0] dark:bg-[#201f1a] p-1 rounded-full border border-[#e0dac7] dark:border-[#423e35]">
          <button
            className="flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs sm:text-sm font-bold text-[#747878] dark:text-[#a8a497] hover:text-[#1e1c10] dark:hover:text-white bg-transparent border-0 cursor-pointer transition-all flex items-center justify-center gap-2"
            onClick={() => actions.setPage(0)}
          >
            Wealth Plan
          </button>
          <button className="flex-1 sm:flex-initial px-5 py-2 rounded-full bg-[#fed330] text-[#1e1c10] text-xs sm:text-sm font-bold shadow-sm border-0 cursor-pointer transition-all flex items-center justify-center gap-2">
            Dashboard
          </button>
        </div>
      </div>

      {/* ── Main Two-Column Layout: ซ้ายพอร์ตคุณ / ขวา AI + กราฟ ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* ═══ LEFT (2/3): Stat Cards + Holdings ═══ */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">

          {/* 3 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
            {/* 1. เงินลงทุนรวม พร้อม Tooltip รายละเอียดค่าธรรมเนียม */}
            <div className="bg-white dark:bg-[#201f1a] rounded-[28px] p-5 sm:p-6 border border-[#e0dac7] dark:border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-card)] flex flex-col justify-between min-h-[135px] gap-2">
              <div className="text-xs sm:text-sm font-bold text-[#747878] dark:text-[#a8a497] flex items-center gap-1">
                <span>เงินลงทุนรวม</span>
                <InfoTooltip title="รายละเอียดเงินลงทุนรวม" position="bottom" align="left">
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between gap-3">
                      <span className="text-[#747878]">เงินลงทุนตั้งต้น:</span>
                      <span className="font-bold font-mono text-[#1e1c10] dark:text-white">฿{fmt(state.initialInvestment || (investedAmount - dcaAccumulated))}</span>
                    </div>
                    {state.initialInvestment && state.initialInvestment > (investedAmount - dcaAccumulated) ? (
                      <div className="flex justify-between gap-3 text-amber-700 dark:text-amber-300">
                        <span>หักค่าธรรมเนียมซื้อ (~0.16-0.65%):</span>
                        <span className="font-bold font-mono">-฿{fmt(state.initialInvestment - (investedAmount - dcaAccumulated))}</span>
                      </div>
                    ) : null}
                    {dcaAccumulated > 0 && (
                      <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-300">
                        <span>สะสมจากการ DCA ({state.dcaInfo?.executedCount} งวด):</span>
                        <span className="font-bold font-mono">+฿{fmt(dcaAccumulated)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-300 pt-1 border-t border-gray-100 dark:border-[#35332b]">
                      <span className="font-semibold">เงินลงทุนสุทธิในพอร์ต:</span>
                      <span className="font-black font-mono">฿{fmt(investedAmount)}</span>
                    </div>
                    {monthlyDca > 0 && (
                      <div className="text-[10px] text-[#747878] dark:text-[#a8a497] pt-1 space-y-0.5 border-t border-dashed border-gray-200 dark:border-gray-800">
                        <div>+ ลงทุนสม่ำเสมอ (DCA) ฿{fmt(monthlyDca)}/เดือน</div>
                        <div className="font-semibold">
                          {state.dcaInfo?.isDcaDueThisMonth 
                            ? <span className="text-emerald-600 dark:text-emerald-400">✓ รอบเดือนนี้เข้าซื้อแล้ว (ทุกวันที่ {state.dcaDay || 1})</span>
                            : <span className="text-amber-600 dark:text-amber-400">⏳ รอบเดือนนี้รอเข้าซื้อวันที่ {state.dcaDay || 1}</span>
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </InfoTooltip>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#1e1c10] dark:text-white tracking-tight">
                ฿{fmt(investedAmount)}
              </div>
              <div className="text-xs font-bold text-[#747878] dark:text-[#a8a497] flex flex-wrap items-center justify-between gap-1.5">
                <span>
                  {monthlyDca > 0 ? `DCA เพิ่ม ฿${fmt(monthlyDca)}/เดือน` : 'ต้นทุนเงินลงทุนเริ่มต้น'}
                </span>
                {monthlyDca > 0 && (
                  <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    state.dcaInfo?.isDcaDueThisMonth 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}>
                    {state.dcaInfo?.isDcaDueThisMonth 
                      ? `✓ เข้าซื้อแล้ว (ทุกวันที่ ${state.dcaDay || 1})` 
                      : `รอบถัดไป: วันที่ ${state.dcaDay || 1}`}
                  </span>
                )}
              </div>
            </div>

            {/* 2. มูลค่าพอร์ตปัจจุบัน (ตัวเลขกำไร/ขาดทุนขนาดใหญ่ขึ้น ชัดเจน) */}
            <div className="bg-white dark:bg-[#201f1a] rounded-[28px] p-5 sm:p-6 border border-[#e0dac7] dark:border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-card)] flex flex-col justify-between min-h-[135px] gap-2">
              <div className="text-xs sm:text-sm font-bold text-[#747878] dark:text-[#a8a497]">
                <span>มูลค่าพอร์ตปัจจุบัน</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#1e1c10] dark:text-white">
                ฿{fmt(currentValue)}
              </div>
              <div className="flex items-center">
                <span className={`text-sm sm:text-base font-extrabold font-mono ${actualPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {actualPnl >= 0 ? '↗' : '↘'} {actualPnl >= 0 ? '+' : ''}฿{fmt(Math.abs(actualPnl))} ({actualPnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* 3. เงินฝากธนาคารถึงเกษียณ */}
            <div className="bg-white dark:bg-[#201f1a] rounded-[28px] p-5 sm:p-6 border border-[#e0dac7] dark:border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-card)] flex flex-col justify-between min-h-[135px] gap-2">
              <div className="text-xs sm:text-sm font-bold text-[#747878] dark:text-[#a8a497]">
                <span>เงินฝากธนาคารถึงเกษียณ</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#1e1c10] dark:text-white tracking-tight">
                ฿{fmt(bankBalance)}
              </div>
              <div className="pt-0.5">
                <select
                  className="w-full bg-[#faf3e0] dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-full text-xs font-semibold text-[#1e1c10] dark:text-[#f5f3eb] py-1.5 px-3 outline-none cursor-pointer"
                  value={state.selectedBank}
                  onChange={(e) => actions.setSelectedBank(e.target.value)}
                >
                  {Object.entries(state.bankTiers || {}).map(([key, bank]: any) => (
                    <option key={key} value={key}>{bank.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Holdings — My Portfolio Details (Uniform Typography & Precise Baseline Alignment) */}
          <div className="bg-white dark:bg-[#201f1a] rounded-[32px] border border-[#e0dac7] dark:border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col flex-1">
            <div className="p-5 sm:p-6 border-b border-[#f0e9d6] dark:border-[#35332b] flex justify-between items-center">
              <div className="font-bold text-base sm:text-lg text-[#1e1c10] dark:text-white flex items-center gap-2">
                <span>My Portfolio</span>
                {state.myPnlData?.assets && state.myPnlData.assets.length > 5 && (
                  <span className="text-xs font-semibold text-[#747878] dark:text-[#a8a497] bg-[#faf3e0] dark:bg-[#282620] px-2.5 py-0.5 rounded-full border border-[#e0dac7]/60 dark:border-[#423e35]">
                    {state.myPnlData.assets.length} สินทรัพย์
                  </span>
                )}
              </div>
              <button
                onClick={() => { actions.setPortfolioModalTab('my'); actions.setShowPortfolioModal(true); }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs sm:text-sm font-bold bg-[#1e1c10] hover:bg-black text-white transition-all cursor-pointer border-0 shadow-sm"
              >
                <i className="fi fi-rr-plus text-xs"></i> ปรับพอร์ต
              </button>
            </div>

            {state.myPortfolio.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#747878] dark:text-[#a8a497] py-16 opacity-70">
                <i className="fi fi-sr-box-open text-4xl mb-3"></i>
                <div className="text-sm sm:text-base font-semibold">ยังไม่มีสินทรัพย์ — กดปรับพอร์ตเพื่อเพิ่มสินทรัพย์</div>
              </div>
            ) : state.myPnlLoading ? (
              <div className="flex-1 flex flex-col p-6 space-y-4">
                <div className="flex items-center gap-3 text-[#725c00] dark:text-[#fed330]">
                  <i className="fi fi-sr-spinner animate-spin text-xl"></i>
                  <span className="text-sm font-bold">กำลังเชื่อมต่อราคาตลาดสดและคำนวณกำไร/ขาดทุน...</span>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#faf3e0]/50 dark:bg-[#282620]/50 border border-[#f0e9d6] dark:border-[#35332b]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full skeleton-box shrink-0" />
                        <div className="space-y-1.5">
                          <div className="w-24 h-4 rounded skeleton-box" />
                          <div className="w-36 h-3 rounded skeleton-box" />
                        </div>
                      </div>
                      <div className="space-y-1.5 text-right">
                        <div className="w-20 h-4 rounded skeleton-box ml-auto" />
                        <div className="w-14 h-3 rounded skeleton-box ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : state.myPnlData && state.myPnlData.assets ? (
              <div className="flex-1 flex flex-col w-full overflow-x-auto">
                <div className="min-w-[660px] flex-1 flex flex-col">
                  {/* Fixed Table Header */}
                  <div className="bg-[#faf3e0]/80 dark:bg-[#282620] border-b border-[#f0e9d6] dark:border-[#35332b] shrink-0">
                    <table className="w-full text-left border-collapse table-fixed">
                      <thead>
                        <tr className="text-[#747878] dark:text-[#a8a497] text-[11px] sm:text-xs uppercase tracking-wider font-bold">
                          <th className="p-4 sm:p-5 w-[28%]">สินทรัพย์</th>
                          <th className="p-4 sm:p-5 w-[14%] text-right">จำนวน</th>
                          <th className="p-4 sm:p-5 w-[14%] text-right">ต้นทุนเฉลี่ย</th>
                          <th className="p-4 sm:p-5 w-[14%] text-right">ราคาปัจจุบัน</th>
                          <th className="p-4 sm:p-5 w-[15%] text-right">มูลค่ารวม</th>
                          <th className="p-4 sm:p-5 w-[15%] text-right">กำไร/ขาดทุน</th>
                        </tr>
                      </thead>
                    </table>
                  </div>

                  {/* Scrollable Rows Container (Fills available card height gracefully) */}
                  <div className="flex-1 overflow-y-auto min-h-[340px] max-h-[480px]">
                    <table className="w-full text-left border-collapse table-fixed">
                      <tbody className="text-sm sm:text-base divide-y divide-[#f0e9d6] dark:divide-[#35332b]">
                        {state.myPnlData.assets.map((a: any) => {
                          const plColor = a.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
                          const dayColor = (a.oneDayChangePct || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
                          const isUsd = a.currency === 'USD';
                          const costDisplay = `฿${(a.costPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          const curDisplay = `฿${(a.currentPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          const tickerCls = TICKER_STYLE[a.category] || defaultTicker;

                          return (
                            <tr key={a.id} className="hover:bg-[#faf3e0]/50 dark:hover:bg-[#282620]/60 transition-colors">
                              <td className="p-4 sm:p-5 w-[28%]">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full ${tickerCls} flex items-center justify-center text-[10px] font-black shrink-0`}>
                                    {(a.id || '?').slice(0, 4)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-[#1e1c10] dark:text-gray-100 text-sm sm:text-base truncate">{a.id}</div>
                                    <div className="text-xs text-[#747878] truncate max-w-[180px]" title={a.name}>{a.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 sm:p-5 w-[14%] text-right">
                                <div className="font-mono font-semibold text-[#1e1c10] dark:text-gray-100 text-sm sm:text-base">
                                  {a.shares > 0 ? a.shares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '-'}
                                </div>
                                <div className="text-[11px] text-[#747878] mt-0.5">หุ้น / หน่วย</div>
                              </td>
                              <td className="p-4 sm:p-5 w-[14%] text-right">
                                <div className="font-mono font-semibold text-[#1e1c10] dark:text-gray-100 text-sm sm:text-base">
                                  {costDisplay}
                                </div>
                                <div className="text-[11px] text-[#747878] mt-0.5">
                                  {isUsd && a.costPriceRaw > 0 ? `$${a.costPriceRaw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'บาท'}
                                </div>
                              </td>
                              <td className="p-4 sm:p-5 w-[14%] text-right">
                                <div className="font-mono font-semibold text-[#1e1c10] dark:text-gray-100 text-sm sm:text-base">
                                  {curDisplay}
                                </div>
                                <div className={`text-[11px] font-semibold ${dayColor} mt-0.5`}>
                                  {(a.oneDayChangePct || 0) >= 0 ? '↗ +' : '↘ '}{(a.oneDayChangePct || 0).toFixed(2)}%
                                </div>
                              </td>
                              <td className="p-4 sm:p-5 w-[15%] text-right">
                                <div className="font-mono font-semibold text-[#1e1c10] dark:text-gray-100 text-sm sm:text-base">
                                  ฿{(a.currentValue || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-[11px] text-[#747878] mt-0.5">
                                  {currentValue > 0 ? `${(((a.currentValue || 0) / currentValue) * 100).toFixed(1)}% พอร์ต` : '-'}
                                </div>
                              </td>
                              <td className="p-4 sm:p-5 w-[15%] text-right">
                                <div className={`font-mono font-semibold text-sm sm:text-base ${plColor}`}>
                                  {a.profitLoss >= 0 ? '+' : ''}฿{Math.abs(a.profitLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                                <div className={`text-[11px] font-semibold ${plColor} mt-0.5`}>
                                  ({a.profitLossPct >= 0 ? '+' : ''}{(a.profitLossPct || 0).toFixed(2)}%)
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#747878] py-16 opacity-70">
                <i className="fi fi-sr-calendar text-4xl mb-3"></i>
                <div className="text-sm sm:text-base">เพิ่มวันที่ซื้อ (Buy Date) ในพอร์ตเพื่อดู P&L สด</div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT (1/3): AI Strategy + Div Accumulation ═══ */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">

          {/* AI Strategy — Pink Card */}
          <div className="bg-[#ffd8e7] dark:bg-[#361928] rounded-[32px] p-5 sm:p-6 border border-[#f2c3ce] dark:border-pink-900/60 shadow-[var(--shadow-card)] space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="font-bold text-base sm:text-lg text-[#1e1c10] dark:text-pink-100">
                <span>AI Strategy</span>
              </div>
              <span className="bg-[#fff6dc] dark:bg-[#28111d] text-[#705b00] dark:text-pink-200 border border-transparent dark:border-pink-900/50 px-3 py-1 rounded-full text-xs font-bold">
                ความเสี่ยง: {aiRisk}
              </span>
            </div>

            {state.aiPortfolio.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-[#361928] dark:text-pink-200 py-6 gap-3">
                <i className="fi fi-sr-robot text-3xl opacity-60"></i>
                <div className="text-xs font-semibold">ยังไม่มีข้อมูล — ขอคำแนะนำจาก AI</div>
                <button
                  onClick={() => { actions.setPortfolioModalTab('ai'); actions.setShowPortfolioModal(true); }}
                  className="w-full bg-[#1e1c10] hover:bg-black text-white dark:bg-[#200f19] dark:hover:bg-[#180b13] dark:text-pink-100 dark:border dark:border-pink-900/50 text-xs font-bold py-3 rounded-full transition-all cursor-pointer border-0 shadow-sm"
                >
                  ขอคำแนะนำจาก AI
                </button>
              </div>
            ) : (
              <>
                {/* Two inner blocks — softly integrated in dark mode */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#fff6dc] dark:bg-[#28111d] border border-transparent dark:border-pink-900/40 rounded-2xl p-3.5 flex flex-col justify-between">
                    <div className="text-[10px] font-bold text-[#747878] dark:text-pink-300/80 uppercase tracking-wide flex items-center gap-1">
                      <span>Expected Yield</span>
                      <span className="font-semibold text-[#a09e99] dark:text-pink-300/60">/ ปี</span>
                    </div>
                    <div className="text-lg sm:text-xl font-black font-mono text-[#1e1c10] dark:text-white mt-1">
                      {aiWeightedYield.toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-[#fff6dc] dark:bg-[#28111d] border border-transparent dark:border-pink-900/40 rounded-2xl p-3.5 flex flex-col justify-between">
                    <div className="text-[10px] font-bold text-[#747878] dark:text-pink-300/80 uppercase tracking-wide flex items-center gap-1">
                      <span>กำไรคาดการณ์</span>
                      <span className="font-semibold text-[#a09e99] dark:text-pink-300/60">/ ปี</span>
                    </div>
                    <div className="text-lg sm:text-xl font-black font-mono text-[#065f46] dark:text-emerald-400 mt-1">
                      +฿{fmt(Math.round((investedAmount || 0) * (aiWeightedYield / 100)))}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-[#361928] dark:text-pink-200/90 leading-relaxed">
                  AI แนะนำให้กระจายความเสี่ยงในสินทรัพย์ที่สอดคล้องกับเป้าหมายและระยะเวลาลงทุนของคุณ เพื่อรับผลตอบแทนรวมเฉลี่ย {aiWeightedYield.toFixed(2)}% ต่อปี
                </div>

                {/* Allocation list: shows 3 items initially, scrollable for more, with trash icon */}
                <div className="space-y-2.5 max-h-[142px] overflow-y-auto pr-1">
                  {state.aiPortfolio.map((item: any) => (
                    <div key={item.id} className="space-y-1 group">
                      <div className="flex justify-between items-center text-xs font-bold gap-2">
                        <span className="text-[#1e1c10] dark:text-pink-100 truncate flex-1 min-w-0" title={item.name || item.id}>
                          {item.name || item.id}
                        </span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-black text-[#8b5cf6] dark:text-pink-300">{item.allocation}%</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAiAsset(item.id);
                            }}
                            className="w-5 h-5 rounded-full bg-rose-50 dark:bg-pink-950/70 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-600 dark:text-pink-300 hover:text-white dark:hover:text-white flex items-center justify-center transition-all cursor-pointer border border-rose-200 dark:border-pink-900/50 shadow-xs"
                            title={`ลบ ${item.name || item.id} ออกจากพอร์ต AI`}
                          >
                            <i className="fi fi-rr-trash text-[10px]"></i>
                          </button>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#f0e9d6] dark:bg-pink-950/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1e1c10] dark:bg-pink-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(item.allocation, 3)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Full recommendation button without arrow */}
                <button
                  onClick={() => { actions.setPortfolioModalTab('ai'); actions.setShowPortfolioModal(true); }}
                  className="w-full bg-[#1e1c10] hover:bg-black text-white dark:bg-[#200f19] dark:hover:bg-[#180b13] dark:text-pink-100 dark:border dark:border-pink-900/50 text-xs sm:text-sm font-bold py-3 rounded-full transition-all flex items-center justify-center cursor-pointer border-0 shadow-sm hover:shadow"
                >
                  ดูแนะนำฉบับเต็ม
                </button>
              </>
            )}
          </div>

          {/* Div Accumulation — Bar Chart with InfoTooltip & Clean Input (Zero blank footer) */}
          <div className="bg-white dark:bg-[#201f1a] rounded-[32px] p-5 sm:p-6 border border-[#e0dac7] dark:border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-card)] space-y-4 flex-1 flex flex-col justify-between relative">
            <div className="flex items-center justify-between shrink-0 gap-2 relative z-30">
              <div className="font-bold text-base sm:text-lg text-[#1e1c10] dark:text-white flex items-center gap-1.5 shrink-0">
                <span className="whitespace-nowrap">ปันผลสะสม (สุทธิ)</span>
                <InfoTooltip title="การคาดการณ์ปันผลสะสม" position="bottom" align="left">
                  คำนวณจากเงินลงทุน ฿{fmt(investedAmount)} {monthlyDca > 0 ? `+ DCA ฿${fmt(monthlyDca)}/เดือน` : ''} หักภาษี ณ ที่จ่าย 10% เรียบร้อยแล้ว (ชี้ที่แท่งเพื่อดูยอดปันผลสะสมในแต่ละช่วงปี)
                </InfoTooltip>
              </div>
              <div className="flex items-center gap-1.5 text-xs shrink-0">
                <input
                  type="number" min={1} max={40}
                  value={state.investmentYears === 0 || state.investmentYears === '' ? '' : state.investmentYears}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '') {
                      actions.setInvestmentYears('');
                    } else {
                      const num = parseInt(v, 10);
                      actions.setInvestmentYears(isNaN(num) ? '' : num);
                    }
                  }}
                  placeholder="10"
                  className="w-14 bg-[#faf3e0] dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-full px-2.5 py-1 text-xs font-bold text-center outline-none text-[#1e1c10] dark:text-[#f5f3eb] font-mono"
                />
                <span className="text-[#747878] dark:text-[#a8a497] font-bold">ปี</span>
              </div>
            </div>

            {(investedAmount > 0 || monthlyDca > 0) && (myWeightedYield > 0 || aiWeightedYield > 0) ? (
              <div className="flex-1 flex flex-col justify-between gap-4">
                {/* Bars with interactive tooltip */}
                <div className="flex items-end justify-between gap-2 h-full min-h-[160px] px-1 pt-4 pb-1">
                  {barData.map(d => {
                    const isHovered = hoveredYear === d.year;
                    return (
                      <div
                        key={d.year}
                        className="relative flex-1 flex flex-col items-center h-full group cursor-pointer"
                        onMouseEnter={() => setHoveredYear(d.year)}
                        onMouseLeave={() => setHoveredYear(null)}
                      >
                        {/* Floating Tooltip in Serene Pulse aesthetic with high z-index (z-[60]) */}
                        {isHovered && (
                          <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-[60] bg-white dark:bg-[#282620] text-[#1e1c10] dark:text-[#f5f3eb] px-3.5 py-2.5 rounded-2xl shadow-xl border border-[#e0dac7] dark:border-[#423e35] text-xs whitespace-nowrap pointer-events-none transition-all duration-150 animate-fade-in flex flex-col gap-1.5 min-w-[145px]">
                            <div className="text-[11px] font-extrabold pb-1 border-b border-[#f0e9d6] dark:border-[#35332b] flex justify-between items-center gap-2">
                              <span className="text-[#1e1c10] dark:text-white">สะสม {d.year} ปี</span>
                              {d.ai > d.mine && (
                                <span className="text-[#065f46] dark:text-emerald-400 font-mono text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200/50">
                                  +฿{fmt(d.ai - d.mine)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-3 text-[11px]">
                              <span className="flex items-center gap-1.5 text-[#747878] dark:text-[#a8a497]">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#fed330] inline-block shadow-xs"></span> พอร์ตคุณ:
                              </span>
                              <span className="font-mono font-black text-[#1e1c10] dark:text-gray-100">฿{fmt(d.mine)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-[11px]">
                              <span className="flex items-center gap-1.5 text-[#747878] dark:text-[#a8a497]">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#f472b6] inline-block shadow-xs"></span> พอร์ต AI:
                              </span>
                              <span className="font-mono font-black text-[#db2777] dark:text-pink-400">฿{fmt(d.ai)}</span>
                            </div>
                            {/* Arrow bottom pointer */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white dark:border-t-[#282620]" />
                          </div>
                        )}

                        {/* Column hover background glow */}
                        <div className={`absolute inset-0 rounded-2xl transition-all duration-200 pointer-events-none ${isHovered ? 'bg-[#faf3e0]/70 dark:bg-[#35332b]/40 -m-1' : ''}`} />

                        {/* Bars: Yellow & Pink (No default browser title) */}
                        <div className="relative z-10 flex items-end justify-center gap-1.5 h-full w-full">
                          <div
                            className={`w-[42%] max-w-[24px] bg-[#fed330] rounded-t-[8px] transition-all duration-200 shadow-sm ${
                              isHovered ? 'scale-y-[1.03] brightness-105 shadow-md' : 'hover:opacity-90'
                            }`}
                            style={{ height: `${Math.max((d.mine / maxBar) * 100, 4)}%` }}
                          />
                          <div
                            className={`w-[42%] max-w-[24px] bg-[#f472b6] rounded-t-[8px] transition-all duration-200 shadow-sm ${
                              isHovered ? 'scale-y-[1.03] brightness-110 shadow-md' : 'hover:opacity-90'
                            }`}
                            style={{ height: `${Math.max((d.ai / maxBar) * 100, 4)}%` }}
                          />
                        </div>

                        {/* Year Label */}
                        <div className="relative z-10 text-[11px] font-bold text-[#747878] dark:text-[#a8a497] mt-2 font-mono">
                          {d.year}Y
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 text-xs font-bold text-[#747878] dark:text-[#a8a497] shrink-0 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fed330] shadow-sm"></span> พอร์ตคุณ (My Portfolio)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f472b6] shadow-sm"></span> พอร์ต AI (AI Portfolio)
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-[#747878] dark:text-[#a8a497] flex-1 flex items-center justify-center">ยังไม่มีข้อมูล — จัดพอร์ตเพื่อคำนวณปันผลสะสม</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Balanced Section: Div Calendar (Sleek 2-Column Split: Month Navigator on Left + Asset Cards on Right) ── */}
      <div className="bg-white dark:bg-[#201f1a] rounded-[32px] border border-[#e0dac7] dark:border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-card)] p-6 sm:p-7 space-y-5 relative">
        
        {/* Header with InfoTooltip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f0e9d6] dark:border-[#35332b]">
          <div>
            <div className="font-bold text-base sm:text-lg text-[#1e1c10] dark:text-white flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#faf3e0] dark:bg-[#282620] text-[#1e1c10] dark:text-[#fed330] flex items-center justify-center text-xs shadow-sm">
                <i className="fi fi-sr-calendar"></i>
              </div>
              <span>Div Calendar (ปฏิทินรับเงินปันผลรายเดือน)</span>
              <InfoTooltip title="วิธีการคำนวณเงินปันผลสุทธิ" position="bottom" align="left">
                เงินปันผลสุทธิ = (จำนวนหุ้น × DPS หรือ มูลค่าเงินลงทุน × Yield) × 0.9 (หักภาษี ณ ที่จ่าย 10%) คาดการณ์ตามรอบการจ่ายจริงของแต่ละสินทรัพย์ในพอร์ต
              </InfoTooltip>
            </div>
            <div className="text-xs sm:text-sm text-[#747878] dark:text-[#a8a497] mt-0.5">
              คาดการณ์ปันผลจริงของ My Portfolio จากข้อมูลตลาด (หลังหักภาษี ณ ที่จ่าย 10%)
            </div>
          </div>

          {state.myDivCalendar && state.myDivCalendar.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="bg-[#faf3e0] dark:bg-[#282620] px-3.5 py-1.5 rounded-full border border-[#e0dac7] dark:border-[#423e35] flex items-center gap-2">
                <span className="text-xs font-bold text-[#747878] dark:text-[#a8a497]">เฉลี่ยต่อเดือน:</span>
                <span className="text-xs font-extrabold font-mono text-[#1e1c10] dark:text-white">
                  ฿{((state.myDivCalendar.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)) / 12).toFixed(2)}/ด.
                </span>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-2">
                <span className="text-xs font-bold text-[#065f46] dark:text-emerald-300">รวมทั้งปี (สุทธิ):</span>
                <span className="text-sm font-black font-mono text-[#065f46] dark:text-emerald-300">
                  ฿{fmt(Math.round(state.myDivCalendar.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)))}/ปี
                </span>
              </div>
            </div>
          )}
        </div>

        {state.myPnlLoading ? (
          <div className="text-center py-12 text-[#725c00] dark:text-[#fed330]">
            <i className="fi fi-sr-spinner animate-spin text-3xl mb-3"></i>
            <div className="text-sm font-bold">กำลังประมวลผลปฏิทินปันผล...</div>
          </div>
        ) : state.myDivCalendar && state.myDivCalendar.length > 0 ? (
          (() => {
            const activeMonthData = state.myDivCalendar.find((d: any) => d.monthIndex === selectedMonthIndex) || state.myDivCalendar.find((d: any) => d.amount > 0) || state.myDivCalendar[0];
            const activeAmount = activeMonthData?.amount || 0;
            const assetsList = Array.isArray(activeMonthData?.assets) ? activeMonthData.assets : [];

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                
                {/* ═══ ฝั่งซ้าย (4/12): เมนูเลือกรอบเดือนที่จ่ายปันผล (Clean Vertical Month Cards) ═══ */}
                <div className="lg:col-span-4 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-[#747878] dark:text-[#a8a497] px-1 flex justify-between items-center">
                      <span>เลือกรอบเดือน:</span>
                      <span className="text-[11px] font-semibold text-[#747878] dark:text-[#a8a497]">{state.myDivCalendar.length} รอบจ่ายต่อปี</span>
                    </div>

                    <div className="space-y-2">
                      {state.myDivCalendar.map((d: any) => {
                        const isActive = (selectedMonthIndex ?? activeMonthData.monthIndex) === d.monthIndex;
                        const has = d.amount > 0;
                        const assetCount = Array.isArray(d.assets) ? d.assets.length : 0;

                        return (
                          <button
                            key={d.monthIndex}
                            onClick={() => setSelectedMonthIndex(d.monthIndex)}
                            className={`w-full p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                              isActive
                                ? 'bg-[#fed330] text-[#1e1c10] border-2 border-[#1e1c10]/20 shadow-md scale-[1.01] font-bold ring-2 ring-[#fed330]/30'
                                : 'bg-[#faf3e0]/60 dark:bg-[#282620] border-[#e0dac7] dark:border-[#423e35] hover:bg-[#faf3e0] dark:hover:bg-[#35332b] text-[#1e1c10] dark:text-[#f5f3eb]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-xs ${
                                isActive ? 'bg-[#1e1c10] text-[#fed330]' : 'bg-white dark:bg-[#201f1a] text-[#1e1c10] dark:text-white border border-[#e0dac7] dark:border-[#423e35]'
                              }`}>
                                {d.month}
                              </span>
                              <div>
                                <div className={`text-xs font-extrabold ${isActive ? 'text-[#1e1c10]' : 'text-[#1e1c10] dark:text-white'}`}>
                                  รอบเดือน {d.month}
                                </div>
                                <div className={`text-[10px] ${isActive ? 'text-[#1e1c10]/80' : 'text-[#747878] dark:text-[#a8a497]'}`}>
                                  {assetCount > 0 ? `${assetCount} สินทรัพย์จ่ายปันผล` : 'ไม่มีรอบจ่าย'}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 font-mono">
                              <div className={`text-sm font-black ${isActive ? 'text-[#1e1c10]' : has ? 'text-[#065f46] dark:text-emerald-400' : 'text-[#a09e99]'}`}>
                                {has ? `฿${fmt(Math.round(d.amount))}` : '-'}
                              </div>
                              <div className={`text-[9px] ${isActive ? 'text-[#1e1c10]/70' : 'text-[#747878] dark:text-[#a8a497]'}`}>
                                {has ? 'สุทธิ' : ''}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary note below month list */}
                  <div className="p-3 bg-[#faf3e0]/40 dark:bg-[#282620] rounded-2xl border border-[#f0e9d6] dark:border-[#423e35] text-[11px] text-[#747878] dark:text-[#a8a497] flex items-center justify-between">
                    <span>รอบจ่ายเฉลี่ย:</span>
                    <span className="font-bold font-mono text-[#1e1c10] dark:text-white">
                      ฿{fmt(Math.round((state.myDivCalendar.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)) / Math.max(1, state.myDivCalendar.length)))} / รอบ
                    </span>
                  </div>
                </div>

                {/* ═══ ฝั่งขวา (8/12): ตารางสินทรัพย์ในรอบเดือนที่เลือก (2-Column Grid) ═══ */}
                <div className="lg:col-span-8 bg-[#faf3e0]/60 dark:bg-[#282620] border border-[#e0dac7] dark:border-[#423e35] rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-[var(--shadow-sm)]">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#f0e9d6] dark:border-[#35332b]">
                      <div className="flex items-center gap-2.5">
                        <span className="px-3.5 py-1 bg-[#fed330] text-[#1e1c10] rounded-full text-xs font-extrabold shadow-sm">
                          {activeMonthData?.month}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-white">
                          สินทรัพย์ที่จ่ายปันผลในรอบนี้ ({assetsList.length} รายการ)
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-[#747878] dark:text-[#a8a497]">
                        ยอดสุทธิรอบนี้: <span className="font-extrabold font-mono text-base sm:text-lg text-[#065f46] dark:text-emerald-400">฿{fmt(Math.round(activeAmount))}</span>
                      </div>
                    </div>

                    {/* Assets in 2-Column Responsive Grid */}
                    <div className="pt-3">
                      {assetsList.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {assetsList.map((asset: any) => {
                            const pnlAsset = state.myPnlData?.assets?.find((pa: any) => pa.id === asset.symbol);
                            const tickerCls = TICKER_STYLE[pnlAsset?.category] || defaultTicker;
                            return (
                              <div
                                key={asset.symbol}
                                className="bg-white dark:bg-[#201f1a] hover:bg-white dark:hover:bg-[#24221c] transition-all border border-[#e0dac7] dark:border-[#423e35] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className={`w-9 h-9 rounded-full ${tickerCls} flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm`}>
                                    {(asset.symbol || '?').slice(0, 4)}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] truncate">
                                      {asset.symbol}
                                    </div>
                                    <div className="text-[10px] text-[#747878] dark:text-[#a8a497] truncate max-w-[130px]" title={pnlAsset?.name || ''}>
                                      {pnlAsset?.name || 'หุ้น/สินทรัพย์'}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-xs sm:text-sm font-black font-mono text-[#065f46] dark:text-emerald-400">
                                    ฿{fmt(Math.round(asset.amount))}
                                  </div>
                                  <div className="text-[9px] text-[#747878] dark:text-[#a8a497]">
                                    หักภาษี 10% แล้ว
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-12 text-center text-[#747878] dark:text-[#a8a497]">
                          <i className="fi fi-sr-calendar-slash text-3xl mb-2 opacity-50 block"></i>
                          <div className="text-xs sm:text-sm font-semibold">รอบเดือน {activeMonthData?.month} ไม่มีสินทรัพย์ที่มีรอบการจ่ายปันผล</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-[#747878] dark:text-[#a8a497] flex items-center gap-1.5 pt-2 border-t border-[#f0e9d6] dark:border-[#35332b]">
                    <i className="fi fi-sr-check-circle text-emerald-600 text-xs"></i>
                    <span>คำนวณตามสัดส่วนการถือครองจริงของ My Portfolio หลังหักภาษี ณ ที่จ่าย 10% เรียบร้อยแล้ว</span>
                  </div>
                </div>

              </div>
            );
          })()
        ) : (
          <div className="text-center py-10 text-[#747878] dark:text-[#a8a497]">
            <i className="fi fi-sr-calendar-slash text-3xl mb-2 opacity-50 block"></i>
            <div className="text-sm font-semibold">ไม่มีข้อมูลเงินปันผลสำหรับพอร์ตนี้ (กรุณาเลือกหุ้นที่มีปันผล)</div>
          </div>
        )}
      </div>

      {/* ── Dividend Goal — Integrated Header & Full-Width Comparison (Zero Empty Space) ── */}
      <div className="bg-white dark:bg-[#201f1a] rounded-[32px] border border-[#e0dac7] dark:border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-card)] p-6 sm:p-7 space-y-6">
        
        {/* Integrated Control Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#f0e9d6] dark:border-[#35332b]">
          <div>
            <div className="font-bold text-base sm:text-lg text-[#1e1c10] dark:text-white flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#faf3e0] dark:bg-[#282620] text-[#1e1c10] dark:text-[#fed330] flex items-center justify-center text-xs shadow-sm">
                <i className="fi fi-sr-bullseye-arrow"></i>
              </div>
              <span>เป้าหมายปันผล (สุทธิ)</span>
              <InfoTooltip title="การคำนวณเป้าหมายเงินปันผล" position="bottom" align="left">
                คำนวณเงินต้นทั้งหมดที่ต้องมี เพื่อสร้างกระแสเงินสดปันผลสุทธิหลังหักภาษี 10% ให้ได้ตามเป้าหมายต่อปีที่คุณกำหนด
              </InfoTooltip>
            </div>
            <div className="text-xs sm:text-sm text-[#747878] dark:text-[#a8a497] mt-0.5">
              คำนวณเงินต้นที่ต้องมีเพื่อรับเงินปันผลตามเป้าหมาย (หักภาษี 10% แล้ว)
            </div>
          </div>

          {/* Goal Input & Quick Chips (Directly in header, zero blank space!) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px] sm:min-w-[220px]">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747878] dark:text-[#a8a497] font-bold text-xs">฿</span>
              <input
                className="w-full bg-[#faf3e0] dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-full py-2 pl-8 pr-14 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-[#fed330] text-[#1e1c10] dark:text-[#f5f3eb] font-mono"
                type="number"
                value={state.dividendGoal === 0 || state.dividendGoal === '' ? '' : state.dividendGoal}
                onChange={e => {
                  const val = e.target.value;
                  actions.setDividendGoal(val === '' ? '' : Number(val));
                }}
                placeholder="ระบุเป้าหมาย..."
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#747878] dark:text-[#a8a497]">
                / ปี
              </span>
            </div>

            {/* Quick preset chips */}
            <div className="flex items-center gap-1.5">
              {[10000, 20000, 50000, 100000].map(val => {
                const currentGoalVal = typeof state.dividendGoal === 'number' ? state.dividendGoal : (state.dividendGoal ? Number(state.dividendGoal) : 0);
                const isSelected = currentGoalVal === val;

                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => actions.setDividendGoal(val)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#fed330] text-[#1e1c10] border-[#fed330] shadow-xs'
                        : 'bg-[#faf3e0]/60 dark:bg-[#282620] text-[#747878] dark:text-[#a8a497] border-[#e0dac7] dark:border-[#423e35] hover:bg-[#faf3e0] dark:hover:bg-[#35332b]'
                    }`}
                  >
                    ฿{fmt(val)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Comparison Cards: My Portfolio vs AI Portfolio */}
        {(() => {
          const currentGoal = typeof state.dividendGoal === 'number' && state.dividendGoal > 0
            ? state.dividendGoal
            : (state.dividendGoal && !isNaN(Number(state.dividendGoal)) && Number(state.dividendGoal) > 0 ? Number(state.dividendGoal) : 0);
          const base = investedAmount || 0;

          if (currentGoal <= 0) {
            return (
              <div className="py-10 px-4 text-center bg-[#faf3e0]/40 dark:bg-[#282620] rounded-3xl border border-[#f0e9d6] dark:border-[#423e35] space-y-2">
                <div className="w-11 h-11 rounded-2xl bg-[#faf3e0] dark:bg-[#201f1a] text-amber-600 flex items-center justify-center mx-auto text-xl shadow-xs border border-[#e0dac7]/60 dark:border-[#423e35]">
                  <i className="fi fi-sr-bullseye-arrow"></i>
                </div>
                <div className="text-sm font-bold text-[#1e1c10] dark:text-white">กรุณาระบุเป้าหมายเงินปันผล</div>
                <div className="text-xs text-[#747878] dark:text-[#a8a497] max-w-md mx-auto">
                  พิมพ์จำนวนเงินปันผลต่อปีที่ต้องการ หรือกดเลือกจำนวนเงินจากปุ่มด้านบน เพื่อคำนวณเงินต้นที่ต้องมี
                </div>
              </div>
            );
          }

          const renderGoalCard = (yieldRate: number, title: string, barColor: string, isAi = false) => {
            const required = yieldRate > 0 ? currentGoal / (yieldRate * 0.9) : 0;
            const progress = required > 0 ? Math.min(100, Math.round((base / required) * 100)) : 0;
            const shortfall = Math.max(0, required - base);
            const yieldPct = (yieldRate * 100).toFixed(2);

            return (
              <div className="bg-[#faf3e0]/60 dark:bg-[#282620] border border-[#e0dac7] dark:border-[#423e35] rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-[var(--shadow-sm)]">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#f0e9d6] dark:border-[#35332b]">
                    <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-[#1e1c10] dark:text-white">
                      <span className={`w-3 h-3 rounded-full ${isAi ? 'bg-[#8b5cf6]' : 'bg-[#fed330] border border-[#e0dac7] dark:border-transparent'}`}></span>
                      <span>{title}</span>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-white dark:bg-[#201f1a] text-[#1e1c10] dark:text-white rounded-full border border-[#e0dac7] dark:border-[#423e35] shadow-xs">
                      Yield {yieldPct}% / ปี
                    </span>
                  </div>

                  {yieldRate > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3.5">
                      <div className="p-3.5 bg-white dark:bg-[#201f1a] rounded-2xl border border-[#e0dac7] dark:border-[#423e35] flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-[#747878] dark:text-[#a8a497]">เงินต้นที่ต้องมี</span>
                        <span className="text-lg sm:text-xl font-extrabold font-mono text-[#1e1c10] dark:text-gray-100 mt-1">
                          ฿{fmt(required)}
                        </span>
                        <span className="text-[10px] text-[#747878] dark:text-[#a8a497] mt-0.5">เพื่อให้ได้ ฿{fmt(currentGoal)}/ปี</span>
                      </div>

                      <div className="p-3.5 bg-white dark:bg-[#201f1a] rounded-2xl border border-[#e0dac7] dark:border-[#423e35] flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-[#747878] dark:text-[#a8a497]">เงินต้นที่ยังขาดอีก</span>
                        <div className="mt-1">
                          {shortfall > 0 ? (
                            <span className="text-lg sm:text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
                              ฿{fmt(shortfall)}
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                              ถึงเป้าหมายแล้ว! 🎉
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#747878] dark:text-[#a8a497] mt-0.5">เงินลงทุนปัจจุบัน: ฿{fmt(base)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs sm:text-sm text-[#747878] dark:text-[#a8a497]">ยังไม่มีสินทรัพย์ในพอร์ต</div>
                  )}
                </div>

                {yieldRate > 0 && (
                  <div className="pt-2 border-t border-[#f0e9d6] dark:border-[#35332b] space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-[#747878] dark:text-[#a8a497]">ความสำเร็จสู่เป้าหมาย:</span>
                      <span className="text-[#1e1c10] dark:text-white font-mono">{progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-[#e0dac7]/70 dark:bg-[#35332b] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 rounded-full ${barColor}`}
                        style={{ width: `${Math.max(progress, progress > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          };

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {renderGoalCard(myWeightedYield / 100, 'My Portfolio', 'bg-[#1e1c10] dark:bg-white')}
              {renderGoalCard(aiWeightedYield / 100, 'AI Portfolio', 'bg-[#8b5cf6]', true)}
            </div>
          );
        })()}

      </div>

    </div>
  );
}
