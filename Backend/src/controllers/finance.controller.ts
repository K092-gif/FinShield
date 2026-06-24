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

    // Find or create user by firebaseUid
    let user = await prisma.user.findUnique({ where: { firebaseUid } })
    let isNewUser = false

    if (!user) {
      console.log('[getFinanceData] Creating new user for uid:', firebaseUid)
      user = await prisma.user.create({
        data: {
          firebaseUid,
          email: decodedToken?.email || `user_${firebaseUid}@finshield.app`,
          name: decodedToken?.name || decodedToken?.displayName || 'User',
        },
      })
      console.log('[getFinanceData] User created:', user.id)
      isNewUser = true
    }

    return res.json({
      success: true,
      data: user.financeData ?? {},
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
    console.log('[updateFinanceData] body keys:', Object.keys(financeData || {}))

    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    if (!financeData || Object.keys(financeData).length === 0) {
      return res.status(400).json({ success: false, error: 'No finance data provided' })
    }

    // Upsert: update if exists, create if not
    const user = await prisma.user.upsert({
      where: { firebaseUid },
      update: {
        financeData,
        updatedAt: new Date(),
      },
      create: {
        firebaseUid,
        email: decodedToken?.email || `user_${firebaseUid}@finshield.app`,
        name: decodedToken?.name || decodedToken?.displayName || 'User',
        financeData,
      },
    })

    console.log('[updateFinanceData] Saved for user id:', user.id)

    return res.json({
      success: true,
      message: 'Finance data updated successfully',
      data: user.financeData,
    })
  } catch (error) {
    console.error('[updateFinanceData] error:', error)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
