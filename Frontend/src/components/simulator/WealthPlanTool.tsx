"use client";
import "../ui/PortnTax.css";
import "../ui/EmergencyFundTool.css";
import "../ui/InflationTool.css";
import "../ui/WealthPlanTool.css";
import React, { useState, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import AiAdvisor from "@/components/simulator/AiAdvisor";
import { API_BASE_URL } from "@/lib/api";

// --- Types for Emergency ---
type Scenario = 'job_loss' | 'illness' | 'accident';
type Severity  = 'mild' | 'moderate' | 'severe';
interface SeverityDef { label: string; medicalCost: number; vehicleCost: number; recoveryMonths: number; }
interface ScenarioDef { icon: string; title: string; subtitle: string; desc: string; color: string; hasSeverity: boolean; severities?: Record<Severity, SeverityDef>; }

const SCENARIOS: Record<Scenario, ScenarioDef> = {
  job_loss: { icon: 'Suitcase', title: 'ตกงาน', subtitle: 'Job Loss', desc: 'สูญเสียรายได้กะทันหัน ต้องใช้เงินสำรองระหว่างหางานใหม่', color: '#f59e0b', hasSeverity: false },
  illness: { icon: 'Hospital', title: 'เจ็บป่วย', subtitle: 'Illness', desc: 'ค่ารักษาพยาบาล + รายได้ที่หายไประหว่างพักฟื้น', color: '#ef4444', hasSeverity: true, severities: { mild: { label: 'เล็กน้อย (ผู้ป่วยนอก)', medicalCost: 20000, vehicleCost: 0, recoveryMonths: 1 }, moderate: { label: 'ปานกลาง (นอนโรงพยาบาล 1–2 สัปดาห์)', medicalCost: 120000, vehicleCost: 0, recoveryMonths: 2 }, severe: { label: 'รุนแรง (ผ่าตัด / ICU)', medicalCost: 380000, vehicleCost: 0, recoveryMonths: 5 } } },
  accident: { icon: 'Car', title: 'อุบัติเหตุ', subtitle: 'Accident', desc: 'ค่ารักษา + ซ่อมยานพาหนะ + รายได้ที่หายระหว่างฟื้นตัว', color: '#8b5cf6', hasSeverity: true, severities: { mild: { label: 'บาดเจ็บเล็กน้อย (ไม่นอนโรงพยาบาล)', medicalCost: 15000, vehicleCost: 25000, recoveryMonths: 1 }, moderate: { label: 'บาดเจ็บปานกลาง (นอนรพ. ~1 สัปดาห์)', medicalCost: 80000, vehicleCost: 60000, recoveryMonths: 2 }, severe: { label: 'บาดเจ็บสาหัส (ผ่าตัด / กระดูกหัก)', medicalCost: 280000, vehicleCost: 120000, recoveryMonths: 5 } } },
};

const getIcon = (name: string, sizeStr: string = '18px') => {
  if (name === 'Suitcase') return <i className="fi fi-sr-briefcase" style={{ fontSize: sizeStr }}></i>;
  if (name === 'Hospital') return <i className="fi fi-sr-hospital" style={{ fontSize: sizeStr }}></i>;
  return <i className="fi fi-sr-car" style={{ fontSize: sizeStr }}></i>;
};

export default function WealthPlanTool() {
  const { financeData, loading, updateAssets, updateExpenses, saveFinanceData, isDirty } = useFinance();

  const [page, setPage] = useLocalStorage("wpt_page", 0);
  const [isEmergencyOpen, setIsEmergencyOpen] = useLocalStorage("wpt_isEmergencyOpen", false);
  const [isInflationOpen, setIsInflationOpen] = useLocalStorage("wpt_isInflationOpen", false);
  const [isAllocationOpen, setIsAllocationOpen] = useLocalStorage("wpt_isAllocationOpen", true);

  // Shared States
  const [totalCapital, setTotalCapital] = useLocalStorage("wpt_totalCapital", 0);
  const [monthlyInvestment, setMonthlyInvestment] = useLocalStorage("wpt_monthlyInvestment", 0);
  const [expenses, setExpenses] = useLocalStorage("wpt_expenses", {
    food: 0, rent: 0, transport: 0, necessities: 0, other: 0, debt: 0
  });

  // Allocation specific
  const [reserveMonths, setReserveMonths] = useLocalStorage("wpt_reserveMonths", 6);

  // Emergency specific
  const [selectedScenario, setSelectedScenario] = useLocalStorage<Scenario>("wpt_selectedScenario", 'job_loss');
  const [severity, setSeverity] = useLocalStorage<Severity>("wpt_severity", 'moderate');

  // Insurance specific
  const [healthInsType, setHealthInsType] = useLocalStorage("wpt_healthInsType", "none");
  const [healthInsManual, setHealthInsManual] = useLocalStorage("wpt_healthInsManual", 0);
  const [vehicleInsType, setVehicleInsType] = useLocalStorage("wpt_vehicleInsType", "none");
  const [vehicleInsManual, setVehicleInsManual] = useLocalStorage("wpt_vehicleInsManual", 0);

  // Inflation specific
  const [timeline, setTimeline] = useLocalStorage("wpt_timeline", 10);
  const [inflationRate, setInflationRate] = useLocalStorage("wpt_inflationRate", 3);
  const [currentInflationRate, setCurrentInflationRate] = useState<number | null>(null);
  const [salary, setSalary] = useLocalStorage("wpt_salary", 40000);
  const [salaryGrowth, setSalaryGrowth] = useLocalStorage("wpt_salaryGrowth", 5);

  useEffect(() => {
    // Fetch Current Thailand Inflation Rate
    fetch(`${API_BASE_URL}/simulator/inflation`)
      .then(res => res.json())
      .then(data => {
        if (data && data.inflationRate !== undefined) {
          setCurrentInflationRate(data.inflationRate);
          // Only update inflationRate if user hasn't explicitly modified it from the default 3
          setInflationRate(prev => prev === 3 ? data.inflationRate : prev);
        }
      })
      .catch(err => console.error("Failed to fetch inflation rate:", err));
  }, []);

  useEffect(() => {
    if (loading) return;
    
    // Only set from DB if we don't have local data, or if DB data exists
    if (financeData.assets.currentCapital > 0) setTotalCapital(financeData.assets.currentCapital);
    if (financeData.assets.monthlySavings > 0) setMonthlyInvestment(financeData.assets.monthlySavings);
    
    if (financeData.expenses.food > 0 || financeData.expenses.rent > 0 || financeData.expenses.transport > 0) {
      setExpenses({
        food: financeData.expenses.food || 0,
        rent: financeData.expenses.rent || 0,
        transport: financeData.expenses.transport || 0,
        necessities: financeData.expenses.necessities || 0,
        other: financeData.expenses.other || 0,
        debt: financeData.expenses.debt || 0,
      });
    }
    
    if (financeData.assets.monthlyIncome > 0) setSalary(financeData.assets.monthlyIncome);

    const totalExp = Object.values(financeData.expenses).reduce((a, b) => a + (b||0), 0);
    if (totalExp > 0 && financeData.assets.emergencyFund > 0) {
        const m = Math.round(financeData.assets.emergencyFund / totalExp);
        if ([3, 6, 12].includes(m)) setReserveMonths(m);
    }
  }, [financeData, loading]);

  const totalMonthlyExpense = Object.values(expenses).reduce((a, b) => a + (b || 0), 0);
  const totalMonthlyExpenseNoDebt = totalMonthlyExpense - expenses.debt;

  // Derived - Allocation
  const emergencyRequired = totalMonthlyExpense * reserveMonths;
  const initialInvestment = Math.max(0, totalCapital - emergencyRequired);

  // Derived - Emergency
  const scenarioDef = selectedScenario ? SCENARIOS[selectedScenario as Scenario] : null;
  let e_recoveryMonths = reserveMonths;
  let e_medicalCost = 0;
  let e_vehicleCost = 0;
  if (selectedScenario === 'job_loss') {
    e_recoveryMonths = reserveMonths; 
  } else if (selectedScenario && scenarioDef) {
    const sev = scenarioDef.severities![severity];
    e_recoveryMonths = sev.recoveryMonths;
    e_medicalCost = sev.medicalCost;
    e_vehicleCost = sev.vehicleCost;
  }
  
  const getHealthCoverage = () => {
    if (healthInsType === "100k") return 100000;
    if (healthInsType === "300k") return 300000;
    if (healthInsType === "500k") return 500000;
    if (healthInsType === "other") return healthInsManual;
    return 0;
  };
  const getVehicleCoverage = () => {
    if (vehicleInsType === "class1") return 1000000;
    if (vehicleInsType === "class2") return 100000;
    if (vehicleInsType === "other") return vehicleInsManual;
    return 0;
  };
  const healthCoverage = getHealthCoverage();
  const vehicleCoverage = getVehicleCoverage();

  const netMedicalCost = Math.max(0, e_medicalCost - healthCoverage);
  const coveredMedical = Math.min(e_medicalCost, healthCoverage);
  const netVehicleCost = Math.max(0, e_vehicleCost - vehicleCoverage);
  const coveredVehicle = Math.min(e_vehicleCost, vehicleCoverage);
  const e_livingCost = totalMonthlyExpense * (selectedScenario ? e_recoveryMonths : 0);
  const e_totalCost = netMedicalCost + netVehicleCost + e_livingCost;
  const e_shortfall = Math.max(0, e_totalCost - totalCapital);
  const e_survived = totalCapital >= e_totalCost;

  // Derived - Inflation
  const cumulativeInflation = Math.pow(1 + (inflationRate / 100), timeline) - 1;
  const futureExpense = (totalMonthlyExpenseNoDebt * (1 + cumulativeInflation)) + expenses.debt;
  const futureSalary = salary * Math.pow(1 + (salaryGrowth / 100), timeline);
  const realPurchasingPower = futureSalary / Math.pow(1 + (inflationRate / 100), timeline);

  const handleSave = async (showToast = true) => {
    const updatedData = {
      ...financeData,
      assets: {
        ...financeData.assets,
        currentCapital: totalCapital,
        monthlySavings: monthlyInvestment,
        emergencyFund: emergencyRequired,
        monthlyIncome: salary
      },
      expenses: {
        ...financeData.expenses,
        ...expenses
      }
    };

    updateAssets(updatedData.assets);
    updateExpenses(updatedData.expenses);
    await saveFinanceData(true, updatedData);
    if (showToast) alert("บันทึกข้อมูลการเงินเรียบร้อยแล้ว!");
  };

  // Auto-save debounced
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      handleSave(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [totalCapital, monthlyInvestment, salary, expenses, emergencyRequired, loading]);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const handleExp = (k: keyof typeof expenses, v: number) => setExpenses(prev => ({...prev, [k]: v}));

  // Context setup for AI Advisor
  const emergencyFund = reserveMonths > 0 ? reserveMonths * totalMonthlyExpense : 0;
  const investmentAmount = Math.max(0, totalCapital - emergencyFund);
  const contextItems = [];
  if (totalCapital > 0) contextItems.push({ label: "เงินเก็บทั้งหมด", value: `฿${totalCapital.toLocaleString()}` });
  if (reserveMonths > 0) contextItems.push({ label: "เป้าหมายสำรอง", value: `${reserveMonths} เดือน (฿${emergencyFund.toLocaleString()})` });
  if (investmentAmount > 0) contextItems.push({ label: "เงินพร้อมลงทุน", value: `฿${investmentAmount.toLocaleString()}` });
  if (selectedScenario) {
    const scText = selectedScenario === "job_loss" ? "ตกงาน" : selectedScenario === "illness" ? "เจ็บป่วย" : selectedScenario === "accident" ? "อุบัติเหตุ" : selectedScenario;
    contextItems.push({ label: "วิกฤตที่กังวล", value: `${scText} (${severity})` });
  }
  if (inflationRate > 0) contextItems.push({ label: "เงินเฟ้อ", value: `${inflationRate}% ต่อปี` });
  if (salary > 0) contextItems.push({ label: "รายได้ประจำ", value: `฿${salary.toLocaleString()}/ด.` });

  return (
    <div className="tool-screen active">
      {page === 0 && (
        <div className="tool-page active">
          <div className="tool-header rt-tool-header-flex">
            <div>
              <div className="tool-title wpt-title-margin">Integrated <span>Wealth Plan</span></div>
              <div className="tool-sub wpt-title-margin">รวบรวมข้อมูลการเงินของคุณ เพื่อจัดสรรเงิน ทดสอบวิกฤต และคาดการณ์เงินเฟ้อ</div>
            </div>
            <div className="page-nav" style={{ marginBottom: 0 }}>
              <button className={`page-btn active`}>
                <span className="num">1</span>Wealth Plan
              </button>
              <button className={`page-btn`} onClick={() => setPage(1)}>
                <span className="num">2</span>AI แนะนำพอร์ต
              </button>
            </div>
          </div>

      <div className="grid2 wpt-grid-container">
        {/* LEFT COLUMN: SHARED INPUTS */}
        <div className="card">
          <div className="card-title wpt-card-header">
            <i className="fi fi-sr-wallet wpt-icon-18"></i> ข้อมูลการเงินปัจจุบัน
          </div>
          
          <div className="form-group">
            <label className="form-label">เงินเก็บทั้งหมดที่มีตอนนี้ (บาท)</label>
            <div className="form-input-prefix"><span>฿</span>
              <input className="form-input" type="number" value={totalCapital || ''} onChange={e => setTotalCapital(Number(e.target.value))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">เงินเดือน/รายได้ปัจจุบัน (บาท)</label>
            <div className="form-input-prefix"><span>฿</span>
              <input className="form-input" type="number" value={salary || ''} onChange={e => setSalary(Number(e.target.value))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">พร้อมแบ่งไปลงทุนทุกเดือน เดือนละ (DCA)</label>
            <div className="form-input-prefix"><span>฿</span>
              <input className="form-input" type="number" value={monthlyInvestment || ''} onChange={e => setMonthlyInvestment(Number(e.target.value))} />
            </div>
          </div>

          <div className="divider wpt-divider-margin"></div>

          <div className="card-title wpt-card-header">
            <i className="fi fi-sr-money-bill-wave wpt-icon-18"></i> รายจ่ายต่อเดือน
          </div>
          {[
            { key: "food", label: "ค่าอาหาร", icon: "fi-sr-restaurant" },
            { key: "rent", label: "ค่าที่พักอาศัย", icon: "fi-sr-home" },
            { key: "transport", label: "ค่าเดินทาง", icon: "fi-sr-car" },
            { key: "necessities", label: "ค่าของใช้จำเป็น", icon: "fi-sr-shopping-cart" },
            { key: "debt", label: "ภาระหนี้สิน", icon: "fi-sr-bank" },
            { key: "other", label: "ค่าอื่นๆ", icon: "fi-sr-plane" },
          ].map(item => (
            <div className="form-group wpt-expense-group" key={item.key}>
              <label className="form-label wpt-expense-label">
                <i className={`fi ${item.icon} wpt-icon-14`}></i> {item.label}
              </label>
              <div className="form-input-prefix"><span>฿</span>
                <input className="form-input" type="number" value={expenses[item.key as keyof typeof expenses] || ''} onChange={e => handleExp(item.key as any, Number(e.target.value))} />
              </div>
            </div>
          ))}

          <div className="wpt-total-summary">
            <span>รวมรายจ่าย:</span>
            <span>฿{fmt(totalMonthlyExpense)} / เดือน</span>
          </div>

          <div className="wpt-save-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className="btn btn-primary btn-full" onClick={handleSave}>
              บันทึกข้อมูลการเงิน
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: STACKED ACCORDIONS */}
        <div className="wpt-right-col">
          
          {/* SECTION 1: ALLOCATION */}
          <div className="card wpt-accordion-card" style={{ border: '2px solid var(--accent-blue)' }}>
            <button 
              onClick={() => setIsAllocationOpen(!isAllocationOpen)}
              className="wpt-accordion-btn"
            >
              <div className="wpt-accordion-title" style={{ color: 'var(--accent-blue)' }}>
                <i className="fi fi-sr-chart-pie-alt wpt-icon-18"></i> แผนจัดสรรเงิน (Allocation)
              </div>
              <i className={`fi ${isAllocationOpen ? 'fi-sr-angle-small-up' : 'fi-sr-angle-small-down'}`} style={{ color: 'var(--text-muted)' }}></i>
            </button>
            
            {isAllocationOpen && (
              <div className="wpt-accordion-content">
                <div className="form-group wpt-form-group-no-mt">
                <label className="form-label">เป้าหมายเงินสำรอง (จำนวนเดือน)</label>
                <select className="form-select" value={reserveMonths} onChange={e => setReserveMonths(Number(e.target.value))}>
                  <option value={3}>3 เดือน (ความเสี่ยงสูง)</option>
                  <option value={6}>6 เดือน (มาตรฐาน)</option>
                  <option value={12}>12 เดือน (ปลอดภัยมาก)</option>
                </select>
              </div>

              <div className="wpt-summary-box">
                <div className="wpt-flex-between">
                  <div className="wpt-text-bold-14">เงินเก็บรวมของคุณ</div>
                  <div className="wpt-text-val-20">฿{fmt(totalCapital)}</div>
                </div>
                <div className="wpt-progress-bar-container">
                  {totalCapital > 0 && (
                    <>
                      <div style={{ width: `${Math.min(100, (Math.min(totalCapital, emergencyRequired) / totalCapital) * 100)}%`, background: 'var(--text-main)', height: '100%' }}></div>
                      {totalCapital > emergencyRequired && (
                        <div style={{ width: `${((totalCapital - emergencyRequired) / totalCapital) * 100}%`, background: 'var(--green)', height: '100%' }}></div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="wpt-grid-2-gap-12">
                <div className="wpt-stat-card">
                  <div className="wpt-stat-label">
                    <div className="wpt-dot" style={{ background: 'var(--text-main)' }}></div> กันไว้เป็นเงินสำรอง
                  </div>
                  <div className="wpt-text-val-20">฿{fmt(Math.min(totalCapital, emergencyRequired))}</div>
                  {totalCapital < emergencyRequired ? (
                    <div className="wpt-alert-danger">
                      <i className="fi fi-sr-exclamation" style={{ marginRight: '4px' }}></i> ขาดอีก ฿{fmt(emergencyRequired - totalCapital)}
                    </div>
                  ) : (
                    <div className="wpt-alert-muted">เป้าหมาย {reserveMonths} เดือน ✓</div>
                  )}
                </div>

                <div className="wpt-stat-card">
                  <div className="wpt-stat-label">
                    <div className="wpt-dot" style={{ background: 'var(--green)' }}></div> เงินพร้อมสำหรับลงทุน
                  </div>
                  <div className="wpt-text-val-20" style={{ color: 'var(--green)' }}>฿{fmt(initialInvestment)}</div>
                  <div className="wpt-alert-muted">
                    {initialInvestment > 0 ? "นำไปจัดพอร์ตได้เลย!" : "รอให้เงินสำรองครบก่อน"}
                  </div>
                </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: EMERGENCY STRESS TEST */}
          <div className="card wpt-accordion-card" style={{ border: `2px solid ${scenarioDef ? scenarioDef.color : 'var(--border)'}` }}>
            <button 
              onClick={() => setIsEmergencyOpen(!isEmergencyOpen)}
              className="wpt-accordion-btn"
            >
              <div className="wpt-accordion-title" style={{ color: scenarioDef ? scenarioDef.color : 'var(--text-main)' }}>
                {scenarioDef ? getIcon(scenarioDef.icon) : <i className="fi fi-sr-shield wpt-icon-18"></i>} ทดสอบวิกฤต (Stress Test)
              </div>
              <i className={`fi ${isEmergencyOpen ? 'fi-sr-angle-small-up' : 'fi-sr-angle-small-down'}`} style={{ color: 'var(--text-muted)' }}></i>
            </button>
            
            {isEmergencyOpen && (
              <div className="wpt-accordion-content">
                <div className="ef-scenario-grid wpt-btn-scenario-container">
                {(Object.entries(SCENARIOS) as [Scenario, ScenarioDef][]).map(([key, def]) => {
                  const active = selectedScenario === key;
                  return (
                    <button key={key} onClick={() => { 
                        if (active) {
                          setSelectedScenario(null as any);
                        } else {
                          setSelectedScenario(key as Scenario); 
                          setSeverity('moderate'); 
                        }
                      }} className={`ef-scenario-btn ${active ? 'active' : ''}`}
                      style={{ border: `2px solid ${active ? def.color : 'var(--border)'}`, background: active ? `${def.color}18` : 'var(--card)' } as any}>
                        <div className="ef-scenario-btn-title" style={{ color: active ? def.color : 'var(--text-main)', fontSize: '13px' }}>{getIcon(def.icon, '14px')} {def.title}</div>
                    </button>
                  );
                })}
              </div>

              {scenarioDef && scenarioDef.hasSeverity && (
                <div className="form-group">
                  <label className="form-label">ระดับความรุนแรง</label>
                  <select className="form-select" value={severity} onChange={e => setSeverity(e.target.value as Severity)}>
                    {Object.entries(scenarioDef.severities!).map(([sKey, sDef]) => (
                      <option key={sKey} value={sKey}>{sDef.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {scenarioDef && (selectedScenario === 'illness' || selectedScenario === 'accident') && (
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">ความคุ้มครอง: ประกันสุขภาพ / อุบัติเหตุ</label>
                  <select className="form-select" value={healthInsType} onChange={e => setHealthInsType(e.target.value)}>
                    <option value="none">ไม่มี (จ่ายเองทั้งหมด)</option>
                    <option value="100k">วงเงิน 100,000 บาท</option>
                    <option value="300k">วงเงิน 300,000 บาท</option>
                    <option value="500k">วงเงิน 500,000 บาท</option>
                    <option value="other">ระบุวงเงินเอง...</option>
                  </select>
                  {healthInsType === 'other' && (
                    <div className="form-input-prefix" style={{ marginTop: '8px' }}><span>฿</span>
                      <input className="form-input" type="number" placeholder="ระบุวงเงิน (บาท)" value={healthInsManual || ''} onChange={e => setHealthInsManual(Number(e.target.value))} />
                    </div>
                  )}
                </div>
              )}

              {scenarioDef && selectedScenario === 'accident' && (
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">ความคุ้มครอง: ประกันรถยนต์</label>
                  <select className="form-select" value={vehicleInsType} onChange={e => setVehicleInsType(e.target.value)}>
                    <option value="none">ไม่มี / พ.ร.บ. อย่างเดียว</option>
                    <option value="class1">ประกันชั้น 1 (คุ้มครองเต็มที่)</option>
                    <option value="class2">ประกันชั้น 2+ / 3+ (วงเงินจำกัด)</option>
                    <option value="other">ระบุวงเงินซ่อมรถเราเอง...</option>
                  </select>
                  {vehicleInsType === 'other' && (
                    <div className="form-input-prefix" style={{ marginTop: '8px' }}><span>฿</span>
                      <input className="form-input" type="number" placeholder="ระบุวงเงิน (บาท)" value={vehicleInsManual || ''} onChange={e => setVehicleInsManual(Number(e.target.value))} />
                    </div>
                  )}
                </div>
              )}

              {scenarioDef && (
                <>
                  <div className="wpt-summary-box-no-mb" style={{ marginTop: '16px' }}>
                    <div className="wpt-stat-title">ภาระค่าใช้จ่ายจากสถานการณ์นี้</div>
                    <div className="stat-row"><span className="stat-label">ค่าครองชีพช่วงฟื้นตัว ({e_recoveryMonths} เดือน)</span><span className="stat-val">฿{fmt(e_livingCost)}</span></div>
                    
                    {e_medicalCost > 0 && (
                      <>
                        <div className="stat-row"><span className="stat-label">ค่ารักษาพยาบาล</span><span className="stat-val">฿{fmt(e_medicalCost)}</span></div>
                        {healthCoverage > 0 && <div className="stat-row"><span className="stat-label" style={{ color: 'var(--green)' }}>- ประกันสุขภาพช่วยจ่าย</span><span className="stat-val" style={{ color: 'var(--green)' }}>-฿{fmt(coveredMedical)}</span></div>}
                      </>
                    )}
                    
                    {e_vehicleCost > 0 && (
                      <>
                        <div className="stat-row"><span className="stat-label">ค่าซ่อมแซมยานพาหนะ</span><span className="stat-val">฿{fmt(e_vehicleCost)}</span></div>
                        {vehicleCoverage > 0 && <div className="stat-row"><span className="stat-label" style={{ color: 'var(--green)' }}>- ประกันรถยนต์ช่วยจ่าย</span><span className="stat-val" style={{ color: 'var(--green)' }}>-฿{fmt(coveredVehicle)}</span></div>}
                      </>
                    )}
                    
                    <div className="divider"></div>
                    <div className="stat-row"><span className="stat-label wpt-font-bold">รวมค่าใช้จ่ายส่วนต่างที่ต้องจ่ายเอง</span><span className="stat-val red wpt-font-bold">฿{fmt(e_totalCost)}</span></div>
                  </div>

                  <div className="wpt-survival-card" style={{ border: `2px solid ${e_survived ? 'var(--green)' : 'var(--red)'}`, background: e_survived ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)' }}>
                    <div className="wpt-survival-title" style={{ color: e_survived ? 'var(--green)' : 'var(--red)' }}>
                      <i className={`fi ${e_survived ? 'fi-sr-check-circle' : 'fi-sr-cross-circle'}`}></i>
                      {e_survived ? 'เงินสำรองคุณเพียงพอ!' : 'เงินสำรองไม่พอ!'}
                    </div>
                    <div className="wpt-survival-desc">
                      {e_survived 
                        ? `เงินเก็บปัจจุบัน (฿${fmt(totalCapital)}) มากพอจ่ายวิกฤตนี้ และยังเหลือเงิน ฿${fmt(totalCapital - e_totalCost)}`
                        : `คุณยังขาดเงินอีก ฿${fmt(e_shortfall)} เพื่อรับมือกับวิกฤตนี้! แนะนำให้เพิ่มเป้าหมายเงินสำรอง`
                      }
                    </div>
                  </div>
                </>
              )}
              </div>
            )}
          </div>

          {/* SECTION 3: INFLATION */}
          <div className="card wpt-accordion-card" style={{ border: '2px solid var(--gold)' }}>
            <button 
              onClick={() => setIsInflationOpen(!isInflationOpen)}
              className="wpt-accordion-btn"
            >
              <div className="wpt-accordion-title" style={{ color: 'var(--gold)' }}>
                <i className="fi fi-sr-arrow-trend-up wpt-icon-18"></i> คาดการณ์เงินเฟ้อ (Inflation Impact) <span style={{ fontSize: '13px', marginLeft: '6px', color: 'var(--accent-blue)', fontWeight: 600 }}>(ปัจจุบัน {currentInflationRate !== null ? currentInflationRate : 3.0}%)</span>
              </div>
              <i className={`fi ${isInflationOpen ? 'fi-sr-angle-small-up' : 'fi-sr-angle-small-down'}`} style={{ color: 'var(--text-muted)' }}></i>
            </button>
            
            {isInflationOpen && (
              <div className="wpt-accordion-content">
                <div className="grid2 wpt-form-group-no-mt">
                <div className="form-group">
                  <label className="form-label">ระยะเวลา (ปี)</label>
                  <input type="range" className="slider" min="1" max="30" value={timeline} onChange={e => setTimeline(Number(e.target.value))} />
                  <div className="wpt-slider-val">{timeline} ปี</div>
                </div>
                <div className="form-group">
                  <label className="form-label">เงินเฟ้อ (%)</label>
                  <input type="range" className="slider" min="0" max="10" step="0.01" value={inflationRate || 0} onChange={e => setInflationRate(Number(e.target.value))} />
                  <div className="wpt-slider-val">{inflationRate || 0}% / ปี</div>
                </div>
                <div className="form-group wpt-col-span-all">
                  <label className="form-label">เงินเดือนขึ้น (%)</label>
                  <input type="range" className="slider" min="0" max="15" step="0.5" value={salaryGrowth} onChange={e => setSalaryGrowth(Number(e.target.value))} />
                  <div className="wpt-slider-val">{salaryGrowth}% / ปี</div>
                </div>
              </div>

              <div className="wpt-summary-box-mt">
                <div className="stat-row"><span className="stat-label">รายจ่ายปัจจุบัน</span><span className="stat-val">฿{fmt(totalMonthlyExpense)} / ด.</span></div>
                <div className="stat-row"><span className="stat-label">รายจ่ายในอีก {timeline} ปี</span><span className="stat-val red">฿{fmt(futureExpense)} / ด.</span></div>
                <div className="divider"></div>
                <div className="stat-row"><span className="stat-label">เงินเดือนปัจจุบัน</span><span className="stat-val">฿{fmt(salary)}</span></div>
                <div className="stat-row"><span className="stat-label">เงินเดือนในอนาคต (ตัวเลข)</span><span className="stat-val green">฿{fmt(futureSalary)}</span></div>
                <div className="stat-row"><span className="stat-label">อำนาจซื้อจริง (Real Value)</span><span className="stat-val" style={{ color: realPurchasingPower > salary ? 'var(--green)' : 'var(--red)' }}>฿{fmt(realPurchasingPower)}</span></div>
              </div>
              
              <div className="wpt-footer-note">
                  * อำนาจซื้อจริง (Real Purchasing Power) คือ มูลค่าเงินเดือนในอนาคตเมื่อถูกหักล้างด้วยเงินเฟ้อ หากตัวเลขนี้น้อยกว่าเงินเดือนปัจจุบัน แปลว่าคุณจะ "จนลง" ในทางปฏิบัติแม้ตัวเลขเงินเดือนจะเพิ่มขึ้น
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
      )}

      {page === 1 && (
        <div className="tool-page active" style={{ paddingBottom: '40px' }}>
          <div className="tool-header rt-tool-header-flex" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <i className="fi fi-sr-sparkles" style={{ fontSize: '28px', color: 'var(--accent-blue)', marginTop: '4px' }}></i> 
              <div>
                <div className="tool-title" style={{ fontSize: '28px' }}>
                  AI แนะนำพอร์ต <span>(Integrated Wealth Plan)</span>
                </div>
                <div className="tool-sub" style={{ fontSize: '15px' }}>
                  ระบบได้นำข้อมูลที่คุณกรอกมาวิเคราะห์เพื่อจัดสัดส่วนพอร์ตที่เหมาะสมที่สุด
                </div>
              </div>
            </div>
            <div className="page-nav" style={{ marginBottom: 0 }}>
              <button className={`page-btn`} onClick={() => setPage(0)}>
                <span className="num">1</span>Wealth Plan
              </button>
              <button className={`page-btn active`}>
                <span className="num">2</span>AI แนะนำพอร์ต
              </button>
            </div>
          </div>

          <AiAdvisor
            goal="wealth_plan"
            context={{
              currentSavings: totalCapital || undefined,
              investmentAmount: investmentAmount || undefined,
              emergencyFund: emergencyFund || undefined,
              scenarioType: selectedScenario || undefined,
              severity: severity || undefined,
              inflationRate: inflationRate || undefined,
              monthlySalary: salary || undefined,
              monthlyExpense: totalMonthlyExpense || undefined,
              riskTolerance: "medium",
            }}
            contextItems={contextItems.length > 0 ? contextItems : undefined}
            showCustomPrompt
          />
        </div>
      )}
    </div>
  );
}
