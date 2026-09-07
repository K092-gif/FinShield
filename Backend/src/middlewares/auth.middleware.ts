/**
 * Authentication Middleware
 * เช็ค Token ล็อกอิน
 */

import { NextFunction, Request, Response } from 'express'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: 'finshield1'
    })
    console.log('Firebase Admin initialized')
  } catch (err) {
    console.warn('Firebase Admin init warning:', err)
  }
}

export interface AuthRequest extends Request {
  userId?: number
  firebaseUid?: string
  user?: any
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      })
    }

    try {
      // Official verification (checks signature, project ID, expiration, issuer)
      const decoded = await admin.auth().verifyIdToken(token)
      req.firebaseUid = decoded.uid
      req.user = decoded
      next()
    } catch (firebaseErr) {
      console.warn('[authMiddleware] verifyIdToken failed:', (firebaseErr as Error).message)
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      })
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error)
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    })
  }
}
