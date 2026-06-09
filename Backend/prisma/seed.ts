/**
 * ไฟล์สคริปต์สำหรับใส่ข้อมูลเริ่มต้น
 * รันด้วยคำสั่ง: npm run prisma:seed
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🌱 Starting seed...')

    // Example: Create sample stocks
    const stocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 150.25 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 140.50 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 380.75 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 170.30 },
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 250.60 },
    ]

    for (const stock of stocks) {
      await prisma.stock.upsert({
        where: { symbol: stock.symbol },
        update: { price: stock.price },
        create: stock,
      })
    }

    console.log('✅ Seed completed successfully!')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
