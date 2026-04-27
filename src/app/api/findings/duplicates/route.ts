import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!agentId) {
    return NextResponse.json(
      { error: "agentId parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Find findings that have duplicates
    const duplicates = await prisma.reportFinding.findMany({
      where: {
        report: { agentId },
        isDuplicate: true
      },
      include: {
        report: {
          select: { title: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Group by content hash to show duplicate groups
    const duplicateGroups = new Map();

    for (const finding of duplicates) {
      const hash = await prisma.findingHash.findFirst({
        where: { reportFindingId: finding.id }
      });

      if (hash) {
        if (!duplicateGroups.has(hash.contentHash)) {
          duplicateGroups.set(hash.contentHash, []);
        }
        duplicateGroups.get(hash.contentHash).push(finding);
      }
    }

    // Convert to array and sort by group size
    const groups = Array.from(duplicateGroups.entries())
      .map(([hash, findings]) => ({
        contentHash: hash,
        count: findings.length,
        findings: findings.slice(0, 5), // Show first 5
        originalTitle: findings[0]?.title || 'Unknown'
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      groups,
      totalGroups: groups.length,
      totalDuplicates: duplicates.length
    });
  } catch (error) {
    console.error("Duplicates fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch duplicates" },
      { status: 500 }
    );
  }
}