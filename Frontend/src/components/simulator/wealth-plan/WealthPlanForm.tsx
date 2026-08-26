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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white m-0 pb-1">
            Integrated <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Wealth Plan</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 m-0">
            รวบรวมข้อมูลการเงิน จัดสรรเงินสำรอง ทดสอบวิกฤต และคาดการณ์เงินเฟ้อ
          </p>
        </div>
        <div className="flex w-full sm:w-auto bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
          <button className="flex-1 sm:flex-initial px-5 sm:px-6 py-2.5 rounded-lg bg-white dark:bg-gray-700 shadow-sm text-sm font-bold text-blue-600 transition-all flex items-center justify-center gap-2">
            Wealth Plan
          </button>
          <button 
            className="flex-1 sm:flex-initial px-5 sm:px-6 py-2.5 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all flex items-center justify-center gap-2"
            onClick={() => actions.setPage(1)}
          >
            Dashboard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ═══════════════ LEFT COLUMN: CURRENT FINANCIAL BASELINE (5 cols) ═══════════════ */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[var(--bg-main)] p-5 sm:p-6 rounded-2xl border border-[var(--border)] shadow-sm space-y-6">
            
            {/* Section A: Capital & Income */}
            <div>
              <div className="flex items-center gap-2.5 text-lg font-bold text-gray-900 dark:text-white mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center text-base">
                  <i className="fi fi-sr-wallet"></i>
                </div>
                <span>ข้อมูลการเงินปัจจุบัน</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    เงินเก็บทั้งหมดที่มีตอนนี้ (บาท)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">฿</span>
                    <input 
                      className="w-full bg-gray-50/70 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-8 pr-4 text-base font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                      type="number" 
                      value={state.totalCapital || ''} 
                      onChange={e => actions.setTotalCapital(Number(e.target.value))} 
                      placeholder="เช่น 300000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    เงินเดือน / รายได้ปัจจุบัน (บาท/เดือน)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">฿</span>
                    <input 
                      className="w-full bg-gray-50/70 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-8 pr-4 text-base font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                      type="number" 
                      value={state.salary || ''} 
                      onChange={e => actions.setSalary(Number(e.target.value))} 
                      placeholder="เช่น 40000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    พร้อมแบ่งไปลงทุนทุกเดือน (DCA)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">฿</span>
                    <input 
                      className="w-full bg-gray-50/70 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-8 pr-4 text-base font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                      type="number" 
                      value={state.monthlyInvestment || ''} 
                      onChange={e => actions.setMonthlyInvestment(Number(e.target.value))} 
                      placeholder="เช่น 5000"
                    />
                  </div>
                </div>

                {/* DCA Day Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>วันที่เข้าซื้อ DCA ประจำเดือน</span>
                    <span className="text-xs font-normal text-gray-400">อัตโนมัติ</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      className="w-full bg-gray-50/70 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
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
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">วันที่</span>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          className="w-full bg-gray-50/70 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
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

            <hr className="border-gray-100 dark:border-gray-800" />

            {/* Section B: Monthly Expenses */}
            <div>
              <div className="flex items-center gap-2.5 text-lg font-bold text-gray-900 dark:text-white mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center text-base">
                  <i className="fi fi-sr-money-bill-wave"></i>
                </div>
                <span>รายจ่ายต่อเดือน</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { key: "food", label: "ค่าอาหาร", icon: "fi-sr-restaurant", color: "text-amber-500" },
                  { key: "rent", label: "ค่าที่พักอาศัย", icon: "fi-sr-home", color: "text-blue-500" },
                  { key: "transport", label: "ค่าเดินทาง", icon: "fi-sr-car", color: "text-indigo-500" },
                  { key: "necessities", label: "ของใช้จำเป็น", icon: "fi-sr-shopping-cart", color: "text-purple-500" },
                  { key: "debt", label: "ภาระหนี้สิน", icon: "fi-sr-bank", color: "text-rose-500" },
                  { key: "other", label: "ค่าอื่นๆ", icon: "fi-sr-box", color: "text-teal-500" },
                ].map(item => (
                  <div key={item.key}>
                    <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <i className={`fi ${item.icon} ${item.color} text-sm`}></i> {item.label}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs sm:text-sm">฿</span>
                      <input 
                        className="w-full bg-gray-50/70 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 pl-7 pr-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                        type="number" 
                        value={state.expenses[item.key] || ''} 
                        onChange={e => actions.handleExp(item.key, Number(e.target.value))} 
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Expenses Badge */}
              <div className="mt-4 p-4 bg-gray-50/80 dark:bg-gray-900/40 rounded-xl flex justify-between items-center border border-gray-100 dark:border-gray-800">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">รวมรายจ่ายต่อเดือน:</span>
                <span className="font-extrabold font-mono text-lg sm:text-xl text-gray-900 dark:text-white">
                  ฿{fmt(state.totalMonthlyExpense)} <span className="text-xs sm:text-sm font-normal text-gray-500">/ เดือน</span>
                </span>
              </div>
            </div>

            {/* Save Button */}
            <button 
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-base font-bold rounded-xl shadow-sm hover:shadow transition-all flex justify-center items-center gap-2"
              onClick={() => actions.handleSave(true)}
            >
              <i className="fi fi-sr-disk text-sm"></i> บันทึกข้อมูลการเงิน
            </button>
          </div>
        </div>

        {/* ═══════════════ RIGHT COLUMN: SIMULATION & PLANNING ACCORDIONS (7 cols) ═══════════════ */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* SECTION 1: ALLOCATION */}
          <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden transition-all">
            <button 
              onClick={() => actions.setIsAllocationOpen(!state.isAllocationOpen)}
              className="w-full flex justify-between items-center p-5 bg-white dark:bg-gray-900 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3 font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center text-base">
                  <i className="fi fi-sr-chart-pie-alt"></i>
                </div>
                <span>แผนจัดสรรเงิน (Allocation)</span>
              </div>
              <div className={`w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-sm transition-transform duration-200 ${state.isAllocationOpen ? 'rotate-180' : ''}`}>
                <i className="fi fi-sr-angle-down"></i>
              </div>
            </button>
            
            {state.isAllocationOpen && (
              <div className="p-5 pt-1 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    เป้าหมายเงินสำรองฉุกเฉิน (จำนวนเดือน)
                  </label>
                  <select 
                    className="w-full bg-gray-50/70 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={state.reserveMonths} 
                    onChange={e => actions.setReserveMonths(Number(e.target.value))}
                  >
                    <option value={3}>3 เดือน (ความเสี่ยงต่ำ - เหมาะกับงานมั่นคง)</option>
                    <option value={6}>6 เดือน (มาตรฐานทั่วไป - แนะนำ)</option>
                    <option value={12}>12 เดือน (ปลอดภัยสูง - เหมาะกับฟรีแลนซ์/ธุรกิจส่วนตัว)</option>
                  </select>
                </div>

                {/* Progress Bar Container */}
                <div className="p-4 bg-gray-50/70 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2.5">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">เงินเก็บรวมปัจจุบัน</span>
                    <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono">฿{fmt(state.totalCapital)}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                    {state.totalCapital > 0 && (
                      <>
                        <div 
                          className="h-full bg-blue-500 transition-all duration-700" 
                          style={{ width: `${Math.min(100, (Math.min(state.totalCapital, state.emergencyRequired) / state.totalCapital) * 100)}%` }}
                        />
                        {state.totalCapital > state.emergencyRequired && (
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-700" 
                            style={{ width: `${((state.totalCapital - state.emergencyRequired) / state.totalCapital) * 100}%` }}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Two Allocation Stat Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60 p-4 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span> กันไว้เป็นเงินสำรอง
                    </div>
                    <div className="text-xl font-extrabold text-gray-900 dark:text-white font-mono">
                      ฿{fmt(Math.min(state.totalCapital, state.emergencyRequired))}
                    </div>
                    {state.totalCapital < state.emergencyRequired ? (
                      <div className="text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <i className="fi fi-sr-exclamation text-xs"></i> ขาดอีก ฿{fmt(state.emergencyRequired - state.totalCapital)}
                      </div>
                    ) : (
                      <div className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <i className="fi fi-sr-check-circle text-xs"></i> สำรองครบเป้าหมาย {state.reserveMonths} เดือนแล้ว
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60 p-4 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span> เงินพร้อมสำหรับลงทุน
                    </div>
                    <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      ฿{fmt(state.initialInvestment)}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-500">
                      {state.initialInvestment > 0 ? "สามารถนำไปจัดพอร์ตต่อได้ทันที" : "สะสมเงินสำรองให้ครบก่อนเริ่มลงทุน"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: EMERGENCY STRESS TEST */}
          <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden transition-all">
            <button 
              onClick={() => actions.setIsEmergencyOpen(!state.isEmergencyOpen)}
              className="w-full flex justify-between items-center p-5 bg-white dark:bg-gray-900 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3 font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center text-base">
                  {scenarioDef ? getIcon(scenarioDef.icon, '20px') : <i className="fi fi-sr-shield"></i>}
                </div>
                <span>ทดสอบวิกฤต (Stress Test)</span>
              </div>
              <div className={`w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-sm transition-transform duration-200 ${state.isEmergencyOpen ? 'rotate-180' : ''}`}>
                <i className="fi fi-sr-angle-down"></i>
              </div>
            </button>
            
            {state.isEmergencyOpen && (
              <div className="p-5 pt-1 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
                
                {/* Scenario Selection Grid */}
                <div className="grid grid-cols-3 gap-3">
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
                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all text-center ${
                          active 
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                            : 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-200/80 dark:border-gray-700/60 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60'
                        }`}
                      >
                        <div className="text-xl mb-1.5">{getIcon(def.icon, '22px')}</div>
                        <div className="text-sm font-bold">{def.title}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Scenario Configuration */}
                {scenarioDef && scenarioDef.hasSeverity && (
                  <div className="space-y-3.5 p-4 bg-gray-50/70 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/60">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        ระดับความรุนแรงของสถานการณ์
                      </label>
                      <select 
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" 
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
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          ค่ารักษาพยาบาลโดยประมาณ (บาท)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">฿</span>
                          <input 
                            type="number" 
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 pl-8 pr-3 text-sm font-bold outline-none" 
                            value={state.customMedicalCost === 0 ? '' : state.customMedicalCost} 
                            onChange={e => actions.setCustomMedicalCost(Number(e.target.value))} 
                          />
                        </div>
                      </div>
                    )}

                    {state.selectedScenario === 'accident' && (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">คุณเป็นฝ่ายผิดหรือไม่?</label>
                          <select 
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-3.5 text-sm font-bold outline-none" 
                            value={state.isAtFault ? "yes" : "no"} 
                            onChange={e => actions.setIsAtFault(e.target.value === "yes")}
                          >
                            <option value="no">ฝ่ายถูก (คู่กรณีรับผิดชอบค่าเสียหาย)</option>
                            <option value="yes">ฝ่ายผิด</option>
                          </select>
                        </div>

                        {state.isAtFault && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ค่าซ่อมรถเรา (บาท)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">฿</span>
                                <input 
                                  type="number" 
                                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-8 pr-3 text-sm font-bold outline-none" 
                                  value={state.customVehicleCost === 0 ? '' : state.customVehicleCost} 
                                  onChange={e => actions.setCustomVehicleCost(Number(e.target.value))} 
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ค่าซ่อมรถคู่กรณี (บาท)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">฿</span>
                                <input 
                                  type="number" 
                                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-8 pr-3 text-sm font-bold outline-none" 
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
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      ความคุ้มครอง: ประกันสุขภาพ / อุบัติเหตุ
                    </label>
                    <select 
                      className="w-full bg-gray-50/70 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3.5 text-sm font-bold outline-none" 
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
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      ความคุ้มครอง: ประกันรถยนต์
                    </label>
                    <select 
                      className="w-full bg-gray-50/70 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3.5 text-sm font-bold outline-none" 
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
                  <div className="space-y-3 pt-2">
                    <div className="p-4 bg-gray-50/70 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/60 space-y-2.5 text-sm">
                      <div className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                        <i className="fi fi-sr-receipt text-gray-400"></i> สรุปภาระค่าใช้จ่ายจากวิกฤตนี้
                      </div>
                      <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                        <span>ค่าครองชีพช่วงฟื้นตัว ({state.e_recoveryMonths} เดือน)</span>
                        <span className="font-bold font-mono text-gray-900 dark:text-gray-100">฿{fmt(state.e_livingCost)}</span>
                      </div>
                      
                      {state.e_medicalCost > 0 && (
                        <>
                          <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                            <span>ค่ารักษาพยาบาล</span>
                            <span className="font-bold font-mono text-gray-900 dark:text-gray-100">฿{fmt(state.e_medicalCost)}</span>
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
                          <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                            <span>ค่าซ่อมรถเรา</span>
                            <span className="font-bold font-mono text-gray-900 dark:text-gray-100">฿{fmt(state.e_vehicleCost)}</span>
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
                          <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                            <span>ค่าซ่อมรถ/ทรัพย์สินคู่กรณี</span>
                            <span className="font-bold font-mono text-gray-900 dark:text-gray-100">฿{fmt(state.e_thirdPartyCost)}</span>
                          </div>
                          {state.coveredThirdParty > 0 && (
                            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                              <span>- ประกันช่วยจ่าย</span>
                              <span className="font-bold font-mono">-฿{fmt(state.coveredThirdParty)}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
                      <div className="flex justify-between items-center font-bold text-sm sm:text-base">
                        <span className="text-gray-800 dark:text-gray-200">รวมค่าใช้จ่ายส่วนต่างที่ต้องจ่ายเอง</span>
                        <span className="font-extrabold font-mono text-rose-600 dark:text-rose-400 text-base sm:text-lg">฿{fmt(state.e_totalCost)}</span>
                      </div>
                    </div>

                    {/* Stress test outcome banner */}
                    <div className={`p-4 rounded-xl border text-center ${
                      state.e_survived 
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                        : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    }`}>
                      <div className="flex items-center justify-center gap-2 text-base font-bold mb-1">
                        <i className={`fi ${state.e_survived ? 'fi-sr-check-circle text-emerald-600 text-lg' : 'fi-sr-cross-circle text-rose-600 text-lg'}`}></i>
                        {state.e_survived ? 'เงินสำรองของคุณเพียงพอรับมือ!' : 'เงินสำรองยังไม่เพียงพอ!'}
                      </div>
                      <div className="text-xs sm:text-sm opacity-90 leading-relaxed">
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
          <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm transition-all relative">
            <button 
              onClick={() => actions.setIsInflationOpen(!state.isInflationOpen)}
              className="w-full flex justify-between items-center p-5 bg-white dark:bg-gray-900 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 rounded-t-2xl transition-colors text-left"
            >
              <div className="flex items-center gap-3 font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center text-base">
                  <i className="fi fi-sr-arrow-trend-up"></i>
                </div>
                <span>คาดการณ์เงินเฟ้อ</span>
                <span className="text-xs sm:text-sm px-3 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full font-bold">
                  ปัจจุบัน {liveInflationRate.toFixed(2)}%
                </span>
              </div>
              <div className={`w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-sm transition-transform duration-200 ${state.isInflationOpen ? 'rotate-180' : ''}`}>
                <i className="fi fi-sr-angle-down"></i>
              </div>
            </button>
            
            {state.isInflationOpen && (
              <div className="p-5 pt-1 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
                
                {/* Sliders Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <div className="flex justify-between items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      <span>ระยะเวลาการวางแผน</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400 text-sm sm:text-base">{state.timeline} ปี</span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                      min="1" 
                      max="30" 
                      value={state.timeline} 
                      onChange={e => actions.setTimeline(Number(e.target.value))} 
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      <span>อัตราเงินเฟ้อเฉลี่ย</span>
                      <span className="font-mono text-rose-600 dark:text-rose-400 font-bold text-sm sm:text-base">
                        {Number(state.inflationRate ?? liveInflationRate).toFixed(2)}% / ปี
                      </span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rose-500" 
                      min="0" 
                      max="10" 
                      step="0.01" 
                      value={state.inflationRate ?? liveInflationRate} 
                      onChange={e => actions.setInflationRate(Number(e.target.value))} 
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex justify-between items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      <span>เงินเดือนขึ้นโดยเฉลี่ย</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm sm:text-base">
                        {state.salaryGrowth}% / ปี
                      </span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                      min="0" 
                      max="15" 
                      step="0.5" 
                      value={state.salaryGrowth} 
                      onChange={e => actions.setSalaryGrowth(Number(e.target.value))} 
                    />
                  </div>
                </div>

                {/* Inflation Impact Card */}
                <div className="p-4 bg-gray-50/70 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/60 space-y-3 text-sm">
                  {/* Total Expenses Row */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                      <span>รายจ่ายรวมปัจจุบัน</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-gray-100">฿{fmt(state.totalMonthlyExpense)} / ด.</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                      <span>รายจ่ายรวมในอีก {state.timeline} ปีข้างหน้า</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm sm:text-base">
                        ฿{fmt(state.futureExpense)} / ด.
                        {state.futureExpense > state.totalMonthlyExpense && (
                          <span className="text-xs ml-1 font-semibold text-rose-500 font-mono">
                            (+฿{fmt(state.futureExpense - state.totalMonthlyExpense)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="pt-2.5 border-t border-gray-200/70 dark:border-gray-700/60 space-y-2">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between">
                      <span>คาดการณ์รายจ่ายแยกรายหมวด (ในอีก {state.timeline} ปี):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { key: "food", label: "ค่าอาหาร", icon: "fi-sr-restaurant", color: "text-amber-500" },
                        { key: "rent", label: "ค่าที่พักอาศัย", icon: "fi-sr-home", color: "text-blue-500" },
                        { key: "transport", label: "ค่าเดินทาง", icon: "fi-sr-car", color: "text-indigo-500" },
                        { key: "necessities", label: "ของใช้จำเป็น", icon: "fi-sr-shopping-cart", color: "text-purple-500" },
                        { key: "debt", label: "ภาระหนี้สิน", icon: "fi-sr-bank", color: "text-rose-500", isFixed: true },
                        { key: "other", label: "ค่าอื่นๆ", icon: "fi-sr-box", color: "text-teal-500" },
                      ].map(cat => {
                        const curVal = state.expenses[cat.key] || 0;
                        const futVal = cat.isFixed ? curVal : Math.round(curVal * (1 + state.cumulativeInflation));
                        const diff = futVal - curVal;

                        return (
                          <div key={cat.key} className="p-2.5 bg-white dark:bg-gray-900/90 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <i className={`fi ${cat.icon} ${cat.color} text-sm shrink-0`}></i>
                              <div className="truncate">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{cat.label}</span>
                                <div className="text-[11px] text-gray-400 font-mono">
                                  ปัจจุบัน: ฿{fmt(curVal)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right shrink-0 font-mono">
                              <div className="font-bold text-gray-900 dark:text-gray-100">
                                ฿{fmt(futVal)}
                              </div>
                              {diff > 0 ? (
                                <span className="text-[10px] font-bold text-rose-500">
                                  +฿{fmt(diff)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-sans">
                                  {cat.isFixed ? "ภาระคงที่" : "-"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>

                  {/* Salary Projection */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                      <span>เงินเดือนปัจจุบัน</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-gray-100">฿{fmt(state.salary)} / ด.</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                      <span>เงินเดือนในอนาคต (ตัวเลขระบุ)</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">฿{fmt(state.futureSalary)} / ด.</span>
                    </div>
                  </div>
                  
                  {/* Real Value Callout with Tooltip */}
                  <div className="flex justify-between items-center mt-2 p-3.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <div className="font-bold text-base text-gray-900 dark:text-white">อำนาจซื้อจริง (Real Value)</div>
                        <InfoTooltip title="อำนาจซื้อจริง (Real Purchasing Power)" position="top" align="left">
                          มูลค่าเงินเดือนในอนาคตที่หักผลกระทบจากเงินเฟ้อแล้ว หากตัวเลขนี้น้อยกว่าเงินเดือนปัจจุบัน แปลว่าเงินเดือนที่เพิ่มขึ้นยังโตไม่ทันอัตราเงินเฟ้อ
                        </InfoTooltip>
                      </div>
                      <div className="text-xs text-gray-400">เทียบเท่ามูลค่าเงินในปัจจุบัน</div>
                    </div>
                    <span className={`font-mono font-extrabold text-lg sm:text-xl ${state.realPurchasingPower >= state.salary ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      ฿{fmt(state.realPurchasingPower)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
