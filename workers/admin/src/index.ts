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
  addRecord, parseRecords, removeRecord, reorderRecords, serialiseRecords, setStatus,
  validateReplacement, validateUpload, MAX_IMAGE_BYTES, nextFilename,
} from './media.ts';
import { deleteFile, listImageFiles, pathFor, readFile, writeFile, type CommitVerb } from './github.ts';
import { latestStatus, statusForSha } from './status.ts';
import { renderPanel } from './ui/page.ts';
import { CLIENT } from './ui/client.ts';
import { PANEL_CSP, SECURITY_HEADERS } from './http.ts';
import { STYLES } from './ui/styles.ts';
import { managedContent } from './managed.ts';
import { VISUAL_CLIENT, VISUAL_STYLES } from './ui/visual.ts';

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

async function putHours({ request, env }: Context): Promise<Response> {
  if (!sameOrigin(request, env)) return fail('FORBIDDEN');

  const body = await readJson<unknown>(request, MAX_HOURS_BODY);
  if (!body.ok) return fail(body.code);

  // Named `submitted`, not `payload`: in a Worker that also verifies JWTs,
  // "payload" reads as the token's claims, and a structural test keeps that
  // word out of the routing layer so the two can never be confused.
  const submitted = (body.body as { rows?: unknown })?.rows;
  const validated = validateHoursPayload(submitted);
  if (!validated.ok) return fail('INVALID', validated.issues);

  const expectedSha = (body.body as { sha?: unknown })?.sha;
  if (typeof expectedSha !== 'string' || expectedSha === '' || expectedSha.length > 64) {
    return fail('CONFLICT');
  }

  // The client's revision is a precondition, never a path or write target.
  // Compare it with the server read, then let GitHub enforce the same blob
  // SHA atomically. A change at either stage must be reviewed, not retried.
  const current = await readFile(env, { kind: 'hours' });
  if (!current.ok) return upstream(current.reason);
  if (current.data.sha !== expectedSha) return fail('CONFLICT');

  const result = await writeFile(env, {
    target: { kind: 'hours' },
    content: serialiseHours(validated.rows),
    verb: 'update opening hours',
    sha: current.data.sha,
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
  altEn?: unknown;
  confirmed?: unknown;
}

async function postPhoto({ request, env }: Context): Promise<Response> {
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
      altEn: body.body?.altEn,
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
    subject: record.file,
    patientContentConfirmed: true,
    // NEVER retried: an append is not idempotent and a retry could double-add.
  });
  if (!image.ok) return upstream(image.reason);

  const manifest = await writeFile(env, {
    target: { kind: 'photography' },
    content: serialiseRecords(updated),
    verb: 'add clinic photo',
    subject: record.file,
    patientContentConfirmed: true,
    sha: loaded.sha,
  });
  if (!manifest.ok) return upstream(manifest.reason);

  return ok({ sha: manifest.data.commit, file: record.file });
}

/** publish / unpublish / delete all name one existing file. */
async function photoAction(
  { request, env }: Context,
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
    subject: file,
    sha: current.data.sha,
  });
  if (!removed.ok) {
    console.warn(JSON.stringify({ event: 'orphan_image', file, reason: removed.reason }));
  }
  return ok({ sha: manifest.data.commit, file });
}

/**
 * Reorder the gallery.
 *
 * The browser sends the filenames in their new sequence — identifiers it
 * already received from GET /api/photos, never paths. The manifest is
 * rewritten wholesale, which is safe because a reorder is idempotent: the
 * doctor's complete intent is "this list, in this order".
 */
async function reorderPhotos({ request, env }: Context): Promise<Response> {
  if (!sameOrigin(request, env)) return fail('FORBIDDEN');

  const body = await readJson<{ files?: unknown }>(request, MAX_ACTION_BODY);
  if (!body.ok) return fail(body.code);

  const files = body.body?.files;
  if (!Array.isArray(files) || files.some((f) => typeof f !== 'string')) {
    return fail('INVALID', ['order_invalid']);
  }

  const loaded = await loadRecords(env);
  if (!loaded.ok) return loaded.response;

  const reordered = reorderRecords(loaded.records, files as string[]);
  // null means the browser was working from a stale list. Refusing beats
  // silently dropping or duplicating a photograph the doctor did not touch.
  if (reordered === null) return fail('INVALID', ['order_stale']);

  const manifest = await writeFile(env, {
    target: { kind: 'photography' },
    content: serialiseRecords(reordered),
    verb: 'reorder clinic photos',
    sha: loaded.sha,
  });
  if (!manifest.ok) return upstream(manifest.reason);

  return ok({ sha: manifest.data.commit });
}

/**
 * Replace the bytes behind an existing photograph.
 *
 * Identity, category, status, alt text and position are all preserved — only
 * the pixels and the intrinsic dimensions change. The image is committed
 * first and the manifest second, the same ordering an upload uses and for the
 * same reason: a failure between them leaves a file nothing references.
 */
