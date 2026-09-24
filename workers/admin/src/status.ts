/**
 * PUBLICATION STATUS.
 *
 * ── A COMMIT IS NOT A PUBLICATION ─────────────────────────────────────────
 * GitHub accepting a commit means the change is recorded, not that it is on
 * the website. Between the two sits a workflow that runs the claims linter,
 * the mixed-script linter, the asset guard, astro check, the unit tests, the
 * build's launch gate, the accessibility audit and the Playwright suite — any
 * of which can refuse it.
 *
 * So `published` is set ONLY on conclusion: success. The two states are never
 * conflated, because telling the doctor his corrected opening hours are live
 * when they are not is how a patient arrives at a locked door.
 *
 * ── WHEN IT FAILS, THE SITE IS FINE ───────────────────────────────────────
 * GitHub Pages keeps serving the last successful deployment, so a rejected
 * change cannot break the live site. The UI must say that precisely: the
 * change is not live, and the previous version is still being served.
 */

import { query, type Result } from './github.ts';

export type PublishState = 'committed' | 'published' | 'failed';

export interface PublishStatus {
  state: PublishState;
  /** ISO timestamp of the run's completion, when it has one. */
  completedAt: string | null;
  /**
   * Why it failed, as a STABLE KEY — never GitHub's own text, which is
   * English, changes without notice, and can carry detail the panel should
   * not render.
   */
  reason: string | null;
}

interface WorkflowRun {
  status?: string;
  conclusion?: string | null;
  updated_at?: string;
  head_sha?: string;
}

/** Conclusions that mean the change did not reach the site. */
const FAILURE_REASON: Record<string, string> = {
  failure: 'checks_failed',
  timed_out: 'timed_out',
  cancelled: 'cancelled',
  action_required: 'action_required',
  startup_failure: 'startup_failure',
  stale: 'stale',
  neutral: 'checks_failed',
  skipped: 'checks_failed',
};

/**
 * Map workflow runs for one commit onto a single state.
 *
 * With several runs for a SHA the strictest answer wins: any failure is a
 * failure, and every run must have concluded successfully before the change
 * is called published.
 */
export function classifyRuns(runs: readonly WorkflowRun[]): PublishStatus {
  if (runs.length === 0) {
    // No run yet. The commit exists and the workflow has not been observed —
    // which is `committed`, not `failed` and certainly not `published`.
    return { state: 'committed', completedAt: null, reason: null };
  }

  const completedAt = runs
    .map((run) => run.updated_at)
    .filter((value): value is string => typeof value === 'string')
    .sort()
    .at(-1) ?? null;

  for (const run of runs) {
    const conclusion = run.conclusion ?? '';
    if (run.status === 'completed' && conclusion !== 'success') {
      return {
        state: 'failed',
        completedAt,
        reason: FAILURE_REASON[conclusion] ?? 'checks_failed',
      };
    }
  }

  const allDone = runs.every((run) => run.status === 'completed' && run.conclusion === 'success');
  return allDone
    ? { state: 'published', completedAt, reason: null }
    : { state: 'committed', completedAt: null, reason: null };
}

/** Status for one commit. */
export async function statusForSha(env: Parameters<typeof query>[0], sha: string): Promise<Result<PublishStatus>> {
  const result = await query<{ workflow_runs?: WorkflowRun[] }>(env, { kind: 'runs', headSha: sha });
  if (!result.ok) return result;
  const runs = result.data?.workflow_runs;
  if (!Array.isArray(runs) || runs.length >= 100 || runs.some((run) =>
    run === null || typeof run !== 'object' || run.head_sha !== sha
  )) return { ok: false, reason: 'unavailable' };
  return { ok: true, data: classifyRuns(runs) };
}

interface Commit {
  sha?: string;
  commit?: { message?: string; author?: { date?: string } };
}

/**
 * The most recent CMS commit on the content branch.
 *
 * This is what the panel asks for when localStorage is empty — a new device, a
 * cleared browser, a different phone. The doctor should always be able to see
 * where his last change got to, and browser state is a convenience rather than
 * the mechanism.
 */
export function findLatestCmsCommit(commits: readonly Commit[]): { sha: string; at: string | null } | null {
  for (const entry of commits) {
    const message = entry.commit?.message ?? '';
    // The `cms(` prefix is what makes the history queryable, by the panel now
    // and by `git log --grep '^cms('` at any time.
    if (typeof entry.sha === 'string' && message.startsWith('cms(')) {
      return { sha: entry.sha, at: entry.commit?.author?.date ?? null };
    }
  }
  return null;
}

export async function latestStatus(env: Parameters<typeof query>[0]): Promise<Result<
  (PublishStatus & { sha: string; committedAt: string | null }) | null
>> {
  // Narrow discovery to data history, then page against a fixed commit so
  // concurrent pushes cannot move the pagination window. Tracking a known
  // SHA goes straight to the deployment workflow and never scans history.
  let headSha: string | undefined;
  for (let page = 1; page <= 10; page += 1) {
    const commits = await query<Commit[]>(env, { kind: 'commits', page, headSha });
    if (!commits.ok) return commits;
    if (!Array.isArray(commits.data) || commits.data.some((entry) =>
      !entry || typeof entry.sha !== 'string' || !/^[0-9a-f]{40}$/.test(entry.sha) ||
      typeof entry.commit?.message !== 'string'
    )) return { ok: false, reason: 'unavailable' };
    headSha ??= commits.data[0]?.sha;
    const latest = findLatestCmsCommit(commits.data);
    if (latest !== null) {
      const status = await statusForSha(env, latest.sha);
      if (!status.ok) return status;
      return { ok: true, data: { sha: latest.sha, committedAt: latest.at, ...status.data } };
    }
    if (commits.data.length < 100) return { ok: true, data: null };
  }
  // Bound Worker work, but never turn incomplete history into "no change".
  return { ok: false, reason: 'unavailable' };
}

export type PreviewState = 'none' | 'building' | 'ready' | 'failed' | 'unavailable';

/**
 * Whether Edit Mode itself has been rebuilt with a commit.
 *
 * The admin pages are a static build, so a save is visible in the page only
 * after the preview workflow redeploys it. Without this the doctor saved,
 * reloaded, saw the old page and reasonably concluded the save had failed.
 *
 * A cancelled run was superseded by a newer commit (the workflow cancels in
 * progress), and the newer run includes this one's change.
 */
export async function previewForSha(env: Parameters<typeof query>[0], sha: string): Promise<PreviewState> {
  const result = await query<{ workflow_runs?: WorkflowRun[] }>(env, { kind: 'previewRuns', headSha: sha });
  if (!result.ok) return 'unavailable';
  const runs = result.data?.workflow_runs;
  if (!Array.isArray(runs)) return 'unavailable';
  if (runs.length === 0) return 'none';
  // The job is skipped when this branch is not the configured deploy branch
  // or no deploy credential exists — preview is not set up, which is not a
  // failure and must not be reported as one.
  if (runs.every((run) => run.conclusion === 'skipped')) return 'none';
  if (runs.some((run) => run.status === 'completed' && run.conclusion === 'success')) return 'ready';
  if (runs.some((run) => run.status !== 'completed')) return 'building';
  if (runs.every((run) => run.conclusion === 'cancelled')) return 'building';
  return 'failed';
}
