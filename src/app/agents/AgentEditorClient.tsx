"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProviderModelOption } from "@/lib/types";

type TemplateRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultPrompt: string;
  defaultQueries: unknown;
  defaultTasks: unknown;
  defaultSchedule: unknown;
};

type TaskRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  instruction: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type CredentialRow = {
  id: string;
  label: string;
  provider: string;
  planType: string;
  maskedKeyPreview: string;
  models: ProviderModelOption[];
};

type AgentPayload = {
  id?: string;
  templateId?: string | null;
  slug: string;
  name: string;
  description: string;
  defaultPrompt: string;
  searchQueries: string[];
  status: string;
  modelProvider: string | null;
  modelName: string | null;
  credentialId: string | null;
  taskIds: string[];
  assignmentUserIds: string[];
  schedule: {
    timezone: string;
    hour: number;
    minute: number;
    intervalDays: number | null;
    daysOfWeek: number[];
    isActive: boolean;
  };
  rule: {
    preventDuplicates: boolean;
    maxRunsPerDay: number;
    maxRunsPerWeek: number;
    maxSourceAgeDays: number;
    dedupeLookbackDays: number;
  };
};

const weekdayOptions = [
  { value: 1, label: "Pzt" },
  { value: 2, label: "Sal" },
  { value: 3, label: "Çar" },
  { value: 4, label: "Per" },
  { value: 5, label: "Cum" },
  { value: 6, label: "Cts" },
  { value: 0, label: "Paz" },
];

