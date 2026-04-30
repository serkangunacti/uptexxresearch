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

    // Delete associated findings first
    await prisma.reportFinding.deleteMany({
      where: { reportId: { in: ids }, companyId: session.user.companyId }
    });

    // Delete reports
    await prisma.report.deleteMany({
      where: { id: { in: ids }, companyId: session.user.companyId }
    });

    return NextResponse.json({ success: true, message: `${ids.length} rapor silindi.` });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Raporlar silinirken hata oluştu." },
      { status: 500 }
    );
  }
}
