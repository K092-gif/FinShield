/**
 * Portfolio Routes
 * Endpoints: GET /api/portfolios, POST /api/portfolios, etc.
 */

import { Router } from 'express'
// import { getPortfolios, createPortfolio, updatePortfolio, deletePortfolio } from '../controllers/portfolio.controller'

const router = Router()

/**
 * GET /api/portfolios
 * ดึงรายการ Portfolio ทั้งหมดของผู้ใช้
 */
// router.get('/', getPortfolios)

/**
 * POST /api/portfolios
 * สร้าง Portfolio ใหม่
 */
// router.post('/', createPortfolio)

/**
 * PUT /api/portfolios/:id
 * แก้ไข Portfolio
 */
// router.put('/:id', updatePortfolio)

/**
 * DELETE /api/portfolios/:id
 * ลบ Portfolio
 */
// router.delete('/:id', deletePortfolio)

export default router
