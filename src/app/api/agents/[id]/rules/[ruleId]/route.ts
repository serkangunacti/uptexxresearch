import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateWorkRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  condition: z.enum(["ALWAYS", "BUSINESS_HOURS", "WEEKDAYS_ONLY", "WEEKENDS_ONLY", "CUSTOM_HOURS"]).optional(),
  customStartHour: z.number().int().min(0).max(23).optional(),
  customEndHour: z.number().int().min(0).max(23).optional(),
  maxRunsPerDay: z.number().int().min(1).optional(),
  minIntervalMins: z.number().int().min(1).optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const { id, ruleId } = await context.params;
    const body = await request.json();
    const validated = UpdateWorkRuleSchema.parse(body);

    const rule = await prisma.workRule.update({
      where: { id: ruleId },
      data: {
        ...validated,
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({ rule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Rule update error:", error);
    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const { id, ruleId } = await context.params;

    await prisma.workRule.delete({
      where: { id: ruleId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rule deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 }
    );
  }
}