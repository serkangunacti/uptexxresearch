import { NextResponse, after } from "next/server";
import { getAgentDefinition } from "@/lib/agent-definitions";
import { ensureAgents } from "@/lib/agents";
import { prisma } from "@/lib/db";
import { executeAgentRun } from "@/lib/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureAgents();
  const { id } = await context.params;
  const agent = getAgentDefinition(id);

  if (!agent) {
    return NextResponse.json({ error: "Agent bulunamadı" }, { status: 404 });
  }

  if (agent.status === "PAUSED") {
    return NextResponse.json({ error: "Ajan pasif durumda" }, { status: 409 });
  }

  // Create run record
  const run = await prisma.agentRun.create({
    data: {
      agentId: agent.id,
      status: "QUEUED",
      metadata: { reason: "manual" },
    },
  });

  // Execute agent in the background AFTER response is sent
  after(async () => {
    try {
      await executeAgentRun(agent.id, run.id);
      console.log(`[agent] ${agent.name} completed successfully`);
    } catch (error) {
      console.error(`[agent] ${agent.name} failed:`, error);
    }
  });

  // Return immediately — don't wait for execution
  return NextResponse.json({ run, message: "Ajan çalıştırılıyor..." });
}
