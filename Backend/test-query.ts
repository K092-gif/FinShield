import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('⏳ กำลังทดสอบ Query ข้อมูล...')

  // 1. ลองสร้าง User ใหม่ (ถ้ามีแล้วมันจะข้ามไป)
  const newUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      firebaseUid: 'test_uid_12345',
      financeData: {
        expenses: { food: 5000, rent: 10000 },
        assets: { emergencyFund: 50000 }
      }
    },
  })
  console.log('✅ สร้าง/อัปเดต User สำเร็จ:', newUser)

  // 2. ลอง Query ดึงข้อมูล User ทั้งหมดออกมาดู
  const allUsers = await prisma.user.findMany()
  console.log('\n📊 ข้อมูล User ทั้งหมดในฐานข้อมูล:')
  console.dir(allUsers, { depth: null })
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาด:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
