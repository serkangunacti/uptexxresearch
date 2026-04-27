import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ScheduleConfigSchema = z.object({
  type: z.enum(["SIMPLE", "ADVANCED", "CUSTOM"]).default("SIMPLE"),
  hour: z.number().int().min(0).max(23).optional(),
  minute: z.number().int().min(0).max(59).optional(),
  everyDays: z.number().int().min(1).optional(),
  daysOfWeek: z.array(z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])).optional(),
  timezone: z.string().default("Europe/Istanbul"),
  startHour: z.number().int().min(0).max(23).optional(),
  endHour: z.number().int().min(0).max(23).optional(),
  isEnabled: z.boolean().default(true),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const schedule = await prisma.scheduleConfig.findUnique({
      where: { agentId: id },
      include: {
        rules: {
          where: { isActive: true },
          orderBy: { priority: 'desc' }
        }
      }
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Schedule fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validated = ScheduleConfigSchema.parse(body);

    // Check if agent exists
    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const schedule = await prisma.scheduleConfig.upsert({
      where: { agentId: id },
      create: {
        agentId: id,
        ...validated,
      },
      update: {
        ...validated,
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Schedule creation error:", error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
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
    const validated = ScheduleConfigSchema.parse(body);

    const schedule = await prisma.scheduleConfig.update({
      where: { agentId: id },
      data: {
        ...validated,
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Schedule update error:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
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

    await prisma.scheduleConfig.delete({
      where: { agentId: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Schedule deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    );
  }
}