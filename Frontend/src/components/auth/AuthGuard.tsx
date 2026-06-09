'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-logo">
          <span className="auth-logo-icon">FS</span>
        </div>
        <div className="auth-loading-spinner" />
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
