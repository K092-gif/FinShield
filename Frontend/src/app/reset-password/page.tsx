'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await resetPassword(email)
      setSent(true)
    } catch (err: any) {
      console.error('Reset password error:', err)
      if (err.code === 'auth/user-not-found') {
        setError('ไม่พบผู้ใช้งานด้วยอีเมลนี้')
      } else if (err.code === 'auth/invalid-email') {
        setError('รูปแบบอีเมลไม่ถูกต้อง')
      } else {
        setError('เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fff9eb] text-[#1e1c10] flex flex-col justify-between selection:bg-[#fed330] selection:text-[#1e1c10] font-sans">
      {/* ── Top Header ── */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-[#1e1c10] no-underline">
          <img src="/finshield_logo.svg" alt="FinShield Logo" className="w-8 h-8 rounded-full object-contain shadow-sm" />
          <span>FinShield</span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-semibold text-[#747878]">
          <Link href="/" className="hover:text-[#1e1c10] no-underline">ช่วยเหลือ</Link>
          <Link href="/" className="hover:text-[#1e1c10] no-underline">ความเป็นส่วนตัว</Link>
        </div>
      </header>

      {/* ── Center Floating Card ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[460px] bg-white rounded-[36px] p-8 sm:p-10 shadow-[0_20px_50px_rgba(30,28,16,0.06)] border border-[#e0dac7] space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-[#fed330]"></div>

          <div className="text-center space-y-1.5 pt-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1e1c10] tracking-tight m-0">
              รีเซ็ตรหัสผ่าน
            </h1>
            <p className="text-xs sm:text-sm text-[#747878] m-0">
              ระบุอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
            </p>
          </div>

          {sent ? (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mx-auto">
                <i className="fi fi-sr-check"></i>
              </div>
              <p className="text-sm text-[#1e1c10] font-medium leading-relaxed">
                ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง <span className="font-bold font-mono">{email}</span> เรียบร้อยแล้ว กรุณาตรวจสอบกล่องจดหมายของคุณ
              </p>
              <Link
                href="/login"
                className="inline-block bg-[#1e1c10] hover:bg-black text-white font-bold text-sm px-6 py-3 rounded-full no-underline shadow-md transition-all"
              >
                กลับสู่หน้าเข้าสู่ระบบ
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-2xl bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-2 border border-red-200">
                  <i className="fi fi-sr-info text-sm shrink-0"></i>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1e1c10] block pl-1">
                  อีเมล
                </label>
                <div className="relative">
                  <i className="fi fi-rr-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-[#f4eedb] text-[#1e1c10] text-sm rounded-2xl py-3.5 pl-11 pr-4 border-0 outline-none focus:ring-2 focus:ring-[#1e1c10] transition-all placeholder:text-[#a09e99]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1e1c10] hover:bg-black text-white font-bold text-sm py-4 rounded-2xl transition-all shadow-[0_4px_16px_rgba(30,28,16,0.18)] hover:shadow-[0_8px_24px_rgba(30,28,16,0.25)] flex items-center justify-center border-0 cursor-pointer disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'กำลังส่งลิงก์...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}</span>
              </button>

              <div className="text-center pt-2">
                <Link href="/login" className="text-xs font-bold text-[#747878] hover:text-[#1e1c10] no-underline">
                  กลับสู่หน้าเข้าสู่ระบบ
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-[#a09e99]">
        © 2026 FinShield. สงวนลิขสิทธิ์ทั้งหมด
      </footer>
    </div>
  )
}
