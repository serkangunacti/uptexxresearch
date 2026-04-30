import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser("VIEWER");
    const tasks = await prisma.task.findMany({
      where: { companyId: session.user.companyId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser("OWNER_ADMIN");
    const body = await request.json();
    if (!body.name || !body.instruction) {
      return NextResponse.json({ error: "Görev adı ve talimat zorunlu." }, { status: 400 });
    }

    const task = await prisma.task.upsert({
      where: {
        companyId_name: {
          companyId: session.user.companyId,
          name: String(body.name),
        },
      },
      create: {
        companyId: session.user.companyId,
        name: String(body.name),
        category: String(body.category || "general"),
        description: String(body.description || body.name),
        instruction: String(body.instruction),
      },
      update: {
        category: String(body.category || "general"),
        description: String(body.description || body.name),
        instruction: String(body.instruction),
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    return authError(error);
  }
}

function authError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
}
