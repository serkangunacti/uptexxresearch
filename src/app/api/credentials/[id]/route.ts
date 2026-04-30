import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/server-auth";
import { enforceRateLimit, writeAuditLog } from "@/lib/governance";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser("OWNER_ADMIN");
    await enforceRateLimit("credential-mutation", `${session.user.companyId}:${session.user.id}`, 30, 60);
    const { id } = await context.params;

    const credential = await prisma.apiCredential.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!credential) {
      return NextResponse.json({ error: "Bulunamadı" }, { status: 404, headers: NO_STORE_HEADERS });
    }

    await prisma.agent.updateMany({
      where: { credentialId: credential.id, companyId: session.user.companyId },
      data: { credentialId: null },
    });

    await prisma.apiCredential.delete({
      where: { id: credential.id },
    });

    await writeAuditLog({
      companyId: session.user.companyId,
      userId: session.user.id,
      action: "credential.deleted",
      targetType: "ApiCredential",
      targetId: credential.id,
      metadata: { provider: credential.provider, label: credential.label },
    });

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE_HEADERS });
    }
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return NextResponse.json({ error: "Çok fazla istek yapıldı." }, { status: 429, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
