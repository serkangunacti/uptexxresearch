import { ensureSystemData } from "../src/lib/agents";
import { prisma } from "../src/lib/db";

async function main() {
  const { company, owner } = await ensureSystemData();
  console.log(`Seeded company ${company.name} with owner ${owner.email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
