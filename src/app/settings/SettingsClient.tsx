"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProviderCatalogEntry } from "@/lib/types";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  lastLoginAt: Date | null;
  createdAt: Date;
};

type CredentialRow = {
  id: string;
  provider: string;
  planType: string;
  label: string;
  maskedKeyPreview: string;
  baseUrl: string | null;
  modelOverrides: unknown;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
};

type TaskRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  instruction: string;
};

export function SettingsClient({
  users,
  credentials,
  tasks,
  providers,
}: {
  users: UserRow[];
  credentials: CredentialRow[];
  tasks: TaskRow[];
  providers: ProviderCatalogEntry[];
}) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [inviteUrl, setInviteUrl] = useState("");
  const [provider, setProvider] = useState<ProviderCatalogEntry["provider"]>(providers[0]?.provider ?? "OPENROUTER");
  const [planType, setPlanType] = useState(providers[0]?.planTypes[0] ?? "");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelOverrides, setModelOverrides] = useState("");
  const [taskName, setTaskName] = useState("");
  const [taskCategory, setTaskCategory] = useState("general");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskInstruction, setTaskInstruction] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const selectedProvider = useMemo(
    () => providers.find((entry) => entry.provider === provider) ?? providers[0],
    [providers, provider]
  );

  async function inviteUser() {
    setBusy("invite");
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Davet oluşturulamadı.");
      setInviteUrl(data.inviteUrl);
      setInviteEmail("");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Davet oluşturulamadı.");
    } finally {
      setBusy(null);
    }
  }

  async function addCredential() {
    setBusy("credential");
    try {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          planType,
          label,
          apiKey,
          baseUrl,
          modelOverrides,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "API key eklenemedi.");
      setLabel("");
      setApiKey("");
      setBaseUrl("");
      setModelOverrides("");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "API key eklenemedi.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteCredential(id: string) {
    setBusy(id);
    try {
      const response = await fetch(`/api/credentials/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "API key silinemedi.");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "API key silinemedi.");
    } finally {
      setBusy(null);
    }
  }

  async function addTask() {
    setBusy("task");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: taskName,
          category: taskCategory,
          description: taskDescription,
          instruction: taskInstruction,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Görev eklenemedi.");
      setTaskName("");
      setTaskCategory("general");
      setTaskDescription("");
      setTaskInstruction("");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Görev eklenemedi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="split-section" style={{ gridTemplateColumns: "1.1fr 0.9fr" }}>
      <div className="panel">
        <div className="panel-header">
          <h3>Kullanıcı Davetleri</h3>
          <span className="count">{users.length}</span>
        </div>

        <div className="settings-form-grid">
          <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="E-posta" />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            <option value="MANAGER">Manager</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <button className="run-btn" onClick={inviteUser} disabled={!inviteEmail || busy === "invite"}>
            Davet Oluştur
          </button>
        </div>

        {inviteUrl ? <p className="invite-link-box">{inviteUrl}</p> : null}

        <div style={{ marginTop: "1rem" }}>
          {users.map((user) => (
            <div className="run-item" key={user.id}>
              <span className="run-dot" style={{ background: "var(--accent)" }} />
              <div className="run-info" style={{ flex: 1 }}>
                <p className="run-agent">{user.name}</p>
                <p className="run-meta">{user.email} · {user.role}</p>
              </div>
              <span className="read-badge">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("tr-TR") : "İlk giriş bekleniyor"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>API Keys</h3>
          <span className="count">{credentials.length}</span>
        </div>

        <div className="settings-form-stack">
          <select
            value={provider}
            onChange={(e) => {
              const nextProvider = e.target.value as ProviderCatalogEntry["provider"];
              const match = providers.find((entry) => entry.provider === nextProvider);
              setProvider(nextProvider);
              setPlanType(match?.planTypes[0] ?? "");
            }}
          >
            {providers.map((entry) => (
              <option key={entry.provider} value={entry.provider}>
                {entry.label}
              </option>
            ))}
          </select>
          <select value={planType} onChange={(e) => setPlanType(e.target.value)}>
            {(selectedProvider?.planTypes ?? []).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Panel etiketi" />
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key" type="password" />
          {selectedProvider?.supportsCustomBaseUrl || selectedProvider?.defaultBaseUrl ? (
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={selectedProvider?.defaultBaseUrl || "Base URL"}
            />
          ) : null}
          <textarea
            value={modelOverrides}
            onChange={(e) => setModelOverrides(e.target.value)}
            placeholder="Ek model isimleri (her satıra bir model)"
            rows={4}
          />
          <button className="run-btn" onClick={addCredential} disabled={!label || !apiKey || busy === "credential"}>
            API Key Ekle
          </button>
        </div>

        <div style={{ marginTop: "1rem" }}>
          {credentials.map((credential) => (
            <div className="run-item" key={credential.id}>
              <span className="run-dot" style={{ background: "var(--accent)" }} />
              <div className="run-info" style={{ flex: 1 }}>
                <p className="run-agent">{credential.label}</p>
                <p className="run-meta">
                  {credential.provider} · {credential.planType} · {credential.maskedKeyPreview}
                </p>
              </div>
              <button
                className="bulk-delete-btn"
                onClick={() => deleteCredential(credential.id)}
                disabled={busy === credential.id}
              >
                Sil
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="panel-header">
          <h3>Görev Kütüphanesi</h3>
          <span className="count">{tasks.length}</span>
        </div>
        <div className="settings-form-grid settings-task-grid">
          <input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Görev adı" />
          <input value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)} placeholder="Kategori" />
          <input value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="Kısa açıklama" />
          <textarea
            value={taskInstruction}
            onChange={(e) => setTaskInstruction(e.target.value)}
            placeholder="Görev talimatı"
            rows={3}
          />
          <button className="run-btn" onClick={addTask} disabled={!taskName || !taskInstruction || busy === "task"}>
            Görev Ekle
          </button>
        </div>

        <div style={{ marginTop: "1rem" }}>
          {tasks.map((task) => (
            <div className="run-item" key={task.id}>
              <span className="run-dot" style={{ background: "var(--accent)" }} />
              <div className="run-info" style={{ flex: 1 }}>
                <p className="run-agent">{task.name}</p>
                <p className="run-meta">{task.category} · {task.description}</p>
                <p className="run-meta">{task.instruction}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
