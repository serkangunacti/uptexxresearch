import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAgentForUser } from "@/lib/access";
import { getModelOptionsForCredential } from "@/lib/providers";
import { getCurrentUser } from "@/lib/server-auth";
import { AgentEditorClient } from "../AgentEditorClient";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage(context: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { id } = await context.params;
  const agent = await getAgentForUser(
    session.user,
    id,
    session.user.role === "VIEWER" ? "view" : "manage"
  ).catch(() => null);

  if (!agent) redirect("/agents");

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
        <Link href="/agents" style={{ color: "var(--text-secondary)", textDecoration: "none", marginBottom: "1rem", display: "inline-block" }}>
          &larr; Ajanlara Dön
        </Link>
        <h1>{agent.name}</h1>
        <p className="greeting">{agent.description}</p>
      </header>

      <AgentEditorClient
        mode="edit"
        agent={{
          id: agent.id,
          templateId: agent.templateId,
          slug: agent.slug,
          name: agent.name,
          description: agent.description,
          defaultPrompt: agent.defaultPrompt,
          searchQueries: Array.isArray(agent.searchQueries) ? agent.searchQueries.map((value) => String(value)) : [],
          status: agent.status,
          modelProvider: agent.modelProvider,
          modelName: agent.modelName,
          credentialId: agent.credentialId,
          taskIds: agent.tasks.map((task) => task.taskId),
          assignmentUserIds: agent.assignments.map((assignment) => assignment.userId),
          schedule: {
            timezone: agent.schedule?.timezone || "Europe/Istanbul",
            hour: agent.schedule?.hour || 9,
            minute: agent.schedule?.minute || 0,
            intervalDays: agent.schedule?.intervalDays ?? null,
            daysOfWeek: Array.isArray(agent.schedule?.daysOfWeek)
              ? agent.schedule?.daysOfWeek.map((value) => Number(value))
              : [],
            isActive: agent.schedule?.isActive ?? true,
          },
          rule: {
            preventDuplicates: agent.rule?.preventDuplicates ?? true,
            maxRunsPerDay: agent.rule?.maxRunsPerDay ?? 1,
            maxRunsPerWeek: agent.rule?.maxRunsPerWeek ?? 7,
            maxSourceAgeDays: agent.rule?.maxSourceAgeDays ?? 7,
            dedupeLookbackDays: agent.rule?.dedupeLookbackDays ?? 7,
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
        canAssignUsers={session.user.role === "OWNER_ADMIN"}
        readOnly={session.user.role === "VIEWER"}
      />
    </div>
  );
}
