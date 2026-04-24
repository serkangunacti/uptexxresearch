import type { GeneratedReport } from "./types";

export function renderReportHtml(input: {
  agentName: string;
  report: GeneratedReport;
  createdAt: Date;
}) {
  const findings = input.report.findings
    .map((finding, index) => {
      const source = finding.sourceUrl
        ? `<a href="${escapeHtml(finding.sourceUrl)}">${escapeHtml(finding.sourceUrl)}</a>`
        : "<span>Kaynak yok</span>";

      return `
        <section class="finding">
          <div class="finding-index">${String(index + 1).padStart(2, "0")}</div>
          <div>
            <div class="finding-meta">${escapeHtml(finding.kind)}${finding.score ? ` · Skor ${finding.score}` : ""}</div>
            <h2>${escapeHtml(finding.title)}</h2>
            <p>${escapeHtml(finding.body)}</p>
            <div class="source">${source}</div>
          </div>
        </section>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.report.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #151515;
        --muted: #66645f;
        --line: #dedbd2;
        --paper: #f7f5ef;
        --accent: #1f6f63;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--paper);
        color: var(--ink);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.45;
      }
      main {
        max-width: 900px;
        margin: 0 auto;
        padding: 44px 36px 56px;
      }
      header {
        border-bottom: 1px solid var(--line);
        padding-bottom: 28px;
        margin-bottom: 28px;
      }
      .eyebrow {
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      h1 {
        font-size: 38px;
        line-height: 1.05;
        margin: 12px 0 16px;
      }
      .summary {
        color: var(--muted);
        font-size: 16px;
        max-width: 760px;
      }
      .finding {
        display: grid;
        grid-template-columns: 56px 1fr;
        gap: 22px;
        border-bottom: 1px solid var(--line);
        padding: 24px 0;
        break-inside: avoid;
      }
      .finding-index {
        color: var(--accent);
        font-size: 13px;
        font-weight: 800;
      }
      .finding-meta {
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }
      h2 {
        font-size: 21px;
        line-height: 1.2;
        margin: 8px 0 10px;
      }
      p {
        margin: 0;
        color: #2d2c29;
      }
      .source {
        margin-top: 12px;
        font-size: 12px;
        overflow-wrap: anywhere;
      }
      a {
        color: var(--accent);
        text-decoration: none;
      }
      footer {
        margin-top: 26px;
        color: var(--muted);
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div class="eyebrow">Uptexx Research Automation · ${escapeHtml(input.agentName)}</div>
        <h1>${escapeHtml(input.report.title)}</h1>
        <div class="summary">${escapeHtml(input.report.summary)}</div>
      </header>
      ${findings}
      <footer>Olusturulma zamani: ${input.createdAt.toLocaleString("tr-TR")}</footer>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
