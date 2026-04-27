const WORKFLOW_FILE = "agent-runner.yml";

export async function dispatchAgentRun(agentId: string, runId: string) {
  const githubToken = process.env.GITHUB_PAT;
  const githubRepo = process.env.GITHUB_REPO;
  const githubRef = process.env.GITHUB_WORKFLOW_REF || "main";

  if (!githubToken || !githubRepo) {
    throw new Error("GITHUB_PAT veya GITHUB_REPO cevre degiskenleri eksik.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${githubRepo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        ref: githubRef,
        inputs: {
          agentId,
          runId,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub Actions tetiklenemedi: ${response.status} ${response.statusText} - ${errorText}`);
  }
}
