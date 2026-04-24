import { NextResponse } from "next/server";
import { getAgentDefinition } from "@/lib/agent-definitions";
import { ensureAgents } from "@/lib/agents";
import { enqueueAgentRun } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureAgents();
  const { id } = await context.params;
  const agent = getAgentDefinition(id);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (agent.status === "PAUSED") {
    return NextResponse.json({ error: "Agent is paused" }, { status: 409 });
  }

  const run = await enqueueAgentRun(agent.id, "manual");
  return NextResponse.json({ run });
}
