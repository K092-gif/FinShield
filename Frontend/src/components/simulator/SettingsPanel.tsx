'use client'
import '../ui/SettingsPanel.css';

import React, { useState } from 'react'
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
    try {
      await resetPassword(user.email)
      setPwEmailSent(true)
    } catch {
      alert('เกิดข้อผิดพลาดในการส่ง Email กรุณาลองใหม่')
    } finally { setPwLoading(false) }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      router.push('/login')
    } catch {
      setLoggingOut(false)
    }
  }

  const debtItems: DebtItem[] = financeData.debts || []
  const totalDebtMonthly = debtItems.reduce((s, d) => s + (Number(d.monthlyPayment) || 0), 0)
  const totalExpenseDisplay = Object.entries(financeData.expenses).reduce((sum, [k, v]) => {
    return sum + (k === 'debt' ? totalDebtMonthly : (Number(v) || 0))
  }, 0)

  const isGoogle = user?.providerData?.some(p => p.providerId === 'google.com')
  const initials = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase()

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: 'profile', label: 'โปรไฟล์ & ธีม', icon: 'fi-rr-user' },
    { id: 'finance', label: 'ข้อมูลการเงิน & หนี้สิน', icon: 'fi-rr-wallet' },
    { id: 'account', label: 'ความปลอดภัย & บัญชี', icon: 'fi-rr-shield-check' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#fff9eb] dark:bg-[#161512] rounded-[36px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.15)] border border-[rgba(0,0,0,0.08)] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 sm:p-8 pb-4 flex items-center justify-between border-b border-gray-200/60 dark:border-gray-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1e1c10] dark:text-white tracking-tight m-0">
              Settings &amp; Preferences
            </h1>
            <p className="text-xs sm:text-sm text-[#747878] dark:text-[var(--text-muted)] m-0">
              จัดการข้อมูลโปรไฟล์ การเงิน หนี้สิน และความปลอดภัย
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 text-[#1e1c10] dark:text-gray-200 flex items-center justify-center border border-[rgba(0,0,0,0.06)] hover:bg-[#f4eedb] transition-all cursor-pointer shadow-sm text-sm"
          >
            <i className="fi fi-rr-cross text-xs"></i>
          </button>
        </div>

        {/* Section Navigation Tabs (Serene Pulse Pills) */}
        <div className="px-6 sm:px-8 py-3 bg-[#faf3e0] dark:bg-gray-900 flex gap-2 overflow-x-auto">
          {navItems.map(item => {
            const active = section === item.id
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border-0 ${
                  active
                    ? 'bg-[#fed330] text-[#1e1c10] shadow-sm'
                    : 'text-[#747878] hover:text-[#1e1c10] bg-transparent'
                }`}
              >
                <i className={`fi ${item.icon}`}></i>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">

          {/* ══════════ SECTION 1: PROFILE & APPEARANCE ══════════ */}
          {section === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Profile Card */}
              <div className="md:col-span-7 bg-white dark:bg-gray-800 rounded-[32px] p-6 sm:p-8 border border-[rgba(0,0,0,0.06)] dark:border-gray-700/60 shadow-sm space-y-5">
                <div className="flex items-center gap-2 text-base font-bold text-[#1e1c10] dark:text-white">
                  <i className="fi fi-rr-user text-sm"></i>
                  <span>ข้อมูลโปรไฟล์</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow bg-[#fed330] flex items-center justify-center font-black text-xl text-[#1e1c10]">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
                    ) : initials}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#1e1c10] dark:text-white">{user?.displayName || 'ผู้ใช้งาน'}</div>
                    <div className="text-xs text-[#747878] dark:text-[var(--text-muted)]">{user?.email}</div>
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#747878] dark:text-[var(--text-muted)] block pl-1">
                    ชื่อที่แสดง (Display Name)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-[#f4eedb] dark:bg-gray-900 text-[#1e1c10] dark:text-white text-sm font-semibold rounded-2xl py-3 px-4 border-0 outline-none focus:ring-2 focus:ring-[#1e1c10]"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={nameLoading || editName === user?.displayName}
                      className="btn-pill-primary text-xs shrink-0 disabled:opacity-50"
                    >
                      {nameLoading ? '...' : 'บันทึก'}
                    </button>
                  </div>
                  {nameMsg && (
                    <div className={`text-xs font-bold pl-1 ${nameMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                      {nameMsg.text}
                    </div>
                  )}
                </div>

                {/* Email Address */}
                {!isGoogle && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#747878] dark:text-[var(--text-muted)] block pl-1">
                      Email Address
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="flex-1 bg-[#f4eedb] dark:bg-gray-900 text-[#1e1c10] dark:text-white text-sm font-semibold rounded-2xl py-3 px-4 border-0 outline-none focus:ring-2 focus:ring-[#1e1c10]"
                      />
                      <button
                        onClick={handleSaveEmail}
                        disabled={emailLoading || editEmail === user?.email}
                        className="btn-pill-primary text-xs shrink-0 disabled:opacity-50"
                      >
                        {emailLoading ? '...' : 'บันทึก'}
                      </button>
                    </div>
                    {emailMsg && (
                      <div className={`text-xs font-bold pl-1 ${emailMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                        {emailMsg.text}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Appearance Yellow Bento Card */}
              <div className="md:col-span-5 bg-[#fed330] rounded-[32px] p-6 sm:p-8 border border-amber-300/60 shadow-sm flex flex-col justify-between space-y-5">
                <div className="flex items-center gap-2 text-base font-extrabold text-[#1e1c10]">
                  <i className="fi fi-rr-palette text-sm"></i>
                  <span>ธีมการแสดงผล (Appearance)</span>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => onThemeChange('light')}
                    className={`w-full p-4 rounded-2xl font-bold text-xs flex items-center justify-between transition-all border cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white text-[#1e1c10] border-[#1e1c10]/10 shadow-sm'
                        : 'bg-white/40 text-[#1e1c10]/70 border-transparent hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <i className="fi fi-rr-sun text-sm"></i>
                      <span>Light Mode (Serene Pulse)</span>
                    </div>
                    {theme === 'light' && (
                      <div className="w-5 h-5 rounded-full bg-[#1e1c10] text-white flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => onThemeChange('dark')}
                    className={`w-full p-4 rounded-2xl font-bold text-xs flex items-center justify-between transition-all border cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#1e1c10] text-white border-transparent shadow-sm'
                        : 'bg-white/40 text-[#1e1c10]/70 border-transparent hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <i className="fi fi-rr-moon text-sm"></i>
                      <span>Dark Mode</span>
                    </div>
                    {theme === 'dark' && (
                      <div className="w-5 h-5 rounded-full bg-[#fed330] text-[#1e1c10] flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-[#1e1c10]/70 font-semibold">
                  สลับโหมดสว่าง/มืดตามความสะดวกในการใช้งาน
                </div>
              </div>
            </div>
          )}

          {/* ══════════ SECTION 2: FINANCE & DEBTS ══════════ */}
          {section === 'finance' && (
            <div className="space-y-6">
              {/* Finance Subtabs */}
              <div className="flex gap-2 bg-[#f4eedb] dark:bg-gray-900 p-1.5 rounded-full w-fit">
                <button
                  onClick={() => setFinanceTab(1)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all border-0 cursor-pointer ${
                    financeTab === 1 ? 'bg-[#fed330] text-[#1e1c10] shadow-sm' : 'text-[#747878] bg-transparent'
                  }`}
                >
                  1. รายจ่ายประจำ &amp; หนี้สิน
                </button>
                <button
                  onClick={() => setFinanceTab(2)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all border-0 cursor-pointer ${
                    financeTab === 2 ? 'bg-[#fed330] text-[#1e1c10] shadow-sm' : 'text-[#747878] bg-transparent'
                  }`}
                >
                  2. เงินทุน &amp; เป้าหมายการออม
                </button>
              </div>

              {/* Tab 1: รายจ่าย 5 หมวด + หหนี้สิน */}
              {financeTab === 1 && (
                <div className="space-y-6">
                  {/* รายจ่าย 5 หมวด */}
                  <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 sm:p-8 border border-[rgba(0,0,0,0.06)] dark:border-gray-700/60 shadow-sm space-y-4">
                    <div className="text-base font-bold text-[#1e1c10] dark:text-white">
                      รายจ่ายประจำ (ต่อเดือน)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { key: 'food', label: 'อาหารและเครื่องดื่ม', icon: 'fi-sr-utensils' },
                        { key: 'rent', label: 'ที่อยู่อาศัย / ค่าเช่า', icon: 'fi-sr-home' },
                        { key: 'transport', label: 'การเดินทาง / ค่าน้ำมัน', icon: 'fi-sr-car' },
                        { key: 'necessities', label: 'ของใช้จำเป็น', icon: 'fi-sr-shopping-bag' },
                        { key: 'other', label: 'อื่นๆ / ท่องเที่ยว', icon: 'fi-sr-sparkles' },
                      ].map(f => (
                        <div key={f.key} className="space-y-1">
                          <label className="text-xs font-bold text-[#747878] dark:text-[var(--text-muted)] block pl-1">
                            {f.label}
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">฿</span>
                            <input
                              type="number"
                              value={(financeData.expenses as any)[f.key] || ''}
                              onChange={(e) => updateExpenses({ [f.key]: Number(e.target.value) || 0 })}
                              className="w-full bg-[#f4eedb] dark:bg-gray-900 text-[#1e1c10] dark:text-white text-sm font-semibold rounded-2xl py-3 pl-8 pr-4 border-0 outline-none focus:ring-2 focus:ring-[#1e1c10]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* จัดการหนี้สิน Debts */}
                  <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 sm:p-8 border border-[rgba(0,0,0,0.06)] dark:border-gray-700/60 shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base font-bold text-[#1e1c10] dark:text-white">รายการหนี้สิน (Debts)</div>
                        <div className="text-xs text-[#747878] dark:text-[var(--text-muted)]">ผ่อนบ้าน, ผ่อนรถ, สินเชื่อส่วนบุคคล</div>
                      </div>
                      <div className="bg-[#ffd8e7] text-[#361928] px-4 py-1.5 rounded-full text-xs font-bold font-mono">
                        รวมจ่ายหนี้: ฿{totalDebtMonthly.toLocaleString()}/เดือน
                      </div>
                    </div>

                    {/* Existing Debts List */}
                    <div className="space-y-3">
                      {debtItems.length > 0 ? (
                        debtItems.map(debt => (
                          <div key={debt.id} className="p-4 bg-[#f8f5ee] dark:bg-gray-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gray-100 dark:border-gray-700">
                            <div>
                              <div className="text-sm font-bold text-[#1e1c10] dark:text-white">{debt.name}</div>
                              <div className="text-xs text-[#747878] dark:text-[var(--text-muted)]">
                                หนี้รวม: ฿{(debt.totalDebt || 0).toLocaleString()} • ปลอดหนี้ปี {debt.targetYear || '-'}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-red-500 font-mono">
                                ฿{(debt.monthlyPayment || 0).toLocaleString()}/ด.
                              </span>
                              <button
                                onClick={() => updateDebts(debtItems.filter(d => d.id !== debt.id))}
                                className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center border-0 cursor-pointer text-xs"
                                title="ลบรายการ"
                              >
                                <i className="fi fi-rr-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-xs text-[#747878] py-4 bg-[#f8f5ee] dark:bg-gray-900 rounded-2xl">
                          ยังไม่มีรายการหนี้สิน
                        </div>
                      )}
                    </div>

                    {/* Add Debt Form */}
                    <div className="p-4 bg-[#faf3e0] dark:bg-gray-900/80 rounded-2xl space-y-3 border border-[#e0dac7] dark:border-gray-700">
                      <div className="text-xs font-bold text-[#1e1c10] dark:text-white">เพิ่มรายการหนี้ใหม่</div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <input
                          type="text"
                          placeholder="ชื่อหนี้ เช่น ผ่อนรถ"
                          value={newDebtName}
                          onChange={(e) => setNewDebtName(e.target.value)}
                          className="bg-white dark:bg-gray-800 text-[#1e1c10] dark:text-white text-xs font-semibold rounded-xl py-2.5 px-3 border-0 outline-none"
                        />
                        <input
                          type="number"
                          placeholder="ยอดจ่าย/เดือน (฿)"
                          value={newDebtMonthly}
                          onChange={(e) => setNewDebtMonthly(e.target.value)}
                          className="bg-white dark:bg-gray-800 text-[#1e1c10] dark:text-white text-xs font-semibold rounded-xl py-2.5 px-3 border-0 outline-none"
                        />
                        <input
                          type="number"
                          placeholder="หนี้คงเหลือรวม (฿)"
                          value={newDebtTotal}
                          onChange={(e) => setNewDebtTotal(e.target.value)}
                          className="bg-white dark:bg-gray-800 text-[#1e1c10] dark:text-white text-xs font-semibold rounded-xl py-2.5 px-3 border-0 outline-none"
                        />
                        <input
                          type="number"
                          placeholder="ปีที่หมดหนี้ (พ.ศ.)"
                          value={newDebtYear}
                          onChange={(e) => setNewDebtYear(e.target.value)}
                          className="bg-white dark:bg-gray-800 text-[#1e1c10] dark:text-white text-xs font-semibold rounded-xl py-2.5 px-3 border-0 outline-none"
                        />
                      </div>
                      <button
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
                        className="btn-pill-primary text-xs"
                      >
                        + เพิ่มรายการหนี้
                      </button>
                    </div>

                    {/* Total Summary */}
                    <div className="p-4 bg-[#ffd8e7] dark:bg-[#361928] rounded-2xl flex items-center justify-between font-bold text-sm text-[#1e1c10] dark:text-white">
                      <span>รวมรายจ่ายทั้งหมด (รวมหนี้สิน)</span>
                      <span className="text-lg font-black font-mono">฿{totalExpenseDisplay.toLocaleString()}/เดือน</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: เงินทุน & เป้าหมาย */}
              {financeTab === 2 && (
                <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 sm:p-8 border border-[rgba(0,0,0,0.06)] dark:border-gray-700/60 shadow-sm space-y-5">
                  <div className="text-base font-bold text-[#1e1c10] dark:text-white">เงินทุนและเป้าหมายการเงิน</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#747878] dark:text-[var(--text-muted)] block pl-1">
                        เงินทุนปัจจุบัน (สินทรัพย์รวม)
                      </label>
                      <input
                        type="number"
                        value={financeData.assets.currentCapital || ''}
                        onChange={(e) => updateAssets({ currentCapital: Number(e.target.value) || 0 })}
                        className="w-full bg-[#f4eedb] dark:bg-gray-900 text-[#1e1c10] dark:text-white text-sm font-semibold rounded-2xl py-3 px-4 border-0 outline-none focus:ring-2 focus:ring-[#1e1c10]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#747878] dark:text-[var(--text-muted)] block pl-1">
                        เงินสำรองฉุกเฉินเป้าหมาย
                      </label>
                      <input
                        type="number"
                        value={financeData.assets.emergencyFund || ''}
                        onChange={(e) => updateAssets({ emergencyFund: Number(e.target.value) || 0 })}
                        className="w-full bg-[#f4eedb] dark:bg-gray-900 text-[#1e1c10] dark:text-white text-sm font-semibold rounded-2xl py-3 px-4 border-0 outline-none focus:ring-2 focus:ring-[#1e1c10]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#747878] dark:text-[var(--text-muted)] block pl-1">
                        เงินออมในแต่ละเดือน
                      </label>
                      <input
                        type="number"
                        value={financeData.assets.monthlySavings || ''}
                        onChange={(e) => updateAssets({ monthlySavings: Number(e.target.value) || 0 })}
                        className="w-full bg-[#f4eedb] dark:bg-gray-900 text-[#1e1c10] dark:text-white text-sm font-semibold rounded-2xl py-3 px-4 border-0 outline-none focus:ring-2 focus:ring-[#1e1c10]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#747878] dark:text-[var(--text-muted)] block pl-1">
                        เป้าหมายเงินปันผลหลังเกษียณ (ต่อปี)
                      </label>
                      <input
                        type="number"
                        value={financeData.assets.retirementGoal || ''}
                        onChange={(e) => updateAssets({ retirementGoal: Number(e.target.value) || 0 })}
                        className="w-full bg-[#f4eedb] dark:bg-gray-900 text-[#1e1c10] dark:text-white text-sm font-semibold rounded-2xl py-3 px-4 border-0 outline-none focus:ring-2 focus:ring-[#1e1c10]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sticky Save / Discard Bar */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-[rgba(0,0,0,0.06)] dark:border-gray-700 shadow-sm flex items-center justify-between">
                <div className="text-xs font-bold text-[#747878] dark:text-[var(--text-muted)]">
                  {isDirty ? '⚠️ มีการเปลี่ยนแปลงที่ยังไม่บันทึก' : saved ? '✓ บันทึกข้อมูลเรียบร้อยแล้ว' : 'ข้อมูลการเงินล่าสุด'}
                </div>
                <div className="flex gap-2">
                  {isDirty && (
                    <button
                      onClick={discardChanges}
                      className="btn-pill-outline text-xs"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button
                    onClick={() => saveFinanceData()}
                    disabled={saving || !isDirty}
                    className="btn-pill-primary text-xs disabled:opacity-40"
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ SECTION 3: ACCOUNT & SECURITY ══════════ */}
          {section === 'account' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 sm:p-8 border border-[rgba(0,0,0,0.06)] dark:border-gray-700/60 shadow-sm space-y-4">
                <div className="text-base font-bold text-[#1e1c10] dark:text-white">บัญชีผู้ใช้</div>
                <div className="p-4 bg-[#f8f5ee] dark:bg-gray-900 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-[#1e1c10] dark:text-white">{user?.displayName || 'ผู้ใช้งาน'}</div>
                    <div className="text-xs text-[#747878] dark:text-[var(--text-muted)]">{user?.email}</div>
                  </div>
                  <span className="text-[11px] font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    เข้าสู่ระบบอยู่
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 sm:p-8 border border-[rgba(0,0,0,0.06)] dark:border-gray-700/60 shadow-sm space-y-4">
                <div className="text-base font-bold text-[#1e1c10] dark:text-white">ความปลอดภัย</div>
                {isGoogle ? (
                  <div className="text-xs text-[#747878] p-4 bg-[#f8f5ee] dark:bg-gray-900 rounded-2xl">
                    บัญชีนี้ผูกกับ Google — รหัสผ่านจัดการผ่าน Google Account ของคุณ
                  </div>
                ) : pwEmailSent ? (
                  <div className="text-xs font-bold text-green-600 p-4 bg-green-50 rounded-2xl border border-green-200">
                    ✓ ส่ง Email รีเซ็ตรหัสผ่านไปที่ {user?.email} แล้ว
                  </div>
                ) : (
                  <div className="p-4 bg-[#f8f5ee] dark:bg-gray-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-[#1e1c10] dark:text-white">เปลี่ยนรหัสผ่าน</div>
                      <div className="text-[11px] text-[#747878]">ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณ</div>
                    </div>
                    <button
                      onClick={handleSendResetPw}
                      disabled={pwLoading}
                      className="btn-pill-primary text-xs shrink-0"
                    >
                      {pwLoading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 sm:p-8 border border-red-200 dark:border-red-900/50 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-red-600">ออกจากระบบ</div>
                  <div className="text-xs text-[#747878]">ออกจากระบบ FinShield บนอุปกรณ์นี้</div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="px-5 py-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 cursor-pointer transition-all disabled:opacity-50"
                >
                  {loggingOut ? 'กำลังออก...' : 'ออกจากระบบ'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
