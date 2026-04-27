import { NextResponse } from "next/server";
import { ensureAgents } from "@/lib/agents";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  cadence: z.string().min(1).max(50),
  scheduleLabel: z.string().min(1).max(100),
  defaultPrompt: z.string().min(10).max(5000),
  queries: z.array(z.string().min(1)).min(1).max(10),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
});

export async function GET() {
  try {
    await ensureAgents();
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        scheduleLabel: true,
        isCustom: true,
        runs: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1
        },
        reports: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Agents fetch error:", error);
    return NextResponse.json({
      agents: []
    }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CreateAgentSchema.parse(body);

    const { queries, ...createData } = validated;

    const agent = await prisma.agent.create({
      data: {
        id: randomUUID(),
        ...createData,
        customQueries: JSON.stringify(queries),
        isCustom: true,
        slug: validated.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        status: validated.status || "ACTIVE",
      }
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Agent creation error:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
