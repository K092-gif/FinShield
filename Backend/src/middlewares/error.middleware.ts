/**
 * Error Handler Middleware
 * จัดการ Error ของระบบ
 */

import { NextFunction, Request, Response } from 'express'

interface ErrorWithStatus extends Error {
  status?: number
}

export const errorHandler = (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = error.status || 500
  const message = error.message || 'Internal Server Error'

  console.error(`[ERROR ${status}] ${message}`)
  console.error(error.stack)

  res.status(status).json({
    success: false,
    error: message,
    status,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  })
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
