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
import { readFile, writeFile } from './github.ts';

/** Hours are seven short rows. Anything larger is not a week. */
const MAX_HOURS_BODY = 8 * 1024;

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
/*  Routes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every route, exhaustively. No pattern matching and no prefix handling: a
 * path either appears here or does not exist.
 *
 * No unauthenticated health endpoint — Access fronts the hostname, so a
 * liveness probe could never reach it.
 */
const ROUTES: Readonly<Record<string, Route>> = Object.freeze({
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
