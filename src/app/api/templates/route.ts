import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser("MANAGER");
    const templates = await prisma.agentTemplate.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ templates });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
