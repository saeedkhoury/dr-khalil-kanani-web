/**
 * Edit Mode in a real browser.
 *
 * The product claim is that the doctor edits his own website rather than a
 * dashboard, so these run against the admin build of the SAME Astro pages —
 * the ones scripts/compare-admin-public.mjs proves are byte-identical to the
 * public site once the editor chrome is removed.
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ADMIN = 'http://127.0.0.1:4332';
// reducedMotion matches the public suite. Auditing an element mid-fade
// measures a composited opacity value rather than the declared colour.
test.use({ baseURL: ADMIN, reducedMotion: 'reduce' });

/** Drag one element onto another using real pointer events. */
async function dragOnto(page: Page, from: string, to: string) {
  const a = await page.locator(from).boundingBox();
  const b = await page.locator(to).boundingBox();
  if (!a || !b) throw new Error('drag targets not visible');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  // Several moves: one jump can land before the handler has captured.
  for (const step of [0.3, 0.6, 1]) {
    await page.mouse.move(a.x + a.width / 2, a.y + (b.y - a.y) * step + b.height * 0.75, { steps: 6 });
  }
  await page.mouse.up();
}

test('Edit Mode is the website, with a restrained bar on top', async ({ page }) => {
  await page.goto(`${ADMIN}/he/`);

  // The real page, not a dashboard: its own sections are present.
  await expect(page.locator('#main')).toBeVisible();
  await expect(page.locator('[data-gallery-kind="work"]')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  // And the editor bar.
  await expect(page.locator('.visual-editor-bar')).toBeVisible();
  await expect(page.locator('.visual-edit-control').first()).toBeVisible();
});

test('the admin host asks search engines to stay away', async ({ page }) => {
  await page.goto(`${ADMIN}/he/`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test('contextual controls sit beside the sections they edit', async ({ page }) => {
  await page.goto(`${ADMIN}/he/`);
  for (const kind of ['copy', 'doctor', 'services', 'faq', 'hours', 'contact']) {
    await expect(page.locator(`[data-edit-kind="${kind}"]`).first()).toBeVisible();
  }
});

test('preview hides every control and restores them', async ({ page }) => {
  await page.goto(`${ADMIN}/he/`);
  const control = page.locator('.visual-edit-control').first();
  await expect(control).toBeVisible();

  await page.getByRole('button', { name: 'תצוגת מטופל' }).click();
  await expect(control).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-visual-preview', '');

  await page.getByRole('button', { name: 'חזרה לעריכה' }).click();
  await expect(control).toBeVisible();
});

test('editing opens a dialog holding the real content', async ({ page }) => {
  await page.goto(`${ADMIN}/he/`);
  await page.locator('[data-edit-kind="hours"]').first().click();

  const dialog = page.locator('dialog.visual-dialog');
  await expect(dialog).toBeVisible();
  // Values come from the repository, not from placeholders. The exact time is
  // deliberately not asserted: another spec saves hours against the same
  // in-memory fixture, and coupling to its value would make this flake.
  await expect(dialog.locator('input[type="time"]').first()).toHaveValue(/^\d{2}:\d{2}$/);
  await expect(dialog.locator('input[type="time"]')).not.toHaveCount(0);
});

test('text editors separate the three languages with the right direction', async ({ page }) => {
  await page.goto(`${ADMIN}/he/`);
  await page.locator('[data-edit-kind="doctor"]').first().click();
  const dialog = page.locator('dialog.visual-dialog');
  await expect(dialog).toBeVisible();

  await expect(dialog.locator('[lang="he"]').first()).toHaveAttribute('dir', 'rtl');
  await expect(dialog.locator('[lang="ar"]').first()).toHaveAttribute('dir', 'rtl');
  await expect(dialog.locator('[lang="en"]').first()).toHaveAttribute('dir', 'ltr');
});

test('a look-alike letter is refused at the field it is in, not as an anonymous banner', async ({ page }) => {
  // 2026-09-30, staging: one Cyrillic "а" in an English field was refused
  // with "retype the word" — with a dozen fields open, and no hint which.
  await page.goto(`${ADMIN}/he/`);
  await page.locator('[data-edit-kind="doctor"]').first().click();
  const dialog = page.locator('dialog.visual-dialog');
  const field = dialog.locator('input[lang="en"], textarea[lang="en"]').first();
  await expect(field).toBeVisible();
  await field.fill(`${await field.inputValue()} Dent\u0430l`);
  await dialog.getByRole('button', { name: 'שמירה' }).click();

  await expect(field).toHaveAttribute('aria-invalid', 'true');
  const issue = dialog.locator('.visual-link', { hasText: 'מאלפבית אחר' });
  await expect(issue).toHaveCount(1);
  await expect(issue).toContainText('English');
});

/** The first English string in an edited value, and a setter for it. */
function firstEnglish(value: unknown): { get: () => string; set: (v: string) => void } | null {
  if (value === null || typeof value !== 'object') return null;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'en' && typeof child === 'string' && child) {
      const owner = value as Record<string, unknown>;
      return { get: () => owner.en as string, set: (v) => { owner.en = v; } };
    }
    const found = firstEnglish(child);
    if (found) return found;
  }
  return null;
}

test.describe('unsaved work that the doctor discards is never offered back over newer content', () => {
  // 2026-09-30, staging: after a stale-edit refusal the doctor pressed
  // "load the latest", agreed to lose the edit — and was then offered it
  // back as "unsaved changes on this device". Accepting put the stale text
  // over the other tab's change, and the next save overwrote it silently.
  test('"load the latest" after a conflict does not resurrect the discarded edit', async ({ page }) => {
    const prompts: string[] = [];
    page.on('dialog', (dialog) => { prompts.push(dialog.message()); void dialog.accept(); });
    let reads = 0;
    await page.route('**/api/content/doctor', async (route) => {
      if (route.request().method() === 'GET') {
        const response = await route.fetch();
        const body = await response.json();
        reads += 1;
        if (reads > 1) { const en = firstEnglish(body.data.value)!; en.set(`${en.get()} OTHER-TAB`); }
        return route.fulfill({ response, json: body });
      }
      return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ ok: false, error: { code: 'CONFLICT' } }) });
    });
    await page.goto(`${ADMIN}/he/`);
    await page.locator('[data-edit-kind="doctor"]').first().click();
    const dialog = page.locator('dialog.visual-dialog');
    const field = dialog.locator('input[lang="en"], textarea[lang="en"]').first();
    await field.fill('MINE');
    await page.waitForTimeout(600); // the rescue copy is written 400 ms after typing
    await dialog.getByRole('button', { name: 'שמירה' }).click();
    await dialog.getByRole('button', { name: 'טעינה מחדש של התוכן העדכני' }).click();

    await expect.poll(() => reads).toBe(2);
    await expect.poll(() => dialog.locator('input, textarea').evaluateAll(
      (nodes) => nodes.some((n) => (n as HTMLInputElement).value.includes('OTHER-TAB')))).toBe(true);
    expect(prompts.some((m) => m.includes('נמצאו במכשיר הזה'))).toBe(false);
    expect(await page.evaluate(() => localStorage.getItem('visual-unsaved-doctor'))).toBeNull();
  });

  test('a rescued draft keeps the version it was written against, so it cannot overwrite newer content', async ({ page }) => {
    page.on('dialog', (dialog) => { void dialog.accept(); });
    let baseSha = '';
    let sentSha = '';
    let newer = false;
    await page.route('**/api/content/doctor', async (route) => {
      if (route.request().method() === 'GET') {
        const response = await route.fetch();
        const body = await response.json();
        if (!baseSha) baseSha = body.data.sha;
        // Someone else saved while this device was away.
        if (newer) body.data.sha = 'e'.repeat(40);
        return route.fulfill({ response, json: body });
      }
      sentSha = route.request().postDataJSON().sha;
      return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ ok: false, error: { code: 'CONFLICT' } }) });
    });
    await page.goto(`${ADMIN}/he/`);
    await page.locator('[data-edit-kind="doctor"]').first().click();
    const dialog = page.locator('dialog.visual-dialog');
    await dialog.locator('input[lang="en"], textarea[lang="en"]').first().fill('WRITTEN BEFORE THE SESSION ENDED');
    await page.waitForTimeout(600);
    newer = true;
    await page.reload();
    await page.locator('[data-edit-kind="doctor"]').first().click();
    await expect(dialog.locator('input[lang="en"], textarea[lang="en"]').first()).toHaveValue('WRITTEN BEFORE THE SESSION ENDED');
    await dialog.getByRole('button', { name: 'שמירה' }).click();

    await expect.poll(() => sentSha).toBe(baseSha);
    await expect(dialog.getByRole('button', { name: 'טעינה מחדש של התוכן העדכני' })).toBeVisible();
  });
});

