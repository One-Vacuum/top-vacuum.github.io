/**
 * Inquiry form → email. Identical in top-vacuum.github.io and
 * one-vacuum.github.io — change both. Site-specific settings live in
 * ./inquiry-config.ts.
 *
 * GitHub Pages only serves static files, so the form posts to FormSubmit
 * (https://formsubmit.co), a no-account form-to-email relay. The owner gets a
 * Korean-labelled table (FormSubmit `table` template) with a subject naming
 * the sender and Reply-To set to the customer.
 *
 * Until the recipient clicks FormSubmit's one-time "Activate Form" email, the
 * API answers "This form needs Activation"; FormSubmit keeps those submissions
 * (30 days) and delivers them after activation. See README → "문의 양식".
 */
import { DEFAULT_RECIPIENT, INQUIRY_FIELDS, PRODUCTION_HOSTS, SUBJECT_PREFIX } from './inquiry-config';

export type Lang = 'ko' | 'en';

export interface InquiryFieldDef {
  name: string;
  required: boolean;
  maxLength: number;
  /** Row label in the owner's email — always Korean, whatever the page language. */
  emailLabel: string;
  /** `ui.ts` key of the on-page label. */
  labelKey: string;
  control: 'input' | 'textarea';
  type?: 'text' | 'tel' | 'email';
  autocomplete?: string;
  placeholderKey?: string;
  /** Spans the full form width instead of half. */
  wide?: boolean;
}

export type InquiryField = (typeof INQUIRY_FIELDS)[number]['name'];
export type InquiryInput = Record<InquiryField, string>;
export type InquiryError = 'required' | 'email' | 'phone' | 'tooLong';
export type InquiryErrors = Partial<Record<InquiryField, InquiryError>>;

const FIELDS: readonly InquiryFieldDef[] = INQUIRY_FIELDS;
export const FIELD_ORDER = FIELDS.map((f) => f.name) as InquiryField[];
export const MAX_LENGTH = Object.fromEntries(FIELDS.map((f) => [f.name, f.maxLength])) as Record<InquiryField, number>;

export const SEND_TIMEOUT_MS = 15_000;
/** Longest `mailto:` URL handed out; mail clients drop or cut longer ones. */
export const MAILTO_MAX_LENGTH = 1800;
/** Longest company/name text shown in the subject. */
const SUBJECT_PART_MAX = 40;
const EMPTY = '—';
const TRUNCATED_NOTE = '…(내용이 길어 일부만 담았습니다)';

