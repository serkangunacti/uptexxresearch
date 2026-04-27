"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AgentForm } from "../../components/AgentForm";

interface Agent {
  id: string;
  name: string;
  description: string;
  cadence: string;
  scheduleLabel: string;
  defaultPrompt: string;
  customPrompt?: string;
  customQueries?: string[];
  status: "ACTIVE" | "PAUSED";
  isCustom: boolean;
  reportRetentionDays: number;
  archiveOldReports: boolean;
  runs: Array<{ createdAt: Date; status: string }>;
  reports: Array<{ createdAt: Date; title: string }>;
  tasks: Array<{ title: string; status: string; createdAt: Date }>;
  aiConfigs: Array<{ provider: string; model: string; isActive: boolean }>;
  _count: {
    runs: number;
    reports: number;
    tasks: number;
  };
}

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAgent = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      const data = await response.json();
      setAgent(data.agent);
    } catch (error) {
      console.error("Failed to fetch agent:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  const handleSave = async (formData: any) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ajan güncellenemedi");
      }

      await fetchAgent();
      setEditing(false);
    } catch (error) {
      console.error("Agent update error:", error);
      alert(error instanceof Error ? error.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bu ajanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
      return;
    }

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ajan silinemedi");
      }

      window.location.href = "/agents";
    } catch (error) {
      console.error("Agent delete error:", error);
      alert(error instanceof Error ? error.message : "Bir hata oluştu");
    }
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

  if (!agent) {
    return (
      <div className="page-shell">
        <div className="text-white">Ajan bulunamadı</div>
      </div>
    );
  }

  const canEdit = agent.isCustom;
  const activeAIConfig = agent.aiConfigs.find(config => config.isActive);

  return (
    <div className="page-shell">
      <header className="page-header">
        <Link href="/agents" style={{ color: "var(--text-secondary)", textDecoration: "none", marginBottom: "1rem", display: "inline-block" }}>
          &larr; Ajanlara Dön
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1>{agent.name}</h1>
            <p className="greeting">{agent.description}</p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              {!editing && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Sil
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {editing && canEdit ? (
        <div className="panel" style={{ marginTop: "2rem" }}>
          <div className="panel-header">
            <h3>Ajanı Düzenle</h3>
          </div>
          <div style={{ padding: "2rem" }}>
            <AgentForm
              initialData={{
                name: agent.name,
                description: agent.description,
                cadence: agent.cadence,
                scheduleLabel: agent.scheduleLabel,
                defaultPrompt: agent.customPrompt || agent.defaultPrompt,
                queries: agent.customQueries || [], // TODO: Get from agent definition
                status: agent.status,
              }}
              onSubmit={handleSave}
              onCancel={() => setEditing(false)}
              isLoading={saving}
              submitLabel="Güncelle"
            />
          </div>
        </div>
      ) : (
        <>
          {/* Overview */}
          <div className="grid grid-cols-1 md-grid-cols-3 gap-6" style={{ marginTop: "2rem" }}>
            <div className="panel">
              <div className="panel-header">
                <h3>Durum</h3>
              </div>
              <div style={{ padding: "1.5rem" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${agent.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-white font-medium">
                    {agent.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  <div>Tür: {agent.isCustom ? 'Özel Ajan' : 'Sistem Ajanı'}</div>
                  <div>Zamanlama: {agent.scheduleLabel}</div>
                  <div>AI Model: {activeAIConfig ? `${activeAIConfig.provider} - ${activeAIConfig.model}` : 'Varsayılan'}</div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3>İstatistikler</h3>
              </div>
              <div style={{ padding: "1.5rem" }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{agent._count.runs}</div>
                    <div className="text-sm text-gray-400">Çalıştırma</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{agent._count.reports}</div>
                    <div className="text-sm text-gray-400">Rapor</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{agent._count.tasks}</div>
                    <div className="text-sm text-gray-400">Görev</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{agent.aiConfigs.length}</div>
                    <div className="text-sm text-gray-400">AI Yapılandırması</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3>Son Aktiviteler</h3>
              </div>
              <div style={{ padding: "1.5rem" }}>
                <div className="space-y-3">
                  {agent.runs.slice(0, 3).map((run, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">Çalıştırma</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        run.status === 'SUCCEEDED' ? 'bg-green-800 text-green-200' :
                        run.status === 'FAILED' ? 'bg-red-800 text-red-200' :
                        'bg-yellow-800 text-yellow-200'
                      }`}>
                        {run.status}
                      </span>
                    </div>
                  ))}
                  {agent.runs.length === 0 && (
                    <div className="text-gray-400 text-sm">Henüz çalıştırılmamış</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reports */}
          {agent.reports.length > 0 && (
            <div className="panel" style={{ marginTop: "2rem" }}>
              <div className="panel-header">
                <h3>Son Raporlar</h3>
              </div>
              <div style={{ padding: "1.5rem" }}>
                <div className="space-y-3">
                  {agent.reports.slice(0, 5).map((report, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-white">{report.title}</span>
                      <span className="text-gray-400 text-sm">
                        {report.createdAt.toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!canEdit && (
            <div className="panel" style={{ marginTop: "2rem" }}>
              <div className="panel-header">
                <h3>Bilgi</h3>
              </div>
              <div style={{ padding: "2rem" }}>
                <p className="text-gray-300">
                  Bu sistem ajanı düzenlenemez. Özel ajanlar oluşturmak için ana sayfaya dönün.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
