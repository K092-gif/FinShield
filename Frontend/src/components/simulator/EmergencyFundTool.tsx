"use client";
import '../ui/EmergencyFundTool.css';

import React, { useState, useEffect, useTransition } from "react";
import PageSkeleton from "@/components/simulator/PageSkeleton";
import { useFinance } from "@/contexts/FinanceContext";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import AiAdvisor from "@/components/simulator/AiAdvisor";

// ─── Types ────────────────────────────────────────────────────────────
type Scenario = 'job_loss' | 'illness' | 'accident';
type Severity  = 'mild' | 'moderate' | 'severe';

interface SeverityDef {
  label: string;
  medicalCost: number;
  vehicleCost: number;
  recoveryMonths: number;
}


interface ScenarioDef {
  icon: string;
  title: string;
  subtitle: string;
  desc: string;
  color: string;
  hasSeverity: boolean;
  severities?: Record<Severity, SeverityDef>;
}

interface ScenarioBreakdown {
  medicalCost: number;
  vehicleCost: number;
  livingCost: number;
  totalCost: number;
  recoveryMonths: number;
}

interface EmergencyResult {
  currentMonthlyExpense: number;
  monthsOfSurvival: number;
  scenarioCost: number;
  shortfall: number;
  survivalDays: number;
  survivalPercent: number;
  survived: boolean;
  remainingBalance: number;
  crisisStartDate: string;
  crisisEndDate: string;
  verdict: string;
  breakdown: ScenarioBreakdown;
  scenarioLabel: string;
  targetDays: number;
}

const SCENARIOS: Record<Scenario, ScenarioDef> = {
  job_loss: {
    icon: 'Suitcase',
    title: 'ตกงาน',
    subtitle: 'Job Loss',
    desc: 'สูญเสียรายได้กะทันหัน ต้องใช้เงินสำรองระหว่างหางานใหม่',
    color: '#f59e0b',
    hasSeverity: false,
  },
  illness: {
    icon: 'Hospital',
    title: 'เจ็บป่วย',
    subtitle: 'Illness',
    desc: 'ค่ารักษาพยาบาล + รายได้ที่หายไประหว่างพักฟื้น',
    color: '#ef4444',
    hasSeverity: true,
    severities: {
      mild:     { label: 'เล็กน้อย (ผู้ป่วยนอก)',                medicalCost: 20000,  vehicleCost: 0, recoveryMonths: 1 },
      moderate: { label: 'ปานกลาง (นอนโรงพยาบาล 1–2 สัปดาห์)',  medicalCost: 120000, vehicleCost: 0, recoveryMonths: 2 },
      severe:   { label: 'รุนแรง (ผ่าตัด / ICU)',                 medicalCost: 380000, vehicleCost: 0, recoveryMonths: 5 },
    },
  },
  accident: {
    icon: 'Car',
    title: 'อุบัติเหตุ',
    subtitle: 'Accident',
    desc: 'ค่ารักษา + ซ่อมยานพาหนะ + รายได้ที่หายระหว่างฟื้นตัว',
    color: '#8b5cf6',
    hasSeverity: true,
    severities: {
      mild:     { label: 'บาดเจ็บเล็กน้อย (ไม่นอนโรงพยาบาล)',    medicalCost: 15000,  vehicleCost: 25000,  recoveryMonths: 1 },
      moderate: { label: 'บาดเจ็บปานกลาง (นอนรพ. ~1 สัปดาห์)',   medicalCost: 80000,  vehicleCost: 60000,  recoveryMonths: 2 },
      severe:   { label: 'บาดเจ็บสาหัส (ผ่าตัด / กระดูกหัก)',     medicalCost: 280000, vehicleCost: 120000, recoveryMonths: 5 },
    },
  },
};

const getIcon = (name: string, props: any) => {
  const size = props.size ? `${props.size}px` : 'inherit';
  if (name === 'Suitcase') return <i className="fi fi-sr-briefcase" style={{ fontSize: size }}></i>;
  if (name === 'Hospital') return <i className="fi fi-sr-hospital" style={{ fontSize: size }}></i>;
  return <i className="fi fi-sr-car" style={{ fontSize: size }}></i>;
}

const SEVERITY_COLOR: Record<Severity, string> = {
  mild: 'var(--green)', moderate: 'var(--gold)', severe: 'var(--red)',
};