test('closing with unsaved edits asks first', async ({ page }) => {
  await page.goto(`${ADMIN}/he/`);
  await page.locator('[data-edit-kind="doctor"]').first().click();
  const dialog = page.locator('dialog.visual-dialog');
  await expect(dialog).toBeVisible();

  await dialog.locator('textarea').first().fill('נוסח חדש לבדיקה');

  let asked = false;
  page.on('dialog', async (native) => { asked = true; await native.dismiss(); });
  await page.getByRole('button', { name: 'סגירה' }).click();

  expect(asked).toBe(true);
  await expect(dialog).toBeVisible();   // dismissed => stays open, nothing lost
});

test('FAQ entries can be dragged into a new order', async ({ page }) => {
  await page.goto(`${ADMIN}/he/`);
  await page.locator('[data-edit-kind="faq"]').first().click();
  const dialog = page.locator('dialog.visual-dialog');
  await expect(dialog).toBeVisible();

  const items = dialog.locator('.visual-sortable > .visual-item');
  await expect(items).not.toHaveCount(0);
  const before = await items.first().locator('h3').innerText();

  await dragOnto(page, '.visual-sortable > .visual-item:nth-of-type(1) .visual-grip', '.visual-sortable > .visual-item:nth-of-type(3)');

  const after = await items.first().locator('h3').innerText();
  expect(after).not.toBe(before);
});

