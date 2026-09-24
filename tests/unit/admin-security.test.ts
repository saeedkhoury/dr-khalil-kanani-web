/**
 * GitHub client security boundary.
 *
 * This is the only code in the Worker that can change the website, so the
 * tests are almost entirely about what it REFUSES. Every one of them runs
 * against a stubbed fetch that records what would have been sent — nothing
 * reaches GitHub, and a refusal is proven by asserting no request was made at
 * all rather than by trusting an error message.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  commitMessage, deleteFile, pathFor, readFile, writeFile,
  type WriteTarget,
} from '../../workers/admin/src/github.ts';
import type { Env } from '../../workers/admin/src/http.ts';
import { DOCTOR } from '../helpers/access-jwt.ts';

const TOKEN = 'ghp_fake_token_for_tests_only_0000000000';

const env: Env = {
  ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.test',
  ACCESS_AUD: 'aud',
  ADMIN_ORIGIN: 'https://admin.drkhalilkanani.test',
  GITHUB_TOKEN: TOKEN,
  CONTENT_BRANCH: 'cms-test-branch',
};

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | null;
}

/** Replace fetch, recording every call and replying with a queue of responses. */
async function withGitHub<T>(
  replies: Array<{ status: number; body: unknown }>,
  run: () => Promise<T>,
): Promise<{ result: T; calls: Call[] }> {
  const original = globalThis.fetch;
  const calls: Call[] = [];
  let i = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries((init?.headers ?? {}) as Record<string, string>)) {
      headers[k] = v;
    }
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers,
      body: init?.body === undefined ? null : JSON.parse(String(init.body)),
    });
    const reply = replies[Math.min(i++, replies.length - 1)] ?? { status: 500, body: {} };
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  }) as typeof fetch;
  try {
    return { result: await run(), calls };
  } finally {
    globalThis.fetch = original;
  }
}

const okWrite = { status: 200, body: { commit: { sha: 'commit-sha-1' }, content: { sha: 'blob-sha-1' } } };

const write = (target: WriteTarget, over: Record<string, unknown> = {}) =>
  writeFile(env, { target, content: '[]', verb: 'update opening hours', ...over } as never);

/* ────────────────────────────────────────────────────────────────────────── */

