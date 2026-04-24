import { executeAgentRun } from "../src/lib/runner";
import { prisma } from "../src/lib/db";

async function main() {
  const agentId = process.argv[2];
  const runId = process.argv[3];

  if (!agentId || !runId) {
    console.error("Usage: npx tsx github-runner.ts <agentId> <runId>");
    process.exit(1);
  }

  console.log(`Starting background job for agent: ${agentId}, runId: ${runId}`);
  try {
    const report = await executeAgentRun(agentId, runId);
    console.log(`Report generated successfully: ${report.id}`);
  } catch (error) {
    console.error("Agent execution failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
