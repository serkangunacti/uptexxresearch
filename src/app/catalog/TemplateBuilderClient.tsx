"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BuilderTask = {
  name: string;
  category: string;
  description: string;
  instruction: string;
};

type BuilderSource = {
  label: string;
  description: string;
  queryHint: string;
};

type TemplateBuilderClientProps = {
  title: string;
  description: string;
  endpoint: string;
  submitLabel: string;
  successPath: string;
  showVisibilityPackage?: boolean;
};

const weekdayOptions = [
  { value: 1, label: "Pzt" },
  { value: 2, label: "Sal" },
  { value: 3, label: "Car" },
  { value: 4, label: "Per" },
  { value: 5, label: "Cum" },
  { value: 6, label: "Cts" },
  { value: 0, label: "Paz" },
];

export function TemplateBuilderClient({
  title,
  description,
  endpoint,
  submitLabel,
  successPath,
  showVisibilityPackage = false,
}: TemplateBuilderClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("custom");
  const [summary, setSummary] = useState("");
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [defaultQueries, setDefaultQueries] = useState("");
  const [outputFindingKind, setOutputFindingKind] = useState("NEWS");
  const [requiredMetadataFields, setRequiredMetadataFields] = useState("");
  const [visibilityPackageKey, setVisibilityPackageKey] = useState("PREMIUM");
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [scheduleMode, setScheduleMode] = useState<"daily" | "weekly" | "interval">("daily");
  const [intervalDays, setIntervalDays] = useState(2);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [maxRunsPerDay, setMaxRunsPerDay] = useState(1);
  const [maxRunsPerWeek, setMaxRunsPerWeek] = useState(7);
  const [maxSourceAgeDays, setMaxSourceAgeDays] = useState(7);
  const [dedupeLookbackDays, setDedupeLookbackDays] = useState(7);
  const [tasks, setTasks] = useState<BuilderTask[]>([
    {
      name: "",
      category: "custom",
      description: "",
      instruction: "",
    },
  ]);
  const [sources, setSources] = useState<BuilderSource[]>([
    {
      label: "",
      description: "",
      queryHint: "",
    },
  ]);

  async function submit() {
    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          description: summary,
          defaultPrompt,
          defaultQueries,
          outputFindingKind,
          requiredMetadataFields,
          visibilityPackageKey,
          tasks: tasks.filter((task) => task.name.trim() && task.instruction.trim()),
          sources: sources.filter((source) => source.label.trim()),
          schedule: {
            timezone: "Europe/Istanbul",
            hour,
            minute,
            intervalDays: scheduleMode === "interval" ? intervalDays : null,
            daysOfWeek: scheduleMode === "weekly" ? daysOfWeek : [],
          },
          rule: {
            maxRunsPerDay,
            maxRunsPerWeek,
            maxSourceAgeDays,
            dedupeLookbackDays,
            preventDuplicates: true,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ajan şablonu kaydedilemedi.");
      router.push(successPath);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ajan şablonu kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: "1.5rem" }}>
      <div className="panel-header">
        <h3>{title}</h3>
      </div>

      <div className="agent-editor-body">
        <div className="agent-section-box" style={{ marginBottom: "20px" }}>
          <h4>{title}</h4>
          <p className="agent-section-copy">{description}</p>
        </div>

        <div className="agent-editor-grid">
          <div className="settings-form-stack">
            <div className="agent-form-field">
              <label>Ajan adı</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ornek: Regtech Haber Ajani" />
            </div>

            <div className="agent-form-field">
              <label>Kategori</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ornek: finance" />
            </div>

            <div className="agent-form-field">
              <label>Kısa açıklama</label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Bu ajan ne yapar?" />
            </div>

            <div className="agent-form-field">
              <label>Ana prompt</label>
              <textarea value={defaultPrompt} onChange={(e) => setDefaultPrompt(e.target.value)} rows={6} placeholder="Ajana verilecek ana yönlendirme" />
            </div>

            <div className="agent-form-field">
              <label>Varsayılan arama sorguları</label>
              <textarea
                value={defaultQueries}
                onChange={(e) => setDefaultQueries(e.target.value)}
                rows={5}
                placeholder="Her satıra bir arama sorgusu"
              />
            </div>

            <div className="agent-section-box">
              <h4>Görevler</h4>
              <div className="task-suggestion-list">
                {tasks.map((task, index) => (
                  <div key={index} className="task-suggestion-card selected">
                    <div className="settings-form-stack">
                      <div className="agent-form-field">
                        <label>Görev adı</label>
                        <input
                          value={task.name}
                          onChange={(e) =>
                            setTasks((current) =>
                              current.map((item, itemIndex) => (itemIndex === index ? { ...item, name: e.target.value } : item))
                            )
                          }
                        />
                      </div>
                      <div className="agent-form-field">
                        <label>Görev kategorisi</label>
                        <input
                          value={task.category}
                          onChange={(e) =>
                            setTasks((current) =>
                              current.map((item, itemIndex) => (itemIndex === index ? { ...item, category: e.target.value } : item))
                            )
                          }
                        />
                      </div>
                      <div className="agent-form-field">
                        <label>Açıklama</label>
                        <textarea
                          value={task.description}
                          rows={3}
                          onChange={(e) =>
                            setTasks((current) =>
                              current.map((item, itemIndex) => (itemIndex === index ? { ...item, description: e.target.value } : item))
                            )
                          }
                        />
                      </div>
                      <div className="agent-form-field">
                        <label>Talimat</label>
                        <textarea
                          value={task.instruction}
                          rows={4}
                          onChange={(e) =>
                            setTasks((current) =>
                              current.map((item, itemIndex) => (itemIndex === index ? { ...item, instruction: e.target.value } : item))
                            )
                          }
                        />
                      </div>
                    </div>

                    {tasks.length > 1 ? (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => setTasks((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          Görevi sil
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    setTasks((current) => [
                      ...current,
                      { name: "", category: category || "custom", description: "", instruction: "" },
                    ])
                  }
                >
                  Görev ekle
                </button>
              </div>
            </div>
          </div>

          <div className="settings-form-stack">
            <div className="agent-section-box">
              <h4>Kaynaklar</h4>
              <p className="agent-section-copy">Bu kaynaklar katalog kurulum ekranında seçilebilir hale gelir.</p>
              <div className="task-suggestion-list">
                {sources.map((source, index) => (
                  <div key={index} className="task-suggestion-card selected">
                    <div className="settings-form-stack">
                      <div className="agent-form-field">
                        <label>Kaynak adı</label>
                        <input
                          value={source.label}
                          onChange={(e) =>
                            setSources((current) =>
                              current.map((item, itemIndex) => (itemIndex === index ? { ...item, label: e.target.value } : item))
                            )
                          }
                        />
                      </div>
                      <div className="agent-form-field">
                        <label>Kısa açıklama</label>
                        <textarea
                          value={source.description}
                          rows={3}
                          onChange={(e) =>
                            setSources((current) =>
                              current.map((item, itemIndex) => (itemIndex === index ? { ...item, description: e.target.value } : item))
                            )
                          }
                        />
                      </div>
                      <div className="agent-form-field">
                        <label>Query notu</label>
                        <input
                          value={source.queryHint}
                          onChange={(e) =>
                            setSources((current) =>
                              current.map((item, itemIndex) => (itemIndex === index ? { ...item, queryHint: e.target.value } : item))
                            )
                          }
                          placeholder="Ornek: Reddit, LinkedIn, YouTube Shorts"
                        />
                      </div>
                    </div>

                    {sources.length > 1 ? (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => setSources((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          Kaynağı sil
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setSources((current) => [...current, { label: "", description: "", queryHint: "" }])}
                >
                  Kaynak ekle
                </button>
              </div>
            </div>

            <div className="agent-section-box">
              <h4>Zamanlama ve kurallar</h4>
              <div className="schedule-mode-row">
                <button type="button" className={`schedule-mode-chip ${scheduleMode === "daily" ? "active" : ""}`} onClick={() => setScheduleMode("daily")}>
                  Her gün
                </button>
                <button type="button" className={`schedule-mode-chip ${scheduleMode === "weekly" ? "active" : ""}`} onClick={() => setScheduleMode("weekly")}>
                  Haftalık
                </button>
                <button type="button" className={`schedule-mode-chip ${scheduleMode === "interval" ? "active" : ""}`} onClick={() => setScheduleMode("interval")}>
                  X günde bir
                </button>
              </div>

              <div className="agent-schedule-grid">
                <div className="agent-form-field">
                  <label>Saat</label>
                  <select value={String(hour)} onChange={(e) => setHour(Number(e.target.value))}>
                    {Array.from({ length: 24 }, (_, index) => (
                      <option key={index} value={index}>
                        {String(index).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="agent-form-field">
                  <label>Dakika</label>
                  <select value={String(minute)} onChange={(e) => setMinute(Number(e.target.value))}>
                    {[0, 5, 10, 15, 20, 30, 45, 50, 55].map((item) => (
                      <option key={item} value={item}>
                        {String(item).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>

                {scheduleMode === "interval" ? (
                  <div className="agent-form-field">
                    <label>Kaç günde bir</label>
                    <input type="number" min={1} value={intervalDays} onChange={(e) => setIntervalDays(Number(e.target.value) || 1)} />
                  </div>
                ) : null}
              </div>

              {scheduleMode === "weekly" ? (
                <div className="weekday-row" style={{ marginTop: "14px" }}>
                  {weekdayOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`weekday-chip ${daysOfWeek.includes(item.value) ? "selected" : ""}`}
                      onClick={() =>
                        setDaysOfWeek((current) =>
                          current.includes(item.value) ? current.filter((value) => value !== item.value) : [...current, item.value]
                        )
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="agent-rules-grid" style={{ marginTop: "18px" }}>
                <div className="agent-form-field">
                  <label>Günlük limit</label>
                  <input type="number" min={1} value={maxRunsPerDay} onChange={(e) => setMaxRunsPerDay(Number(e.target.value) || 1)} />
                </div>
                <div className="agent-form-field">
                  <label>Haftalık limit</label>
                  <input type="number" min={1} value={maxRunsPerWeek} onChange={(e) => setMaxRunsPerWeek(Number(e.target.value) || 1)} />
                </div>
                <div className="agent-form-field">
                  <label>Kaynak yaşı</label>
                  <input type="number" min={1} value={maxSourceAgeDays} onChange={(e) => setMaxSourceAgeDays(Number(e.target.value) || 1)} />
                </div>
                <div className="agent-form-field">
                  <label>Tekrar bakma</label>
                  <input type="number" min={1} value={dedupeLookbackDays} onChange={(e) => setDedupeLookbackDays(Number(e.target.value) || 1)} />
                </div>
              </div>
            </div>

            <div className="agent-section-box">
              <h4>Çıktı ayarı</h4>
              <div className="settings-form-stack">
                <div className="agent-form-field">
                  <label>Bulgu tipi</label>
                  <select value={outputFindingKind} onChange={(e) => setOutputFindingKind(e.target.value)}>
                    <option value="NEWS">NEWS</option>
                    <option value="LEAD">LEAD</option>
                    <option value="OPPORTUNITY">OPPORTUNITY</option>
                    <option value="MARKET_SIGNAL">MARKET_SIGNAL</option>
                    <option value="SYSTEM">SYSTEM</option>
                  </select>
                </div>

                <div className="agent-form-field">
                  <label>Zorunlu metadata alanları</label>
                  <textarea
                    value={requiredMetadataFields}
                    onChange={(e) => setRequiredMetadataFields(e.target.value)}
                    rows={4}
                    placeholder="Her satıra bir alan adı yaz"
                  />
                </div>

                {showVisibilityPackage ? (
                  <div className="agent-form-field">
                    <label>İlk açılacağı paket</label>
                    <select value={visibilityPackageKey} onChange={(e) => setVisibilityPackageKey(e.target.value)}>
                      <option value="FREE">FREE</option>
                      <option value="BASIC">BASIC</option>
                      <option value="PRO">PRO</option>
                      <option value="PREMIUM">PREMIUM</option>
                    </select>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="agent-editor-actions">
          <button
            type="button"
            className="run-btn"
            disabled={saving || !name.trim() || !defaultPrompt.trim()}
            onClick={submit}
          >
            {saving ? "Kaydediliyor..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
