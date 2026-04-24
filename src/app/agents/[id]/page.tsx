import Link from "next/link";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const agent = await prisma.agent.findUnique({
    where: { id },
  });

  if (!agent) return notFound();

  return (
    <div className="page-shell">
      <header className="page-header">
        <Link href="/agents" style={{ color: "var(--text-secondary)", textDecoration: "none", marginBottom: "1rem", display: "inline-block" }}>
          &larr; Ajanlara Dön
        </Link>
        <h1>{agent.name} Ayarları</h1>
        <p className="greeting">Bu ajan yakında özelleştirilebilir olacak.</p>
      </header>

      <div className="panel" style={{ marginTop: "2rem" }}>
        <div className="panel-header">
          <h3>Özelleştirme Seçenekleri</h3>
        </div>
        <p style={{ padding: "2rem", color: "var(--text-secondary)" }}>
          Ajan konfigürasyon modülü yapım aşamasındadır. Yakında buradan hedefleri, saatleri ve platformları ayarlayabileceksiniz.
        </p>
      </div>
    </div>
  );
}
