import { NextResponse } from "next/server";
import { ensureAgents } from "@/lib/agents";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureAgents();
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      runs: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  return NextResponse.json({ agents });
}
