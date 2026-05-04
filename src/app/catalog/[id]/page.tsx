import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCatalogTemplateForUser } from "@/lib/catalog";
import { getModelOptionsForCredential } from "@/lib/providers";
import { getCurrentUser } from "@/lib/server-auth";
import { CatalogInstallClient } from "./CatalogInstallClient";

export const dynamic = "force-dynamic";

export default async function CatalogTemplatePage(context: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { id } = await context.params;
  const { subscription, template } = await getCatalogTemplateForUser(session.user, id);

  const credentials = await prisma.apiCredential.findMany({
    where: { companyId: session.user.companyId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="page-shell">
      <header className="page-header">
        <Link href="/catalog" style={{ color: "var(--text-secondary)", textDecoration: "none", marginBottom: "1rem", display: "inline-block" }}>
          &larr; Ajan Kataloğuna Dön
        </Link>
        <h1>{template.name}</h1>
        <p className="greeting">
          {template.description} · Paket: {template.requiredPackageName || "Genel erişim"}
        </p>
      </header>

      <CatalogInstallClient
        template={{
          id: template.id,
          name: template.name,
          description: template.description,
          lifecycle: template.lifecycle,
          canInstall: template.canInstall,
          accessible: template.accessible,
          requiredPackageName: template.requiredPackageName,
          taskBlueprints: template.taskBlueprints,
          sourceCatalog: template.sourceCatalog,
          configSchema: template.configSchema,
        }}
        subscription={{
          packageName: subscription.package.name,
          allowsCustomAgentBuilder: subscription.package.allowsCustomAgentBuilder,
        }}
        credentials={credentials.map((credential) => ({
          id: credential.id,
          label: credential.label,
          provider: credential.provider,
          maskedKeyPreview: credential.maskedKeyPreview,
          models: getModelOptionsForCredential(credential),
        }))}
      />
    </div>
  );
}
