/** Fixed-path structured content operations. No client-supplied repository path. */
import { readFile, writeFile, type WriteTarget } from './github.ts';
import { fail, ok, readJson, sameOrigin, type Env } from './http.ts';
import { parseManaged, servicesSchema, faqSchema, doctorProfileSchema, managedCopySchema, contactFactsSchema } from '../../../src/lib/managed-schema.ts';
import type { AccessIdentity } from './auth.ts';

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
  try { return PARSERS[kind](value); } catch { return null; }
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
  request: Request, env: Env, identity: AccessIdentity, kind: Kind,
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
  if (FACTUAL.has(kind) && body.body.confirmed !== true) return fail('INVALID', ['owner_confirmation_required']);

  const value = parse(kind, body.body.value);
  if (value === null) return fail('INVALID', ['content_invalid']);
  if (!transitionAllowed(kind, existing, value)) return fail('INVALID', ['published_item_or_url_locked']);
  if (kind === 'contactFacts') {
    const oldFacts = existing as Record<string, unknown>;
    const newFacts = value as Record<string, unknown>;
    const locationChanged = ['street', 'locality', 'region', 'postalCode'].some((key) => JSON.stringify(oldFacts[key]) !== JSON.stringify(newFacts[key]));
    if (locationChanged && body.body.sameLocation !== true) return fail('INVALID', ['same_location_confirmation_required']);
  }

  const result = await writeFile(env, {
    target,
    content: `${JSON.stringify(value, null, 2)}\n`,
    verb: 'update visual content',
    sha: current.data.sha,
  });
  if (!result.ok) return result.reason === 'conflict' ? fail('CONFLICT') : fail('UPSTREAM_UNAVAILABLE');
  return ok({ sha: result.data.commit });
}
