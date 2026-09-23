/**
 * ADMIN WORKER — admin.drkhalilkanani.com
 *
 * Authenticates every request against Cloudflare Access, then serves the two
 * jobs the clinic owner actually has: opening hours, and clinic photographs.
 *
 * Deliberately absent: any credential it does not need, any route that is not
 * listed below, any development authentication bypass.
 *
 * See docs/specs/2026-09-22-admin-cms-plan.md.
 */

import { authenticate, type AccessIdentity } from './auth.ts';
import { fail, ok, readJson, sameOrigin, type Env } from './http.ts';
import { parseHours, serialiseHours, validateHoursPayload } from './hours.ts';
import {
  addRecord, parseRecords, removeRecord, serialiseRecords, setStatus, validateUpload,
  MAX_IMAGE_BYTES, nextFilename,
} from './media.ts';
import { deleteFile, listImageFiles, readFile, writeFile, type CommitVerb } from './github.ts';
import { latestStatus, statusForSha } from './status.ts';
import { renderPanel } from './ui/page.ts';
import { CLIENT } from './ui/client.ts';
import { PANEL_CSP, SECURITY_HEADERS } from './http.ts';
import { STYLES } from './ui/styles.ts';

/** Hours are seven short rows. Anything larger is not a week. */
const MAX_HOURS_BODY = 8 * 1024;

/**
 * An 8 MB image is ~10.7 MB once base64-encoded, plus the descriptions.
 * The real cap is on the DECODED bytes in validateUpload; this only stops an
 * absurd body before it is parsed.
 */
const MAX_PHOTO_BODY = 12 * 1024 * 1024;

/** A file name plus an action. Nothing here is large. */
const MAX_ACTION_BODY = 4 * 1024;

interface Context {
  request: Request;
  env: Env;
  identity: AccessIdentity;
}

interface Route {
  /** Methods this route answers. Anything else is 405, never a fallthrough. */
  methods: readonly string[];
  handle: (context: Context) => Response | Promise<Response>;
}

/** Map a GitHub client failure onto the response vocabulary. */
function upstream(reason: string): Response {
  if (reason === 'not_configured') return fail('NOT_CONFIGURED');
  if (reason === 'conflict') return fail('CONFLICT');
  if (reason === 'not_found') return fail('NOT_FOUND');
  // 'unauthorized' from GitHub is OUR misconfiguration, not the caller's, and
  // must never be reported as though the caller failed to authenticate.
  return fail('UPSTREAM_UNAVAILABLE');
}

/* -------------------------------------------------------------------------- */
/*  Handlers                                                                   */
/* -------------------------------------------------------------------------- */

async function getHours({ env }: Context): Promise<Response> {
  const file = await readFile(env, { kind: 'hours' });
  if (!file.ok) return upstream(file.reason);

  const rows = parseHours(file.data.text);
  // The repository holding hours the schema rejects is a real state — someone
  // hand-edited the file — and the panel must say so rather than render
  // nonsense or silently offer to overwrite it.
  if (rows === null) return fail('UPSTREAM_UNAVAILABLE');

  return ok({ rows, sha: file.data.sha });
}

async function putHours({ request, env, identity }: Context): Promise<Response> {
  if (!sameOrigin(request, env)) return fail('FORBIDDEN');

  const body = await readJson<unknown>(request, MAX_HOURS_BODY);
  if (!body.ok) return fail(body.code);

  // Named `submitted`, not `payload`: in a Worker that also verifies JWTs,
  // "payload" reads as the token's claims, and a structural test keeps that
  // word out of the routing layer so the two can never be confused.
  const submitted = (body.body as { rows?: unknown })?.rows;
  const validated = validateHoursPayload(submitted);
  if (!validated.ok) return fail('INVALID', validated.issues);

  // Read-then-write. The SHA comes from the repository, never from the client,
  // so a caller cannot aim the write at a revision of its choosing.
  const current = await readFile(env, { kind: 'hours' });
  if (!current.ok) return upstream(current.reason);

  const result = await writeFile(env, {
    target: { kind: 'hours' },
    content: serialiseHours(validated.rows),
    verb: 'update opening hours',
    actor: identity.email,
    sha: current.data.sha,
    // Safe: hours are replaced wholesale, so re-applying reproduces exactly
    // what the doctor asked for. Appending a photograph is not idempotent and
    // must never set this.
    retryOnConflict: true,
  });
  if (!result.ok) return upstream(result.reason);

  // The commit SHA is how the panel tracks publication. A commit is not a
  // publication, and the two are never conflated.
  return ok({ sha: result.data.commit });
}

