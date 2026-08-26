import React, { useState, useEffect } from 'react';

interface DashboardViewProps {
  state: any;
  actions: any;
}

export default function DashboardView({ state, actions }: DashboardViewProps) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

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
    
  const investmentAmount = state.initialInvestment;

  const pnl = state.myPnlData ? state.myPnlData.totalProfitLoss : 0;
  const pnlPct = state.myPnlData ? (state.myPnlData.totalProfitLossPct || 0) : 0;
  const bankBalance = state.projectedBankBalance || 0;
  const p = state.myPnlData ? (state.myPnlData.totalInvested + state.myPnlData.totalProfitLoss) : investmentAmount;

  const cards = [
    {
      label: 'เงินลงทุนรวม',
      icon: 'fi-sr-wallet',
      value: investmentAmount > 0 ? `฿${fmt(investmentAmount)}` : '฿0',
      sub: '',
      colorClass: 'text-[var(--accent-blue)]',
      bgClass: 'bg-[var(--bg-sub)]'
    },
    {
      label: 'มูลค่าพอร์ตปัจจุบัน',
      icon: 'fi-sr-chart-pie-alt',
      value: `฿${fmt(p)}`,
      sub: '',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/30'
    },
    {
      label: 'กำไร / ขาดทุน',
      icon: 'fi-sr-chart-histogram',
      value: `${pnl >= 0 ? '+' : ''}฿${fmt(Math.abs(pnl))}`,
      sub: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`,
      colorClass: pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      bgClass: pnl >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30'
    },
    {
      label: 'มูลค่าเงินฝาก (ณ วันเกษียณ)',
      icon: 'fi-sr-bank',
      value: `฿${fmt(bankBalance)}`,
      sub: `(เกษียณในอีก ${state.retirementYears || 10} ปี)`,
      colorClass: 'text-[#8b5cf6] dark:text-[#a78bfa]',
      bgClass: 'bg-[#f3e8ff] dark:bg-purple-950/30',
      extra: (
        <div className="w-full mt-1.5">
          <select 
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm text-gray-700 dark:text-gray-300 py-2 px-2.5 outline-none font-bold"
            value={state.selectedBank}
            onChange={(e) => actions.setSelectedBank(e.target.value)}
          >
            {Object.entries(state.bankTiers || {}).map(([key, bank]: any) => (
              <option key={key} value={key}>{bank.name}</option>
            ))}
          </select>
        </div>
      )
    },
  ];

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header & Sub-tab Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-1">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1e1c10] dark:text-white tracking-tight m-0 pb-1 flex items-center gap-2">
            Portfolio <span className="font-medium text-[#747878] dark:text-gray-400">Dashboard</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 m-0">
            ภาพรวมการลงทุน การเติบโตของพอร์ต และการคาดการณ์ปันผลสะสม
          </p>
        </div>
        <div className="flex w-full sm:w-auto bg-[#f4eedb] dark:bg-gray-800 p-1.5 rounded-full border border-[#e0dac7] dark:border-gray-700">
          <button 
            className="flex-1 sm:flex-initial px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold text-[#747878] hover:text-[#1e1c10] bg-transparent border-0 cursor-pointer transition-all flex items-center justify-center gap-2"
            onClick={() => actions.setPage(0)}
          >
            Wealth Plan
          </button>
          <button className="flex-1 sm:flex-initial px-5 sm:px-6 py-2 rounded-full bg-[#fed330] text-[#1e1c10] font-bold shadow-sm border-0 cursor-pointer transition-all flex items-center justify-center gap-2">
            Dashboard
          </button>
        </div>
      </div>

      {/* S1: KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-[var(--bg-main)] p-5 sm:p-6 rounded-[var(--r)] border-[1.5px] border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col justify-start relative overflow-hidden transition-all hover:border-gray-300 dark:hover:border-gray-700 min-h-[160px]">
            <div className="flex items-center gap-2.5 text-sm font-bold text-[var(--text-muted)] mb-2">
              <div className={`w-9 h-9 rounded-xl ${c.bgClass} ${c.colorClass} flex items-center justify-center text-base shrink-0`}>
                <i className={`fi ${c.icon}`}></i>
              </div>
              <span className="truncate">{c.label}</span>
            </div>
            
            <div>
              <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${c.colorClass}`}>{c.value}</div>
              {c.sub ? (
                <div className={`text-sm font-bold ${c.colorClass} mt-0.5`}>{c.sub}</div>
              ) : (
                <div className="text-sm opacity-0 mt-0.5 pointer-events-none select-none">-</div>
              )}
            </div>

            {c.extra && (
              <div className="mt-auto pt-2">
                {c.extra}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* S2: My Portfolio Detailed View */}
        <div className="bg-[var(--bg-main)] rounded-[var(--r)] border-[1.5px] border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/60 dark:bg-gray-900/40">
            <div className="font-bold text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2.5">
              <i className="fi fi-sr-briefcase text-[var(--accent-blue)]"></i> My Portfolio Details
            </div>
            <button
              onClick={() => { actions.setPortfolioModalTab('my'); actions.setShowPortfolioModal(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold border border-[var(--accent-blue)] text-[var(--accent-blue)] hover:bg-[var(--bg-hover)] transition-all shadow-sm"
            >
              <i className="fi fi-rr-plus text-xs"></i> ปรับพอร์ต
            </button>
          </div>
          
          <div className="p-0 flex-1 overflow-x-auto">
            {state.myPortfolio.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] py-16 opacity-70">
                <i className="fi fi-sr-box-open text-4xl mb-3"></i>
                <div className="text-sm sm:text-base font-semibold">ยังไม่มีสินทรัพย์ — กดปรับพอร์ตเพื่อเพิ่มสินทรัพย์</div>
              </div>
            ) : state.myPnlLoading ? (
              <div className="flex flex-col items-center justify-center text-[var(--accent-blue)] py-16">
                <i className="fi fi-sr-spinner animate-spin text-4xl mb-3"></i>
                <div className="text-sm sm:text-base font-bold">กำลังเชื่อมต่อราคาตลาดสด...</div>
              </div>
            ) : state.myPnlData && state.myPnlData.assets ? (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 text-xs sm:text-sm uppercase tracking-wider font-bold">
                    <th className="p-4 border-b border-[var(--border)]">สินทรัพย์</th>
                    <th className="p-4 border-b border-[var(--border)] text-right">จำนวน</th>
                    <th className="p-4 border-b border-[var(--border)] text-right">ต้นทุนเฉลี่ย</th>
                    <th className="p-4 border-b border-[var(--border)] text-right">ราคาปัจจุบัน</th>
                    <th className="p-4 border-b border-[var(--border)] text-right">มูลค่ารวม</th>
                    <th className="p-4 border-b border-[var(--border)] text-right">กำไร/ขาดทุน</th>
                  </tr>
                </thead>
                <tbody className="text-sm sm:text-base divide-y divide-gray-100 dark:divide-gray-800">
                  {state.myPnlData.assets.map((a: any) => {
                    const plColor = a.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
                    const dayColor = (a.oneDayChangePct || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
                    const isUsd = a.currency === 'USD';
                    const costDisplay = `฿${(a.costPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    const curDisplay = `฿${(a.currentPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                    return (
                      <tr key={a.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base">{a.id}</div>
                          <div className="text-xs sm:text-sm text-gray-500 truncate max-w-[220px]" title={a.name}>{a.name}</div>
                        </td>
                        <td className="p-4 text-right font-mono font-semibold text-gray-700 dark:text-gray-300">
                          {a.shares > 0 ? a.shares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '-'}
                        </td>
                        <td className="p-4 text-right font-mono text-gray-900 dark:text-gray-100 font-bold">
                          {costDisplay}
                          {isUsd && a.costPriceRaw > 0 && (
                            <div className="text-[11px] font-normal text-[var(--text-muted)]">
                              ${a.costPriceRaw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-mono font-bold text-gray-900 dark:text-gray-100">{curDisplay}</div>
                          <div className={`text-xs font-bold ${dayColor} mt-0.5`}>
                            {(a.oneDayChangePct || 0) >= 0 ? '↗' : '↘'} {(a.oneDayChangePct || 0) >= 0 ? '+' : ''}{(a.oneDayChangePct || 0).toFixed(2)}%
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-gray-900 dark:text-gray-100">
                          ฿{(a.currentValue || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-4 text-right">
                          <div className={`font-mono font-bold ${plColor}`}>
                            {a.profitLoss >= 0 ? '+' : ''}฿{Math.abs(a.profitLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                          <div className={`text-xs font-bold ${plColor} mt-0.5`}>
                            ({a.profitLossPct >= 0 ? '+' : ''}{(a.profitLossPct || 0).toFixed(2)}%)
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] py-16 opacity-70">
                <i className="fi fi-sr-calendar text-4xl mb-3"></i>
                <div className="text-sm sm:text-base">เพิ่มวันที่ซื้อ (Buy Date) ในพอร์ตเพื่อดู P&L สด</div>
              </div>
            )}
          </div>
        </div>

        {/* S3: AI Recommendation Strategy */}
        <div className="bg-[var(--bg-main)] rounded-[var(--r)] border-[1.5px] border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/60 dark:bg-gray-900/40">
            <div className="font-bold text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2.5">
              <i className="fi fi-sr-sparkles text-[#8b5cf6]"></i> AI Recommendation Strategy
            </div>
            <button
              onClick={() => { actions.setPortfolioModalTab('ai'); actions.setShowPortfolioModal(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold bg-[#1e1c10] hover:bg-black text-white transition-all shadow-sm"
            >
              <i className="fi fi-rr-plus text-xs"></i> ขอคำแนะนำ
            </button>
          </div>
          
          <div className="p-5 sm:p-6">
            {state.aiPortfolio.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-[var(--text-muted)] py-10 opacity-70">
                <i className="fi fi-sr-robot text-4xl mb-3"></i>
                <div className="text-sm sm:text-base">ยังไม่มีข้อมูล — ขอคำแนะนำจาก AI</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Overall Portfolio Return & Risk Summary */}
                <div className="lg:col-span-5 space-y-4">
                  {(() => {
                    const aiAnnualProfit = (investmentAmount || 0) * (aiWeightedYield / 100);
                    const aiAccumulatedProfit = aiAnnualProfit * (state.investmentYears || 10);

                    return (
                      <div className="grid grid-cols-2 gap-3.5 p-4 sm:p-5 bg-[#f3e8ff]/60 dark:bg-purple-950/20 rounded-2xl border border-[#e9d5ff] dark:border-purple-900/30">
                        <div>
                          <div className="text-xs uppercase font-bold text-gray-500 mb-0.5">Expected Yield</div>
                          <div className="text-2xl font-extrabold font-mono text-[#8b5cf6] dark:text-[#a78bfa]">
                            {aiWeightedYield.toFixed(2)}%<span className="text-xs sm:text-sm font-normal text-gray-500">/ปี</span>
                          </div>
                        </div>
                        <div className="border-l border-[#e9d5ff] dark:border-purple-900/40 pl-3.5">
                          <div className="text-xs uppercase font-bold text-gray-500 mb-0.5">Risk Profile</div>
                          <div className="text-lg font-bold text-[#7c3aed] dark:text-[#c4b5fd]">{aiRisk}</div>
                        </div>
                        {investmentAmount > 0 && (
                          <>
                            <div className="pt-3 border-t border-[#e9d5ff] dark:border-purple-900/30">
                              <div className="text-xs uppercase font-bold text-gray-500 mb-0.5">คาดการณ์กำไร/ปี</div>
                              <div className="text-lg sm:text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                                +฿{fmt(aiAnnualProfit)}
                              </div>
                            </div>
                            <div className="pt-3 border-t border-[#e9d5ff] dark:border-purple-900/30 border-l border-[#e9d5ff] dark:border-purple-900/40 pl-3.5">
                              <div className="text-xs uppercase font-bold text-gray-500 mb-0.5">กำไรสะสม {state.investmentYears || 10} ปี</div>
                              <div className="text-lg sm:text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                                +฿{fmt(aiAccumulatedProfit)}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  <div className="text-sm text-[var(--text-muted)] leading-relaxed">
                    AI แนะนำให้กระจายความเสี่ยงไปในสินทรัพย์ที่สอดคล้องกับเป้าหมายและระยะเวลาลงทุนของคุณ เพื่อรับผลตอบแทนรวมเฉลี่ย <strong>{aiWeightedYield.toFixed(2)}% ต่อปี</strong>
                    {investmentAmount > 0 && (
                      <span className="block mt-1.5 font-semibold text-[#8b5cf6] dark:text-[#a78bfa]">
                        (คำนวณจากเงินลงทุน ฿{fmt(investmentAmount)})
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Right: Individual Asset Allocation & Profit Forecast */}
                <div className="lg:col-span-7 space-y-3.5">
                  {state.aiPortfolio.map((item: any) => {
                    const itemAllocAmount = investmentAmount > 0 ? (investmentAmount * item.allocation / 100) : 0;
                    const itemExpectedYield = item.expectedYield || 0;
                    const itemProfit = itemAllocAmount * (itemExpectedYield / 100);

                    return (
                      <div 
                        key={item.id} 
                        className="p-3.5 bg-[var(--bg-sub)] dark:bg-gray-800/40 rounded-xl border border-[var(--border)] space-y-2 transition-all hover:bg-[#f3e8ff]/30 dark:hover:bg-purple-950/20"
                      >
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[180px] sm:max-w-[280px]" title={item.name}>
                              {item.name}
                            </span>
                            {item.market && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {item.market}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 font-mono text-right">
                            {investmentAmount > 0 && (
                              <span className="text-[var(--text-muted)] text-xs sm:text-sm">฿{fmt(itemAllocAmount)}</span>
                            )}
                            <span className="font-bold text-[#8b5cf6] dark:text-[#a78bfa] text-sm">
                              {item.allocation}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#8b5cf6] rounded-full transition-all duration-500" 
                            style={{ width: `${Math.max(item.allocation, 3)}%` }}
                          />
                        </div>

                        {/* Yield & Forecast Profit */}
                        <div className="flex justify-between items-center text-xs sm:text-sm pt-0.5">
                          <span className="text-gray-500">
                            Yield: <strong className="text-gray-700 dark:text-gray-300 font-mono">{itemExpectedYield.toFixed(2)}%</strong>
                          </span>
                          {investmentAmount > 0 ? (
                            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                              คาดการณ์กำไร: +฿{fmt(itemProfit)}/ปี
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-xs">
                              สัดส่วนผลตอบแทน: {(item.allocation * itemExpectedYield / 100).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* S4 & S5: Dividend Accumulation & Dividend Goal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* S4: Dividend Accumulation */}
        <div className="bg-[var(--bg-main)] rounded-[var(--r)] border-[1.5px] border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-5">
              <div className="font-bold text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fi fi-sr-coins text-amber-500"></i> ปันผลสะสมต่อปี
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-gray-500">ระยะเวลา:</span>
                <input
                  type="number" min={1} max={40}
                  value={state.investmentYears}
                  onChange={e => actions.setInvestmentYears(Number(e.target.value))}
                  className="w-16 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-sm font-bold text-center outline-none focus:border-blue-500"
                />
                <span className="text-gray-500">ปี</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(() => {
                const base = investmentAmount || 0;
                const monthlyDca = state.monthlyInvestment || 0;
                const yearsToShow = Array.from(new Set([1, 3, 5, 10, state.investmentYears].filter(y => y > 0).sort((a, b) => a - b)));
                
                const renderCol = (yieldRate: number, title: string, colorClass: string, isAi = false) => {
                  const firstYearAnnualDiv = (base + monthlyDca * 12) * yieldRate * 0.9;
                  const firstYearGrossDiv = (base + monthlyDca * 12) * yieldRate;

                  // Calculate accumulated dividend with monthly DCA
                  const calcAccumulatedDiv = (years: number) => {
                    let cap = base;
                    let totalDiv = 0;
                    for (let m = 1; m <= years * 12; m++) {
                      cap += monthlyDca;
                      totalDiv += (cap * yieldRate * 0.9) / 12;
                    }
                    return totalDiv;
                  };

                  return (
                    <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200/60 dark:border-gray-700/60 text-sm">
                        <div className="flex items-center gap-2 font-bold">
                          <span className={`w-2.5 h-2.5 rounded-full ${isAi ? 'bg-[#8b5cf6]' : 'bg-blue-500'}`}></span>
                          <span>{title}</span>
                        </div>
                        {monthlyDca > 0 && (
                          <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            DCA +฿{fmt(monthlyDca)}/ด.
                          </span>
                        )}
                      </div>
                      {(base > 0 || monthlyDca > 0) && yieldRate > 0 ? (
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">ปันผลปีแรก (ก่อนภาษี)</span>
                            <span className="font-bold font-mono text-gray-900 dark:text-gray-100">฿{fmt(firstYearGrossDiv)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">ปันผลสุทธิปีแรก (หัก 10%)</span>
                            <span className={`font-bold font-mono text-base ${colorClass}`}>฿{fmt(firstYearAnnualDiv)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-gray-200/60 dark:border-gray-700/60">
                            {yearsToShow.map(y => (
                              <div key={y} className="bg-white dark:bg-gray-900/60 rounded-lg p-2 text-center border border-gray-100 dark:border-gray-800">
                                <div className="text-[11px] font-bold text-[var(--text-muted)]">สะสม {y} ปี</div>
                                <div className={`text-sm font-extrabold font-mono ${colorClass}`}>฿{fmt(calcAccumulatedDiv(y))}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-sm text-[var(--text-muted)]">ยังไม่มีข้อมูล</div>
                      )}
                    </div>
                  );
                };

                return (
                  <>
                    {renderCol(myWeightedYield / 100, 'My Portfolio', 'text-[var(--accent-blue)] dark:text-blue-400')}
                    {renderCol(aiWeightedYield / 100, 'AI Portfolio', 'text-[#8b5cf6] dark:text-[#a78bfa]', true)}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* S5: Dividend Goal */}
        <div className="bg-[var(--bg-main)] rounded-[var(--r)] border-[1.5px] border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="font-bold text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <i className="fi fi-sr-chart-pie text-emerald-600"></i> เป้าหมายปันผล (สุทธิ)
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                เป้าหมายปันผลสุทธิ/ปี (บาท)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-sm">฿</span>
                <input 
                  className="w-full bg-gray-50/70 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 pl-8 pr-3 text-base font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                  type="number" 
                  value={state.dividendGoal === 0 ? '' : state.dividendGoal} 
                  onChange={e => actions.setDividendGoal(e.target.value === '' ? 0 : Number(e.target.value))} 
                  placeholder="เช่น 120000"
                />
              </div>
            </div>

            {state.dividendGoal > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(() => {
                  const base = investmentAmount || 0;
                  const renderGoalCard = (yieldRate: number, title: string, colorClass: string, isAi = false) => {
                    const required = yieldRate > 0 ? state.dividendGoal / (yieldRate * 0.9) : 0;
                    const progress = required > 0 ? Math.min(100, Math.round((base / required) * 100)) : 0;
                    const shortfall = Math.max(0, required - base);
                    
                    return (
                      <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60 rounded-xl p-4">
                        <div className="flex items-center gap-2 font-bold mb-3 pb-2 border-b border-gray-200/60 dark:border-gray-700/60 text-sm">
                          <span className={`w-2.5 h-2.5 rounded-full ${isAi ? 'bg-[#8b5cf6]' : 'bg-blue-500'}`}></span>
                          <span>{title}</span>
                        </div>
                        {yieldRate > 0 ? (
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">เงินต้นที่ต้องมี</span>
                              <span className="font-bold font-mono text-gray-900 dark:text-gray-100">฿{fmt(required)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">ขาดอีก</span>
                              {shortfall > 0 
                                ? <span className="font-bold font-mono text-rose-600 dark:text-rose-400">฿{fmt(shortfall)}</span>
                                : <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-xs">ถึงเป้าแล้ว! 🎉</span>
                              }
                            </div>
                            <div className="mt-3.5 pt-2">
                              <div className="flex justify-between text-xs sm:text-sm font-bold mb-1">
                                <span className="text-gray-500">ความสำเร็จ</span>
                                <span className={colorClass}>{progress}%</span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-700 ${isAi ? 'bg-[#8b5cf6]' : 'bg-blue-500'}`} 
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-sm text-[var(--text-muted)]">ยังไม่มีข้อมูล</div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <>
                      {renderGoalCard(myWeightedYield / 100, 'My Portfolio', 'text-[var(--accent-blue)] dark:text-blue-400')}
                      {renderGoalCard(aiWeightedYield / 100, 'AI Portfolio', 'text-[#8b5cf6] dark:text-[#a78bfa]', true)}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* S6: Dividend Calendar */}
      <div className="bg-[var(--bg-main)] rounded-[var(--r)] border-[1.5px] border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
          <div className="font-bold text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2 mb-1">
            <i className="fi fi-sr-calendar-lines text-[var(--accent-blue)]"></i> ปฏิทินรับเงินปันผลรายเดือน (หลังหักภาษี 10%)
          </div>
          <div className="text-sm text-gray-500">
            แสดงการคาดการณ์ปันผลจริงของ My Portfolio จากข้อมูลตลาดจริง (Yahoo Finance)
          </div>
        </div>
        
        <div className="p-5 sm:p-6">
          {state.myPnlLoading ? (
            <div className="text-center py-12 text-[var(--accent-blue)]">
              <i className="fi fi-sr-spinner animate-spin text-3xl mb-3"></i>
              <div className="text-base font-bold">กำลังประมวลผลปฏิทินปันผล...</div>
            </div>
          ) : state.myDivCalendar && state.myDivCalendar.length > 0 ? (
            (() => {
              const activeMonthData = state.myDivCalendar.find((d: any) => d.monthIndex === selectedMonthIndex) || state.myDivCalendar[0];

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Side: Summary Info & Month List (4 cols) */}
                  <div className="lg:col-span-4 flex flex-col gap-3 pb-3 lg:pb-0 pr-0 lg:pr-4 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800">
                    {/* Summary & Regular Rounds Info (Moved from right side) */}
                    <div className="bg-gray-50/80 dark:bg-gray-800/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 space-y-3">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider">
                          ปันผลคาดการณ์เดือน {activeMonthData.month}
                        </h4>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                          ฿{fmt(Math.round(activeMonthData.amount))}
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 bg-white dark:bg-gray-800/80 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 leading-relaxed">
                        <span className="font-bold text-gray-700 dark:text-gray-300">รอบปันผลปกติ:</span><br/>
                        • หุ้นสหรัฐฯ / REITs: มี.ค., มิ.ย., ก.ย., ธ.ค.<br/>
                        • หุ้นไทย: เม.ย., ก.ย.
                      </div>
                    </div>

                    {/* Month Buttons List */}
                    <div className="flex flex-row lg:flex-col gap-2.5 overflow-x-auto lg:overflow-x-visible snap-x pb-2 lg:pb-0">
                      {state.myDivCalendar.map((d: any) => {
                        const isActive = selectedMonthIndex === d.monthIndex;
                        return (
                          <button
                            key={d.monthIndex}
                            onClick={() => setSelectedMonthIndex(d.monthIndex)}
                            className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 sm:p-4 rounded-xl border transition-all text-left w-full min-w-[160px] lg:min-w-0 snap-start ${
                              isActive
                                ? "bg-[var(--bg-hover)] border-[var(--accent-blue)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--accent-blue)]/30"
                                : "bg-white dark:bg-gray-800/60 border-gray-100 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                          >
                            <div>
                              <div className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider mb-0.5 ${isActive ? "text-[var(--accent-blue)] dark:text-blue-400" : "text-gray-500"}`}>
                                {d.month}
                              </div>
                              <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                                ฿{fmt(Math.round(d.amount))}
                              </div>
                            </div>
                            <div className="mt-1 sm:mt-0">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                isActive ? "bg-[var(--bg-sub)] text-[var(--accent-blue)]" : "bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-[var(--text-muted)]"
                              }`}>
                                {Array.isArray(d.assets) ? `${d.assets.length} สินทรัพย์` : "0 สินทรัพย์"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Side: Detailed Breakdown (8 cols) */}
                  <div className="lg:col-span-8 flex flex-col gap-3.5">
                    {Array.isArray(activeMonthData.assets) && activeMonthData.assets.length > 0 ? (
                      activeMonthData.assets.map((asset: any) => {
                        const pnlAsset = state.myPnlData?.assets?.find((pa: any) => pa.id === asset.symbol);
                        const currentValue = pnlAsset?.currentValue || 0;
                        const yieldPct = pnlAsset?.freshDividendYield > 0 ? pnlAsset.freshDividendYield : 0;
                        const category = pnlAsset?.category || "us-stock";
                        
                        const frequency = category === 'thai-stock' ? 2 : (category === 'dr' ? 1 : 4);
                        const frequencyLabel = category === 'thai-stock' ? 'ปีละ 2 ครั้ง' : (category === 'dr' ? 'ปีละ 1 ครั้ง' : 'ปีละ 4 ครั้ง (รายไตรมาส)');
                        
                        return (
                          <div key={asset.symbol} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/70 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2.5 transition-all">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold px-3 py-1 rounded-lg text-sm mr-2 mb-1">
                                  {asset.symbol}
                                </span>
                                <div className="text-sm text-[var(--text-muted)] font-medium truncate max-w-[200px] sm:max-w-[400px]">
                                  {pnlAsset?.name || "ไม่พบชื่อสินทรัพย์"}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                                  ฿{fmt(Math.round(asset.amount))}
                                </div>
                                <span className="text-[11px] text-[var(--text-muted)]">สุทธิหลังหักภาษี 10%</span>
                              </div>
                            </div>

                            {/* Dropdown collapsible calculation box */}
                            <details className="mt-2 group">
                              <summary className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent-blue)] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer list-none select-none transition-colors py-1">
                                <i className="fi fi-rr-angle-small-down group-open:rotate-180 transition-transform text-sm"></i>
                                <span className="group-open:hidden">ดูวิธีการคำนวณเงินปันผล</span>
                                <span className="hidden group-open:inline">ซ่อนวิธีการคำนวณ</span>
                              </summary>

                              <div className="bg-gray-50/70 dark:bg-gray-900/40 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 text-xs sm:text-sm text-[var(--text-muted)] space-y-2.5 mt-2">
                                <div className="font-bold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 pb-1.5 flex items-center gap-1.5 text-xs sm:text-sm">
                                  <i className="fi fi-rr-calculator text-blue-500"></i> วิธีการคำนวณเงินปันผล:
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs sm:text-sm">
                                  <div>
                                    <div className="text-xs text-[var(--text-muted)]">มูลค่าสินทรัพย์</div>
                                    <div className="font-bold font-mono text-gray-800 dark:text-gray-200 mt-0.5">฿{fmt(Math.round(currentValue))}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-[var(--text-muted)]">อัตราปันผล (Yield)</div>
                                    <div className="font-bold font-mono text-gray-800 dark:text-gray-200 mt-0.5">{yieldPct.toFixed(2)}% ต่อปี</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-[var(--text-muted)]">ความถี่จ่ายปันผล</div>
                                    <div className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{frequencyLabel}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-[var(--text-muted)]">ภาษีหัก ณ ที่จ่าย</div>
                                    <div className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">10%</div>
                                  </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800/80 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 mt-1 font-mono text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <span className="text-[var(--text-muted)] text-xs">สูตร: (มูลค่า × Yield% × 0.9) ÷ ความถี่</span>
                                  <span className="font-bold text-gray-900 dark:text-gray-100">
                                    (฿{fmt(Math.round(currentValue))} × {yieldPct.toFixed(2)}% × 0.9) ÷ {frequency} = ฿{fmt(Math.round(asset.amount))}
                                  </span>
                                </div>
                              </div>
                            </details>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-[var(--text-muted)] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm sm:text-base">
                        ไม่มีสินทรัพย์จ่ายปันผลในเดือนนี้
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <i className="fi fi-sr-calendar-slash text-4xl mb-3 opacity-50"></i>
              <div className="text-sm sm:text-base">ไม่มีข้อมูลเงินปันผลสำหรับพอร์ตนี้ (กรุณาเลือกหุ้นที่มีปันผล)</div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

