/**
 * TypeScript Type Definitions and Interfaces
 */

export interface Portfolio {
  id: number
  name: string
  userId: number
  createdAt: Date
  updatedAt: Date
}

export interface Stock {
  id: number
  symbol: string
  name: string
  price: number
  updatedAt: Date
}

export interface PortfolioStock {
  id: number
  portfolioId: number
  stockId: number
  quantity: number
  buyPrice: number
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: number
  email: string
  name?: string
  createdAt: Date
  updatedAt: Date
}
