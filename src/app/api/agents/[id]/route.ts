import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  cadence: z.string().min(1).max(50).optional(),
  scheduleLabel: z.string().min(1).max(100).optional(),
  defaultPrompt: z.string().min(10).max(5000).optional(),
  customPrompt: z.string().min(10).max(5000).optional(),
  queries: z.array(z.string().min(1)).min(1).max(10).optional(),
  customQueries: z.array(z.string().min(1)).min(1).max(10).optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  reportRetentionDays: z.number().int().min(1).max(365).optional(),
  archiveOldReports: z.boolean().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const agent = await prisma.agent.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        cadence: true,
        scheduleLabel: true,
        defaultPrompt: true,
        customPrompt: true,
        customQueries: true,
        status: true,
        isCustom: true,
        reportRetentionDays: true,
        archiveOldReports: true,
        runs: {
          select: { createdAt: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 5
        },
        reports: {
          select: { createdAt: true, title: true },
          orderBy: { createdAt: "desc" },
          take: 5
        },
        _count: {
          select: {
            runs: true,
            reports: true
          }
        }
      }
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      agent: {
        ...agent,
        customQueries: agent.customQueries ? JSON.parse(agent.customQueries) : [],
        tasks: [],
        aiConfigs: [],
        _count: {
          runs: agent._count.runs,
          reports: agent._count.reports,
          tasks: 0
        }
      }
    });
  } catch (error) {
    console.error("Agent fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validated = UpdateAgentSchema.parse(body);
    const { queries, customQueries, ...updateData } = validated;
    const normalizedCustomQueries = customQueries ?? queries;

    // Check if agent exists and is custom (not system)
    const existingAgent = await prisma.agent.findUnique({
      where: { id }
    });

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!existingAgent.isCustom) {
      return NextResponse.json(
        { error: "Cannot modify system agents" },
        { status: 403 }
      );
    }

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...updateData,
        customQueries: normalizedCustomQueries ? JSON.stringify(normalizedCustomQueries) : undefined,
        updatedAt: new Date(),
        updatedBy: "system" // TODO: Add user context
      }
    });

    return NextResponse.json({ agent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Agent update error:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check if agent exists and is custom
    const existingAgent = await prisma.agent.findUnique({
      where: { id }
    });

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!existingAgent.isCustom) {
      return NextResponse.json(
        { error: "Cannot delete system agents" },
        { status: 403 }
      );
    }

    // Delete agent (cascade will handle related records)
    await prisma.agent.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Agent deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    );
  }
}