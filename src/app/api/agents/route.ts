import { NextResponse } from "next/server";
import { ensureAgents } from "@/lib/agents";
import { prisma } from "@/lib/db";
import { z } from "zod";

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
      },
      _count: {
        select: {
          tasks: true,
          aiConfigs: true
        }
      }
    }
  });

  return NextResponse.json({ agents });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CreateAgentSchema.parse(body);

    const agent = await prisma.agent.create({
      data: {
        ...validated,
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
