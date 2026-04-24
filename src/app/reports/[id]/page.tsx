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
      <Link href="/" className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12,19 5,12 12,5" />
        </svg>
        Dashboard&apos;a dön
      </Link>

      <header className="report-page-header">
        <p className="report-agent-name">{report.agent.name}</p>
        <h1>{report.title}</h1>
        <p className="report-page-date">{report.createdAt.toLocaleString("tr-TR")}</p>
      </header>

      <p className="report-summary-text">{report.summary}</p>

      <div className="report-actions">
        <a href={`/api/reports/${report.id}/download`} className="btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          PDF İndir
        </a>
        <a href={report.publicUrl} className="btn-outline" target="_blank" rel="noreferrer">
          Public Link
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
