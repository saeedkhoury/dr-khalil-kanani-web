/**
 * Drive the admin Worker end to end with NOTHING leaving the machine.
 *
 * Serves the Access JWKS from generated local keys and answers GitHub from a
 * queue, recording every call so a test can assert the EXACT request that
 * would have been sent — repository, branch, path, SHA, encoded content and
 * commit message — without sending it.
 *
 * Any URL that is neither the JWKS nor api.github.com throws, so a test that
 * accidentally reaches the network fails loudly rather than silently.
 */

import worker from '../../workers/admin/src/index.ts';
import type { Env } from '../../workers/admin/src/http.ts';
import { AUDIENCE, DEVELOPER, DOCTOR, TEAM_DOMAIN, jwksDocument, makeToken } from './access-jwt.ts';

export const ADMIN_ORIGIN = 'https://admin.drkhalilkanani.test';
export const FAKE_GITHUB_TOKEN = 'ghp_fake_token_for_tests_only_0000000000';
export const CONTENT_BRANCH = 'cms-test-branch';
export const REPO_CONTENTS =
  'https://api.github.com/repos/saeedkhoury/dr-khalil-kanani-web/contents';

export const adminEnv: Env = {
  ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
  ACCESS_AUD: AUDIENCE,
  ADMIN_ORIGIN,
  ALLOWED_EMAILS: `${DOCTOR}, ${DEVELOPER}`,
  GITHUB_TOKEN: FAKE_GITHUB_TOKEN,
  CONTENT_BRANCH,
};

export interface Recorded {
  url: string;
  method: string;
  body: Record<string, unknown> | null;
}

export interface Reply {
  status: number;
  body: unknown;
}

/** Encode text the way the GitHub Contents API returns it. */
export const asContents = (text: string, sha: string): Reply => ({
  status: 200,
  body: { content: Buffer.from(text, 'utf8').toString('base64'), encoding: 'base64', sha },
});

export const asCommit = (sha: string): Reply => ({ status: 200, body: { commit: { sha } } });

/** Decode what the Worker put in a PUT body. */
export const decodeContent = (body: Record<string, unknown> | null): string =>
  Buffer.from(String(body?.content ?? ''), 'base64').toString('utf8');

export async function callAdmin(
  request: Request,
  gitHub: Reply[],
  env: Env = adminEnv,
): Promise<{ response: Response; calls: Recorded[] }> {
  const original = globalThis.fetch;
  const calls: Recorded[] = [];
  let i = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('/cdn-cgi/access/certs')) {
      return new Response(JSON.stringify(jwksDocument), { status: 200 });
    }
    if (url.startsWith('https://api.github.com/')) {
      calls.push({
        url,
        method: init?.method ?? 'GET',
        body: init?.body === undefined ? null : JSON.parse(String(init.body)),
      });
      const reply = gitHub[Math.min(i++, gitHub.length - 1)] ?? { status: 500, body: {} };
      return new Response(JSON.stringify(reply.body), { status: reply.status });
    }
    throw new Error(`unexpected network access to ${url}`);
  }) as typeof fetch;
  try {
    return { response: await worker.fetch(request, env), calls };
  } finally {
    globalThis.fetch = original;
  }
}

/** An authenticated request from the panel. */
export async function adminRequest(
  path: string,
  { method = 'GET', body, origin = ADMIN_ORIGIN, email = DOCTOR, contentType = 'application/json' }: {
    method?: string; body?: unknown; origin?: string | null; email?: string; contentType?: string | null;
  } = {},
): Promise<Request> {
  const headers: Record<string, string> = { 'Cf-Access-Jwt-Assertion': await makeToken({ email }) };
  if (body !== undefined) {
    if (contentType !== null) headers['Content-Type'] = contentType;
    if (origin !== null) headers.Origin = origin;
  }
  return new Request(`${ADMIN_ORIGIN}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
}
