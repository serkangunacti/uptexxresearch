const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.reportFinding.deleteMany();
  await prisma.report.deleteMany();
  await prisma.agentRun.deleteMany();
  console.log("All runs and reports deleted successfully.");
}
main().finally(() => prisma.$disconnect());
