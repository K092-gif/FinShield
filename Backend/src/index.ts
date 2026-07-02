/**
 * ไฟล์หลักสำหรับ Start Express Server
 */

import cors from 'cors'
import dotenv from 'dotenv'
import express, { Express, Request, Response } from 'express'

// Import routes
import simulatorRoutes from './routes/simulator.routes'
import financeRoutes from './routes/finance.routes'
import aiRoutes from './routes/ai.routes'
// import portfolioRoutes from './routes/portfolio.routes'
import { seedBankTiersIfEmpty } from './utils/seedBankTiers'
import { seedAssetsIfEmpty } from './utils/seedAssets'

// Import middlewares
// import { errorHandler } from './middlewares/error.middleware'

// Load environment variables
dotenv.config()

const app: Express = express()
const PORT = process.env.PORT || 5000

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true)
    const allowed = [
      'http://localhost:3000',
      'http://172.20.241.163:3000',
      process.env.FRONTEND_URL,
    ].filter(Boolean)
    if (allowed.includes(origin)) return callback(null, true)
    // Allow any origin on the same subnet (172.20.x.x) for dev flexibility
    if (origin.startsWith('http://172.20.')) return callback(null, true)
    callback(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/simulator', simulatorRoutes)
app.use('/api/finance', financeRoutes)
app.use('/api/ai', aiRoutes)
// app.use('/api/portfolios', portfolioRoutes)

// 404 Handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  })
})

// Error Handler (should be last)
// app.use(errorHandler)

// Run auto-seeders and start server
Promise.all([
  seedBankTiersIfEmpty(),
  seedAssetsIfEmpty()
]).then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`)
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
  })
})
