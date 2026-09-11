import { prisma } from "../prisma";

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
    // Delete existing portfolio items so we can recreate them
    await prisma.portfolioItem.deleteMany({
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

  // Iterate over each asset and create portfolio items (DCA transactions)
  for (const [symbol, txns] of Object.entries(transactionsMap)) {
    // Find the asset id
    const asset = await prisma.asset.findUnique({ where: { symbol } });
    if (!asset) continue; // Skip if asset doesn't exist in our DB

    // Create individual transactions/items directly
    for (const t of txns) {
      const alloc = Number(t.allocation) || 0;
      if (alloc <= 0) continue;
      
      await prisma.portfolioItem.create({
        data: {
          portfolioId: portfolio.id,
          assetId: asset.id,
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
      items: {
        include: {
          asset: true,
        },
        orderBy: {
          buyDate: 'asc',
        },
      },
    },
  });

  // Transform it back to the map format expected by frontend
  const result: Record<string, Record<string, { allocation: string; buyDate: string }[]>> = {};

  for (const port of portfolios) {
    const txnsMap: Record<string, { allocation: string; buyDate: string }[]> = {};
    for (const item of port.items) {
      if (!txnsMap[item.asset.symbol]) {
        txnsMap[item.asset.symbol] = [];
      }
      txnsMap[item.asset.symbol].push({
        allocation: item.allocation.toString(),
        buyDate: item.buyDate.toISOString().split("T")[0],
      });
    }
    result[port.name] = txnsMap;
  }

  return result;
};

// Save Diary Score
export const saveDiaryScore = async (
  firebaseUid: string,
  evaluationType: string,
  periodKey: string,
  score: number,
  review: string
) => {
  const user = await getOrCreateUser(firebaseUid);

  return prisma.diaryScoreHistory.upsert({
    where: {
      userId_evaluationType_periodKey: {
        userId: user.id,
        evaluationType,
        periodKey,
      },
    },
    update: {
      score,
      review,
    },
    create: {
      userId: user.id,
      evaluationType,
      periodKey,
      score,
      review,
    },
  });
};

// Get Diary Scores
export const getDiaryScores = async (firebaseUid: string) => {
  const user = await getOrCreateUser(firebaseUid);

  const scores = await prisma.diaryScoreHistory.findMany({
    where: { userId: user.id },
  });

  return scores;
};

