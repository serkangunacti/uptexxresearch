import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const WorkRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  condition: z.enum(["ALWAYS", "BUSINESS_HOURS", "WEEKDAYS_ONLY", "WEEKENDS_ONLY", "CUSTOM_HOURS"]),
  customStartHour: z.number().int().min(0).max(23).optional(),
  customEndHour: z.number().int().min(0).max(23).optional(),
  maxRunsPerDay: z.number().int().min(1).optional(),
  minIntervalMins: z.number().int().min(1).optional(),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Get or create schedule config
    let schedule = await prisma.scheduleConfig.findUnique({
      where: { agentId: id }
    });

    if (!schedule) {
      schedule = await prisma.scheduleConfig.create({
        data: { agentId: id }
      });
    }

    const rules = await prisma.workRule.findMany({
      where: { scheduleId: schedule.id },
      orderBy: { priority: 'desc' }
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Rules fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rules" },
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
    const validated = WorkRuleSchema.parse(body);

    // Get or create schedule config
    let schedule = await prisma.scheduleConfig.findUnique({
      where: { agentId: id }
    });

    if (!schedule) {
      schedule = await prisma.scheduleConfig.create({
        data: { agentId: id }
      });
    }

    const rule = await prisma.workRule.create({
      data: {
        scheduleId: schedule.id,
        ...validated,
      }
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Rule creation error:", error);
    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    );
  }
}