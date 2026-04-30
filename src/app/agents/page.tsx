import Link from "next/link";
import { getVisibleAgentsForUser } from "@/lib/access";
import { getCurrentUser } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import { RunButton } from "../RunButton";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  let agents: Awaited<ReturnType<typeof getVisibleAgentsForUser>> = [];
  let hasError = false;

  try {
    agents = await getVisibleAgentsForUser(session.user);
  } catch (error) {
    console.error("Agents page load failed:", error);
    hasError = true;
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <h1>Tüm Ajanlar</h1>
          {session.user.role === "OWNER_ADMIN" ? (
            <Link href="/agents/new" className="run-btn" style={{ textDecoration: "none" }}>
              Yeni Ajan
            </Link>
          ) : null}
        </div>
      </header>

      {hasError ? (
        <div className="panel" style={{ marginTop: "2rem" }}>
          <div className="panel-header">
            <h3>Ajanlar yüklenemedi</h3>
          </div>
          <p className="empty-state">Veritabanı bağlantısını ve tenant yetkilerini kontrol edin.</p>
        </div>
      ) : null}

      <div className="agents-grid" style={{ marginTop: "2rem" }}>
        {agents.map((agent) => {
          const isActive = agent.status === "ACTIVE";
          const lastRun = agent.runs[0];
          return (
            <div className="agent-card" key={agent.id}>
              <div className="agent-card-header">
                <Link href={`/agents/${agent.id}`} style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
                  <h2>{agent.name}</h2>
                </Link>
                <div className={`status-indicator ${isActive ? "active" : ""}`}>
                  <span className="dot"></span>
                  {isActive ? "Aktif" : "Pasif"}
                </div>
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
                    : "Henüz çalıştırılmadı"}
                </span>
                <RunButton agentId={agent.id} disabled={!isActive || !agent.credentialId || !agent.modelName} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
