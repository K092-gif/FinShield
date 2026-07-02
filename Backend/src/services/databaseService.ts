import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper to get or create a user by firebaseUid
export const getOrCreateUser = async (firebaseUid: string) => {
  if (!firebaseUid || firebaseUid === "guest") {
    firebaseUid = "guest";
  }

  let user = await prisma.user.findUnique({
    where: { firebaseUid },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        firebaseUid,
        email: `${firebaseUid}@finshield.app`,
        name: "Guest User",
      },
    });
  }

  return user;
};

// Save a portfolio
export const savePortfolioToDb = async (
  firebaseUid: string,
  name: string,
  transactionsMap: Record<string, { allocation: string; buyDate: string }[]>
) => {
  const user = await getOrCreateUser(firebaseUid);

  // Check if portfolio with this name already exists for the user
  let portfolio = await prisma.portfolio.findFirst({
    where: { userId: user.id, name },
  });

  if (portfolio) {
    // Delete existing allocations and transactions so we can recreate them
    await prisma.portfolioAllocation.deleteMany({
      where: { portfolioId: portfolio.id },
    });
  } else {
    // Create new portfolio
    portfolio = await prisma.portfolio.create({
      data: {
        userId: user.id,
        name,
      },
    });
  }

  // Iterate over each asset and create allocations/transactions
  for (const [symbol, txns] of Object.entries(transactionsMap)) {
    // Find the asset id
    const asset = await prisma.asset.findUnique({ where: { symbol } });
    if (!asset) continue; // Skip if asset doesn't exist in our DB

    // Calculate total allocation percentage
    const totalAllocation = txns.reduce((sum, t) => sum + (Number(t.allocation) || 0), 0);
    
    if (totalAllocation <= 0) continue;

    // Create allocation
    const allocationRecord = await prisma.portfolioAllocation.create({
      data: {
        portfolioId: portfolio.id,
        assetId: asset.id,
        allocation: totalAllocation,
      },
    });

    // Create individual transactions
    for (const t of txns) {
      const alloc = Number(t.allocation) || 0;
      if (alloc <= 0) continue;
      
      await prisma.portfolioTransaction.create({
        data: {
          portfolioAllocationId: allocationRecord.id,
          allocation: alloc,
          buyDate: new Date(t.buyDate || new Date()),
        },
      });
    }
  }

  return portfolio;
};

// Get all portfolios for a user
export const getUserPortfolios = async (firebaseUid: string) => {
  const user = await getOrCreateUser(firebaseUid);

  const portfolios = await prisma.portfolio.findMany({
    where: { userId: user.id },
    include: {
      allocations: {
        include: {
          asset: true,
          transactions: true,
        },
      },
    },
  });

  // Transform it back to the map format expected by frontend
  const result: Record<string, Record<string, { allocation: string; buyDate: string }[]>> = {};

  for (const port of portfolios) {
    const txnsMap: Record<string, { allocation: string; buyDate: string }[]> = {};
    for (const alloc of port.allocations) {
      txnsMap[alloc.asset.symbol] = alloc.transactions.map((t) => ({
        allocation: t.allocation.toString(),
        buyDate: t.buyDate.toISOString().split("T")[0],
      }));
    }
    result[port.name] = txnsMap;
  }

  return result;
};

