import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Silinecek öğe bulunamadı." }, { status: 400 });
    }

    // Delete reports and findings associated with these runs manually
    await prisma.reportFinding.deleteMany({
      where: { report: { runId: { in: ids } } }
    });
    
    await prisma.report.deleteMany({
      where: { runId: { in: ids } }
    });

    await prisma.agentRun.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({ success: true, message: `${ids.length} kayıt silindi.` });
  } catch (error) {
    console.error("Bulk delete runs error:", error);
    return NextResponse.json(
      { error: "Kayıtlar silinirken hata oluştu." },
      { status: 500 }
    );
  }
}
