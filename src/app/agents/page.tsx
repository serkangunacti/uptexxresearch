"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RunButton } from "../RunButton";
import { AgentCreationModal } from "../components/AgentCreationModal";

interface Agent {
  id: string;
  name: string;
  description: string;
  status: string;
  scheduleLabel: string;
  isCustom: boolean;
  runs: Array<{ createdAt: Date }>;
  reports: Array<{ createdAt: Date }>;
  _count?: {
    tasks: number;
    aiConfigs: number;
  };
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/agents");
      const data = await response.json();
      setAgents(data.agents);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateSuccess = () => {
    fetchAgents();
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex justify-center items-center h-64">
          <div className="text-white">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="flex justify-between items-center">
          <h1>Tüm Ajanlar</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + Yeni Ajan
          </button>
        </div>
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
                <div className="flex items-center gap-2">
                  <div className={`status-indicator ${isActive ? "active" : ""}`}>
                    <span className="dot"></span>
                    {isActive ? "Aktif" : "Pasif"}
                  </div>
                  {agent.isCustom && (
                    <span className="custom-badge">Özel</span>
                  )}
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
                {agent.isCustom && (
                  <span className="meta-badge custom">
                    Özel
                  </span>
                )}
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

      <AgentCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
