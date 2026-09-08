'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  loadUserFinance,
  saveUserFinance,
  getCachedUserFinance,
  UserFinanceData,
  DebtItem,
  DEFAULT_FINANCE,
} from '@/lib/financeService'

// ─── Context types ────────────────────────────────────────────────────
interface FinanceContextType {
  financeData: UserFinanceData
  loading: boolean
  saving: boolean
  saved: boolean
  isDirty: boolean
  setFinanceData: (data: UserFinanceData) => void
  updateExpenses: (partial: Partial<UserFinanceData['expenses']>) => void
  updateAssets: (partial: Partial<UserFinanceData['assets']>) => void
  updateRetirement: (partial: Partial<UserFinanceData['retirement']>) => void
  updateDebts: (debts: DebtItem[]) => void
  saveFinanceData: (markOnboardingDone?: boolean, overrideData?: UserFinanceData) => Promise<void>
  discardChanges: () => void
}

const FinanceContext = createContext<FinanceContextType | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────
export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const [financeData, setFinanceDataState] = useState<UserFinanceData>(() => {
    return { ...DEFAULT_FINANCE }
  })
  const [savedSnapshot, setSavedSnapshot] = useState<UserFinanceData>({ ...DEFAULT_FINANCE })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Load finance data: SWR (Stale-While-Revalidate) pattern for instant page load
  useEffect(() => {
    if (!user) {
      setFinanceDataState({ ...DEFAULT_FINANCE })
      setSavedSnapshot({ ...DEFAULT_FINANCE })
      setLoading(false)
      setIsDirty(false)
      return
    }

    // 1. If cache exists in localStorage, display it immediately (0ms wait)
    const cached = getCachedUserFinance(user.uid)
    if (cached) {
      setFinanceDataState(cached)
      setSavedSnapshot(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    // 2. Fetch fresh data in the background and update state
    loadUserFinance(user.uid).then(data => {
      setFinanceDataState(data)
      setSavedSnapshot(data)
      setLoading(false)
    })
  }, [user])

  // ── Setters ──
  const setFinanceData = useCallback((data: UserFinanceData) => {
    setFinanceDataState(data)
    setIsDirty(true)
  }, [])

  const updateExpenses = useCallback((partial: Partial<UserFinanceData['expenses']>) => {
    setFinanceDataState(prev => ({ ...prev, expenses: { ...prev.expenses, ...partial } }))
    setIsDirty(true)
  }, [])

  const updateAssets = useCallback((partial: Partial<UserFinanceData['assets']>) => {
    setFinanceDataState(prev => ({ ...prev, assets: { ...prev.assets, ...partial } }))
    setIsDirty(true)
  }, [])

  const updateRetirement = useCallback((partial: Partial<UserFinanceData['retirement']>) => {
    setFinanceDataState(prev => ({ ...prev, retirement: { ...prev.retirement, ...partial } }))
    setIsDirty(true)
  }, [])

  const updateDebts = useCallback((debts: DebtItem[]) => {
    setFinanceDataState(prev => {
      const totalMonthly = debts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0)
      return {
        ...prev,
        debts,
        expenses: { ...prev.expenses, debt: totalMonthly },
      }
    })
    setIsDirty(true)
  }, [])

  // ── Save ──
  const isSavingRef = React.useRef(false) // ref to avoid re-render on toggle
  const saveFinanceData = useCallback(async (markOnboardingDone?: boolean, overrideData?: UserFinanceData) => {
    if (!user) return
    if (isSavingRef.current) return // prevent concurrent saves
    isSavingRef.current = true
    setSaving(true)
    try {
      const baseData = overrideData || financeData
      const dataToSave = markOnboardingDone
        ? { ...baseData, onboardingDone: true }
        : baseData
      await saveUserFinance(user.uid, dataToSave)
      if (markOnboardingDone) {
        setFinanceDataState(prev => ({ ...prev, onboardingDone: true }))
      }
      setSavedSnapshot(dataToSave)
      setIsDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error('[FinanceContext] save failed', err)
    } finally {
      setSaving(false)
      isSavingRef.current = false
    }
  }, [user, financeData])

  // ── Discard ──
  const discardChanges = useCallback(() => {
    setFinanceDataState(savedSnapshot)
    setIsDirty(false)
  }, [savedSnapshot])

  const contextValue = React.useMemo(() => ({
    financeData, loading, saving, saved, isDirty,
    setFinanceData, updateExpenses, updateAssets, updateRetirement, updateDebts,
    saveFinanceData, discardChanges,
  }), [financeData, loading, saving, saved, isDirty,
    setFinanceData, updateExpenses, updateAssets, updateRetirement, updateDebts,
    saveFinanceData, discardChanges])

  return (
    <FinanceContext.Provider value={contextValue}>
      {children}
    </FinanceContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────
export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider')
  return ctx
}
