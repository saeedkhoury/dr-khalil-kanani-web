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
  addRecord, describeRecord, parseRecords, type CheckedImage, type DesiredPhoto, removeRecord, reorderRecords, serialiseRecords, setStatus,
  validateReplacement, validateUpload, MAX_IMAGE_BYTES, MIN_LONG_EDGE, nextFilename,
} from './media.ts';
import { inspectImage } from './image.ts';
import { commitPhotoChanges, createImageBlob, readBlobBytes } from './github.ts';
import { GALLERY_RULES, parseGallery, planGallerySave, type GalleryId } from './galleries.ts';
import { assertTreatmentWorkShape } from '../../../src/lib/data-schema.ts';
import type { ClinicPhotographRecord, TreatmentWorkRecord } from '../../../src/data/media-types.ts';
import { deleteFile, listImageFiles, listImageVersions, pathFor, readBlobSha, readBytes, readFile, writeFile, type CommitVerb } from './github.ts';
import { latestStatus, liveOnPublicSite, previewForSha, statusForSha } from './status.ts';
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

  // Nothing changed: say so, and make no commit. An empty commit tells the
  // doctor "saved" about a change that does not exist.
  const content = serialiseHours(validated.rows);
  if (content === current.data.text) return ok({ sha: null, blob: current.data.sha, unchanged: true });

  const result = await writeFile(env, {
    target: { kind: 'hours' },
    content,
    verb: 'update opening hours',
    sha: current.data.sha,
  });
  if (!result.ok) return upstream(result.reason);

  // The commit SHA is how the panel tracks publication. A commit is not a
  // publication, and the two are never conflated.
  return ok({ sha: result.data.commit, blob: result.data.blob });
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

/** Each gallery's fixed manifest, and how to read it. Never a path from the browser. */
const GALLERY_FILES = {
  clinic: { kind: 'photography', parse: parseRecords },
  work: {
    kind: 'treatmentWork',
    parse: (text: string): TreatmentWorkRecord[] | null => {
      try { return assertTreatmentWorkShape(JSON.parse(text), 'repository treatment-work.json'); } catch { return null; }
    },
  },
} as const;

async function loadGallery(env: Env, gallery: GalleryId) {
  const target = GALLERY_FILES[gallery];
  const file = await readFile(env, { kind: target.kind });
  if (!file.ok) return { ok: false as const, response: upstream(file.reason) };
  const records = target.parse(file.data.text);
  if (records === null) return { ok: false as const, response: fail('UPSTREAM_UNAVAILABLE') };
  return { ok: true as const, records: records as Array<ClinicPhotographRecord | TreatmentWorkRecord>, sha: file.data.sha };
}

/** `?gallery=` / `gallery`: absent means clinic (the original API); anything else must be exact. */
function galleryOf(value: unknown): GalleryId | null {
  return value === undefined || value === null ? 'clinic' : parseGallery(value);
}

async function getPhotos({ request, env }: Context): Promise<Response> {
  const gallery = galleryOf(new URL(request.url).searchParams.get('gallery'));
  if (gallery === null) return fail('BAD_REQUEST');
  const loaded = await loadGallery(env, gallery);
  if (!loaded.ok) return loaded.response;
  // Versions are a convenience for thumbnails; a failed listing must not
  // stop the doctor managing his photographs.
  const listed = await listImageVersions(env);
  const versions = listed.ok
    ? Object.fromEntries(loaded.records.map((r) => [r.file, listed.data[r.file] ?? '']))
    : {};
  return ok({ records: loaded.records, sha: loaded.sha, versions });
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
  const current = await readBlobSha(env, { kind: 'image', file });
  if (!current.ok) {
    // The record is already gone, which is the part that matters: nothing
    // references the file, so the site cannot show it. The leftover file is
    // reported rather than hidden.
    console.warn(JSON.stringify({ event: 'orphan_image', file, reason: current.reason }));
    return ok({ sha: manifest.data.commit, file, fileRemoved: false });
  }

  const removed = await deleteFile(env, {
    target: { kind: 'image', file },
    verb: 'delete clinic photo',
    subject: file,
    sha: current.data,
  });
  if (!removed.ok) {
    console.warn(JSON.stringify({ event: 'orphan_image', file, reason: removed.reason }));
    return ok({ sha: manifest.data.commit, file, fileRemoved: false });
  }
  // The branch head is the delete commit, so that is the one to track.
  return ok({ sha: removed.data.commit, file, fileRemoved: true });
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

  // Same order as the repository already has: no commit. Pressing "save
  // order" with nothing moved used to create an empty-looking commit.
  if (reordered.every((record, i) => record.file === loaded.records[i]?.file)) {
    return ok({ sha: null, unchanged: true });
  }

  const manifest = await writeFile(env, {
    target: { kind: 'photography' },
    content: serialiseRecords(reordered),
    verb: 'reorder clinic photos',
    sha: loaded.sha,
  });
  if (!manifest.ok) return upstream(manifest.reason);

  return ok({ sha: manifest.data.commit });
}

