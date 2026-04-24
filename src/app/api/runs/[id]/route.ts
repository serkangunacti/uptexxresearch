import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    // Report is linked to AgentRun. If we delete the run, we should delete the report and its findings too.
    // Prisma cascade delete might not be configured, so we delete manually to be safe.
    await prisma.reportFinding.deleteMany({
      where: { report: { runId: id } }
    });
    
    await prisma.report.deleteMany({
      where: { runId: id }
    });

    await prisma.agentRun.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Görev başarıyla silindi." });
  } catch (error) {
    console.error("Delete run error:", error);
    return NextResponse.json(
      { error: "Görev silinirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