/* -------------------------------------------------------------------------- */
/*  Clinic photography                                                         */
/* -------------------------------------------------------------------------- */

/** Read the manifest, or produce the response explaining why we could not. */
async function loadRecords(env: Env) {
  const file = await readFile(env, { kind: 'photography' });
  if (!file.ok) return { ok: false as const, response: upstream(file.reason) };
  const records = parseRecords(file.data.text);
  // A hand-edited manifest the build would reject is a real state, and the
  // panel must say so rather than silently offer to overwrite it.
  if (records === null) return { ok: false as const, response: fail('UPSTREAM_UNAVAILABLE') };
  return { ok: true as const, records, sha: file.data.sha };
}

async function getPhotos({ env }: Context): Promise<Response> {
  const loaded = await loadRecords(env);
  if (!loaded.ok) return loaded.response;
  return ok({ records: loaded.records, sha: loaded.sha });
}

/**
 * Decode base64 image bytes from the request.
 *
 * Returns null on anything that is not valid base64, rather than throwing —
 * a malformed upload is a 400, not a 500.
 */
function decodeBase64(value: unknown): Uint8Array | null {
  if (typeof value !== 'string' || value === '') return null;
  // Reject anything outside the base64 alphabet before atob, which is lenient
  // about some invalid input.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

interface UploadBody {
  category?: unknown;
  contentBase64?: unknown;
  altHe?: unknown;
  altAr?: unknown;
  confirmed?: unknown;
}

async function postPhoto({ request, env, identity }: Context): Promise<Response> {
  if (!sameOrigin(request, env)) return fail('FORBIDDEN');

  const body = await readJson<UploadBody>(request, MAX_PHOTO_BODY);
  if (!body.ok) return fail(body.code);

  const bytes = decodeBase64(body.body?.contentBase64);
  if (bytes === null) return fail('INVALID', ['file_required']);
  if (bytes.length > MAX_IMAGE_BYTES) return fail('INVALID', ['file_too_large']);

  const loaded = await loadRecords(env);
  if (!loaded.ok) return loaded.response;

  const validated = validateUpload(
    {
      category: body.body?.category,
      bytes,
      altHe: body.body?.altHe,
      altAr: body.body?.altAr,
      confirmed: body.body?.confirmed,
    },
    loaded.records.map((r) => r.file),
  );
  if (!validated.ok) return fail('INVALID', validated.issues);

  const inventory = await listImageFiles(env);
  if (!inventory.ok) return upstream(inventory.reason);
  const filename = nextFilename(validated.record.category,
    [...loaded.records.map((r) => r.file), ...inventory.data], validated.image.extension);
  if (filename === null) return fail('INVALID', ['category_full']);
  const record = { ...validated.record, file: filename };
  const updated = addRecord(loaded.records, record);
  if (updated === null) return fail('CONFLICT');

  // ── ORDER MATTERS ──
  // The IMAGE is committed first, then the manifest that references it. If the
  // second commit fails, the repository holds an unreferenced file — which
  // renders nothing and breaks nothing. The reverse order would publish a
  // manifest pointing at a file that does not exist, and the build's asset
  // guard would then fail every subsequent deployment.
  const image = await writeFile(env, {
    target: { kind: 'image', file: record.file },
    content: bytes,
    verb: 'add clinic photo',
    actor: identity.email,
    subject: record.file,
    patientContentConfirmed: true,
    // NEVER retried: an append is not idempotent and a retry could double-add.
  });
  if (!image.ok) return upstream(image.reason);

  const manifest = await writeFile(env, {
    target: { kind: 'photography' },
    content: serialiseRecords(updated),
    verb: 'add clinic photo',
    actor: identity.email,
    subject: record.file,
    patientContentConfirmed: true,
    sha: loaded.sha,
  });
  if (!manifest.ok) return upstream(manifest.reason);

  return ok({ sha: manifest.data.commit, file: record.file });
}

/** publish / unpublish / delete all name one existing file. */
async function photoAction(
  { request, env, identity }: Context,
  action: 'publish' | 'unpublish' | 'delete',
): Promise<Response> {
  if (!sameOrigin(request, env)) return fail('FORBIDDEN');

  const body = await readJson<{ file?: unknown }>(request, MAX_ACTION_BODY);
  if (!body.ok) return fail(body.code);

  const file = body.body?.file;
  if (typeof file !== 'string' || file === '') return fail('INVALID', ['file_required']);

  const loaded = await loadRecords(env);
  if (!loaded.ok) return loaded.response;

  const verb: CommitVerb =
    action === 'publish' ? 'publish clinic photo'
    : action === 'unpublish' ? 'unpublish clinic photo'
    : 'delete clinic photo';

  const updated =
    action === 'delete'
      ? removeRecord(loaded.records, file)
      : setStatus(loaded.records, file, action === 'publish' ? 'published' : 'unpublished');

  // null covers both "no such photograph" and "delete refused because it is
  // still published" — deleting is reachable only from the unpublished state,
  // so a photograph can never be destroyed in a single click.
  if (updated === null) return fail('INVALID', ['photo_not_actionable']);

  const manifest = await writeFile(env, {
    target: { kind: 'photography' },
    content: serialiseRecords(updated),
    verb,
    actor: identity.email,
    subject: file,
    sha: loaded.sha,
  });
  if (!manifest.ok) return upstream(manifest.reason);

  if (action !== 'delete') return ok({ sha: manifest.data.commit, file });

  // ── ORDER MATTERS, mirrored ──
  // The reference is removed first, then the file. If this second commit
  // fails the repository holds an orphan image, which renders nothing. The
  // reverse would leave the manifest pointing at a deleted file and break the
  // build for everyone.
  const current = await readFile(env, { kind: 'image', file });
  if (!current.ok) {
    // The record is already gone, which is the part that matters. Report
    // success and let the orphan be cleaned up by a developer.
    console.warn(JSON.stringify({ event: 'orphan_image', file, reason: current.reason }));
    return ok({ sha: manifest.data.commit, file });
  }

  const removed = await deleteFile(env, {
    target: { kind: 'image', file },
    verb: 'delete clinic photo',
    actor: identity.email,
    subject: file,
    sha: current.data.sha,
  });
  if (!removed.ok) {
    console.warn(JSON.stringify({ event: 'orphan_image', file, reason: removed.reason }));
  }
  return ok({ sha: manifest.data.commit, file });
}

/* -------------------------------------------------------------------------- */
/*  Publication status                                                         */
/* -------------------------------------------------------------------------- */

async function getStatus({ request, env }: Context): Promise<Response> {
  const sha = new URL(request.url).searchParams.get('sha');
  // Validated here as well as in the client, because a query parameter is the
  // one place in this Worker where caller text reaches a GitHub URL.
  if (sha === null || !/^[0-9a-f]{7,40}$/.test(sha)) return fail('BAD_REQUEST');

  const result = await statusForSha(env, sha);
  if (!result.ok) return upstream(result.reason);
  return ok(result.data);
}

async function getLatestStatus({ env }: Context): Promise<Response> {
  const result = await latestStatus(env);
  if (!result.ok) return upstream(result.reason);
  // null means no CMS commit has ever been made — a clean panel, not an error.
  return ok(result.data);
}

/* -------------------------------------------------------------------------- */
/*  Routes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every route, exhaustively. No pattern matching and no prefix handling: a
 * path either appears here or does not exist.
 *
 * No unauthenticated health endpoint — Access fronts the hostname, so a
 * liveness probe could never reach it.
 */
/**
 * Serve the panel itself.
 *
 * Same origin as the API, which is what makes the CSRF story work: the
 * browser attaches no cookie a cross-site form could exploit, because the
 * Worker reads the Access header instead.
 *
 * These two responses carry HTML and JavaScript rather than JSON, so they set
 * their own Content-Type while keeping every other security header.
 */
function document_(body: string, contentType: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': contentType,
      // The document CSP, not the API's. Still no inline execution.
      'Content-Security-Policy': PANEL_CSP,
    },
  });
}

