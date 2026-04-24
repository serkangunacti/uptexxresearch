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

  // Trigger GitHub Actions workflow for background processing
  try {
    const githubToken = process.env.GITHUB_PAT;
    const githubRepo = process.env.GITHUB_REPO; // e.g. "username/repo"

    if (!githubToken || !githubRepo) {
      throw new Error("GITHUB_PAT veya GITHUB_REPO çevre değişkenleri eksik. Lütfen Vercel'e ekleyin.");
    }

    const response = await fetch(`https://api.github.com/repos/${githubRepo}/actions/workflows/agent-runner.yml/dispatches`, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": `token ${githubToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          agentId: agent.id,
          runId: run.id
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub Actions tetiklenemedi: ${response.statusText} - ${errorText}`);
    }

    return NextResponse.json({ 
      run: { ...run, status: "QUEUED" }, 
      message: "Görev GitHub Actions'a gönderildi. Birkaç dakika içinde tamamlanacak!" 
    });
  } catch (error) {
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
