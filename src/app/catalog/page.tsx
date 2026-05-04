import Link from "next/link";
import { redirect } from "next/navigation";
import { getCatalogTemplatesForUser } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/server-auth";
import { CatalogClient } from "./CatalogClient";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { subscription, templates } = await getCatalogTemplatesForUser(session.user);

  return (
    <div className="page-shell">
      <header className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
          <div>
            <h1>Ajan Kataloğu</h1>
            <p className="greeting">
              Paket: {subscription.package.name} · Aktif limit: {subscription.package.activeAgentLimit >= 9999 ? "Sınırsız" : subscription.package.activeAgentLimit}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/agents" className="secondary-btn">
              Ajanlarım
            </Link>
            {session.user.role === "OWNER_ADMIN" && subscription.package.allowsCustomAgentBuilder ? (
              <Link href="/agents/new" className="run-btn" style={{ textDecoration: "none" }}>
                Custom Ajan Oluştur
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <CatalogClient
        packageName={subscription.package.name}
        allowsCustomAgentBuilder={subscription.package.allowsCustomAgentBuilder}
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          category: template.category,
          description: template.description,
          origin: template.origin,
          lifecycle: template.lifecycle,
          requiredPackageName: template.requiredPackageName,
          accessible: template.accessible,
          locked: template.locked,
          canInstall: template.canInstall,
        }))}
      />
    </div>
  );
}
