'use client'
import '../ui/SettingsPanel.css';

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useFinance } from '@/contexts/FinanceContext'
import { DebtItem } from '@/lib/financeService'


interface SettingsPanelProps {
  theme: 'light' | 'dark'
  onThemeChange: (t: 'light' | 'dark') => void
  onClose: () => void
}

export default function SettingsPanel({ theme, onThemeChange, onClose }: SettingsPanelProps) {
  const { user, updateDisplayName, updateUserEmail, resetPassword, logout } = useAuth()
  const {
    financeData, loading, saving, saved, isDirty,
    updateExpenses, updateAssets, updateRetirement, updateDebts,
    saveFinanceData, discardChanges,
  } = useFinance()
  const router = useRouter()

  // Debt management local state
  const [newDebtName, setNewDebtName] = useState('')
  const [newDebtMonthly, setNewDebtMonthly] = useState('')
  const [newDebtTotal, setNewDebtTotal] = useState('')
  const [newDebtYear, setNewDebtYear] = useState('')
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null)
  const [editDebt, setEditDebt] = useState<Partial<DebtItem>>({})

  type Section = 'profile' | 'finance' | 'account'
  type FinanceTab = 1 | 2
  const [section, setSection] = useState<Section>('profile')
  const [financeTab, setFinanceTab] = useState<FinanceTab>(1)

  // Profile edit state
  const [editName, setEditName] = useState(user?.displayName || '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Email edit state
  const [editEmail, setEditEmail] = useState(user?.email || '')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Account state
  const [pwEmailSent, setPwEmailSent] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)



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

  const handleSaveEmail = async () => {
    if (!editEmail.trim() || editEmail.trim() === user?.email) return
    setEmailLoading(true); setEmailMsg(null)
    try {
      await updateUserEmail(editEmail.trim())
      setEmailMsg({ type: 'ok', text: 'บันทึก Email สำเร็จ' })
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setEmailMsg({ type: 'err', text: 'กรุณาเข้าสู่ระบบใหม่เพื่อเปลี่ยน Email' })
      } else {
        setEmailMsg({ type: 'err', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่' })
      }
    } finally { setEmailLoading(false) }
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


  const totalExpense = Object.values(financeData.expenses).reduce((s, v) => s + v, 0)
  // debt is now auto-computed from debts array, so subtract once to avoid double-counting in display
  const debtItems: DebtItem[] = Array.isArray(financeData.debts) ? financeData.debts : []
  const totalDebtMonthly = debtItems.reduce((s, d) => s + (d.monthlyPayment || 0), 0)
  const totalExpenseDisplay = (totalExpense - financeData.expenses.debt) + totalDebtMonthly
  const isGoogle       = user?.providerData?.[0]?.providerId === 'google.com'
  const initials       = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || '?'

  const NAV = [
    { key: 'profile' as Section, icon: <i className="fi fi-sr-user"></i>, label: 'โปรไฟล์' },
    { key: 'finance' as Section, icon: <i className="fi fi-sr-book"></i>, label: 'บันทึกการเงิน' },
    { key: 'account' as Section, icon: <i className="fi fi-sr-lock"></i>, label: 'บัญชี & ความปลอดภัย' },
  ]

  const inputStyle = {
    // using class sp-input-styled instead
  }

  const sectionTitle = (t: string) => (
    <div className="sp-font-15-bold">{t}</div>
  )

  // Generic expense field
  const expenseField = (label: React.ReactNode, key: keyof typeof financeData.expenses) => (
    <div key={key} style={{ marginBottom: '12px' }}>
      <label className="sp-form-label">{label}</label>
      <div className="sp-input-wrapper">
        <span className="sp-input-prefix">฿</span>
        <input type="number" min="0" onWheel={(e) => e.currentTarget.blur()} className="sp-input-styled"
          value={financeData.expenses[key]}
          onChange={e => updateExpenses({ [key]: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) })}
          onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>
    </div>
  )

  // Generic asset field
  const assetField = (label: React.ReactNode, key: keyof typeof financeData.assets) => (
    <div key={key} style={{ marginBottom: '12px' }}>
      <label className="sp-form-label">{label}</label>
      <div className="sp-input-wrapper">
        <span className="sp-input-prefix">฿</span>
        <input type="number" min="0" onWheel={(e) => e.currentTarget.blur()} className="sp-input-styled"
          value={financeData.assets[key]}
          onChange={e => updateAssets({ [key]: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) })}
          onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="sp-backdrop" />

      {/* Panel */}
      <div className="sp-panel">

        {/* Header */}
        <div className="sp-header">
          <div className="sp-header-inner">
            <div className="sp-header-title">
              <div className="sp-logo">FS</div>
              <span className="sp-title-text">ตั้งค่า</span>
            </div>
            <button id="settings-close-btn" onClick={onClose} className="sp-close-btn">✕</button>
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
                <span className="sp-sidebar-icon">{n.icon}</span>
                <span>{n.label}</span>
                {/* dirty dot on finance tab */}
                {n.key === 'finance' && isDirty && (
                  <div className="sp-dirty-dot" />
                )}
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="settings-main-content">
            <div className="sp-scroll-content">

              {/* ══════════ PROFILE ══════════ */}
              {section === 'profile' && (
                <div>
                  <div className="sp-section-header">โปรไฟล์</div>

                  {/* Avatar row */}
                  <div className="sp-avatar-row">
                    <div className="sp-avatar-lg">
                      {user?.photoURL
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={user.photoURL} alt="avatar" className="sp-avatar-img" referrerPolicy="no-referrer" />
                        : initials}
                    </div>
                    <div>
                      <div className="sp-user-name">{user?.displayName || 'ผู้ใช้งาน'}</div>
                      <div className="sp-user-email">{user?.email}</div>
                      {isGoogle && (
                        <div className="sp-google-badge">
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
                  <div className="sp-card">
                    {sectionTitle('แก้ไขชื่อที่แสดง')}
                    <div className="sp-edit-row">
                      <input id="edit-displayname-input" type="text" value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="ชื่อที่ต้องการแสดง"
                        className="sp-input-styled sp-input-no-pl"
                        onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                        onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                      />
                      <button id="save-name-btn" onClick={handleSaveName}
                        disabled={nameLoading || !editName.trim() || editName.trim() === user?.displayName}
                        className={`sp-btn-save ${(nameLoading || !editName.trim() || editName.trim() === user?.displayName) ? 'sp-opacity-50' : ''}`}>
                        {nameLoading ? '...' : 'บันทึก'}
                      </button>
                    </div>
                    {nameMsg && (
                      <div className={nameMsg.type === 'ok' ? 'sp-msg-ok' : 'sp-msg-err'}>
                        {nameMsg.type === 'ok' ? <i className="fi fi-sr-check-circle"></i> : <i className="fi fi-sr-exclamation"></i>} {nameMsg.text}
                      </div>
                    )}
                  </div>

                  {/* Theme Toggle */}
                  <div className="sp-theme-card">
                    <div>
                      {sectionTitle('การแสดงผล')}
                      <div className="sp-theme-sub">เลือกโหมดสว่าง / มืด</div>
                    </div>
                    <button onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')} className="sp-theme-btn">
                      {theme === 'dark' ? 'Light' : 'Dark'}
                    </button>
                  </div>

                  {/* Email Settings */}
                  <div className="sp-card">
                    {sectionTitle('Email')}
                    {isGoogle ? (
                      <>
                        <div className="sp-email-row">
                          <input type="email" readOnly value={user?.email || ''}
                            className="sp-input-styled sp-input-readonly sp-input-no-pl" />
                          <span className="sp-email-badge">แก้ไขไม่ได้</span>
                        </div>
                        <div className="sp-email-sub">
                          Email ผูกกับ Google Account
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="sp-edit-row">
                          <input type="email" value={editEmail}
                            onChange={e => setEditEmail(e.target.value)}
                            placeholder="Email ใหม่"
                            className="sp-input-styled sp-input-no-pl"
                            onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                            onKeyDown={e => e.key === 'Enter' && handleSaveEmail()}
                          />
                          <button onClick={handleSaveEmail}
                            disabled={emailLoading || !editEmail.trim() || editEmail.trim() === user?.email}
                            className={`sp-btn-save ${(emailLoading || !editEmail.trim() || editEmail.trim() === user?.email) ? 'sp-opacity-50' : ''}`}>
                            {emailLoading ? '...' : 'บันทึก'}
                          </button>
                        </div>
                        {emailMsg && (
                          <div className={emailMsg.type === 'ok' ? 'sp-msg-ok sp-msg-mt' : 'sp-msg-err sp-msg-mt'}>
                            {emailMsg.type === 'ok' ? <i className="fi fi-sr-check-circle"></i> : <i className="fi fi-sr-exclamation"></i>} {emailMsg.text}
                          </div>
                        )}
                        <div className={`sp-email-sub ${emailMsg ? '' : 'sp-msg-mt'}`}>
                          อาจต้องเข้าสู่ระบบใหม่เพื่อยืนยันตัวตน (หากไม่เข้าสู่ระบบนานเกินไป)
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ══════════ FINANCE ══════════ */}
              {section === 'finance' && (
                <div>
                  <div className="sp-section-header">บันทึกการเงิน</div>

                  {/* Loading state */}
                  {loading ? (
                    <div className="sp-loading">
                      <div className="auth-spinner sp-spinner-md" />
                      กำลังโหลดข้อมูล...
                    </div>
                  ) : (
                    <>
                      {/* Finance Tab Pills */}
                      <div className="sp-tabs-wrap">
                        {([
                          [1, <><i className="fi fi-sr-money-bill-wave sp-icon-14"></i> รายจ่าย</>],
                          [2, <><i className="fi fi-sr-coins sp-icon-14"></i> ทุน &เป้าหมาย</>],
                        ] as [FinanceTab, React.ReactNode][]).map(([t, label]) => (
                          <button key={t} id={`finance-tab-${t}`} onClick={() => setFinanceTab(t)} className={`sp-tab-btn ${financeTab === t ? 'active' : ''}`}>
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* ─ Tab 1: รายจ่าย ─ */}
                      {financeTab === 1 && (
                        <div>
                          {sectionTitle('ค่าใช้จ่ายรายเดือน')}
                          {expenseField(<><i className="fi fi-sr-restaurant sp-icon-16"></i> ค่าอาหาร</>, 'food')}
                          {expenseField(<><i className="fi fi-sr-home sp-icon-16"></i> ค่าที่พัก / ค่าเช่า</>, 'rent')}
                          {expenseField(<><i className="fi fi-sr-car sp-icon-16"></i> ค่าเดินทาง / ค่าน้ำมัน</>, 'transport')}
                          {expenseField(<><i className="fi fi-sr-shopping-cart sp-icon-16"></i> ซื้อของใช้จำเป็น</>, 'necessities')}
                          {expenseField(<><i className="fi fi-sr-box sp-icon-16"></i> ค่าอื่นๆ</>, 'other')}

                          {/* ─ Debt Items Section ─ */}
                          <div className="sp-divider" />
                          <div className="flex items-center justify-between mb-3">
                            <div className="sp-font-15-bold mb-0">
                              <i className="fi fi-sr-credit-card sp-icon-16 mr-[6px]"></i>
                              ภาระหนี้สินรายประเภท
                            </div>
                            {totalDebtMonthly > 0 && (
                              <span className="text-[12px] text-[var(--red)] font-bold font-['Space_Mono']">
                                -{totalDebtMonthly.toLocaleString()} ฿/เดือน
                              </span>
                            )}
                          </div>

                          {/* Debt list */}
                          {debtItems.length === 0 ? (
                            <div className="text-center py-4 text-[var(--text-muted)] text-[13px] bg-[var(--bg-sub)] rounded-[10px] border border-dashed border-[var(--border)] mb-3">
                              <i className="fi fi-sr-check-circle mr-[6px] text-[var(--green)]"></i>
                              ยังไม่มีรายการหนี้ที่บันทึกไว้
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 mb-3">
                              {debtItems.map(d => (
                                <div key={d.id} className="bg-[var(--bg-sub)] border border-[var(--border)] rounded-[10px] px-[14px] py-3">
                                  {editingDebtId === d.id ? (
                                    /* ─ Edit Mode ─ */
                                    <div className="flex flex-col gap-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="sp-form-label">ชื่อหนี้</label>
                                          <input type="text" className="sp-input-styled sp-input-no-pl"
                                            value={editDebt.name ?? d.name}
                                            onChange={e => setEditDebt(prev => ({ ...prev, name: e.target.value }))}
                                            onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                                            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                                          />
                                        </div>
                                        <div>
                                          <label className="sp-form-label">ชำระ/เดือน (฿)</label>
                                          <div className="sp-input-wrapper">
                                            <span className="sp-input-prefix">฿</span>
                                            <input type="number" min="0" className="sp-input-styled" onWheel={e => e.currentTarget.blur()}
                                              value={editDebt.monthlyPayment ?? d.monthlyPayment}
                                              onChange={e => setEditDebt(prev => ({ ...prev, monthlyPayment: Number(e.target.value) }))}
                                              onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                                              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <label className="sp-form-label">ยอดหนี้รวม (฿)</label>
                                          <div className="sp-input-wrapper">
                                            <span className="sp-input-prefix">฿</span>
                                            <input type="number" min="0" className="sp-input-styled" onWheel={e => e.currentTarget.blur()}
                                              value={editDebt.totalDebt ?? d.totalDebt}
                                              onChange={e => setEditDebt(prev => ({ ...prev, totalDebt: Number(e.target.value) }))}
                                              onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                                              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <label className="sp-form-label">ปีที่จะปลดหมด</label>
                                          <input type="number" min="2025" className="sp-input-styled sp-input-no-pl" onWheel={e => e.currentTarget.blur()}
                                            value={editDebt.targetYear ?? d.targetYear}
                                            onChange={e => setEditDebt(prev => ({ ...prev, targetYear: Number(e.target.value) }))}
                                            onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                                            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-[6px] justify-end">
                                        <button className="sp-cancel-btn" onClick={() => { setEditingDebtId(null); setEditDebt({}) }}>ยกเลิก</button>
                                        <button className="sp-btn-save px-[14px] py-2" onClick={() => {
                                          const updated = debtItems.map(item => item.id === d.id ? {
                                            ...item,
                                            name: editDebt.name ?? item.name,
                                            monthlyPayment: editDebt.monthlyPayment ?? item.monthlyPayment,
                                            totalDebt: editDebt.totalDebt ?? item.totalDebt,
                                            targetYear: editDebt.targetYear ?? item.targetYear,
                                          } : item)
                                          updateDebts(updated)
                                          setEditingDebtId(null); setEditDebt({})
                                        }}>บันทึก</button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* ─ View Mode ─ */
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <div className="font-bold text-[14px] text-[var(--text-main)] mb-1">
                                          <i className="fi fi-sr-bank mr-[6px] text-[var(--accent-blue)]"></i>
                                          {d.name}
                                        </div>
                                        <div className="text-[12px] text-[var(--red)] font-semibold">
                                          -{d.monthlyPayment.toLocaleString()} ฿/เดือน
                                        </div>
                                        <div className="text-[11px] text-[var(--text-muted)] mt-[2px] flex gap-[10px]">
                                          <span>ยอดรวม: ฿{d.totalDebt.toLocaleString()}</span>
                                          <span>ปลดหนี้ปี {d.targetYear}</span>
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <button className="bg-transparent border border-[var(--border)] rounded-md px-[10px] py-[6px] text-[var(--accent-blue)] cursor-pointer text-[12px]"
                                          onClick={() => { setEditingDebtId(d.id); setEditDebt({}) }}>
                                          <i className="fi fi-sr-edit"></i>
                                        </button>
                                        <button className="bg-transparent border border-[var(--border)] rounded-md px-[10px] py-[6px] text-[var(--red)] cursor-pointer text-[12px]"
                                          onClick={() => updateDebts(debtItems.filter(item => item.id !== d.id))}>
                                          <i className="fi fi-sr-trash"></i>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add new debt form */}
                          <div className="bg-[var(--bg-sub)] border border-dashed border-[var(--border)] rounded-[10px] p-[14px] mb-3">
                            <div className="text-[12px] font-bold text-[var(--text-muted)] mb-[10px] flex items-center gap-[6px]">
                              <i className="fi fi-sr-add"></i> เพิ่มรายการหนี้ใหม่
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div className="col-span-2">
                                <label className="sp-form-label">ชื่อหนี้ (เช่น ผ่อนบ้าน, ผ่อนรถ)</label>
                                <input type="text" placeholder="ระบุชื่อหนี้" className="sp-input-styled sp-input-no-pl"
                                  value={newDebtName} onChange={e => setNewDebtName(e.target.value)}
                                  onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                              </div>
                              <div>
                                <label className="sp-form-label">ชำระ/เดือน (฿)</label>
                                <div className="sp-input-wrapper">
                                  <span className="sp-input-prefix">฿</span>
                                  <input type="number" min="0" placeholder="0" className="sp-input-styled" onWheel={e => e.currentTarget.blur()}
                                    value={newDebtMonthly} onChange={e => setNewDebtMonthly(e.target.value)}
                                    onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                                    onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                                </div>
                              </div>
                              <div>
                                <label className="sp-form-label">ยอดหนี้รวม (฿)</label>
                                <div className="sp-input-wrapper">
                                  <span className="sp-input-prefix">฿</span>
                                  <input type="number" min="0" placeholder="0" className="sp-input-styled" onWheel={e => e.currentTarget.blur()}
                                    value={newDebtTotal} onChange={e => setNewDebtTotal(e.target.value)}
                                    onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                                    onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                                </div>
                              </div>
                              <div className="col-span-2">
                                <label className="sp-form-label">ปีที่จะปลดหนี้หมด (เช่น 2573)</label>
                                <input type="number" min="2025" placeholder={String(new Date().getFullYear() + 5)} className="sp-input-styled sp-input-no-pl" onWheel={e => e.currentTarget.blur()}
                                  value={newDebtYear} onChange={e => setNewDebtYear(e.target.value)}
                                  onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                              </div>
                            </div>
                            <button
                              className={`sp-btn-save w-full p-[10px] rounded-lg ${(!newDebtName || !newDebtMonthly) ? 'opacity-50' : 'opacity-100'}`}
                              disabled={!newDebtName || !newDebtMonthly}
                              onClick={() => {
                                if (!newDebtName || !newDebtMonthly) return
                                const newItem: DebtItem = {
                                  id: Date.now().toString(),
                                  name: newDebtName.trim(),
                                  monthlyPayment: Number(newDebtMonthly),
                                  totalDebt: Number(newDebtTotal) || 0,
                                  targetYear: Number(newDebtYear) || new Date().getFullYear() + 5,
                                }
                                updateDebts([...debtItems, newItem])
                                setNewDebtName(''); setNewDebtMonthly(''); setNewDebtTotal(''); setNewDebtYear('')
                              }}
                            >
                              <i className="fi fi-sr-add"></i> เพิ่มรายการหนี้
                            </button>
                          </div>

                          <div className="sp-total-row">
                            <span className="sp-total-label">รวมรายจ่ายทั้งหมด</span>
                            <span className="sp-total-val">
                              ฿{totalExpenseDisplay.toLocaleString()}/เดือน
                            </span>
                          </div>
                        </div>
                      )}


                      {/* ─ Tab 2: ทุน & เป้าหมาย ─ */}
                      {financeTab === 2 && (
                        <div>
                          {sectionTitle('เงินทุนปัจจุบัน')}
                          {assetField(<><i className="fi fi-sr-money-bill-wave sp-icon-16"></i> เงินทุนปัจจุบัน (สินทรัพย์รวม)</>, 'currentCapital')}
                          {assetField(<><i className="fi fi-sr-shield-check sp-icon-16"></i> เงินสำรองฉุกเฉิน</>, 'emergencyFund')}
                          <div className="sp-divider" />
                          {sectionTitle('แผนออมและเป้าหมาย')}
                          {assetField(<><i className="fi fi-sr-chart-line-up sp-icon-16"></i> เงินออมในแต่ละเดือน</>, 'monthlySavings')}
                          {assetField(<><i className="fi fi-sr-bullseye sp-icon-16"></i> เป้าหมายเงินปันผลหลังเกษียณ(ต่อปี)</>, 'retirementGoal')}

                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ══════════ ACCOUNT ══════════ */}
              {section === 'account' && (
                <div>
                  <div className="sp-section-header">บัญชี & ความปลอดภัย</div>

                  <div className="sp-card">
                    {sectionTitle('บัญชีที่ใช้งานอยู่')}
                    <div className="sp-account-user">
                      <div className="sp-account-avatar">
                        {user?.photoURL
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={user.photoURL} alt="avatar" className="sp-avatar-img" referrerPolicy="no-referrer" />
                          : initials}
                      </div>
                      <div>
                        <div className="sp-account-name">{user?.displayName || 'ผู้ใช้งาน'}</div>
                        <div className="sp-account-email">{user?.email}</div>
                        <div className="sp-account-status">
                          <div className="sp-status-dot" />
                          <span className="sp-status-text">เข้าสู่ระบบอยู่</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sp-card">
                    {sectionTitle('ความปลอดภัย')}
                    {isGoogle ? (
                      <div className="sp-pw-google">
                        <i className="fi fi-sr-link"></i> บัญชีนี้ผูกกับ Google — รหัสผ่านจัดการผ่าน Google Account ของคุณ
                      </div>
                    ) : pwEmailSent ? (
                      <div className="sp-pw-sent">
                        ✓ ส่ง Email รีเซ็ตรหัสผ่านไปที่ <strong>{user?.email}</strong> แล้ว
                      </div>
                    ) : (
                      <>
                        <div className="sp-danger-title">เปลี่ยนรหัสผ่าน</div>
                        <div className="sp-pw-desc">
                          คุณสามารถขอลิงก์รีเซ็ตรหัสผ่านเพื่อตั้งรหัสผ่านใหม่ ลิงก์จะถูกส่งไปยัง Email ของคุณ
                        </div>
                        <button id="send-reset-pw-btn" onClick={handleSendResetPw} disabled={pwLoading} className={`sp-pw-btn ${pwLoading ? 'sp-cursor-not-allowed sp-opacity-60' : 'sp-cursor-pointer'}`}>
                          {pwLoading ? 'กำลังส่ง...' : <><i className="fi fi-sr-envelope"></i> ส่งลิงก์รีเซ็ตรหัสผ่าน</>}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="sp-divider sp-divider-sm" />

                  <div className="sp-card sp-card-danger">
                    <div className="sp-danger-title">ออกจากระบบ</div>
                    <button id="settings-logout-btn" onClick={handleLogout} disabled={loggingOut} className={`sp-logout-btn ${loggingOut ? 'sp-cursor-not-allowed sp-opacity-60' : 'sp-cursor-pointer'}`}>
                      {loggingOut
                        ? <><span className="auth-spinner sp-spinner-sm sp-spinner-danger" /> กำลังออกจากระบบ...</>
                        : <><i className="fi fi-rr-sign-out-alt sp-bold"></i> ออกจากระบบ</>
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Sticky Save Bar (finance section only) ─── */}
            {section === 'finance' && !loading && (
              <div className={`sp-save-bar ${isDirty ? 'dirty' : 'clean'}`}>
                {isDirty ? (
                  <div className="sp-save-content">
                    <div className="sp-save-alert">
                      <div className="sp-save-alert-dot" />
                      มีการเปลี่ยนแปลงที่ยังไม่บันทึก
                    </div>
                    <button id="cancel-finance-btn" onClick={discardChanges} className="sp-cancel-btn">ยกเลิก</button>
                    <button id="save-finance-btn" onClick={() => saveFinanceData()} disabled={saving} className="sp-save-btn">
                      {saving
                        ? <><span className="auth-spinner sp-spinner-sm" /> กำลังบันทึก...</>
                        : 'บันทึกการเปลี่ยนแปลง'
                      }
                    </button>
                  </div>
                ) : saved ? (
                  <div className="sp-saved-msg">
                    ✓ บันทึกข้อมูลการเงินเรียบร้อยแล้ว
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>


    </>
  )
}

