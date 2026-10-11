import { PrismaClient } from '@prisma/client';
import { MASTER_ASSETS } from './assetSeedData';
import { mapSectorToThai } from '../services/yahooSearchService';

const prisma = new PrismaClient();

export async function seedAssetsIfEmpty() {
  try {
    const count = await prisma.asset.count();
    if (count === 0) {
      console.log('🌱 Table Asset is empty. Starting auto-seed...');

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
    }

    // Sanitize any existing English sector names to Thai
    await sanitizeExistingAssetSectors();

    // Sanitize and remove/merge any legacy .BK duplicate assets
    await sanitizeDuplicateBkAssets();
  } catch (error) {
    console.error('❌ Auto-seed / sanitize of Assets failed:', error);
  }
}

export async function sanitizeDuplicateBkAssets() {
  try {
    const bkAssets = await prisma.asset.findMany({
      where: {
        symbol: {
          endsWith: '.BK',
        },
      },
      include: {
        items: true,
      },
    });

    if (bkAssets.length === 0) {
      return;
    }

    console.log(`[sanitize] Found ${bkAssets.length} assets with .BK suffix in DB. Cleaning up...`);

    for (const bkAsset of bkAssets) {
      try {
        const current = await prisma.asset.findUnique({ where: { id: bkAsset.id } });
        if (!current) continue;

        const cleanSymbol = current.symbol.replace(/\.BK$/i, '').toUpperCase();
        if (cleanSymbol === current.symbol) continue;

        // Check if the clean asset already exists
        const cleanAsset = await prisma.asset.findUnique({
          where: { symbol: cleanSymbol },
        });

        if (cleanAsset && cleanAsset.id !== current.id) {
          // If there are portfolio items pointing to bkAsset, repoint them to cleanAsset
          await prisma.portfolioItem.updateMany({
            where: { assetId: current.id },
            data: { assetId: cleanAsset.id },
          });
          // Delete the duplicate .BK asset
          await prisma.asset.deleteMany({
            where: { id: current.id },
          });
          console.log(`[sanitize] Deleted duplicate ${current.symbol} (merged into ${cleanSymbol})`);
        } else if (!cleanAsset) {
          // No clean asset exists, rename symbol by stripping .BK
          await prisma.asset.updateMany({
            where: { id: current.id },
            data: {
              symbol: cleanSymbol,
            },
          });
          console.log(`[sanitize] Renamed ${current.symbol} -> ${cleanSymbol}`);
        }
      } catch (itemErr) {
        console.warn(`[sanitize] Error cleaning ${bkAsset.symbol}:`, (itemErr as Error).message);
      }
    }

    console.log(`✅ Finished sanitizing all .BK assets in database.`);
  } catch (error) {
    console.warn('⚠️ Sanitizing .BK assets failed:', error);
  }
}

export async function sanitizeExistingAssetSectors() {
  try {
    const assetsWithEnglishSectors = await prisma.asset.findMany({
      where: {
        sector: {
          not: null,
        },
      },
    });

    let updatedCount = 0;
    for (const a of assetsWithEnglishSectors) {
      if (a.sector && /[a-zA-Z]/.test(a.sector)) {
        const thaiSector = mapSectorToThai(a.sector, a.category === 'etf-bond' ? 'ETF' : 'EQUITY', a.name);
        if (thaiSector && thaiSector !== a.sector) {
          await prisma.asset.update({
            where: { id: a.id },
            data: { sector: thaiSector },
          });
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`✅ Converted ${updatedCount} asset sector names from English to Thai in database.`);
    }
  } catch (error) {
    console.warn('⚠️ Sanitizing existing asset sectors failed:', error);
  }
}
