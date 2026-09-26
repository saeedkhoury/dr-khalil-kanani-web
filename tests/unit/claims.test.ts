import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { blockingClaims } from '../../src/lib/claims.ts';

for (const [locale, claim] of [['he', 'מובטח'], ['ar', 'مضمون'], ['en', 'guaranteed']]) {
  test(`shared claims rules reject ${locale}`, () => {
    assert.ok(blockingClaims(claim).some((f) => f.rule === 'guarantee'));
    assert.deepEqual(blockingClaims('Reception / קבלה / استقبال'), []);
  });
}

test('CLI checks decoded CMS alt and captions in all locales without stripping content', () => {
  const root = mkdtempSync(join(tmpdir(), 'kanani-claims-'));
  try {
    for (const dir of ['scripts', 'src/lib', 'src/data']) mkdirSync(join(root, dir), { recursive: true });
    for (const file of ['scripts/lint-claims.ts', 'src/lib/claims.ts']) cpSync(file, join(root, file));
    writeFileSync(join(root, 'src/data/hours.json'), '[]');
    writeFileSync(join(root, 'src/data/treatment-work.json'), '[]');
    for (const file of ['services', 'general-faq', 'doctor-profile', 'managed-copy', 'contact-facts']) {
      writeFileSync(join(root, `src/data/${file}.json`), '{}');
    }
    const manifest = join(root, 'src/data/clinic-photography.json');
    for (const field of ['alt', 'caption']) {
      for (const [locale, claim] of [['he', 'מובטח'], ['ar', 'مضمون'], ['en', 'guaranteed']]) {
        for (const text of [claim, `// ${claim}`, `/* ${claim} */`]) {
          // Every character escaped: a raw-source scan would miss the claim.
          writeFileSync(manifest, JSON.stringify([{ [field]: { [locale]: text } }])
            .replace(/[^\x00-\x7f]|[a-z]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`));
          const result = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/lint-claims.ts'], { cwd: root, encoding: 'utf8' });
          assert.equal(result.status, 1, `${field}.${locale}: ${result.stdout}${result.stderr}`);
          assert.match(result.stdout, /guarantee/);
        }
      }
    }
    writeFileSync(manifest, JSON.stringify([{ alt: { he: 'קבלה', ar: 'استقبال', en: 'Reception' } }]));
    assert.equal(spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/lint-claims.ts'], { cwd: root }).status, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
