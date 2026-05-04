import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertPlatformAdmin, requireCompanySubscription } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/server-auth";
import { PlatformCatalogClient } from "./PlatformCatalogClient";

export const dynamic = "force-dynamic";

export default async function PlatformCatalogPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  if (session.user.role !== "OWNER_ADMIN") redirect("/");
  assertPlatformAdmin(session.user);

  const [packages, templates, subscription] = await Promise.all([
    prisma.planPackage.findMany({
      orderBy: { sortOrder: "asc" },
    }),
    prisma.agentTemplate.findMany({
      include: {
        packageLinks: {
          include: {
            package: true,
          },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    requireCompanySubscription(session.user.companyId),
  ]);

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Katalog Yönetimi</h1>
        <p className="greeting">Platform admin araçları</p>
      </header>

      <PlatformCatalogClient
        currentPackageKey={subscription.package.key}
        packages={packages.map((pkg) => ({
          id: pkg.id,
          key: pkg.key,
          name: pkg.name,
          monthlyPrice: pkg.monthlyPrice,
          currency: pkg.currency,
          activeAgentLimit: pkg.activeAgentLimit,
          allowsCustomAgentBuilder: pkg.allowsCustomAgentBuilder,
          sortOrder: pkg.sortOrder,
          isActive: pkg.isActive,
        }))}
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          category: template.category,
          origin: template.origin,
          lifecycle: template.lifecycle,
          isSelectable: template.isSelectable,
          description: template.description,
          requiredPackageKey:
            [...template.packageLinks].sort((a, b) => a.package.sortOrder - b.package.sortOrder)[0]?.package.key ?? null,
        }))}
      />
    </div>
  );
}
