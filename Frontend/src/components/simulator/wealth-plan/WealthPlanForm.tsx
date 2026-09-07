import React from 'react';
import InfoTooltip from '../InfoTooltip';
import { SCENARIOS, Scenario, ScenarioDef, Severity } from "./wealthPlanTypes";

interface WealthPlanFormProps {
  state: any;
  actions: any;
}

const getIcon = (name: string, sizeStr: string = '20px') => {
  if (name === 'Suitcase') return <i className="fi fi-sr-briefcase" style={{ fontSize: sizeStr }}></i>;
  if (name === 'Hospital') return <i className="fi fi-sr-hospital" style={{ fontSize: sizeStr }}></i>;
  return <i className="fi fi-sr-car" style={{ fontSize: sizeStr }}></i>;
};

export default function WealthPlanForm({ state, actions }: WealthPlanFormProps) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const scenarioDef = state.selectedScenario ? SCENARIOS[state.selectedScenario as Scenario] : null;
  const liveInflationRate = state.currentInflationRate ?? 1.95;

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto space-y-6">
      {/* Header & Sub-tab navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1e1c10] dark:text-white tracking-tight m-0 pb-1 flex items-center gap-2">
            Integrated <span className="font-medium text-[#747878] dark:text-[#a8a497]">Wealth Plan</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#747878] dark:text-[#a8a497] m-0">
            รวบรวมข้อมูลการเงิน จัดสรรเงินสำรอง ทดสอบวิกฤต และคาดการณ์เงินเฟ้อ
          </p>
        </div>
        <div className="flex w-full sm:w-auto bg-[#faf3e0] dark:bg-[#201f1a] p-1 rounded-full border border-[#e0dac7] dark:border-[#423e35]">
          <button className="flex-1 sm:flex-initial px-5 py-2 rounded-full bg-[#fed330] text-[#1e1c10] text-xs sm:text-sm font-bold shadow-sm border-0 cursor-pointer transition-all flex items-center justify-center gap-2">
            Wealth Plan
          </button>
          <button 
            className="flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs sm:text-sm font-bold text-[#747878] dark:text-[#a8a497] hover:text-[#1e1c10] dark:hover:text-white bg-transparent border-0 cursor-pointer transition-all flex items-center justify-center gap-2"
            onClick={() => actions.setPage(1)}
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* ═══════════════ UNIFIED SECTION: BASELINE & MONTHLY EXPENSES (SINGLE UNIFIED CARD) ═══════════════ */}
      <div className="bg-white dark:bg-[#201f1a] rounded-[32px] border border-[#e0dac7] dark:border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-card)] p-5 sm:p-7 space-y-6">
        
        {/* Unified Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f0e9d6] dark:border-[#35332b]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#faf3e0] dark:bg-[#282620] text-[#1e1c10] dark:text-[#fed330] flex items-center justify-center text-base shadow-sm border border-[#e0dac7]/60 dark:border-[#423e35] shrink-0">
              <i className="fi fi-sr-wallet"></i>
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold text-[#1e1c10] dark:text-white">
                ข้อมูลการเงินและรายจ่ายประจำเดือน
              </div>
              <div className="text-xs text-[#747878] dark:text-[#a8a497] mt-0.5">
                ระบุข้อมูลกระแสเงินสดและค่าใช้จ่าย เพื่อคำนวณการจัดสรรเงินสำรองและพอร์ตลงทุน
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-[#747878] dark:text-[#a8a497] bg-[#faf3e0] dark:bg-[#282620] px-3.5 py-1.5 rounded-full border border-[#e0dac7]/60 dark:border-[#423e35]">
              รวมรายจ่าย: <span className="font-mono font-bold text-[#1e1c10] dark:text-white">฿{fmt(state.totalMonthlyExpense)}</span> / เดือน
            </span>
          </div>
        </div>

        {/* 2-Column Responsive Form Layout (Equal Heights with zero dead space) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* ── LEFT COLUMN (5/12): ข้อมูลการเงินปัจจุบัน ── */}
          <div className="lg:col-span-5 bg-[#faf3e0]/40 dark:bg-[#282620] p-5 rounded-2xl border border-[#f0e9d6] dark:border-[#423e35] flex flex-col justify-between h-full space-y-4">
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-white flex items-center gap-2 pb-2 border-b border-[#f0e9d6] dark:border-[#35332b]">
                <i className="fi fi-sr-coins text-amber-600 text-xs"></i>
                <span>รายได้และการออม</span>
              </div>

              <div className="space-y-3.5 pt-3">
                <div>
                  <label className="block text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1">
                    เงินเก็บทั้งหมดที่มีตอนนี้ (บาท)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747878] dark:text-[#a8a497] font-bold text-sm font-mono">฿</span>
                    <input 
                      className="w-full bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2.5 pl-8 pr-3.5 text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] font-mono focus:ring-2 focus:ring-[#fed330] focus:border-[#fed330] transition-all outline-none" 
                      type="number" 
                      value={state.totalCapital || ''} 
                      onChange={e => actions.setTotalCapital(Number(e.target.value))} 
                      placeholder="เช่น 300000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1">
                    เงินเดือน / รายได้ปัจจุบัน (บาท/เดือน)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747878] dark:text-[#a8a497] font-bold text-sm font-mono">฿</span>
                    <input 
                      className="w-full bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2.5 pl-8 pr-3.5 text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] font-mono focus:ring-2 focus:ring-[#fed330] focus:border-[#fed330] transition-all outline-none" 
                      type="number" 
                      value={state.salary || ''} 
                      onChange={e => actions.setSalary(Number(e.target.value))} 
                      placeholder="เช่น 40000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1">
                    พร้อมแบ่งไปลงทุนทุกเดือน (DCA)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747878] dark:text-[#a8a497] font-bold text-sm font-mono">฿</span>
                    <input 
                      className="w-full bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2.5 pl-8 pr-3.5 text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] font-mono focus:ring-2 focus:ring-[#fed330] focus:border-[#fed330] transition-all outline-none" 
                      type="number" 
                      value={state.monthlyInvestment || ''} 
                      onChange={e => actions.setMonthlyInvestment(Number(e.target.value))} 
                      placeholder="เช่น 5000"
                    />
                  </div>
                </div>

                {/* DCA Day Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1 flex items-center justify-between">
                    <span>วันที่เข้าซื้อ DCA ประจำเดือน</span>
                    <span className="text-[10px] font-semibold text-[#747878] dark:text-[#a8a497]">อัตโนมัติ</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      className="w-full bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2 px-3 text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] focus:ring-2 focus:ring-[#fed330] outline-none"
                      value={state.dcaDayType || '1'}
                      onChange={e => {
                        const val = e.target.value;
                        actions.setDcaDayType(val);
                        if (val === '1') actions.setDcaDay(1);
                        else if (val === '15') actions.setDcaDay(15);
                      }}
                    >
                      <option value="1">ทุกวันที่ 1 (ค่าเริ่มต้น)</option>
                      <option value="15">ทุกวันที่ 15</option>
                      <option value="custom">ระบุวันเอง...</option>
                    </select>

                    {state.dcaDayType === 'custom' && (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747878] dark:text-[#a8a497] font-bold text-xs">วันที่</span>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          className="w-full bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2 pl-10 pr-2.5 text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] font-mono focus:ring-2 focus:ring-[#fed330] outline-none"
                          value={state.dcaDay || 1}
                          onChange={e => {
                            const d = Math.max(1, Math.min(31, Number(e.target.value) || 1));
                            actions.setDcaDay(d);
                          }}
                          placeholder="1-31"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Net Savings Insight Badge (Balances column height perfectly) */}
            <div className="pt-3 border-t border-[#f0e9d6] dark:border-[#35332b] space-y-3 mt-auto">
              {(() => {
                const netSavings = (state.salary || 0) - (state.totalMonthlyExpense || 0) - (state.monthlyInvestment || 0);
                return (
                  <div className="p-3 bg-white dark:bg-[#201f1a] rounded-xl flex justify-between items-center border border-[#e0dac7] dark:border-[#423e35] shadow-xs">
                    <span className="text-xs font-bold text-[#747878] dark:text-[#a8a497]">เงินเหลือเก็บสุทธิ:</span>
                    <span className={`font-extrabold font-mono text-base sm:text-lg ${netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {netSavings >= 0 ? '+' : ''}฿{fmt(netSavings)} <span className="text-xs font-normal text-[#747878] dark:text-[#a8a497]">/ เดือน</span>
                    </span>
                  </div>
                );
              })()}

              <div className="p-3 bg-[#fff6dc] dark:bg-amber-950/40 rounded-xl border border-[#fed330]/60 flex items-center gap-2.5 text-xs text-[#705b00] dark:text-amber-200">
                <i className="fi fi-sr-bulb text-amber-600 text-sm shrink-0"></i>
                <span>ระบบจะนำเงินเก็บและ DCA ไปคำนวณแผนสำรองฉุกเฉินและพอร์ตลงทุน</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (7/12): รายจ่ายต่อเดือน ── */}
          <div className="lg:col-span-7 bg-[#faf3e0]/40 dark:bg-[#282620] p-5 rounded-2xl border border-[#f0e9d6] dark:border-[#423e35] flex flex-col justify-between h-full space-y-4">
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-white flex items-center justify-between pb-2 border-b border-[#f0e9d6] dark:border-[#35332b]">
                <div className="flex items-center gap-2">
                  <i className="fi fi-sr-receipt text-amber-600 text-xs"></i>
                  <span>รายจ่ายย่อย (6 หมวดหลัก)</span>
                </div>
                <span className="text-[11px] text-[#747878] dark:text-[#a8a497]">บาท / เดือน</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                {[
                  { key: "food", label: "ค่าอาหาร", icon: "fi-sr-restaurant" },
                  { key: "rent", label: "ที่พักอาศัย", icon: "fi-sr-home" },
                  { key: "transport", label: "ค่าเดินทาง", icon: "fi-sr-car" },
                  { key: "necessities", label: "ของใช้จำเป็น", icon: "fi-sr-shopping-cart" },
                  { key: "debt", label: "ภาระหนี้สิน", icon: "fi-sr-bank" },
                  { key: "other", label: "ค่าอื่นๆ", icon: "fi-sr-box" },
                ].map(item => (
                  <div key={item.key} className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb]">
                      <i className={`fi ${item.icon} text-[#747878] dark:text-[#a8a497] text-xs`}></i> {item.label}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747878] dark:text-[#a8a497] font-bold text-xs font-mono">฿</span>
                      <input 
                        className="w-full bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2 pl-7 pr-3 text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] font-mono focus:ring-2 focus:ring-[#fed330] outline-none transition-all" 
                        type="number" 
                        value={state.expenses[item.key] || ''} 
                        onChange={e => actions.handleExp(item.key, Number(e.target.value))} 
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Summary & Save Button Container */}
            <div className="pt-3 border-t border-[#f0e9d6] dark:border-[#35332b] space-y-3 mt-auto">
              <div className="p-3 bg-white dark:bg-[#201f1a] rounded-xl flex justify-between items-center border border-[#e0dac7] dark:border-[#423e35] shadow-xs">
                <span className="text-xs font-bold text-[#747878] dark:text-[#a8a497]">รวมรายจ่ายต่อเดือน:</span>
                <span className="font-extrabold font-mono text-base sm:text-lg text-[#1e1c10] dark:text-white">
                  ฿{fmt(state.totalMonthlyExpense)} <span className="text-xs font-normal text-[#747878] dark:text-[#a8a497]">/ เดือน</span>
                </span>
              </div>

              <button 
                className="w-full py-3 bg-[#1e1c10] hover:bg-black active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-full shadow-sm hover:shadow transition-all flex justify-center items-center cursor-pointer border-0"
                onClick={() => actions.handleSave(true)}
              >
                บันทึกข้อมูลการเงิน
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ═══════════════ ROW 2: ACCORDIONS (ALLOCATION, STRESS TEST, INFLATION) ═══════════════ */}
      <div className="space-y-4">
        
        {/* SECTION 1: ALLOCATION */}
        <div className="bg-white dark:bg-[#201f1a] rounded-[28px] border border-[#e0dac7] dark:border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-card)] overflow-hidden transition-all">
          <button 
            onClick={() => actions.setIsAllocationOpen(!state.isAllocationOpen)}
            className="w-full flex justify-between items-center p-4 sm:p-5 bg-transparent hover:bg-[#faf3e0]/40 dark:hover:bg-[#282620]/60 transition-colors text-left border-0 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base text-[#1e1c10] dark:text-white">
              <div className="w-7 h-7 rounded-lg bg-[#faf3e0] dark:bg-[#282620] text-[#1e1c10] dark:text-[#fed330] flex items-center justify-center text-xs shadow-sm">
                <i className="fi fi-sr-chart-pie-alt"></i>
              </div>
              <span>แผนจัดสรรเงิน (Allocation)</span>
            </div>
            <div className={`w-7 h-7 rounded-full bg-[#faf3e0] dark:bg-[#282620] flex items-center justify-center text-[#747878] dark:text-[#a8a497] text-xs transition-transform duration-200 ${state.isAllocationOpen ? 'rotate-180' : ''}`}>
              <i className="fi fi-sr-angle-down"></i>
            </div>
          </button>
          
          {state.isAllocationOpen && (
            <div className="p-4 sm:p-5 pt-1 border-t border-[#f0e9d6] dark:border-[#35332b] space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1.5">
                  เป้าหมายเงินสำรองฉุกเฉิน (จำนวนเดือน)
                </label>
                <select 
                  className="w-full bg-[#faf3e0]/70 hover:bg-[#faf3e0] focus:bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] outline-none focus:ring-2 focus:ring-[#fed330]" 
                  value={state.reserveMonths} 
                  onChange={e => actions.setReserveMonths(Number(e.target.value))}
                >
                  <option value={3}>3 เดือน (ความเสี่ยงต่ำ - เหมาะกับงานมั่นคง)</option>
                  <option value={6}>6 เดือน (มาตรฐานทั่วไป - แนะนำ)</option>
                  <option value={12}>12 เดือน (ปลอดภัยสูง - เหมาะกับฟรีแลนซ์/ธุรกิจส่วนตัว)</option>
                </select>
              </div>

              {/* Unified Combined Allocation Section */}
              <div className="p-4 sm:p-5 bg-[#faf3e0]/60 dark:bg-[#282620] rounded-2xl border border-[#e0dac7] dark:border-[#423e35] space-y-4">
                {/* Progress Bar Container */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-bold text-[#747878] dark:text-[#a8a497]">เงินเก็บรวมปัจจุบัน</span>
                    <span className="text-lg sm:text-xl font-extrabold text-[#1e1c10] dark:text-white font-mono">฿{fmt(state.totalCapital)}</span>
                  </div>
                  <div className="w-full h-3 bg-[#e0dac7]/70 dark:bg-[#35332b] rounded-full overflow-hidden flex">
                    {state.totalCapital > 0 && (
                      <>
                        <div 
                          className="h-full bg-[#1e1c10] dark:bg-white transition-all duration-700 rounded-l-full" 
                          style={{ width: `${Math.min(100, (Math.min(state.totalCapital, state.emergencyRequired) / state.totalCapital) * 100)}%` }}
                        />
                        {state.totalCapital > state.emergencyRequired && (
                          <div 
                            className="h-full bg-[#fed330] transition-all duration-700 rounded-r-full" 
                            style={{ width: `${((state.totalCapital - state.emergencyRequired) / state.totalCapital) * 100}%` }}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="h-px bg-[#e0dac7]/60 dark:bg-[#35332b] my-1"></div>

                {/* Two Allocation Stat Breakdown Columns inside the same unified container */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col justify-between space-y-1.5 p-3 rounded-xl bg-white/70 dark:bg-[#201f1a] border border-[#e0dac7]/60 dark:border-[#423e35]">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#747878] dark:text-[#a8a497]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1e1c10] dark:bg-white shrink-0"></span> กันไว้เป็นเงินสำรอง
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold text-[#1e1c10] dark:text-white font-mono tracking-tight">
                      ฿{fmt(Math.min(state.totalCapital, state.emergencyRequired))}
                    </div>
                    <div>
                      {state.totalCapital < state.emergencyRequired ? (
                        <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <i className="fi fi-sr-exclamation text-[10px]"></i> ขาดอีก ฿{fmt(state.emergencyRequired - state.totalCapital)}
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <i className="fi fi-sr-check-circle text-[10px]"></i> สำรองครบ {state.reserveMonths} เดือนแล้ว
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between space-y-1.5 p-3 rounded-xl bg-white/70 dark:bg-[#201f1a] border border-[#e0dac7]/60 dark:border-[#423e35]">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#747878] dark:text-[#a8a497]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#fed330] shrink-0 border border-[#e0dac7] dark:border-transparent"></span> เงินพร้อมสำหรับลงทุน
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold text-[#1e1c10] dark:text-[#fed330] font-mono tracking-tight">
                      ฿{fmt(state.initialInvestment)}
                    </div>
                    <div className="text-xs font-medium text-[#747878] dark:text-[#a8a497]">
                      {state.initialInvestment > 0 ? "สามารถนำไปจัดพอร์ตต่อได้ทันที" : "สะสมเงินสำรองให้ครบก่อน"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: EMERGENCY STRESS TEST */}
        <div className="bg-white dark:bg-[#201f1a] rounded-[28px] border border-[#e0dac7] dark:border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-card)] overflow-hidden transition-all">
          <button 
            onClick={() => actions.setIsEmergencyOpen(!state.isEmergencyOpen)}
            className="w-full flex justify-between items-center p-4 sm:p-5 bg-transparent hover:bg-[#faf3e0]/40 dark:hover:bg-[#282620]/60 transition-colors text-left border-0 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base text-[#1e1c10] dark:text-white">
              <div className="w-7 h-7 rounded-lg bg-[#faf3e0] dark:bg-[#282620] text-[#1e1c10] dark:text-[#fed330] flex items-center justify-center text-xs shadow-sm">
                {scenarioDef ? getIcon(scenarioDef.icon, '16px') : <i className="fi fi-sr-shield-exclamation text-xs"></i>}
              </div>
              <span>ทดสอบวิกฤต (Stress Test)</span>
            </div>
            <div className={`w-7 h-7 rounded-full bg-[#faf3e0] dark:bg-[#282620] flex items-center justify-center text-[#747878] dark:text-[#a8a497] text-xs transition-transform duration-200 ${state.isEmergencyOpen ? 'rotate-180' : ''}`}>
              <i className="fi fi-sr-angle-down"></i>
            </div>
          </button>
          
          {state.isEmergencyOpen && (
            <div className="p-4 sm:p-5 pt-1 border-t border-[#f0e9d6] dark:border-[#35332b] space-y-4">
              
              {/* Compact Sleek Scenario Selection Grid */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {(Object.entries(SCENARIOS) as [Scenario, ScenarioDef][]).map(([key, def]) => {
                  const active = state.selectedScenario === key;
                  return (
                    <button 
                      key={key} 
                      onClick={() => { 
                        if (active) {
                          actions.setSelectedScenario(null);
                        } else {
                          actions.setSelectedScenario(key as Scenario); 
                          actions.setSeverity('moderate'); 
                          if (key !== 'job_loss' && SCENARIOS[key as Scenario].severities) {
                            const sev = SCENARIOS[key as Scenario].severities!['moderate'];
                            actions.setCustomMedicalCost(sev.medicalCost);
                            actions.setCustomVehicleCost(sev.vehicleCost);
                          }
                        }
                      }} 
                      className={`flex flex-col items-center justify-center p-3 sm:p-3.5 min-h-[72px] sm:min-h-[80px] rounded-2xl border transition-all text-center cursor-pointer gap-1.5 ${
                        active 
                          ? 'bg-[#fff6dc] dark:bg-amber-950/40 border-2 border-[#fed330] text-[#1e1c10] dark:text-white shadow-sm ring-1 ring-[#fed330]/30' 
                          : 'bg-[#faf3e0]/60 dark:bg-[#282620] border border-[#e0dac7] dark:border-[#423e35] text-[#747878] dark:text-[#a8a497] hover:bg-[#faf3e0] dark:hover:bg-[#35332b] hover:text-[#1e1c10] dark:hover:text-white'
                      }`}
                    >
                      <div className="text-lg sm:text-xl">{getIcon(def.icon, '20px')}</div>
                      <div className="text-xs sm:text-sm font-bold">{def.title}</div>
                    </button>
                  );
                })}
              </div>

              {/* Scenario Configuration */}
              {scenarioDef && scenarioDef.hasSeverity && (
                <div className="space-y-3 p-4 sm:p-5 bg-[#faf3e0]/60 dark:bg-[#282620] rounded-2xl border border-[#e0dac7] dark:border-[#423e35] shadow-[var(--shadow-sm)]">
                  <div>
                    <label className="block text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1">
                      ระดับความรุนแรงของสถานการณ์
                    </label>
                    <select 
                      className="w-full bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2 px-3 text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] focus:ring-2 focus:ring-[#fed330] outline-none" 
                      value={state.severity} 
                      onChange={e => {
                        const newSev = e.target.value as Severity;
                        actions.setSeverity(newSev);
                        if (scenarioDef?.severities) {
                          actions.setCustomMedicalCost(scenarioDef.severities[newSev].medicalCost);
                          actions.setCustomVehicleCost(scenarioDef.severities[newSev].vehicleCost);
                        }
                      }}
                    >
                      {Object.entries(scenarioDef.severities!).map(([sKey, sDef]) => (
                        <option key={sKey} value={sKey}>{sDef.label}</option>
                      ))}
                    </select>
                  </div>

                  {(state.selectedScenario === 'illness' || (state.selectedScenario === 'accident' && state.severity !== 'none')) && (
                    <div>
                      <label className="block text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1">
                        ค่ารักษาพยาบาลโดยประมาณ (บาท)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747878] dark:text-[#a8a497] font-bold text-xs font-mono">฿</span>
                        <input 
                          type="number" 
                          className="w-full bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2 pl-7 pr-3 text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] font-mono outline-none focus:ring-2 focus:ring-[#fed330]" 
                          value={state.customMedicalCost === 0 ? '' : state.customMedicalCost} 
                          onChange={e => actions.setCustomMedicalCost(Number(e.target.value))} 
                        />
                      </div>
                    </div>
                  )}

                  {state.selectedScenario === 'accident' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1">คุณเป็นฝ่ายผิดหรือไม่?</label>
                        <select 
                          className="w-full bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2 px-3 text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] outline-none focus:ring-2 focus:ring-[#fed330]" 
                          value={state.isAtFault ? "yes" : "no"} 
                          onChange={e => actions.setIsAtFault(e.target.value === "yes")}
                        >
                          <option value="no">ฝ่ายถูก (คู่กรณีรับผิดชอบค่าเสียหาย)</option>
                          <option value="yes">ฝ่ายผิด</option>
                        </select>
                      </div>

                      {state.isAtFault && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1">ค่าซ่อมรถเรา (บาท)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747878] dark:text-[#a8a497] font-bold text-xs font-mono">฿</span>
                              <input 
                                type="number" 
                                className="w-full bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2 pl-7 pr-3 text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] font-mono outline-none focus:ring-2 focus:ring-[#fed330]" 
                                value={state.customVehicleCost === 0 ? '' : state.customVehicleCost} 
                                onChange={e => actions.setCustomVehicleCost(Number(e.target.value))} 
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1">ค่าซ่อมรถคู่กรณี (บาท)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747878] dark:text-[#a8a497] font-bold text-xs font-mono">฿</span>
                              <input 
                                type="number" 
                                className="w-full bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2 pl-7 pr-3 text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] font-mono outline-none focus:ring-2 focus:ring-[#fed330]" 
                                value={state.customThirdPartyCost === 0 ? '' : state.customThirdPartyCost} 
                                onChange={e => actions.setCustomThirdPartyCost(Number(e.target.value))} 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Insurance selects */}
              {scenarioDef && (state.selectedScenario === 'illness' || (state.selectedScenario === 'accident' && state.severity !== 'none')) && (
                <div>
                  <label className="block text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1">
                    ความคุ้มครอง: ประกันสุขภาพ / อุบัติเหตุ
                  </label>
                  <select 
                    className="w-full bg-[#faf3e0]/70 hover:bg-[#faf3e0] focus:bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] outline-none focus:ring-2 focus:ring-[#fed330]" 
                    value={state.selectedHealthInsId || ""} 
                    onChange={e => actions.setSelectedHealthInsId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">ไม่มี (จ่ายเองทั้งหมด)</option>
                    {state.insurancePlans.filter((p: any) => p.category === "health_life").map((plan: any) => (
                      <option key={plan.id} value={plan.id}>{plan.company} - {plan.planName}</option>
                    ))}
                  </select>
                </div>
              )}

              {scenarioDef && state.selectedScenario === 'accident' && (
                <div>
                  <label className="block text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1">
                    ความคุ้มครอง: ประกันรถยนต์
                  </label>
                  <select 
                    className="w-full bg-[#faf3e0]/70 hover:bg-[#faf3e0] focus:bg-white dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] outline-none focus:ring-2 focus:ring-[#fed330]" 
                    value={state.selectedVehicleInsId || ""} 
                    onChange={e => actions.setSelectedVehicleInsId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">ไม่มี / พ.ร.บ. อย่างเดียว</option>
                    <optgroup label="ประกันชั้น 1">
                      {state.insurancePlans.filter((p: any) => p.category === "car_class_1").map((plan: any) => (
                        <option key={plan.id} value={plan.id}>{plan.company} - {plan.planName}</option>
                      ))}
                    </optgroup>
                    <optgroup label="ประกันชั้น 2+">
                      {state.insurancePlans.filter((p: any) => p.category === "car_class_2").map((plan: any) => (
                        <option key={plan.id} value={plan.id}>{plan.company} - {plan.planName}</option>
                      ))}
                    </optgroup>
                    <optgroup label="ประกันชั้น 3 / 3+">
                      {state.insurancePlans.filter((p: any) => p.category === "car_class_3").map((plan: any) => (
                        <option key={plan.id} value={plan.id}>{plan.company} - {plan.planName}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              {/* Scenario Summary */}
              {scenarioDef && (
                <div className="space-y-3 pt-1">
                  <div className="p-4 sm:p-5 bg-[#faf3e0]/60 dark:bg-[#282620] rounded-2xl border border-[#e0dac7] dark:border-[#423e35] space-y-2.5 text-xs shadow-[var(--shadow-sm)]">
                    <div className="text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-2">
                      <span>สรุปภาระค่าใช้จ่ายจากวิกฤตนี้</span>
                    </div>
                    <div className="flex justify-between items-center text-[#747878] dark:text-[#a8a497]">
                      <span>ค่าครองชีพช่วงฟื้นตัว ({state.e_recoveryMonths} เดือน)</span>
                      <span className="font-bold font-mono text-[#1e1c10] dark:text-[#f5f3eb]">฿{fmt(state.e_livingCost)}</span>
                    </div>
                    
                    {state.e_medicalCost > 0 && (
                      <>
                        <div className="flex justify-between items-center text-[#747878] dark:text-[#a8a497]">
                          <span>ค่ารักษาพยาบาล</span>
                          <span className="font-bold font-mono text-[#1e1c10] dark:text-[#f5f3eb]">฿{fmt(state.e_medicalCost)}</span>
                        </div>
                        {state.coveredMedicalByPrb > 0 && (
                          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                            <span>- พ.ร.บ. ช่วยจ่าย</span>
                            <span className="font-bold font-mono">-฿{fmt(state.coveredMedicalByPrb)}</span>
                          </div>
                        )}
                        {state.coveredMedicalByHealth > 0 && (
                          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                            <span>- ประกันสุขภาพช่วยจ่าย</span>
                            <span className="font-bold font-mono">-฿{fmt(state.coveredMedicalByHealth)}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {state.e_vehicleCost > 0 && (
                      <>
                        <div className="flex justify-between items-center text-[#747878] dark:text-[#a8a497]">
                          <span>ค่าซ่อมรถเรา</span>
                          <span className="font-bold font-mono text-[#1e1c10] dark:text-[#f5f3eb]">฿{fmt(state.e_vehicleCost)}</span>
                        </div>
                        {state.coveredVehicle > 0 && (
                          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                            <span>- ประกันช่วยจ่าย</span>
                            <span className="font-bold font-mono">-฿{fmt(state.coveredVehicle)}</span>
                          </div>
                        )}
                        {!state.isAtFault && state.e_vehicleCost > 0 && (
                          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                            <span>- คู่กรณีรับผิดชอบ</span>
                            <span className="font-bold font-mono">-฿{fmt(state.e_vehicleCost)}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {state.e_thirdPartyCost > 0 && (
                      <>
                        <div className="flex justify-between items-center text-[#747878] dark:text-[#a8a497]">
                          <span>ค่าซ่อมรถ/ทรัพย์สินคู่กรณี</span>
                          <span className="font-bold font-mono text-[#1e1c10] dark:text-[#f5f3eb]">฿{fmt(state.e_thirdPartyCost)}</span>
                        </div>
                        {state.coveredThirdParty > 0 && (
                          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                            <span>- ประกันช่วยจ่าย</span>
                            <span className="font-bold font-mono">-฿{fmt(state.coveredThirdParty)}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="h-px bg-[#f0e9d6] dark:bg-[#35332b] my-2"></div>
                    <div className="flex justify-between items-center font-bold text-xs sm:text-sm">
                      <span className="text-[#1e1c10] dark:text-[#f5f3eb]">รวมค่าใช้จ่ายส่วนต่างที่ต้องจ่ายเอง</span>
                      <span className="font-extrabold font-mono text-rose-600 dark:text-rose-400 text-sm sm:text-base">฿{fmt(state.e_totalCost)}</span>
                    </div>
                  </div>

                  {/* Stress test outcome banner */}
                  <div className={`p-4 sm:p-5 rounded-2xl border text-center ${
                    state.e_survived 
                      ? 'bg-[#dcfce7] dark:bg-emerald-950/40 border-[#86efac] dark:border-emerald-800 text-[#065f46] dark:text-emerald-300' 
                      : 'bg-[#ffd8e7] dark:bg-rose-950/40 border-[#fca5a5] dark:border-rose-800 text-[#881337] dark:text-rose-300'
                  }`}>
                    <div className="flex items-center justify-center gap-1.5 text-sm sm:text-base font-bold mb-1">
                      <i className={`fi ${state.e_survived ? 'fi-sr-check-circle text-emerald-600 text-base' : 'fi-sr-cross-circle text-rose-600 text-base'}`}></i>
                      {state.e_survived ? 'เงินสำรองของคุณเพียงพอรับมือ!' : 'เงินสำรองยังไม่เพียงพอ!'}
                    </div>
                    <div className="text-xs opacity-90 leading-relaxed max-w-lg mx-auto">
                      {state.e_survived 
                        ? `เงินเก็บปัจจุบัน (฿${fmt(state.totalCapital)}) เพียงพอกับวิกฤตนี้ และยังคงเหลือเงิน ฿${fmt(state.totalCapital - state.e_totalCost)}`
                        : `คุณยังขาดเงินอีก ฿${fmt(state.e_shortfall)} เพื่อรับมือกับวิกฤตนี้ แนะนำให้ขยายเป้าหมายเงินสำรองฉุกเฉิน`
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 3: INFLATION & PURCHASING POWER */}
        <div className="bg-white dark:bg-[#201f1a] rounded-[28px] border border-[#e0dac7] dark:border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-card)] overflow-hidden transition-all">
          <button 
            onClick={() => actions.setIsInflationOpen(!state.isInflationOpen)}
            className="w-full flex justify-between items-center p-4 sm:p-5 bg-transparent hover:bg-[#faf3e0]/40 dark:hover:bg-[#282620]/60 transition-colors text-left border-0 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base text-[#1e1c10] dark:text-white">
              <div className="w-7 h-7 rounded-lg bg-[#faf3e0] dark:bg-[#282620] text-[#1e1c10] dark:text-[#fed330] flex items-center justify-center text-xs shadow-sm">
                <i className="fi fi-sr-chart-line-up"></i>
              </div>
              <span>คาดการณ์เงินเฟ้อ</span>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-[#fff6dc] dark:bg-amber-950/60 text-[#705b00] dark:text-amber-300 rounded-full">
                ปัจจุบัน {liveInflationRate.toFixed(2)}%
              </span>
            </div>
            <div className={`w-7 h-7 rounded-full bg-[#faf3e0] dark:bg-[#282620] flex items-center justify-center text-[#747878] dark:text-[#a8a497] text-xs transition-transform duration-200 ${state.isInflationOpen ? 'rotate-180' : ''}`}>
              <i className="fi fi-sr-angle-down"></i>
            </div>
          </button>
          
          {state.isInflationOpen && (
            <div className="p-4 sm:p-5 pt-1 border-t border-[#f0e9d6] dark:border-[#35332b] space-y-4">
              
              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1.5">
                    <span>ระยะเวลาการวางแผน</span>
                    <span className="font-mono text-[#1e1c10] dark:text-[#fed330] text-xs sm:text-sm font-bold">{state.timeline} ปี</span>
                  </div>
                  <input 
                    type="range" 
                    className="w-full h-2 bg-[#e0dac7]/70 dark:bg-[#35332b] rounded-lg appearance-none cursor-pointer accent-[#1e1c10] dark:accent-[#fed330]" 
                    min="1" 
                    max="30" 
                    value={state.timeline} 
                    onChange={e => actions.setTimeline(Number(e.target.value))} 
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1.5">
                    <span>อัตราเงินเฟ้อเฉลี่ย</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm">
                      {Number(state.inflationRate ?? liveInflationRate).toFixed(2)}% / ปี
                    </span>
                  </div>
                  <input 
                    type="range" 
                    className="w-full h-2 bg-[#e0dac7]/70 dark:bg-[#35332b] rounded-lg appearance-none cursor-pointer accent-rose-500" 
                    min="0" 
                    max="10" 
                    step="0.01" 
                    value={state.inflationRate ?? liveInflationRate} 
                    onChange={e => actions.setInflationRate(Number(e.target.value))} 
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex justify-between items-center text-xs font-bold text-[#1e1c10] dark:text-[#f5f3eb] mb-1.5">
                    <span>เงินเดือนขึ้นโดยเฉลี่ย</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm">
                      {state.salaryGrowth}% / ปี
                    </span>
                  </div>
                  <input 
                    type="range" 
                    className="w-full h-2 bg-[#e0dac7]/70 dark:bg-[#35332b] rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                    min="0" 
                    max="15" 
                    step="0.5" 
                    value={state.salaryGrowth} 
                    onChange={e => actions.setSalaryGrowth(Number(e.target.value))} 
                  />
                </div>
              </div>

              {/* Inflation Impact Card */}
              <div className="p-4 sm:p-5 bg-[#faf3e0]/60 dark:bg-[#282620] rounded-2xl border border-[#e0dac7] dark:border-[#423e35] space-y-3.5 text-xs shadow-[var(--shadow-sm)]">
                {/* Total Expenses Row */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[#747878] dark:text-[#a8a497]">
                    <span>รายจ่ายรวมปัจจุบัน</span>
                    <span className="font-mono font-bold text-[#1e1c10] dark:text-[#f5f3eb] text-xs sm:text-sm">฿{fmt(state.totalMonthlyExpense)} / ด.</span>
                  </div>
                  <div className="flex justify-between items-center text-[#747878] dark:text-[#a8a497]">
                    <span>รายจ่ายรวมในอีก {state.timeline} ปีข้างหน้า</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs sm:text-sm">
                      ฿{fmt(state.futureExpense)} / ด.
                      {state.futureExpense > state.totalMonthlyExpense && (
                        <span className="text-[11px] ml-1 font-semibold text-rose-500 font-mono">
                          (+฿{fmt(state.futureExpense - state.totalMonthlyExpense)})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="pt-2.5 border-t border-[#f0e9d6] dark:border-[#35332b] space-y-2.5">
                  <div className="text-xs font-bold text-[#747878] dark:text-[#a8a497] flex items-center justify-between">
                    <span>คาดการณ์รายจ่ายแยกรายหมวด (ในอีก {state.timeline} ปี):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: "food", label: "ค่าอาหาร", icon: "fi-sr-restaurant" },
                      { key: "rent", label: "ที่พักอาศัย", icon: "fi-sr-home" },
                      { key: "transport", label: "ค่าเดินทาง", icon: "fi-sr-car" },
                      { key: "necessities", label: "ของใช้จำเป็น", icon: "fi-sr-shopping-cart" },
                      { key: "debt", label: "ภาระหนี้สิน", icon: "fi-sr-bank", isFixed: true },
                      { key: "other", label: "ค่าอื่นๆ", icon: "fi-sr-box" },
                    ].map(cat => {
                      const curVal = state.expenses[cat.key] || 0;
                      const futVal = cat.isFixed ? curVal : Math.round(curVal * (1 + state.cumulativeInflation));
                      const diff = futVal - curVal;

                      return (
                        <div key={cat.key} className="p-2.5 sm:p-3 bg-white dark:bg-[#201f1a] rounded-xl border border-[#e0dac7] dark:border-[#423e35] flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <i className={`fi ${cat.icon} text-[#747878] dark:text-[#a8a497] text-xs shrink-0`}></i>
                            <div className="truncate">
                              <span className="font-bold text-[#1e1c10] dark:text-[#f5f3eb]">{cat.label}</span>
                              <div className="text-[10px] text-[#747878] dark:text-[#a8a497] font-mono mt-0.5">
                                ปัจจุบัน: ฿{fmt(curVal)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0 font-mono">
                            <div className="font-bold text-[#1e1c10] dark:text-[#f5f3eb]">
                              ฿{fmt(futVal)}
                            </div>
                            {diff > 0 ? (
                              <span className="text-[10px] font-bold text-rose-500">
                                +฿{fmt(diff)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#747878] dark:text-[#a8a497] font-sans">
                                {cat.isFixed ? "ภาระคงที่" : "-"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-[#f0e9d6] dark:bg-[#35332b] my-1.5"></div>

                {/* Salary Projection */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[#747878] dark:text-[#a8a497]">
                    <span>เงินเดือนปัจจุบัน</span>
                    <span className="font-mono font-bold text-[#1e1c10] dark:text-[#f5f3eb] text-xs sm:text-sm">฿{fmt(state.salary)} / ด.</span>
                  </div>
                  <div className="flex justify-between items-center text-[#747878] dark:text-[#a8a497]">
                    <span>เงินเดือนในอนาคต (ตัวเลขระบุ)</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">฿{fmt(state.futureSalary)} / ด.</span>
                  </div>
                </div>
                
                {/* Real Value Callout with Tooltip */}
                <div className="flex justify-between items-center mt-2 p-3.5 sm:p-4 bg-white dark:bg-[#201f1a] rounded-2xl border border-[#e0dac7] dark:border-[#423e35] shadow-[var(--shadow-sm)]">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="font-bold text-xs sm:text-sm text-[#1e1c10] dark:text-white">อำนาจซื้อจริง (Real Value)</div>
                      <InfoTooltip title="อำนาจซื้อจริง (Real Purchasing Power)" position="top" align="left">
                        มูลค่าเงินเดือนในอนาคตที่หักผลกระทบจากเงินเฟ้อแล้ว หากตัวเลขนี้น้อยกว่าเงินเดือนปัจจุบัน แปลว่าเงินเดือนที่เพิ่มขึ้นยังโตไม่ทันอัตราเงินเฟ้อ
                      </InfoTooltip>
                    </div>
                    <div className="text-[11px] text-[#747878] dark:text-[#a8a497] mt-0.5">เทียบเท่ามูลค่าเงินในปัจจุบัน</div>
                  </div>
                  <span className={`font-mono font-extrabold text-base sm:text-lg ${state.realPurchasingPower >= state.salary ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    ฿{fmt(state.realPurchasingPower)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
