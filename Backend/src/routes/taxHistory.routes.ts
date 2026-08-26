import { Router } from 'express'
import { saveTaxHistory, getTaxHistories, deleteTaxHistory } from '../controllers/taxHistory.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.post('/', authMiddleware, saveTaxHistory)
router.get('/', authMiddleware, getTaxHistories)
router.delete('/:year', authMiddleware, deleteTaxHistory)

export default router
