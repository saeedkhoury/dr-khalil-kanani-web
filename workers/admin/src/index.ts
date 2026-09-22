/**
 * ADMIN WORKER — admin.drkhalilkanani.com
 *
 * It proves who you are and then does nothing.
 *
 * That is the whole of it, on purpose. This phase establishes the boundary;
 * the endpoints that edit opening hours and manage photographs go behind it
 * later. If this is right, adding one of those is a routing change rather than
 * a security change.
 *
 * Deliberately absent: any GitHub access, any credential for it, any data
 * mutation, any upload, any UI, and any development authentication bypass.
 *
 * See docs/specs/2026-09-22-admin-cms-phase-2.md.
 */

import { authenticate, type AccessIdentity } from './auth.ts';
import { fail, ok, type Env } from './http.ts';

interface Route {
  /** Methods this route answers. Anything else is 405, never a fallthrough. */
  methods: readonly string[];
  handle: (identity: AccessIdentity) => Response;
}

/**
 * Every route, exhaustively. There is no pattern matching and no prefix
 * handling: a path either appears here or does not exist.
 *
 * No unauthenticated health endpoint. Access fronts the whole hostname, so a
 * liveness probe could never reach it in production — it would be an
 * unreachable route that still had to be got right. `/api/session` is the
 * liveness check, and it means something because it is authenticated.
 */
const ROUTES: Readonly<Record<string, Route>> = Object.freeze({
  '/api/session': {
    methods: ['GET'],
    /**
     * The minimum the future admin UI needs: that the session is good, and
     * which identity is acting.
     *
     * The email is not a disclosure — the caller just presented a signed
     * assertion naming it. Nothing else from the token is returned: no sub,
     * iss, aud, iat, exp, nbf, the raw assertion, or any other Access claim.
     */
    handle: (identity) => ok({ authenticated: true, email: identity.email }),
  },
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const { pathname } = new URL(request.url);
      const route = ROUTES[pathname];

      // Route and method are resolved BEFORE authentication, so a flood of
      // requests to paths that do not exist costs no asymmetric crypto and no
      // JWKS lookup. This is also where a rate limiter would be called if the
      // WAF rule on the hostname ever proves insufficient.
      if (!route) return fail('NOT_FOUND');

      // Includes OPTIONS. The admin UI is same-origin and same-origin requests
      // do not preflight, so an OPTIONS arriving at all means a cross-origin
      // caller. It is answered 405 rather than given a CORS grant.
      if (!route.methods.includes(request.method)) return fail('METHOD_NOT_ALLOWED');

      const auth = await authenticate(request, env);
      if (!auth.ok) {
        // The reason is logged; only the code is returned. Collapsing every
        // verification failure into one answer is what stops a caller probing
        // which check failed and tuning a forgery against it.
        console.warn(
          JSON.stringify({ event: 'auth_refused', code: auth.code, reason: auth.reason, path: pathname }),
        );
        return fail(auth.code);
      }

      return route.handle(auth.identity);
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
