import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Silinecek öğe bulunamadı." }, { status: 400 });
    }

    // Delete associated findings first
    await prisma.reportFinding.deleteMany({
      where: { reportId: { in: ids } }
    });

    // Delete reports
    await prisma.report.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({ success: true, message: `${ids.length} rapor silindi.` });
  } catch (error) {
    console.error("Bulk delete reports error:", error);
    return NextResponse.json(
      { error: "Raporlar silinirken hata oluştu." },
      { status: 500 }
    );
  }
}
