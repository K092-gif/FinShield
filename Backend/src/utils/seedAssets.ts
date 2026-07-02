import { PrismaClient } from '@prisma/client';
import { MASTER_ASSETS } from './assetSeedData';

const prisma = new PrismaClient();

export async function seedAssetsIfEmpty() {
  try {
    const count = await prisma.asset.count();
    if (count > 0) {
      console.log('✅ Assets already exist in DB. Skipping seed.');
      return;
    }

    console.log('🌱 Table Asset is empty. Starting auto-seed...');

    // We can use createMany for bulk insertion, but we'll do sequential/mapped to handle any unique constraint gracefully if needed
    const assetsData = MASTER_ASSETS.map((a: any) => ({
      symbol: a.id,
      name: a.name,
      sector: a.sector || null,
      category: a.category,
      yield: a.yield,
      risk: a.risk,
      badge: a.badge,
      taxBase: a.taxBase,
      paysDividend: a.paysDividend,
    }));

    await prisma.asset.createMany({
      data: assetsData,
      skipDuplicates: true,
    });

    console.log(`✅ Auto-seed of ${assetsData.length} Assets completed successfully!`);
  } catch (error) {
    console.error('❌ Auto-seed of Assets failed:', error);
  }
}
