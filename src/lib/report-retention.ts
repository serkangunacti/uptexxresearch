import { prisma } from "./db";
import { getReportRetentionDays, autoArchiveEnabled } from "./env";

export async function archiveOldReports(agentId?: string) {
  const retentionDays = getReportRetentionDays();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const whereClause = agentId
    ? { agentId, createdAt: { lt: cutoffDate }, isArchived: false }
    : { createdAt: { lt: cutoffDate }, isArchived: false };

  const result = await prisma.report.updateMany({
    where: whereClause,
    data: {
      isArchived: true,
      archivedAt: new Date(),
    }
  });

  console.log(`Archived ${result.count} reports older than ${retentionDays} days`);
  return result.count;
}

export async function cleanupArchivedReports(agentId?: string) {
  const cleanupDays = 90; // Keep archived reports for 90 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cleanupDays);

  const whereClause = agentId
    ? { agentId, isArchived: true, archivedAt: { lt: cutoffDate } }
    : { isArchived: true, archivedAt: { lt: cutoffDate } };

  const result = await prisma.report.deleteMany({
    where: whereClause
  });

  console.log(`Deleted ${result.count} archived reports older than ${cleanupDays} days`);
  return result.count;
}

export async function getActiveReports(agentId: string, limit: number = 50) {
  const retentionDays = getReportRetentionDays();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  return prisma.report.findMany({
    where: {
      agentId,
      isArchived: false,
      createdAt: { gte: cutoffDate }
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      findings: {
        take: 5,
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function getArchivedReports(agentId: string, limit: number = 50) {
  return prisma.report.findMany({
    where: {
      agentId,
      isArchived: true
    },
    orderBy: { archivedAt: "desc" },
    take: limit,
    include: {
      findings: {
        take: 5,
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function restoreArchivedReport(reportId: string) {
  return prisma.report.update({
    where: { id: reportId },
    data: {
      isArchived: false,
      archivedAt: null
    }
  });
}

export async function runRetentionCleanup() {
  if (!autoArchiveEnabled()) {
    console.log("Auto archive is disabled, skipping cleanup");
    return { archived: 0, deleted: 0 };
  }

  try {
    const archived = await archiveOldReports();
    const deleted = await cleanupArchivedReports();

    return { archived, deleted };
  } catch (error) {
    console.error("Error during retention cleanup:", error);
    throw error;
  }
}

export async function getRetentionStats(agentId?: string) {
  const retentionDays = getReportRetentionDays();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const [active, archived, total] = await Promise.all([
    prisma.report.count({
      where: agentId
        ? { agentId, isArchived: false, createdAt: { gte: cutoffDate } }
        : { isArchived: false, createdAt: { gte: cutoffDate } }
    }),
    prisma.report.count({
      where: agentId
        ? { agentId, isArchived: true }
        : { isArchived: true }
    }),
    prisma.report.count({
      where: agentId ? { agentId } : {}
    })
  ]);

  return {
    retentionDays,
    active,
    archived,
    total,
    cutoffDate: cutoffDate.toISOString()
  };
}