async function replacePhoto({ request, env }: Context): Promise<Response> {
  if (!sameOrigin(request, env)) return fail('FORBIDDEN');

  const body = await readJson<{ file?: unknown; contentBase64?: unknown }>(request, MAX_PHOTO_BODY);
  if (!body.ok) return fail(body.code);

  const file = body.body?.file;
  if (typeof file !== 'string' || file === '') return fail('INVALID', ['file_required']);

  const bytes = decodeBase64(body.body?.contentBase64);
  if (bytes === null) return fail('INVALID', ['file_required']);

  const loaded = await loadRecords(env);
  if (!loaded.ok) return loaded.response;

  const validated = validateReplacement(loaded.records, file, bytes);
  if (!validated.ok) return fail('INVALID', validated.issues);

  // The blob SHA of the file being replaced — required, and read from the
  // repository rather than supplied by the browser.
  const current = await readFile(env, { kind: 'image', file });
  if (!current.ok) return upstream(current.reason);

  const image = await writeFile(env, {
    target: { kind: 'image', file },
    content: bytes,
    verb: 'replace clinic photo',
    subject: file,
    patientContentConfirmed: true,
    sha: current.data.sha,
  });
  if (!image.ok) return upstream(image.reason);

  const manifest = await writeFile(env, {
    target: { kind: 'photography' },
    content: serialiseRecords(validated.records),
    verb: 'replace clinic photo',
    subject: file,
    sha: loaded.sha,
  });
  if (!manifest.ok) return upstream(manifest.reason);

  return ok({ sha: manifest.data.commit, file });
}

/**
 * Serve one clinic photograph to the editor.
 *
 * Needed because an UNPUBLISHED photograph is in the repository but not in
 * the built site, so the editor cannot link to it — and a doctor choosing
 * which picture to hide or replace has to see the picture.
 *
 * The caller names a FILE, never a path: it goes through the same allow-list
 * every write uses. Authenticated like everything else, and never cached.
 */
async function getPhotoBytes({ request, env }: Context): Promise<Response> {
  const file = new URL(request.url).searchParams.get('file');
  if (file === null || pathFor({ kind: 'image', file }) === null) return fail('BAD_REQUEST');

  const stored = await readFile(env, { kind: 'image', file });
  if (!stored.ok) return upstream(stored.reason);

  // readFile decodes to text; re-encode to the original bytes.
  const bytes = Uint8Array.from(stored.data.text, (c) => c.charCodeAt(0));
  const type = file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  return new Response(bytes, {
    status: 200,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': type,
      // Not a public asset: it is repository content behind Access.
      'Cache-Control': 'no-store',
    },
  });
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
  '/visual-editor.js': { methods: ['GET'], handle: () => document_(VISUAL_CLIENT, 'text/javascript; charset=utf-8') },
  '/visual-editor.css': { methods: ['GET'], handle: () => document_(VISUAL_STYLES, 'text/css; charset=utf-8') },
  '/panel': {
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
  '/api/content/services': { methods: ['GET', 'PUT'], handle: ({ request, env }) => managedContent(request, env, 'services') },
  '/api/content/faq': { methods: ['GET', 'PUT'], handle: ({ request, env }) => managedContent(request, env, 'generalFaq') },
  '/api/content/doctor': { methods: ['GET', 'PUT'], handle: ({ request, env }) => managedContent(request, env, 'doctorProfile') },
  '/api/content/copy': { methods: ['GET', 'PUT'], handle: ({ request, env }) => managedContent(request, env, 'managedCopy') },
  '/api/content/contact': { methods: ['GET', 'PUT'], handle: ({ request, env }) => managedContent(request, env, 'contactFacts') },
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
  '/api/photo': {
    methods: ['GET'],
    handle: getPhotoBytes,
  },
  '/api/photos/order': {
    methods: ['POST'],
    handle: reorderPhotos,
  },
  '/api/photos/replace': {
    methods: ['POST'],
    handle: replacePhoto,
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

async function protectedAsset(request: Request, env: Env): Promise<Response> {
  if (!env.ASSETS) return fail('NOT_CONFIGURED');
  const asset = await env.ASSETS.fetch(request);
  const headers = new Headers(asset.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (key !== 'Content-Type' && key !== 'Content-Security-Policy') headers.set(key, value);
  }
  headers.set('X-Robots-Tag', 'noindex, noarchive');
  if (!headers.get('Content-Type')?.includes('text/html')) return new Response(asset.body, { status: asset.status, headers });

  const html = await asset.text();
  const hashes: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!match[2] || /type=["']application\/ld\+json["']/i.test(match[1])) continue;
    const bytes = new TextEncoder().encode(match[2]);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    hashes.push(`'sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}'`);
  }
  headers.set('Content-Security-Policy',
    `default-src 'none'; script-src 'self' ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'; ` +
    "img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src https://www.google.com; " +
    "base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  );
  return new Response(html, { status: asset.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const { pathname } = new URL(request.url);
      const route = ROUTES[pathname];

      // Route and method resolve BEFORE authentication, so requests to paths
      // that do not exist cost no asymmetric crypto and no key lookup. This is
      // also where a rate limiter would go if the WAF rule on the hostname
      // ever proves insufficient.
      const isAsset = !route && pathname !== '/api' && !pathname.startsWith('/api/');
      if (!route && !isAsset) return fail('NOT_FOUND');

      // Includes OPTIONS. The panel is same-origin and same-origin requests do
      // not preflight, so an OPTIONS arriving means a cross-origin caller.
      if (route ? !route.methods.includes(request.method) : request.method !== 'GET') return fail('METHOD_NOT_ALLOWED');

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

      return route ? await route.handle({ request, env, identity: auth.identity }) : protectedAsset(request, env);
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
