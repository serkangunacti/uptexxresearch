"use client";

import { useState } from "react";
import { TemplateBuilderClient } from "../TemplateBuilderClient";

type PackageRow = {
  id: string;
  key: "FREE" | "BASIC" | "PRO" | "PREMIUM";
  name: string;
  monthlyPrice: number;
  currency: string;
  activeAgentLimit: number;
  allowsCustomAgentBuilder: boolean;
  sortOrder: number;
  isActive: boolean;
};

type TemplateRow = {
  id: string;
  name: string;
  category: string;
  origin: "SYSTEM" | "GLOBAL_CUSTOM" | "TENANT_CUSTOM";
  lifecycle: "ACTIVE" | "COMING_SOON" | "DRAFT";
  isSelectable: boolean;
  description: string;
  requiredPackageKey: "FREE" | "BASIC" | "PRO" | "PREMIUM" | null;
};

export function PlatformCatalogClient({
  currentPackageKey,
  packages,
  templates,
}: {
  currentPackageKey: "FREE" | "BASIC" | "PRO" | "PREMIUM";
  packages: PackageRow[];
  templates: TemplateRow[];
}) {
  const [packageRows, setPackageRows] = useState(packages);
  const [subscriptionPackageKey, setSubscriptionPackageKey] = useState(currentPackageKey);
  const [templateRows, setTemplateRows] = useState(templates);
  const [busy, setBusy] = useState<string | null>(null);

  async function savePackage(pkg: PackageRow) {
    setBusy(`pkg-${pkg.id}`);
    try {
      const response = await fetch("/api/platform/packages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pkg),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Paket kaydedilemedi.");
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Paket kaydedilemedi.");
    } finally {
      setBusy(null);
    }
  }

  async function saveSubscription() {
    setBusy("subscription");
    try {
      const response = await fetch("/api/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageKey: subscriptionPackageKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Abonelik güncellenemedi.");
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Abonelik güncellenemedi.");
    } finally {
      setBusy(null);
    }
  }

  async function saveTemplate(template: TemplateRow) {
    setBusy(`tpl-${template.id}`);
    try {
      const response = await fetch("/api/platform/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          lifecycle: template.lifecycle,
          isSelectable: template.isSelectable,
          description: template.description,
          requiredPackageKey: template.requiredPackageKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Şablon güncellenemedi.");
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Şablon güncellenemedi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: "28px" }}>
      <section className="panel">
        <div className="panel-header">
          <h3>Mevcut tenant paketi</h3>
        </div>
        <div className="agent-editor-body">
          <div className="agent-editor-actions" style={{ marginTop: 0, paddingTop: 0, borderTop: 0, justifyContent: "space-between" }}>
            <select value={subscriptionPackageKey} onChange={(e) => setSubscriptionPackageKey(e.target.value as typeof subscriptionPackageKey)}>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.key}>
                  {pkg.name}
                </option>
              ))}
            </select>
            <button className="run-btn" disabled={busy === "subscription"} onClick={saveSubscription}>
              Paketi Güncelle
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Paketler</h3>
        </div>
        <div className="agent-editor-body" style={{ display: "grid", gap: "18px" }}>
          {packageRows.map((pkg) => (
            <div key={pkg.id} className="agent-section-box">
              <div className="agent-rules-grid">
                <div className="agent-form-field">
                  <label>Paket adı</label>
                  <input
                    value={pkg.name}
                    onChange={(e) =>
                      setPackageRows((current) => current.map((item) => (item.id === pkg.id ? { ...item, name: e.target.value } : item)))
                    }
                  />
                </div>
                <div className="agent-form-field">
                  <label>Para birimi</label>
                  <input
                    value={pkg.currency}
                    onChange={(e) =>
                      setPackageRows((current) => current.map((item) => (item.id === pkg.id ? { ...item, currency: e.target.value } : item)))
                    }
                  />
                </div>
                <div className="agent-form-field">
                  <label>Aylık fiyat</label>
                  <input
                    type="number"
                    value={pkg.monthlyPrice}
                    onChange={(e) =>
                      setPackageRows((current) =>
                        current.map((item) => (item.id === pkg.id ? { ...item, monthlyPrice: Number(e.target.value) || 0 } : item))
                      )
                    }
                  />
                </div>
                <div className="agent-form-field">
                  <label>Aktif ajan limiti</label>
                  <input
                    type="number"
                    value={pkg.activeAgentLimit}
                    onChange={(e) =>
                      setPackageRows((current) =>
                        current.map((item) => (item.id === pkg.id ? { ...item, activeAgentLimit: Number(e.target.value) || 1 } : item))
                      )
                    }
                  />
                </div>
              </div>

              <div className="task-choice-list" style={{ marginTop: "14px" }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={pkg.allowsCustomAgentBuilder}
                    onChange={(e) =>
                      setPackageRows((current) =>
                        current.map((item) => (item.id === pkg.id ? { ...item, allowsCustomAgentBuilder: e.target.checked } : item))
                      )
                    }
                  />
                  <span className="checkbox-text">Custom ajan oluşturma açık</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={pkg.isActive}
                    onChange={(e) =>
                      setPackageRows((current) => current.map((item) => (item.id === pkg.id ? { ...item, isActive: e.target.checked } : item)))
                    }
                  />
                  <span className="checkbox-text">Paket aktif</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
                <button className="run-btn" disabled={busy === `pkg-${pkg.id}`} onClick={() => savePackage(pkg)}>
                  Kaydet
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Katalog ajan erişimleri</h3>
        </div>
        <div className="agent-editor-body" style={{ display: "grid", gap: "14px" }}>
          {templateRows.map((template) => (
            <div key={template.id} className="agent-section-box">
              <div style={{ display: "grid", gap: "14px" }}>
                <div>
                  <strong>{template.name}</strong>
                  <p className="agent-section-copy" style={{ marginTop: "6px", marginBottom: 0 }}>
                    {template.category} · {template.origin}
                  </p>
                </div>

                <div className="agent-rules-grid">
                  <div className="agent-form-field">
                    <label>Paket</label>
                    <select
                      value={template.requiredPackageKey || ""}
                      onChange={(e) =>
                        setTemplateRows((current) =>
                          current.map((item) => (item.id === template.id ? { ...item, requiredPackageKey: e.target.value as TemplateRow["requiredPackageKey"] } : item))
                        )
                      }
                    >
                      <option value="FREE">FREE</option>
                      <option value="BASIC">BASIC</option>
                      <option value="PRO">PRO</option>
                      <option value="PREMIUM">PREMIUM</option>
                    </select>
                  </div>

                  <div className="agent-form-field">
                    <label>Lifecycle</label>
                    <select
                      value={template.lifecycle}
                      onChange={(e) =>
                        setTemplateRows((current) =>
                          current.map((item) => (item.id === template.id ? { ...item, lifecycle: e.target.value as TemplateRow["lifecycle"] } : item))
                        )
                      }
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="COMING_SOON">COMING_SOON</option>
                      <option value="DRAFT">DRAFT</option>
                    </select>
                  </div>
                </div>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={template.isSelectable}
                    onChange={(e) =>
                      setTemplateRows((current) =>
                        current.map((item) => (item.id === template.id ? { ...item, isSelectable: e.target.checked } : item))
                      )
                    }
                  />
                  <span className="checkbox-text">Seçilebilir</span>
                </label>

                <div className="agent-form-field">
                  <label>Kısa açıklama</label>
                  <textarea
                    rows={3}
                    value={template.description}
                    onChange={(e) =>
                      setTemplateRows((current) =>
                        current.map((item) => (item.id === template.id ? { ...item, description: e.target.value } : item))
                      )
                    }
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="run-btn" disabled={busy === `tpl-${template.id}`} onClick={() => saveTemplate(template)}>
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <TemplateBuilderClient
        title="Global Custom Ajan"
        description="Tüm tenantlarda görünecek yeni global custom katalog ajanı oluştur."
        endpoint="/api/platform/templates"
        submitLabel="Global Ajanı Kaydet"
        successPath="/catalog/manage"
        showVisibilityPackage
      />
    </div>
  );
}
