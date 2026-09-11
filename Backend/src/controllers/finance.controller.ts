import { Response } from 'express'
import { prisma } from '../prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

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
        finance: true,
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
          finance: { create: {} },
        },
        include: {
          finance: true,
        }
      })
      console.log('[getFinanceData] User created:', user.id)
      isNewUser = true
    }

    const fin = user.finance

    // Map consolidated table back to the JSON structure expected by frontend
    const mappedData = {
      expenses: {
        food: fin?.food || 0,
        rent: fin?.rent || 0,
        transport: fin?.transport || 0,
        necessities: fin?.necessities || 0,
        other: fin?.other || 0,
        debt: fin?.debt || 0,
      },
      assets: {
        currentCapital: fin?.currentCapital || 0,
        emergencyFund: fin?.emergencyFund || 0,
        monthlySavings: fin?.monthlySavings || 0,
        retirementGoal: fin?.retirementGoal || 0,
        monthlyIncome: fin?.monthlyIncome || 0,
      },
      retirement: {
        currentAge: fin?.currentAge || 25,
        retirementAge: fin?.retirementAge || 60,
        initialCapital: fin?.currentCapital || 0,
        monthlySavings: fin?.monthlySavings || 0,
        dividendGoal: fin?.dividendGoal || 0,
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

    // Consolidated user finance data
    const userFinanceData = {
      food: sanitizeFloat(expenses.food, 0),
      rent: sanitizeFloat(expenses.rent, 0),
      transport: sanitizeFloat(expenses.transport, 0),
      necessities: sanitizeFloat(expenses.necessities, 0),
      other: sanitizeFloat(expenses.other, 0),
      debt: sanitizeFloat(expenses.debt, 0),
      currentCapital: sanitizeFloat(assets.currentCapital ?? retirement.initialCapital, 0),
      emergencyFund: sanitizeFloat(assets.emergencyFund, 0),
      monthlySavings: sanitizeFloat(assets.monthlySavings ?? retirement.monthlySavings, 0),
      retirementGoal: sanitizeFloat(assets.retirementGoal, 0),
      monthlyIncome: sanitizeFloat(assets.monthlyIncome, 0),
      currentAge: sanitizeInt(retirement.currentAge, 25),
      retirementAge: sanitizeInt(retirement.retirementAge, 60),
      dividendGoal: sanitizeFloat(retirement.dividendGoal, 0),
    }

    // Upsert User and consolidated UserFinance in a single query
    const user = await prisma.user.upsert({
      where: { firebaseUid },
      update: {
        onboardingDone: financeData.onboardingDone ?? undefined,
        updatedAt: new Date(),
        finance: {
          upsert: { create: userFinanceData, update: userFinanceData }
        },
      },
      create: {
        firebaseUid,
        email: decodedToken?.email || `user_${firebaseUid}@finshield.app`,
        name: decodedToken?.name || decodedToken?.displayName || 'User',
        onboardingDone: financeData.onboardingDone ?? false,
        finance: { create: userFinanceData },
      },
      include: {
        finance: true,
      }
    })

    console.log('[updateFinanceData] Saved for user id:', user.id)
    
    const fin = user.finance
    const mappedData = {
      expenses: {
        food: fin?.food || 0,
        rent: fin?.rent || 0,
        transport: fin?.transport || 0,
        necessities: fin?.necessities || 0,
        other: fin?.other || 0,
        debt: fin?.debt || 0,
      },
      assets: {
        currentCapital: fin?.currentCapital || 0,
        emergencyFund: fin?.emergencyFund || 0,
        monthlySavings: fin?.monthlySavings || 0,
        retirementGoal: fin?.retirementGoal || 0,
        monthlyIncome: fin?.monthlyIncome || 0,
      },
      retirement: {
        currentAge: fin?.currentAge || 25,
        retirementAge: fin?.retirementAge || 60,
        initialCapital: fin?.currentCapital || 0,
        monthlySavings: fin?.monthlySavings || 0,
        dividendGoal: fin?.dividendGoal || 0,
      },
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
