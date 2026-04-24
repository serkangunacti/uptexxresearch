import { FindingKind, Prisma } from "@prisma/client";
import { getAgentDefinition } from "./agent-definitions";
import { ensureAgents } from "./agents";
import { prisma } from "./db";
import { generateReportWithMiniMax } from "./minimax";
import { renderPdfFromHtml, writeHtmlReport } from "./pdf";
import { renderReportHtml } from "./report-template";
import { searchMany } from "./search";
import { deliverReportToSlack } from "./slack";
import { ensureReportStorage, reportPaths } from "./storage";
import type { GeneratedReport } from "./types";

export async function runAgentPipeline(agentId: string, runId: string) {
  const definition = getAgentDefinition(agentId);
  if (!definition) {
    throw new Error(`Unknown agent: ${agentId}`);
  }
  if (definition.status === "PAUSED") {
    throw new Error(`${definition.name} is paused.`);
  }

  await ensureAgents();
  await ensureReportStorage();

  await prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: "RUNNING",
      startedAt: new Date()
    }
  });

  try {
    const sources = await searchMany(definition.queries);
    const generated = await generateSafely(definition.id, async () =>
      generateReportWithMiniMax(definition, sources)
    );
    const paths = reportPaths(definition.id, runId);
    const html = renderReportHtml({
      agentName: definition.name,
      report: generated,
      createdAt: new Date()
    });

    await writeHtmlReport(html, paths.htmlPath);
    await renderPdfFromHtml(html, paths.pdfPath);

    const report = await prisma.report.create({
      data: {
        agentId: definition.id,
        runId,
        title: generated.title,
        summary: generated.summary,
        htmlPath: paths.htmlPath,
        pdfPath: paths.pdfPath,
        publicUrl: paths.publicUrl,
        findings: {
          create: generated.findings.map((finding) => ({
            kind: finding.kind,
            title: finding.title,
            body: finding.body,
            sourceUrl: finding.sourceUrl,
            score: finding.score,
            metadata: finding.metadata as Prisma.InputJsonValue | undefined
          }))
        }
      }
    });

    const slackResult = await deliverReportToSlack({
      agentName: definition.name,
      report: generated,
      pdfPath: paths.pdfPath,
      publicUrl: paths.publicUrl
    });

    await prisma.report.update({
      where: { id: report.id },
      data: {
        slackFileId: "fileId" in slackResult ? slackResult.fileId : null,
        slackMessageTs: "messageTs" in slackResult ? slackResult.messageTs : null
      }
    });

    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        metadata: {
          sourceCount: sources.length,
          slackDryRun: "dryRun" in slackResult ? slackResult.dryRun : false
        }
      }
    });

    return report;
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
}

async function generateSafely(agentId: string, fn: () => Promise<GeneratedReport>) {
  try {
    return await fn();
  } catch (error) {
    console.warn("[report] MiniMax generation failed:", error);
    return {
      title: `${agentId} raporu`,
      summary: "Model raporu uretilemedi; sistem hata notu ile rapor olusturdu.",
      findings: [
        {
          kind: FindingKind.SYSTEM,
          title: "Model uretimi basarisiz",
          body: error instanceof Error ? error.message : String(error),
          score: 0
        }
      ]
    };
  }
}
