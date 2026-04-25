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
            <div className="run-item" key={report.id}>
              <div className="run-info" style={{ flex: 1 }}>
                <Link href={`/reports/${report.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <p className="run-agent">{report.agent.name}</p>
                  <p style={{ margin: "4px 0", color: "var(--text-primary)", fontWeight: 500 }}>{report.title}</p>
                  <p className="run-meta">{report.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>
                </Link>
              </div>
              <div className="run-actions">
                {report.runId && <DeleteRunButton runId={report.runId} />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
