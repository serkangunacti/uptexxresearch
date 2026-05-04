"use client";

import { useEffect, useMemo, useState } from "react";
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

type TemplateTaskSeed = {
  name: string;
  category: string;
  description: string;
  instruction: string;
};

type TaskEditorState = {
  prompt: string;
  queries: string[];
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

const scheduleModes = [
  { id: "daily", label: "Her gün" },
  { id: "weekly", label: "Haftalık" },
  { id: "interval", label: "X günde bir" },
] as const;

type ScheduleMode = (typeof scheduleModes)[number]["id"];

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
  const [deleting, setDeleting] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(() => {
    if (agent.schedule.intervalDays && agent.schedule.intervalDays > 1) return "interval";
    if (agent.schedule.daysOfWeek.length > 0) return "weekly";
    return "daily";
  });
  const [taskEditors, setTaskEditors] = useState<Record<string, TaskEditorState>>({});

  const selectedCredential = useMemo(
    () => credentials.find((credential) => credential.id === form.credentialId) ?? null,
    [credentials, form.credentialId]
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === form.templateId) ?? null,
    [templates, form.templateId]
  );
  const templateTaskSeeds = useMemo(
    () => parseTemplateTasks(selectedTemplate?.defaultTasks),
    [selectedTemplate?.defaultTasks]
  );
  const suggestedTasks = useMemo(() => {
    if (!selectedTemplate) return [];
    return tasks.filter((task) =>
      templateTaskSeeds.some((seed) => seed.name === task.name && seed.category === task.category)
    );
  }, [selectedTemplate, tasks, templateTaskSeeds]);

  const canSave =
    !saving &&
    !deleting &&
    Boolean(form.templateId) &&
    Boolean(form.name.trim()) &&
    Boolean(form.credentialId) &&
    Boolean(form.modelName);

  useEffect(() => {
    if (!selectedTemplate) return;

    const fallbackPrompt = form.defaultPrompt || selectedTemplate.defaultPrompt || "";
    const fallbackQueries = form.searchQueries.length > 0 ? form.searchQueries : parseTemplateQueries(selectedTemplate.defaultQueries);

    setTaskEditors((current) => {
      const next = { ...current };

      for (const taskId of form.taskIds) {
        if (next[taskId]) continue;

        const task = suggestedTasks.find((item) => item.id === taskId);
        const taskSeed = templateTaskSeeds.find((seed) => seed.name === task?.name && seed.category === task?.category);

        next[taskId] = {
          prompt: [fallbackPrompt, taskSeed?.instruction ? `Görev odağı: ${taskSeed.instruction}` : ""].filter(Boolean).join("\n\n"),
          queries: fallbackQueries,
        };
      }

      return next;
    });
  }, [form.defaultPrompt, form.searchQueries, form.taskIds, selectedTemplate, suggestedTasks, templateTaskSeeds]);

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;

    const templateQueries = parseTemplateQueries(template.defaultQueries);
    const nextName = mode === "create" ? template.name : form.name || template.name;
    const nextSlug = slugify(nextName || template.name);

    setForm((current) => ({
      ...current,
      templateId,
      slug: nextSlug,
      name: current.name || template.name,
      description: current.description || template.description,
      defaultPrompt: current.defaultPrompt || template.defaultPrompt,
      searchQueries: current.searchQueries.length > 0 ? current.searchQueries : templateQueries,
      taskIds: [],
    }));
    setTaskEditors({});
  }

  function updateScheduleMode(nextMode: ScheduleMode) {
    setScheduleMode(nextMode);
    setForm((current) => ({
      ...current,
      schedule: {
        ...current.schedule,
        intervalDays: nextMode === "interval" ? current.schedule.intervalDays ?? 2 : null,
        daysOfWeek:
          nextMode === "weekly"
            ? current.schedule.daysOfWeek.length > 0
              ? current.schedule.daysOfWeek
              : [1]
            : [],
      },
    }));
  }

  function toggleTask(taskId: string) {
    const isSelected = form.taskIds.includes(taskId);
    setForm({
      ...form,
      taskIds: isSelected ? form.taskIds.filter((value) => value !== taskId) : [...form.taskIds, taskId],
    });
  }

  async function save() {
    setSaving(true);
    try {
      const selectedTaskEditors = form.taskIds
        .map((taskId) => taskEditors[taskId])
        .filter(Boolean);

      const mergedPrompt = selectedTaskEditors
        .map((editor) => editor.prompt.trim())
        .filter(Boolean)
        .join("\n\n---\n\n");

      const mergedQueries = Array.from(
        new Set(selectedTaskEditors.flatMap((editor) => editor.queries.map((query) => query.trim()).filter(Boolean)))
      );

      const payload = {
        templateId: form.templateId,
        slug: form.slug.trim() || slugify(form.name),
        name: form.name,
        description: form.description,
        defaultPrompt: mergedPrompt || form.defaultPrompt,
        searchQueries: mergedQueries.length > 0 ? mergedQueries : form.searchQueries,
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

      const response = await fetch(mode === "create" ? "/api/agents" : `/api/agents/${form.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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

  async function deleteAgent() {
    if (mode !== "edit" || !form.id) return;
    if (!window.confirm(`"${form.name}" ajanını silmek istediğine emin misin?`)) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/agents/${form.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ajan silinemedi.");
      router.push("/agents");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ajan silinemedi.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: "1.5rem" }}>
      <div className="panel-header">
        <h3>{mode === "create" ? "Yeni Ajan" : "Ajan Ayarları"}</h3>
      </div>

      <div className="agent-editor-body">
        <div className="agent-editor-grid">
        <div className="settings-form-stack">
          <div className="agent-form-field">
            <label>Şablon</label>
            <select value={form.templateId || ""} onChange={(e) => applyTemplate(e.target.value)} disabled={mode === "edit" || readOnly}>
              <option value="">Şablon seç</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="agent-form-field">
            <label>Ajan adı</label>
            <input
              value={form.name}
              onChange={(e) => {
                const nextName = e.target.value;
                setForm({
                  ...form,
                  name: nextName,
                  slug: slugify(nextName),
                });
              }}
              placeholder="Ajan adı"
              disabled={readOnly}
            />
            <small>Ajanı panelde bu isimle göreceksin.</small>
          </div>

          <div className="agent-form-field">
            <label>Kısa açıklama</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Açıklama"
              rows={3}
              disabled={readOnly}
            />
          </div>

          <div className="agent-form-field">
            <label>API key</label>
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
          </div>

          <div className="agent-form-field">
            <label>Model</label>
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
          </div>

          <div className="agent-form-field">
            <label>Durum</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={readOnly}>
              <option value="ACTIVE">Aktif</option>
              <option value="PAUSED">Pasif</option>
            </select>
          </div>
        </div>

        <div className="settings-form-stack">
          <div className="agent-section-box">
            <h4>Zamanlama</h4>
            <p className="agent-section-copy">Tek test için önce basit bir plan seçelim. Günlük, haftalık veya X günde bir çalıştırabilirsin.</p>

            <div className="schedule-mode-row">
              {scheduleModes.map((modeOption) => (
                <button
                  key={modeOption.id}
                  type="button"
                  className={`schedule-mode-chip ${scheduleMode === modeOption.id ? "active" : ""}`}
                  onClick={() => updateScheduleMode(modeOption.id)}
                  disabled={readOnly}
                >
                  {modeOption.label}
                </button>
              ))}
            </div>

            <div className="agent-schedule-grid">
              <div className="agent-form-field">
                <label>Saat dilimi</label>
                <select
                  value={form.schedule.timezone}
                  onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, timezone: e.target.value } })}
                  disabled={readOnly}
                >
                  <option value="Europe/Istanbul">Europe/Istanbul</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div className="agent-form-field">
                <label>Saat</label>
                <select
                  value={String(form.schedule.hour)}
                  onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, hour: Number(e.target.value) } })}
                  disabled={readOnly}
                >
                  {Array.from({ length: 24 }, (_, index) => (
                    <option key={index} value={index}>
                      {String(index).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="agent-form-field">
                <label>Dakika</label>
                <select
                  value={String(form.schedule.minute)}
                  onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, minute: Number(e.target.value) } })}
                  disabled={readOnly}
                >
                  {[0, 5, 10, 15, 20, 30, 45, 50, 55].map((minute) => (
                    <option key={minute} value={minute}>
                      {String(minute).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              {scheduleMode === "interval" ? (
                <div className="agent-form-field">
                  <label>Kaç günde bir</label>
                  <input
                    type="number"
                    value={form.schedule.intervalDays ?? 2}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        schedule: {
                          ...form.schedule,
                          intervalDays: Math.max(1, Number(e.target.value) || 1),
                        },
                      })
                    }
                    min={1}
                    placeholder="Örn. 2"
                    disabled={readOnly}
                  />
                </div>
              ) : null}
            </div>

            {scheduleMode === "weekly" ? (
              <div className="weekday-row">
                {weekdayOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`weekday-chip ${form.schedule.daysOfWeek.includes(option.value) ? "selected" : ""}`}
                    disabled={readOnly}
                    onClick={() => {
                      const exists = form.schedule.daysOfWeek.includes(option.value);
                      const nextDays = exists
                        ? form.schedule.daysOfWeek.filter((value) => value !== option.value)
                        : [...form.schedule.daysOfWeek, option.value];
                      setForm({
                        ...form,
                        schedule: {
                          ...form.schedule,
                          daysOfWeek: nextDays,
                        },
                      });
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="schedule-summary">
              {scheduleMode === "daily"
                ? `Her gün ${String(form.schedule.hour).padStart(2, "0")}:${String(form.schedule.minute).padStart(2, "0")}`
                : scheduleMode === "interval"
                  ? `${form.schedule.intervalDays ?? 2} günde bir ${String(form.schedule.hour).padStart(2, "0")}:${String(form.schedule.minute).padStart(2, "0")}`
                  : `Haftalık ${String(form.schedule.hour).padStart(2, "0")}:${String(form.schedule.minute).padStart(2, "0")}`}
            </div>
          </div>

          <div className="agent-section-box">
            <h4>Kurallar</h4>
            <p className="agent-section-copy">İlk test için varsayılan değerler yeterli. İstersen sonra toplu ayarları birlikte düzenleriz.</p>
            <div className="agent-rules-grid">
              <div className="agent-form-field">
                <label>Günlük çalışma limiti</label>
                <input
                  type="number"
                  value={form.rule.maxRunsPerDay}
                  onChange={(e) => setForm({ ...form, rule: { ...form.rule, maxRunsPerDay: Number(e.target.value) } })}
                  min={1}
                  disabled={readOnly}
                />
              </div>
              <div className="agent-form-field">
                <label>Haftalık çalışma limiti</label>
                <input
                  type="number"
                  value={form.rule.maxRunsPerWeek}
                  onChange={(e) => setForm({ ...form, rule: { ...form.rule, maxRunsPerWeek: Number(e.target.value) } })}
                  min={1}
                  disabled={readOnly}
                />
              </div>
              <div className="agent-form-field">
                <label>Kaynak yaşı sınırı</label>
                <input
                  type="number"
                  value={form.rule.maxSourceAgeDays}
                  onChange={(e) => setForm({ ...form, rule: { ...form.rule, maxSourceAgeDays: Number(e.target.value) } })}
                  min={1}
                  disabled={readOnly}
                />
                <small>Kaç günden eski kaynaklar dışarıda kalsın.</small>
              </div>
              <div className="agent-form-field">
                <label>Tekrar kontrol aralığı</label>
                <input
                  type="number"
                  value={form.rule.dedupeLookbackDays}
                  onChange={(e) => setForm({ ...form, rule: { ...form.rule, dedupeLookbackDays: Number(e.target.value) } })}
                  min={1}
                  disabled={readOnly}
                />
                <small>Aynı kaynağı kaç gün boyunca tekrar saymayalım.</small>
              </div>
            </div>
          </div>

          <div className="agent-section-box">
            <h4>Görevler</h4>
            <p className="agent-section-copy">Yalnızca seçtiğin şablona uygun görev önerileri gösterilir. Görevi seçtiğinde ona özel prompt ve sorgular açılır.</p>

            {!selectedTemplate ? (
              <div className="empty-state" style={{ padding: "18px 0 4px", textAlign: "left" }}>
                Önce bir şablon seç. Görev önerileri burada açılacak.
              </div>
            ) : suggestedTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: "18px 0 4px", textAlign: "left" }}>
                Bu şablon için görev önerisi bulunamadı.
              </div>
            ) : (
              <div className="task-suggestion-list">
                {suggestedTasks.map((task) => {
                  const isSelected = form.taskIds.includes(task.id);
                  const editor = taskEditors[task.id];

                  return (
                    <div key={task.id} className={`task-suggestion-card ${isSelected ? "selected" : ""}`}>
                      <label className="checkbox-label">
                        <input type="checkbox" checked={isSelected} disabled={readOnly} onChange={() => toggleTask(task.id)} />
                        <span className="checkbox-text">{task.name} · {task.category}</span>
                      </label>
                      <p className="task-suggestion-copy">{task.description}</p>

                      {isSelected && editor ? (
                        <div className="task-editor-box">
                          <div className="agent-form-field">
                            <label>{task.name} · Ana prompt</label>
                            <textarea
                              value={editor.prompt}
                              onChange={(e) =>
                                setTaskEditors((current) => ({
                                  ...current,
                                  [task.id]: { ...current[task.id], prompt: e.target.value },
                                }))
                              }
                              rows={5}
                              disabled={readOnly}
                            />
                          </div>

                          <div className="agent-form-field">
                            <label>{task.name} · Arama sorguları</label>
                            <textarea
                              value={editor.queries.join("\n")}
                              onChange={(e) =>
                                setTaskEditors((current) => ({
                                  ...current,
                                  [task.id]: {
                                    ...current[task.id],
                                    queries: e.target.value.split("\n").map((value) => value.trim()).filter(Boolean),
                                  },
                                }))
                              }
                              rows={4}
                              disabled={readOnly}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
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

        <div className="agent-editor-actions">
          {!readOnly && mode === "edit" ? (
            <button type="button" className="danger-btn" onClick={deleteAgent} disabled={saving || deleting}>
              {deleting ? "Siliniyor..." : "Ajanı Sil"}
            </button>
          ) : null}
          {!readOnly ? (
            <button type="button" className="run-btn" onClick={save} disabled={!canSave}>
              {saving ? "Kaydediliyor..." : mode === "create" ? "Ajanı Oluştur" : "Kaydet"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseTemplateTasks(input: unknown): TemplateTaskSeed[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => ({
      name: String((entry as TemplateTaskSeed).name || ""),
      category: String((entry as TemplateTaskSeed).category || ""),
      description: String((entry as TemplateTaskSeed).description || ""),
      instruction: String((entry as TemplateTaskSeed).instruction || ""),
    }))
    .filter((entry) => entry.name);
}

function parseTemplateQueries(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((value) => String(value)).filter(Boolean);
}
