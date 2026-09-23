import { UI } from './strings.ts';

/**
 * BROWSER SCRIPT, served as /panel.js.
 *
 * Written as a template string rather than a bundled module so the Worker
 * stays a single file with no build step. It is plain ES2022 and holds no
 * secret: the Access cookie authenticates every request, and the script never
 * sees a token or a repository path.
 *
 * The Hebrew is injected from strings.ts so there is still exactly one place
 * a sentence exists.
 */
export const CLIENT = `
const T = ${JSON.stringify(UI)};

const $ = (id) => document.getElementById(id);
const api = async (path, options) => {
  const response = await fetch(path, {
    ...options,
    headers: { ...(options && options.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  let body = null;
  try { body = await response.json(); } catch { /* handled below */ }
  return { status: response.status, body };
};

/* ── Status region ─────────────────────────────────────────────────────── */
let pollTimer = null;
let pollStarted = 0;

function showStatus(state, extra) {
  const el = $('status');
  el.hidden = false;
  el.className = 'status is-' + state;
  const text = state === 'failed'
    ? T.status.failed + ' ' + (extra ? (T.status.reasons[extra] || '') : '') + ' ' + T.status.contact
    : T.status[state] || '';
  el.textContent = text.trim();
}

function stopPolling() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; } }

/**
 * Poll by COMMIT SHA, not by browser state.
 *
 * 5s, backing off to 15s after a minute, giving up at ten with a message that
 * says it is still going rather than pretending it failed.
 */
function track(sha) {
  stopPolling();
  pollStarted = Date.now();
  try { localStorage.setItem('lastSha', sha); } catch { /* private mode */ }
  const tick = async () => {
    const elapsed = Date.now() - pollStarted;
    if (elapsed > 600000) { showStatus('slow'); return; }
    const { body } = await api('/api/status?sha=' + encodeURIComponent(sha));
    if (body && body.ok && body.data) {
      if (body.data.state === 'published') { showStatus('published'); return; }
      if (body.data.state === 'failed') { showStatus('failed', body.data.reason); return; }
    }
    pollTimer = setTimeout(tick, elapsed > 60000 ? 15000 : 5000);
  };
  showStatus('committed');
  pollTimer = setTimeout(tick, 5000);
}

/** On load, recover where the last change got to even on a new device. */
async function restoreStatus() {
  let sha = null;
  try { sha = localStorage.getItem('lastSha'); } catch { /* private mode */ }
  if (sha) { track(sha); return; }
  const { body } = await api('/api/status/latest');
  if (body && body.ok && body.data) {
    if (body.data.state === 'published') showStatus('published');
    else if (body.data.state === 'failed') showStatus('failed', body.data.reason);
    else track(body.data.sha);
  }
}

function apiError(body) {
  if (!body || !body.error) return T.errors.generic;
  if (body.error.issues && body.error.issues.length) {
    const key = String(body.error.issues[0]).replace(/^row_\\d+_/, '');
    return T.issues[key] || T.errors.generic;
  }
  return T.errors[body.error.code] || T.errors.generic;
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */
function selectTab(which) {
  for (const name of ['hours', 'gallery']) {
    const selected = name === which;
    $('tab-' + name).setAttribute('aria-selected', String(selected));
    $('panel-' + name).hidden = !selected;
  }
}
$('tab-hours').addEventListener('click', () => selectTab('hours'));
$('tab-gallery').addEventListener('click', () => selectTab('gallery'));

/* ── Hours ─────────────────────────────────────────────────────────────── */
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function syncRow(i) {
  const closed = document.querySelector('[data-closed="' + i + '"]').checked;
  for (const key of ['opens', 'closes']) {
    const input = document.querySelector('[data-' + key + '="' + i + '"]');
    input.disabled = closed;
    if (closed) input.value = '';
  }
}

for (let i = 0; i < 7; i++) {
  document.querySelector('[data-closed="' + i + '"]').addEventListener('change', () => syncRow(i));
}

async function loadHours() {
  const { body } = await api('/api/hours');
  if (!body || !body.ok) return;
  body.data.rows.forEach((row, i) => {
    document.querySelector('[data-closed="' + i + '"]').checked = row.closed;
    document.querySelector('[data-opens="' + i + '"]').value = row.opens;
    document.querySelector('[data-closes="' + i + '"]').value = row.closes;
    syncRow(i);
  });
}

$('hours-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('save-hours');
  if (button.disabled) return;
  for (let i = 0; i < 7; i++) $('hours-form').querySelector('[data-error="' + i + '"]').hidden = true;

  const rows = DAYS.map((day, i) => {
    const closed = document.querySelector('[data-closed="' + i + '"]').checked;
    return {
      day,
      closed,
      opens: closed ? '' : document.querySelector('[data-opens="' + i + '"]').value,
      closes: closed ? '' : document.querySelector('[data-closes="' + i + '"]').value,
    };
  });

  button.disabled = true;
  const label = button.textContent;
  button.textContent = T.hours.saving;
  showStatus('saving');
  try {
    const { body } = await api('/api/hours', { method: 'PUT', body: JSON.stringify({ rows }) });
    if (body && body.ok) { track(body.data.sha); return; }
    // Attach each issue to the row it belongs to, so the doctor is looking at
    // the field that is wrong rather than at a summary.
    const issues = (body && body.error && body.error.issues) || [];
    let focused = false;
    for (const issue of issues) {
      const match = /^row_(\\d+)_(.+)$/.exec(issue);
      if (!match) continue;
      const field = $('hours-form').querySelector('[data-error="' + match[1] + '"]');
      if (!field) continue;
      field.textContent = T.issues[match[2]] || T.errors.generic;
      field.hidden = false;
      if (!focused) {
        document.querySelector('[data-opens="' + match[1] + '"]').focus();
        focused = true;
      }
    }
    if (!issues.length) showStatus('failed');
    else $('status').hidden = true;
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
});

/* ── Gallery ───────────────────────────────────────────────────────────── */
let pendingDelete = null;

function photoCard(record) {
  const card = document.createElement('div');
  card.className = 'card photo';

  const meta = document.createElement('div');
  meta.className = 'meta';

  const state = document.createElement('div');
  state.className = 'state is-' + record.status;
  // State is stated in TEXT, never by colour alone.
  state.textContent = record.status === 'published' ? T.gallery.published : T.gallery.unpublished;

  const alt = document.createElement('div');
  alt.className = 'alt';
  // textContent, not innerHTML: a description containing markup is characters.
  alt.textContent = record.alt && record.alt.he ? record.alt.he : record.file;

  const actions = document.createElement('div');
  actions.className = 'actions';

  if (record.status === 'published') {
    actions.append(button(T.gallery.unpublish, 'secondary', () => act('unpublish', record.file)));
  } else {
    actions.append(button(T.gallery.publish, 'secondary', () => act('publish', record.file)));
    // Permanent delete is reachable only from the unpublished state, so a
    // photograph can never be destroyed in a single click.
    actions.append(button(T.gallery.remove, 'danger', () => askDelete(record)));
  }

  meta.append(state, alt, actions);
  card.append(meta);
  return card;
}

function button(text, kind, onClick) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = kind;
  element.textContent = text;
  element.addEventListener('click', onClick);
  return element;
}

function askDelete(record) {
  pendingDelete = record.file;
  // Name the specific photograph, so "delete" is never an abstract choice.
  $('confirm-delete-body').textContent = T.gallery.deleteBody + ' (' + record.file + ')';
  $('confirm-delete').showModal();
}

$('confirm-delete-no').addEventListener('click', () => { pendingDelete = null; $('confirm-delete').close(); });
$('confirm-delete-yes').addEventListener('click', async () => {
  const file = pendingDelete;
  pendingDelete = null;
  $('confirm-delete').close();
  if (file) await act('delete', file);
});

async function act(action, file) {
  showStatus('saving');
  const { body } = await api('/api/photos/' + action, { method: 'POST', body: JSON.stringify({ file }) });
  if (body && body.ok) { track(body.data.sha); await loadPhotos(); return; }
  showStatus('failed');
}

async function loadPhotos() {
  const { body } = await api('/api/photos');
  if (!body || !body.ok) return;
  const published = $('published-list');
  const unpublished = $('unpublished-list');
  published.replaceChildren();
  unpublished.replaceChildren();
  for (const record of body.data.records) {
    (record.status === 'published' ? published : unpublished).append(photoCard(record));
  }
  if (!published.childElementCount) published.append(empty(T.gallery.emptyPublished));
  if (!unpublished.childElementCount && !body.data.records.length) {
    unpublished.append(empty(T.gallery.emptyAll));
  }
}

function empty(text) {
  const p = document.createElement('p');
  p.className = 'intro';
  p.textContent = text;
  return p;
}

/* ── Add a photograph ──────────────────────────────────────────────────── */
let picked = null;

$('photo-file').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  const preview = $('photo-preview');
  if (!file) { picked = null; preview.hidden = true; return; }
  picked = file;
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
});

// The submit button stays disabled until the confirmation is ticked.
$('photo-confirm').addEventListener('change', (event) => {
  $('photo-submit').disabled = !event.target.checked;
});

$('add-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('photo-submit');
  if (button.disabled) return;
  const error = $('photo-error');
  error.hidden = true;

  if (!picked) { error.textContent = T.issues.file_required; error.hidden = false; return; }

  button.disabled = true;
  showStatus('saving');
  try {
    const bytes = new Uint8Array(await picked.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    const { body } = await api('/api/photos', {
      method: 'POST',
      body: JSON.stringify({
        category: $('photo-category').value,
        contentBase64: btoa(binary),
        altHe: $('photo-alt-he').value,
        altAr: $('photo-alt-ar').value,
        confirmed: $('photo-confirm').checked,
      }),
    });
    if (body && body.ok) {
      $('add-form').reset();
      picked = null;
      $('photo-preview').hidden = true;
      track(body.data.sha);
      await loadPhotos();
      return;
    }
    error.textContent = apiError(body);
    error.hidden = false;
    $('status').hidden = true;
  } finally {
    button.disabled = !$('photo-confirm').checked;
  }
});

/* ── Start ─────────────────────────────────────────────────────────────── */
loadHours();
loadPhotos();
restoreStatus();
`.trim();
