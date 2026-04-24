import { prisma } from "@/lib/db";
import { DeleteRunButton } from "../DeleteRunButton";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await prisma.agentRun.findMany({
    orderBy: { createdAt: "desc" },
    include: { agent: true },
  });

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Tüm Çalışma Geçmişi</h1>
      </header>

      <div className="panel" style={{ marginTop: "2rem" }}>
        <div className="panel-header">
          <h3>Geçmiş</h3>
          <span className="count">{runs.length}</span>
        </div>
        {runs.length === 0 ? (
          <p className="empty-state">Henüz çalışma yok.</p>
        ) : (
          runs.map((run) => (
            <div className="run-item" key={run.id}>
              <span className={`run-dot ${run.status.toLowerCase()}`} />
              <div className="run-info">
                <p className="run-agent">{run.agent.name}</p>
                <p className="run-meta">{run.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>
              </div>
              <span className={`run-status-tag ${run.status.toLowerCase()}`}>
                {run.status}
              </span>
              <div className="run-actions">
                <DeleteRunButton runId={run.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
