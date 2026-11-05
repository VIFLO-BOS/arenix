import { githubConfig } from "@/config/github";
import { getGithubSnapshot } from "@/server/integrations/github";
import { GithubPulse } from "@/components/marketing/github-pulse";

/** Server half of the live GitHub section. Rendered inside Suspense so the page never waits on it. */
export async function GithubActivity() {
  const snapshot = await getGithubSnapshot();
  if (!snapshot) {
    return (
      <p className="card mt-10 p-6 text-sm text-[var(--fg-muted)]">
        Live activity from GitHub is unavailable right now. The numbers return on the next refresh.
      </p>
    );
  }
  return <GithubPulse initial={snapshot} pollSeconds={githubConfig.clientPollSeconds} />;
}
