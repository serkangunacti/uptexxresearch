import { redirect } from "next/navigation";
import { requireCompanySubscription } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/server-auth";
import { TemplateBuilderClient } from "@/app/catalog/TemplateBuilderClient";

export const dynamic = "force-dynamic";

export default async function NewAgentPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  if (session.user.role !== "OWNER_ADMIN") redirect("/agents");

  const subscription = await requireCompanySubscription(session.user.companyId);
  if (!subscription.package.allowsCustomAgentBuilder) redirect("/catalog");

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Custom Ajan Oluştur</h1>
        <p className="greeting">Bu ekran yalnızca Premium pakette açılır.</p>
      </header>

      <TemplateBuilderClient
        title="Tenant Custom Ajan"
        description="Kendi tenantına özel katalog ajanı oluştur. Kaydettikten sonra Ajan Kataloğu içinde seçilebilir hale gelir."
        endpoint="/api/custom-templates"
        submitLabel="Custom Ajanı Kaydet"
        successPath="/catalog"
      />
    </div>
  );
}
