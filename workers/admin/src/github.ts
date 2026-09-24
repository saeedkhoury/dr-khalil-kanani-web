/**
 * GITHUB CONTENTS CLIENT — the only thing in this Worker that can change the
 * website.
 *
 * ── THE DESIGN RULE ───────────────────────────────────────────────────────
 * A caller CANNOT NAME A PATH. It names a `WriteTarget` — a kind, from a
 * closed union — and this module builds the path from Worker constants. The
 * owner, the repository and the branch are never parameters either.
 *
 * That is deliberately stronger than validating a path string. Validation can
 * be bypassed by a case nobody thought of; a caller that has no way to express
 * "write to .github/workflows/deploy.yml" cannot ask for it at all, however
 * the request was crafted. The allow-list below is a second gate, not the
 * first one.
 *
 * ── WHAT THE TOKEN CAN DO ─────────────────────────────────────────────────
 * GITHUB_TOKEN is expected to be a FINE-GRAINED personal access token scoped
 * to ONE repository with `Contents: Read and write` for content operations
 * and `Actions: Read` for authenticated deployment-run status. No Workflows
 * write, packages, account or organisation scope.
 * The blast radius of a leak should be "can edit content in one repo", and the
 * code below keeps it narrower still.
 *
 * It is read from env only to build an Authorization header. It is never
 * returned, never logged, and never interpolated into a message.
 */

import type { Env } from './http.ts';

/**
 * Fixed. Not configuration, because a caller-influenced or misconfigured
 * repository is the whole attack.
 */
const OWNER = 'saeedkhoury';
const REPO = 'dr-khalil-kanani-web';

const API = 'https://api.github.com';

/** GitHub requires a User-Agent and rejects requests without one. */
const USER_AGENT = 'drkanani-admin-worker';

/* -------------------------------------------------------------------------- */
/*  What may be written                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The complete set of things this Worker can address.
 *
 * `image` carries a filename because there are many of them; the other two are
 * single known files and carry nothing at all, so they cannot be redirected.
 */
export type WriteTarget =
  | { kind: 'hours' }
  | { kind: 'photography' }
  | { kind: 'services' | 'generalFaq' | 'doctorProfile' | 'managedCopy' | 'contactFacts' }
  | { kind: 'image'; file: string };

const HOURS_PATH = 'src/data/hours.json';
const PHOTOGRAPHY_PATH = 'src/data/clinic-photography.json';
const MANAGED_PATHS = Object.freeze({
  services: 'src/data/services.json',
  generalFaq: 'src/data/general-faq.json',
  doctorProfile: 'src/data/doctor-profile.json',
  managedCopy: 'src/data/managed-copy.json',
  contactFacts: 'src/data/contact-facts.json',
});
const IMAGE_DIR = 'src/assets/images';

/**
 * `<category>-<subject>-<nn>.<ext>` per docs/ASSETS.md: lowercase ASCII,
 * hyphen separated, two-digit index. Anchored, so nothing may precede or
 * follow it — no directory component, no second extension, no trailing dot.
 *
 * SVG is absent and must stay absent: it can carry script, and no photograph
 * is a vector.
 */
const IMAGE_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*-\d{2}\.(?:jpg|jpeg|png)$/;

/**
 * Hard length bound, checked separately from the pattern.
 *
 * Generated names are `<category>-<nn>.<ext>`, and the longest category
 * (`treatment-room`, `doctor-working`) yields 21 characters. 64 leaves room
 * for a longer convention without ever approaching a limit that matters:
 * Git and most filesystems cap a path component at 255 bytes, and a name that
 * long could only arrive from a hand-edited manifest.
 *
 * Not left to the request-body cap. A size limit on a request is not a
 * statement about what a filename may be, and relying on one to enforce the
 * other is the kind of coupling that breaks when either is tuned.
 */
const MAX_IMAGE_FILENAME = 64;

/**
 * Resolve a target to a repository path, or refuse.
 *
 * Returns null rather than throwing so that a refusal is a value the caller
 * must handle, not an exception it might catch and continue past.
 */
