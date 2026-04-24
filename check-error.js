const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestRun = await prisma.agentRun.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log("Latest Error:", latestRun?.metadata?.error || "No error found in DB");
}

main().catch(console.error).finally(() => prisma.$disconnect());
