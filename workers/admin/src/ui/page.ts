/**
 * SERVER-RENDERED PANEL.
 *
 * The HTML arrives complete: both screens, all seven day rows, every control.
 * JavaScript fills in current values and handles saving, but the structure
 * exists before it runs.
 *
 * Nothing in here is secret. The page carries no token, no repository path
 * and no configuration — it knows only the authenticated email, which the
 * browser already proved to get here.
 */

import { CMS_CATEGORIES } from '../../../../src/lib/data-schema.ts';
import { UI } from './strings.ts';
import { DAY_ORDER } from '../../../../src/lib/data-schema.ts';

/**
 * Escape text for HTML.
 *
 * Every value interpolated below goes through this. The alt text the doctor
 * types is rendered back to him, and a description containing `<script>` must
 * appear as characters rather than run.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hoursRows(): string {
  return DAY_ORDER.map((day, i) => `
    <div class="card day" data-row="${i}">
      <div class="name" id="day-${i}">${escapeHtml(UI.days[day] ?? day)}</div>
      <div class="times">
        <label for="opens-${i}">${escapeHtml(UI.hours.opens)}</label>
        <input type="time" id="opens-${i}" data-opens="${i}" aria-describedby="day-${i}">
        <label for="closes-${i}">${escapeHtml(UI.hours.closes)}</label>
        <input type="time" id="closes-${i}" data-closes="${i}" aria-describedby="day-${i}">
      </div>
      <label class="toggle">
        <input type="checkbox" data-closed="${i}">
        <span>${escapeHtml(UI.hours.closed)}</span>
      </label>
      <p class="error" data-error="${i}" hidden></p>
    </div>`).join('');
}

function categoryOptions(): string {
  return CMS_CATEGORIES
    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(UI.categories[c] ?? c)}</option>`)
    .join('');
}

/** The whole panel. `email` is the authenticated identity, nothing more. */
export function renderPanel(email: string): string {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(UI.title)}</title>
<link rel="stylesheet" href="/panel.css">
</head>
<body>
<header class="bar">
  <h1>${escapeHtml(UI.title)}</h1>
  <div class="who">${escapeHtml(email)}</div>
</header>

<div class="wrap">
  <nav class="tabs" role="tablist">
    <button role="tab" id="tab-hours" aria-controls="panel-hours" aria-selected="true">${escapeHtml(UI.tabs.hours)}</button>
    <button role="tab" id="tab-gallery" aria-controls="panel-gallery" aria-selected="false">${escapeHtml(UI.tabs.gallery)}</button>
  </nav>

  <!-- The status region persists until the next save. No toast: a message
       that disappears is no use to someone who looked away. -->
  <div class="status" id="status" role="status" aria-live="polite" hidden></div>

  <section id="panel-hours" role="tabpanel" aria-labelledby="tab-hours">
    <h2>${escapeHtml(UI.hours.heading)}</h2>
    <p class="intro">${escapeHtml(UI.hours.intro)}</p>
    <form id="hours-form" novalidate>
      ${hoursRows()}
      <button type="submit" class="primary" id="save-hours">${escapeHtml(UI.hours.save)}</button>
    </form>
  </section>

  <section id="panel-gallery" role="tabpanel" aria-labelledby="tab-gallery" hidden>
    <h2>${escapeHtml(UI.gallery.heading)}</h2>

    <h3 class="group-title">${escapeHtml(UI.gallery.published)}</h3>
    <div id="published-list"></div>

    <h3 class="group-title">${escapeHtml(UI.gallery.unpublished)}</h3>
    <div id="unpublished-list"></div>

    <h3 class="group-title">${escapeHtml(UI.gallery.add)}</h3>
    <form id="add-form" class="card" novalidate>
      <!-- Order is binding: pick -> preview -> category -> he -> ar ->
           confirm -> save. The preview comes before the descriptions because
           he cannot describe a photograph he has not seen, and seeing it is
           when he would notice a patient in the frame. -->
      <label class="field">
        <span>${escapeHtml(UI.gallery.pick)}</span>
        <input type="file" id="photo-file" accept="image/jpeg,image/png">
      </label>
      <img class="preview" id="photo-preview" alt="" hidden>
      <label class="field">
        <span>${escapeHtml(UI.gallery.category)}</span>
        <select id="photo-category">${categoryOptions()}</select>
      </label>
      <label class="field">
        <span>${escapeHtml(UI.gallery.altHe)} <span class="hint">${escapeHtml(UI.gallery.altHint)}</span></span>
        <textarea id="photo-alt-he"></textarea>
      </label>
      <label class="field">
        <span>${escapeHtml(UI.gallery.altAr)}</span>
        <textarea id="photo-alt-ar" lang="ar" dir="rtl"></textarea>
      </label>
      <label class="toggle">
        <input type="checkbox" id="photo-confirm">
        <span>${escapeHtml(UI.gallery.confirm)}</span>
      </label>
      <p class="error" id="photo-error" hidden></p>
      <!-- Disabled until the confirmation is ticked. The server checks it
           again, because a client-side gate only stops the honest path. -->
      <button type="submit" class="primary" id="photo-submit" disabled>${escapeHtml(UI.gallery.submit)}</button>
    </form>
  </section>
</div>

<dialog id="confirm-delete">
  <h2>${escapeHtml(UI.gallery.deleteTitle)}</h2>
  <p id="confirm-delete-body">${escapeHtml(UI.gallery.deleteBody)}</p>
  <button class="danger" id="confirm-delete-yes">${escapeHtml(UI.gallery.deleteConfirm)}</button>
  <button class="secondary" id="confirm-delete-no">${escapeHtml(UI.gallery.cancel)}</button>
</dialog>

<script type="module" src="/panel.js"></script>
</body>
</html>`;
}
