import { NextResponse } from "next/server";
import { installCatalogTemplate } from "@/lib/catalog";
import { jsonError } from "@/lib/api-errors";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireUser("OWNER_ADMIN");
    const body = await request.json();

    const agent = await installCatalogTemplate({
      user: session.user,
      templateId: String(body.templateId || ""),
      credentialId: String(body.credentialId || ""),
      modelName: String(body.modelName || ""),
      name: typeof body.name === "string" ? body.name : undefined,
      config: body.config && typeof body.config === "object" ? body.config : {},
    });

    return NextResponse.json({ success: true, agentId: agent.id });
  } catch (error) {
    return jsonError(error);
  }
}
