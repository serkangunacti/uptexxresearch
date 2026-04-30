import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/server-auth";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser("MANAGER");
    const { id } = await context.params;

    // Report is linked to AgentRun. If we delete the run, we should delete the report and its findings too.
    // Prisma cascade delete might not be configured, so we delete manually to be safe.
    await prisma.reportFinding.deleteMany({
      where: { companyId: session.user.companyId, report: { runId: id } }
    });
    
    await prisma.report.deleteMany({
      where: { companyId: session.user.companyId, runId: id }
    });

    await prisma.agentRun.deleteMany({
      where: { companyId: session.user.companyId, id }
    });

    return NextResponse.json({ success: true, message: "Görev başarıyla silindi." });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Görev silinirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
