"use client";

import React, { useState, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Suitcase, Hospital, Car, Circle, Money, Coins, Wrench, House, Calendar, CheckCircle, XCircle, WarningCircle, Flag, ChartBar, ForkKnife, CreditCard, Airplane, Robot } from "@phosphor-icons/react";
import PortfolioBuilder from "@/components/ui/PortfolioBuilder";

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
  if (name === 'Suitcase') return <Suitcase {...props} />;
  if (name === 'Hospital') return <Hospital {...props} />;
  return <Car {...props} />;
}

const SEVERITY_COLOR: Record<Severity, string> = {
  mild: 'var(--green)', moderate: 'var(--gold)', severe: 'var(--red)',
};

// ─── Component ────────────────────────────────────────────────────────
export default function EmergencyFundTool() {
  const { financeData, loading: financeLoading } = useFinance();

  const [page, setPage] = useState(0);
  const [expenses, setExpenses] = useState({
    food: 8000, rent: 12000, transport: 5000, debt: 5000, other: 3000,
  });
  const [currentSavings, setCurrentSavings]       = useState(50000);
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
      debt:      financeData.debts.reduce((s, d) => s + d.monthly, 0),
      other:     financeData.expenses.other,
    });
    setCurrentSavings(financeData.assets.emergencyFund || financeData.assets.currentCapital);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financeData]); // re-runs every time financeData updates (e.g. after saving settings)

  const totalMonthlyExpense = Object.values(expenses).reduce((a, b) => a + b, 0);
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
      const daysCanSurvive = dailyBurn > 0 ? currentSavings / dailyBurn : targetDays;
      const survived       = daysCanSurvive >= targetDays;
      const survivalDays   = survived ? targetDays : Math.floor(daysCanSurvive);
      const survivalPercent = Math.min(100, Math.round((survivalDays / (targetDays || 1)) * 100));
      const remainingBalance = survived ? Math.round(currentSavings - totalCost) : 0;
      const shortfall        = Math.max(0, Math.round(totalCost - currentSavings));
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
          {[['Safety Net','1'], ['Stress Test','2'], ['Survival Days','3'], ['Portfolio','4']].map(([label, num], idx) => (
            <button key={idx} className={`page-btn ${page === idx ? 'active' : ''}`} onClick={() => setPage(idx)}>
              <span className="num">{num}</span>{label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {page > 0 && <button className="btn btn-secondary" onClick={() => setPage(p => p - 1)}>← กลับ</button>}
          {page < 3 && (
            <button className="btn btn-primary" onClick={() => setPage(p => p + 1)}>
              {page === 0 ? 'เลือกสถานการณ์ →' : page === 1 ? 'ดู Survival Days →' : 'จัดการพอร์ต →'}
            </button>
          )}
        </div>
      </div>

      {/* ════════ PAGE 0 — Safety Net ════════ */}
      {page === 0 && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Emergency <span>Safety Net</span></div>
            <div className="tool-sub">ประเมินภาระค่าใช้จ่ายต่อเดือน และเงินสำรองฉุกเฉินปัจจุบัน</div>
          </div>
          <div className="grid2">
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Money weight="bold" size={18} /> ค่าใช้จ่ายประจำเดือน
              </div>
              {[
                [<><ForkKnife weight="bold" size={16} /> ค่าอาหาร & ของใช้</>, 'food'],
                [<><House weight="bold" size={16} /> ค่าที่พัก / ผ่อนบ้าน</>, 'rent'],
                [<><Car weight="bold" size={16} /> ค่าเดินทาง / ผ่อนรถ</>, 'transport'],
                [<><CreditCard weight="bold" size={16} /> ภาระหนี้สิน (บัตรเครดิต, สินเชื่อ)</>, 'debt'],
                [<><Airplane weight="bold" size={16} /> ค่าใช้จ่ายอื่นๆ</>, 'other'],
              ].map(([label, key]) => (
                <div key={key as string} className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{label}</label>
                  <div className="form-input-prefix">
                    <span>฿</span>
                    <input type="number" className="form-input"
                      value={expenses[key as keyof typeof expenses] || ''}
                      onChange={(e) => setExpenses({ ...expenses, [key]: e.target.value === '' ? 0 : Number(e.target.value) })} />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Coins weight="bold" size={18} /> เงินสำรองปัจจุบัน (สภาพคล่องสูง)
                </div>
                <div className="form-input-prefix">
                  <span>฿</span>
                  <input type="number" className="form-input"
                    style={{ fontSize: '20px', padding: '16px 14px 16px 40px' }}
                    value={currentSavings || ''}
                    onChange={(e) => setCurrentSavings(e.target.value === '' ? 0 : Number(e.target.value))} />
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

      {/* ════════ PAGE 1 — Stress Test ════════ */}
      {page === 1 && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Crisis <span>Stress Test</span></div>
            <div className="tool-sub">เลือกสถานการณ์วิกฤต แล้วระบบจะประมาณค่าใช้จ่ายและทดสอบเงินสำรองของคุณ</div>
          </div>

          {/* ── Scenario Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {(Object.entries(SCENARIOS) as [Scenario, ScenarioDef][]).map(([key, def]) => {
              const active = selectedScenario === key;
              return (
                <button
                  key={key}
                  id={`scenario-${key}`}
                  onClick={() => { setSelectedScenario(key); setSeverity('moderate'); }}
                  style={{
                    padding: '20px 16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                    border: `2px solid ${active ? def.color : 'var(--border)'}`,
                    background: active ? `${def.color}18` : 'var(--card)',
                    boxShadow: active ? `0 0 0 1px ${def.color}30, var(--shadow-sm)` : 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                  }}
                >
                    <div style={{ fontSize: '32px', marginBottom: '10px', lineHeight: 1 }}>{getIcon(def.icon, { weight: 'bold' })}</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: active ? def.color : 'var(--text-main)', marginBottom: '2px' }}>
                    {def.title}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                    {def.subtitle}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{def.desc}</div>
                </button>
              );
            })}
          </div>

          <div className="grid2">
            {/* ── Left: Parameters ── */}
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
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
                    เลือกระดับความรุนแรงของสถานการณ์
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(Object.entries(scenarioDef.severities) as [Severity, SeverityDef][]).map(([sKey, sDef]) => {
                      const sActive = severity === sKey;
                      return (
                        <button
                          key={sKey}
                          id={`severity-${sKey}`}
                          onClick={() => setSeverity(sKey)}
                          style={{
                            padding: '14px 16px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                            border: `1.5px solid ${sActive ? scenarioDef.color : 'var(--border)'}`,
                            background: sActive ? `${scenarioDef.color}12` : 'var(--bg-main)',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: 700, color: sActive ? scenarioDef.color : 'var(--text-main)', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Circle weight="fill" color={SEVERITY_COLOR[sKey]} /> {sDef.label}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar weight="bold" /> พักฟื้น {sDef.recoveryMonths} เดือน</span>
                            {sDef.medicalCost > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Hospital weight="bold" /> ฿{sDef.medicalCost.toLocaleString()}</span>}
                            {sDef.vehicleCost > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Wrench weight="bold" /> ฿{sDef.vehicleCost.toLocaleString()}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ── Right: Cost Breakdown ── */}
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Coins weight="bold" size={18} /> ประมาณการค่าใช้จ่ายทั้งหมด
              </div>

              {breakdown.medicalCost > 0 && (
                <div className="stat-row">
                  <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Hospital weight="bold" /> ค่ารักษาพยาบาล</span>
                  <span className="stat-val red">฿{breakdown.medicalCost.toLocaleString()}</span>
                </div>
              )}
              {breakdown.vehicleCost > 0 && (
                <div className="stat-row">
                  <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Wrench weight="bold" /> ค่าซ่อมยานพาหนะ</span>
                  <span className="stat-val red">฿{breakdown.vehicleCost.toLocaleString()}</span>
                </div>
              )}
              <div className="stat-row">
                <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><House weight="bold" /> ค่าครองชีพ {breakdown.recoveryMonths} เดือน</span>
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
                background: currentSavings >= breakdown.totalCost ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                border: `1.5px solid ${currentSavings >= breakdown.totalCost ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: currentSavings >= breakdown.totalCost ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {currentSavings >= breakdown.totalCost ? <CheckCircle weight="bold" /> : <XCircle weight="bold" />} 
                  {currentSavings >= breakdown.totalCost ? 'เงินเพียงพอ — เกินอยู่' : 'เงินไม่พอ — ขาดอยู่'}
                </span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '16px', fontWeight: 800, color: currentSavings >= breakdown.totalCost ? 'var(--green)' : 'var(--red)' }}>
                  ฿{Math.abs(currentSavings - breakdown.totalCost).toLocaleString()}
                </span>
              </div>

              <div style={{ marginTop: '20px' }}>
                <button className="btn btn-primary btn-full" onClick={() => setPage(2)}>
                  ดู Survival Days →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ PAGE 2 — Survival Days ════════ */}
      {page === 2 && result && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Survival <span>Days</span></div>
            <div className="tool-sub" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>สถานการณ์:</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '2px 10px', borderRadius: '100px', fontSize: '13px', fontWeight: 700,
                background: `${scenarioDef.color}18`, border: `1px solid ${scenarioDef.color}40`,
                color: scenarioDef.color,
              }}>
                {getIcon(scenarioDef.icon, { weight: 'bold' })} {result.scenarioLabel}
              </span>
            </div>
          </div>

          <div className="grid2">
            {/* LEFT — Circular progress + timeline */}
            <div className="card survival-score">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                <Calendar weight="bold" size={18} /> Survival Days
              </div>

              {/* Circle */}
              <div style={{ position: 'relative', width: '160px', height: '160px', margin: '12px auto 20px' }}>
                <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
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
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '28px', fontWeight: 700, lineHeight: 1, color: result.survived ? 'var(--green)' : result.survivalPercent >= 50 ? 'var(--gold)' : 'var(--red)' }}>
                    {result.survivalPercent}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
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
              <div style={{ background: 'var(--bg-sub)', borderRadius: '8px', padding: '12px 14px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Circle weight="fill" color="var(--green)" /> เริ่มวิกฤต</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {result.survived ? <><Flag weight="bold" /> สิ้นสุด</> : <><Money weight="bold" /> เงินหมด</>}
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
              <div className={`verdict ${result.survived ? 'good' : result.survivalPercent >= 50 ? 'warn' : 'bad'}`} style={{ textAlign: 'left', marginTop: '16px' }}>
                <div className="verdict-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {result.survived ? <CheckCircle weight="bold" /> : <WarningCircle weight="bold" />}
                  {result.survived ? 'ผ่านวิกฤต' : 'ไม่ผ่านวิกฤต'}
                </div>
                <div className="verdict-text">{result.verdict}</div>
              </div>
            </div>

            {/* RIGHT — Summary */}
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChartBar weight="bold" size={18} /> สรุปค่าใช้จ่ายสถานการณ์นี้
              </div>

              {result.breakdown.medicalCost > 0 && (
                <div className="stat-row">
                  <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Hospital weight="bold" /> ค่ารักษาพยาบาล</span>
                  <span className="stat-val red">฿{result.breakdown.medicalCost.toLocaleString()}</span>
                </div>
              )}
              {result.breakdown.vehicleCost > 0 && (
                <div className="stat-row">
                  <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Wrench weight="bold" /> ค่าซ่อมยานพาหนะ</span>
                  <span className="stat-val red">฿{result.breakdown.vehicleCost.toLocaleString()}</span>
                </div>
              )}
              <div className="stat-row">
                <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><House weight="bold" /> ค่าครองชีพ ({result.breakdown.recoveryMonths} เดือน)</span>
                <span className="stat-val red">฿{result.breakdown.livingCost.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label" style={{ fontWeight: 700 }}>รวมที่ต้องใช้ทั้งหมด</span>
                <span className="stat-val">฿{result.scenarioCost.toLocaleString()}</span>
              </div>

              <div className="divider" />

              <div className="stat-row">
                <span className="stat-label">เงินสำรองที่มี</span>
                <span className="stat-val green">฿{currentSavings.toLocaleString()}</span>
              </div>
              {result.survived ? (
                <div className="stat-row">
                  <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Coins weight="bold" /> เงินที่เหลือหลังผ่านวิกฤต</span>
                  <span className="stat-val green">฿{result.remainingBalance.toLocaleString()}</span>
                </div>
              ) : (
                <div className="stat-row">
                  <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle weight="bold" /> ส่วนที่ขาด (Shortfall)</span>
                  <span className="stat-val red">฿{result.shortfall.toLocaleString()}</span>
                </div>
              )}

              <div className="console" style={{ marginTop: '24px', height: '110px' }}>
                <div className="console-line cl-info">&gt; วิเคราะห์แผนการเตรียมพร้อม...</div>
                {result.survived ? (
                  <>
                    <div className="console-line cl-ok">&gt; ผ่านวิกฤต {result.breakdown.recoveryMonths} เดือนสำเร็จ!</div>
                    <div className="console-line cl-ok">&gt; เงินคงเหลือ ฿{result.remainingBalance.toLocaleString()}</div>
                  </>
                ) : (
                  <>
                    <div className="console-line cl-warn">&gt; Shortfall: ฿{result.shortfall.toLocaleString()}</div>
                    <div className="console-line cl-dim">&gt; ออมเพิ่ม ฿5,000/เดือน → {Math.ceil(result.shortfall / 5000)} เดือน</div>
                    <div className="console-line cl-dim">&gt; ออมเพิ่ม ฿10,000/เดือน → {Math.ceil(result.shortfall / 10000)} เดือน</div>
                  </>
                )}
              </div>
              <div style={{ marginTop: '16px' }}>
                <button className="btn btn-primary btn-full" onClick={() => setPage(3)}>จัดการพอร์ตสภาพคล่อง →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ PAGE 3 — Portfolio ════════ */}
      {page === 3 && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Portfolio Simulator & <span>Yield Optimizer</span></div>
            <div className="tool-sub">นำส่วนที่เกินจากเงินสำรองมาลงทุน (นำมา 40% ของเงินก้อนตั้งต้น)</div>
          </div>
          
          <PortfolioBuilder
            topContent={
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ChartBar weight="bold" size={18} color="var(--gold)" /> สรุปเงินที่พร้อมลงทุน (นำมา 40% ของเงินก้อนตั้งต้น)
                </div>
                <div className="grid3" style={{ marginTop: '16px' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>เงินสำรองฉุกเฉิน</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '24px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                      ฿100,000
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>สัดส่วนที่ดึงมาลงทุน</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '24px', fontWeight: 700, color: 'var(--gold)' }}>
                      40%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>เงินลงทุนตั้งต้น</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '24px', fontWeight: 700, color: 'var(--green)' }}>
                      ฿40,000
                    </div>
                  </div>
                </div>
              </div>
            }
            bottomContent={
              <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ChartBar weight="bold" size={18} /> เปรียบเทียบผลตอบแทน 1 ปี (REAL-TIME)
                </div>
                
                <div style={{ marginTop: '16px', overflowX: 'auto' }}>
                  <table className="cal-table">
                    <thead>
                      <tr>
                        <th>สินทรัพย์</th>
                        <th style={{ textAlign: 'center' }}>EXPECTED YIELD</th>
                        <th style={{ textAlign: 'right' }}>ผลตอบแทน (1 ปี)</th>
                        <th style={{ textAlign: 'right' }}>ยอดเงินใหม่</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', background: 'var(--bg-sub)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
                          จัดพอร์ตสัดส่วนด้านบนเพื่อดูผลตอบแทน
                        </td>
                      </tr>
                      <tr style={{ background: 'rgba(37,99,235,0.04)' }}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Robot size={16} weight="bold" /> AI Recommended (สภาพคล่องสูง)
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            KFCASH (40%), ONE-MMF (30%), SHY (30%)
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-blue)' }}>3.50%</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>+฿1,400</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-blue)' }}>฿41,400</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            }
          />
        </div>
      )}

    </div>
  );
}