/* -------------------------------------------------------------------------- */
/*  The photo manager: stage images, then save the whole gallery at once       */
/* -------------------------------------------------------------------------- */

/** Most photographs one save may add or replace; bounds the work per request. */
const MAX_IMAGES_PER_SAVE = 20;

/**
 * Check an image and store it as a git blob — no commit, nothing on any
 * branch. The editor calls this only while saving, with the no-patient
 * confirmation ticked; the photo becomes part of the site only if the save
 * that follows references it, and that save checks the bytes again.
 */
async function stagePhoto({ request, env }: Context): Promise<Response> {
  if (!sameOrigin(request, env)) return fail('FORBIDDEN');
  const body = await readJson<{ contentBase64?: unknown; confirmed?: unknown }>(request, MAX_PHOTO_BODY);
  if (!body.ok) return fail(body.code);
  // Nothing reaches the repository's object store without the no-patient
  // confirmation — not even an unreferenced blob.
  if (body.body?.confirmed !== true) return fail('INVALID', ['confirmation_required']);
  const bytes = decodeBase64(body.body?.contentBase64);
  if (bytes === null) return fail('INVALID', ['file_required']);
  if (bytes.length > MAX_IMAGE_BYTES) return fail('INVALID', ['file_too_large']);
  const image = inspectImage(bytes);
  if (image === null) return fail('INVALID', ['unsupported_format']);
  if (Math.max(image.width, image.height) < MIN_LONG_EDGE) return fail('INVALID', ['image_too_small']);
  const blob = await createImageBlob(env, bytes);
  if (!blob.ok) return upstream(blob.reason);
  return ok({ blob: blob.data, width: image.width, height: image.height, extension: image.extension });
}

/**
 * Save the gallery the doctor arranged — order, framing, descriptions,
 * visibility, new photographs, replacements, deletions — as ONE commit.
 *
 * The browser names images by blob SHA only. Each one is fetched back from
 * GitHub and inspected again here: a SHA from the browser is a claim, and the
 * bytes behind it are the control, exactly as for an upload.
 */
