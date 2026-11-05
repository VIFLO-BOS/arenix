/**
 * Shapes for the live GitHub activity section. Everything here is aggregated and already
 * masked on the server, so it is safe to send to the browser. Private repository names
 * never appear unless the repository is mapped to a published project in src/config/github.ts.
 */

export type GithubRepoLabel = {
  /** Display name. Mapped repositories use the project title, masked ones read "Private repository". */
  name: string;
  /** Case study link for mapped repositories, or the GitHub URL for public ones. */
  href?: string;
  external?: boolean;
  isPrivate: boolean;
  masked: boolean;
};

export type GithubPush = {
  at: string;
  repo: GithubRepoLabel;
  language: { name: string; color: string } | null;
  commits: number;
  /** Latest commit subject. Only sent for public repositories. */
  headline: string | null;
};

export type GithubLanguageShare = {
  name: string;
  bytes: number;
  share: number;
  color: string;
};

export type GithubSnapshot = {
  username: string;
  profileUrl: string;
  /** When the core numbers were read from GitHub. */
  fetchedAt: string;
  /** When the slower per repository statistics were read, or null when unavailable. */
  statsFetchedAt: string | null;
  totals: {
    repositories: number;
    publicRepositories: number;
    privateRepositories: number;
    commits: number;
    contributionsYear: number;
    stars: number;
    forks: number;
    watchers: number;
    linesAdded: number | null;
    linesDeleted: number | null;
    /** Repository page views over the last 14 days, as reported by GitHub traffic. */
    views: number | null;
    clones: number | null;
    /** Repositories whose line counts GitHub was still computing at the last read. */
    pendingRepositories: number;
  };
  lastPush: GithubPush | null;
  recent: GithubPush[];
  /** Contribution calendar, oldest week first. The first week may be partial (starts mid week). */
  calendar: { firstDay: string; weeks: number[][] };
  languages: GithubLanguageShare[];
};
