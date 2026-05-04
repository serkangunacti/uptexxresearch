import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAgentForUser } from "@/lib/access";
import { resolveCredentialForAgent } from "@/lib/credentials";
import { requireUser } from "@/lib/server-auth";
import { executeAgentRun } from "@/lib/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser("MANAGER");
    const { id } = await context.params;
    const agent = await getAgentForUser(session.user, id, "manage");

    if (agent.status === "PAUSED") {
      return NextResponse.json({ error: "Ajan pasif durumda" }, { status: 409 });
    }

    if (!agent.credentialId || !agent.modelName) {
      return NextResponse.json(
        { error: "Araştırma başlatmak için önce bu ajan için API key ve model seçmelisiniz." },
        { status: 409 }
      );
    }

    try {
      await resolveCredentialForAgent({
        companyId: session.user.companyId,
        credentialId: agent.credentialId,
        modelName: agent.modelName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "API key doğrulanamadı.";
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const run = await prisma.agentRun.create({
      data: {
        companyId: session.user.companyId,
        agentId: agent.id,
        triggeredByUserId: session.user.id,
        status: "QUEUED",
        metadata: { reason: "manual" },
      },
    });

    const report = await executeAgentRun(agent.id, run.id);
    return NextResponse.json({
      runId: run.id,
      reportId: report.id,
      message: "Ajan çalıştırıldı ve rapor oluşturuldu.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "FORBIDDEN" || error.message === "NOT_FOUND")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sunucu hatası" }, { status: 500 });
  }
}
