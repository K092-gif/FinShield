'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  loadUserFinance,
  saveUserFinance,
  UserFinanceData,
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
  addDebt: (debt: Omit<UserFinanceData['debts'][0], 'id'>) => void
  removeDebt: (id: string) => void
  saveFinanceData: (markOnboardingDone?: boolean) => Promise<void>
  discardChanges: () => void
}

const FinanceContext = createContext<FinanceContextType | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────
export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const [financeData, setFinanceDataState] = useState<UserFinanceData>({ ...DEFAULT_FINANCE })
  const [savedSnapshot, setSavedSnapshot] = useState<UserFinanceData>({ ...DEFAULT_FINANCE })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Load from Firestore when user logs in
  useEffect(() => {
    if (!user) {
      setFinanceDataState({ ...DEFAULT_FINANCE })
      setSavedSnapshot({ ...DEFAULT_FINANCE })
      setLoading(false)
      setIsDirty(false)
      return
    }

    setLoading(true)
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

  const addDebt = useCallback((debt: Omit<UserFinanceData['debts'][0], 'id'>) => {
    setFinanceDataState(prev => ({
      ...prev,
      debts: [...prev.debts, { id: Date.now().toString(), ...debt }],
    }))
    setIsDirty(true)
  }, [])

  const removeDebt = useCallback((id: string) => {
    setFinanceDataState(prev => ({ ...prev, debts: prev.debts.filter(d => d.id !== id) }))
    setIsDirty(true)
  }, [])

  // ── Save ──
  const saveFinanceData = useCallback(async (markOnboardingDone?: boolean) => {
    if (!user) return
    setSaving(true)
    try {
      const dataToSave = markOnboardingDone
        ? { ...financeData, onboardingDone: true }
        : financeData
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
    }
  }, [user, financeData])

  // ── Discard ──
  const discardChanges = useCallback(() => {
    setFinanceDataState(savedSnapshot)
    setIsDirty(false)
  }, [savedSnapshot])

  return (
    <FinanceContext.Provider value={{
      financeData, loading, saving, saved, isDirty,
      setFinanceData, updateExpenses, updateAssets, updateRetirement,
      addDebt, removeDebt, saveFinanceData, discardChanges,
    }}>
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
