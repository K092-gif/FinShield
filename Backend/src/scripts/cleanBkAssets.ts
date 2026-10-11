import { PrismaClient } from '@prisma/client';
import { sanitizeDuplicateBkAssets, sanitizeExistingAssetSectors } from '../utils/seedAssets';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Running database cleanup for .BK duplicates & English sectors...');
  await sanitizeDuplicateBkAssets();
  await sanitizeExistingAssetSectors();

  const totalAssets = await prisma.asset.count();
  const bkCount = await prisma.asset.count({
    where: { symbol: { endsWith: '.BK' } }
  });

  console.log(`📊 DB Status -> Total Assets: ${totalAssets}, Assets with .BK: ${bkCount}`);

  // Print top 20 assets for verification
  const sample = await prisma.asset.findMany({
    take: 20,
    orderBy: { id: 'asc' },
    select: { id: true, symbol: true, name: true, sector: true, category: true }
  });
  console.log('Sample Assets:', sample);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error running cleanBkAssets script:', e);
  process.exit(1);
});
