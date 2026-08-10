import React from 'react';
import { SCENARIOS, Scenario, ScenarioDef, Severity } from "./wealthPlanTypes";

interface WealthPlanFormProps {
  state: any;
  actions: any;
}

const getIcon = (name: string, sizeStr: string = '18px') => {
  if (name === 'Suitcase') return <i className="fi fi-sr-briefcase" style={{ fontSize: sizeStr }}></i>;
  if (name === 'Hospital') return <i className="fi fi-sr-hospital" style={{ fontSize: sizeStr }}></i>;
  return <i className="fi fi-sr-car" style={{ fontSize: sizeStr }}></i>;
};

export default function WealthPlanForm({ state, actions }: WealthPlanFormProps) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const scenarioDef = state.selectedScenario ? SCENARIOS[state.selectedScenario as Scenario] : null;

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-sub)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 m-0 pb-1">
            Integrated Wealth Plan
          </h1>
          <p className="text-[14px] text-gray-500 m-0">
            รวบรวมข้อมูลการเงินของคุณ เพื่อจัดสรรเงิน ทดสอบวิกฤต และคาดการณ์เงินเฟ้อ
          </p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button className="px-6 py-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm text-sm font-bold text-blue-600 transition-all">
            <span className="w-5 h-5 inline-flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mr-2 text-[10px]">1</span>
            Wealth Plan
          </button>
          <button 
            className="px-6 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
            onClick={() => actions.setPage(1)}
          >
            <span className="w-5 h-5 inline-flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-full mr-2 text-[10px]">2</span>
            Dashboard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: SHARED INPUTS */}
        <div className="bg-[var(--bg-main)] p-6 rounded-2xl border border-[var(--border)] shadow-xl shadow-blue-900/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -z-10 group-hover:bg-blue-500/20 transition-all duration-500"></div>
          
          <div className="flex items-center gap-2 text-lg font-bold mb-5 text-gray-800 dark:text-gray-100">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
              <i className="fi fi-sr-wallet"></i>
            </div>
            ข้อมูลการเงินปัจจุบัน
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">เงินเก็บทั้งหมดที่มีตอนนี้ (บาท)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">฿</span>
                <input 
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                  type="number" 
                  value={state.totalCapital || ''} 
                  onChange={e => actions.setTotalCapital(Number(e.target.value))} 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">เงินเดือน/รายได้ปัจจุบัน (บาท)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">฿</span>
                <input 
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                  type="number" 
                  value={state.salary || ''} 
                  onChange={e => actions.setSalary(Number(e.target.value))} 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">พร้อมแบ่งไปลงทุนทุกเดือน (DCA)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">฿</span>
                <input 
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                  type="number" 
                  value={state.monthlyInvestment || ''} 
                  onChange={e => actions.setMonthlyInvestment(Number(e.target.value))} 
                />
              </div>
            </div>
          </div>

          <hr className="my-8 border-gray-200 dark:border-gray-800" />

          <div className="flex items-center gap-2 text-lg font-bold mb-5 text-gray-800 dark:text-gray-100">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
              <i className="fi fi-sr-money-bill-wave"></i>
            </div>
            รายจ่ายต่อเดือน
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "food", label: "ค่าอาหาร", icon: "fi-sr-restaurant", color: "text-orange-500" },
              { key: "rent", label: "ค่าที่พักอาศัย", icon: "fi-sr-home", color: "text-blue-500" },
              { key: "transport", label: "ค่าเดินทาง", icon: "fi-sr-car", color: "text-indigo-500" },
              { key: "necessities", label: "ของใช้จำเป็น", icon: "fi-sr-shopping-cart", color: "text-pink-500" },
              { key: "debt", label: "ภาระหนี้สิน", icon: "fi-sr-bank", color: "text-red-500" },
              { key: "other", label: "ค่าอื่นๆ", icon: "fi-sr-plane", color: "text-teal-500" },
            ].map(item => (
              <div key={item.key}>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                  <i className={`fi ${item.icon} ${item.color}`}></i> {item.label}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">฿</span>
                  <input 
                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-8 pr-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                    type="number" 
                    value={state.expenses[item.key] || ''} 
                    onChange={e => actions.handleExp(item.key, Number(e.target.value))} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl flex justify-between items-center border border-gray-200 dark:border-gray-800">
            <span className="font-bold text-gray-500">รวมรายจ่าย:</span>
            <span className="font-bold text-lg text-gray-900 dark:text-white">฿{fmt(state.totalMonthlyExpense)} <span className="text-sm font-normal text-gray-500">/ เดือน</span></span>
          </div>

          <div className="mt-6">
            <button 
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2"
              onClick={() => actions.handleSave(true)}
            >
              <i className="fi fi-sr-disk"></i> บันทึกข้อมูลการเงิน
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: STACKED ACCORDIONS */}
        <div className="flex flex-col gap-4">
          
          {/* SECTION 1: ALLOCATION */}
          <div className="bg-[var(--bg-main)] rounded-2xl border-2 border-blue-500 shadow-xl shadow-blue-900/5 overflow-hidden transition-all">
            <button 
              onClick={() => actions.setIsAllocationOpen(!state.isAllocationOpen)}
              className="w-full flex justify-between items-center p-5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-lg text-blue-600">
                <i className="fi fi-sr-chart-pie-alt"></i> แผนจัดสรรเงิน (Allocation)
              </div>
              <div className={`w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 transition-transform ${state.isAllocationOpen ? 'rotate-180' : ''}`}>
                <i className="fi fi-sr-angle-down"></i>
              </div>
            </button>
            
            {state.isAllocationOpen && (
              <div className="p-5 pt-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">เป้าหมายเงินสำรอง (จำนวนเดือน)</label>
                  <select 
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none appearance-none" 
                    value={state.reserveMonths} 
                    onChange={e => actions.setReserveMonths(Number(e.target.value))}
                  >
                    <option value={3}>3 เดือน (ความเสี่ยงสูง)</option>
                    <option value={6}>6 เดือน (มาตรฐาน)</option>
                    <option value={12}>12 เดือน (ปลอดภัยมาก)</option>
                  </select>
                </div>

                <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl mt-5 border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-end mb-3">
                    <div className="text-sm font-semibold text-gray-500">เงินเก็บรวมของคุณ</div>
                    <div className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono tracking-tight">฿{fmt(state.totalCapital)}</div>
                  </div>
                  <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex shadow-inner">
                    {state.totalCapital > 0 && (
                      <>
                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.min(100, (Math.min(state.totalCapital, state.emergencyRequired) / state.totalCapital) * 100)}%` }}></div>
                        {state.totalCapital > state.emergencyRequired && (
                          <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${((state.totalCapital - state.emergencyRequired) / state.totalCapital) * 100}%` }}></div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-5">
                  <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> กันไว้เป็นเงินสำรอง
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mb-2 font-mono">฿{fmt(Math.min(state.totalCapital, state.emergencyRequired))}</div>
                    {state.totalCapital < state.emergencyRequired ? (
                      <div className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1">
                        <i className="fi fi-sr-exclamation"></i> ขาดอีก ฿{fmt(state.emergencyRequired - state.totalCapital)}
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1">
                        <i className="fi fi-sr-check-circle"></i> เป้าหมาย {state.reserveMonths} เดือน ✓
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> เงินพร้อมสำหรับลงทุน
                    </div>
                    <div className="text-lg font-bold text-emerald-500 mb-2 font-mono">฿{fmt(state.initialInvestment)}</div>
                    <div className="text-xs font-semibold text-gray-500 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                      {state.initialInvestment > 0 ? "นำไปจัดพอร์ตได้เลย!" : "รอให้เงินสำรองครบก่อน"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: EMERGENCY STRESS TEST */}
          <div className="bg-[var(--bg-main)] rounded-2xl shadow-xl shadow-gray-900/5 overflow-hidden transition-all" style={{ border: `2px solid ${scenarioDef ? scenarioDef.color : 'var(--border)'}` }}>
            <button 
              onClick={() => actions.setIsEmergencyOpen(!state.isEmergencyOpen)}
              className="w-full flex justify-between items-center p-5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-lg" style={{ color: scenarioDef ? scenarioDef.color : 'var(--text-main)' }}>
                {scenarioDef ? getIcon(scenarioDef.icon) : <i className="fi fi-sr-shield text-[18px]"></i>} ทดสอบวิกฤต (Stress Test)
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 transition-transform" style={{ transform: state.isEmergencyOpen ? 'rotate(180deg)' : '' }}>
                <i className="fi fi-sr-angle-down"></i>
              </div>
            </button>
            
            {state.isEmergencyOpen && (
              <div className="p-5 pt-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="grid grid-cols-3 gap-3 mt-4 mb-5">
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
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${active ? 'shadow-md scale-105' : 'hover:bg-gray-50 dark:hover:bg-gray-800 opacity-70 hover:opacity-100 border-transparent'}`}
                        style={{ borderColor: active ? def.color : 'transparent', background: active ? `${def.color}15` : '' }}
                      >
                        <div className="text-xl mb-1" style={{ color: active ? def.color : 'inherit' }}>{getIcon(def.icon, '20px')}</div>
                        <div className="text-xs font-bold" style={{ color: active ? def.color : 'inherit' }}>{def.title}</div>
                      </button>
                    );
                  })}
                </div>

                {scenarioDef && scenarioDef.hasSeverity && (
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">ระดับความรุนแรง</label>
                      <select 
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" 
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
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">ค่ารักษาพยาบาล (รวมทั้งเราและคู่กรณี) (บาท)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">฿</span>
                          <input type="number" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-8 pr-3 text-sm font-semibold outline-none" value={state.customMedicalCost === 0 ? '' : state.customMedicalCost} onChange={e => actions.setCustomMedicalCost(Number(e.target.value))} />
                        </div>
                      </div>
                    )}

                    {state.selectedScenario === 'accident' && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5">คุณเป็นฝ่ายผิดหรือไม่?</label>
                          <select className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 text-sm font-semibold outline-none" value={state.isAtFault ? "yes" : "no"} onChange={e => actions.setIsAtFault(e.target.value === "yes")}>
                            <option value="no">ฝ่ายถูก (คู่กรณีรับผิดชอบ)</option>
                            <option value="yes">ฝ่ายผิด</option>
                          </select>
                        </div>

                        {state.isAtFault && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">ค่าซ่อมรถเรา (บาท)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">฿</span>
                                <input type="number" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-8 pr-3 text-sm font-semibold outline-none" value={state.customVehicleCost === 0 ? '' : state.customVehicleCost} onChange={e => actions.setCustomVehicleCost(Number(e.target.value))} />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">ค่าซ่อมรถคู่กรณี (บาท)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">฿</span>
                                <input type="number" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-8 pr-3 text-sm font-semibold outline-none" value={state.customThirdPartyCost === 0 ? '' : state.customThirdPartyCost} onChange={e => actions.setCustomThirdPartyCost(Number(e.target.value))} />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {scenarioDef && (state.selectedScenario === 'illness' || (state.selectedScenario === 'accident' && state.severity !== 'none')) && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">ความคุ้มครอง: ประกันสุขภาพ / อุบัติเหตุ</label>
                    <select className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 text-sm font-semibold outline-none" value={state.selectedHealthInsId || ""} onChange={e => actions.setSelectedHealthInsId(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">ไม่มี (จ่ายเองทั้งหมด)</option>
                      {state.insurancePlans.filter((p: any) => p.category === "health_life").map((plan: any) => (
                        <option key={plan.id} value={plan.id}>{plan.company} - {plan.planName}</option>
                      ))}
                    </select>
                  </div>
                )}

                {scenarioDef && state.selectedScenario === 'accident' && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">ความคุ้มครอง: ประกันรถยนต์</label>
                    <select className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 text-sm font-semibold outline-none" value={state.selectedVehicleInsId || ""} onChange={e => actions.setSelectedVehicleInsId(e.target.value ? Number(e.target.value) : null)}>
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

                {scenarioDef && (
                  <>
                    <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl mt-5 border border-gray-100 dark:border-gray-700">
                      <div className="text-sm font-extrabold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                        <i className="fi fi-sr-receipt text-gray-400"></i> สรุปภาระค่าใช้จ่ายจากสถานการณ์นี้
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">ค่าครองชีพช่วงฟื้นตัว ({state.e_recoveryMonths} เดือน)</span><span className="font-bold">฿{fmt(state.e_livingCost)}</span></div>
                        
                        {state.e_medicalCost > 0 && (
                          <>
                            <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">ค่ารักษาพยาบาล</span><span className="font-bold">฿{fmt(state.e_medicalCost)}</span></div>
                            {state.coveredMedicalByPrb > 0 && <div className="flex justify-between items-center text-emerald-600"><span className="font-medium">- พ.ร.บ. ช่วยจ่าย</span><span className="font-bold">-฿{fmt(state.coveredMedicalByPrb)}</span></div>}
                            {state.coveredMedicalByHealth > 0 && <div className="flex justify-between items-center text-emerald-600"><span className="font-medium">- ประกันสุขภาพช่วยจ่าย</span><span className="font-bold">-฿{fmt(state.coveredMedicalByHealth)}</span></div>}
                          </>
                        )}
                        {state.e_vehicleCost > 0 && (
                          <>
                            <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">ค่าซ่อมรถเรา</span><span className="font-bold">฿{fmt(state.e_vehicleCost)}</span></div>
                            {state.coveredVehicle > 0 && <div className="flex justify-between items-center text-emerald-600"><span className="font-medium">- ประกันช่วยจ่าย</span><span className="font-bold">-฿{fmt(state.coveredVehicle)}</span></div>}
                            {!state.isAtFault && state.e_vehicleCost > 0 && <div className="flex justify-between items-center text-emerald-600"><span className="font-medium">- คู่กรณีรับผิดชอบ</span><span className="font-bold">-฿{fmt(state.e_vehicleCost)}</span></div>}
                          </>
                        )}
                        {state.e_thirdPartyCost > 0 && (
                          <>
                            <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">ค่าซ่อมรถ/ทรัพย์สินคู่กรณี</span><span className="font-bold">฿{fmt(state.e_thirdPartyCost)}</span></div>
                            {state.coveredThirdParty > 0 && <div className="flex justify-between items-center text-emerald-600"><span className="font-medium">- ประกันช่วยจ่าย</span><span className="font-bold">-฿{fmt(state.coveredThirdParty)}</span></div>}
                            {!state.isAtFault && state.e_thirdPartyCost > 0 && <div className="flex justify-between items-center text-emerald-600"><span className="font-medium">- คู่กรณีรับผิดชอบ</span><span className="font-bold">-฿{fmt(state.e_thirdPartyCost)}</span></div>}
                          </>
                        )}
                        
                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-3"></div>
                        <div className="flex justify-between items-center text-base"><span className="font-extrabold text-gray-800 dark:text-gray-200">รวมค่าใช้จ่ายส่วนต่างที่ต้องจ่ายเอง</span><span className="font-extrabold text-red-500">฿{fmt(state.e_totalCost)}</span></div>
                      </div>
                    </div>

                    <div className={`mt-5 p-5 rounded-xl border-2 flex flex-col items-center text-center ${state.e_survived ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500/30' : 'bg-red-50 dark:bg-red-900/10 border-red-500/30'}`}>
                      <div className={`flex items-center gap-2 text-lg font-extrabold mb-2 ${state.e_survived ? 'text-emerald-600' : 'text-red-500'}`}>
                        <i className={`fi ${state.e_survived ? 'fi-sr-check-circle' : 'fi-sr-cross-circle'} text-2xl`}></i>
                        {state.e_survived ? 'เงินสำรองคุณเพียงพอ!' : 'เงินสำรองไม่พอ!'}
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-300 max-w-sm">
                        {state.e_survived 
                          ? `เงินเก็บปัจจุบัน (฿${fmt(state.totalCapital)}) มากพอจ่ายวิกฤตนี้ และยังเหลือเงิน ฿${fmt(state.totalCapital - state.e_totalCost)}`
                          : `คุณยังขาดเงินอีก ฿${fmt(state.e_shortfall)} เพื่อรับมือกับวิกฤตนี้! แนะนำให้เพิ่มเป้าหมายเงินสำรอง`
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: INFLATION */}
          <div className="bg-[var(--bg-main)] rounded-2xl border-2 border-yellow-500/50 shadow-xl shadow-yellow-900/5 overflow-hidden transition-all">
            <button 
              onClick={() => actions.setIsInflationOpen(!state.isInflationOpen)}
              className="w-full flex justify-between items-center p-5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-lg text-yellow-600">
                <i className="fi fi-sr-arrow-trend-up"></i> คาดการณ์เงินเฟ้อ 
                <span className="text-xs ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 rounded-full font-bold">ปัจจุบัน {state.currentInflationRate !== null ? state.currentInflationRate : 3.0}%</span>
              </div>
              <div className={`w-8 h-8 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600 transition-transform ${state.isInflationOpen ? 'rotate-180' : ''}`}>
                <i className="fi fi-sr-angle-down"></i>
              </div>
            </button>
            
            {state.isInflationOpen && (
              <div className="p-5 pt-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 flex justify-between"><span>ระยะเวลา</span> <span className="text-blue-600">{state.timeline} ปี</span></label>
                    <input type="range" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" min="1" max="30" value={state.timeline} onChange={e => actions.setTimeline(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 flex justify-between"><span>เงินเฟ้อ</span> <span className="text-red-500">{state.inflationRate || 0}% / ปี</span></label>
                    <input type="range" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500" min="0" max="10" step="0.01" value={state.inflationRate || 0} onChange={e => actions.setInflationRate(Number(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 flex justify-between"><span>เงินเดือนขึ้นโดยเฉลี่ย</span> <span className="text-emerald-500">{state.salaryGrowth}% / ปี</span></label>
                    <input type="range" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" min="0" max="15" step="0.5" value={state.salaryGrowth} onChange={e => actions.setSalaryGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl mt-6 border border-gray-100 dark:border-gray-700 space-y-3 text-sm">
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">รายจ่ายปัจจุบัน</span><span className="font-bold">฿{fmt(state.totalMonthlyExpense)} / ด.</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">รายจ่ายในอีก {state.timeline} ปี</span><span className="font-bold text-red-500">฿{fmt(state.futureExpense)} / ด.</span></div>
                  <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">เงินเดือนปัจจุบัน</span><span className="font-bold">฿{fmt(state.salary)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">เงินเดือนในอนาคต (ตัวเลข)</span><span className="font-bold text-emerald-500">฿{fmt(state.futureSalary)}</span></div>
                  <div className="flex justify-between items-center mt-2 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
                    <span className="font-extrabold text-gray-800 dark:text-gray-200">อำนาจซื้อจริง (Real Value)</span>
                    <span className={`font-extrabold text-lg ${state.realPurchasingPower > state.salary ? 'text-emerald-500' : 'text-red-500'}`}>฿{fmt(state.realPurchasingPower)}</span>
                  </div>
                </div>
                
                <div className="mt-4 text-[11px] text-gray-400 leading-relaxed bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <span className="text-blue-500 font-bold mr-1"><i className="fi fi-sr-info"></i> Note:</span> อำนาจซื้อจริง (Real Purchasing Power) คือ มูลค่าเงินเดือนในอนาคตเมื่อถูกหักล้างด้วยเงินเฟ้อ หากตัวเลขนี้น้อยกว่าเงินเดือนปัจจุบัน แปลว่าคุณจะ "จนลง" ในทางปฏิบัติแม้ตัวเลขเงินเดือนจะเพิ่มขึ้น
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
