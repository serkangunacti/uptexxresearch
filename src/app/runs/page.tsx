import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/server-auth";
import { RunListClient } from "./RunListClient";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  let runs: Prisma.AgentRunGetPayload<{
    include: { agent: { select: { name: true } } };
  }>[] = [];
  let hasError = false;

  try {
    runs = await prisma.agentRun.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "desc" },
      include: { agent: { select: { name: true } } },
    });
  } catch (error) {
    console.error("Runs page load failed:", error);
    hasError = true;
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Tüm Çalışma Geçmişi</h1>
      </header>

      {hasError ? (
        <div className="panel" style={{ marginTop: "2rem" }}>
          <div className="panel-header">
            <h3>Çalışmalar yüklenemedi</h3>
          </div>
          <p className="empty-state">Veritabanı bağlantısını ve tenant yetkilerini kontrol edin.</p>
        </div>
      ) : null}

      <RunListClient runs={runs} />
    </div>
  );
}
