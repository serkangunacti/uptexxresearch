import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        findings: { orderBy: { createdAt: "asc" } },
        agent: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });
    }

    // ── Workbook ────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();

    // Sheet 1: Özet
    const summaryData = [
      ["Rapor Başlığı", report.title],
      ["Ajan", report.agent.name],
      ["Tarih", report.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })],
      [],
      ["Özet"],
      [report.summary],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 20 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Özet");

    // Sheet 2: Bulgular
    if (report.findings.length > 0) {
      const header = ["#", "Tür", "Başlık", "İçerik", "Kaynak URL", "Skor"];
      const rows = report.findings.map((f, i) => [
        i + 1,
        f.kind,
        f.title,
        f.body,
        f.sourceUrl ?? "",
        f.score ?? "",
      ]);
      const wsFindings = XLSX.utils.aoa_to_sheet([header, ...rows]);
      wsFindings["!cols"] = [
        { wch: 4 },
        { wch: 16 },
        { wch: 36 },
        { wch: 80 },
        { wch: 40 },
        { wch: 6 },
      ];
      XLSX.utils.book_append_sheet(wb, wsFindings, "Bulgular");
    }

    // Write to buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const safeTitle = (report.title || "rapor")
      .replace(/[^a-z0-9\s-]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);

    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="rapor-${safeTitle}.xlsx"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (error) {
    console.error("Excel generation failed:", error);
    return NextResponse.json(
      { error: "Excel oluşturulurken hata meydana geldi." },
      { status: 500 }
    );
  }
}
