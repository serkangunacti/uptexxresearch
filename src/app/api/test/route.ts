import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/server-auth";
import { searchWeb } from "@/lib/search";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const session = await requireUser("VIEWER");
    const credentialCount = await prisma.apiCredential.count({
      where: { companyId: session.user.companyId, isActive: true },
    });
    const results: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      activeCredentialCount: credentialCount,
    };

    try {
      const searchResults = await searchWeb("Uptexx IT consulting", 3);
      results.search = {
        ok: searchResults.length > 0,
        count: searchResults.length,
        sample: searchResults[0] ?? null,
      };
    } catch (error) {
      results.search = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    results.credentials = {
      ok: credentialCount > 0,
      message:
        credentialCount > 0
          ? "Tenant için en az bir aktif provider key tanımlı."
          : "Bu tenant için henüz aktif provider key tanımlı değil.",
    };

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
