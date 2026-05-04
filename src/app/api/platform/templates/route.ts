import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api-errors";
import { assertPlatformAdmin } from "@/lib/catalog";
import { buildCustomTemplateSeed } from "@/lib/template-builder";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser("OWNER_ADMIN");
    assertPlatformAdmin(session.user);

    const [templates, packages] = await Promise.all([
      prisma.agentTemplate.findMany({
        include: {
          packageLinks: {
            include: {
              package: true,
            },
          },
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      prisma.planPackage.findMany({
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return NextResponse.json({ templates, packages });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser("OWNER_ADMIN");
    assertPlatformAdmin(session.user);
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
      visibilityPackageKey: body.visibilityPackageKey,
      schedule: body.schedule,
      rule: body.rule,
      origin: "GLOBAL_CUSTOM",
    });

    const created = await prisma.agentTemplate.create({
      data: {
        id: seed.id,
        name: seed.name,
        category: seed.category,
        description: seed.description,
        defaultPrompt: seed.defaultPrompt,
        defaultQueries: seed.defaultQueries,
        defaultTasks: seed.defaultTasks,
        defaultSchedule: seed.defaultSchedule,
        defaultRule: seed.defaultRule,
        suggestedProvider: seed.suggestedProvider,
        origin: "GLOBAL_CUSTOM",
        lifecycle: "ACTIVE",
        isSelectable: true,
        configSchema: seed.configSchema ?? [],
        sourceCatalog: seed.sourceCatalog ?? [],
        taskBlueprints: seed.taskBlueprints ?? [],
        outputSchema: seed.outputSchema ?? {},
      },
    });

    if (seed.visibilityPackageKey) {
      const pkg = await prisma.planPackage.findUnique({
        where: { key: seed.visibilityPackageKey },
        select: { id: true },
      });

      if (pkg) {
        await prisma.planPackageAgentTemplate.create({
          data: {
            packageId: pkg.id,
            templateId: created.id,
          },
        });
      }
    }

    return NextResponse.json({ success: true, templateId: created.id });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireUser("OWNER_ADMIN");
    assertPlatformAdmin(session.user);
    const body = await request.json();
    const templateId = String(body.templateId || "");
    const requiredPackageKey = body.requiredPackageKey ? String(body.requiredPackageKey) : null;

    const updated = await prisma.agentTemplate.update({
      where: { id: templateId },
      data: {
        lifecycle: body.lifecycle ? String(body.lifecycle) as never : undefined,
        isSelectable: typeof body.isSelectable === "boolean" ? body.isSelectable : undefined,
        description: typeof body.description === "string" ? body.description : undefined,
      },
    });

    if (requiredPackageKey) {
      const pkg = await prisma.planPackage.findUnique({
        where: { key: requiredPackageKey as never },
        select: { id: true },
      });

      if (pkg) {
        await prisma.planPackageAgentTemplate.deleteMany({
          where: { templateId },
        });

        if (requiredPackageKey === "FREE") {
          await prisma.planPackageAgentTemplate.deleteMany({
            where: {
              package: { is: { key: "FREE" } },
              templateId: { not: templateId },
            },
          });
        }

        await prisma.planPackageAgentTemplate.create({
          data: {
            packageId: pkg.id,
            templateId,
          },
        });
      }
    }

    return NextResponse.json({ success: true, template: updated });
  } catch (error) {
    return jsonError(error);
  }
}
