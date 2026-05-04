"use client";

import { useMemo, useState } from "react";
import type { ProviderCatalogEntry } from "@/lib/types";
import styles from "./settings.module.css";

type CredentialRow = {
  id: string;
  provider: ProviderCatalogEntry["provider"];
  planType: string;
  label: string;
  maskedKeyPreview: string;
  baseUrl: string | null;
  isActive: boolean;
  lastUsedAt: Date | string | null;
};

export function SettingsClient({
  credentials,
  providers,
}: {
  credentials: CredentialRow[];
  providers: ProviderCatalogEntry[];
}) {
  const [provider, setProvider] = useState<ProviderCatalogEntry["provider"]>(providers[0]?.provider ?? "OPENROUTER");
  const [planType, setPlanType] = useState(providers[0]?.planTypes[0] ?? "");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelOverrides, setModelOverrides] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [showAdvancedCredential, setShowAdvancedCredential] = useState(false);

  const selectedProvider = useMemo(
    () => providers.find((entry) => entry.provider === provider) ?? providers[0],
    [providers, provider]
  );
  const providerMap = useMemo(
    () => new Map(providers.map((entry) => [entry.provider, entry])),
    [providers]
  );

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
      setShowAdvancedCredential(false);
      window.location.reload();
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
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "API key silinemedi.");
    } finally {
      setBusy(null);
    }
  }

  function formatDate(value: Date | string | null) {
    if (!value) return "Henüz kullanılmadı";
    return new Date(value).toLocaleDateString("tr-TR");
  }

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div>
          <p className={styles.heroKicker}>Ayarlar</p>
          <h2>Sadece API key yönetimi</h2>
          <p className={styles.heroCopy}>Bu ekranda yalnızca provider key ekleme ve mevcut keyleri yönetme alanları yer alır.</p>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionBar}>
          <div>
            <h3>Yeni API Key</h3>
            <p>Temel kullanımda sadece provider, plan, görünen ad ve key doldurman yeterli.</p>
          </div>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formIntro}>
            <p className={styles.formIntroTitle}>Hızlı ekleme</p>
            <p className={styles.formIntroText}>Önce temel alanları doldur. Gelişmiş ayarlar sadece özel bir endpoint ya da ek model adı gerekiyorsa kullanılmalı.</p>
          </div>

          <div className={`${styles.fieldGrid} ${styles.fieldGridTwo}`}>
            <label className={styles.field}>
              <span>Provider</span>
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
            </label>

            <label className={styles.field}>
              <span>Plan</span>
              <select value={planType} onChange={(e) => setPlanType(e.target.value)}>
                {(selectedProvider?.planTypes ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Görünen ad</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Örnek: OpenRouter Ana Hesap" />
              <small className={styles.fieldHelp}>Bu isim sadece panelde görünür.</small>
            </label>

            <label className={styles.field}>
              <span>API key</span>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." type="password" />
              <small className={styles.fieldHelp}>Anahtar güvenli şekilde saklanır.</small>
            </label>
          </div>

          <div className={styles.advancedToggleRow}>
            <button type="button" className={styles.secondaryBtn} onClick={() => setShowAdvancedCredential((current) => !current)}>
              {showAdvancedCredential ? "Gelişmiş ayarları gizle" : "Gelişmiş ayarları göster"}
            </button>
          </div>

          {showAdvancedCredential ? (
            <div className={styles.advancedArea}>
              {(selectedProvider?.supportsCustomBaseUrl || selectedProvider?.defaultBaseUrl) ? (
                <label className={styles.field}>
                  <span>Özel bağlantı adresi</span>
                  <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={selectedProvider?.defaultBaseUrl || "Base URL"}
                  />
                  <small className={styles.fieldHelp}>Sadece özel bir endpoint kullanıyorsan doldur. Normalde boş kalır.</small>
                </label>
              ) : null}

              <label className={styles.field}>
                <span>Ek model adları</span>
                <textarea
                  value={modelOverrides}
                  onChange={(e) => setModelOverrides(e.target.value)}
                  placeholder="Her satıra bir model adı"
                  rows={4}
                />
                <small className={styles.fieldHelp}>Sadece listede olmayan bir modeli elle eklemek için kullanılır.</small>
              </label>
            </div>
          ) : null}

          <div className={styles.cardActions}>
            <button className="run-btn" onClick={addCredential} disabled={!label || !apiKey || busy === "credential"}>
              API key kaydet
            </button>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionBar}>
          <div>
            <h3>Kayıtlı API keyler</h3>
            <p>Bu tenant için aktif olan provider key listesi.</p>
          </div>
        </div>

        <div className={styles.list}>
          {credentials.length === 0 ? (
            <p className="empty-state">Henüz API key eklenmedi.</p>
          ) : (
            credentials.map((credential) => {
              const providerEntry = providerMap.get(credential.provider);
              return (
                <div className={styles.listItem} key={credential.id}>
                  <div className={styles.listCopy}>
                    <p className={styles.listTitle}>{credential.label}</p>
                    <p className={styles.listMeta}>
                      {providerEntry?.label || credential.provider} · {credential.planType} · {credential.maskedKeyPreview}
                    </p>
                    <p className={styles.listSubmeta}>Son kullanım: {formatDate(credential.lastUsedAt)}</p>
                  </div>
                  <div className={styles.listSide}>
                    {credential.baseUrl ? <span className={styles.miniPill}>Özel URL</span> : null}
                    <button className={styles.dangerBtn} onClick={() => deleteCredential(credential.id)} disabled={busy === credential.id}>
                      Sil
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
