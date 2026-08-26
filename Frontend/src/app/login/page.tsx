'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { loginWithEmail, loginWithGoogle } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await loginWithEmail(email, password)
      router.push('/simulator/overview')
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      } else if (err.code === 'auth/invalid-email') {
        setError('รูปแบบอีเมลไม่ถูกต้อง')
      } else if (err.code === 'auth/too-many-requests') {
        setError('มีการพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ในภายหลัง')
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + (err.message || ''))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
      router.push('/simulator/overview')
    } catch (err: any) {
      console.error('Google login error:', err)
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fff9eb] text-[#1e1c10] flex flex-col justify-between selection:bg-[#fed330] selection:text-[#1e1c10]">
      {/* ── Top Header ── */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-[#1e1c10] no-underline">
          <div className="w-8 h-8 rounded-xl bg-[#1e1c10] text-[#fed330] flex items-center justify-center font-black shadow-sm">
            <i className="fi fi-sr-shield-check text-sm"></i>
          </div>
          <span>FinShield</span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-semibold text-[#747878]">
          <Link href="/" className="hover:text-[#1e1c10] no-underline">Help</Link>
          <Link href="/" className="hover:text-[#1e1c10] no-underline">Privacy</Link>
        </div>
      </header>

      {/* ── Center Floating Card (Serene Pulse) ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[460px] bg-white rounded-[36px] p-8 sm:p-10 shadow-[0_20px_50px_rgba(30,28,16,0.06)] border border-[rgba(0,0,0,0.06)] space-y-6 relative overflow-hidden">
          {/* Subtle Top Accent Glow */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-[#fed330]"></div>

          {/* Heading */}
          <div className="text-center space-y-1.5 pt-2">
            <h1 className="text-3xl font-extrabold text-[#1e1c10] tracking-tight m-0">
              Welcome Back
            </h1>
            <p className="text-sm text-[#747878] m-0">
              Log in to securely manage your finances.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-2 border border-red-200">
              <i className="fi fi-sr-info text-sm shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1e1c10] block pl-1">
                Email Address
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

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center pl-1">
                <label className="text-xs font-bold text-[#1e1c10]">
                  Password
                </label>
                <Link href="/reset-password" className="text-xs font-bold text-[#747878] hover:text-[#1e1c10] no-underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <i className="fi fi-rr-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#f4eedb] text-[#1e1c10] text-sm rounded-2xl py-3.5 pl-11 pr-11 border-0 outline-none focus:ring-2 focus:ring-[#1e1c10] transition-all placeholder:text-[#a09e99]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1e1c10] border-0 bg-transparent cursor-pointer p-0"
                >
                  <i className={`fi ${showPassword ? 'fi-rr-eye-crossed' : 'fi-rr-eye'} text-sm`}></i>
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2.5 pt-1 pl-1">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-md accent-[#1e1c10] cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs font-semibold text-[#747878] cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e1c10] hover:bg-black text-white font-bold text-sm py-4 rounded-2xl transition-all shadow-[0_4px_16px_rgba(30,28,16,0.18)] hover:shadow-[0_8px_24px_rgba(30,28,16,0.25)] flex items-center justify-center gap-2 border-0 cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <i className="fi fi-rr-arrow-right text-xs mt-0.5"></i>
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-gray-100 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-semibold text-[#a09e99] uppercase tracking-wider absolute">
              Or continue with
            </span>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-[#faf3e0] text-[#1e1c10] font-bold text-xs py-3.5 px-4 rounded-2xl border border-[#e0dac7] transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Footer link */}
          <div className="text-center pt-2 text-xs text-[#747878]">
            Don't have an account?{' '}
            <Link href="/signup" className="font-bold text-[#1e1c10] hover:underline no-underline">
              Sign up
            </Link>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-6 text-center text-xs text-[#a09e99]">
        © 2026 FinShield. All rights reserved.
      </footer>
    </div>
  )
}