export function pathFor(target: WriteTarget): string | null {
  switch (target.kind) {
    case 'hours':
      return HOURS_PATH;
    case 'photography':
      return PHOTOGRAPHY_PATH;
    case 'services': case 'generalFaq': case 'doctorProfile': case 'managedCopy': case 'contactFacts':
      return MANAGED_PATHS[target.kind];
    case 'image': {
      const file = target.file;
      if (typeof file !== 'string') return null;
      // UNREACHABLE TODAY, deliberately kept. IMAGE_FILE is anchored and
      // permits neither separators nor dots outside the extension, so nothing
      // reaches this line that the pattern would not also reject — a mutation
      // test confirms removing it changes no behaviour.
      //
      // It stays because the cost is one line and the failure it guards
      // against is a write to .github/workflows/. If IMAGE_FILE is ever
      // loosened, traversal must not become possible as a side effect of an
      // unrelated change to a filename convention.
      if (file.includes('/') || file.includes('\\') || file.includes('..')) return null;
      if (file.length > MAX_IMAGE_FILENAME) return null;
      if (!IMAGE_FILE.test(file)) return null;
      return `${IMAGE_DIR}/${file}`;
    }
    default:
      // An unknown kind is a programming error, and the safe answer is no.
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Commit messages                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The only verbs that can appear in a commit message. A closed union, so the
 * message is never assembled from anything a user typed.
 */
export type CommitVerb =
  | 'update opening hours'
  | 'add clinic photo'
  | 'publish clinic photo'
  | 'unpublish clinic photo'
  | 'delete clinic photo'
  | 'reorder clinic photos'
  | 'replace clinic photo'
  | 'update visual content';

const SCOPE: Record<CommitVerb, 'hours' | 'media' | 'content'> = {
  'update opening hours': 'hours',
  'add clinic photo': 'media',
  'publish clinic photo': 'media',
  'unpublish clinic photo': 'media',
  'delete clinic photo': 'media',
  'reorder clinic photos': 'media',
  'replace clinic photo': 'media',
  'update visual content': 'content',
};

/**
 * Who changed it, as far as the public repository is concerned.
 *
 * Fixed and non-identifying on purpose. The repository is public, and the
 * authenticated address is a personal inbox: written into a commit it is
 * scraped within days and cannot be taken back. Not the address, not part of
 * it, not a name derived from it, not a hash of it (two candidates make any
 * hash trivially reversible). Who actually signed in is known server-side
 * from the verified Access token and the Worker logs, never from Git.
 */
export const CMS_ACTOR = 'CMS admin';

/**
 * Build the commit message. No user-supplied text reaches it: a verb from the
 * union, an optional filename that has already passed IMAGE_FILE, and the
 * fixed CMS_ACTOR label. There is deliberately no parameter an identity could
 * be passed through.
 *
 * Returns null if any of those fails, and the caller must then not commit.
 */
export function commitMessage(
  verb: CommitVerb,
  subject?: string,
  /**
   * Records that the patient-content confirmation was ticked.
   *
   * A boolean selecting a FIXED string — not user text, so the guarantee that
   * no user-controlled content reaches a commit message is unchanged. It
   * exists so the audit trail shows the confirmation was made at the moment
   * the photograph entered the repository, where `git log` still shows it
   * years later.
   */
  patientContentConfirmed?: boolean,
): string | null {
  // Object.hasOwn, NOT `verb in SCOPE`: `in` walks the prototype chain, so
  // 'toString', 'constructor' and friends would pass and produce a commit
  // message reading `cms(undefined): toString`.
  if (!Object.hasOwn(SCOPE, verb)) return null;
  if (subject !== undefined && (subject.length > MAX_IMAGE_FILENAME || !IMAGE_FILE.test(subject))) return null;

  const headline = subject === undefined ? verb : `${verb} ${subject}`;
  const confirmation = patientContentConfirmed === true ? 'Patient-content confirmed: yes\n' : '';
  return `cms(${SCOPE[verb]}): ${headline}\n\nChanged by: ${CMS_ACTOR}\n${confirmation}`;
}

/* -------------------------------------------------------------------------- */
/*  Results                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Why an operation did not succeed.
 *
 * `refused` never reaches the network — it is this module declining to build a
 * request at all. That distinction matters when reading logs: a `refused` is a
 * bug or an attack, never GitHub having a bad day.
 */
export type Failure =
  | 'refused'
  | 'not_configured'
  | 'not_found'
  | 'conflict'
  | 'unauthorized'
  | 'rate_limited'
  | 'unavailable';

export type Result<T> = { ok: true; data: T } | { ok: false; reason: Failure };

const refuse = <T>(reason: Failure): Result<T> => ({ ok: false, reason });

export interface FileContents {
  /** Decoded UTF-8 text. */
  text: string;
  /** Blob SHA, required to update the file. */
  sha: string;
}

/* -------------------------------------------------------------------------- */
/*  Transport                                                                  */
/* -------------------------------------------------------------------------- */

interface Config {
  token: string;
  branch: string;
}

/**
 * Both values must be present and the branch must be explicitly chosen.
 *
 * CONTENT_BRANCH has no default on purpose. Defaulting to `main` would mean a
 * misconfigured deployment publishes to the live website, which is exactly the
 * mistake worth making impossible. Unset means refuse.
 */
function configure(env: Env): Config | null {
  const token = env.GITHUB_TOKEN?.trim();
  const branch = env.CONTENT_BRANCH?.trim();
  if (!token || !branch) return null;
  // A branch name is ours to set, so it can be strict.
  //
  // The control-character check is not redundant with the pattern: in
  // JavaScript `$` matches before a FINAL newline unless `\n` is excluded, so
  // "main\n" satisfies /^[\w]+$/ and would otherwise be accepted.
  if (/[\u0000-\u001f\u007f]/.test(branch)) return null;
  if (!/^[A-Za-z0-9._\/-]{1,255}$/.test(branch) || branch.includes('..')) return null;
  return { token, branch };
}

/** Map a GitHub status onto our vocabulary. Nothing from GitHub is passed on. */
function classify(status: number): Failure {
  if (status === 404) return 'not_found';
  if (status === 409 || status === 422) return 'conflict';
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rate_limited';
  return 'unavailable';
}

async function call(
  config: Config,
  path: string,
  init: { method: 'GET' | 'PUT' | 'DELETE'; body?: unknown; ref?: string },
): Promise<Response> {
  // The path is built by pathFor() from constants, never by a caller, but
  // encode each segment anyway so a future target kind cannot introduce a
  // query string or traversal through this function.
  //
  // The query is appended AFTER encoding and is never part of `path` — an
  // earlier version passed "path?ref=branch" in here, and the '?' was
  // percent-encoded into the filename. GitHub then served the DEFAULT branch,
  // so reads silently came from main while writes went to the content branch.
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const query = init.ref === undefined ? '' : `?ref=${encodeURIComponent(init.ref)}`;
  return fetch(`${API}/repos/${OWNER}/${REPO}/contents/${encoded}${query}`, {
    method: init.method,
    headers: {
      // The only place the token is used.
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': USER_AGENT,
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
}

/** Base64 for the Contents API, chunked so a multi-megabyte image is not a stall. */
function toBase64(content: string | Uint8Array): string {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/* -------------------------------------------------------------------------- */
/*  Read-only queries                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The complete set of non-content endpoints this Worker may query.
 *
 * Same rule as WriteTarget: a caller names a KIND, never a URL. The only
 * caller-supplied value is a commit SHA, and it is validated before it can
 * reach a query string.
 */
export type ReadQuery =
  | { kind: 'runs'; headSha: string }
  | { kind: 'commits'; page?: number; headSha?: string };

/** A git object name. Hex only, so it cannot carry a path or a parameter. */
const SHA = /^[0-9a-f]{7,40}$/;

function queryUrl(query: ReadQuery, branch: string): string | null {
  const base = `${API}/repos/${OWNER}/${REPO}`;
  switch (query.kind) {
    case 'runs': {
      if (typeof query.headSha !== 'string' || !SHA.test(query.headSha)) return null;
      return `${base}/actions/workflows/deploy.yml/runs?head_sha=${query.headSha}&branch=${encodeURIComponent(branch)}&per_page=100`;
    }
    case 'commits': {
      const page = query.page ?? 1;
      if (!Number.isInteger(page) || page < 1 || page > 10) return null;
      if (query.headSha !== undefined && !SHA.test(query.headSha)) return null;
      return `${base}/commits?sha=${encodeURIComponent(query.headSha ?? branch)}&path=src%2Fdata&per_page=100&page=${page}`;
    }
    default:
      return null;
  }
}

/** Authenticated GET against one of the endpoints above. Never writes. */
export async function query<T>(env: Env, request: ReadQuery): Promise<Result<T>> {
  const config = configure(env);
  if (config === null) return refuse('not_configured');

  const url = queryUrl(request, config.branch);
  if (url === null) return refuse('refused');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': USER_AGENT,
    },
  });
  if (!response.ok) return refuse(classify(response.status));
  return { ok: true, data: (await response.json()) as T };
}

/* -------------------------------------------------------------------------- */
/*  Operations                                                                 */
/* -------------------------------------------------------------------------- */

/** Inventory the fixed image directory, including files absent from the manifest. */
export async function listImageFiles(env: Env): Promise<Result<string[]>> {
  const config = configure(env);
  if (config === null) return refuse('not_configured');
  const response = await call(config, IMAGE_DIR, { method: 'GET', ref: config.branch });
  if (!response.ok) return refuse(classify(response.status));
  const body: unknown = await response.json();
  // Contents directory responses cap at 1,000 entries. Never allocate from
  // a potentially truncated inventory or from an unexpected API response.
  if (!Array.isArray(body) || body.length >= 1000 || body.some((entry: unknown) =>
    entry === null || typeof entry !== 'object' || !('name' in entry) || typeof entry.name !== 'string'
  )) return refuse('unavailable');
  return { ok: true, data: body.map((entry: { name: string }) => entry.name) };
}

/** Read a file. `not_found` is a normal answer, not an error. */
export async function readFile(env: Env, target: WriteTarget): Promise<Result<FileContents>> {
  const path = pathFor(target);
  if (path === null) return refuse('refused');
  const config = configure(env);
  if (config === null) return refuse('not_configured');

  const response = await call(config, path, { method: 'GET', ref: config.branch });
  if (!response.ok) return refuse(classify(response.status));

  const body = (await response.json()) as { content?: string; encoding?: string; sha?: string };
  if (typeof body.sha !== 'string' || typeof body.content !== 'string') {
    return refuse('unavailable');
  }
  if (body.encoding !== 'base64') return refuse('unavailable');

  const binary = atob(body.content.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return { ok: true, data: { text: new TextDecoder().decode(bytes), sha: body.sha } };
}

export interface WriteRequest {
  target: WriteTarget;
  content: string | Uint8Array;
  verb: CommitVerb;
  /** Filename for media verbs. Validated against IMAGE_FILE. */
  subject?: string;
  /** Records the patient-content confirmation in the commit message. */
  patientContentConfirmed?: boolean;
  /** Blob SHA being replaced. Omit to create. */
  sha?: string;
}

/** Create or replace a file. Returns the new commit SHA. */
export async function writeFile(env: Env, request: WriteRequest): Promise<Result<{ commit: string }>> {
  const path = pathFor(request.target);
  if (path === null) return refuse('refused');

  const message = commitMessage(
    request.verb, request.subject, request.patientContentConfirmed,
  );
  if (message === null) return refuse('refused');

  const config = configure(env);
  if (config === null) return refuse('not_configured');

  const send = (sha: string | undefined) =>
    call(config, path, {
      method: 'PUT',
      body: {
        message,
        content: toBase64(request.content),
        branch: config.branch,
        ...(sha === undefined ? {} : { sha }),
      },
    });

  const response = await send(request.sha);

  if (!response.ok) return refuse(classify(response.status));

  const body = (await response.json()) as { commit?: { sha?: string } };
  const commit = body.commit?.sha;
  // A 200 with an unreadable body is not a success we are willing to report.
  if (typeof commit !== 'string') return refuse('unavailable');
  return { ok: true, data: { commit } };
}

export interface DeleteRequest {
  target: WriteTarget;
  verb: CommitVerb;
  subject?: string;
  /** Required. Deleting without naming the blob being removed is not offered. */
  sha: string;
}

export async function deleteFile(env: Env, request: DeleteRequest): Promise<Result<{ commit: string }>> {
  const path = pathFor(request.target);
  if (path === null) return refuse('refused');

  const message = commitMessage(request.verb, request.subject);
  if (message === null) return refuse('refused');

  if (typeof request.sha !== 'string' || request.sha === '') return refuse('refused');

  const config = configure(env);
  if (config === null) return refuse('not_configured');

  // Never retried. A delete whose SHA is stale means the file changed under
  // us, and re-reading to delete whatever is there now would destroy a change
  // nobody reviewed.
  const response = await call(config, path, {
    method: 'DELETE',
    body: { message, sha: request.sha, branch: config.branch },
  });
  if (!response.ok) return refuse(classify(response.status));

  const body = (await response.json()) as { commit?: { sha?: string } };
  const commit = body.commit?.sha;
  if (typeof commit !== 'string') return refuse('unavailable');
  return { ok: true, data: { commit } };
}
