import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      agent: true,
      findings: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!report) notFound();

  return (
    <div className="report-detail">
      <Link href="/reports" className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12,19 5,12 12,5" />
        </svg>
        Raporlara dön
      </Link>

      <header className="report-page-header">
        <p className="report-agent-name">{report.agent.name}</p>
        <h1>{report.title}</h1>
        <p className="report-page-date">{report.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>
      </header>

      <p className="report-summary-text">{report.summary}</p>

      <div className="report-actions">
        {/* PDF Görüntüle — opens in new browser tab */}
        <a
          href={`/api/reports/${report.id}/download`}
          className="btn-primary"
          target="_blank"
          rel="noreferrer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="15" x2="15" y2="15" />
            <line x1="9" y1="11" x2="15" y2="11" />
          </svg>
          PDF Görüntüle
        </a>

        {/* Excel Oluştur — triggers download */}
        <a
          href={`/api/reports/${report.id}/excel`}
          className="btn-excel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
            <path d="m6 13 2 4 2-4M14 13h4M14 17h4" />
          </svg>
          Excel Oluştur
        </a>
      </div>

      <section className="findings-section">
        <h2>Bulgular ({report.findings.length})</h2>
        {report.findings.map((finding, index) => (
          <article className="finding-card" key={finding.id}>
            <span className="finding-index">{String(index + 1).padStart(2, "0")}</span>
            <div className="finding-body">
              <span className="finding-kind">
                {finding.kind}
                {finding.score ? <span className="finding-score">· Skor {finding.score}</span> : null}
              </span>
              <h3>{finding.title}</h3>
              <p>{finding.body}</p>
              {finding.sourceUrl ? (
                <a className="finding-source" href={finding.sourceUrl} target="_blank" rel="noreferrer">
                  {finding.sourceUrl}
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
