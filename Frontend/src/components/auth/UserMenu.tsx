'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function UserMenu() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (!user) return null

  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() || '?'

  return (
    <div className="user-menu-wrap" ref={menuRef}>
      <button
        id="user-menu-btn"
        className="user-avatar-btn"
        onClick={() => setOpen(v => !v)}
        title={user.displayName || user.email || ''}
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="avatar" className="user-avatar-img" referrerPolicy="no-referrer" />
        ) : (
          <span className="user-avatar-initials">{initials}</span>
        )}
        <span className="user-avatar-name">{user.displayName?.split(' ')[0] || 'User'}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <p className="user-dropdown-name">{user.displayName || 'ผู้ใช้งาน'}</p>
            <p className="user-dropdown-email">{user.email}</p>
          </div>
          <div className="user-dropdown-divider" />
          <button
            id="logout-btn"
            className="user-dropdown-item user-dropdown-item-danger"
            onClick={handleLogout}
          >
            <span>→</span> ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  )
}
