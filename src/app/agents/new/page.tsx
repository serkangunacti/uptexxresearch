import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/server-auth";
import { getModelOptionsForCredential } from "@/lib/providers";
import { AgentEditorClient } from "../AgentEditorClient";

export const dynamic = "force-dynamic";

export default async function NewAgentPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  if (session.user.role !== "OWNER_ADMIN") redirect("/agents");

  const [templates, tasks, users, credentials] = await Promise.all([
    prisma.agentTemplate.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.task.findMany({
      where: { companyId: session.user.companyId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.apiCredential.findMany({
      where: { companyId: session.user.companyId, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Yeni Ajan</h1>
      </header>
      <AgentEditorClient
        mode="create"
        agent={{
          slug: "",
          name: "",
          description: "",
          defaultPrompt: "",
          searchQueries: [],
          status: "ACTIVE",
          modelProvider: null,
          modelName: null,
          credentialId: null,
          taskIds: [],
          assignmentUserIds: [],
          schedule: {
            timezone: "Europe/Istanbul",
            hour: 9,
            minute: 0,
            intervalDays: null,
            daysOfWeek: [],
            isActive: true,
          },
          rule: {
            preventDuplicates: true,
            maxRunsPerDay: 1,
            maxRunsPerWeek: 7,
            maxSourceAgeDays: 7,
            dedupeLookbackDays: 7,
          },
        }}
        templates={templates}
        tasks={tasks}
        users={users}
        credentials={credentials.map((credential) => ({
          id: credential.id,
          label: credential.label,
          provider: credential.provider,
          planType: credential.planType,
          maskedKeyPreview: credential.maskedKeyPreview,
          models: getModelOptionsForCredential(credential),
        }))}
        canAssignUsers
      />
    </div>
  );
}
