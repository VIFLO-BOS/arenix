/**
 * Live GitHub activity on the homepage.
 *
 * GITHUB_TOKEN is read on the server only. Use a fine grained personal access token with
 * read only access to the account's repositories and these repository permissions:
 * Metadata (read), Contents (read) and Administration (read, needed for traffic views).
 * Without a token the section is hidden in production.
 *
 * Every repository counts toward the totals, but a private repository is only named on the
 * site when it is listed here and linked to a published case study. Unlisted private
 * repositories appear as "Private repository". Public repositories are named as they are.
 */
export const githubConfig = {
  username: process.env.GITHUB_USERNAME || "VIFLO-BOS",
  /** Core numbers (repositories, commits, contributions, last push) refresh this often. */
  coreRevalidateSeconds: 120,
  /** Line counts and traffic need one request per repository, so they refresh less often. */
  statsRevalidateSeconds: 1800,
  /** How often an open homepage asks for fresh numbers while the section is on screen. */
  clientPollSeconds: 60,
  /** Repository name (case insensitive) to the label and case study shown for it. */
  repositories: {
    ShopMe: { label: "ShopMe", project: "shopme" },
    leadforge: { label: "LeadForge", project: "leadforge" },
    khreoolife: { label: "Khreeolife", project: "khreeolife" },
    "gilesfc-preview": { label: "Giles Financial Consulting", project: "giles-financial-consulting" },
    ArenoX: { label: "ArenoX LMS", project: "arenox-lms" },
    data_base: { label: "Paylio Staff Management", project: "paylio-staff-management" },
    clenest: { label: "CleNest", project: "clenest" },
    "passion-nutrition-clinic": { label: "Passion Nutrition Clinic", project: "passion-nutrition-clinic" },
    annotrix: { label: "Annotrix", project: "annotrix" },
    nethuk: { label: "netHuk", project: "nethuk" },
    "arenix-branch-manager-platform": { label: "AreniX Branch Manager", project: "arenix-branch-manager" },
    arenix: { label: "areniX website" },
  } as Record<string, { label: string; project?: string }>,
} as const;
