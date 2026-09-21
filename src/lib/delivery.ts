/**
 * Appointment request delivery.
 *
 * Architecture decision (docs/decisions/0003-appointment-request-delivery.md):
 * requests are persisted to a durable store AND a notification is sent. Email
 * alone was rejected — it gives no audit trail, no status tracking, and you
 * cannot reliably delete from inboxes, forwarded threads and backups, which
 * makes both the 12-month retention policy and any deletion request
 * undeliverable.
 *
 * The Supabase table doubles as the clinic's lead inbox via Supabase Studio,
 * which is why no custom admin dashboard is built.
 *
 * `consentNoticeVersion` is stored deliberately: the Privacy Protection
 * Authority expects a controller to be able to show WHAT a person was shown
 * at the moment they consented.
 */

import type { AppointmentRequest } from './validation';

/** Bump whenever the wording of the inline privacy notice changes. */
export const CONSENT_NOTICE_VERSION = '2026-09-20.1';

function env(key: string): string | undefined {
  return (
    (import.meta.env as Record<string, string | undefined>)[key] ??
    (globalThis as Record<string, unknown>)[key] as string | undefined ??
    (typeof process !== 'undefined' ? process.env?.[key] : undefined)
  );
}

export function isDeliveryConfigured(): boolean {
  return Boolean(env('SUPABASE_URL') && env('SUPABASE_SERVICE_KEY'));
}

export async function deliver(data: AppointmentRequest): Promise<void> {
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_KEY');
  if (!url || !key) throw new Error('delivery not configured');

  const row = {
    created_at: new Date().toISOString(),
    locale: data.locale,
    source_path: data.sourcePath,
    name: data.name,
    phone: data.phone,
    contact_method: data.contactMethod,
    treatment_slug: data.treatment || null,
    daypart: data.daypart,
    // Optional and capped. Patients are explicitly asked not to include
    // medical detail here; see docs/PRIVACY.md.
    message: data.message || null,
    consent_at: new Date().toISOString(),
    consent_notice_version: CONSENT_NOTICE_VERSION,
    marketing_opt_in: data.marketingOptIn,
    status: 'new',
  };

  const response = await fetch(`${url}/rest/v1/appointment_requests`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error(`supabase insert failed: ${response.status}`);
  }
}
