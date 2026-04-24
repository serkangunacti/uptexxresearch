import Link from "next/link";
import { prisma } from "@/lib/db";
import { DeleteRunButton } from "../DeleteRunButton";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: { agent: true },
  });

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Tüm Raporlar</h1>
      </header>

      <div className="panel" style={{ marginTop: "2rem" }}>
        <div className="panel-header">
          <h3>Rapor Arşivi</h3>
          <span className="count">{reports.length}</span>
        </div>
        {reports.length === 0 ? (
          <p className="empty-state">Henüz rapor oluşmadı.</p>
        ) : (
          reports.map((report) => (
            <div className="report-item-wrapper" key={report.id} style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border-color)", padding: "12px 0" }}>
              <Link href={`/reports/${report.id}`} className="report-item" style={{ flex: 1, textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "12px" }}>
                <span className="report-agent">{report.agent.name}</span>
                <span className="report-title">{report.title}</span>
                <span className="report-date" style={{ marginLeft: "auto", color: "gray" }}>
                  {report.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                </span>
              </Link>
              <div className="report-actions" style={{ paddingLeft: "12px" }}>
                {report.runId && <DeleteRunButton runId={report.runId} />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
