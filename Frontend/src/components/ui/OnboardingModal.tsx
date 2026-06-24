'use client'

import { useState } from 'react'
import { useFinance } from '@/contexts/FinanceContext'
import { UserCircle, Lightbulb, Gear, Money, ForkKnife, House, Car, ShoppingCart, Package, Coins, ShieldCheck, TrendUp, Target, FloppyDisk } from '@phosphor-icons/react'

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
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {prefix && <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-light)', fontWeight: 700, pointerEvents: 'none', zIndex: 1 }}>{prefix}</span>}
        <input
          type="number"
          style={{
            width: '100%', padding: prefix ? '10px 12px 10px 28px' : '10px 12px',
            background: 'var(--bg-main)', border: '1.5px solid var(--border)',
            borderRadius: '10px', color: 'var(--text-main)',
            fontFamily: "'Google Sans Flex','Kanit',sans-serif", fontSize: '14px', fontWeight: 500, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
          }}
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
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        animation: 'settingsFadeIn 0.25s ease',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '480px', maxWidth: '94vw', maxHeight: '90vh',
        background: 'var(--card)', borderRadius: '20px',
        border: '1px solid var(--border)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
        zIndex: 501, display: 'flex', flexDirection: 'column',
        animation: 'authCardIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
      }}>

        {/* Progress bar */}
        <div style={{ height: '3px', background: 'var(--border)', flexShrink: 0 }}>
          <div style={{
            height: '100%', background: 'var(--accent-blue)',
            width: step === 0 ? '0%' : step === 1 ? '50%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>

        {/* Step pills */}
        <div style={{ padding: '20px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
            {STEPS.map((label, i) => (
              <div key={i} style={{
                flex: 1, padding: '5px 8px', borderRadius: '100px', textAlign: 'center',
                fontSize: '10px', fontWeight: 700,
                background: i < step ? 'rgba(37,99,235,0.12)'
                  : i === step ? 'rgba(37,99,235,0.08)' : 'var(--bg-sub)',
                border: `1px solid ${i <= step ? 'rgba(37,99,235,0.25)' : 'var(--border)'}`,
                color: i <= step ? 'var(--accent-blue)' : 'var(--text-light)',
                transition: 'all 0.3s',
              }}>
                {i < step ? '✓ ' : ''}{label}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px' }}>

          {/* ══ STEP 0: Welcome ══ */}
          {step === 0 && (
            <div style={{ paddingBottom: '8px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '18px',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
                  fontFamily: "'Space Mono',monospace", fontSize: '16px',
                  fontWeight: 700, color: '#fff',
                }}>FS</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                  ยินดีต้อนรับสู่ <span style={{ color: 'var(--accent-blue)' }}>FinShield</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: '340px', margin: '0 auto' }}>
                  กรอกข้อมูลทางการเงินเพื่อให้ระบบจำลองได้แม่นยำขึ้น<br />
                  ข้อมูลของคุณจะถูกเก็บไว้อย่างปลอดภัย
                </div>
              </div>

              <div style={{
                background: 'var(--bg-sub)', borderRadius: '14px',
                border: '1px solid var(--border)', padding: '20px', marginBottom: '16px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCircle weight="bold" size={18} /> ข้อมูลส่วนตัว
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {renderField('อายุปัจจุบัน (ปี)', age, setAge)}
                  {renderField('อายุที่ต้องการเกษียณ (ปี)', retireAge, setRetireAge)}
                </div>
              </div>

              {/* Skip hint */}
              <div style={{
                padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
                fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '4px',
                display: 'flex', gap: '8px'
              }}>
                <Lightbulb weight="bold" size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  ยังไม่พร้อมกรอกตอนนี้ — กด <strong style={{ color: 'var(--text-main)' }}>ข้ามไปก่อน</strong>{' '}
                  แล้วกดที่ <strong style={{ color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Gear weight="bold" /> ตั้งค่า → บันทึกการเงิน</strong> ได้ทุกเมื่อ
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 1: รายจ่าย ══ */}
          {step === 1 && (
            <div style={{ paddingBottom: '8px' }}>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Money weight="bold" size={20} /> ค่าใช้จ่ายรายเดือน
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                กรอกค่าใช้จ่ายเฉลี่ยต่อเดือน (ถ้าไม่มีปล่อยว่างได้)
              </div>

              <div style={{
                background: 'var(--bg-sub)', borderRadius: '14px',
                border: '1px solid var(--border)', padding: '20px', marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {renderField('ค่าอาหาร', food, setFood, '฿')}
                  {renderField('ค่าที่พัก / ผ่อนบ้าน', rent, setRent, '฿')}
                  {renderField('ค่าเดินทาง / ผ่อนรถ', transport, setTransport, '฿')}
                  {renderField('ซื้อของใช้จำเป็น', necessities, setNecessities, '฿')}
                  {renderField('ค่าอื่นๆ', other, setOther, '฿')}
                  {renderField('ภาระหนี้สินที่ต้องจ่าย/เดือน', debt, setDebt, '฿')}
                </div>
              </div>

              {totalExpense > 0 && (
                <div style={{
                  padding: '12px 16px', borderRadius: '10px',
                  background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>รวมรายจ่าย/เดือน</span>
                  <span style={{
                    fontFamily: "'Space Mono',monospace", fontSize: '15px',
                    fontWeight: 800, color: 'var(--accent-blue)',
                  }}>
                    ฿{totalExpense.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ══ STEP 2: ทุน & เป้าหมาย ══ */}
          {step === 2 && (
            <div style={{ paddingBottom: '8px' }}>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Coins weight="bold" size={20} /> เงินทุนปัจจุบัน & เป้าหมาย
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                ข้อมูลนี้จะนำไปใช้คำนวณในทุกเครื่องมือโดยอัตโนมัติ
              </div>

              <div style={{
                background: 'var(--bg-sub)', borderRadius: '14px',
                border: '1px solid var(--border)', padding: '20px', marginBottom: '12px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
                  เงินทุนปัจจุบัน
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {renderField('สินทรัพย์รวม / เงินออมทั้งหมด', capital, setCapital, '฿')}
                  {renderField('เงินสำรองฉุกเฉิน', emergency, setEmergency, '฿')}
                </div>
                <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }} />
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
                  แผนออม & เป้าหมาย
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {renderField('เงินออมต่อเดือน', savings, setSavings, '฿')}
                  {renderField('เป้าหมายรายได้หลังเกษียณ (ต่อเดือน)', retGoal, setRetGoal, '฿')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 28px 24px', borderTop: '1px solid var(--border)',
          flexShrink: 0, display: 'flex', gap: '10px', alignItems: 'center',
        }}>
          {step === 0 ? (
            <button
              id="onboarding-skip-btn"
              onClick={handleSkip}
              disabled={saving}
              style={{
                padding: '11px 20px', borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--bg-sub)',
                color: 'var(--text-muted)', fontFamily: "'Google Sans Flex','Kanit',sans-serif",
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                opacity: saving ? 0.5 : 1, flexShrink: 0,
              }}>
              ข้ามไปก่อน
            </button>
          ) : (
            <button
              onClick={() => setStep(s => (s - 1) as Step)}
              style={{
                padding: '11px 16px', borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--bg-sub)',
                color: 'var(--text-muted)', fontFamily: "'Google Sans Flex','Kanit',sans-serif",
                fontSize: '13px', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
              }}>
              ← กลับ
            </button>
          )}

          <button
            id={step === 2 ? 'onboarding-save-btn' : 'onboarding-next-btn'}
            onClick={step < 2 ? () => setStep(s => (s + 1) as Step) : handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
              background: step === 2
                ? 'linear-gradient(135deg, #2563eb, #7c3aed)'
                : 'var(--accent-blue)',
              color: '#fff',
              fontFamily: "'Google Sans Flex','Kanit',sans-serif",
              fontSize: '14px', fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
              transition: 'all 0.2s', opacity: saving ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
            {saving ? (
              <>
                <span className="auth-spinner" style={{
                  width: '14px', height: '14px', borderWidth: '2px',
                  borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff',
                }} />
                กำลังบันทึก...
              </>
            ) : step === 0 ? 'เริ่มกรอกข้อมูล →'
              : step === 1 ? 'ถัดไป: เงินทุน →'
              : <><FloppyDisk weight="bold" /> บันทึกและเริ่มใช้งาน</>}
          </button>
        </div>
      </div>
    </>
  )
}
