import { AgentStatus, type Prisma, type UserRole } from "@prisma/client";
import { prisma } from "./db";
import type { SessionUser } from "./types";

export function isAdminRole(role: UserRole) {
  return role === "OWNER_ADMIN";
}

export async function getVisibleAgentsForUser(user: SessionUser) {
  if (user.role === "OWNER_ADMIN" || user.role === "VIEWER") {
    return prisma.agent.findMany({
      where: { companyId: user.companyId },
      include: defaultAgentIncludes,
      orderBy: { createdAt: "asc" },
    });
  }

  return prisma.agent.findMany({
    where: {
      companyId: user.companyId,
      assignments: { some: { userId: user.id } },
    },
    include: defaultAgentIncludes,
    orderBy: { createdAt: "asc" },
  });
}

export async function getAgentForUser(user: SessionUser, agentId: string, mode: "view" | "manage" = "view") {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, companyId: user.companyId },
    include: {
      credential: {
        select: {
          id: true,
          provider: true,
          planType: true,
          label: true,
          maskedKeyPreview: true,
          baseUrl: true,
          modelOverrides: true,
          isActive: true,
        },
      },
      schedule: true,
      rule: true,
      assignments: { include: { user: true } },
      tasks: { include: { task: true }, orderBy: { sortOrder: "asc" } },
      template: true,
    },
  });

  if (!agent) {
    throw new Error("NOT_FOUND");
  }

  if (mode === "manage" && user.role === "MANAGER") {
    const assigned = agent.assignments.some((assignment) => assignment.userId === user.id);
    if (!assigned) {
      throw new Error("FORBIDDEN");
    }
  }

  return agent;
}

export async function getRunForUser(user: SessionUser, runId: string) {
  const run = await prisma.agentRun.findFirst({
    where: { id: runId, companyId: user.companyId },
    include: { agent: true, triggeredBy: true },
  });
  if (!run) throw new Error("NOT_FOUND");
  return run;
}

export async function getReportForUser(user: SessionUser, reportId: string) {
  const report = await prisma.report.findFirst({
    where: { id: reportId, companyId: user.companyId },
    include: {
      agent: true,
      findings: { orderBy: { createdAt: "asc" } },
      triggeredBy: true,
    },
  });
  if (!report) throw new Error("NOT_FOUND");
  return report;
}

export async function assertCredentialAvailable(agent: {
  status: AgentStatus;
  credentialId: string | null;
  modelName: string | null;
}) {
  if (agent.status !== "ACTIVE") {
    throw new Error("Ajan pasif durumda.");
  }
  if (!agent.credentialId || !agent.modelName) {
    throw new Error("Bu ajan için aktif bir API key ve model seçimi zorunlu.");
  }
}

const defaultAgentIncludes = {
  runs: { orderBy: { createdAt: "desc" }, take: 1 },
  reports: { orderBy: { createdAt: "desc" }, take: 1 },
  schedule: true,
  credential: {
    select: {
      id: true,
      provider: true,
      planType: true,
      label: true,
      maskedKeyPreview: true,
      isActive: true,
    },
  },
  assignments: { include: { user: true } },
  tasks: { include: { task: true }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.AgentInclude;
