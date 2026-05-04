"use client";

import Link from "next/link";
import styles from "./catalog.module.css";

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

function originLabel(origin: CatalogCard["origin"]) {
  if (origin === "TENANT_CUSTOM") return "Custom";
  if (origin === "GLOBAL_CUSTOM") return "Global Custom";
  return "Sistem";
}

function stateLabel(template: CatalogCard) {
  if (template.lifecycle === "COMING_SOON") return "Yakında";
  if (template.locked) return "Kilitli";
  return "Hazır";
}

export function CatalogClient({
  packageName,
  allowsCustomAgentBuilder,
  templates,
}: {
  packageName: string;
  allowsCustomAgentBuilder: boolean;
  templates: CatalogCard[];
}) {
  return (
    <div className={styles.catalogWrap}>
      <section className={styles.summaryPanel}>
        <div>
          <p className={styles.summaryKicker}>Aktif paket</p>
          <h2>{packageName}</h2>
          <p className={styles.summaryText}>
            Hazır ajanlar eşit kart düzeninde listelenir. Kilitli ajanlar da görünür, ama yalnızca açık olanlar kurulabilir.
          </p>
        </div>

        {!allowsCustomAgentBuilder ? (
          <div className={styles.summaryNote}>
            <strong>Custom builder kapalı</strong>
            <span>Premium pakette kendi ajan şablonunu oluşturabilirsin.</span>
          </div>
        ) : (
          <div className={styles.summaryNote}>
            <strong>Custom builder açık</strong>
            <span>İstersen kendi tenantına özel ajanlar da oluşturabilirsin.</span>
          </div>
        )}
      </section>

      <section className={styles.grid}>
        {templates.map((template) => (
          <article key={template.id} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={`${styles.stateBadge} ${template.locked || template.lifecycle === "COMING_SOON" ? styles.stateMuted : styles.stateReady}`}>
                {stateLabel(template)}
              </span>
              <span className={styles.categoryBadge}>{template.category}</span>
            </div>

            <div className={styles.cardBody}>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
            </div>

            <div className={styles.metaRow}>
              <span>{template.requiredPackageName || "Genel erişim"}</span>
              <span>{originLabel(template.origin)}</span>
            </div>

            <div className={styles.cardFooter}>
              <span className={styles.helperText}>
                {template.lifecycle === "COMING_SOON"
                  ? "Bu ajan sonraki fazda açılacak."
                  : template.locked
                    ? "Paket yükselterek açabilirsin."
                    : "Kuruluma hazır."}
              </span>

              {template.canInstall ? (
                <Link href={`/catalog/${template.id}`} className={styles.installButton}>
                  Kur
                </Link>
              ) : (
                <button className={styles.installButton} disabled>
                  {template.lifecycle === "COMING_SOON" ? "Yakında" : "Kilitli"}
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
