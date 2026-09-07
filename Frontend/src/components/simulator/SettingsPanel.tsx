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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-[#fff9eb] dark:bg-[#161512] rounded-[32px] sm:rounded-[36px] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.18)] border border-[#e0dac7] dark:border-gray-800 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 sm:px-8 pb-3.5 flex items-center justify-between border-b border-[#f0e9d6] dark:border-gray-800 bg-white/60 dark:bg-[#201f1a]/60">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1e1c10] dark:text-white tracking-tight m-0">
              Settings &amp; Preferences
            </h1>
            <p className="text-[11px] sm:text-xs text-[#747878] dark:text-gray-400 mt-0.5 m-0">
              จัดการข้อมูลโปรไฟล์ การเงิน หนี้สิน และความปลอดภัย
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-gray-800 text-[#1e1c10] dark:text-gray-200 flex items-center justify-center border border-[#e0dac7] dark:border-gray-700 hover:bg-[#faf3e0] dark:hover:bg-gray-700 transition-all cursor-pointer shadow-xs text-xs sm:text-sm shrink-0"
            aria-label="Close settings"
          >
            <i className="fi fi-rr-cross text-xs"></i>
          </button>
        </div>

        {/* Section Navigation Tabs (Unified Serene Pulse Pills) */}
        <div className="px-4 sm:px-8 py-2.5 bg-[#faf3e0]/80 dark:bg-gray-900/80 border-b border-[#f0e9d6] dark:border-gray-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {navItems.map(item => {
            const active = section === item.id
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`px-3.5 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border-0 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#fed330] text-[#1e1c10] shadow-xs'
                    : 'text-[#747878] hover:text-[#1e1c10] dark:hover:text-white bg-transparent'
                }`}
              >
                <i className={`fi ${item.icon} text-xs sm:text-sm`}></i>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 sm:px-8 overflow-y-auto flex-1 space-y-6">

          {/* ══════════ SECTION 1: PROFILE & APPEARANCE ══════════ */}
          {section === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
              {/* Profile Card */}
              <div className="md:col-span-7 bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-7 border border-[#e0dac7] dark:border-gray-700/60 shadow-xs space-y-4 sm:space-y-5">
                <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-[#1e1c10] dark:text-white pb-2 border-b border-[#f0e9d6] dark:border-gray-700/60">
                  <i className="fi fi-rr-user text-xs sm:text-sm text-amber-600"></i>
                  <span>ข้อมูลโปรไฟล์</span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-[#e0dac7] dark:border-gray-700 shadow-xs bg-[#fed330] flex items-center justify-center font-black text-lg sm:text-xl text-[#1e1c10] shrink-0">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
                    ) : initials}
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-[#1e1c10] dark:text-white">{user?.displayName || 'ผู้ใช้งาน'}</div>
                    <div className="text-xs text-[#747878] dark:text-gray-400 break-all">{user?.email}</div>
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#747878] dark:text-gray-400 block">
                    ชื่อที่แสดง (Display Name)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-[#faf3e0]/40 dark:bg-gray-900 border border-[#e0dac7] dark:border-gray-700 text-[#1e1c10] dark:text-white text-xs sm:text-sm font-semibold rounded-xl py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[#fed330]"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={nameLoading || editName === user?.displayName}
                      className="py-2.5 px-4 bg-[#1e1c10] hover:bg-black text-white rounded-xl text-xs font-bold shrink-0 disabled:opacity-40 cursor-pointer border-0 transition-all"
                    >
                      {nameLoading ? '...' : 'บันทึก'}
                    </button>
                  </div>
                  {nameMsg && (
                    <div className={`text-xs font-bold ${nameMsg.type === 'ok' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {nameMsg.text}
                    </div>
                  )}
                </div>

                {/* Email Address */}
                {!isGoogle && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#747878] dark:text-gray-400 block">
                      Email Address
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="flex-1 bg-[#faf3e0]/40 dark:bg-gray-900 border border-[#e0dac7] dark:border-gray-700 text-[#1e1c10] dark:text-white text-xs sm:text-sm font-semibold rounded-xl py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[#fed330]"
                      />
                      <button
                        onClick={handleSaveEmail}
                        disabled={emailLoading || editEmail === user?.email}
                        className="py-2.5 px-4 bg-[#1e1c10] hover:bg-black text-white rounded-xl text-xs font-bold shrink-0 disabled:opacity-40 cursor-pointer border-0 transition-all"
                      >
                        {emailLoading ? '...' : 'บันทึก'}
                      </button>
                    </div>
                    {emailMsg && (
                      <div className={`text-xs font-bold ${emailMsg.type === 'ok' ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {emailMsg.text}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Appearance Yellow Bento Card */}
              <div className="md:col-span-5 bg-[#fed330] rounded-3xl p-5 sm:p-7 border border-amber-300/80 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#1e1c10]">
                  <i className="fi fi-rr-palette text-sm"></i>
                  <span>ธีมการแสดงผล (Appearance)</span>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => onThemeChange('light')}
                    className={`w-full p-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-between transition-all border cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white text-[#1e1c10] border-[#1e1c10]/15 shadow-xs'
                        : 'bg-white/40 text-[#1e1c10]/80 border-transparent hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <i className="fi fi-rr-sun text-sm"></i>
                      <span>Light Mode</span>
                    </div>
                    {theme === 'light' && (
                      <div className="w-5 h-5 rounded-full bg-[#1e1c10] text-white flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => onThemeChange('dark')}
                    className={`w-full p-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-between transition-all border cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#1e1c10] text-white border-transparent shadow-xs'
                        : 'bg-white/40 text-[#1e1c10]/80 border-transparent hover:bg-white/60'
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

                <div className="text-[11px] text-[#1e1c10]/80 font-medium">
                  สลับโหมดสว่าง/มืดตามความสะดวกในการใช้งาน
                </div>
              </div>
            </div>
          )}

          {/* ══════════ SECTION 2: FINANCE & DEBTS ══════════ */}
          {section === 'finance' && (
            <div className="space-y-5 sm:space-y-6">
              {/* Finance Subtabs */}
              <div className="flex gap-1.5 bg-[#faf3e0] dark:bg-gray-900 p-1.5 rounded-full w-full sm:w-fit border border-[#e0dac7] dark:border-gray-800 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setFinanceTab(1)}
                  className={`flex-1 sm:flex-initial px-4 sm:px-5 py-1.5 rounded-full text-xs font-bold transition-all border-0 cursor-pointer whitespace-nowrap ${
                    financeTab === 1 ? 'bg-[#fed330] text-[#1e1c10] shadow-xs' : 'text-[#747878] dark:text-gray-400 bg-transparent'
                  }`}
                >
                  1. รายจ่ายประจำ &amp; หนี้สิน
                </button>
                <button
                  onClick={() => setFinanceTab(2)}
                  className={`flex-1 sm:flex-initial px-4 sm:px-5 py-1.5 rounded-full text-xs font-bold transition-all border-0 cursor-pointer whitespace-nowrap ${
                    financeTab === 2 ? 'bg-[#fed330] text-[#1e1c10] shadow-xs' : 'text-[#747878] dark:text-gray-400 bg-transparent'
                  }`}
                >
                  2. เงินทุน &amp; เป้าหมายการออม
                </button>
              </div>

              {/* Tab 1: รายจ่าย 5 หมวด + หนี้สิน */}
              {financeTab === 1 && (
                <div className="space-y-5">
                  {/* รายจ่าย 5 หมวด */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-7 border border-[#e0dac7] dark:border-gray-700/60 shadow-xs space-y-4">
                    <div className="text-sm sm:text-base font-bold text-[#1e1c10] dark:text-white pb-2 border-b border-[#f0e9d6] dark:border-gray-700/60">
                      รายจ่ายประจำ (ต่อเดือน)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {[
                        { key: 'food', label: 'อาหารและเครื่องดื่ม', icon: 'fi-sr-utensils' },
                        { key: 'rent', label: 'ที่อยู่อาศัย / ค่าเช่า', icon: 'fi-sr-home' },
                        { key: 'transport', label: 'การเดินทาง / ค่าน้ำมัน', icon: 'fi-sr-car' },
                        { key: 'necessities', label: 'ของใช้จำเป็น', icon: 'fi-sr-shopping-bag' },
                        { key: 'other', label: 'อื่นๆ / ท่องเที่ยว', icon: 'fi-sr-sparkles' },
                      ].map(f => (
                        <div key={f.key} className="space-y-1">
                          <label className="text-xs font-bold text-[#747878] dark:text-gray-400 block pl-1">
                            {f.label}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#747878] font-mono">฿</span>
                            <input
                              type="number"
                              value={(financeData.expenses as any)[f.key] || ''}
                              onChange={(e) => updateExpenses({ [f.key]: Number(e.target.value) || 0 })}
                              className="w-full bg-[#faf3e0]/40 dark:bg-gray-900 border border-[#e0dac7] dark:border-gray-700 text-[#1e1c10] dark:text-white text-xs sm:text-sm font-bold font-mono rounded-xl py-2 pl-8 pr-3 outline-none focus:ring-2 focus:ring-[#fed330]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* จัดการหนี้สิน Debts */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-7 border border-[#e0dac7] dark:border-gray-700/60 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#f0e9d6] dark:border-gray-700/60">
                      <div>
                        <div className="text-sm sm:text-base font-bold text-[#1e1c10] dark:text-white">รายการหนี้สิน (Debts)</div>
                        <div className="text-[11px] text-[#747878] dark:text-gray-400">ผ่อนบ้าน, ผ่อนรถ, สินเชื่อส่วนบุคคล</div>
                      </div>
                      <div className="bg-[#ffd8e7] text-[#361928] px-3.5 py-1 rounded-full text-xs font-bold font-mono w-fit self-start sm:self-auto border border-[#ffd8e7]">
                        รวมจ่ายหนี้: ฿{totalDebtMonthly.toLocaleString()} / เดือน
                      </div>
                    </div>

                    {/* Existing Debts List */}
                    <div className="space-y-2.5">
                      {debtItems.length > 0 ? (
                        debtItems.map(debt => (
                          <div key={debt.id} className="p-3.5 bg-[#faf3e0]/40 dark:bg-gray-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border border-[#e0dac7] dark:border-gray-700">
                            <div>
                              <div className="text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-white">{debt.name}</div>
                              <div className="text-[11px] text-[#747878] dark:text-gray-400">
                                หนี้รวม: ฿{(debt.totalDebt || 0).toLocaleString()} • ปลอดหนี้ปี {debt.targetYear || '-'}
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#f0e9d6] dark:border-gray-800">
                              <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                                ฿{(debt.monthlyPayment || 0).toLocaleString()} / เดือน
                              </span>
                              <button
                                onClick={() => updateDebts(debtItems.filter(d => d.id !== debt.id))}
                                className="w-7 h-7 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 flex items-center justify-center border-0 cursor-pointer text-xs transition-all"
                                title="ลบรายการ"
                              >
                                <i className="fi fi-rr-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-xs text-[#747878] py-4 bg-[#faf3e0]/30 dark:bg-gray-900/60 rounded-2xl border border-dashed border-[#e0dac7] dark:border-gray-700">
                          ยังไม่มีรายการหนี้สิน
                        </div>
                      )}
                    </div>

                    {/* Add Debt Form */}
                    <div className="p-4 bg-[#faf3e0]/60 dark:bg-gray-900/80 rounded-2xl space-y-3 border border-[#e0dac7] dark:border-gray-700">
                      <div className="text-xs font-bold text-[#1e1c10] dark:text-white">เพิ่มรายการหนี้ใหม่</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        <input
                          type="text"
                          placeholder="ชื่อหนี้ เช่น ผ่อนรถ"
                          value={newDebtName}
                          onChange={(e) => setNewDebtName(e.target.value)}
                          className="bg-white dark:bg-gray-800 border border-[#e0dac7] dark:border-gray-700 text-[#1e1c10] dark:text-white text-xs font-semibold rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-[#fed330]"
                        />
                        <input
                          type="number"
                          placeholder="ยอดจ่าย/เดือน (฿)"
                          value={newDebtMonthly}
                          onChange={(e) => setNewDebtMonthly(e.target.value)}
                          className="bg-white dark:bg-gray-800 border border-[#e0dac7] dark:border-gray-700 text-[#1e1c10] dark:text-white text-xs font-semibold font-mono rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-[#fed330]"
                        />
                        <input
                          type="number"
                          placeholder="หนี้คงเหลือรวม (฿)"
                          value={newDebtTotal}
                          onChange={(e) => setNewDebtTotal(e.target.value)}
                          className="bg-white dark:bg-gray-800 border border-[#e0dac7] dark:border-gray-700 text-[#1e1c10] dark:text-white text-xs font-semibold font-mono rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-[#fed330]"
                        />
                        <input
                          type="number"
                          placeholder="ปีที่หมดหนี้ (พ.ศ.)"
                          value={newDebtYear}
                          onChange={(e) => setNewDebtYear(e.target.value)}
                          className="bg-white dark:bg-gray-800 border border-[#e0dac7] dark:border-gray-700 text-[#1e1c10] dark:text-white text-xs font-semibold font-mono rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-[#fed330]"
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
                        className="py-2.5 px-4 bg-[#1e1c10] hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer border-0 flex items-center gap-1.5"
                      >
                        <i className="fi fi-rr-plus text-xs"></i>
                        <span>เพิ่มรายการหนี้</span>
                      </button>
                    </div>

                    {/* Total Summary (Clean Responsive Pink Box) */}
                    <div className="p-4 bg-[#ffd8e7] dark:bg-[#361928] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-[#ffd8e7]/80 dark:border-[#5c2744]">
                      <div className="text-xs sm:text-sm font-bold text-[#361928] dark:text-pink-200">
                        รวมรายจ่ายทั้งหมด (รวมหนี้สิน)
                      </div>
                      <div className="text-base sm:text-lg font-black font-mono text-[#361928] dark:text-white flex items-baseline gap-1 self-start sm:self-auto">
                        ฿{totalExpenseDisplay.toLocaleString()}
                        <span className="text-xs font-normal text-[#361928]/80 dark:text-pink-300">/ เดือน</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: เงินทุน & เป้าหมาย */}
              {financeTab === 2 && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-7 border border-[#e0dac7] dark:border-gray-700/60 shadow-xs space-y-4">
                  <div className="text-sm sm:text-base font-bold text-[#1e1c10] dark:text-white pb-2 border-b border-[#f0e9d6] dark:border-gray-700/60">
                    เงินทุนและเป้าหมายการเงิน
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#747878] dark:text-gray-400 block pl-1">
                        เงินทุนปัจจุบัน (สินทรัพย์รวม)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#747878] font-mono">฿</span>
                        <input
                          type="number"
                          value={financeData.assets.currentCapital || ''}
                          onChange={(e) => updateAssets({ currentCapital: Number(e.target.value) || 0 })}
                          className="w-full bg-[#faf3e0]/40 dark:bg-gray-900 border border-[#e0dac7] dark:border-gray-700 text-[#1e1c10] dark:text-white text-xs sm:text-sm font-bold font-mono rounded-xl py-2 pl-8 pr-3 outline-none focus:ring-2 focus:ring-[#fed330]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#747878] dark:text-gray-400 block pl-1">
                        เงินสำรองฉุกเฉินเป้าหมาย
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#747878] font-mono">฿</span>
                        <input
                          type="number"
                          value={financeData.assets.emergencyFund || ''}
                          onChange={(e) => updateAssets({ emergencyFund: Number(e.target.value) || 0 })}
                          className="w-full bg-[#faf3e0]/40 dark:bg-gray-900 border border-[#e0dac7] dark:border-gray-700 text-[#1e1c10] dark:text-white text-xs sm:text-sm font-bold font-mono rounded-xl py-2 pl-8 pr-3 outline-none focus:ring-2 focus:ring-[#fed330]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#747878] dark:text-gray-400 block pl-1">
                        เงินออมในแต่ละเดือน
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#747878] font-mono">฿</span>
                        <input
                          type="number"
                          value={financeData.assets.monthlySavings || ''}
                          onChange={(e) => updateAssets({ monthlySavings: Number(e.target.value) || 0 })}
                          className="w-full bg-[#faf3e0]/40 dark:bg-gray-900 border border-[#e0dac7] dark:border-gray-700 text-[#1e1c10] dark:text-white text-xs sm:text-sm font-bold font-mono rounded-xl py-2 pl-8 pr-3 outline-none focus:ring-2 focus:ring-[#fed330]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#747878] dark:text-gray-400 block pl-1">
                        เป้าหมายเงินปันผลหลังเกษียณ (ต่อปี)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#747878] font-mono">฿</span>
                        <input
                          type="number"
                          value={financeData.assets.retirementGoal || ''}
                          onChange={(e) => updateAssets({ retirementGoal: Number(e.target.value) || 0 })}
                          className="w-full bg-[#faf3e0]/40 dark:bg-gray-900 border border-[#e0dac7] dark:border-gray-700 text-[#1e1c10] dark:text-white text-xs sm:text-sm font-bold font-mono rounded-xl py-2 pl-8 pr-3 outline-none focus:ring-2 focus:ring-[#fed330]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Responsive Save / Discard Action Bar */}
              <div className="p-3.5 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl border border-[#e0dac7] dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs font-bold text-[#747878] dark:text-gray-400 text-center sm:text-left">
                  {isDirty ? '⚠️ มีการเปลี่ยนแปลงที่ยังไม่บันทึก' : saved ? '✓ บันทึกข้อมูลเรียบร้อยแล้ว' : 'ข้อมูลการเงินล่าสุด'}
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                  {isDirty && (
                    <button
                      onClick={discardChanges}
                      className="flex-1 sm:flex-initial py-2.5 px-4 rounded-full border border-[#e0dac7] dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-[#1e1c10] dark:text-white hover:bg-[#faf3e0] cursor-pointer transition-all"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button
                    onClick={() => saveFinanceData()}
                    disabled={saving || !isDirty}
                    className="flex-1 sm:flex-initial py-2.5 px-5 bg-[#1e1c10] hover:bg-black text-white text-xs font-bold rounded-full transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-0"
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ SECTION 3: ACCOUNT & SECURITY ══════════ */}
          {section === 'account' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-7 border border-[#e0dac7] dark:border-gray-700/60 shadow-xs space-y-3">
                <div className="text-sm sm:text-base font-bold text-[#1e1c10] dark:text-white pb-2 border-b border-[#f0e9d6] dark:border-gray-700/60">
                  บัญชีผู้ใช้
                </div>
                <div className="p-3.5 sm:p-4 bg-[#faf3e0]/40 dark:bg-gray-900 rounded-2xl flex items-center justify-between gap-3 border border-[#e0dac7] dark:border-gray-700">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-white">{user?.displayName || 'ผู้ใช้งาน'}</div>
                    <div className="text-[11px] text-[#747878] dark:text-gray-400 break-all">{user?.email}</div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-3 py-1 rounded-full shrink-0">
                    เข้าสู่ระบบอยู่
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-7 border border-[#e0dac7] dark:border-gray-700/60 shadow-xs space-y-3">
                <div className="text-sm sm:text-base font-bold text-[#1e1c10] dark:text-white pb-2 border-b border-[#f0e9d6] dark:border-gray-700/60">
                  ความปลอดภัย
                </div>
                {isGoogle ? (
                  <div className="text-xs text-[#747878] dark:text-gray-400 p-3.5 bg-[#faf3e0]/40 dark:bg-gray-900 rounded-2xl border border-[#e0dac7] dark:border-gray-700">
                    บัญชีนี้ผูกกับ Google — รหัสผ่านจัดการผ่าน Google Account ของคุณ
                  </div>
                ) : pwEmailSent ? (
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    ✓ ส่ง Email รีเซ็ตรหัสผ่านไปที่ {user?.email} แล้ว
                  </div>
                ) : (
                  <div className="p-3.5 sm:p-4 bg-[#faf3e0]/40 dark:bg-gray-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#e0dac7] dark:border-gray-700">
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-white">เปลี่ยนรหัสผ่าน</div>
                      <div className="text-[11px] text-[#747878] dark:text-gray-400">ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณ</div>
                    </div>
                    <button
                      onClick={handleSendResetPw}
                      disabled={pwLoading}
                      className="py-2.5 px-4 bg-[#1e1c10] hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer border-0 shrink-0 self-start sm:self-auto"
                    >
                      {pwLoading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-7 border border-rose-200 dark:border-rose-900/50 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400">ออกจากระบบ</div>
                  <div className="text-[11px] text-[#747878] dark:text-gray-400">ออกจากระบบ FinShield บนอุปกรณ์นี้</div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="px-5 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-800 cursor-pointer transition-all disabled:opacity-50 self-start sm:self-auto shrink-0"
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