describe('a caller cannot name a path', () => {
  test('the three permitted targets resolve to their fixed paths', () => {
    assert.equal(pathFor({ kind: 'hours' }), 'src/data/hours.json');
    assert.equal(pathFor({ kind: 'photography' }), 'src/data/clinic-photography.json');
    assert.equal(pathFor({ kind: 'image', file: 'reception-01.jpg' }), 'src/assets/images/reception-01.jpg');
  });

  test('hours and photography carry no caller input at all', () => {
    // They are single known files. There is no field to poison, which is
    // stronger than validating one.
    const target = { kind: 'hours', file: '../../.github/workflows/deploy.yml' } as unknown as WriteTarget;
    assert.equal(pathFor(target), 'src/data/hours.json');
  });

  test('a traversal or path-shaped filename is refused', () => {
    for (const file of [
      '../../.github/workflows/deploy.yml',
      '../../../etc/passwd',
      'sub/dir.jpg',
      '..\\evil.jpg',
      '/absolute-01.jpg',
      'reception-01.jpg/../../x.jpg',
      './reception-01.jpg',
    ]) {
      assert.equal(pathFor({ kind: 'image', file }), null, `accepted ${file}`);
    }
  });

  test('SVG and every other non-photograph extension is refused', () => {
    for (const file of [
      'reception-01.svg', 'reception-01.webp', 'reception-01.gif',
      'reception-01.html', 'reception-01.js', 'reception-01.json',
      'reception-01.yml', 'reception-01', 'reception-01.jpg.svg',
    ]) {
      assert.equal(pathFor({ kind: 'image', file }), null, `accepted ${file}`);
    }
  });

  test('a filename outside the documented convention is refused', () => {
    for (const file of [
      'Reception-01.jpg',        // uppercase
      'reception_01.jpg',        // underscore
      'reception 01.jpg',        // space
      'reception-1.jpg',         // one-digit index
      'reception-001.jpg',       // three-digit index
      'reception.jpg',           // no index
      '-01.jpg',                 // no name
      'reception-01.JPG',        // uppercase extension
      'רצפציה-01.jpg',           // non-ASCII
      'reception-01.jpg%00.svg', // null-byte style
    ]) {
      assert.equal(pathFor({ kind: 'image', file }), null, `accepted ${file}`);
    }
  });

  test('a filename that follows the convention is accepted', () => {
    for (const file of [
      'reception-01.jpg', 'treatment-room-chair-02.jpeg',
      'doctor-working-03.png', 'exterior-front-entrance-12.jpg',
    ]) {
      assert.ok(pathFor({ kind: 'image', file }), `refused ${file}`);
    }
  });

  test('an overlong filename is refused independently of the body cap [L-1]', () => {
    // The 4 KB action-body limit happens to reject these today. A size limit
    // on a request is not a statement about what a filename may be, so the
    // bound is enforced here and tested without a request at all.
    const longest = 'treatment-room-01.jpg';
    assert.ok(longest.length <= 64);
    assert.ok(pathFor({ kind: 'image', file: longest }), 'a real generated name must pass');

    // 64 is the bound: 60 name + '-01.jpg' is over, 53 + '-01.jpg' is exactly 60.
    const at = `${'a'.repeat(57)}-01.jpg`;        // 64
    const over = `${'a'.repeat(58)}-01.jpg`;      // 65
    assert.equal(at.length, 64);
    assert.equal(over.length, 65);
    assert.ok(pathFor({ kind: 'image', file: at }), 'exactly at the bound must pass');
    assert.equal(pathFor({ kind: 'image', file: over }), null, 'one over the bound must fail');
    assert.equal(pathFor({ kind: 'image', file: `${'a'.repeat(5000)}-01.jpg` }), null);

    // And the commit-message subject is bounded by the same rule.
    assert.equal(commitMessage('publish clinic photo', over), null);
    assert.ok(commitMessage('publish clinic photo', at));
  });

  test('the length bound does not weaken traversal or extension checks', () => {
    // Short but hostile must still be refused.
    for (const file of ['../x-01.jpg', 'a/b-01.jpg', 'x-01.svg', 'x-1.jpg']) {
      assert.equal(pathFor({ kind: 'image', file }), null, `accepted ${file}`);
    }
  });

  test('an unknown target kind is refused', () => {
    assert.equal(pathFor({ kind: 'workflow' } as unknown as WriteTarget), null);
  });
});

