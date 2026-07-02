'use client'
import '../ui/SettingsPanel.css';


import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useFinance } from '@/contexts/FinanceContext'


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
    saveFinanceData, discardChanges,
  } = useFinance()
  const router = useRouter()

  type Section = 'profile' | 'finance' | 'account'
  type FinanceTab = 1 | 2
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


  const totalExpense   = Object.values(financeData.expenses).reduce((s, v) => s + v, 0)
  const isGoogle       = user?.providerData?.[0]?.providerId === 'google.com'
  const initials       = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || '?'

  const NAV = [
    { key: 'profile' as Section, icon: <i className="fi fi-sr-user"></i>, label: 'โปรไฟล์' },
    { key: 'finance' as Section, icon: <i className="fi fi-sr-book"></i>, label: 'บันทึกการเงิน' },
    { key: 'account' as Section, icon: <i className="fi fi-sr-lock"></i>, label: 'บัญชี & ความปลอดภัย' },
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
        <input type="number" min="0" onWheel={(e) => e.currentTarget.blur()} style={{ ...inputStyle, paddingLeft: '28px' }}
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
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-light)', fontWeight: 600 }}>฿</span>
        <input type="number" min="0" onWheel={(e) => e.currentTarget.blur()} style={{ ...inputStyle, paddingLeft: '28px' }}
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
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                        onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                      />
                      <button id="save-name-btn" onClick={handleSaveName}
                        disabled={nameLoading || !editName.trim() || editName.trim() === user?.displayName}
                        className="sp-btn-save"
                        style={{ opacity: (nameLoading || !editName.trim() || editName.trim() === user?.displayName) ? 0.5 : 1 }}>
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
                      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                    </button>
                  </div>

                  {/* Email read-only */}
                  <div className="sp-card">
                    {sectionTitle('Email')}
                    <div className="sp-email-row">
                      <input type="email" readOnly value={user?.email || ''}
                        style={{ ...inputStyle, background: 'var(--border)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                      <span className="sp-email-badge">แก้ไขไม่ได้</span>
                    </div>
                    <div className="sp-email-sub">
                      {isGoogle ? 'Email ผูกกับ Google Account' : 'ติดต่อ support เพื่อเปลี่ยน Email'}
                    </div>
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
                      <div className="auth-spinner" style={{ margin: '0 auto 12px', width: '24px', height: '24px' }} />
                      กำลังโหลดข้อมูล...
                    </div>
                  ) : (
                    <>
                      {/* Finance Tab Pills */}
                      <div className="sp-tabs-wrap">
                        {([
                          [1, <><i className="fi fi-sr-money-bill-wave" style={{ fontSize: '14px' }}></i> รายจ่าย</>],
                          [2, <><i className="fi fi-sr-coins" style={{ fontSize: '14px' }}></i> ทุน &เป้าหมาย</>],
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
                          {expenseField(<><i className="fi fi-sr-restaurant" style={{ fontSize: '16px' }}></i> ค่าอาหาร</>, 'food')}
                          {expenseField(<><i className="fi fi-sr-home" style={{ fontSize: '16px' }}></i> ค่าที่พัก / ผ่อนบ้าน</>, 'rent')}
                          {expenseField(<><i className="fi fi-sr-car" style={{ fontSize: '16px' }}></i> ค่าเดินทาง / ผ่อนรถ</>, 'transport')}
                          {expenseField(<><i className="fi fi-sr-shopping-cart" style={{ fontSize: '16px' }}></i> ซื้อของใช้จำเป็น</>, 'necessities')}
                          {expenseField(<><i className="fi fi-sr-box" style={{ fontSize: '16px' }}></i> ค่าอื่นๆ</>, 'other')}
                          {expenseField(<><i className="fi fi-sr-credit-card" style={{ fontSize: '16px' }}></i> ภาระหนี้สินที่ต้องจ่าย/เดือน</>, 'debt')}
                          <div className="sp-total-row">
                            <span className="sp-total-label">รวมรายจ่ายทั้งหมด</span>
                            <span className="sp-total-val">
                              ฿{totalExpense.toLocaleString()}/เดือน
                            </span>
                          </div>
                        </div>
                      )}

                      {/* ─ Tab 2: ทุน & เป้าหมาย ─ */}
                      {financeTab === 2 && (
                        <div>
                          {sectionTitle('เงินทุนปัจจุบัน')}
                          {assetField(<><i className="fi fi-sr-money-bill-wave" style={{ fontSize: '16px' }}></i> เงินทุนปัจจุบัน (สินทรัพย์รวม)</>, 'currentCapital')}
                          {assetField(<><i className="fi fi-sr-shield-check" style={{ fontSize: '16px' }}></i> เงินสำรองฉุกเฉิน</>, 'emergencyFund')}
                          <div className="sp-divider" />
                          {sectionTitle('แผนออมและเป้าหมาย')}
                          {assetField(<><i className="fi fi-sr-chart-line-up" style={{ fontSize: '16px' }}></i> เงินออมในแต่ละเดือน</>, 'monthlySavings')}
                          {assetField(<><i className="fi fi-sr-bullseye" style={{ fontSize: '16px' }}></i> เป้าหมายรายได้หลังเกษียณ (ต่อเดือน)</>, 'retirementGoal')}

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
                      <div>
                        <div className="sp-pw-desc">
                          กดปุ่มด้านล่างเพื่อรับ Email สำหรับตั้งรหัสผ่านใหม่
                        </div>
                        <button id="send-reset-pw-btn" onClick={handleSendResetPw} disabled={pwLoading} className="sp-pw-btn" style={{ cursor: pwLoading ? 'not-allowed' : 'pointer', opacity: pwLoading ? 0.6 : 1 }}>
                          <i className="fi fi-sr-key"></i> {pwLoading ? 'กำลังส่ง...' : 'ส่ง Email เปลี่ยนรหัสผ่าน'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="sp-divider" style={{ margin: '8px 0 16px' }} />
                  <div className="sp-danger-title">
                    Danger Zone
                  </div>
                  <button id="settings-logout-btn" onClick={handleLogout} disabled={loggingOut} className="sp-logout-btn" style={{ cursor: loggingOut ? 'not-allowed' : 'pointer', opacity: loggingOut ? 0.6 : 1 }}>
                    {loggingOut
                      ? <><span className="auth-spinner" style={{ borderColor: 'rgba(220,38,38,0.3)', borderTopColor: 'var(--red)' }} /> กำลังออกจากระบบ...</>
                      : <><i className="fi fi-rr-sign-out-alt" style={{ fontWeight: 'bold' }}></i> ออกจากระบบ</>
                    }
                  </button>
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
                        ? <><span className="auth-spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> กำลังบันทึก...</>
                        : '💾 บันทึกการเปลี่ยนแปลง'
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