const ROUTES: Readonly<Record<string, Route>> = Object.freeze({
  '/': {
    methods: ['GET'],
    handle: ({ identity }) => document_(renderPanel(identity.email), 'text/html; charset=utf-8'),
  },
  '/panel.js': {
    methods: ['GET'],
    handle: () => document_(CLIENT, 'text/javascript; charset=utf-8'),
  },
  '/panel.css': {
    methods: ['GET'],
    handle: () => document_(STYLES, 'text/css; charset=utf-8'),
  },
  '/api/session': {
    methods: ['GET'],
    // The minimum the panel needs: that the session is good, and who is
    // acting. Nothing else from the token is returned.
    handle: ({ identity }) => ok({ authenticated: true, email: identity.email }),
  },
  '/api/hours': {
    methods: ['GET', 'PUT'],
    handle: (context) => (context.request.method === 'GET' ? getHours(context) : putHours(context)),
  },
  '/api/photos': {
    methods: ['GET', 'POST'],
    handle: (context) => (context.request.method === 'GET' ? getPhotos(context) : postPhoto(context)),
  },
  // Separate exact paths rather than one endpoint taking an action name, so
  // the router keeps its no-pattern-matching property and each verb has its
  // own method allow-list.
  '/api/photos/publish': {
    methods: ['POST'],
    handle: (context) => photoAction(context, 'publish'),
  },
  '/api/photos/unpublish': {
    methods: ['POST'],
    handle: (context) => photoAction(context, 'unpublish'),
  },
  '/api/photos/delete': {
    methods: ['POST'],
    handle: (context) => photoAction(context, 'delete'),
  },
  '/api/status': {
    methods: ['GET'],
    handle: getStatus,
  },
  // Asked when the browser has no stored SHA — a new device, a cleared
  // browser. The doctor should always be able to see where his last change
  // got to, so browser state is a convenience and never the mechanism.
  '/api/status/latest': {
    methods: ['GET'],
    handle: getLatestStatus,
  },
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const { pathname } = new URL(request.url);
      const route = ROUTES[pathname];

      // Route and method resolve BEFORE authentication, so requests to paths
      // that do not exist cost no asymmetric crypto and no key lookup. This is
      // also where a rate limiter would go if the WAF rule on the hostname
      // ever proves insufficient.
      if (!route) return fail('NOT_FOUND');

      // Includes OPTIONS. The panel is same-origin and same-origin requests do
      // not preflight, so an OPTIONS arriving means a cross-origin caller.
      if (!route.methods.includes(request.method)) return fail('METHOD_NOT_ALLOWED');

      const auth = await authenticate(request, env);
      if (!auth.ok) {
        // The reason is logged; only the code is returned. Collapsing every
        // verification failure into one answer stops a caller probing which
        // check failed.
        console.warn(
          JSON.stringify({ event: 'auth_refused', code: auth.code, reason: auth.reason, path: pathname }),
        );
        return fail(auth.code);
      }

      return await route.handle({ request, env, identity: auth.identity });
    } catch (error) {
      // Nothing from here reaches the browser but the code.
      console.error(
        JSON.stringify({
          event: 'unhandled',
          message: error instanceof Error ? error.message : String(error),
        }),
      );
      return fail('SERVER_ERROR');
    }
  },
};