describe('a refusal never reaches the network', () => {
  test('writing to a traversal filename makes no API call', async () => {
    const { result, calls } = await withGitHub([okWrite], () =>
      write({ kind: 'image', file: '../../.github/workflows/deploy.yml' }, { verb: 'add clinic photo' }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.reason, 'refused');
    assert.deepEqual(calls, [], 'a refused write must not contact GitHub');
  });

  test('writing an SVG makes no API call', async () => {
    const { result, calls } = await withGitHub([okWrite], () =>
      write({ kind: 'image', file: 'reception-01.svg' }, { verb: 'add clinic photo' }),
    );
    assert.equal(result.ok === false && result.reason, 'refused');
    assert.deepEqual(calls, []);
  });

  test('deleting an unpermitted path makes no API call', async () => {
    const { result, calls } = await withGitHub([okWrite], () =>
      deleteFile(env, {
        target: { kind: 'image', file: '../../../.github/workflows/deploy.yml' },
        verb: 'delete clinic photo', sha: 'x',
      }),
    );
    assert.equal(result.ok === false && result.reason, 'refused');
    assert.deepEqual(calls, []);
  });

  test('a delete without a sha is refused before any call', async () => {
    const { result, calls } = await withGitHub([okWrite], () =>
      deleteFile(env, {
        target: { kind: 'hours' }, verb: 'delete clinic photo', sha: '',
      }),
    );
    assert.equal(result.ok === false && result.reason, 'refused');
    assert.deepEqual(calls, []);
  });
});

describe('commit messages contain no user-controlled text', () => {
  test('the template is fixed and names only a verb and the fixed CMS label', () => {
    assert.equal(
      commitMessage('update opening hours'),
      'cms(hours): update opening hours\n\nChanged by: CMS admin\n',
    );
    assert.equal(
      commitMessage('publish clinic photo', 'reception-03.jpg'),
      'cms(media): publish clinic photo reception-03.jpg\n\nChanged by: CMS admin\n',
    );
  });

  test('a verb outside the union is refused', () => {
    for (const verb of ['rm -rf', 'update opening hours\n\nevil', '', 'toString']) {
      assert.equal(commitMessage(verb as never), null, `accepted ${verb}`);
    }
  });

  test('a subject outside the filename convention is refused', () => {
    for (const subject of ['../../evil.yml', 'reception-01.svg', 'anything at all', 'a\nb-01.jpg']) {
      assert.equal(commitMessage('publish clinic photo', subject), null, `accepted ${subject}`);
    }
  });

  // The repository is public. An identity smuggled into the request object —
  // by a future caller, or a refactor restoring the old field — must still
  // never reach the message GitHub stores.
  test('an identity passed alongside a write never reaches the commit', async () => {
    const { calls } = await withGitHub([okWrite], () =>
      write({ kind: 'hours' }, { sha: 'old', actor: DOCTOR, email: DOCTOR } as never),
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body?.message, 'cms(hours): update opening hours\n\nChanged by: CMS admin\n');
    assert.ok(!JSON.stringify(calls[0].body).includes('@'), 'an address reached the GitHub request');
  });

  test('the message sent to GitHub is the built template, verbatim', async () => {
    const { calls } = await withGitHub([okWrite], () => write({ kind: 'hours' }, { sha: 'old' }));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body?.message, 'cms(hours): update opening hours\n\nChanged by: CMS admin\n');
  });
});

describe('the request is built entirely from constants', () => {
  test('owner, repo and branch come from the Worker, not the caller', async () => {
    const { calls } = await withGitHub([okWrite], () => write({ kind: 'hours' }, { sha: 'old' }));
    assert.equal(
      calls[0].url,
      'https://api.github.com/repos/saeedkhoury/dr-khalil-kanani-web/contents/src/data/hours.json',
    );
    assert.equal(calls[0].body?.branch, 'cms-test-branch');
  });

  test('the branch is never defaulted — unset refuses', async () => {
    // Defaulting to main would mean a misconfigured deployment publishes
    // straight to the live website.
    for (const branch of [undefined, '', '   ']) {
      const e = { ...env, ...(branch === undefined ? { CONTENT_BRANCH: undefined } : { CONTENT_BRANCH: branch }) };
      const { result, calls } = await withGitHub([okWrite], () =>
        writeFile(e as Env, { target: { kind: 'hours' }, content: '[]', verb: 'update opening hours' }),
      );
      assert.equal(result.ok === false && result.reason, 'not_configured', `branch=${JSON.stringify(branch)}`);
      assert.deepEqual(calls, []);
    }
  });

  test('a missing token refuses without calling GitHub', async () => {
    const { result, calls } = await withGitHub([okWrite], () =>
      writeFile({ ...env, GITHUB_TOKEN: undefined } as Env, {
        target: { kind: 'hours' }, content: '[]', verb: 'update opening hours',
      }),
    );
    assert.equal(result.ok === false && result.reason, 'not_configured');
    assert.deepEqual(calls, []);
  });

  test('surrounding whitespace in the branch is trimmed, not rejected', async () => {
    // Benign: "  main\n" names the branch `main`. Trimming config whitespace
    // is normalisation, and refusing it would be a confusing failure mode.
    const { result, calls } = await withGitHub([okWrite], () =>
      writeFile({ ...env, CONTENT_BRANCH: '  cms-test-branch\n' } as Env, {
        target: { kind: 'hours' }, content: '[]', verb: 'update opening hours', sha: 'old',
      }),
    );
    assert.equal(result.ok, true);
    assert.equal(calls[0].body?.branch, 'cms-test-branch');
  });

  test('a branch name that could traverse refs or inject is refused', async () => {
    // An EMBEDDED control character survives trim(), which is the case that
    // matters — and which JavaScript's `$` would otherwise let through.
    for (const branch of ['../main', 'a..b', 'main;rm -rf', 'main branch', 'ma\nin', 'main\u0000x', 'refs/heads/../x']) {
      const { result, calls } = await withGitHub([okWrite], () =>
        writeFile({ ...env, CONTENT_BRANCH: branch } as Env, {
          target: { kind: 'hours' }, content: '[]', verb: 'update opening hours',
        }),
      );
      assert.equal(result.ok === false && result.reason, 'not_configured', `accepted branch ${JSON.stringify(branch)}`);
      assert.deepEqual(calls, []);
    }
  });
});

