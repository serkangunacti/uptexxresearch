import { prisma } from "./db";
import { getAgentDefinition } from "./agent-definitions";
import { searchAllQueries } from "./search";
import { generateReportWithMiniMax } from "./minimax";

export async function executeAgentRun(agentId: string, runId: string) {
  const agentDef = getAgentDefinition(agentId);
  if (!agentDef) throw new Error(`Agent definition not found: ${agentId}`);

  // Mark run as RUNNING
  await prisma.agentRun.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    // Step 1: Search the web
    console.log(`[runner] Searching for agent: ${agentDef.name}`);
    const sources = await searchAllQueries(agentDef.queries);
    console.log(`[runner] Found ${sources.length} sources`);

    // Step 2: Generate report with MiniMax AI
    console.log(`[runner] Generating report with MiniMax...`);
    const generated = await generateReportWithMiniMax(agentDef, sources);
    console.log(`[runner] Report generated: ${generated.title}`);

    // Step 3: Save report to database
    const report = await prisma.report.create({
      data: {
        agentId,
        runId,
        title: generated.title,
        summary: generated.summary,
        pdfPath: "",
        publicUrl: "",
        findings: {
          create: generated.findings.map((f) => ({
            kind: f.kind,
            title: f.title,
            body: f.body,
            sourceUrl: f.sourceUrl ?? null,
            score: f.score ?? null,
            metadata: (f.metadata ?? {}) as Record<string, string>,
          })),
        },
      },
    });

    // Step 4: Mark run as SUCCEEDED
    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        metadata: {
          sourcesFound: sources.length,
          findingsCount: generated.findings.length,
          reportId: report.id,
        },
      },
    });

    return report;
  } catch (error) {
    // Mark run as FAILED
    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      },
    });
    throw error;
  }
}