// No whitespace, commas, semicolons, angle brackets, quotes or parentheses, so
// a value can never become several Reply-To addresses.
const EMAIL_RE = /^[^\s@,;<>()"[\]\\]+@[^\s@,;<>()"[\]\\]+\.[^\s@,;<>()"[\]\\]+$/;

/**
 * Trim every field. Phone numbers are NFKC-normalised (full-width digits from
 * a Korean IME become ASCII); multi-line fields keep line breaks but lose
 * trailing spaces.
 */
export function normalizeInquiry(raw: Partial<Record<string, unknown>>): InquiryInput {
  const out = {} as InquiryInput;
  for (const f of FIELDS) {
    const value = raw[f.name];
    let text = (typeof value === 'string' ? value : '').trim();
    if (f.type === 'tel') text = text.normalize('NFKC');
    if (f.control === 'textarea') {
      text = text
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n');
    }
    out[f.name as InquiryField] = text;
  }
  return out;
}

/**
 * Phone numbers only need 8–20 digits; anything around them (extensions,
 * "내선", a name) is passed through for the owner to read.
 */
export function validateInquiry(input: InquiryInput): InquiryErrors {
  const errors: InquiryErrors = {};
  for (const f of FIELDS) {
    const field = f.name as InquiryField;
    const value = input[field];
    if (!value) {
      if (f.required) errors[field] = 'required';
      continue;
    }
    if (value.length > f.maxLength) {
      errors[field] = 'tooLong';
      continue;
    }
    if (f.type === 'email' && (!EMAIL_RE.test(value) || value.includes('..'))) errors[field] = 'email';
    if (f.type === 'tel') {
      const digits = value.replace(/\D/g, '').length;
      if (digits < 8 || digits > 20) errors[field] = 'phone';
    }
  }
  return errors;
}

/** "2026-11-25 19:30 (KST)" — Korea time regardless of the visitor's zone. */
export function formatKst(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')} (KST)`;
}

export interface InquiryEmail {
  subject: string;
  replyTo: string;
  /** [label, value] pairs, in display order. */
  rows: Array<[string, string]>;
}

export function buildInquiryEmail(input: InquiryInput, opts: { now: Date; lang: Lang }): InquiryEmail {
  const part = (s: string) => {
    const line = s.replace(/\s+/g, ' ');
    return line.length > SUBJECT_PART_MAX ? `${line.slice(0, SUBJECT_PART_MAX)}…` : line;
  };
  const record = input as Record<string, string>;
  const sender = record.company ? `${part(record.company)} · ${part(record.name)}` : part(record.name);
  const rows: Array<[string, string]> = FIELDS.map((f) => [f.emailLabel, record[f.name] || EMPTY]);
  rows.push(['접수 시각', formatKst(opts.now)]);
  rows.push(['문의 언어', opts.lang === 'en' ? '영어 (English)' : '한국어']);
  return { subject: `${SUBJECT_PREFIX} — ${sender}`, replyTo: record.email, rows };
}

/** JSON body for FormSubmit's AJAX endpoint. Underscore keys are FormSubmit settings, not rows. */
export function toFormSubmitPayload(mail: InquiryEmail, pageUrl: string): Record<string, string> {
  const payload: Record<string, string> = {
    _subject: mail.subject,
    _template: 'table',
    _replyto: mail.replyTo,
    _captcha: 'false',
    _url: pageUrl,
  };
  for (const [label, value] of mail.rows) payload[label] = value;
  return payload;
}

/** Plain-text version (mailto fallback and the localhost preview). */
export function toPlainText(mail: InquiryEmail): string {
  return mail.rows
    .map(([label, value]) => (value.includes('\n') ? `${label}:\n${value}` : `${label}: ${value}`))
    .join('\n');
}

/**
 * Pre-filled `mailto:` link, kept under `maxLength` by shortening the longest
 * row (normally the message). Line breaks are CRLF as RFC 6068 asks.
 */
export function mailtoHref(to: string, mail: InquiryEmail, maxLength = MAILTO_MAX_LENGTH): string {
  const build = (m: InquiryEmail) =>
    `mailto:${to}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(toPlainText(m).replace(/\n/g, '\r\n'))}`;
  let href = build(mail);
  if (href.length <= maxLength) return href;

  const longest = mail.rows.reduce((best, row, i) => (row[1].length > mail.rows[best][1].length ? i : best), 0);
  const full = mail.rows[longest][1];
  let keep = full.length;
  while (keep > 0 && href.length > maxLength) {
    keep = Math.floor(keep * 0.8);
    const rows = mail.rows.map((row, i): [string, string] => (i === longest ? [row[0], `${full.slice(0, keep)}\n${TRUNCATED_NOTE}`] : row));
    href = build({ ...mail, rows });
  }
  return href;
}

export type InquiryEnv = { DEV?: boolean; PUBLIC_INQUIRY_TO?: string; PUBLIC_INQUIRY_LIVE?: string };

/** The env values the form reads, named one by one so no others reach the bundle. */
export const inquiryEnv = (): InquiryEnv => ({
  DEV: import.meta.env.DEV,
  PUBLIC_INQUIRY_TO: import.meta.env.PUBLIC_INQUIRY_TO,
  PUBLIC_INQUIRY_LIVE: import.meta.env.PUBLIC_INQUIRY_LIVE,
});

const devOverride = (env: InquiryEnv) =>
  (env.DEV === true && typeof env.PUBLIC_INQUIRY_TO === 'string' && env.PUBLIC_INQUIRY_TO.trim()) || null;

/** `PUBLIC_INQUIRY_TO` redirects mail during `astro dev` only; production builds always mail the owner. */
export function inquiryRecipient(env: InquiryEnv): string {
  return devOverride(env) ?? DEFAULT_RECIPIENT;
}

/**
 * Real sends happen only on PRODUCTION_HOSTS, or in `astro dev` with both
 * `PUBLIC_INQUIRY_LIVE=true` and a `PUBLIC_INQUIRY_TO` address. Everywhere else
 * (localhost, LAN IPs, tunnels, preview builds) the form shows a preview.
 */
export function isDryRun(hostname: string, env: InquiryEnv): boolean {
  if (PRODUCTION_HOSTS.includes(hostname.toLowerCase())) return false;
  return !(env.PUBLIC_INQUIRY_LIVE === 'true' && devOverride(env));
}

export class InquirySendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InquirySendError';
  }
}

export type SendResult = 'sent' | 'pending-activation';

export async function sendInquiry(
  endpoint: string,
  payload: Record<string, string>,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<SendResult> {
  let res: Response;
  let data: { success?: unknown; message?: unknown } | null;
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    data = await res.json().catch(() => null);
  } catch (error) {
    if (signal?.aborted) throw new InquirySendError('Timed out');
    throw error;
  }
  if (!res.ok) throw new InquirySendError(`HTTP ${res.status}`);
  if (String(data?.success) === 'true') return 'sent';
  // Only FormSubmit's exact "needs activation" reply; any other refusal
  // (deactivated, blocked, …) is an error.
  if (/needs activation/i.test(String(data?.message ?? ''))) return 'pending-activation';
  throw new InquirySendError(String(data?.message ?? 'Unexpected response'));
}

/** Send the email through FormSubmit, aborting after `timeoutMs`. */
export async function deliverInquiry(
  mail: InquiryEmail,
  opts: { to: string; pageUrl: string; fetchImpl: typeof fetch; timeoutMs?: number },
): Promise<SendResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? SEND_TIMEOUT_MS);
  try {
    return await sendInquiry(
      `https://formsubmit.co/ajax/${opts.to}`,
      toFormSubmitPayload(mail, opts.pageUrl),
      opts.fetchImpl,
      controller.signal,
    );
  } finally {
    clearTimeout(timer);
  }
}
