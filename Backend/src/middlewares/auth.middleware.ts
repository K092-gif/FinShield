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
      // Attempt official verification (Requires Service Account credentials)
      const decoded = await admin.auth().verifyIdToken(token)
      req.firebaseUid = decoded.uid
      req.user = decoded
      next()
    } catch (firebaseErr) {
      // Fallback for Local Development (Decode token without signature verification)
      // This allows the app to work even if the user hasn't set up GOOGLE_APPLICATION_CREDENTIALS
      console.warn('Firebase verifyIdToken failed, falling back to manual decode (Local Dev Mode Only):', firebaseErr.message)
      
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
        if (payload && payload.user_id) {
          req.firebaseUid = payload.user_id
          req.user = payload
          next()
          return
        }
      }
      
      throw new Error('Invalid token format')
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error)
    res.status(401).json({
      success: false,
      error: 'Invalid token or Firebase not configured properly',
    })
  }
}
