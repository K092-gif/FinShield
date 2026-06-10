import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middlewares/auth.middleware'

const prisma = new PrismaClient()

// ─── Get User Finance Data ──────────────────────────────────────────────────
export const getFinanceData = async (req: AuthRequest, res: Response) => {
  try {
    const { firebaseUid, user: decodedToken } = req

    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    // Find or create user by firebaseUid
    let user = await prisma.user.findUnique({
      where: { firebaseUid },
    })

    // If user doesn't exist in our Postgres DB yet, create them.
    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid: firebaseUid,
          email: decodedToken?.email || `user_${firebaseUid}@example.com`,
          name: decodedToken?.name || 'New User',
        },
      })
    }

    res.json({
      success: true,
      data: user.financeData || {},
    })
  } catch (error) {
    console.error('getFinanceData error:', error)
    res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}

// ─── Update User Finance Data ───────────────────────────────────────────────
export const updateFinanceData = async (req: AuthRequest, res: Response) => {
  try {
    const { firebaseUid, user: decodedToken } = req
    const financeData = req.body

    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    // Upsert user to ensure they exist and update financeData
    const user = await prisma.user.upsert({
      where: { firebaseUid },
      update: { financeData },
      create: {
        firebaseUid: firebaseUid,
        email: decodedToken?.email || `user_${firebaseUid}@example.com`,
        name: decodedToken?.name || 'New User',
        financeData: financeData,
      },
    })

    res.json({
      success: true,
      message: 'Finance data updated successfully',
      data: user.financeData,
    })
  } catch (error) {
    console.error('updateFinanceData error:', error)
    res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