async function savePhotos({ request, env }: Context): Promise<Response> {
  if (!sameOrigin(request, env)) return fail('FORBIDDEN');
  const body = await readJson<{ gallery?: unknown; sha?: unknown; photos?: unknown; confirmed?: unknown }>(request, 256 * 1024);
  if (!body.ok) return fail(body.code);
  const gallery = galleryOf(body.body?.gallery);
  if (gallery === null) return fail('INVALID', ['gallery_invalid']);
  const photos = body.body?.photos;
  if (!Array.isArray(photos) || photos.length > 200) return fail('INVALID', ['photos_invalid']);

  const loaded = await loadGallery(env, gallery);
  if (!loaded.ok) return loaded.response;
  // The editor worked from this manifest; if it changed since, nothing is
  // merged over someone else's change.
  if (body.body?.sha !== loaded.sha) return fail('CONFLICT');

  const withImages = photos.filter((p) => p && typeof p === 'object' && (p as { image?: unknown }).image !== undefined);
  if (withImages.length > MAX_IMAGES_PER_SAVE) return fail('INVALID', ['too_many_images']);

  const desired: DesiredPhoto[] = [];
  for (const [i, raw] of photos.entries()) {
    if (raw === null || typeof raw !== 'object') return fail('INVALID', [`photo_${i}:invalid`]);
    const p = raw as { file?: unknown; category?: unknown; image?: { blob?: unknown }; status?: unknown; alt?: unknown; caption?: unknown; frame?: unknown };
    let image: CheckedImage | undefined;
    if (p.image !== undefined) {
      const blob = p.image?.blob;
      if (typeof blob !== 'string' || !/^[0-9a-f]{40}$/.test(blob)) return fail('INVALID', [`photo_${i}:file_required`]);
      const bytes = await readBlobBytes(env, blob, MAX_IMAGE_BYTES);
      if (!bytes.ok) return bytes.reason === 'not_found' ? fail('INVALID', [`photo_${i}:file_required`]) : upstream(bytes.reason);
      const info = inspectImage(bytes.data);
      if (info === null) return fail('INVALID', [`photo_${i}:unsupported_format`]);
      if (Math.max(info.width, info.height) < MIN_LONG_EDGE) return fail('INVALID', [`photo_${i}:image_too_small`]);
      image = { blob, width: info.width, height: info.height, extension: info.extension };
    }
    desired.push({
      file: typeof p.file === 'string' ? p.file : undefined,
      category: p.category,
      image,
      status: p.status,
      alt: (p.alt && typeof p.alt === 'object' ? p.alt : {}) as DesiredPhoto['alt'],
      ...(p.caption === undefined ? {} : { caption: p.caption as DesiredPhoto['caption'] }),
      ...(p.frame === undefined ? {} : { frame: p.frame }),
    });
  }

  const inventory = await listImageFiles(env);
  if (!inventory.ok) return upstream(inventory.reason);
  // Files the OTHER gallery uses are never deleted from this one.
  const other = await loadGallery(env, gallery === 'clinic' ? 'work' : 'clinic');
  if (!other.ok) return other.response;
  const protectedFiles = new Set(other.records.map((r) => r.file));
  const plan = gallery === 'clinic'
    ? planGallerySave(GALLERY_RULES.clinic, loaded.records as ClinicPhotographRecord[], desired, inventory.data, body.body?.confirmed, protectedFiles)
    : planGallerySave(GALLERY_RULES.work, loaded.records as TreatmentWorkRecord[], desired, inventory.data, body.body?.confirmed, protectedFiles);
  if (!plan.ok) return fail('INVALID', plan.issues);
  if (plan.unchanged) return ok({ sha: null, unchanged: true });

  const committed = await commitPhotoChanges(env, {
    manifestKind: GALLERY_FILES[gallery].kind,
    expectedManifestSha: loaded.sha,
    manifest: `${JSON.stringify(plan.records, null, 2)}\n`,
    puts: plan.puts,
    deletes: plan.deletes,
    patientContentConfirmed: plan.addsImages,
  });
  if (!committed.ok) return upstream(committed.reason);
  return ok({ sha: committed.data.commit });
}

/**
 * Rewrite the Hebrew, Arabic and English description of one photograph.
 *
 * The same rules an upload applies: all three required, English must be
 * English, and the claims rules run before anything is committed. Writing a
 * reviewed English description is also what clears needsEnglishReview.
 */
