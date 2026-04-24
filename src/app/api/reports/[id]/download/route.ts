import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import PDFDocument from "pdfkit";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        findings: true,
        agent: true
      }
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Generate PDF in memory
    const doc = new PDFDocument({ margin: 50 });
    
    // We will collect PDF data in an array of buffers to return as Response
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Add content
    doc.fontSize(24).text(report.title || "Arastirma Raporu", { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('gray').text(`Ajan: ${report.agent.name}`, { align: 'center' });
    doc.fillColor('gray').text(`Tarih: ${report.createdAt.toLocaleString("tr-TR")}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).fillColor('black').text("Ozet:", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(report.summary || "Ozet bulunamadi.", { align: 'justify' });
    doc.moveDown(2);

    doc.fontSize(14).text("Bulgular:", { underline: true });
    doc.moveDown();

    report.findings.forEach((finding, i) => {
      doc.fontSize(13).fillColor('blue').text(`${i + 1}. ${finding.title}`);
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor('gray').text(`Tur: ${finding.kind} | Skor: ${finding.score || 'N/A'}`);
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('black').text(finding.body, { align: 'justify' });
      
      if (finding.sourceUrl) {
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('blue').text(`Kaynak: ${finding.sourceUrl}`, { link: finding.sourceUrl });
      }
      doc.moveDown(1.5);
    });

    doc.end();

    const pdfBuffer = await pdfPromise;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rapor-${report.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json({ error: "PDF olusturulurken hata meydana geldi." }, { status: 500 });
  }
}
