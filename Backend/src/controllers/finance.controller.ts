import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middlewares/auth.middleware'

const prisma = new PrismaClient()

// ─── Get User Finance Data ──────────────────────────────────────────────────
export const getFinanceData = async (req: AuthRequest, res: Response) => {
  try {
    const { firebaseUid, user: decodedToken } = req
    console.log('[getFinanceData] firebaseUid:', firebaseUid)

    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    // Find or create user by firebaseUid, including related financial data
    let user = await prisma.user.findUnique({
      where: { firebaseUid },
      include: {
        expense: true,
        asset: true,
        retirement: true,
      }
    })
    
    let isNewUser = false

    if (!user) {
      console.log('[getFinanceData] Creating new user for uid:', firebaseUid)
      user = await prisma.user.create({
        data: {
          firebaseUid,
          email: decodedToken?.email || `user_${firebaseUid}@finshield.app`,
          name: decodedToken?.name || decodedToken?.displayName || 'User',
          onboardingDone: false,
          expense: { create: {} },
          asset: { create: {} },
          retirement: { create: {} },
        },
        include: {
          expense: true,
          asset: true,
          retirement: true,
        }
      })
      console.log('[getFinanceData] User created:', user.id)
      isNewUser = true
    }

    // Map normalized tables back to the JSON structure expected by frontend
    const mappedData = {
      expenses: {
        food: user.expense?.food || 0,
        rent: user.expense?.rent || 0,
        transport: user.expense?.transport || 0,
        necessities: user.expense?.necessities || 0,
        other: user.expense?.other || 0,
        debt: user.expense?.debt || 0,
      },
      assets: {
        currentCapital: user.asset?.currentCapital || 0,
        emergencyFund: user.asset?.emergencyFund || 0,
        monthlySavings: user.asset?.monthlySavings || 0,
        retirementGoal: user.asset?.retirementGoal || 0,
        monthlyIncome: user.asset?.monthlyIncome || 0,
      },
      retirement: {
        currentAge: user.retirement?.currentAge || 25,
        retirementAge: user.retirement?.retirementAge || 60,
        initialCapital: user.retirement?.initialCapital || 0,
        monthlySavings: user.retirement?.monthlySavings || 0,
        dividendGoal: user.retirement?.dividendGoal || 0,
      },
      onboardingDone: user.onboardingDone,
      updatedAt: user.updatedAt.getTime(),
    }

    return res.json({
      success: true,
      data: mappedData,
      isNewUser,
    })
  } catch (error) {
    console.error('[getFinanceData] error:', error)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}

// ─── Update User Finance Data ───────────────────────────────────────────────
export const updateFinanceData = async (req: AuthRequest, res: Response) => {
  try {
    const { firebaseUid, user: decodedToken } = req
    const financeData = req.body

    console.log('[updateFinanceData] firebaseUid:', firebaseUid)

    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    if (!financeData || Object.keys(financeData).length === 0) {
      return res.status(400).json({ success: false, error: 'No finance data provided' })
    }

    const expenses = financeData.expenses || {}
    const assets = financeData.assets || {}
    const retirement = financeData.retirement || {}
    
    // Helper to safely parse and sanitize numeric inputs
    const sanitizeFloat = (val: any, fallback = 0): number => {
      if (val === undefined || val === null || val === '') return fallback
      const num = Number(val)
      return Number.isFinite(num) ? num : fallback
    }

    const sanitizeInt = (val: any, fallback = 0): number => {
      if (val === undefined || val === null || val === '') return fallback
      const num = parseInt(String(val), 10)
      return Number.isFinite(num) ? num : fallback
    }

    // Prepare data for upsert logic with safe sanitized numeric values
    const expenseData = {
      food: sanitizeFloat(expenses.food, 0),
      rent: sanitizeFloat(expenses.rent, 0),
      transport: sanitizeFloat(expenses.transport, 0),
      necessities: sanitizeFloat(expenses.necessities, 0),
      other: sanitizeFloat(expenses.other, 0),
      debt: sanitizeFloat(expenses.debt, 0),
    }
    
    const assetData = {
      currentCapital: sanitizeFloat(assets.currentCapital, 0),
      emergencyFund: sanitizeFloat(assets.emergencyFund, 0),
      monthlySavings: sanitizeFloat(assets.monthlySavings, 0),
      retirementGoal: sanitizeFloat(assets.retirementGoal, 0),
      monthlyIncome: sanitizeFloat(assets.monthlyIncome, 0),
    }
    
    const retirementData = {
      currentAge: sanitizeInt(retirement.currentAge, 25),
      retirementAge: sanitizeInt(retirement.retirementAge, 60),
      initialCapital: sanitizeFloat(retirement.initialCapital, 0),
      monthlySavings: sanitizeFloat(retirement.monthlySavings, 0),
      dividendGoal: sanitizeFloat(retirement.dividendGoal, 0),
    }

    // Upsert User and all related tables in a single transaction
    const user = await prisma.user.upsert({
      where: { firebaseUid },
      update: {
        onboardingDone: financeData.onboardingDone ?? undefined,
        updatedAt: new Date(),
        expense: {
          upsert: { create: expenseData, update: expenseData }
        },
        asset: {
          upsert: { create: assetData, update: assetData }
        },
        retirement: {
          upsert: { create: retirementData, update: retirementData }
        },
      },
      create: {
        firebaseUid,
        email: decodedToken?.email || `user_${firebaseUid}@finshield.app`,
        name: decodedToken?.name || decodedToken?.displayName || 'User',
        onboardingDone: financeData.onboardingDone ?? false,
        expense: { create: expenseData },
        asset: { create: assetData },
        retirement: { create: retirementData },
      },
      include: {
        expense: true,
        asset: true,
        retirement: true,
      }
    })

    console.log('[updateFinanceData] Saved for user id:', user.id)
    
    const mappedData = {
      expenses: user.expense,
      assets: user.asset,
      retirement: user.retirement,
      onboardingDone: user.onboardingDone,
      updatedAt: user.updatedAt.getTime(),
    }

    return res.json({
      success: true,
      message: 'Finance data updated successfully',
      data: mappedData,
    })
  } catch (error: any) {
    console.error('[updateFinanceData] error:', error)
    if (error?.name === 'PrismaClientValidationError') {
      return res.status(400).json({ success: false, error: 'Invalid input data format' })
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
