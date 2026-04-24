const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Fetch latest 3 runs to see the error
  const runs = await prisma.agentRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log("Latest runs:", JSON.stringify(runs, null, 2));

  // Delete all agent runs and reports to clean up the dashboard
  await prisma.reportFinding.deleteMany();
  await prisma.report.deleteMany();
  await prisma.agentRun.deleteMany();
  console.log("All previous runs and reports cleared.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