async function describePhoto({ request, env }: Context): Promise<Response> {
  if (!sameOrigin(request, env)) return fail('FORBIDDEN');

  const body = await readJson<{ file?: unknown; altHe?: unknown; altAr?: unknown; altEn?: unknown }>(request, MAX_ACTION_BODY);
  if (!body.ok) return fail(body.code);

  const file = body.body?.file;
  if (typeof file !== 'string' || file === '') return fail('INVALID', ['file_required']);

  const loaded = await loadRecords(env);
  if (!loaded.ok) return loaded.response;

  const described = describeRecord(loaded.records, file, {
    altHe: body.body?.altHe, altAr: body.body?.altAr, altEn: body.body?.altEn,
  });
  if (!described.ok) return fail('INVALID', described.issues);
  if (described.unchanged) return ok({ sha: null, unchanged: true, file });

  const manifest = await writeFile(env, {
    target: { kind: 'photography' },
    content: serialiseRecords(described.records),
    verb: 'describe clinic photo',
    subject: file,
    sha: loaded.sha,
  });
  if (!manifest.ok) return upstream(manifest.reason);
  return ok({ sha: manifest.data.commit, file });
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

  const body = await readJson<{ file?: unknown; contentBase64?: unknown; confirmed?: unknown }>(request, MAX_PHOTO_BODY);
  if (!body.ok) return fail(body.code);

  const file = body.body?.file;
  if (typeof file !== 'string' || file === '') return fail('INVALID', ['file_required']);

  // A replacement is a NEW photograph in the repository, so it needs the same
  // patient-content confirmation an upload does. It used to be recorded as
  // confirmed in the commit without ever being asked.
  if (body.body?.confirmed !== true) return fail('INVALID', ['confirmation_required']);

  const bytes = decodeBase64(body.body?.contentBase64);
  if (bytes === null) return fail('INVALID', ['file_required']);

  const loaded = await loadRecords(env);
  if (!loaded.ok) return loaded.response;

  const validated = validateReplacement(loaded.records, file, bytes);
  if (!validated.ok) return fail('INVALID', validated.issues);

  // The blob SHA of the file being replaced — required, and read from the
  // repository rather than supplied by the browser.
  const current = await readBlobSha(env, { kind: 'image', file });
  if (!current.ok) return upstream(current.reason);

  const image = await writeFile(env, {
    target: { kind: 'image', file },
    content: bytes,
    verb: 'replace clinic photo',
    subject: file,
    patientContentConfirmed: true,
    sha: current.data,
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

  const stored = await readBytes(env, { kind: 'image', file }, MAX_IMAGE_BYTES * 2);
  if (!stored.ok) return upstream(stored.reason);

  // The type comes from what the bytes are, not from the name, and anything
  // that is not a JPEG or PNG is not served at all.
  const image = inspectImage(stored.data);
  if (image === null) return fail('UPSTREAM_UNAVAILABLE');
  return new Response(stored.data as Uint8Array<ArrayBuffer>, {
    status: 200,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': image.format === 'png' ? 'image/png' : 'image/jpeg',
      // Not a public asset: it is repository content behind Access. The
      // editor requests it with the blob SHA in the URL, so a private cache
      // never shows a replaced photograph.
      'Cache-Control': 'private, max-age=86400',
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
  const preview = await previewForSha(env, sha, await deployedBuild(env), env.ADMIN_REBUILD?.trim() === 'on');
  // Only a production content branch can be live on the official site; a
  // test branch never is, and is never asked.
  const live = env.CONTENT_BRANCH?.trim() === 'main' && result.data.state === 'published'
    ? await liveOnPublicSite(env, sha)
    : false;
  return ok({ ...result.data, preview, live });
}

/**
 * The commit this Worker's own pages were built from, written into the build
 * by the admin preview workflow. null for a build without one (a manual
 * deploy), which makes the status fall back to the workflow runs.
 */
async function deployedBuild(env: Env): Promise<string | null> {
  if (!env.ASSETS) return null;
  try {
    const response = await env.ASSETS.fetch(new Request('https://admin.invalid/build.txt'));
    if (!response.ok) return null;
    const text = (await response.text()).trim();
    return /^[0-9a-f]{40}$/.test(text) ? text : null;
  } catch {
    return null;
  }
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
    // The minimum the panel needs: that the session is good, who is acting,
    // and whether saves reach the public site or a test branch — so the
    // editor never says "published" about a branch visitors do not see.
    // Nothing else from the token is returned.
    handle: ({ identity, env }) => ok({
      authenticated: true,
      email: identity.email,
      publishing: env.CONTENT_BRANCH?.trim() === 'main' ? 'production' : 'test',
    }),
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
  '/api/photos/describe': {
    methods: ['POST'],
    handle: describePhoto,
  },
  '/api/photos/stage': {
    methods: ['POST'],
    handle: stagePhoto,
  },
  '/api/photos/save': {
    methods: ['POST'],
    handle: savePhotos,
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
