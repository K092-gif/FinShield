/**
 * Finance data service — PostgreSQL API CRUD
 */
import { apiCall } from './api'
import { auth } from './firebase'

// ─── Types ────────────────────────────────────────────────────────────
export interface FinanceExpenses {
  food: number        // ค่าอาหาร
  rent: number        // ค่าที่พัก
  transport: number   // ค่าเดินทาง
  necessities: number // ของใช้จำเป็น
  other: number       // อื่นๆ
}

export interface FinanceDebt {
  id: string
  name: string
  total: number
  monthly: number
}

export interface FinanceAssets {
  currentCapital: number   // เงินทุนปัจจุบัน
  emergencyFund: number    // เงินสำรองฉุกเฉิน
  monthlySavings: number   // เงินออม/เดือน
  retirementGoal: number   // เป้าหมายรายได้หลังเกษียณ/เดือน
}

export interface FinanceRetirement {
  currentAge: number       // อายุปัจจุบัน
  retirementAge: number    // อายุที่ต้องการเกษียณ
  initialCapital: number   // เงินทุนตั้งต้น (retirement tool)
  monthlySavings: number   // ออมเพิ่ม/เดือน (retirement tool)
  dividendGoal: number     // เป้าหมายปันผล/เดือน
}

export interface UserFinanceData {
  expenses: FinanceExpenses
  debts: FinanceDebt[]
  assets: FinanceAssets
  retirement: FinanceRetirement
  updatedAt?: number
}

// ─── Defaults ────────────────────────────────────────────────────────
export const DEFAULT_FINANCE: UserFinanceData = {
  expenses: {
    food: 8000,
    rent: 12000,
    transport: 5000,
    necessities: 3000,
    other: 2000,
  },
  debts: [],
  assets: {
    currentCapital: 500000,
    emergencyFund: 50000,
    monthlySavings: 10000,
    retirementGoal: 50000,
  },
  retirement: {
    currentAge: 30,
    retirementAge: 55,
    initialCapital: 500000,
    monthlySavings: 10000,
    dividendGoal: 50000,
  },
}

// ─── Backend API helpers ───────────────────────────────────────────────

export async function loadUserFinance(uid: string): Promise<UserFinanceData> {
  try {
    const token = await auth.currentUser?.getIdToken()
    const res = await apiCall('/finance', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.success && res.data && Object.keys(res.data).length > 0) {
      const data = res.data as Partial<UserFinanceData>
      // Deep-merge with defaults so new fields don't break old docs
      return {
        expenses:   { ...DEFAULT_FINANCE.expenses,   ...(data.expenses   ?? {}) },
        debts:      data.debts ?? [],
        assets:     { ...DEFAULT_FINANCE.assets,     ...(data.assets     ?? {}) },
        retirement: { ...DEFAULT_FINANCE.retirement, ...(data.retirement ?? {}) },
        updatedAt:  data.updatedAt,
      }
    }
    // First time — return defaults (don't write yet, wait for explicit save)
    return { ...DEFAULT_FINANCE }
  } catch (err) {
    console.warn('[financeService] Backend API read failed, using defaults', err)
    return { ...DEFAULT_FINANCE }
  }
}

export async function saveUserFinance(uid: string, data: UserFinanceData): Promise<void> {
  const token = await auth.currentUser?.getIdToken()
  await apiCall('/finance', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...data, updatedAt: Date.now() })
  })
}