describe('the token stays inside the Worker', () => {
  test('it appears only in the Authorization header', async () => {
    const { calls } = await withGitHub([okWrite], () => write({ kind: 'hours' }, { sha: 'old' }));
    const call = calls[0];
    assert.equal(call.headers.Authorization, `Bearer ${TOKEN}`);
    // Nowhere else: not the URL, not the body.
    assert.ok(!call.url.includes(TOKEN), 'token in the URL');
    assert.ok(!JSON.stringify(call.body).includes(TOKEN), 'token in the body');
  });

  test('it never appears in any returned value, success or failure', async () => {
    const outcomes: unknown[] = [];
    for (const replies of [
      [okWrite],
      [{ status: 401, body: { message: `Bad credentials for ${TOKEN}` } }],
      [{ status: 404, body: { message: 'Not Found' } }],
      [{ status: 500, body: { message: 'boom' } }],
    ]) {
      const { result } = await withGitHub(replies, () => write({ kind: 'hours' }, { sha: 'old' }));
      outcomes.push(result);
    }
    const serialised = JSON.stringify(outcomes);
    assert.ok(!serialised.includes(TOKEN), 'the token reached a result');
    // And GitHub's own error text never propagates either.
    assert.ok(!serialised.includes('Bad credentials'), 'GitHub error text propagated');
    assert.ok(!serialised.includes('boom'));
  });

  test('a GitHub error is mapped to our vocabulary, never passed through', async () => {
    const cases: Array<[number, string]> = [
      [404, 'not_found'], [409, 'conflict'], [422, 'conflict'],
      [401, 'unauthorized'], [403, 'unauthorized'], [429, 'rate_limited'],
      [500, 'unavailable'], [502, 'unavailable'],
    ];
    for (const [status, reason] of cases) {
      const { result } = await withGitHub([{ status, body: { message: 'x' } }], () =>
        write({ kind: 'hours' }, { sha: 'old' }),
      );
      assert.equal(result.ok === false && result.reason, reason, `status ${status}`);
    }
  });
});

describe('conflicts never overwrite a newer revision', () => {
  test('hours stop on a stale sha', async () => {
    // Replacing the whole week would discard someone else's newer edit.
    const { result, calls } = await withGitHub(
      [
        { status: 409, body: { message: 'conflict' } },
        { status: 200, body: { content: btoa('[]'), encoding: 'base64', sha: 'fresh-sha' } },
        okWrite,
      ],
      () => write({ kind: 'hours' }, { sha: 'stale' }),
    );
    assert.equal(result.ok === false && result.reason, 'conflict');
    assert.equal(calls.length, 1, 'must not re-read or overwrite');
  });

  test('no retry occurs even if another revision is available', async () => {
    const { result, calls } = await withGitHub(
      [
        { status: 409, body: {} },
        { status: 200, body: { content: btoa('[]'), encoding: 'base64', sha: 'fresh' } },
        { status: 409, body: {} },
      ],
      () => write({ kind: 'hours' }, { sha: 'stale' }),
    );
    assert.equal(result.ok === false && result.reason, 'conflict');
    assert.equal(calls.length, 1, 'no retries');
  });

  test('a photo append is NEVER retried', async () => {
    // A retry could double-add. The caller must not opt in, and the default
    // must not retry for it.
    const { result, calls } = await withGitHub([{ status: 409, body: {} }, okWrite], () =>
      writeFile(env, {
        target: { kind: 'photography' }, content: '[]',
        verb: 'add clinic photo', sha: 'stale',
      }),
    );
    assert.equal(result.ok === false && result.reason, 'conflict');
    assert.equal(calls.length, 1, 'a non-idempotent write must not be retried');
  });

  test('a delete is never retried', async () => {
    const { result, calls } = await withGitHub([{ status: 409, body: {} }, okWrite], () =>
      deleteFile(env, {
        target: { kind: 'image', file: 'reception-01.jpg' },
        verb: 'delete clinic photo', subject: 'reception-01.jpg', sha: 'stale',
      }),
    );
    assert.equal(result.ok === false && result.reason, 'conflict');
    assert.equal(calls.length, 1);
  });
});

