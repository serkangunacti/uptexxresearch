import { prisma } from "../src/lib/db";
import { scheduleDueAgents } from "../src/lib/scheduler";

async function main() {
  const now = new Date();
  console.log(`Starting scheduled sweep at ${now.toISOString()}`);

  try {
    const results = await scheduleDueAgents(now);
    console.log(JSON.stringify({ ok: true, timestamp: now.toISOString(), results }, null, 2));
  } catch (error) {
    console.error("Scheduled sweep failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
