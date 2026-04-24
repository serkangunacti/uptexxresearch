import Link from "next/link";
import { prisma } from "@/lib/db";
import { AGENT_DEFINITIONS } from "@/lib/agent-definitions";
import { RunButton } from "../RunButton";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const definitionOrder = AGENT_DEFINITIONS.map((d) => d.id);
  
  const agentsRaw = await prisma.agent.findMany({
    include: {
      runs: { orderBy: { createdAt: "desc" }, take: 1 },
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const agents = agentsRaw.sort((a, b) => {
    const ia = definitionOrder.indexOf(a.id);
    const ib = definitionOrder.indexOf(b.id);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Tüm Ajanlar</h1>
      </header>

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
    </div>
  );
}
