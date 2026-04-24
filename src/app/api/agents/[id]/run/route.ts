import { NextResponse } from "next/server";
import { getAgentDefinition } from "@/lib/agent-definitions";
import { ensureAgents } from "@/lib/agents";
import { prisma } from "@/lib/db";
import { executeAgentRun } from "@/lib/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel serverless timeout (seconds)

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

  // Execute agent (search + AI + report)
  try {
    const report = await executeAgentRun(agent.id, run.id);
    return NextResponse.json({ run: { ...run, status: "SUCCEEDED" }, reportId: report.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ajan çalıştırılırken hata oluştu" },
      { status: 500 }
    );
  }
}
