import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getInsurancePlans = async (req: Request, res: Response) => {
  try {
    const { category } = req.query

    const filter: any = {}
    if (category) {
      filter.category = String(category)
    }

    const plans = await prisma.insurancePlan.findMany({
      where: filter,
      orderBy: [
        { category: 'asc' },
        { company: 'asc' }
      ]
    })

    res.json(plans)
  } catch (error: any) {
    console.error('Error fetching insurance plans:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
