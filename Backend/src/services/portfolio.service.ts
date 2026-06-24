/**
 * Portfolio Service
 * คุยกับ Database ผ่าน Prisma (ดึง/บันทึก/แก้ไขข้อมูล)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * ดึง Portfolio ของผู้ใช้
 */
export const getPortfolioService = async (userId: number) => {
  try {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      include: { allocations: true },
    })
    return portfolios
  } catch (error) {
    console.error('Error fetching portfolios:', error)
    throw error
  }
}

/**
 * สร้าง Portfolio ใหม่
 */
export const createPortfolioService = async (
  userId: number,
  name: string
) => {
  try {
    const portfolio = await prisma.portfolio.create({
      data: { name, userId },
    })
    return portfolio
  } catch (error) {
    console.error('Error creating portfolio:', error)
    throw error
  }
}

/**
 * แก้ไข Portfolio
 */
export const updatePortfolioService = async (
  portfolioId: number,
  data: { name?: string }
) => {
  try {
    const portfolio = await prisma.portfolio.update({
      where: { id: portfolioId },
      data,
    })
    return portfolio
  } catch (error) {
    console.error('Error updating portfolio:', error)
    throw error
  }
}

/**
 * ลบ Portfolio
 */
export const deletePortfolioService = async (portfolioId: number) => {
  try {
    const portfolio = await prisma.portfolio.delete({
      where: { id: portfolioId },
    })
    return portfolio
  } catch (error) {
    console.error('Error deleting portfolio:', error)
    throw error
  }
}