// ─── Component ────────────────────────────────────────────────────────
export default function EmergencyFundTool() {
  const { financeData, loading: financeLoading } = useFinance();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const stepParam = searchParams.get('step');
  const page = stepParam ? parseInt(stepParam, 10) : 0;
  
  const [isPending, startTransition] = useTransition();

  const setPage = (newPage: number | ((prev: number) => number)) => {
    const nextVal = typeof newPage === 'function' ? newPage(page) : newPage;
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', nextVal.toString());
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };
  const [expenses, setExpenses] = useState<Record<string, number | ''>>({
    food: financeData.assets.monthlyIncome ? Math.round(financeData.assets.monthlyIncome * 0.15) : '',
    rent: financeData.assets.monthlyIncome ? Math.round(financeData.assets.monthlyIncome * 0.20) : '',
    transport: financeData.assets.monthlyIncome ? Math.round(financeData.assets.monthlyIncome * 0.10) : '',
    debt: financeData.expenses?.debt || 0,
    other: financeData.assets.monthlyIncome ? Math.round(financeData.assets.monthlyIncome * 0.10) : '',
  });
  const [currentSavings, setCurrentSavings]       = useState<number | ''>(financeData.assets.emergencyFund || financeData.assets.currentCapital || '');
  const [unemploymentMonths, setUnemploymentMonths] = useState(6);
  const [selectedScenario, setSelectedScenario]   = useState<Scenario>('job_loss');
  const [severity, setSeverity]                   = useState<Severity>('moderate');
  const [result, setResult]                       = useState<EmergencyResult | null>(null);
  const [loading, setLoading]                     = useState(false);

  // ── Sync from saved finance data (re-runs whenever user saves settings) ──
  useEffect(() => {
    if (financeLoading) return;
    setExpenses({
      food:      financeData.expenses.food,
      rent:      financeData.expenses.rent,
      transport: financeData.expenses.transport,
      debt:      financeData.expenses.debt || 0,
      other:     financeData.expenses.other,
    });
    setCurrentSavings(financeData.assets.emergencyFund || financeData.assets.currentCapital);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financeData]); // re-runs every time financeData updates (e.g. after saving settings)

  const totalMonthlyExpense = Number(Object.values(expenses).reduce((a: any, b: any) => (Number(a)||0) + (Number(b)||0), 0));
  const scenarioDef = SCENARIOS[selectedScenario];

  // ─ Cost Breakdown ─
  const getBreakdown = (): ScenarioBreakdown => {
    if (selectedScenario === 'job_loss') {
      const livingCost = totalMonthlyExpense * unemploymentMonths;
      return { medicalCost: 0, vehicleCost: 0, livingCost, totalCost: livingCost, recoveryMonths: unemploymentMonths };
    }
    const sev = scenarioDef.severities![severity];
    const livingCost = totalMonthlyExpense * sev.recoveryMonths;
    const totalCost  = sev.medicalCost + sev.vehicleCost + livingCost;
    return { medicalCost: sev.medicalCost, vehicleCost: sev.vehicleCost, livingCost, totalCost, recoveryMonths: sev.recoveryMonths };
  };

  // ─ Calculate ─
  const calculateEmergency = async () => {
    setLoading(true);
    try {
      const breakdown    = getBreakdown();
      const { totalCost, recoveryMonths } = breakdown;
      const targetDays   = recoveryMonths * 30;

      const dailyBurn      = targetDays > 0 ? totalCost / targetDays : totalCost / 30;
      const numCurrentSavings = Number(currentSavings) || 0;
      const daysCanSurvive = dailyBurn > 0 ? numCurrentSavings / dailyBurn : targetDays;
      const survived       = daysCanSurvive >= targetDays;
      const survivalDays   = survived ? targetDays : Math.floor(daysCanSurvive);
      const survivalPercent = Math.min(100, Math.round((survivalDays / (targetDays || 1)) * 100));
      const remainingBalance = survived ? Math.round(numCurrentSavings - totalCost) : 0;
      const shortfall        = Math.max(0, Math.round(totalCost - numCurrentSavings));
      const monthsOfSurvival = Math.round((daysCanSurvive / 30) * 10) / 10;

      const today = new Date();
      const crisisStartDate = today.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + survivalDays);
      const crisisEndDate = endDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

      const scenarioLabel = scenarioDef.hasSeverity
        ? `${scenarioDef.title} — ${scenarioDef.severities![severity].label}`
        : `${scenarioDef.title} ${recoveryMonths} เดือน`;

      let verdict = 'วิกฤตรุนแรง — เงินสำรองไม่เพียงพอ ควรเริ่มลดรายจ่ายและออมเพิ่มทันที';
      if (survived)             verdict = `ยอดเยี่ยม — เงินสำรองพอรับมือ${scenarioDef.title}ได้ครบ ${recoveryMonths} เดือน และยังมีเงินเหลือ`;
      else if (survivalPercent >= 50) verdict = `ปานกลาง — อยู่รอดได้บางส่วน แต่ควรเพิ่มเงินสำรองเพื่อรับมือ${scenarioDef.title}`;

      setResult({
        currentMonthlyExpense: Math.round(totalMonthlyExpense),
        monthsOfSurvival,
        scenarioCost: Math.round(totalCost),
        shortfall,
        survivalDays,
        survivalPercent,
        survived,
        remainingBalance,
        crisisStartDate,
        crisisEndDate,
        verdict,
        breakdown,
        scenarioLabel,
        targetDays,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { calculateEmergency(); }, [expenses, currentSavings, unemploymentMonths, selectedScenario, severity]);

  const breakdown = getBreakdown();
  const colorVar  = (c: string) => c; // use raw hex

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="tool-screen active">

      {/* ── Top Nav ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="page-nav" style={{ marginBottom: 0 }}>
          {[['Safety Net','1'], ['Stress Test','2'], ['Portfolio','3']].map(([label, num], idx) => (
            <button key={idx} className={`page-btn ${page === idx ? 'active' : ''}`} onClick={() => setPage(idx)}>
              <span className="num">{num}</span>{label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {page > 0 && <button className="btn btn-secondary" onClick={() => setPage(p => p - 1)}>← กลับ</button>}
          {page < 2 && (
            <button className="btn btn-primary" onClick={() => setPage(p => p + 1)}>
              {page === 0 ? 'เลือกสถานการณ์ →' : 'จัดการพอร์ต →'}
            </button>
          )}
        </div>
      </div>

      {isPending ? (
        <PageSkeleton />
      ) : (
        <>
          {page === 0 && (
            <div className="tool-page active">
              <div className="tool-header">
                <div className="tool-title">Emergency <span>Safety Net</span></div>
                <div className="tool-sub">ประเมินภาระค่าใช้จ่ายต่อเดือน และเงินสำรองฉุกเฉินปัจจุบัน</div>
              </div>
              <div className="grid2">
                <div className="card">
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fi fi-sr-money-bill-wave" style={{ fontSize: '18px' }}></i> ค่าใช้จ่ายประจำเดือน
                  </div>
                  {[
                    [<><i className="fi fi-sr-restaurant" style={{ fontSize: '16px' }}></i> ค่าอาหาร & ของใช้</>, 'food'],
                    [<><i className="fi fi-sr-home" style={{ fontSize: '16px' }}></i> ค่าที่พัก / ผ่อนบ้าน</>, 'rent'],
                    [<><i className="fi fi-sr-car" style={{ fontSize: '16px' }}></i> ค่าเดินทาง / ผ่อนรถ</>, 'transport'],
                    [<><i className="fi fi-sr-credit-card" style={{ fontSize: '16px' }}></i> ภาระหนี้สิน (บัตรเครดิต, สินเชื่อ)</>, 'debt'],
                    [<><i className="fi fi-sr-plane" style={{ fontSize: '16px' }}></i> ค่าใช้จ่ายอื่นๆ</>, 'other'],
                  ].map(([label, key]) => (
                    <div key={key as string} className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{label}</label>
                      <div className="form-input-prefix">
                        <span>฿</span>
                        <input type="number" min="0" onWheel={(e) => e.currentTarget.blur()} className="form-input"
                          value={expenses[key as keyof typeof expenses] || ''}
                          onChange={(e) => setExpenses({ ...expenses, [key as string]: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) })} />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="card" style={{ marginBottom: '16px' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fi fi-sr-coins" style={{ fontSize: '18px' }}></i> เงินสำรองปัจจุบัน (สภาพคล่องสูง)
                    </div>
                    <div className="form-input-prefix">
                      <span>฿</span>
                      <input type="number" min="0" onWheel={(e) => e.currentTarget.blur()} className="form-input"
                        style={{ fontSize: '20px', padding: '16px 14px 16px 40px' }}
                        value={currentSavings || ''}
                        onChange={(e) => setCurrentSavings(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-title">สรุปเบื้องต้น</div>
                    <div className="stat-row"><span className="stat-label">รวมค่าใช้จ่าย</span><span className="stat-val red">฿{totalMonthlyExpense.toLocaleString()}/เดือน</span></div>
                    <div className="stat-row"><span className="stat-label">เงินสำรองที่มี</span><span className="stat-val green">฿{currentSavings.toLocaleString()}</span></div>
                    <div className="stat-row"><span className="stat-label">อยู่รอดได้ (ไม่มีรายได้)</span><span className="stat-val">{result?.monthsOfSurvival ?? 0} เดือน</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {page === 1 && (
            <div className="tool-page active">
              <div className="tool-header">
                <div className="tool-title">Crisis <span>Stress Test</span></div>
                <div className="tool-sub">เลือกสถานการณ์วิกฤต แล้วระบบจะประมาณค่าใช้จ่ายและทดสอบเงินสำรองของคุณ</div>
              </div>

              {/* ── Scenario Cards ── */}
              <div className="ef-scenario-grid">
                {(Object.entries(SCENARIOS) as [Scenario, ScenarioDef][]).map(([key, def]) => {
                  const active = selectedScenario === key;
                  return (
                    <button
                      key={key}
                      id={`scenario-${key}`}
                      onClick={() => { setSelectedScenario(key); setSeverity('moderate'); }}
                      className={`ef-scenario-btn ${active ? 'active' : ''}`}
                      style={{
                        border: `2px solid ${active ? def.color : 'var(--border)'}`,
                        background: active ? `${def.color}18` : 'var(--card)',
                        '--def-color-30': `${def.color}30`,
                      } as React.CSSProperties}
                    >
                        <div className="ef-scenario-btn-icon" style={{ color: active ? def.color : 'inherit' }}>{getIcon(def.icon, { weight: 'bold' })}</div>
                        <div className="ef-scenario-btn-title" style={{ color: active ? def.color : 'var(--text-main)' }}>
                        {def.title}
                      </div>
                      <div className="ef-scenario-btn-sub">
                        {def.subtitle}
                      </div>
                      <div className="ef-scenario-btn-desc">{def.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid2">
                {/* ── Left: Parameters & Cost Breakdown ── */}
                <div className="ef-col-gap-16">
                  <div className="card">
                    <div className="card-title" style={{ color: scenarioDef.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getIcon(scenarioDef.icon, { weight: 'bold', size: 18 })} ตั้งค่าสถานการณ์ {scenarioDef.title}
                    </div>

                    {/* Job Loss: slider */}
                    {selectedScenario === 'job_loss' && (
                      <>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
                          ตั้งระยะเวลาที่คาดว่าจะใช้หางานใหม่
                        </div>
                        <div className="slider-wrap">
                          <input type="range" className="slider" min="1" max="12" step="1"
                            value={unemploymentMonths}
                            onChange={(e) => setUnemploymentMonths(Number(e.target.value))} />
                          <div className="slider-labels"><span>1 เดือน</span><span>6 เดือน</span><span>12 เดือน</span></div>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '16px' }}>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '32px', fontWeight: 700, color: scenarioDef.color }}>
                            {unemploymentMonths}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>เดือน</div>
                        </div>
                      </>
                    )}

                    {/* Illness / Accident: severity buttons */}
                    {scenarioDef.hasSeverity && scenarioDef.severities && (
                      <>
                        <div className="ef-settings-desc">
                          เลือกระดับความรุนแรงของสถานการณ์
                        </div>
                        <div className="ef-severity-col">
                          {(Object.entries(scenarioDef.severities) as [Severity, SeverityDef][]).map(([sKey, sDef]) => {
                            const sActive = severity === sKey;
                            return (
                              <button
                                key={sKey}
                                id={`severity-${sKey}`}
                                onClick={() => setSeverity(sKey)}
                                className="ef-severity-btn"
                                style={{
                                  border: `1.5px solid ${sActive ? scenarioDef.color : 'var(--border)'}`,
                                  background: sActive ? `${scenarioDef.color}12` : 'var(--bg-main)',
                                }}
                              >
                                <div className="ef-severity-btn-title" style={{ color: sActive ? scenarioDef.color : 'var(--text-main)' }}>
                                  <i className="fi fi-sr-circle" style={{ color: SEVERITY_COLOR[sKey] }}></i> {sDef.label}
                                </div>
                                <div className="ef-severity-btn-desc">
                                  <span className="ef-severity-btn-stat"><i className="fi fi-sr-calendar"></i> พักฟื้น {sDef.recoveryMonths} เดือน</span>
                                  {sDef.medicalCost > 0 && <span className="ef-severity-btn-stat"><i className="fi fi-sr-hospital"></i> ฿{sDef.medicalCost.toLocaleString()}</span>}
                                  {sDef.vehicleCost > 0 && <span className="ef-severity-btn-stat"><i className="fi fi-sr-wrench"></i> ฿{sDef.vehicleCost.toLocaleString()}</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cost Breakdown */}
                  <div className="card">
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fi fi-sr-coins" style={{ fontSize: '18px' }}></i> ประมาณการค่าใช้จ่ายทั้งหมด
                    </div>

                    {breakdown.medicalCost > 0 && (
                      <div className="stat-row">
                        <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i className="fi fi-sr-hospital"></i> ค่ารักษาพยาบาล</span>
                        <span className="stat-val red">฿{breakdown.medicalCost.toLocaleString()}</span>
                      </div>
                    )}
                    {breakdown.vehicleCost > 0 && (
                      <div className="stat-row">
                        <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i className="fi fi-sr-wrench"></i> ค่าซ่อมยานพาหนะ</span>
                        <span className="stat-val red">฿{breakdown.vehicleCost.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="stat-row">
                      <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i className="fi fi-sr-home"></i> ค่าครองชีพ {breakdown.recoveryMonths} เดือน</span>
                      <span className="stat-val red">฿{breakdown.livingCost.toLocaleString()}</span>
                    </div>

                    <div className="divider" />

                    <div className="stat-row">
                      <span className="stat-label" style={{ fontWeight: 700, fontSize: '14px' }}>รวมที่ต้องใช้ทั้งหมด</span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '22px', fontWeight: 800, color: scenarioDef.color }}>
                        ฿{breakdown.totalCost.toLocaleString()}
                      </span>
                    </div>

                    <div className="divider" />

                    <div className="stat-row">
                      <span className="stat-label">เงินสำรองที่มี</span>
                      <span className="stat-val green">฿{currentSavings.toLocaleString()}</span>
                    </div>

                    {/* Pass/Fail indicator */}
                    <div style={{
                      marginTop: '16px', padding: '14px 16px', borderRadius: '10px',
                      background: (Number(currentSavings)||0) >= breakdown.totalCost ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                      border: `1.5px solid ${(Number(currentSavings)||0) >= breakdown.totalCost ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: (Number(currentSavings)||0) >= breakdown.totalCost ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {(Number(currentSavings)||0) >= breakdown.totalCost ? <i className="fi fi-sr-check-circle"></i> : <i className="fi fi-sr-cross-circle"></i>} 
                        {(Number(currentSavings)||0) >= breakdown.totalCost ? 'เงินเพียงพอ — เกินอยู่' : 'เงินไม่พอ — ขาดอยู่'}
                      </span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '16px', fontWeight: 800, color: (Number(currentSavings)||0) >= breakdown.totalCost ? 'var(--green)' : 'var(--red)' }}>
                        ฿{Math.abs((Number(currentSavings)||0) - breakdown.totalCost).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                      <button className="btn btn-primary btn-full" onClick={() => setPage(2)}>
                        จัดการพอร์ตสภาพคล่อง →
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Right Column: Survival Graphic ── */}
                {result && (
                  <div className="card survival-score" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
                      <i className="fi fi-sr-calendar" style={{ fontSize: '18px' }}></i> Survival Days
                    </div>

                    {/* Circle */}
                    <div className="ef-circle-wrap">
                      <svg width="160" height="160">
                        <circle cx="80" cy="80" r="68" fill="none" stroke="var(--border)" strokeWidth="12" />
                        <circle
                          cx="80" cy="80" r="68" fill="none"
                          stroke={result.survived ? 'var(--green)' : result.survivalPercent >= 50 ? 'var(--gold)' : 'var(--red)'}
                          strokeWidth="12"
                          strokeDasharray={`${2 * Math.PI * 68}`}
                          strokeDashoffset={`${2 * Math.PI * 68 * (1 - result.survivalPercent / 100)}`}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
                        />
                      </svg>
                      <div className="ef-circle-content">
                        <div className="ef-circle-val" style={{ color: result.survived ? 'var(--green)' : result.survivalPercent >= 50 ? 'var(--gold)' : 'var(--red)' }}>
                          {result.survivalPercent}%
                        </div>
                        <div className="ef-circle-sub">
                          ของ {result.breakdown.recoveryMonths} เดือน
                        </div>
                      </div>
                    </div>

                    {/* Day count */}
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '40px', fontWeight: 700, letterSpacing: '-1px', color: result.survived ? 'var(--green)' : result.survivalPercent >= 50 ? 'var(--gold)' : 'var(--red)' }}>
                        {result.survivalDays}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>วัน จาก {result.targetDays} วัน</div>
                    </div>

                    {/* Timeline bar */}
                    <div style={{ background: 'var(--bg-sub)', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i className="fi fi-sr-circle" style={{ color: 'var(--green)' }}></i> เริ่มวิกฤต</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {result.survived ? <><i className="fi fi-sr-flag"></i> สิ้นสุด</> : <><i className="fi fi-sr-money-bill-wave"></i> เงินหมด</>}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--text-main)', fontWeight: 700 }}>
                        <span>{result.crisisStartDate}</span>
                        <span>{result.crisisEndDate}</span>
                      </div>
                      <div style={{ margin: '10px 0 0', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '3px', width: `${result.survivalPercent}%`, background: result.survived ? 'var(--green)' : result.survivalPercent >= 50 ? 'var(--gold)' : 'var(--red)', transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
                      </div>
                    </div>

                    {/* Verdict */}
                    <div className={`verdict ${result.survived ? 'good' : result.survivalPercent >= 50 ? 'warn' : 'bad'}`} style={{ textAlign: 'left', margin: '16px 0 0', alignSelf: 'stretch' }}>
                      <div className="verdict-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {result.survived ? <i className="fi fi-sr-check-circle"></i> : <i className="fi fi-sr-exclamation"></i>}
                        {result.survived ? 'ผ่านวิกฤต' : 'ไม่ผ่านวิกฤต'}
                      </div>
                      <div className="verdict-text">{result.verdict}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {page === 2 && (
            <div className="tool-page active">
              <div className="tool-header">
                <div className="tool-title">AI <span>Emergency Portfolio</span></div>
                <div className="tool-sub">ให้ AI แนะนำพอร์ตลงทุนสำหรับเงินสำรองฉุกเฉิน สภาพคล่องสูง ปลอดภัยกับเงินต้น ทั้งสินทรัพย์ไทยและต่างประเทศ</div>
              </div>

              <AiAdvisor
                goal="emergency"
                context={{
                  emergencyFund: Number(currentSavings) || 0,
                  investmentAmount: Math.round((Number(currentSavings) || 0) * 0.4),
                  currentSavings: Number(currentSavings) || 0,
                  scenarioType: SCENARIOS[selectedScenario].title,
                  riskTolerance: "low",
                  isSurviving: result?.survived ?? false,
                  shortfall: result?.shortfall ?? 0,
                }}
                contextItems={[
                  { label: "เงินสำรองฉุกเฉิน", value: `฿${(Number(currentSavings) || 0).toLocaleString()}` },
                  { label: "เงินพร้อมลงทุน (40%)", value: `฿${Math.round((Number(currentSavings) || 0) * 0.4).toLocaleString()}` },
                  { label: "สถานะรับมือวิกฤต", value: result?.survived ? "ผ่านวิกฤต" : `ขาดเงิน ฿${(result?.shortfall ?? 0).toLocaleString()}` },
                  { label: "สถานการณ์ที่เตรียมรับมือ", value: SCENARIOS[selectedScenario].title },
                ]}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
