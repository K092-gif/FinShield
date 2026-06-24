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
  debt: number
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
  assets: FinanceAssets
  retirement: FinanceRetirement
  onboardingDone?: boolean   // true = never show onboarding popup again
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

// ─── Get fresh Firebase ID token ─────────────────────────────────────
async function getToken(): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken(true)) ?? null
  } catch {
    return null
  }
}

// ─── Load finance data from backend ──────────────────────────────────
export async function loadUserFinance(_uid: string): Promise<UserFinanceData> {
  // Check localStorage fallback first — marks if user has ever logged in before
  const localKey = `finshield-known-user-${_uid}`
  const isKnownUser = typeof window !== 'undefined' && !!localStorage.getItem(localKey)

  try {
    const token = await getToken()
    if (!token) {
      console.warn('[financeService] No auth token — returning defaults')
      return { ...DEFAULT_FINANCE, onboardingDone: isKnownUser }
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
      // If backend is down, use localStorage fallback to avoid showing popup to existing users
      return { ...DEFAULT_FINANCE, onboardingDone: isKnownUser }
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
      // Mark as known since they have data
      if (typeof window !== 'undefined') localStorage.setItem(localKey, '1')
      return {
        expenses:       { ...DEFAULT_FINANCE.expenses,   ...(data.expenses   ?? {}) },
        debts:          Array.isArray(data.debts) ? data.debts : [],
        assets:         { ...DEFAULT_FINANCE.assets,     ...(data.assets     ?? {}) },
        retirement:     { ...DEFAULT_FINANCE.retirement, ...(data.retirement ?? {}) },
        onboardingDone: data.onboardingDone ?? true,
        updatedAt:      data.updatedAt,
      }
    }

    // User exists in DB but has no financeData yet (returning user who skipped onboarding)
    // OR brand new user — distinguish via isNewUser flag from backend
    return { ...DEFAULT_FINANCE, onboardingDone: !isNewUser }
  } catch (err) {
    console.error('[financeService] loadUserFinance error:', err)
    // Use localStorage fallback when network/DB is completely down
    return { ...DEFAULT_FINANCE, onboardingDone: isKnownUser }
  }
}

// ─── Save finance data to backend ────────────────────────────────────
export async function saveUserFinance(_uid: string, data: UserFinanceData): Promise<void> {
  const token = await getToken()
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
