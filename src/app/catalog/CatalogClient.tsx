"use client";

import Link from "next/link";

type CatalogCard = {
  id: string;
  name: string;
  category: string;
  description: string;
  origin: "SYSTEM" | "GLOBAL_CUSTOM" | "TENANT_CUSTOM";
  lifecycle: "ACTIVE" | "COMING_SOON" | "DRAFT";
  requiredPackageName: string | null;
  accessible: boolean;
  locked: boolean;
  canInstall: boolean;
};

export function CatalogClient({
  packageName,
  allowsCustomAgentBuilder,
  templates,
}: {
  packageName: string;
  allowsCustomAgentBuilder: boolean;
  templates: CatalogCard[];
}) {
  const categories = Array.from(new Set(templates.map((item) => item.category)));

  return (
    <div style={{ display: "grid", gap: "28px" }}>
      {!allowsCustomAgentBuilder ? (
        <div className="setup-panel">
          <div className="setup-panel-header">
            <div>
              <h3 style={{ marginBottom: "6px" }}>Bu pakette sistem ajanları açık</h3>
              <p className="agent-section-copy" style={{ marginBottom: 0 }}>
                Şu an {packageName} paketindesin. Custom ajan oluşturma yalnızca Premium pakette açılır.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {categories.map((category) => {
        const items = templates.filter((template) => template.category === category);
        return (
          <section key={category}>
            <div className="section-heading">
              <h2>{category}</h2>
              <span className="section-badge">{items.length} ajan</span>
            </div>

            <div className="agents-grid">
              {items.map((template, index) => (
                <div className="agent-card" key={template.id} style={{ "--i": index } as React.CSSProperties}>
                  <div className="agent-card-header">
                    <h3>{template.name}</h3>
                    <span className={`status-badge ${template.lifecycle === "COMING_SOON" ? "paused" : template.accessible ? "active" : "paused"}`}>
                      <span className="status-dot" />
                      {template.lifecycle === "COMING_SOON" ? "Yakında" : template.accessible ? "Açık" : "Kilitli"}
                    </span>
                  </div>

                  <p className="agent-desc">{template.description}</p>

                  <div className="agent-card-meta">
                    <span className="meta-badge">{template.requiredPackageName || "Genel erişim"}</span>
                    <span className="meta-badge">
                      {template.origin === "TENANT_CUSTOM"
                        ? "Custom"
                        : template.origin === "GLOBAL_CUSTOM"
                          ? "Global Custom"
                          : "Sistem"}
                    </span>
                  </div>

                  <div className="agent-card-footer">
                    <span className="last-run-info">
                      {template.lifecycle === "COMING_SOON"
                        ? "İkinci fazda açılacak"
                        : template.locked
                          ? "Bu paketle aktif değil"
                          : "Kuruluma hazır"}
                    </span>

                    {template.canInstall ? (
                      <Link href={`/catalog/${template.id}`} className="run-btn" style={{ textDecoration: "none" }}>
                        Kur
                      </Link>
                    ) : (
                      <button className="run-btn" disabled>
                        {template.lifecycle === "COMING_SOON" ? "Yakında" : "Kilitli"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
