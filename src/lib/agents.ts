import { prisma } from "./db";
import { AGENT_DEFINITIONS } from "./agent-definitions";

export async function ensureAgents() {
  await Promise.all(
    AGENT_DEFINITIONS.map((agent) =>
      prisma.agent.upsert({
        where: { id: agent.id },
        create: {
          id: agent.id,
          slug: agent.slug,
          name: agent.name,
          description: agent.description,
          cadence: agent.cadence,
          scheduleLabel: agent.scheduleLabel,
          defaultPrompt: agent.prompt,
          status: agent.status
        },
        update: {
          slug: agent.slug,
          name: agent.name,
          description: agent.description,
          cadence: agent.cadence,
          scheduleLabel: agent.scheduleLabel,
          defaultPrompt: agent.prompt,
          status: agent.status
        }
      })
    )
  );
}
