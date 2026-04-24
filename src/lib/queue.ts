import { prisma } from "./db";

export type ResearchJob = {
  agentId: string;
  runId: string;
  reason: "manual" | "schedule";
};

export async function enqueueAgentRun(agentId: string, reason: "manual" | "schedule" = "manual") {
  const run = await prisma.agentRun.create({
    data: {
      agentId,
      status: "QUEUED",
      metadata: { reason },
    },
  });

  return run;
}
