import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ReportListClient } from "./ReportListClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  let reports: Prisma.ReportGetPayload<{
    include: { agent: { select: { name: true } } };
  }>[] = [];
  let hasError = false;

  try {
    reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      include: { agent: { select: { name: true } } },
    });
  } catch (error) {
    console.error("Reports page load failed:", error);
    hasError = true;
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Tüm Raporlar</h1>
      </header>

      {hasError ? (
        <div className="panel" style={{ marginTop: "2rem" }}>
          <div className="panel-header">
            <h3>Raporlar yüklenemedi</h3>
          </div>
          <p className="empty-state">Veritabanı bağlantısını ve Vercel ortam değişkenlerini kontrol edin.</p>
        </div>
      ) : null}

      <ReportListClient reports={reports} />
    </div>
  );
}
