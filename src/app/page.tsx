import Link from "next/link";
import { ensureAgents } from "@/lib/agents";
import { prisma } from "@/lib/db";
import { AGENT_DEFINITIONS } from "@/lib/agent-definitions";
import { RunButton } from "./RunButton";
import { DeleteRunButton } from "./DeleteRunButton";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  await ensureAgents();

  // Get agent order from definitions
  const definitionOrder = AGENT_DEFINITIONS.map((d) => d.id);

  const [agentsRaw, reports, runs, succeededCount] = await Promise.all([
    prisma.agent.findMany({
      include: {
        runs: { orderBy: { createdAt: "desc" }, take: 1 },
        reports: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { agent: true },
    }),
    prisma.agentRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { agent: true },
    }),
    prisma.agentRun.count({ where: { status: "SUCCEEDED" } }),
  ]);

  // Sort agents by definition order (stable)
  const agents = agentsRaw.sort((a, b) => {
    const ia = definitionOrder.indexOf(a.id);
    const ib = definitionOrder.indexOf(b.id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return { agents, reports, runs, succeededCount };
}

export default async function Home() {
  const { agents, reports, runs, succeededCount } = await getDashboardData();
  const activeAgents = agents.filter((a) => a.status === "ACTIVE").length;
  const latestReport = reports[0];

  const now = new Date();
  const timeStr = now.toLocaleString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="page-shell">
      <AutoRefresh intervalMs={5000} />
      {/* Page Header */}
      <header className="page-header">
        <p className="greeting">{timeStr}</p>
        <h1>
          Research <span>Automation</span>
        </h1>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card accent" style={{ "--i": 0 } as React.CSSProperties}>
          <p className="stat-label">Aktif Ajanlar</p>
          <p className="stat-value">{activeAgents}</p>
          <p className="stat-sub">{agents.length} toplam ajan</p>
        </div>
        <div className="stat-card" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="stat-label">Toplam Rapor</p>
          <p className="stat-value">{reports.length > 0 ? reports.length + "+" : "0"}</p>
          <p className="stat-sub">Veritabanında</p>
        </div>
        <div className="stat-card" style={{ "--i": 2 } as React.CSSProperties}>
          <p className="stat-label">Başarılı Çalışma</p>
          <p className="stat-value">{succeededCount}</p>
          <p className="stat-sub">Toplam tamamlanan</p>
        </div>
        <div className="stat-card" style={{ "--i": 3 } as React.CSSProperties}>
          <p className="stat-label">Son Rapor</p>
          <p className="stat-value" style={{ fontSize: "18px" }}>
            {latestReport ? latestReport.createdAt.toLocaleDateString("tr-TR") : "—"}
          </p>
          <p className="stat-sub">{latestReport ? latestReport.agent.name : "Henüz rapor yok"}</p>
        </div>
      </div>

      {/* Agents Section */}
      <section id="agents">
        <div className="section-heading">
          <h2>Ajanlar</h2>
          <span className="section-badge">{agents.length} ajan</span>
        </div>

        <div className="agents-grid">
          {agents.map((agent, index) => {
            const lastRun = agent.runs[0];
            const isActive = agent.status === "ACTIVE";

            return (
              <div
                className="agent-card"
                key={agent.id}
                style={{ "--i": index } as React.CSSProperties}
              >
                <div className="agent-card-header">
                  <Link href={`/agents/${agent.id}`} style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
                    <h3>{agent.name}</h3>
                  </Link>
                  <span className={`status-badge ${isActive ? "active" : "paused"}`}>
                    <span className="status-dot" />
                    {isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>

                <Link href={`/agents/${agent.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <p className="agent-desc">{agent.description}</p>
                </Link>

                <div className="agent-card-meta">
                  <span className="meta-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                    {agent.scheduleLabel}
                  </span>
                </div>

                <div className="agent-card-footer">
                  <span className="last-run-info">
                    {lastRun
                      ? `Son: ${lastRun.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`
                      : "Henüz çalıştırılmadı"}
                  </span>
                  <RunButton agentId={agent.id} disabled={!isActive} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Reports + Run Log */}
      <div className="split-section" id="reports">
        {/* Recent Reports */}
        <div className="panel">
          <div className="panel-header">
            <h3>Son Raporlar</h3>
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

        {/* Run Log */}
        <div className="panel" id="run-log">
          <div className="panel-header">
            <h3>Çalışma Geçmişi</h3>
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
    </div>
  );
}
