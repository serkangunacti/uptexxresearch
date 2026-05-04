import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/server-auth";
import { getProviderCatalog } from "@/lib/providers";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  if (session.user.role !== "OWNER_ADMIN") redirect("/");

  const credentials = await prisma.apiCredential.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        provider: true,
        planType: true,
        label: true,
        maskedKeyPreview: true,
        baseUrl: true,
        modelOverrides: true,
        isActive: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Ayarlar</h1>
        <p className="greeting">{session.user.companyName} tenant yönetimi</p>
      </header>
      <SettingsClient
        credentials={credentials}
        providers={getProviderCatalog()}
      />
    </div>
  );
}
