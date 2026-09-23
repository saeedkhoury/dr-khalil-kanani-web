/**
 * Publication status.
 *
 * The one rule these tests exist to defend: a commit is not a publication.
 * Telling the doctor his corrected opening hours are live when they are not
 * is how a patient arrives at a locked door.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { classifyRuns, findLatestCmsCommit } from '../../workers/admin/src/status.ts';
import { adminEnv, adminRequest, callAdmin, REPO_CONTENTS } from '../helpers/admin-api.ts';
import type { Env } from '../../workers/admin/src/http.ts';

const RUNS = 'https://api.github.com/repos/saeedkhoury/dr-khalil-kanani-web/actions/runs';
const COMMITS = 'https://api.github.com/repos/saeedkhoury/dr-khalil-kanani-web/commits';
const SHA = 'a'.repeat(40);

const run = (status: string, conclusion: string | null, updated = '2026-09-23T10:00:00Z') =>
  ({ status, conclusion, updated_at: updated });

describe('a commit is not a publication', () => {
  test('no run yet is committed, never published or failed', () => {
    assert.deepEqual(classifyRuns([]), { state: 'committed', completedAt: null, reason: null });
  });

  test('a queued or running workflow is committed', () => {
    assert.equal(classifyRuns([run('queued', null)]).state, 'committed');
    assert.equal(classifyRuns([run('in_progress', null)]).state, 'committed');
  });

  test('published requires conclusion: success and nothing less', () => {
    assert.equal(classifyRuns([run('completed', 'success')]).state, 'published');
    // Every other conclusion is a failure, not a partial success.
    for (const conclusion of [
      'failure', 'cancelled', 'timed_out', 'action_required',
      'startup_failure', 'stale', 'neutral', 'skipped',
    ]) {
      assert.equal(classifyRuns([run('completed', conclusion)]).state, 'failed', conclusion);
    }
  });

  test('a completed run with no conclusion is not treated as success', () => {
    assert.equal(classifyRuns([run('completed', null)]).state, 'failed');
  });

  test('with several runs the strictest answer wins', () => {
    // One failure means the change did not reach the site, whatever else
    // succeeded.
    assert.equal(classifyRuns([run('completed', 'success'), run('completed', 'failure')]).state, 'failed');
    // And everything must have finished before it is called published.
    assert.equal(classifyRuns([run('completed', 'success'), run('in_progress', null)]).state, 'committed');
  });

  test('the failure reason is a stable key, never GitHub text', () => {
    // GitHub's own wording is English, changes without notice, and can carry
    // detail the panel should not render.
    assert.equal(classifyRuns([run('completed', 'failure')]).reason, 'checks_failed');
    assert.equal(classifyRuns([run('completed', 'timed_out')]).reason, 'timed_out');
    assert.equal(classifyRuns([run('completed', 'cancelled')]).reason, 'cancelled');
    for (const conclusion of ['failure', 'timed_out', 'cancelled', 'weird_new_thing']) {
      const reason = classifyRuns([run('completed', conclusion)]).reason;
      assert.match(reason ?? '', /^[a-z_]+$/, `"${reason}" is not a machine key`);
    }
  });

  test('success and in-progress carry no reason', () => {
    assert.equal(classifyRuns([run('completed', 'success')]).reason, null);
    assert.equal(classifyRuns([run('queued', null)]).reason, null);
  });

  test('the completion time is the latest run that reported one', () => {
    const status = classifyRuns([
      run('completed', 'success', '2026-09-23T10:00:00Z'),
      run('completed', 'success', '2026-09-23T10:05:00Z'),
    ]);
    assert.equal(status.completedAt, '2026-09-23T10:05:00Z');
  });
});

describe('finding the last CMS change', () => {
  const commit = (sha: string, message: string, date = '2026-09-23T09:00:00Z') =>
    ({ sha, commit: { message, author: { date } } });

  test('picks the most recent cms( commit', () => {
    const result = findLatestCmsCommit([
      commit('b'.repeat(40), 'chore: unrelated developer commit'),
      commit('c'.repeat(40), 'cms(hours): update opening hours\n\nChanged by: doctor@example.test'),
      commit('d'.repeat(40), 'cms(media): add clinic photo reception-01.jpg'),
    ]);
    assert.deepEqual(result, { sha: 'c'.repeat(40), at: '2026-09-23T09:00:00Z' });
  });

  test('ignores developer commits entirely', () => {
    assert.equal(findLatestCmsCommit([commit('e'.repeat(40), 'feat: something')]), null);
  });

  test('a repository with no CMS commit is not an error', () => {
    // A clean panel on a repository nobody has edited yet.
    assert.equal(findLatestCmsCommit([]), null);
  });

  test('a commit merely mentioning cms( in its body is not matched', () => {
    // Only the headline counts, so a developer writing about the CMS does not
    // become the doctor's "last change".
    assert.equal(findLatestCmsCommit([commit('f'.repeat(40), 'docs: explain cms(hours) messages')]), null);
  });
});

describe('GET /api/status', () => {
  test('returns the state for a commit', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest(`/api/status?sha=${SHA}`),
      [{ status: 200, body: { workflow_runs: [run('completed', 'success')] } }],
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      data: { state: 'published', completedAt: '2026-09-23T10:00:00Z', reason: null },
    });
    assert.equal(calls[0].url, `${RUNS}?head_sha=${SHA}&per_page=20`);
    assert.equal(calls[0].method, 'GET');
  });

  test('a sha that is not a git object name never reaches GitHub', async () => {
    // The one place caller text reaches a GitHub URL.
    for (const sha of ['../../etc', 'main', '', 'zzzz', `${SHA}&x=1`, 'abc', "a' OR '1"]) {
      const { response, calls } = await callAdmin(
        await adminRequest(`/api/status?sha=${encodeURIComponent(sha)}`),
        [{ status: 200, body: { workflow_runs: [] } }],
      );
      assert.equal(response.status, 400, `accepted sha=${sha}`);
      assert.deepEqual(calls, [], `${sha} reached GitHub`);
    }
  });

  test('a missing sha is refused', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/status'), [{ status: 200, body: {} }],
    );
    assert.equal(response.status, 400);
    assert.deepEqual(calls, []);
  });

  test('an unauthenticated request never reaches GitHub', async () => {
    const original = await adminRequest(`/api/status?sha=${SHA}`);
    const anonymous = new Request(original.url);
    const { response, calls } = await callAdmin(anonymous, [{ status: 200, body: {} }]);
    assert.equal(response.status, 401);
    assert.deepEqual(calls, []);
  });
});

describe('GET /api/status/latest', () => {
  test('finds the last CMS commit and reports its state', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/status/latest'),
      [
        { status: 200, body: [{ sha: SHA, commit: { message: 'cms(hours): update opening hours', author: { date: '2026-09-23T09:00:00Z' } } }] },
        { status: 200, body: { workflow_runs: [run('completed', 'failure')] } },
      ],
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      data: {
        sha: SHA, committedAt: '2026-09-23T09:00:00Z',
        state: 'failed', completedAt: '2026-09-23T10:00:00Z', reason: 'checks_failed',
      },
    });
    assert.equal(calls[0].url, `${COMMITS}?sha=cms-test-branch&per_page=20`);
  });

  test('a repository with no CMS commit returns null, not an error', async () => {
    const { response } = await callAdmin(
      await adminRequest('/api/status/latest'),
      [{ status: 200, body: [{ sha: SHA, commit: { message: 'chore: something' } }] }],
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: null });
  });

  test('status queries are read-only — no write is ever issued', async () => {
    const { calls } = await callAdmin(
      await adminRequest('/api/status/latest'),
      [
        { status: 200, body: [{ sha: SHA, commit: { message: 'cms(hours): x' } }] },
        { status: 200, body: { workflow_runs: [] } },
      ],
    );
    for (const call of calls) {
      assert.equal(call.method, 'GET', `${call.url} was not a read`);
      assert.equal(call.body, null);
    }
    assert.ok(!calls.some((c) => c.url.startsWith(REPO_CONTENTS)), 'status must not touch contents');
  });

  test('POST is not allowed on either status route', async () => {
    for (const path of ['/api/status', '/api/status/latest']) {
      const { response } = await callAdmin(
        await adminRequest(path, { method: 'POST', body: {} }), [{ status: 200, body: {} }],
      );
      assert.equal(response.status, 405, path);
    }
  });

  test('an unconfigured deployment reports that rather than guessing', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/status/latest'), [{ status: 200, body: [] }],
      { ...adminEnv, GITHUB_TOKEN: undefined } as Env,
    );
    assert.equal(response.status, 503);
    assert.deepEqual(calls, []);
  });
});
