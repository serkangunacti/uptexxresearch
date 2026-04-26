import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import PDFDocument from "pdfkit";

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

    // --- Build PDF in memory ---
    const doc = new PDFDocument({ margin: 56, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── Header ──────────────────────────────────────────────
      doc
        .fontSize(22)
        .fillColor("#1a1a2e")
        .text(report.title || "Araştırma Raporu", { align: "center" });
      doc.moveDown(0.4);

      doc
        .fontSize(11)
        .fillColor("#666")
        .text(`Ajan: ${report.agent.name}`, { align: "center" });
      doc
        .fontSize(11)
        .fillColor("#666")
        .text(
          `Tarih: ${report.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`,
          { align: "center" }
        );
      doc.moveDown(2);

      // ── Summary ─────────────────────────────────────────────
      doc
        .fontSize(14)
        .fillColor("#222")
        .text("Özet", { underline: true });
      doc.moveDown(0.4);
      doc
        .fontSize(12)
        .fillColor("#333")
        .text(report.summary || "Özet bulunamadı.", { align: "justify" });
      doc.moveDown(2);

      // ── Findings ────────────────────────────────────────────
      if (report.findings.length > 0) {
        doc
          .fontSize(14)
          .fillColor("#222")
          .text("Bulgular", { underline: true });
        doc.moveDown();

        report.findings.forEach((finding, i) => {
          doc
            .fontSize(13)
            .fillColor("#2d2d8e")
            .text(`${i + 1}. ${finding.title}`);
          doc.moveDown(0.2);

          doc
            .fontSize(10)
            .fillColor("#777")
            .text(
              `Tür: ${finding.kind}${finding.score != null ? ` · Skor: ${finding.score}` : ""}`
            );
          doc.moveDown(0.4);

          doc
            .fontSize(11)
            .fillColor("#333")
            .text(finding.body || "", { align: "justify" });

          if (finding.sourceUrl) {
            doc.moveDown(0.4);
            doc
              .fontSize(10)
              .fillColor("#1a6bc7")
              .text(`Kaynak: ${finding.sourceUrl}`, {
                link: finding.sourceUrl,
                underline: true,
              });
          }
          doc.moveDown(1.5);
        });
      }

      doc.end();
    });

    // Return as inline PDF so browser opens it in a new tab
    const safeTitle = (report.title || "rapor")
      .replace(/[^a-z0-9\s-]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // inline → opens in browser tab; use attachment to force download
        "Content-Disposition": `inline; filename="rapor-${safeTitle}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      { error: "PDF oluşturulurken hata meydana geldi." },
      { status: 500 }
    );
  }
}