test('every draggable list also has keyboard controls', async ({ page }) => {
  // Dragging is unreachable by keyboard, so the buttons are the same feature
  // offered a second way — not a nicety.
  await page.goto(`${ADMIN}/he/`);
  await page.locator('[data-edit-kind="faq"]').first().click();
  const dialog = page.locator('dialog.visual-dialog');
  await expect(dialog.getByRole('button', { name: 'למעלה' }).first()).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'למטה' }).first()).toBeVisible();

  const rows = dialog.locator('.visual-sortable > .visual-item');
  const first = await rows.first().locator('h3').innerText();
  await rows.nth(1).getByRole('button', { name: 'למעלה' }).click();
  expect(await rows.first().locator('h3').innerText()).not.toBe(first);
});

// The gallery and treatment journeys moved to cms-journeys.spec.ts, where they
// are exercised end to end rather than checked for the presence of buttons.

test('Edit Mode is usable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${ADMIN}/he/`);

  await expect(page.locator('.visual-editor-bar')).toBeVisible();
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);

  await page.locator('[data-edit-kind="hours"]').first().click();
  const dialog = page.locator('dialog.visual-dialog');
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(375);
});

test('Edit Mode has no accessibility violations', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${ADMIN}/he/`);
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
});

// Six buttons all announced as "Edit" told a screen-reader user nothing. The
// visible label is the accessible name, so the two can never drift apart.
for (const [locale, generic] of [['he', 'עריכה'], ['ar', 'تعديل'], ['en', 'Edit']] as const) {
  test(`every edit control names its section (${locale})`, async ({ page }) => {
    for (const path of [`/${locale}/`, `/${locale}/contact/`, `/${locale}/about/`]) {
      await page.goto(`${ADMIN}${path}`);
      const controls = page.locator('.visual-edit-control');
      const count = await controls.count();
      expect(count, path).toBeGreaterThan(0);
      // A name may repeat only where the button does the same thing — the
      // contact page offers the contact editor beside both places it renders.
      // That is WCAG 3.2.4 consistency, not ambiguity.
      const opens = new Map<string, string>();
      for (let i = 0; i < count; i += 1) {
        const control = controls.nth(i);
        await expect(control).not.toHaveAttribute('aria-label', /.*/);
        const name = (await control.innerText()).trim();
        expect(name, `${path} control ${i}`).not.toBe(generic);
        expect(name.length, `${path} control ${i}`).toBeGreaterThan(generic.length);
        const target = `${await control.getAttribute('data-edit-kind')}:${await control.getAttribute('data-edit-focus') ?? ''}`;
        expect(opens.get(name) ?? target, `${path}: "${name}" opens two different editors`).toBe(target);
        opens.set(name, target);
      }
      const targets = new Set(opens.values());
      expect(targets.size, `${path}: two editors share a name`).toBe(opens.size);
    }
  });
}

test('the Edit Mode bar stays compact on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${ADMIN}/he/`);
  const bar = page.locator('.visual-editor-bar');
  await expect(bar).toBeVisible();

  // Short notice, one line; the long one is for wide screens.
  await expect(bar.locator('.visual-bar-notice-short')).toBeVisible();
  await expect(bar.locator('.visual-bar-notice-long')).toBeHidden();
  const notice = await bar.locator('.visual-bar-notice').boundingBox();
  expect(notice!.height).toBeLessThanOrEqual(24);

  // The whole bar no taller than three compact rows over the page.
  expect((await bar.boundingBox())!.height).toBeLessThanOrEqual(140);

  // Every action remains a comfortable touch target.
  for (const action of await bar.locator('a, button').all()) {
    expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }

  // The action strip may scroll sideways; the page must not.
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);

  // Wide screens keep the full notice.
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(bar.locator('.visual-bar-notice-long')).toBeVisible();
  await expect(bar.locator('.visual-bar-notice-short')).toBeHidden();
});

test('a dialog shows a loading state until its content arrives', async ({ page }) => {
  await page.goto(`${ADMIN}/he/`);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/content/faq', async (route) => { await held; await route.continue(); });

  await page.locator('[data-edit-kind="faq"]').first().click();
  const dialog = page.locator('dialog.visual-dialog');
  const status = dialog.locator('.visual-loading[role="status"]');
  await expect(status).toBeVisible();
  await expect(status).toHaveText('טוען את התוכן…');
  await expect(dialog.locator('.visual-skeleton[aria-hidden="true"]')).toBeVisible();
  await expect(dialog.locator('[aria-busy="true"]')).toHaveCount(1);

  release();
  await expect(dialog.locator('.visual-skeleton')).toHaveCount(0);
  await expect(dialog.locator('.visual-loading')).toHaveCount(0);
  await expect(dialog.locator('[aria-busy]')).toHaveCount(0);
  await expect(dialog.locator('.visual-sortable > .visual-item').first()).toBeVisible();
});
