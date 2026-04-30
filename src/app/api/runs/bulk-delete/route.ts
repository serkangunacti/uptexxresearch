import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const session = await requireUser("MANAGER");
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Silinecek öğe bulunamadı." }, { status: 400 });
    }

    // Delete reports and findings associated with these runs manually
    await prisma.reportFinding.deleteMany({
      where: { companyId: session.user.companyId, report: { runId: { in: ids } } }
    });
    
    await prisma.report.deleteMany({
      where: { companyId: session.user.companyId, runId: { in: ids } }
    });

    await prisma.agentRun.deleteMany({
      where: { companyId: session.user.companyId, id: { in: ids } }
    });

    return NextResponse.json({ success: true, message: `${ids.length} kayıt silindi.` });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Kayıtlar silinirken hata oluştu." },
      { status: 500 }
    );
  }
}
