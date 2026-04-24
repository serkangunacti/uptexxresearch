import { executeAgentRun } from "./src/lib/runner";
import { prisma } from "./src/lib/db";

async function main() {
  const start = Date.now();
  console.log("Starting run...");
  
  // Create a mock run
  const run = await prisma.agentRun.create({
    data: {
      agentId: "research-tr",
      status: "RUNNING",
      metadata: { reason: "manual" },
    },
  });

  try {
    const report = await executeAgentRun("research-tr", run.id);
    console.log("Report generated successfully!");
  } catch (error) {
    console.error("Failed:", error);
  } finally {
    const end = Date.now();
    console.log(`Total execution time: ${(end - start) / 1000} seconds`);
    await prisma.$disconnect();
  }
}
main();
