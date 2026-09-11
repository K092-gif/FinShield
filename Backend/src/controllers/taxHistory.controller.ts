import { Response } from 'express'
import { prisma } from '../prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

// ─── Save (Upsert) Tax History for a specific year ─────────────────────────
export const saveTaxHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { firebaseUid } = req
    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const {
      taxYear,
      annualIncome,
      totalDeductions,
      netIncome,
      taxWithoutDeductions,
      taxWithDeductions,
      taxSaved,
      marginalRate,
      deductions,
    } = req.body

    if (!taxYear || typeof taxYear !== 'number') {
      return res.status(400).json({ success: false, error: 'taxYear is required and must be a number' })
    }

    // Find user by firebaseUid
    const user = await prisma.user.findUnique({ where: { firebaseUid } })
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    // Normalize marginalRate: if passed as > 1 (e.g. 25 for 25%), convert to decimal 0.25
    const normalizedMarginalRate = typeof marginalRate === 'number'
      ? (marginalRate > 1 ? marginalRate / 100 : marginalRate)
      : 0

    // Upsert: create if not exists, update if exists
    const record = await prisma.taxHistory.upsert({
      where: {
        userId_taxYear: {
          userId: user.id,
          taxYear,
        },
      },
      update: {
        annualIncome: annualIncome ?? 0,
        totalDeductions: totalDeductions ?? 0,
        netIncome: netIncome ?? 0,
        taxWithoutDeductions: taxWithoutDeductions ?? 0,
        taxWithDeductions: taxWithDeductions ?? 0,
        taxSaved: taxSaved ?? 0,
        marginalRate: normalizedMarginalRate,
        deductions: deductions ?? {},
      },
      create: {
        userId: user.id,
        taxYear,
        annualIncome: annualIncome ?? 0,
        totalDeductions: totalDeductions ?? 0,
        netIncome: netIncome ?? 0,
        taxWithoutDeductions: taxWithoutDeductions ?? 0,
        taxWithDeductions: taxWithDeductions ?? 0,
        taxSaved: taxSaved ?? 0,
        marginalRate: normalizedMarginalRate,
        deductions: deductions ?? {},
      },
    })

    return res.json({ success: true, data: record })
  } catch (error) {
    console.error('[saveTaxHistory] error:', error)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}

// ─── Get all Tax Histories for the current user ────────────────────────────
export const getTaxHistories = async (req: AuthRequest, res: Response) => {
  try {
    const { firebaseUid } = req
    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid } })
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    const records = await prisma.taxHistory.findMany({
      where: { userId: user.id },
      orderBy: { taxYear: 'desc' },
    })

    const normalizedRecords = records.map(r => ({
      ...r,
      marginalRate: r.marginalRate > 1 ? r.marginalRate / 100 : r.marginalRate,
    }))

    return res.json({ success: true, data: normalizedRecords })
  } catch (error) {
    console.error('[getTaxHistories] error:', error)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}

// ─── Delete Tax History for a specific year ────────────────────────────────
export const deleteTaxHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { firebaseUid } = req
    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const taxYear = parseInt(req.params.year, 10)
    if (isNaN(taxYear)) {
      return res.status(400).json({ success: false, error: 'Invalid year parameter' })
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid } })
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    // Check if record exists
    const existing = await prisma.taxHistory.findUnique({
      where: {
        userId_taxYear: {
          userId: user.id,
          taxYear,
        },
      },
    })

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Tax history not found for this year' })
    }

    await prisma.taxHistory.delete({
      where: { id: existing.id },
    })

    return res.json({ success: true, message: `Tax history for year ${taxYear} deleted` })
  } catch (error) {
    console.error('[deleteTaxHistory] error:', error)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
