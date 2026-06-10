import { Router } from 'express'
import { getFinanceData, updateFinanceData } from '../controllers/finance.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.get('/', authMiddleware, getFinanceData)
router.post('/', authMiddleware, updateFinanceData)

export default router
