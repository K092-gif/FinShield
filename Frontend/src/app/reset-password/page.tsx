'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

type Step = 'form' | 'sent'

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<Step>('form')

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/invalid-email': return 'รูปแบบ Email ไม่ถูกต้อง'
      case 'auth/user-not-found': return 'ไม่พบบัญชีที่ใช้ Email นี้'
      default: return 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setStep('sent')
    } catch (err: unknown) {
      const firebaseError = err as { code?: string }
      setError(getErrorMessage(firebaseError.code || ''))
    } finally {
      setLoading(false)
    }
  }

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
          {step === 'form' ? (
            <>
              <div className="auth-card-header">
                <div className="auth-icon-circle">🔑</div>
                <h1 className="auth-title">รีเซ็ตรหัสผ่าน</h1>
                <p className="auth-subtitle">
                  กรอก Email ของคุณ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้
                </p>
              </div>

              <form onSubmit={handleReset} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="reset-email" className="auth-label">Email</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">✉</span>
                    <input
                      id="reset-email"
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

                {error && (
                  <div className="auth-error" role="alert">
                    <span>⚠</span> {error}
                  </div>
                )}

                <button
                  id="reset-submit-btn"
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="auth-spinner" /> กำลังส่ง...</>
                  ) : (
                    'ส่งลิงก์รีเซ็ตรหัสผ่าน'
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="auth-success-state">
              <div className="auth-mail-icon">
                <span>✉</span>
                <div className="auth-mail-badge">✓</div>
              </div>
              <h2 className="auth-title" style={{ marginTop: '16px' }}>ส่ง Email แล้ว!</h2>
              <p className="auth-subtitle" style={{ marginTop: '8px', marginBottom: '8px' }}>
                เราส่งลิงก์รีเซ็ตรหัสผ่านไปที่
              </p>
              <p className="auth-email-badge">{email}</p>
              <p className="auth-subtitle" style={{ marginTop: '12px', fontSize: '13px' }}>
                ตรวจสอบกล่องจดหมาย (และ Spam folder) ของคุณ
              </p>

              <button
                id="resend-btn"
                className="auth-submit-btn"
                style={{ marginTop: '24px' }}
                onClick={() => setStep('form')}
              >
                ส่งอีกครั้ง
              </button>
            </div>
          )}

          <p className="auth-switch" style={{ marginTop: '20px' }}>
            <Link href="/login" id="back-to-login-link">← กลับไปหน้าเข้าสู่ระบบ</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
