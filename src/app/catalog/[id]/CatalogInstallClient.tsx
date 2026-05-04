"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InstallTemplate = {
  id: string;
  name: string;
  description: string;
  lifecycle: "ACTIVE" | "COMING_SOON" | "DRAFT";
  canInstall: boolean;
  accessible: boolean;
  requiredPackageName: string | null;
  taskBlueprints: {
    key?: string;
    name: string;
    category: string;
    description: string;
    instruction: string;
    defaultSelected?: boolean;
  }[];
  sourceCatalog: {
    key: string;
    label: string;
    description: string;
    defaultSelected?: boolean;
  }[];
  configSchema: {
    key: string;
    label: string;
    type: "text" | "textarea";
    placeholder?: string;
    helpText?: string;
    required?: boolean;
    defaultValue?: string;
  }[];
};

type CredentialRow = {
  id: string;
  label: string;
  provider: string;
  maskedKeyPreview: string;
  models: {
    id: string;
    label: string;
    billing: "free" | "paid";
  }[];
};

export function CatalogInstallClient({
  template,
  subscription,
  credentials,
}: {
  template: InstallTemplate;
  subscription: {
    packageName: string;
    allowsCustomAgentBuilder: boolean;
  };
  credentials: CredentialRow[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(template.name);
  const [credentialId, setCredentialId] = useState(credentials[0]?.id ?? "");
  const [selectedSourceKeys, setSelectedSourceKeys] = useState<string[]>(
    template.sourceCatalog.filter((item) => item.defaultSelected).map((item) => item.key)
  );
  const [selectedTaskKeys, setSelectedTaskKeys] = useState<string[]>(
    template.taskBlueprints
      .filter((item) => item.defaultSelected !== false)
      .map((item) => item.key || item.name)
  );
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(
    Object.fromEntries(template.configSchema.map((field) => [field.key, field.defaultValue || ""]))
  );

  const selectedCredential = useMemo(
    () => credentials.find((item) => item.id === credentialId) ?? null,
    [credentials, credentialId]
  );
  const [modelName, setModelName] = useState(selectedCredential?.models[0]?.id ?? "");

  async function install() {
    setSaving(true);
    try {
      const response = await fetch("/api/catalog/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          name,
          credentialId,
          modelName,
          config: {
            selectedSourceKeys,
            selectedTaskKeys,
            ...fieldValues,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ajan kurulamadı.");
      router.push(`/agents/${data.agentId}`);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ajan kurulamadı.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: "1.5rem" }}>
      <div className="panel-header">
        <h3>Kurulum</h3>
      </div>

      <div className="agent-editor-body">
        {!template.accessible ? (
          <div className="agent-section-box" style={{ marginBottom: "20px" }}>
            <h4>Bu ajan kilitli</h4>
            <p className="agent-section-copy" style={{ marginBottom: 0 }}>
              Şu an {subscription.packageName} paketindesin. Bu ajan için gereken paket: {template.requiredPackageName || "üst seviye"}.
            </p>
          </div>
        ) : null}

        {template.lifecycle === "COMING_SOON" ? (
          <div className="agent-section-box" style={{ marginBottom: "20px" }}>
            <h4>Yakında</h4>
            <p className="agent-section-copy" style={{ marginBottom: 0 }}>
              Bu ajan ikinci fazda aktive edilecek. Şimdilik kurulamaz.
            </p>
          </div>
        ) : null}

        <div className="agent-editor-grid">
          <div className="settings-form-stack">
            <div className="agent-form-field">
              <label>Ajan adı</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="agent-form-field">
              <label>API key</label>
              <select
                value={credentialId}
                onChange={(e) => {
                  const nextCredentialId = e.target.value;
                  const match = credentials.find((item) => item.id === nextCredentialId) ?? null;
                  setCredentialId(nextCredentialId);
                  setModelName(match?.models[0]?.id || "");
                }}
              >
                <option value="">API key seç</option>
                {credentials.map((credential) => (
                  <option key={credential.id} value={credential.id}>
                    {credential.label} · {credential.provider} · {credential.maskedKeyPreview}
                  </option>
                ))}
              </select>
            </div>

            <div className="agent-form-field">
              <label>Model</label>
              <select value={modelName} onChange={(e) => setModelName(e.target.value)} disabled={!selectedCredential}>
                <option value="">Model seç</option>
                {(selectedCredential?.models ?? []).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} {model.billing === "free" ? "(Ücretsiz)" : "(Ücretli)"}
                  </option>
                ))}
              </select>
            </div>

            {template.configSchema.map((field) => (
              <div className="agent-form-field" key={field.key}>
                <label>{field.label}</label>
                {field.type === "textarea" ? (
                  <textarea
                    value={fieldValues[field.key] || ""}
                    rows={4}
                    placeholder={field.placeholder}
                    onChange={(e) => setFieldValues((current) => ({ ...current, [field.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    value={fieldValues[field.key] || ""}
                    placeholder={field.placeholder}
                    onChange={(e) => setFieldValues((current) => ({ ...current, [field.key]: e.target.value }))}
                  />
                )}
                {field.helpText ? <small>{field.helpText}</small> : null}
              </div>
            ))}
          </div>

          <div className="settings-form-stack">
            {template.sourceCatalog.length > 0 ? (
              <div className="agent-section-box">
                <h4>Kaynaklar / Platformlar</h4>
                <div className="task-suggestion-list">
                  {template.sourceCatalog.map((source) => {
                    const selected = selectedSourceKeys.includes(source.key);
                    return (
                      <div key={source.key} className={`task-suggestion-card ${selected ? "selected" : ""}`}>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              setSelectedSourceKeys((current) =>
                                current.includes(source.key)
                                  ? current.filter((value) => value !== source.key)
                                  : [...current, source.key]
                              )
                            }
                          />
                          <span className="checkbox-text">{source.label}</span>
                        </label>
                        <p className="task-suggestion-copy">{source.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="agent-section-box">
              <h4>Görevler</h4>
              <div className="task-suggestion-list">
                {template.taskBlueprints.map((task) => {
                  const taskKey = task.key || task.name;
                  const selected = selectedTaskKeys.includes(taskKey);
                  return (
                    <div key={taskKey} className={`task-suggestion-card ${selected ? "selected" : ""}`}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setSelectedTaskKeys((current) =>
                              current.includes(taskKey)
                                ? current.filter((value) => value !== taskKey)
                                : [...current, taskKey]
                            )
                          }
                        />
                        <span className="checkbox-text">{task.name}</span>
                      </label>
                      <p className="task-suggestion-copy">{task.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="agent-editor-actions">
          <button
            type="button"
            className="run-btn"
            disabled={!template.canInstall || saving || !name.trim() || !credentialId || !modelName}
            onClick={install}
          >
            {saving ? "Kuruluyor..." : "Ajanı Kur"}
          </button>
        </div>
      </div>
    </div>
  );
}
