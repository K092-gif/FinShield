'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useFinance } from '@/contexts/FinanceContext'
import { UserCircle, Notebook, LockKey, Money, CreditCard, Coins, ClipboardText, Key, Link as LinkIcon, SignOut, CheckCircle, WarningCircle, ForkKnife, House, Car, ShoppingCart, Package, ShieldCheck, TrendUp, Target } from '@phosphor-icons/react'

interface SettingsPanelProps {
  theme: 'light' | 'dark'
  onThemeChange: (t: 'light' | 'dark') => void
  onClose: () => void
}

export default function SettingsPanel({ theme, onThemeChange, onClose }: SettingsPanelProps) {
  const { user, updateDisplayName, resetPassword, logout } = useAuth()
  const {
    financeData, loading, saving, saved, isDirty,
    updateExpenses, updateAssets, updateRetirement,
    addDebt, removeDebt,
    saveFinanceData, discardChanges,
  } = useFinance()
  const router = useRouter()

  type Section = 'profile' | 'finance' | 'account'
  type FinanceTab = 1 | 2 | 3
  const [section, setSection] = useState<Section>('profile')
  const [financeTab, setFinanceTab] = useState<FinanceTab>(1)

  // Profile edit state
  const [editName, setEditName] = useState(user?.displayName || '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Account state
  const [pwEmailSent, setPwEmailSent] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Debt modal state
  const [debtModal, setDebtModal] = useState(false)
  const [newDebt, setNewDebt] = useState({ name: '', total: 0, monthly: 0 })

  const handleSaveName = async () => {
    if (!editName.trim()) return
    setNameLoading(true); setNameMsg(null)
    try {
      await updateDisplayName(editName.trim())
      setNameMsg({ type: 'ok', text: 'บันทึกชื่อสำเร็จ' })
    } catch {
      setNameMsg({ type: 'err', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่' })
    } finally { setNameLoading(false) }
  }

  const handleSendResetPw = async () => {
    if (!user?.email) return
    setPwLoading(true)
    try { await resetPassword(user.email); setPwEmailSent(true) }
    catch { /* ignore */ }
    finally { setPwLoading(false) }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    router.push('/login')
  }

  const handleAddDebt = () => {
    if (!newDebt.name.trim()) return
    addDebt(newDebt)
    setNewDebt({ name: '', total: 0, monthly: 0 })
    setDebtModal(false)
  }

  const totalDebtAmt   = financeData.debts.reduce((s, d) => s + d.total, 0)
  const totalMonthly   = financeData.debts.reduce((s, d) => s + d.monthly, 0)
  const totalExpense   = Object.values(financeData.expenses).reduce((s, v) => s + v, 0)
  const isGoogle       = user?.providerData?.[0]?.providerId === 'google.com'
  const initials       = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || '?'

  const NAV = [
    { key: 'profile' as Section, icon: <UserCircle weight="bold" />, label: 'โปรไฟล์' },
    { key: 'finance' as Section, icon: <Notebook weight="bold" />, label: 'บันทึกการเงิน' },
    { key: 'account' as Section, icon: <LockKey weight="bold" />, label: 'บัญชี & ความปลอดภัย' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    background: 'var(--bg-main)', border: '1.5px solid var(--border)',
    borderRadius: '8px', color: 'var(--text-main)',
    fontFamily: "'Google Sans Flex','Kanit',sans-serif",
    fontSize: '14px', fontWeight: 500, outline: 'none', transition: 'border 0.2s',
  }

  const sectionTitle = (t: string) => (
    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px' }}>{t}</div>
  )

  // Generic expense field
  const expenseField = (label: React.ReactNode, key: keyof typeof financeData.expenses) => (
    <div key={key} style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-light)', fontWeight: 600 }}>฿</span>
        <input type="number" style={{ ...inputStyle, paddingLeft: '28px' }}
          value={financeData.expenses[key] === 0 ? '' : financeData.expenses[key]}
          onChange={e => updateExpenses({ [key]: e.target.value === '' ? 0 : Number(e.target.value) })}
          onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>
    </div>
  )

  // Generic asset field
  const assetField = (label: React.ReactNode, key: keyof typeof financeData.assets) => (
    <div key={key} style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-light)', fontWeight: 600 }}>฿</span>
        <input type="number" style={{ ...inputStyle, paddingLeft: '28px' }}
          value={financeData.assets[key] === 0 ? '' : financeData.assets[key]}
          onChange={e => updateAssets({ [key]: e.target.value === '' ? 0 : Number(e.target.value) })}
          onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        animation: 'settingsFadeIn 0.2s ease',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        background: 'var(--bg-main)',
        zIndex: 301, display: 'flex', flexDirection: 'column',
        animation: 'settingsSlideIn 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <div style={{ width: '100%', maxWidth: '900px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px', background: 'var(--accent-blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Space Mono',monospace", fontSize: '10px', fontWeight: 700, color: '#fff',
              }}>FS</div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>ตั้งค่า</span>
            </div>
            <button id="settings-close-btn" onClick={onClose} style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'var(--bg-sub)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}>✕</button>
          </div>
        </div>

        <div className="settings-inner-layout">

          {/* Sidebar nav */}
          <div className="settings-sidebar">
            {NAV.map(n => (
              <button key={n.key} id={`settings-nav-${n.key}`} onClick={() => setSection(n.key)} className="settings-sidebar-btn" style={{
                background: section === n.key ? 'var(--card)' : 'transparent',
                color: section === n.key ? 'var(--accent-blue)' : 'var(--text-muted)',
                boxShadow: section === n.key ? 'var(--shadow-sm)' : 'none',
              }}>
                <span style={{ fontSize: '18px', display: 'flex' }}>{n.icon}</span>
                <span>{n.label}</span>
                {/* dirty dot on finance tab */}
                {n.key === 'finance' && isDirty && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: 'var(--gold)',
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="settings-main-content">
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

              {/* ══════════ PROFILE ══════════ */}
              {section === 'profile' && (
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px' }}>โปรไฟล์</div>

                  {/* Avatar row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div style={{
                      width: '72px', height: '72px', borderRadius: '50%',
                      background: 'var(--accent-blue)', overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '24px', fontWeight: 800, color: '#fff',
                      boxShadow: '0 4px 16px rgba(37,99,235,0.25)',
                    }}>
                      {user?.photoURL
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                        : initials}
                    </div>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>{user?.displayName || 'ผู้ใช้งาน'}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>{user?.email}</div>
                      {isGoogle && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px',
                          padding: '2px 8px', borderRadius: '100px',
                          background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
                          fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue)',
                        }}>
                          <svg width="10" height="10" viewBox="0 0 48 48" fill="none">
                            <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.8 20-21 0-1.4-.1-2.7-.5-4z" fill="#FFC107"/>
                            <path d="M6.3 14.7l7 5.1C15.1 16.4 19.2 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.9 6.3 14.7z" fill="#FF3D00"/>
                            <path d="M24 45c5.6 0 10.5-1.9 14.4-5l-6.7-5.7C29.7 36 27 37 24 37c-5.9 0-10.7-3.9-11.9-9.2L5.2 33c3.2 7 10.4 12 18.8 12z" fill="#4CAF50"/>
                            <path d="M44.5 20H24v8.5h11.8c-.7 2.4-2.1 4.4-4 5.8l6.7 5.7C41.9 36.4 45 31 45 24c0-1.4-.2-2.7-.5-4z" fill="#1976D2"/>
                          </svg>
                          Google Account
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit name */}
                  <div style={{ background: 'var(--bg-sub)', borderRadius: '12px', border: '1px solid var(--border)', padding: '18px', marginBottom: '16px' }}>
                    {sectionTitle('แก้ไขชื่อที่แสดง')}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input id="edit-displayname-input" type="text" value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="ชื่อที่ต้องการแสดง"
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                        onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                      />
                      <button id="save-name-btn" onClick={handleSaveName}
                        disabled={nameLoading || !editName.trim() || editName.trim() === user?.displayName}
                        style={{
                          padding: '0 16px', borderRadius: '8px', border: 'none',
                          background: 'var(--accent-blue)', color: '#fff',
                          fontFamily: "'Google Sans Flex','Kanit',sans-serif",
                          fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                          whiteSpace: 'nowrap', transition: 'all 0.2s',
                          opacity: (nameLoading || !editName.trim() || editName.trim() === user?.displayName) ? 0.5 : 1,
                        }}>
                        {nameLoading ? '...' : 'บันทึก'}
                      </button>
                    </div>
                    {nameMsg && (
                      <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 600, color: nameMsg.type === 'ok' ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {nameMsg.type === 'ok' ? <CheckCircle weight="bold" /> : <WarningCircle weight="bold" />} {nameMsg.text}
                      </div>
                    )}
                  </div>

                  {/* Theme Toggle */}
                  <div style={{ background: 'var(--bg-sub)', borderRadius: '12px', border: '1px solid var(--border)', padding: '18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {sectionTitle('การแสดงผล')}
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '-8px' }}>เลือกโหมดสว่าง / มืด</div>
                    </div>
                    <button onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')} style={{
                      padding: '8px 16px', borderRadius: '100px', border: '1px solid var(--border)',
                      background: 'var(--card)', color: 'var(--text-main)', fontSize: '14px', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                    </button>
                  </div>

                  {/* Email read-only */}
                  <div style={{ background: 'var(--bg-sub)', borderRadius: '12px', border: '1px solid var(--border)', padding: '18px' }}>
                    {sectionTitle('Email')}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="email" readOnly value={user?.email || ''}
                        style={{ ...inputStyle, background: 'var(--border)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-light)', whiteSpace: 'nowrap', fontWeight: 600 }}>แก้ไขไม่ได้</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '6px' }}>
                      {isGoogle ? 'Email ผูกกับ Google Account' : 'ติดต่อ support เพื่อเปลี่ยน Email'}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ FINANCE ══════════ */}
              {section === 'finance' && (
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>บันทึกการเงิน</div>

                  {/* Loading state */}
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <div className="auth-spinner" style={{ margin: '0 auto 12px', width: '24px', height: '24px' }} />
                      กำลังโหลดข้อมูล...
                    </div>
                  ) : (
                    <>
                      {/* Finance Tab Pills */}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: 'var(--bg-sub)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        {([
                          [1, <><Money weight="bold" size={14}/> รายจ่าย</>],
                          [2, <><CreditCard weight="bold" size={14}/> หนี้สิน</>],
                          [3, <><Coins weight="bold" size={14}/> ทุน &เป้าหมาย</>],
                        ] as [FinanceTab, React.ReactNode][]).map(([t, label]) => (
                          <button key={t} id={`finance-tab-${t}`} onClick={() => setFinanceTab(t)} style={{
                            flex: 1, padding: '7px 4px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                            background: financeTab === t ? 'var(--card)' : 'transparent',
                            color: financeTab === t ? 'var(--text-main)' : 'var(--text-muted)',
                            fontFamily: "'Google Sans Flex','Kanit',sans-serif",
                            fontSize: '12px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            boxShadow: financeTab === t ? 'var(--shadow-sm)' : 'none',
                            transition: 'all 0.2s',
                          }}>{label}</button>
                        ))}
                      </div>

                      {/* ─ Tab 1: รายจ่าย ─ */}
                      {financeTab === 1 && (
                        <div>
                          {sectionTitle('ค่าใช้จ่ายรายเดือน')}
                          {expenseField(<><ForkKnife weight="bold" size={16} /> ค่าอาหาร</>, 'food')}
                          {expenseField(<><House weight="bold" size={16} /> ค่าที่พัก / ผ่อนบ้าน</>, 'rent')}
                          {expenseField(<><Car weight="bold" size={16} /> ค่าเดินทาง / ผ่อนรถ</>, 'transport')}
                          {expenseField(<><ShoppingCart weight="bold" size={16} /> ซื้อของใช้จำเป็น</>, 'necessities')}
                          {expenseField(<><Package weight="bold" size={16} /> ค่าอื่นๆ</>, 'other')}
                          <div style={{
                            marginTop: '16px', padding: '14px 16px', borderRadius: '10px',
                            background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>รวมรายจ่ายทั้งหมด</span>
                            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '16px', fontWeight: 800, color: 'var(--accent-blue)' }}>
                              ฿{totalExpense.toLocaleString()}/เดือน
                            </span>
                          </div>
                        </div>
                      )}

                      {/* ─ Tab 2: หนี้สิน ─ */}
                      {financeTab === 2 && (
                        <div>
                          {sectionTitle('รายการหนี้สิน')}
                          {financeData.debts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                              <div style={{ fontSize: '32px', marginBottom: '8px', display: 'flex', justifyContent: 'center', color: 'var(--border2)' }}>
                                <ClipboardText weight="bold" />
                              </div>
                              ยังไม่มีรายการหนี้สิน
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                              {financeData.debts.map(d => (
                                <div key={d.id} style={{
                                  padding: '12px 14px', borderRadius: '10px',
                                  border: '1px solid var(--border)', background: 'var(--bg-main)',
                                  display: 'flex', alignItems: 'center', gap: '12px',
                                }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '3px' }}>{d.name}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                                      <span>ยอดรวม ฿{d.total.toLocaleString()}</span>
                                      <span>จ่าย/เดือน ฿{d.monthly.toLocaleString()}</span>
                                    </div>
                                  </div>
                                  <button onClick={() => removeDebt(d.id)} style={{
                                    width: '26px', height: '26px', borderRadius: '6px',
                                    border: '1px solid var(--border)', background: 'var(--bg-sub)',
                                    color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                                  }}>✕</button>
                                </div>
                              ))}
                            </div>
                          )}
                          <button id="add-debt-btn" onClick={() => setDebtModal(true)} style={{
                            width: '100%', padding: '11px', borderRadius: '10px',
                            border: '1.5px dashed var(--border2)', background: 'transparent',
                            color: 'var(--text-muted)', fontFamily: "'Google Sans Flex','Kanit',sans-serif",
                            fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          }}>+ เพิ่มรายการหนี้สิน</button>

                          {financeData.debts.length > 0 && (
                            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              {[
                                ['หนี้รวมทั้งหมด', `฿${totalDebtAmt.toLocaleString()}`, 'var(--red)'],
                                ['จ่าย/เดือน', `฿${totalMonthly.toLocaleString()}`, 'var(--gold)'],
                              ].map(([label, val, color]) => (
                                <div key={label} style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-sub)', border: '1px solid var(--border)' }}>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>{label}</div>
                                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: '15px', fontWeight: 800, color }}>{val}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ─ Tab 3: ทุน & เป้าหมาย ─ */}
                      {financeTab === 3 && (
                        <div>
                          {sectionTitle('เงินทุนปัจจุบัน')}
                          {assetField(<><Money weight="bold" size={16} /> เงินทุนปัจจุบัน (สินทรัพย์รวม)</>, 'currentCapital')}
                          {assetField(<><ShieldCheck weight="bold" size={16} /> เงินสำรองฉุกเฉิน</>, 'emergencyFund')}
                          <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }} />
                          {sectionTitle('แผนออมและเป้าหมาย')}
                          {assetField(<><TrendUp weight="bold" size={16} /> เงินออมในแต่ละเดือน</>, 'monthlySavings')}
                          {assetField(<><Target weight="bold" size={16} /> เป้าหมายรายได้หลังเกษียณ (ต่อเดือน)</>, 'retirementGoal')}

                          {financeData.assets.retirementGoal > 0 && financeData.assets.monthlySavings > 0 && (
                            <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '10px', background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Quick Insight</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                หากออมเดือนละ <strong style={{ color: 'var(--text-main)' }}>฿{financeData.assets.monthlySavings.toLocaleString()}</strong> ต้องการ
                                <strong style={{ color: 'var(--text-main)' }}> ฿{(financeData.assets.retirementGoal * 240).toLocaleString()}</strong> สำหรับ 20 ปีหลังเกษียณ
                                {' '}— ต้องออมอีก <strong style={{ color: 'var(--accent-blue)' }}>
                                  {Math.max(0, Math.ceil((financeData.assets.retirementGoal * 240 - financeData.assets.currentCapital) / financeData.assets.monthlySavings)).toLocaleString()}
                                </strong> เดือน
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ══════════ ACCOUNT ══════════ */}
              {section === 'account' && (
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px' }}>บัญชี & ความปลอดภัย</div>

                  <div style={{ background: 'var(--bg-sub)', borderRadius: '12px', border: '1px solid var(--border)', padding: '18px', marginBottom: '16px' }}>
                    {sectionTitle('บัญชีที่ใช้งานอยู่')}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: 'var(--accent-blue)', overflow: 'hidden', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: 800, color: '#fff',
                      }}>
                        {user?.photoURL
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                          : initials}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{user?.displayName || 'ผู้ใช้งาน'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{user?.email}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)' }} />
                          <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>เข้าสู่ระบบอยู่</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-sub)', borderRadius: '12px', border: '1px solid var(--border)', padding: '18px', marginBottom: '16px' }}>
                    {sectionTitle('ความปลอดภัย')}
                    {isGoogle ? (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LinkIcon weight="bold" /> บัญชีนี้ผูกกับ Google — รหัสผ่านจัดการผ่าน Google Account ของคุณ
                      </div>
                    ) : pwEmailSent ? (
                      <div style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 600 }}>
                        ✓ ส่ง Email รีเซ็ตรหัสผ่านไปที่ <strong>{user?.email}</strong> แล้ว
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.6 }}>
                          กดปุ่มด้านล่างเพื่อรับ Email สำหรับตั้งรหัสผ่านใหม่
                        </div>
                        <button id="send-reset-pw-btn" onClick={handleSendResetPw} disabled={pwLoading} style={{
                          padding: '10px 16px', borderRadius: '8px',
                          border: '1px solid var(--border)', background: 'var(--card)',
                          color: 'var(--text-main)', fontFamily: "'Google Sans Flex','Kanit',sans-serif",
                          fontSize: '13px', fontWeight: 700, cursor: pwLoading ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                          opacity: pwLoading ? 0.6 : 1,
                        }}>
                          <Key weight="bold" /> {pwLoading ? 'กำลังส่ง...' : 'ส่ง Email เปลี่ยนรหัสผ่าน'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0 16px' }} />
                  <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Danger Zone
                  </div>
                  <button id="settings-logout-btn" onClick={handleLogout} disabled={loggingOut} style={{
                    width: '100%', padding: '13px', borderRadius: '10px',
                    border: '1.5px solid rgba(220,38,38,0.3)',
                    background: 'rgba(220,38,38,0.06)', color: 'var(--red)',
                    fontFamily: "'Google Sans Flex','Kanit',sans-serif",
                    fontSize: '14px', fontWeight: 700, cursor: loggingOut ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s', opacity: loggingOut ? 0.6 : 1,
                  }}>
                    {loggingOut
                      ? <><span className="auth-spinner" style={{ borderColor: 'rgba(220,38,38,0.3)', borderTopColor: 'var(--red)' }} /> กำลังออกจากระบบ...</>
                      : <><SignOut weight="bold" /> ออกจากระบบ</>
                    }
                  </button>
                </div>
              )}
            </div>

            {/* ─── Sticky Save Bar (finance section only) ─── */}
            {section === 'finance' && !loading && (
              <div style={{
                flexShrink: 0, padding: '12px 24px',
                borderTop: isDirty ? '1px solid var(--border)' : '1px solid transparent',
                background: isDirty ? 'var(--bg-sub)' : 'transparent',
                transition: 'all 0.25s',
              }}>
                {isDirty ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
                      มีการเปลี่ยนแปลงที่ยังไม่บันทึก
                    </div>
                    <button id="cancel-finance-btn" onClick={discardChanges} style={{
                      padding: '8px 14px', borderRadius: '8px',
                      border: '1px solid var(--border)', background: 'var(--card)',
                      color: 'var(--text-muted)', fontFamily: "'Google Sans Flex','Kanit',sans-serif",
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>ยกเลิก</button>
                    <button id="save-finance-btn" onClick={saveFinanceData} disabled={saving} style={{
                      padding: '8px 20px', borderRadius: '8px', border: 'none',
                      background: 'var(--accent-blue)', color: '#fff',
                      fontFamily: "'Google Sans Flex','Kanit',sans-serif",
                      fontSize: '12px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                      opacity: saving ? 0.7 : 1, transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      {saving
                        ? <><span className="auth-spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> กำลังบันทึก...</>
                        : '💾 บันทึกการเปลี่ยนแปลง'
                      }
                    </button>
                  </div>
                ) : saved ? (
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
                    ✓ บันทึกข้อมูลการเงินเรียบร้อยแล้ว
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Debt Modal ── */}
      {debtModal && (
        <>
          <div onClick={() => setDebtModal(false)} style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: '360px', maxWidth: '90vw',
            background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)',
            padding: '24px', zIndex: 401, boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            animation: 'authCardIn 0.25s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard weight="bold" size={20} /> เพิ่มรายการหนี้สิน
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>ชื่อหนี้ / เจ้าหนี้</label>
              <input type="text" placeholder="เช่น บัตรเครดิต KBank"
                value={newDebt.name}
                onChange={e => setNewDebt(d => ({ ...d, name: e.target.value }))}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            {[
              { label: 'ยอดหนี้คงเหลือ (฿)', key: 'total' as const },
              { label: 'ชำระต่อเดือน (฿)', key: 'monthly' as const },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-light)', fontWeight: 600 }}>฿</span>
                  <input type="number" value={newDebt[f.key] === 0 ? '' : newDebt[f.key]}
                    onChange={e => setNewDebt(d => ({ ...d, [f.key]: e.target.value === '' ? 0 : Number(e.target.value) }))}
                    style={{ ...inputStyle, paddingLeft: '28px' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setDebtModal(false)} style={{
                flex: 1, padding: '11px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg-sub)',
                color: 'var(--text-muted)', fontFamily: "'Google Sans Flex','Kanit',sans-serif",
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              }}>ยกเลิก</button>
              <button id="confirm-add-debt-btn" onClick={handleAddDebt} disabled={!newDebt.name.trim()} style={{
                flex: 2, padding: '11px', borderRadius: '8px', border: 'none',
                background: 'var(--accent-blue)', color: '#fff',
                fontFamily: "'Google Sans Flex','Kanit',sans-serif",
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                opacity: !newDebt.name.trim() ? 0.5 : 1,
              }}>เพิ่มรายการ</button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
