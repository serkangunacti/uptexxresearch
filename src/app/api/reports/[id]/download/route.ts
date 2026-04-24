import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const report = await prisma.report.findUnique({
    where: { id },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Vercel serverless has no persistent filesystem — redirect to publicUrl
  if (report.publicUrl) {
    return NextResponse.redirect(report.publicUrl);
  }

  return NextResponse.json(
    { error: "PDF dosyası bulunamadı" },
    { status: 404 }
  );
}
