'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { loginWithEmail, loginWithGoogle } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/invalid-email': return 'รูปแบบ Email ไม่ถูกต้อง'
      case 'auth/user-not-found': return 'ไม่พบบัญชีผู้ใช้นี้'
      case 'auth/wrong-password': return 'รหัสผ่านไม่ถูกต้อง'
      case 'auth/invalid-credential': return 'Email หรือรหัสผ่านไม่ถูกต้อง'
      case 'auth/too-many-requests': return 'พยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง'
      case 'auth/popup-closed-by-user': return 'ปิด popup ก่อนเสร็จสิ้น กรุณาลองใหม่'
      default: return 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginWithEmail(email, password)
      router.push('/')
    } catch (err: unknown) {
      const firebaseError = err as { code?: string }
      setError(getErrorMessage(firebaseError.code || ''))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
      router.push('/')
    } catch (err: unknown) {
      const firebaseError = err as { code?: string }
      setError(getErrorMessage(firebaseError.code || ''))
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Background Orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo-icon">FS</span>
          <span className="auth-logo-text">Fin<span>Shield</span></span>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-title">เข้าสู่ระบบ</h1>
            <p className="auth-subtitle">ยินดีต้อนรับกลับสู่ FinShield</p>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="auth-form">
            <div className="auth-field">
              <label htmlFor="login-email" className="auth-label">Email</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">✉</span>
                <input
                  id="login-email"
                  type="email"
                  className="auth-input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-password" className="auth-label">รหัสผ่าน</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔒</span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className="auth-forgot">
              <Link href="/reset-password" id="forgot-password-link">ลืมรหัสผ่าน?</Link>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <span>⚠</span> {error}
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              className="auth-submit-btn"
              disabled={loading || googleLoading}
            >
              {loading ? <><span className="auth-spinner" /> กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="auth-divider">
            <span>หรือ</span>
          </div>

          {/* Google Sign-In */}
          <button
            id="google-signin-btn"
            className="auth-google-btn"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <span className="auth-spinner google-spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.8 20-21 0-1.4-.1-2.7-.5-4z" fill="#FFC107"/>
                <path d="M6.3 14.7l7 5.1C15.1 16.4 19.2 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.9 6.3 14.7z" fill="#FF3D00"/>
                <path d="M24 45c5.6 0 10.5-1.9 14.4-5l-6.7-5.7C29.7 36 27 37 24 37c-5.9 0-10.7-3.9-11.9-9.2L5.2 33c3.2 7 10.4 12 18.8 12z" fill="#4CAF50"/>
                <path d="M44.5 20H24v8.5h11.8c-.7 2.4-2.1 4.4-4 5.8l6.7 5.7C41.9 36.4 45 31 45 24c0-1.4-.2-2.7-.5-4z" fill="#1976D2"/>
              </svg>
            )}
            <span>{googleLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}</span>
          </button>

          <p className="auth-switch">
            ยังไม่มีบัญชี?{' '}
            <Link href="/signup" id="go-signup-link">สมัครสมาชิก</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
