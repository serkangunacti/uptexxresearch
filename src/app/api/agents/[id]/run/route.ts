import { NextResponse } from "next/server";
import { getAgentDefinition } from "@/lib/agent-definitions";
import { ensureAgents } from "@/lib/agents";
import { prisma } from "@/lib/db";
import { executeAgentRun } from "@/lib/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds is enough since Tavily+MiniMax is fast

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
      status: "RUNNING",
      metadata: { reason: "manual" },
    },
  });

  // Execute synchronously but with a 50s timeout safeguard
  // Vercel Hobby allows 60s. We timeout at 50s to safely update the DB to FAILED.
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("İşlem çok uzun sürdü (Zaman Aşımı). Lütfen tekrar deneyin.")), 50000)
    );

    const report = await Promise.race([
      executeAgentRun(agent.id, run.id),
      timeoutPromise
    ]) as any;

    return NextResponse.json({ 
      run: { ...run, status: "SUCCEEDED" }, 
      reportId: report.id,
      message: "Rapor başarıyla oluşturuldu!" 
    });
  } catch (error) {
    // Force mark as failed if timeout hit before Vercel kills us
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        metadata: { error: error instanceof Error ? error.message : "Bilinmeyen hata" }
      }
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ajan çalıştırılırken hata oluştu" },
      { status: 500 }
    );
  }
}
