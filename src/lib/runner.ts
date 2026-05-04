import { prisma } from "./db";
import { resolveCredentialForAgent } from "./credentials";
import { generateReportWithProvider } from "./minimax";
import { searchAllQueries } from "./search";

export async function executeAgentRun(agentId: string, runId: string) {
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: {
      agent: {
        include: {
          tasks: { include: { task: true }, orderBy: { sortOrder: "asc" } },
          rule: true,
          credential: true,
          template: true,
        },
      },
      triggeredBy: true,
    },
  });

  if (!run || !run.agent) {
    throw new Error(`Run or agent not found: ${runId}`);
  }

  const agent = run.agent;
  const rule = agent.rule;
  const maxSourceAgeDays = rule?.maxSourceAgeDays ?? 7;
  const dedupeLookbackDays = rule?.dedupeLookbackDays ?? 7;

  const credential = await resolveCredentialForAgent({
    companyId: run.companyId ?? "",
    credentialId: agent.credentialId,
    modelName: agent.modelName,
  });

  await prisma.agentRun.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date(), error: null },
  });

  try {
    const queries = readStringArray(agent.searchQueries);
    if (queries.length === 0) {
      throw new Error("Ajan için sorgu listesi tanımlanmamış.");
    }

    const freshResults = await searchAllQueries(queries, maxSourceAgeDays);
    const dedupedResults = await filterRecentDuplicateSources(
      run.companyId ?? "",
      freshResults,
      dedupeLookbackDays
    );

    const generated = await generateReportWithProvider(
      {
        id: agent.id,
        name: agent.name,
        defaultPrompt: agent.defaultPrompt,
        modelProvider: agent.modelProvider,
        modelName: agent.modelName,
        outputSchema: agent.template?.outputSchema ?? {},
      },
      agent.tasks.map((item) => ({
        name: item.task.name,
        instruction: item.task.instruction,
      })),
      dedupedResults,
      credential
    );

    const report = await prisma.report.create({
      data: {
        companyId: run.companyId,
        agentId,
        runId,
        triggeredByUserId: run.triggeredByUserId,
        title: generated.title,
        summary: generated.summary,
        pdfPath: "",
        publicUrl: "",
        findings: {
          create: generated.findings.map((finding) => ({
            companyId: run.companyId,
            kind: finding.kind,
            title: finding.title,
            body: finding.body,
            sourceUrl: finding.sourceUrl ?? null,
            score: finding.score ?? null,
            metadata: (finding.metadata ?? {}) as Record<string, string>,
          })),
        },
      },
    });

    await prisma.apiCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    });

    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        metadata: {
          sourcesFound: freshResults.length,
          sourcesUsed: dedupedResults.length,
          findingsCount: generated.findings.length,
          reportId: report.id,
          model: agent.modelName,
          provider: agent.modelProvider,
        },
      },
    });

    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: message,
        metadata: {
          error: message,
        },
      },
    });
    throw error;
  }
}

async function filterRecentDuplicateSources(companyId: string, results: Awaited<ReturnType<typeof searchAllQueries>>, lookbackDays: number) {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const recentFindings = await prisma.reportFinding.findMany({
    where: {
      companyId,
      createdAt: { gte: since },
      sourceUrl: { not: null },
    },
    select: { sourceUrl: true },
  });

  const seenUrls = new Set(recentFindings.map((finding) => finding.sourceUrl).filter(Boolean));
  return results.filter((result) => !seenUrls.has(result.url));
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}
