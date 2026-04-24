import { ensureAgents } from "../src/lib/agents";
import { prisma } from "../src/lib/db";

async function main() {
  await ensureAgents();
  console.log("Seeded agent registry.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
