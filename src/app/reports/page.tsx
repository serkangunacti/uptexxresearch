import { prisma } from "@/lib/db";
import { ReportListClient } from "./ReportListClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: { agent: { select: { name: true } } },
  });

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Tüm Raporlar</h1>
      </header>

      <ReportListClient reports={reports} />
    </div>
  );
}
