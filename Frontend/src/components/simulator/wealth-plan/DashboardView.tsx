import React from 'react';

interface DashboardViewProps {
  state: any;
  actions: any;
}

export default function DashboardView({ state, actions }: DashboardViewProps) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

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
      colorClass: 'text-blue-500',
      bgClass: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      label: 'มูลค่าพอร์ตปัจจุบัน',
      icon: 'fi-sr-chart-pie-alt',
      value: `฿${fmt(p)}`,
      sub: '',
      colorClass: 'text-emerald-500',
      bgClass: 'bg-emerald-50 dark:bg-emerald-900/20'
    },
    {
      label: 'กำไร / ขาดทุน',
      icon: 'fi-sr-chart-histogram',
      value: `${pnl >= 0 ? '+' : ''}฿${fmt(Math.abs(pnl))}`,
      sub: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`,
      colorClass: pnl >= 0 ? 'text-emerald-500' : 'text-red-500',
      bgClass: pnl >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
    },
    {
      label: 'มูลค่าเงินฝาก (ณ วันเกษียณ)',
      icon: 'fi-sr-bank',
      value: `฿${fmt(bankBalance)}`,
      sub: '',
      colorClass: 'text-purple-500',
      bgClass: 'bg-purple-50 dark:bg-purple-900/20',
      extra: (
        <div className="w-full">
          <select 
            className="w-full bg-white/50 dark:bg-gray-800/50 border border-[var(--border)] rounded-lg text-xs text-gray-600 dark:text-gray-400 py-1.5 px-2 outline-none font-bold"
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

  const n = state.timeline || state.investmentYears || 10;
  const myCagr = Math.min(state.myPnlData?.portfolioWeightedCAGR || 0, 20);
  const myDivYield = Math.min(myWeightedYield || 0, 15);
  const myTotalReturnRate = (myCagr + myDivYield) / 100;

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-sub)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white m-0 pb-1">
            Portfolio <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Dashboard</span>
          </h1>
          <p className="text-[14px] text-gray-500 m-0">
            ภาพรวมการลงทุน, การเติบโต และปันผลสะสม
          </p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button 
            className="px-6 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
            onClick={() => actions.setPage(0)}
          >
            <span className="w-5 h-5 inline-flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-full mr-2 text-[10px]">1</span>
            Wealth Plan
          </button>
          <button className="px-6 py-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm text-sm font-bold text-blue-600 transition-all">
            <span className="w-5 h-5 inline-flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mr-2 text-[10px]">2</span>
            Dashboard
          </button>
        </div>
      </div>

      {/* S1: KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-[var(--bg-main)] p-5 rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${c.bgClass} opacity-50 blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">
              <div className={`w-8 h-8 rounded-full ${c.bgClass} ${c.colorClass} flex items-center justify-center text-lg shrink-0`}>
                <i className={`fi ${c.icon}`}></i>
              </div>
              <span className="truncate">{c.label}</span>
            </div>
            
            <div className="relative z-10 flex-1 mb-1">
              <div className={`text-3xl font-extrabold font-mono ${c.colorClass}`}>{c.value}</div>
              {c.sub && (
                <div className={`text-sm font-bold ${c.colorClass} mt-0.5`}>{c.sub}</div>
              )}
            </div>

            {c.extra && (
              <div className="relative z-20 mt-1">
                {c.extra}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* S2: My Portfolio Detailed View */}
        <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <div className="font-bold text-lg flex items-center gap-2">
              <i className="fi fi-sr-briefcase text-blue-600"></i> My Portfolio Details
            </div>
            <button
              onClick={() => { actions.setPortfolioModalTab('my'); actions.setShowPortfolioModal(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm shadow-blue-500/20"
            >
              <i className="fi fi-rr-plus"></i> ปรับพอร์ต
            </button>
          </div>
          
          <div className="p-0 flex-1 overflow-x-auto">
            {state.myPortfolio.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-16 opacity-70">
                <i className="fi fi-sr-box-open text-4xl mb-3"></i>
                <div className="text-sm">ยังไม่มีสินทรัพย์ — กดปรับพอร์ตเพื่อเพิ่มสินทรัพย์</div>
              </div>
            ) : state.myPnlLoading ? (
              <div className="flex flex-col items-center justify-center text-blue-500 py-16">
                <i className="fi fi-sr-spinner animate-spin text-4xl mb-3"></i>
                <div className="text-sm font-bold">กำลังเชื่อมต่อราคาตลาดสด...</div>
              </div>
            ) : state.myPnlData && state.myPnlData.assets ? (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-bold border-b border-[var(--border)]">สินทรัพย์</th>
                    <th className="p-4 font-bold border-b border-[var(--border)] text-right">จำนวน</th>
                    <th className="p-4 font-bold border-b border-[var(--border)] text-right">ต้นทุนเฉลี่ย</th>
                    <th className="p-4 font-bold border-b border-[var(--border)] text-right">ราคาปัจจุบัน</th>
                    <th className="p-4 font-bold border-b border-[var(--border)] text-right">มูลค่ารวม</th>
                    <th className="p-4 font-bold border-b border-[var(--border)] text-right">กำไร/ขาดทุน</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-[var(--border)]">
                  {state.myPnlData.assets.map((a: any) => {
                    const plColor = a.profitLoss >= 0 ? 'text-emerald-500' : 'text-red-500';
                    const dayColor = (a.oneDayChangePct || 0) >= 0 ? 'text-emerald-500' : 'text-red-500';
                    const isUsd = a.currency === 'USD';
                    const costDisplay = isUsd ? `$${a.costPriceRaw?.toFixed(2)}` : `฿${a.costPrice?.toFixed(2)}`;
                    const curDisplay = isUsd ? `$${a.currentPriceRaw?.toFixed(2)}` : `฿${a.currentPrice?.toFixed(2)}`;

                    return (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-900 dark:text-gray-100">{a.id}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]" title={a.name}>{a.name}</div>
                        </td>
                        <td className="p-4 text-right font-mono font-semibold text-gray-700 dark:text-gray-300">
                          {a.shares > 0 ? a.shares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '-'}
                        </td>
                        <td className="p-4 text-right font-mono text-gray-600 dark:text-gray-400">
                          {costDisplay}
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-mono font-bold text-gray-900 dark:text-gray-100">{curDisplay}</div>
                          <div className={`text-[10px] font-bold ${dayColor} mt-0.5`}>
                            {(a.oneDayChangePct || 0) >= 0 ? '↗' : '↘'} {(a.oneDayChangePct || 0) >= 0 ? '+' : ''}{(a.oneDayChangePct || 0).toFixed(2)}%
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-gray-900 dark:text-gray-100">
                          ฿{fmt(a.currentValue)}
                        </td>
                        <td className="p-4 text-right">
                          <div className={`font-mono font-bold ${plColor}`}>
                            {a.profitLoss >= 0 ? '+' : ''}฿{fmt(Math.abs(a.profitLoss))}
                          </div>
                          <div className={`text-[10px] font-bold ${plColor} mt-0.5`}>
                            ({a.profitLossPct >= 0 ? '+' : ''}{a.profitLossPct.toFixed(2)}%)
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-16 opacity-70">
                <i className="fi fi-sr-calendar text-4xl mb-3"></i>
                <div className="text-sm">เพิ่มวันที่ซื้อ (Buy Date) ในพอร์ตเพื่อดู P&L สด</div>
              </div>
            )}
          </div>
        </div>

        {/* S3: AI Portfolio */}
        <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-purple-50/50 dark:bg-purple-900/10">
            <div className="font-bold text-lg flex items-center gap-2">
              <i className="fi fi-sr-sparkles text-purple-600"></i> AI Recommendation Strategy
            </div>
            <button
              onClick={() => { actions.setPortfolioModalTab('ai'); actions.setShowPortfolioModal(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 transition-opacity shadow-sm shadow-purple-500/30"
            >
              <i className="fi fi-rr-plus"></i> ขอคำแนะนำ
            </button>
          </div>
          
          <div className="p-5">
            {state.aiPortfolio.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-400 py-10 opacity-70">
                <i className="fi fi-sr-robot text-4xl mb-3"></i>
                <div className="text-sm">ยังไม่มีข้อมูล — ขอคำแนะนำจาก AI</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30">
                    <div className="flex-1 min-w-[30%]">
                      <div className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Expected Yield</div>
                      <div className="text-base font-bold text-purple-600">{aiWeightedYield.toFixed(2)}%</div>
                    </div>
                    <div className="flex-1 min-w-[30%] border-l border-purple-200 dark:border-purple-800 pl-4">
                      <div className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Risk Profile</div>
                      <div className="text-base font-bold text-purple-600">{aiRisk}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    AI แนะนำให้กระจายความเสี่ยงไปในสินทรัพย์ที่สอดคล้องกับเป้าหมายและระยะเวลาลงทุนของคุณ เพื่อรับผลตอบแทนที่มั่นคง
                  </div>
                </div>
                
                <div className="space-y-3">
                  {state.aiPortfolio.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-300 w-24 truncate" title={item.name}>{item.name}</div>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${Math.max(item.allocation, 2)}%` }}></div>
                      </div>
                      <div className="text-xs font-mono font-bold text-gray-500 w-10 text-right">{item.allocation}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* S4: Dividend Accumulation */}
        <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="font-bold text-lg flex items-center gap-2">
              <i className="fi fi-sr-coins text-yellow-500"></i> ปันผลสะสม N ปี
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">ระยะเวลา (ปี):</span>
              <input
                type="number" min={1} max={40}
                value={state.investmentYears}
                onChange={e => actions.setInvestmentYears(Number(e.target.value))}
                className="w-16 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm font-bold text-center outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const base = investmentAmount || 0;
              const yearsToShow = Array.from(new Set([1, 3, 5, 10, state.investmentYears].filter(y => y > 0).sort((a, b) => a - b)));
              
              const renderCol = (yieldRate: number, title: string, colorClass: string, bgClass: string, isAi = false) => (
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 font-bold mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <span className={`w-3 h-3 rounded-full ${bgClass} ${isAi ? 'border-2 border-purple-500' : 'border-2 border-blue-500'}`}></span>
                    {title}
                  </div>
                  {base > 0 && yieldRate > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">ปันผลก่อนภาษี</span>
                        <span className="font-bold font-mono">฿{fmt(base * yieldRate)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">ปันผลสุทธิ (หัก 10%)</span>
                        <span className={`font-bold font-mono ${colorClass}`}>฿{fmt(base * yieldRate * 0.9)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        {yearsToShow.map(y => (
                          <div key={y} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 text-center border border-gray-100 dark:border-gray-700">
                            <div className="text-[10px] font-bold text-gray-500 mb-0.5">ปีที่ {y}</div>
                            <div className={`text-sm font-extrabold font-mono ${colorClass}`}>฿{fmt(base * yieldRate * 0.9 * y)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-gray-400">ยังไม่มีข้อมูล</div>
                  )}
                </div>
              );

              return (
                <>
                  {renderCol(myWeightedYield / 100, 'My Portfolio', 'text-blue-600', 'bg-blue-500')}
                  {renderCol(aiWeightedYield / 100, 'AI Portfolio', 'text-purple-600', 'bg-purple-500', true)}
                </>
              );
            })()}
          </div>
        </div>

        {/* S6: Dividend Goal */}
        <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden p-6">
          <div className="font-bold text-lg flex items-center gap-2 mb-6">
            <i className="fi fi-sr-chart-pie text-emerald-500"></i> เป้าหมายปันผล (สุทธิ)
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1.5">เป้าหมายปันผลสุทธิ/ปี (บาท)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">฿</span>
              <input 
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-base font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                type="number" 
                value={state.dividendGoal === 0 ? '' : state.dividendGoal} 
                onChange={e => actions.setDividendGoal(e.target.value === '' ? 0 : Number(e.target.value))} 
                placeholder="120,000"
              />
            </div>
          </div>

          {state.dividendGoal > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const base = investmentAmount || 0;
                const renderGoalCard = (yieldRate: number, title: string, colorClass: string, bgClass: string, hexColor: string) => {
                  const required = yieldRate > 0 ? state.dividendGoal / (yieldRate * 0.9) : 0;
                  const currentDiv = base * yieldRate * 0.9;
                  const progress = required > 0 ? Math.min(100, Math.round((base / required) * 100)) : 0;
                  const shortfall = Math.max(0, required - base);
                  
                  return (
                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 font-bold mb-4 pb-2 border-b border-gray-100 dark:border-gray-700 text-sm">
                        <span className={`w-3 h-3 rounded-full ${bgClass}`}></span>
                        {title}
                      </div>
                      {yieldRate > 0 ? (
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">เงินต้นที่ต้องมี</span>
                            <span className="font-bold font-mono">฿{fmt(required)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">ขาดอีก</span>
                            {shortfall > 0 
                              ? <span className="font-bold font-mono text-red-500">฿{fmt(shortfall)}</span>
                              : <span className="font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-xs">ถึงเป้าแล้ว! 🎉</span>
                            }
                          </div>
                          <div className="mt-4 pt-2">
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-gray-500">ความสำเร็จ</span>
                              <span className={colorClass}>{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: hexColor }}></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-xs text-gray-400">ยังไม่มีข้อมูล</div>
                      )}
                    </div>
                  );
                };

                return (
                  <>
                    {renderGoalCard(myWeightedYield / 100, 'My Portfolio', 'text-blue-600', 'bg-blue-500', '#3b82f6')}
                    {renderGoalCard(aiWeightedYield / 100, 'AI Portfolio', 'text-purple-600', 'bg-purple-500', '#8b5cf6')}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      
      {/* S4: Dividend Calendar */}
      <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-[var(--border)] bg-gray-50 dark:bg-gray-900/50">
          <div className="font-bold text-lg flex items-center gap-2 mb-1">
            <i className="fi fi-sr-calendar-lines text-blue-500"></i> ปฏิทินรับเงินปันผลรายเดือน (หลังหักภาษี 10%)
          </div>
          <div className="text-sm text-gray-500">
            แสดงการคาดการณ์ปันผลจริงของ My Portfolio จากข้อมูลตลาด (Yahoo Finance)
          </div>
        </div>
        
        <div className="p-6">
          {state.myPnlLoading ? (
            <div className="text-center py-12 text-blue-500">
              <i className="fi fi-sr-spinner animate-spin text-3xl mb-3"></i>
              <div className="text-sm font-bold">กำลังประมวลผลปฏิทินปันผล...</div>
            </div>
          ) : state.myDivCalendar && state.myDivCalendar.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 rounded-lg">
              {state.myDivCalendar.map((d: any) => (
                <div key={d.monthIndex} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 min-w-[260px] flex-shrink-0 snap-start shadow-sm flex flex-col h-full">
                  <div className="text-sm font-extrabold text-gray-500 uppercase tracking-widest mb-3">{d.month}</div>
                  <div className="text-2xl font-extrabold font-mono text-emerald-500 mb-5">฿{fmt(Math.round(d.amount))}</div>
                  <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4 flex-1">
                    {Array.isArray(d.assets) ? d.assets.map((asset: any) => (
                      <div key={asset.symbol} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50 text-xs">
                        <span className="font-bold text-gray-800 dark:text-gray-200">{asset.symbol}</span>
                        <span className="font-mono text-gray-600 dark:text-gray-400 font-bold">฿{fmt(Math.round(asset.amount))}</span>
                      </div>
                    )) : (
                      <div className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">จาก: {d.assets}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <i className="fi fi-sr-calendar-slash text-4xl mb-3 opacity-50"></i>
              <div className="text-sm">ไม่มีข้อมูลเงินปันผลสำหรับพอร์ตนี้ (กรุณาเลือกหุ้นที่มีปันผล)</div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
