import { NextResponse } from "next/server";
import { getCatalogTemplatesForUser } from "@/lib/catalog";
import { jsonError } from "@/lib/api-errors";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser("VIEWER");
    const payload = await getCatalogTemplatesForUser(session.user);
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