describe('a success is never reported falsely', () => {
  test('a 200 with no commit sha is not a success', async () => {
    const { result } = await withGitHub([{ status: 200, body: { ok: 'sure' } }], () =>
      write({ kind: 'hours' }, { sha: 'old' }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.reason, 'unavailable');
  });

  test('a 500 is not a success', async () => {
    const { result } = await withGitHub([{ status: 500, body: {} }], () => write({ kind: 'hours' }, { sha: 'old' }));
    assert.equal(result.ok, false);
  });

  test('a successful write reports the commit sha', async () => {
    const { result } = await withGitHub([okWrite], () => write({ kind: 'hours' }, { sha: 'old' }));
    assert.deepEqual(result, { ok: true, data: { commit: 'commit-sha-1', blob: 'blob-sha-1' } });
  });
});

describe('reading', () => {
  test('base64 content is decoded and the sha returned', async () => {
    const text = '[{"day":"Sunday"}]';
    const { result, calls } = await withGitHub(
      [{ status: 200, body: { content: btoa(text), encoding: 'base64', sha: 'blob-sha' } }],
      () => readFile(env, { kind: 'hours' }),
    );
    assert.deepEqual(result, { ok: true, data: { text, sha: 'blob-sha' } });
    assert.match(calls[0].url, /\?ref=cms-test-branch$/);
    assert.equal(calls[0].method, 'GET');
  });

  test('UTF-8 survives the round trip', async () => {
    // Hebrew and Arabic alt text must not be mangled.
    const text = '{"he":"אזור ההמתנה","ar":"منطقة الانتظار"}';
    const b64 = Buffer.from(text, 'utf8').toString('base64');
    const { result } = await withGitHub(
      [{ status: 200, body: { content: b64, encoding: 'base64', sha: 's' } }],
      () => readFile(env, { kind: 'photography' }),
    );
    assert.equal(result.ok && result.data.text, text);
  });

  test('a missing file is not_found, not an error', async () => {
    const { result } = await withGitHub([{ status: 404, body: {} }], () => readFile(env, { kind: 'hours' }));
    assert.equal(result.ok === false && result.reason, 'not_found');
  });

  test('an unexpected encoding is refused rather than guessed', async () => {
    const { result } = await withGitHub(
      [{ status: 200, body: { content: 'x', encoding: 'utf-8', sha: 's' } }],
      () => readFile(env, { kind: 'hours' }),
    );
    assert.equal(result.ok === false && result.reason, 'unavailable');
  });

  test('reading a refused target makes no call', async () => {
    const { result, calls } = await withGitHub([okWrite], () =>
      readFile(env, { kind: 'image', file: '../../secrets.yml' }),
    );
    assert.equal(result.ok === false && result.reason, 'refused');
    assert.deepEqual(calls, []);
  });
});

describe('binary content', () => {
  test('image bytes are base64 encoded intact', async () => {
    // A PNG magic-byte prefix plus bytes that are invalid UTF-8, to prove the
    // content is not being pushed through a text encoder.
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe, 0x00, 0x01]);
    const { calls } = await withGitHub([okWrite], () =>
      writeFile(env, {
        target: { kind: 'image', file: 'reception-01.png' }, content: bytes,
        verb: 'add clinic photo', subject: 'reception-01.png',
      }),
    );
    const sent = String(calls[0].body?.content);
    assert.deepEqual(Uint8Array.from(atob(sent), (c) => c.charCodeAt(0)), bytes);
  });
});
