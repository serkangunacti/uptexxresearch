import { NextResponse } from "next/server";
import { createCredential, listCredentialsForCompany } from "@/lib/credentials";
import { getProviderCatalog } from "@/lib/providers";
import { requireUser } from "@/lib/server-auth";
import { enforceRateLimit, writeAuditLog } from "@/lib/governance";

export const dynamic = "force-dynamic";
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const session = await requireUser("OWNER_ADMIN");
    const credentials = await listCredentialsForCompany(session.user.companyId);
    return NextResponse.json(
      {
        credentials: credentials.map((credential) => ({
          id: credential.id,
          provider: credential.provider,
          planType: credential.planType,
          label: credential.label,
          maskedKeyPreview: credential.maskedKeyPreview,
          baseUrl: credential.baseUrl,
          modelOverrides: credential.modelOverrides ?? [],
          isActive: credential.isActive,
          createdAt: credential.createdAt,
          updatedAt: credential.updatedAt,
          lastUsedAt: credential.lastUsedAt,
        })),
        providers: getProviderCatalog(),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser("OWNER_ADMIN");
    await enforceRateLimit("credential-mutation", `${session.user.companyId}:${session.user.id}`, 30, 60);
    const body = await request.json();
    if (!body.apiKey || !body.provider || !body.planType || !body.label) {
      return NextResponse.json({ error: "Eksik alanlar var." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const credential = await createCredential({
      companyId: session.user.companyId,
      createdByUserId: session.user.id,
      provider: body.provider,
      planType: String(body.planType),
      label: String(body.label),
      apiKey: String(body.apiKey),
      baseUrl: body.baseUrl ? String(body.baseUrl) : null,
      modelOverrides: Array.isArray(body.modelOverrides)
        ? body.modelOverrides.map((value: unknown) => String(value))
        : String(body.modelOverrides ?? "")
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
    });

    await writeAuditLog({
      companyId: session.user.companyId,
      userId: session.user.id,
      action: "credential.created",
      targetType: "ApiCredential",
      targetId: credential.id,
      metadata: {
        provider: credential.provider,
        label: credential.label,
        planType: credential.planType,
      },
    });

    return NextResponse.json({ success: true, credentialId: credential.id }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return authError(error);
  }
}

function authError(error: unknown) {
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
