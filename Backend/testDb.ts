import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const portfolios = await prisma.portfolio.findMany({ include: { allocations: true } });
  const simulations = await prisma.simulation.findMany();
  
  console.log("Users:", users.length);
  console.log("Portfolios:", portfolios.length);
  console.log("Simulations:", simulations.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
