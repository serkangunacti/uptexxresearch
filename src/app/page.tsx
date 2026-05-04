import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getVisibleAgentsForUser } from "@/lib/access";
import { getCurrentUser } from "@/lib/server-auth";
import { RunButton } from "./RunButton";
import { DeleteRunButton } from "./DeleteRunButton";
import { AutoRefresh } from "./AutoRefresh";
import type { SessionUser } from "@/lib/types";
import styles from "./emptyStates.module.css";

export const dynamic = "force-dynamic";

async function getDashboardData(user: SessionUser) {
  try {
    const [agents, reports, runs, succeededCount, credentialCount] = await Promise.all([
      getVisibleAgentsForUser(user),
      prisma.report.findMany({
        where: { companyId: user.companyId },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { agent: true, triggeredBy: true },
      }),
      prisma.agentRun.findMany({
        where: { companyId: user.companyId },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { agent: true, triggeredBy: true },
      }),
      prisma.agentRun.count({ where: { companyId: user.companyId, status: "SUCCEEDED" } }),
      prisma.apiCredential.count({ where: { companyId: user.companyId, isActive: true } }),
    ]);

    return { agents, reports, runs, succeededCount, credentialCount, hasError: false };
  } catch (error) {
    console.error("Dashboard data load failed:", error);
    return { agents: [], reports: [], runs: [], succeededCount: 0, credentialCount: 0, hasError: true };
  }
}

export default async function Home() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { agents, reports, runs, succeededCount, credentialCount, hasError } = await getDashboardData(session.user);
  const activeAgents = agents.filter((agent) => agent.status === "ACTIVE").length;
  const latestReport = reports[0];
  const showSetupGuide = session.user.role === "OWNER_ADMIN" && agents.length === 0;
  const setupSteps = [
    { label: "API key ekle", done: credentialCount > 0, href: "/settings" },
    { label: "Katalogu ac", done: false, href: "/catalog" },
    { label: "Ilk ajani kur", done: agents.length > 0, href: "/catalog" },
  ];

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
      <header className="page-header">
        <p className="greeting">{session.user.companyName} · {timeStr}</p>
        <h1>
          Research <span>Automation</span>
        </h1>
      </header>

      {hasError ? (
        <div className="panel" style={{ marginBottom: "24px" }}>
          <div className="panel-header">
            <h3>Dashboard verileri yuklenemedi</h3>
          </div>
          <p className="empty-state">Veritabani baglantisini ve tenant yetkilerini kontrol edin.</p>
        </div>
      ) : null}

      <div className="stats-grid">
        <div className="stat-card accent" style={{ "--i": 0 } as React.CSSProperties}>
          <p className="stat-label">Aktif Ajanlar</p>
          <p className="stat-value">{activeAgents}</p>
          <p className="stat-sub">{agents.length} toplam ajan</p>
        </div>
        <div className="stat-card" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="stat-label">Toplam Rapor</p>
          <p className="stat-value">{reports.length > 0 ? reports.length + "+" : "0"}</p>
          <p className="stat-sub">Tenant icinde</p>
        </div>
        <div className="stat-card" style={{ "--i": 2 } as React.CSSProperties}>
          <p className="stat-label">Basarili Calisma</p>
          <p className="stat-value">{succeededCount}</p>
          <p className="stat-sub">Toplam tamamlanan</p>
        </div>
        <div className="stat-card" style={{ "--i": 3 } as React.CSSProperties}>
          <p className="stat-label">Son Rapor</p>
          <p className="stat-value" style={{ fontSize: "18px" }}>
            {latestReport ? latestReport.createdAt.toLocaleDateString("tr-TR") : "—"}
          </p>
          <p className="stat-sub">{latestReport ? latestReport.agent.name : "Henuz rapor yok"}</p>
        </div>
      </div>

      {showSetupGuide ? (
        <section className={styles.setupPanel}>
          <div className={styles.setupPanelHeader}>
            <div>
              <p className={styles.setupKicker}>Ilk Kurulum</p>
              <h2>Ilk katalog ajanini kuralim</h2>
              <p className={styles.setupCopy}>Siradaki hedef tek API key, tek ajan ve tek manuel run.</p>
            </div>
            <Link href={credentialCount > 0 ? "/catalog" : "/settings"} className="run-btn">
              {credentialCount > 0 ? "Ajan Katalogunu Ac" : "Kuruluma Basla"}
            </Link>
          </div>

          <div className={styles.setupChecklist}>
            {setupSteps.map((step) => (
              <Link
                key={step.label}
                href={step.href}
                className={`${styles.setupStep} ${step.done ? styles.setupStepDone : ""}`}
              >
                <span className={styles.setupStepDot}>{step.done ? "✓" : "•"}</span>
                <span>{step.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

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
              <div className="agent-card" key={agent.id} style={{ "--i": index } as React.CSSProperties}>
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
                    {agent.scheduleLabel || agent.cadence || "Plan yok"}
                  </span>
                </div>

                <div className="agent-card-footer">
                  <span className="last-run-info">
                    {lastRun
                      ? `Son: ${lastRun.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`
                      : "Henuz calistirilmadi"}
                  </span>
                  <RunButton agentId={agent.id} disabled={!isActive || !agent.credentialId || !agent.modelName} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="split-section" id="reports">
        <div className="panel">
          <div className="panel-header">
            <h3>Son Raporlar</h3>
            <span className="count">{reports.length}</span>
          </div>
          {reports.length === 0 ? (
            <p className="empty-state">Henuz rapor olusmadi.</p>
          ) : (
            reports.map((report) => (
              <div className="run-item" key={report.id}>
                <span className="run-dot" style={{ background: "var(--accent)" }} />
                <div className="run-info" style={{ flex: 1 }}>
                  <Link href={`/reports/${report.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <p className="run-agent">{report.agent.name}</p>
                    <p style={{ margin: "4px 0", color: "var(--text-primary)", fontWeight: 500 }}>{report.title}</p>
                    <p className="run-meta">
                      {report.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                      {report.triggeredBy ? ` · ${report.triggeredBy.name}` : ""}
                    </p>
                  </Link>
                </div>
                <div className="run-actions">{report.runId && <DeleteRunButton runId={report.runId} />}</div>
              </div>
            ))
          )}
        </div>

        <div className="panel" id="run-log">
          <div className="panel-header">
            <h3>Calisma Gecmisi</h3>
            <span className="count">{runs.length}</span>
          </div>
          {runs.length === 0 ? (
            <p className="empty-state">Henuz calisma yok.</p>
          ) : (
            runs.map((run) => (
              <div className="run-item" key={run.id}>
                <span className={`run-dot ${run.status.toLowerCase()}`} />
                <div className="run-info">
                  <p className="run-agent">{run.agent.name}</p>
                  <p className="run-meta">
                    {run.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                    {run.triggeredBy ? ` · ${run.triggeredBy.name}` : ""}
                  </p>
                </div>
                <span className={`run-status-tag ${run.status.toLowerCase()}`}>{run.status}</span>
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
