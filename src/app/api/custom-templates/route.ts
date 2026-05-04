import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api-errors";
import { canCreateCustomTemplate, requireCompanySubscription } from "@/lib/catalog";
import { buildCustomTemplateSeed } from "@/lib/template-builder";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireUser("OWNER_ADMIN");
    const subscription = await requireCompanySubscription(session.user.companyId);

    if (!canCreateCustomTemplate(session.user, subscription)) {
      throw new Error("CUSTOM_TEMPLATE_RESTRICTED");
    }

    const body = await request.json();
    const seed = buildCustomTemplateSeed({
      name: body.name,
      description: body.description,
      category: body.category,
      defaultPrompt: body.defaultPrompt,
      defaultQueries: body.defaultQueries,
      tasks: body.tasks,
      sources: body.sources,
      configFields: body.configFields,
      requiredMetadataFields: body.requiredMetadataFields,
      outputFindingKind: body.outputFindingKind,
      suggestedProvider: body.suggestedProvider,
      visibilityPackageKey: "PREMIUM",
      schedule: body.schedule,
      rule: body.rule,
      companyId: session.user.companyId,
      origin: "TENANT_CUSTOM",
    });

    const template = await prisma.agentTemplate.create({
      data: {
        id: seed.id,
        companyId: session.user.companyId,
        name: seed.name,
        category: seed.category,
        description: seed.description,
        defaultPrompt: seed.defaultPrompt,
        defaultQueries: seed.defaultQueries,
        defaultTasks: seed.defaultTasks,
        defaultSchedule: seed.defaultSchedule,
        defaultRule: seed.defaultRule,
        suggestedProvider: seed.suggestedProvider,
        origin: "TENANT_CUSTOM",
        lifecycle: "ACTIVE",
        isSelectable: true,
        configSchema: seed.configSchema ?? [],
        sourceCatalog: seed.sourceCatalog ?? [],
        taskBlueprints: seed.taskBlueprints ?? [],
        outputSchema: seed.outputSchema ?? {},
      },
    });

    const premiumPackage = await prisma.planPackage.findUnique({
      where: { key: "PREMIUM" },
      select: { id: true },
    });

    if (premiumPackage) {
      await prisma.planPackageAgentTemplate.create({
        data: {
          packageId: premiumPackage.id,
          templateId: template.id,
        },
      });
    }

    return NextResponse.json({ success: true, templateId: template.id });
  } catch (error) {
    return jsonError(error);
  }
}
