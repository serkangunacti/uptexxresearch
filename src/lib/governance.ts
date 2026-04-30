import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function enforceRateLimit(scope: string, key: string, maxEvents: number, windowMinutes: number) {
  const since = new Date(Date.now() - windowMinutes * 60_000);
  const count = await prisma.rateLimitEvent.count({
    where: { scope, key, createdAt: { gte: since } },
  });

  if (count >= maxEvents) {
    throw new Error("RATE_LIMITED");
  }

  await prisma.rateLimitEvent.create({
    data: { scope, key },
  });
}

export async function writeAuditLog(input: {
  companyId?: string | null;
  userId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      companyId: input.companyId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? {},
    },
  });
}
