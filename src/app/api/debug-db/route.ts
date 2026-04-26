import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Veritabanı URL'sini güvenli bir şekilde maskeleyerek alalım
    const dbUrl = process.env.DATABASE_URL || "";
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ":****@");
    
    // Veritabanındaki son 5 kaydı alalım
    const recentRuns = await prisma.agentRun.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, agentId: true, status: true, createdAt: true }
    });

    const agentCount = await prisma.agentDefinition.count();

    return NextResponse.json({
      connected_to: maskedUrl,
      current_time: new Date().toISOString(),
      agent_count: agentCount,
      recent_runs: recentRuns,
      vercel_region: process.env.VERCEL_REGION || "unknown"
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "DB bağlantı hatası",
      db_url_configured: !!process.env.DATABASE_URL
    }, { status: 500 });
  }
}
