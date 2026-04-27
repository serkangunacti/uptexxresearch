import { prisma } from "./db";
import { getAgentDefinition } from "./agent-definitions";
import { searchAllQueries } from "./search";
import { getAIProvider } from "./ai-providers";
import { deduplicationEnabled, getDeduplicationStrategies } from "./env";

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

    // Step 2: Generate report with AI provider
    console.log(`[runner] Generating report with AI provider...`);
    const aiProvider = await getAIProvider(agentId);
    const generated = await aiProvider.generateReport(agentDef, sources, runId);
    console.log(`[runner] Report generated: ${generated.title}`);

    // Step 3: Apply deduplication if enabled
    let processedFindings = generated.findings;
    if (deduplicationEnabled()) {
      console.log(`[runner] Applying deduplication...`);
      processedFindings = await applyDeduplication(agentId, generated.findings);
      console.log(`[runner] After deduplication: ${processedFindings.length} findings`);
    }

    // Step 4: Save report to database
    const report = await prisma.report.create({
      data: {
        agentId,
        runId,
        title: generated.title,
        summary: generated.summary,
        pdfPath: "",
        publicUrl: "",
        findings: {
          create: processedFindings.map((f) => ({
            kind: f.kind,
            title: f.title,
            body: f.body,
            sourceUrl: f.sourceUrl ?? null,
            score: f.score ?? null,
            metadata: (f.metadata ?? {}) as Record<string, string>,
            isDuplicate: f.isDuplicate || false,
            duplicateOf: f.duplicateOf || null,
            deduplicationScore: f.deduplicationScore || null,
          })),
        },
      },
    });

    // Step 5: Create finding hashes for deduplication
    if (deduplicationEnabled()) {
      await createFindingHashes(report.id, processedFindings);
    }

    // Step 6: Mark run as SUCCEEDED
    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        metadata: {
          sourcesFound: sources.length,
          originalFindingsCount: generated.findings.length,
          processedFindingsCount: processedFindings.length,
          reportId: report.id,
          deduplicationApplied: deduplicationEnabled(),
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

// Deduplication functions
async function applyDeduplication(agentId: string, findings: any[]): Promise<any[]> {
  const strategies = getDeduplicationStrategies();
  let dedupedFindings = findings;

  for (const strategy of strategies) {
    switch (strategy) {
      case 'url':
        dedupedFindings = await deduplicateByUrl(dedupedFindings);
        break;
      case 'hash':
        dedupedFindings = await deduplicateByHash(agentId, dedupedFindings);
        break;
      case 'semantic':
        // TODO: Implement semantic deduplication
        break;
    }
  }

  return dedupedFindings;
}

async function deduplicateByUrl(findings: any[]): Promise<any[]> {
  const seen = new Set<string>();
  return findings.filter(finding => {
    if (!finding.sourceUrl) return true;
    if (seen.has(finding.sourceUrl)) return false;
    seen.add(finding.sourceUrl);
    return true;
  });
}

async function deduplicateByHash(agentId: string, findings: any[]): Promise<any[]> {
  const dedupedFindings = [];

  for (const finding of findings) {
    const contentHash = createContentHash(finding.title, finding.body);
    const existing = await findDuplicateByHash(agentId, contentHash);

    if (existing) {
      // Mark as duplicate
      dedupedFindings.push({
        ...finding,
        isDuplicate: true,
        duplicateOf: existing.id,
        deduplicationScore: 1.0, // Exact match
      });
    } else {
      dedupedFindings.push(finding);
    }
  }

  return dedupedFindings;
}

function createContentHash(title: string, body: string): string {
  const crypto = require('crypto');
  const content = `${title.toLowerCase().trim()}${body.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function findDuplicateByHash(agentId: string, contentHash: string) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30); // Look back 30 days

  const existing = await prisma.findingHash.findFirst({
    where: {
      contentHash,
      finding: {
        report: {
          agentId,
          createdAt: { gte: cutoffDate }
        }
      }
    },
    include: {
      finding: true
    }
  });

  return existing?.finding;
}

async function createFindingHashes(reportId: string, findings: any[]) {
  const findingRecords = await prisma.reportFinding.findMany({
    where: { reportId }
  });

  for (let i = 0; i < findings.length; i++) {
    const finding = findings[i];
    const findingRecord = findingRecords[i];

    if (findingRecord && !finding.isDuplicate) {
      const contentHash = createContentHash(finding.title, finding.body);

      await prisma.findingHash.create({
        data: {
          reportFindingId: findingRecord.id,
          contentHash,
        }
      });
    }
  }
}
