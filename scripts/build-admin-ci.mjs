#!/usr/bin/env node
/**
 * Build Edit Mode in Cloudflare Workers Builds, after every content change.
 *
 * Runs the same data and claims gates as the public deploy, builds the admin
 * site, and records WHICH COMMIT the build contains in dist/build.txt. The
 * Worker reads that file to tell the editor — truthfully — when the page it
 * is serving includes a saved change.
 *
 * Workers Builds injects WORKERS_CI_COMMIT_SHA. Without it this refuses to
 * build: a build that cannot say what it contains would let the editor claim
 * "updated" about the wrong thing. ACK_UNVERIFIED is a build variable set on
 * the trigger, the same acknowledged list the public deploy uses.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const sha = process.env.WORKERS_CI_COMMIT_SHA ?? '';
if (!/^[0-9a-f]{40}$/.test(sha)) {
  console.error('[build-admin-ci] WORKERS_CI_COMMIT_SHA is missing or not a full commit SHA; refusing to build.');
  process.exit(1);
}

const run = (script) => execFileSync('npm', ['run', script], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
run('lint:data');
run('lint:claims');
run('build:admin');
writeFileSync(new URL('../workers/admin/dist/build.txt', import.meta.url), `${sha}\n`);
console.log(`[build-admin-ci] Edit Mode built from ${sha}`);
