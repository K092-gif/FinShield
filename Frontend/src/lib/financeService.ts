/**
 * Finance data service — PostgreSQL via Express/Prisma backend
 */
import { auth } from './firebase'

// ─── Types ────────────────────────────────────────────────────────────
export interface FinanceExpenses {
  food: number
  rent: number
  transport: number
  necessities: number
  other: number
  debt: number // legacy total debt (computed from debts array)
}

export interface DebtItem {
  id: string
  name: string         // e.g. "ผ่อนบ้าน", "ผ่อนรถ"
  monthlyPayment: number  // amount paid per month
  totalDebt: number    // original total debt
  targetYear: number   // year to be debt-free
  amount?: number      // remaining balance
  originalAmount?: number // initial original amount
  paymentDay?: number  // 1-31: day of each month to deduct
  nextPaymentDate?: string // YYYY-MM-DD
}

export interface FinanceAssets {
  currentCapital: number
  emergencyFund: number
  monthlySavings: number
  retirementGoal: number
  monthlyIncome?: number
}

export interface FinanceRetirement {
  currentAge: number
  retirementAge: number
  initialCapital: number
  monthlySavings: number
  dividendGoal: number
}

export interface UserFinanceData {
  expenses: FinanceExpenses
  debts: DebtItem[]       // structured debt list
  assets: FinanceAssets
  retirement: FinanceRetirement
  onboardingDone?: boolean
  updatedAt?: number
}

// ─── Defaults ────────────────────────────────────────────────────────
export const DEFAULT_FINANCE: UserFinanceData = {
  expenses: {
    food: 0,
    rent: 0,
    transport: 0,
    necessities: 0,
    other: 0,
    debt: 0,
  },
  debts: [],
  assets: {
    currentCapital: 0,
    emergencyFund: 0,
    monthlySavings: 0,
    retirementGoal: 0,
  },
  retirement: {
    currentAge: 25,
    retirementAge: 60,
    initialCapital: 0,
    monthlySavings: 0,
    dividendGoal: 0,
  },
  onboardingDone: false,
}

// ─── Base URL ─────────────────────────────────────────────────────────
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// ─── LocalStorage Cache Helpers ────────────────────────────────────────
const FINANCE_CACHE_PREFIX = 'finshield-cached-finance-'

export function getCachedUserFinance(uid: string): UserFinanceData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${FINANCE_CACHE_PREFIX}${uid}`)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('[financeService] Failed to read cached finance', e)
  }
  return null
}

export function setCachedUserFinance(uid: string, data: UserFinanceData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${FINANCE_CACHE_PREFIX}${uid}`, JSON.stringify(data))
  } catch (e) {
    console.warn('[financeService] Failed to cache finance', e)
  }
}

// ─── Get Firebase ID token ───────────────────────────────────────────
async function getToken(forceRefresh = false): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken(forceRefresh)) ?? null
  } catch {
    return null
  }
}

// ─── Load finance data from backend ──────────────────────────────────
export async function loadUserFinance(_uid: string): Promise<UserFinanceData> {
  // Check localStorage fallback first — marks if user has ever logged in before
  const localKey = `finshield-known-user-${_uid}`
  const isKnownUser = typeof window !== 'undefined' && !!localStorage.getItem(localKey)
  const cached = getCachedUserFinance(_uid)

  try {
    const token = await getToken(false)
    if (!token) {
      console.warn('[financeService] No auth token — returning defaults or cached')
      return cached ?? { ...DEFAULT_FINANCE, onboardingDone: isKnownUser }
    }

    const res = await fetch(`${BASE}/finance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error(`[financeService] GET /finance failed ${res.status}:`, txt)
      // If backend is down, use cached data or defaults
      return cached ?? { ...DEFAULT_FINANCE, onboardingDone: isKnownUser }
    }

    const json = await res.json()
    console.log('[financeService] Loaded:', json)

    const isNewUser = json.isNewUser === true

    // Mark user as known in localStorage so popup won't show if backend is down later
    if (typeof window !== 'undefined' && !isNewUser) {
      localStorage.setItem(localKey, '1')
    }

    if (json.success && json.data && Object.keys(json.data).length > 0) {
      const data = json.data as Partial<UserFinanceData>
      if (typeof window !== 'undefined') localStorage.setItem(localKey, '1')
      
      let debtsToUse = (Array.isArray(data.debts) && data.debts.length > 0)
        ? data.debts
        : (cached?.debts && cached.debts.length > 0 ? cached.debts : [])

      // Fallback: If debts is empty, check if diary has pledges in localStorage
      if ((!debtsToUse || debtsToUse.length === 0) && typeof window !== 'undefined') {
        try {
          const diaryRaw = localStorage.getItem('wpt_diary')
          if (diaryRaw) {
            const diary = JSON.parse(diaryRaw)
            if (Array.isArray(diary.pledges) && diary.pledges.length > 0) {
              debtsToUse = diary.pledges.map((p: any) => ({
                id: p.id || Date.now().toString(),
                name: p.name,
                monthlyPayment: p.monthlyPayment || 0,
                totalDebt: p.originalAmount || p.amount || 0,
                amount: p.amount,
                originalAmount: p.originalAmount || p.amount || 0,
                targetYear: p.targetYear || new Date().getFullYear() + 5,
                paymentDay: p.paymentDay || 1,
                nextPaymentDate: p.nextPaymentDate,
              }))
            }
          }
        } catch {}
      }

      const merged: UserFinanceData = {
        expenses:       { ...DEFAULT_FINANCE.expenses,   ...(data.expenses   ?? {}) },
        debts:          debtsToUse,
        assets:         { ...DEFAULT_FINANCE.assets,     ...(data.assets     ?? {}) },
        retirement:     { ...DEFAULT_FINANCE.retirement, ...(data.retirement ?? {}) },
        onboardingDone: data.onboardingDone ?? true,
        updatedAt:      data.updatedAt,
      }

      const totalMonthlyDebt = debtsToUse.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0)
      if (totalMonthlyDebt > 0 && (!merged.expenses.debt || merged.expenses.debt === 0)) {
        merged.expenses.debt = totalMonthlyDebt
      }

      setCachedUserFinance(_uid, merged)
      return merged
    }

    // User exists in DB but has no financeData yet (returning user who skipped onboarding)
    // OR brand new user — distinguish via isNewUser flag from backend
    const result: UserFinanceData = { ...DEFAULT_FINANCE, onboardingDone: !isNewUser }
    setCachedUserFinance(_uid, result)
    return result
  } catch (err) {
    console.error('[financeService] loadUserFinance error:', err)
    // Use cached data or fallback when network/DB is down
    return cached ?? { ...DEFAULT_FINANCE, onboardingDone: isKnownUser }
  }
}

// ─── Save finance data to backend ────────────────────────────────────
export async function saveUserFinance(_uid: string, data: UserFinanceData): Promise<void> {
  // Optimistically cache locally first for zero latency
  setCachedUserFinance(_uid, data)

  const token = await getToken(false)
  if (!token) throw new Error('Not authenticated')

  const payload = { ...data, updatedAt: Date.now() }
  console.log('[financeService] Saving:', payload)

  const res = await fetch(`${BASE}/finance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const txt = await res.text()
    console.error(`[financeService] POST /finance failed ${res.status}:`, txt)
    throw new Error(`Save failed: ${res.status}`)
  }

  const json = await res.json()
  console.log('[financeService] Saved OK:', json)
}
