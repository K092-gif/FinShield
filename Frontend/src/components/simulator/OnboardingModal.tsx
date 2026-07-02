'use client'
import '../ui/OnboardingModal.css';


import { useState } from 'react'
import { useFinance } from '@/contexts/FinanceContext'


// Removed NumberField component. We will use an inline renderField function inside OnboardingModal to guarantee no remounts.

// ─── Main component ───────────────────────────────────────────────────
interface OnboardingModalProps {
  onComplete: () => void
}

type Step = 0 | 1 | 2

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { updateExpenses, updateAssets, updateRetirement, saveFinanceData } = useFinance()

  const [step, setStep] = useState<Step>(0)
  const [saving, setSaving] = useState(false)

  const [age, setAge]               = useState<number | ''>(25)
  const [retireAge, setRetireAge]   = useState<number | ''>(60)
  const [food, setFood]             = useState<number | ''>('')
  const [rent, setRent]             = useState<number | ''>('')
  const [transport, setTransport]   = useState<number | ''>('')
  const [necessities, setNecessities] = useState<number | ''>('')
  const [other, setOther]           = useState<number | ''>('')
  const [debt, setDebt]             = useState<number | ''>('')
  const [capital, setCapital]       = useState<number | ''>('')
  const [emergency, setEmergency]   = useState<number | ''>('')
  const [savings, setSavings]       = useState<number | ''>('')
  const [retGoal, setRetGoal]       = useState<number | ''>('')

  // Helper to safely get number
  const n = (v: number | '') => v === '' ? 0 : v

  const renderField = (label: string, value: number | '', setter: (v: number | '') => void, prefix?: string) => (
    <div className="ob-field-wrap">
      <label className="ob-field-label">{label}</label>
      <div className="ob-field-rel">
        {prefix && <span className="ob-field-prefix">{prefix}</span>}
        <input
          type="number"
          className={`ob-field-input ${prefix ? 'ob-field-input-pre' : 'ob-field-input-no-pre'}`}
          value={value === 0 ? '' : value}
          placeholder="0"
          onChange={e => setter(e.target.value === '' ? '' : Number(e.target.value))}
          onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>
    </div>
  )



  const totalExpense = n(food) + n(rent) + n(transport) + n(necessities) + n(other) + n(debt)

  const handleSave = async () => {
    setSaving(true)
    try {
      updateRetirement({
        currentAge:     n(age),
        retirementAge:  n(retireAge),
        initialCapital: n(capital),
        monthlySavings: n(savings),
        dividendGoal:   n(retGoal),
      })
      updateExpenses({
        food:        n(food),
        rent:        n(rent),
        transport:   n(transport),
        necessities: n(necessities),
        other:       n(other),
        debt:        n(debt),
      })
      updateAssets({
        currentCapital: n(capital),
        emergencyFund:  n(emergency),
        monthlySavings: n(savings),
        retirementGoal: n(retGoal),
      })
      await saveFinanceData(true)
      onComplete()
    } catch (err) {
      console.error('Onboarding save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    setSaving(true)
    try { await saveFinanceData(true) } catch { /* ignore */ }
    setSaving(false)
    onComplete()
  }

  const STEPS = ['ยินดีต้อนรับ', 'รายจ่าย/เดือน', 'ทุน & เป้าหมาย']

  return (
    <>
      {/* Backdrop */}
      <div className="ob-backdrop" />

      {/* Modal */}
      <div className="ob-modal">

        {/* Progress bar */}
        <div className="ob-prog-bg">
          <div className="ob-prog-fill" style={{ width: step === 0 ? '0%' : step === 1 ? '50%' : '100%' }} />
        </div>

        {/* Step pills */}
        <div className="ob-pills-wrap">
          <div className="ob-pills-flex">
            {STEPS.map((label, i) => (
              <div key={i} className="ob-pill" style={{
                background: i < step ? 'rgba(37,99,235,0.12)'
                  : i === step ? 'rgba(37,99,235,0.08)' : 'var(--bg-sub)',
                border: `1px solid ${i <= step ? 'rgba(37,99,235,0.25)' : 'var(--border)'}`,
                color: i <= step ? 'var(--accent-blue)' : 'var(--text-light)',
              }}>
                {i < step ? '✓ ' : ''}{label}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="ob-scroll-content">

          {/* ══ STEP 0: Welcome ══ */}
          {step === 0 && (
            <div className="ob-step-wrap">
              <div className="ob-welcome-center">
                <div className="ob-logo">FS</div>
                <div className="ob-welcome-title">
                  ยินดีต้อนรับสู่ <span style={{ color: 'var(--accent-blue)' }}>FinShield</span>
                </div>
                <div className="ob-welcome-sub">
                  กรอกข้อมูลทางการเงินเพื่อให้ระบบจำลองได้แม่นยำขึ้น<br />
                  ข้อมูลของคุณจะถูกเก็บไว้อย่างปลอดภัย
                </div>
              </div>

              <div className="ob-card">
                <div className="ob-card-title">
                  <i className="fi fi-sr-user" style={{ fontSize: '18px' }}></i> ข้อมูลส่วนตัว
                </div>
                <div className="ob-grid">
                  {renderField('อายุปัจจุบัน (ปี)', age, setAge)}
                  {renderField('อายุที่ต้องการเกษียณ (ปี)', retireAge, setRetireAge)}
                </div>
              </div>

              {/* Skip hint */}
              <div className="ob-hint">
                <i className="fi fi-sr-bulb ob-hint-icon" style={{ fontSize: '16px', color: 'var(--gold)' }}></i>
                <div>
                  ยังไม่พร้อมกรอกตอนนี้ — กด <strong style={{ color: 'var(--text-main)' }}>ข้ามไปก่อน</strong>{' '}
                  แล้วกดที่ <strong style={{ color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><i className="fi fi-sr-settings"></i> ตั้งค่า → บันทึกการเงิน</strong> ได้ทุกเมื่อ
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 1: รายจ่าย ══ */}
          {step === 1 && (
            <div className="ob-step-wrap">
              <div className="ob-step-title">
                <i className="fi fi-sr-money-bill-wave" style={{ fontSize: '20px' }}></i> ค่าใช้จ่ายรายเดือน
              </div>
              <div className="ob-step-sub">
                กรอกค่าใช้จ่ายเฉลี่ยต่อเดือน (ถ้าไม่มีปล่อยว่างได้)
              </div>

              <div className="ob-card">
                <div className="ob-col-flex">
                  {renderField('ค่าอาหาร', food, setFood, '฿')}
                  {renderField('ค่าที่พัก / ผ่อนบ้าน', rent, setRent, '฿')}
                  {renderField('ค่าเดินทาง / ผ่อนรถ', transport, setTransport, '฿')}
                  {renderField('ซื้อของใช้จำเป็น', necessities, setNecessities, '฿')}
                  {renderField('ค่าอื่นๆ', other, setOther, '฿')}
                  {renderField('ภาระหนี้สินที่ต้องจ่าย/เดือน', debt, setDebt, '฿')}
                </div>
              </div>

              {totalExpense > 0 && (
                <div className="ob-total-wrap">
                  <span className="ob-total-label">รวมรายจ่าย/เดือน</span>
                  <span className="ob-total-val">
                    ฿{totalExpense.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ══ STEP 2: ทุน & เป้าหมาย ══ */}
          {step === 2 && (
            <div className="ob-step-wrap">
              <div className="ob-step-title">
                <i className="fi fi-sr-coins" style={{ fontSize: '20px' }}></i> เงินทุนปัจจุบัน & เป้าหมาย
              </div>
              <div className="ob-step-sub">
                ข้อมูลนี้จะนำไปใช้คำนวณในทุกเครื่องมือโดยอัตโนมัติ
              </div>

              <div className="ob-card">
                <div className="ob-section-label">
                  เงินทุนปัจจุบัน
                </div>
                <div className="ob-col-flex">
                  {renderField('สินทรัพย์รวม / เงินออมทั้งหมด', capital, setCapital, '฿')}
                  {renderField('เงินสำรองฉุกเฉิน', emergency, setEmergency, '฿')}
                </div>
                <div className="ob-divider" />
                <div className="ob-section-label">
                  แผนออม & เป้าหมาย
                </div>
                <div className="ob-col-flex">
                  {renderField('เงินออมต่อเดือน', savings, setSavings, '฿')}
                  {renderField('เป้าหมายรายได้หลังเกษียณ (ต่อเดือน)', retGoal, setRetGoal, '฿')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ob-footer">
          {step === 0 ? (
            <button
              id="onboarding-skip-btn"
              onClick={handleSkip}
              disabled={saving}
              className="ob-btn-secondary"
              style={{ opacity: saving ? 0.5 : 1, padding: '11px 20px' }}>
              ข้ามไปก่อน
            </button>
          ) : (
            <button
              onClick={() => setStep(s => (s - 1) as Step)}
              className="ob-btn-secondary">
              ← กลับ
            </button>
          )}

          <button
            id={step === 2 ? 'onboarding-save-btn' : 'onboarding-next-btn'}
            onClick={step < 2 ? () => setStep(s => (s + 1) as Step) : handleSave}
            disabled={saving}
            className={`ob-btn-primary ${step === 2 ? 'ob-btn-save' : 'ob-btn-next'}`}
            style={{ cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? (
              <>
                <span className="auth-spinner ob-spinner" />
                กำลังบันทึก...
              </>
            ) : step === 0 ? 'เริ่มกรอกข้อมูล →'
              : step === 1 ? 'ถัดไป: เงินทุน →'
              : <><i className="fi fi-sr-disk"></i> บันทึกและเริ่มใช้งาน</>}
          </button>
        </div>
      </div>
    </>
  )
}

