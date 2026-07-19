import { Router } from 'express'
import * as insuranceController from '../controllers/insurance.controller'

const router = Router()

// GET /api/insurance/plans
// Query params: category (optional)
router.get('/plans', insuranceController.getInsurancePlans)

export default router
