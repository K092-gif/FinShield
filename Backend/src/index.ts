/**
 * ไฟล์หลักสำหรับ Start Express Server
 */

import cors from 'cors'
import dotenv from 'dotenv'
import express, { Express, Request, Response } from 'express'

// Import routes
import simulatorRoutes from './routes/simulator.routes'
import financeRoutes from './routes/finance.routes'
// import portfolioRoutes from './routes/portfolio.routes'

// Import middlewares
// import { errorHandler } from './middlewares/error.middleware'

// Load environment variables
dotenv.config()

const app: Express = express()
const PORT = process.env.PORT || 5000

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
})