export function AgentEditorClient({
  mode,
  agent,
  templates,
  tasks,
  users,
  credentials,
  canAssignUsers,
  readOnly = false,
}: {
  mode: "create" | "edit";
  agent: AgentPayload;
  templates: TemplateRow[];
  tasks: TaskRow[];
  users: UserRow[];
  credentials: CredentialRow[];
  canAssignUsers: boolean;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(agent);
  const [saving, setSaving] = useState(false);

  const selectedCredential = useMemo(
    () => credentials.find((credential) => credential.id === form.credentialId) ?? null,
    [credentials, form.credentialId]
  );

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    const templateQueries = Array.isArray(template.defaultQueries)
      ? template.defaultQueries.map((value) => String(value))
      : [];
    const templateTasks = Array.isArray(template.defaultTasks)
      ? template.defaultTasks
      : [];
    const defaultTaskIds = tasks
      .filter((task) => templateTasks.some((entry: any) => entry.name === task.name))
      .map((task) => task.id);

    setForm((current) => ({
      ...current,
      templateId,
      name: current.name || template.name,
      description: current.description || template.description,
      defaultPrompt: current.defaultPrompt || template.defaultPrompt,
      searchQueries: current.searchQueries.length > 0 ? current.searchQueries : templateQueries,
      taskIds: current.taskIds.length > 0 ? current.taskIds : defaultTaskIds,
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        templateId: form.templateId,
        slug: form.slug,
        name: form.name,
        description: form.description,
        defaultPrompt: form.defaultPrompt,
        searchQueries: form.searchQueries,
        status: form.status,
        modelProvider: form.modelProvider,
        modelName: form.modelName,
        credentialId: form.credentialId,
        taskIds: form.taskIds,
        assignmentUserIds: form.assignmentUserIds,
        timezone: form.schedule.timezone,
        hour: form.schedule.hour,
        minute: form.schedule.minute,
        intervalDays: form.schedule.intervalDays,
        daysOfWeek: form.schedule.daysOfWeek,
        scheduleActive: form.schedule.isActive,
        preventDuplicates: form.rule.preventDuplicates,
        maxRunsPerDay: form.rule.maxRunsPerDay,
        maxRunsPerWeek: form.rule.maxRunsPerWeek,
        maxSourceAgeDays: form.rule.maxSourceAgeDays,
        dedupeLookbackDays: form.rule.dedupeLookbackDays,
      };

      const response = await fetch(
        mode === "create" ? "/api/agents" : `/api/agents/${form.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ajan kaydedilemedi.");
      router.push(mode === "create" ? `/agents/${data.agentId}` : `/agents/${form.id}`);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ajan kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: "1.5rem" }}>
      <div className="panel-header">
        <h3>{mode === "create" ? "Yeni Ajan" : "Ajan Ayarları"}</h3>
      </div>

      <div className="agent-editor-grid">
        <div className="settings-form-stack">
          <select
            value={form.templateId || ""}
            onChange={(e) => applyTemplate(e.target.value)}
            disabled={mode === "edit" || readOnly}
          >
            <option value="">Şablon seç</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Slug" disabled={readOnly} />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ajan adı" disabled={readOnly} />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Açıklama"
            rows={3}
            disabled={readOnly}
          />
          <textarea
            value={form.defaultPrompt}
            onChange={(e) => setForm({ ...form, defaultPrompt: e.target.value })}
            placeholder="Ana prompt"
            rows={6}
            disabled={readOnly}
          />
          <textarea
            value={form.searchQueries.join("\n")}
            onChange={(e) => setForm({ ...form, searchQueries: e.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })}
            placeholder="Her satıra bir sorgu"
            rows={6}
            disabled={readOnly}
          />
          <select
            value={form.credentialId || ""}
            onChange={(e) => {
              const credentialId = e.target.value || null;
              const credential = credentials.find((item) => item.id === credentialId) ?? null;
              setForm({
                ...form,
                credentialId,
                modelProvider: credential?.provider || null,
                modelName: credential?.models[0]?.id || null,
              });
            }}
            disabled={readOnly}
          >
            <option value="">API key seç</option>
            {credentials.map((credential) => (
              <option key={credential.id} value={credential.id}>
                {credential.label} · {credential.provider} · {credential.maskedKeyPreview}
              </option>
            ))}
          </select>
          <select
            value={form.modelName || ""}
            onChange={(e) => setForm({ ...form, modelName: e.target.value || null })}
            disabled={!selectedCredential || readOnly}
          >
            <option value="">Model seç</option>
            {(selectedCredential?.models ?? []).map((model) => (
              <option key={model.id} value={model.id}>
                {model.label} {model.billing === "free" ? "(Ücretsiz)" : "(Ücretli)"}
              </option>
            ))}
          </select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={readOnly}>
            <option value="ACTIVE">Aktif</option>
            <option value="PAUSED">Pasif</option>
          </select>
        </div>

        <div className="settings-form-stack">
          <div className="agent-section-box">
            <h4>Zamanlama</h4>
            <div className="settings-form-grid">
              <input
                value={form.schedule.timezone}
                onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, timezone: e.target.value } })}
                placeholder="Timezone"
                disabled={readOnly}
              />
              <input
                type="number"
                value={form.schedule.hour}
                onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, hour: Number(e.target.value) } })}
                min={0}
                max={23}
                placeholder="Saat"
                disabled={readOnly}
              />
              <input
                type="number"
                value={form.schedule.minute}
                onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, minute: Number(e.target.value) } })}
                min={0}
                max={59}
                placeholder="Dakika"
                disabled={readOnly}
              />
              <input
                type="number"
                value={form.schedule.intervalDays ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    schedule: {
                      ...form.schedule,
                      intervalDays: e.target.value ? Number(e.target.value) : null,
                    },
                  })
                }
                min={1}
                placeholder="X günde bir"
                disabled={readOnly}
              />
            </div>
            <div className="weekday-row">
              {weekdayOptions.map((option) => (
                <label key={option.value} className="weekday-chip">
                  <input
                    type="checkbox"
                    checked={form.schedule.daysOfWeek.includes(option.value)}
                    disabled={readOnly}
                    onChange={() => {
                      const exists = form.schedule.daysOfWeek.includes(option.value);
                      setForm({
                        ...form,
                        schedule: {
                          ...form.schedule,
                          daysOfWeek: exists
                            ? form.schedule.daysOfWeek.filter((value) => value !== option.value)
                            : [...form.schedule.daysOfWeek, option.value],
                        },
                      });
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="agent-section-box">
            <h4>Kurallar</h4>
            <div className="settings-form-grid">
              <input
                type="number"
                value={form.rule.maxRunsPerDay}
                onChange={(e) => setForm({ ...form, rule: { ...form.rule, maxRunsPerDay: Number(e.target.value) } })}
                min={1}
                placeholder="Günlük limit"
                disabled={readOnly}
              />
              <input
                type="number"
                value={form.rule.maxRunsPerWeek}
                onChange={(e) => setForm({ ...form, rule: { ...form.rule, maxRunsPerWeek: Number(e.target.value) } })}
                min={1}
                placeholder="Haftalık limit"
                disabled={readOnly}
              />
              <input
                type="number"
                value={form.rule.maxSourceAgeDays}
                onChange={(e) => setForm({ ...form, rule: { ...form.rule, maxSourceAgeDays: Number(e.target.value) } })}
                min={1}
                placeholder="Kaynak yaş sınırı"
                disabled={readOnly}
              />
              <input
                type="number"
                value={form.rule.dedupeLookbackDays}
                onChange={(e) => setForm({ ...form, rule: { ...form.rule, dedupeLookbackDays: Number(e.target.value) } })}
                min={1}
                placeholder="Dedupe gün"
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="agent-section-box">
            <h4>Görevler</h4>
            <div className="task-choice-list">
              {tasks.map((task) => (
                <label key={task.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.taskIds.includes(task.id)}
                    disabled={readOnly}
                    onChange={() =>
                      setForm({
                        ...form,
                        taskIds: form.taskIds.includes(task.id)
                          ? form.taskIds.filter((value) => value !== task.id)
                          : [...form.taskIds, task.id],
                      })
                    }
                  />
                  <span className="checkbox-text">{task.name} · {task.category}</span>
                </label>
              ))}
            </div>
          </div>

          {canAssignUsers ? (
            <div className="agent-section-box">
              <h4>Manager Atamaları</h4>
              <div className="task-choice-list">
                {users
                  .filter((user) => user.role === "MANAGER")
                  .map((user) => (
                    <label key={user.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.assignmentUserIds.includes(user.id)}
                        disabled={readOnly}
                        onChange={() =>
                          setForm({
                            ...form,
                            assignmentUserIds: form.assignmentUserIds.includes(user.id)
                              ? form.assignmentUserIds.filter((value) => value !== user.id)
                              : [...form.assignmentUserIds, user.id],
                          })
                        }
                      />
                      <span className="checkbox-text">{user.name} · {user.email}</span>
                    </label>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
        {!readOnly ? (
          <button className="run-btn" onClick={save} disabled={saving || !form.slug || !form.name}>
            {saving ? "Kaydediliyor..." : mode === "create" ? "Ajanı Oluştur" : "Kaydet"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
