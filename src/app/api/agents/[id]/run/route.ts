import { NextResponse } from "next/server";
import { getAgentDefinition } from "@/lib/agent-definitions";
import { ensureAgents } from "@/lib/agents";
import { prisma } from "@/lib/db";
import { dispatchAgentRun } from "@/lib/github-actions";

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

  const run = await prisma.agentRun.create({
    data: {
      agentId: agent.id,
      status: "QUEUED",
      metadata: { reason: "manual" },
    },
  });

  try {
    await dispatchAgentRun(agent.id, run.id);

    return NextResponse.json({
      run,
      message: "Görev GitHub Actions'a gönderildi. Birkaç dakika içinde tamamlanacak!",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: message,
        metadata: { reason: "manual", error: message },
      },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
