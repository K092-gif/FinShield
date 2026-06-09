/**
 * Portfolio Controller
 * จัดการ Logic ว่าเมื่อเรียก Route นี้จะให้ทำอะไร
 */

import { Request, Response } from 'express'
// import { getPortfolioService, createPortfolioService } from '../services/portfolio.service'

/**
 * ดึงรายการ Portfolio ทั้งหมด
 */
export const getPortfolios = async (req: Request, res: Response) => {
  try {
    // const portfolios = await getPortfolioService()
    // res.json({ success: true, data: portfolios })
    res.json({ success: true, data: [] })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch portfolios' })
  }
}

/**
 * สร้าง Portfolio ใหม่
 */
export const createPortfolio = async (req: Request, res: Response) => {
  try {
    const { name } = req.body
    // const portfolio = await createPortfolioService(name)
    // res.status(201).json({ success: true, data: portfolio })
    res.status(201).json({ success: true, data: {} })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create portfolio' })
  }
}

/**
 * แก้ไข Portfolio
 */
export const updatePortfolio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    // const portfolio = await updatePortfolioService(id, req.body)
    // res.json({ success: true, data: portfolio })
    res.json({ success: true, data: {} })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update portfolio' })
  }
}

/**
 * ลบ Portfolio
 */
export const deletePortfolio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    // await deletePortfolioService(id)
    res.json({ success: true, message: 'Portfolio deleted' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete portfolio' })
  }
}
