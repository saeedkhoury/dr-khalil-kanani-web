/** Fixed-path structured content operations. No client-supplied repository path. */
import { readFile, writeFile, type WriteTarget } from './github.ts';
import { fail, ok, readJson, sameOrigin, type Env } from './http.ts';
import { parseManaged, servicesSchema, faqSchema, doctorProfileSchema, managedCopySchema, contactFactsSchema } from '../../../src/lib/managed-schema.ts';

type Kind = 'services' | 'generalFaq' | 'doctorProfile' | 'managedCopy' | 'contactFacts';
const PARSERS: Record<Kind, (value: unknown) => unknown> = {
  services: (v) => parseManaged(servicesSchema, v, 'services'),
  generalFaq: (v) => parseManaged(faqSchema, v, 'general FAQ'),
  doctorProfile: (v) => parseManaged(doctorProfileSchema, v, 'doctor profile'),
  managedCopy: (v) => parseManaged(managedCopySchema, v, 'managed copy'),
  contactFacts: (v) => parseManaged(contactFactsSchema, v, 'contact facts'),
};
const FACTUAL = new Set<Kind>(['contactFacts', 'doctorProfile']);

function parse(kind: Kind, value: unknown): unknown | null {
  const checked = check(kind, value);
  return checked.ok ? checked.value : null;
}

/**
 * Validate, keeping WHERE it failed.
 *
 * "content_invalid" told the doctor that something, somewhere, in thirty
 * fields and three languages was wrong. Each issue is a path and a reason —
 * `3.locales.en.title:too_small` — which the editor turns into a sentence
 * naming the item, the field and the language. Paths come from the schema,
 * never from the submitted text, so nothing the caller wrote is echoed back.
 */
function check(kind: Kind, value: unknown): { ok: true; value: unknown } | { ok: false; issues: string[] } {
  try {
    return { ok: true, value: PARSERS[kind](value) };
  } catch (error) {
    const zodIssues = (error as { issues?: Array<{ path?: PropertyKey[]; code?: string }> }).issues;
    if (Array.isArray(zodIssues)) {
      return {
        ok: false,
        issues: zodIssues.slice(0, 20).map((issue) =>
          `${(issue.path ?? []).map((part) => String(part).replace(/[^A-Za-z0-9_.-]/g, '')).join('.')}:${String(issue.code ?? 'invalid').replace(/[^a-z_]/g, '')}`),
      };
    }
    const claims = error instanceof Error ? error.message.match(/prohibited claims: (.*)$/)?.[1] : undefined;
    if (claims) {
      return {
        ok: false,
        issues: claims.split('; ').slice(0, 20).map((entry) => {
          const [where = '', rule = ''] = entry.split(': ');
          const path = where.replace(/^[^.[]*/, '').replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '').replace(/[^A-Za-z0-9_.-]/g, '');
          return `${path}:claim_${rule.replace(/[^a-z-]/g, '').replace(/-/g, '_')}`;
        }),
      };
    }
    return { ok: false, issues: ['content_invalid'] };
  }
}

/** Stable published URLs cannot silently change during editing. */
function transitionAllowed(kind: Kind, before: unknown, after: unknown): boolean {
  if (kind !== 'services' && kind !== 'generalFaq') return true;
  if (!Array.isArray(before) || !Array.isArray(after)) return false;
  const next = new Map(after.map((item: { id: string }) => [item.id, item]));
  for (const item of before as Array<{ id: string; status: string; slug?: string }>) {
    const updated = next.get(item.id) as { slug?: string } | undefined;
    if (!updated && item.status !== 'unpublished') return false;
    if (kind === 'services' && updated && updated.slug !== item.slug) return false;
  }
  return true;
}

export async function managedContent(
  request: Request, env: Env, kind: Kind,
): Promise<Response> {
  const target: WriteTarget = { kind };
  if (request.method === 'PUT' && !sameOrigin(request, env)) return fail('FORBIDDEN');
  const current = await readFile(env, target);
  if (!current.ok) return current.reason === 'not_configured' ? fail('NOT_CONFIGURED') : fail('UPSTREAM_UNAVAILABLE');
  let existing: unknown;
  try { existing = parse(kind, JSON.parse(current.data.text)); } catch { existing = null; }
  if (existing === null) return fail('UPSTREAM_UNAVAILABLE');
  if (request.method === 'GET') return ok({ value: existing, sha: current.data.sha });

  const body = await readJson<{ value?: unknown; sha?: unknown; confirmed?: unknown; sameLocation?: unknown }>(request, 96 * 1024);
  if (!body.ok) return fail(body.code);
  if (typeof body.body?.sha !== 'string' || !/^[0-9a-f]{40}$/.test(body.body.sha)) return fail('CONFLICT');
  if (body.body.sha !== current.data.sha) return fail('CONFLICT');

  const checked = check(kind, body.body.value);
  if (!checked.ok) return fail('INVALID', checked.issues);
  const value = checked.value;
  // Nothing changed: no commit, and the editor says so instead of "saved".
  // Checked before the confirmation, which is about CHANGED facts — asking
  // someone to confirm a change they did not make is noise.
  // Compared as parsed values, so formatting in the file cannot make an
  // unchanged save look like a change.
  if (JSON.stringify(value) === JSON.stringify(existing)) return ok({ sha: null, blob: current.data.sha, unchanged: true });
  if (FACTUAL.has(kind) && body.body.confirmed !== true) return fail('INVALID', ['owner_confirmation_required']);
  if (!transitionAllowed(kind, existing, value)) return fail('INVALID', ['published_item_or_url_locked']);
  if (kind === 'contactFacts') {
    const oldFacts = existing as Record<string, unknown>;
    const newFacts = value as Record<string, unknown>;
    const locationChanged = ['street', 'locality', 'region', 'postalCode'].some((key) => JSON.stringify(oldFacts[key]) !== JSON.stringify(newFacts[key]));
    if (locationChanged && body.body.sameLocation !== true) return fail('INVALID', ['same_location_confirmation_required']);
  }

  const content = `${JSON.stringify(value, null, 2)}\n`;

  const result = await writeFile(env, {
    target,
    content,
    verb: 'update visual content',
    sha: current.data.sha,
  });
  if (!result.ok) return result.reason === 'conflict' ? fail('CONFLICT') : fail('UPSTREAM_UNAVAILABLE');
  return ok({ sha: result.data.commit, blob: result.data.blob });
}
