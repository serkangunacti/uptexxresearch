import { prisma } from "@/lib/db";
import { RunListClient } from "./RunListClient";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await prisma.agentRun.findMany({
    orderBy: { createdAt: "desc" },
    include: { agent: { select: { name: true } } },
  });

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Tüm Çalışma Geçmişi</h1>
      </header>

      <RunListClient runs={runs} />
    </div>
  );
}
