'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'


export default function SignupPage() {
  const { signup } = useAuth()
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/email-already-in-use': return 'Email นี้ถูกใช้งานแล้ว'
      case 'auth/invalid-email': return 'รูปแบบ Email ไม่ถูกต้อง'
      case 'auth/weak-password': return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
      default: return 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!displayName.trim()) { setError('กรุณากรอกชื่อของคุณ'); return }
    if (password !== confirmPassword) { setError('รหัสผ่านไม่ตรงกัน'); return }
    if (password.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }

    setLoading(true)
    try {
      await signup(email, password, displayName)
      setSuccess(true)
      setTimeout(() => router.push('/simulator'), 1500)
    } catch (err: unknown) {
      const firebaseError = err as { code?: string }
      setError(getErrorMessage(firebaseError.code || ''))
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = () => {
    if (!password) return { level: 0, label: '', color: '' }
    if (password.length < 6) return { level: 1, label: 'อ่อน', color: 'var(--red)' }
    if (password.length < 10) return { level: 2, label: 'ปานกลาง', color: 'var(--gold)' }
    return { level: 3, label: 'แข็งแกร่ง', color: 'var(--green)' }
  }
  const strength = getPasswordStrength()

  return (
    <div className="auth-page">
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
            <h1 className="auth-title">สมัครสมาชิก</h1>
            <p className="auth-subtitle">สร้างบัญชี FinShield ของคุณ</p>
          </div>

          {success ? (
            <div className="auth-success-state">
              <div className="auth-success-icon"><i className="fi fi-sr-check"></i></div>
              <h2>สมัครสมาชิกสำเร็จ!</h2>
              <p>กำลังพาคุณไปยังหน้าหลัก...</p>
            </div>
          ) : (
            <>
              <form onSubmit={handleSignup} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="signup-name" className="auth-label">ชื่อ - นามสกุล</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><i className="fi fi-sr-user"></i></span>
                    <input
                      id="signup-name"
                      type="text"
                      className="auth-input"
                      placeholder="ชื่อของคุณ"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-email" className="auth-label">Email</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><i className="fi fi-sr-envelope"></i></span>
                    <input
                      id="signup-email"
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
                  <label htmlFor="signup-password" className="auth-label">รหัสผ่าน</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><i className="fi fi-sr-lock"></i></span>
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowPassword(v => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? <i className="fi fi-sr-eye-crossed"></i> : <i className="fi fi-sr-eye"></i>}
                    </button>
                  </div>
                  {/* Password Strength */}
                  {password && (
                    <div className="auth-strength">
                      <div className="auth-strength-bars">
                        {[1, 2, 3].map(i => (
                          <div
                            key={i}
                            className="auth-strength-bar"
                            style={{ background: strength.level >= i ? strength.color : 'var(--border)' }}
                          />
                        ))}
                      </div>
                      <span className="auth-strength-label" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-confirm" className="auth-label">ยืนยันรหัสผ่าน</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><i className="fi fi-sr-lock"></i></span>
                    <input
                      id="signup-confirm"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    {confirmPassword && (
                      <span className="auth-match-icon">
                        {password === confirmPassword ? <i className="fi fi-sr-check"></i> : <i className="fi fi-sr-cross"></i>}
                      </span>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="auth-error" role="alert">
                    <span><i className="fi fi-sr-exclamation"></i></span> {error}
                  </div>
                )}

                <button
                  id="signup-submit-btn"
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? <><span className="auth-spinner" /> กำลังสมัครสมาชิก...</> : 'สมัครสมาชิก'}
                </button>
              </form>

              <p className="auth-switch">
                มีบัญชีแล้ว?{' '}
                <Link href="/login" id="go-login-link">เข้าสู่ระบบ</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
