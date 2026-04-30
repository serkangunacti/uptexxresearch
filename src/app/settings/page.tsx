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

  const [users, credentials, tasks] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.apiCredential.findMany({
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
    }),
    prisma.task.findMany({
      where: { companyId: session.user.companyId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Ayarlar</h1>
        <p className="greeting">{session.user.companyName} tenant yönetimi</p>
      </header>
      <SettingsClient
        users={users}
        credentials={credentials}
        tasks={tasks}
        providers={getProviderCatalog()}
      />
    </div>
  );
}
