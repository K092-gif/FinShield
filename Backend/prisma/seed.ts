import { PrismaClient } from '@prisma/client'
import { MASTER_ASSETS } from '../src/utils/assetSeedData'

const BANK_TIERS: Record<
  string,
  { name: string; tiers: Array<{ minBalance: number; rate: number }> }
> = {
  kkp_dime: {
    name: "เกียรตินาคินภัทร - Dime! Save (สูงสุด 3.00%)",
    tiers: [
      { minBalance: 0, rate: 0.03 },
      { minBalance: 10000, rate: 0.03 },
      { minBalance: 1000000, rate: 0.01 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  tcrb_alpha: {
    name: "ไทยเครดิต - ออมทรัพย์อัลฟา (สูงสุด 1.70%)",
    tiers: [
      { minBalance: 0, rate: 0.005 },
      { minBalance: 500000, rate: 0.017 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  krungsri_kept: {
    name: "กรุงศรีอยุธยา - Kept (สูงสุด 1.45%)",
    tiers: [
      { minBalance: 0, rate: 0.005 },
      { minBalance: 2000000, rate: 0.0145 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  tisco_e: {
    name: "ทิสโก้ - TISCO e-Savings (1.35%)",
    tiers: [
      { minBalance: 0, rate: 0.005 },
      { minBalance: 1000000, rate: 0.0135 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  scb_ez: {
    name: "ไทยพาณิชย์ (SCB) - EZ Savings (1.25%)",
    tiers: [
      { minBalance: 0, rate: 0.005 },
      { minBalance: 1000000, rate: 0.0125 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  kbank_e: {
    name: "กสิกรไทย (KBank) - K-eSavings (1.25%)",
    tiers: [
      { minBalance: 0, rate: 0.005 },
      { minBalance: 500000, rate: 0.0125 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  bbl_e: {
    name: "กรุงเทพ - e-Savings (1.25%)",
    tiers: [
      { minBalance: 0, rate: 0.005 },
      { minBalance: 1000000, rate: 0.0125 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  lh_byou: {
    name: "แลนด์ แอนด์ เฮ้าส์ - B-You Wealth (0.90%)",
    tiers: [{ minBalance: 0, rate: 0.009 }],
  },
  ttb_me: {
    name: "ทหารไทยธนชาต (ttb) - ME save (0.90%)",
    tiers: [{ minBalance: 0, rate: 0.009 }],
  },
  ktb_next: {
    name: "กรุงไทย - NEXT Savings (0.90%)",
    tiers: [{ minBalance: 0, rate: 0.009 }],
  },
  icbc_e: {
    name: "ไอซีบีซี (ไทย) - e-Savings (0.70%)",
    tiers: [{ minBalance: 0, rate: 0.007 }],
  },
};

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🌱 Starting seed...')

    // 1. Seed Assets
    console.log(`Seeding ${MASTER_ASSETS.length} assets...`)
    for (const asset of MASTER_ASSETS) {
      await prisma.asset.upsert({
        where: { symbol: asset.id },
        update: {
          name: asset.name,
          category: asset.category,
          sector: asset.sector,
          yield: asset.yield,
          risk: asset.risk,
          badge: asset.badge,
          taxBase: asset.taxBase,
          paysDividend: asset.paysDividend
        },
        create: {
          symbol: asset.id,
          name: asset.name,
          category: asset.category,
          sector: asset.sector,
          yield: asset.yield,
          risk: asset.risk,
          badge: asset.badge,
          taxBase: asset.taxBase,
          paysDividend: asset.paysDividend
        },
      })
    }
    console.log('✅ Assets seeded successfully!')

    // 2. Seed Bank Tiers
    console.log('Seeding BankTiers...')
    await prisma.bankTier.deleteMany({});
    console.log('Cleared existing BankTier records.');

    for (const [bankId, bankData] of Object.entries(BANK_TIERS)) {
      for (const tier of bankData.tiers) {
        if (tier.minBalance === Infinity) continue;
        await prisma.bankTier.create({
          data: {
            bankId,
            bankName: bankData.name,
            minBalance: tier.minBalance,
            interestRate: tier.rate,
          },
        });
      }
    }
    console.log('✅ BankTiers seeded successfully!')

    console.log('🎉 Seed completed successfully!')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
