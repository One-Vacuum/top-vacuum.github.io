/**
 * Inquiry form → email. Shared: identical in both site repos (change both);
 * site settings live in ./inquiry-config.ts.
 *
 * GitHub Pages is static, so the form posts to FormSubmit (https://formsubmit.co),
 * a no-account form-to-email relay. Until the recipient clicks its one-time
 * "Activate Form" email it answers "This form needs Activation" and holds
 * submissions for 30 days. See README → "문의 양식".
 */
import type { Lang } from '../i18n/client';
import { DEFAULT_RECIPIENT, INQUIRY_FIELDS, PRODUCTION_HOSTS, SUBJECT_PREFIX } from './inquiry-config';

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
/** The subject and Reply-To need these two fields in every site's INQUIRY_FIELDS. */
type RequiredFields = 'name' | 'email';
const _requiredFieldsPresent: RequiredFields extends InquiryField ? true : never = true;
void _requiredFieldsPresent;
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

/** First `max` code points, so an emoji is never cut in half (encodeURIComponent throws on one). */
const clip = (s: string, max: number) => Array.from(s).slice(0, max).join('');

// No whitespace, commas, semicolons, angle brackets, quotes or parentheses, so
// a value can never become several Reply-To addresses.
const EMAIL_RE = /^[^\s@,;<>()"[\]\\]+@[^\s@,;<>()"[\]\\]+\.[^\s@,;<>()"[\]\\]+$/;

// Control characters and bidi controls that could disguise the subject.
const UNSAFE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
// CRLF, CR, LF, NEL and the Unicode line/paragraph separators.
const LINE_BREAKS = /\r\n|[\r\n\u0085\u2028\u2029]/g;
// Invisible characters from copy-paste. Stripped from the email (replies would
// bounce); elsewhere only a value made of nothing else is cleared (emoji use U+200C/D).
const INVISIBLE = /[\u00AD\u180E\u200B-\u200D\u2060-\u2064\uFEFF]/g;
/** Keeps surrogate pairs (emoji) and drops lone halves, which encodeURIComponent rejects. */
const dropLoneSurrogates = (s: string) => s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g, (m) => (m.length === 2 ? m : ''));

/**
 * Trim and clean every field. Phones are NFKC-normalised (full-width IME digits
 * become ASCII); the message keeps line breaks, other fields get spaces; a value
 * of only invisible characters is empty.
 */
export function normalizeInquiry(raw: Partial<Record<string, unknown>>): InquiryInput {
  const out = {} as InquiryInput;
  for (const f of FIELDS) {
    const value = raw[f.name];
    let text = dropLoneSurrogates(typeof value === 'string' ? value : '')
      .replace(LINE_BREAKS, '\n')
      .replace(UNSAFE_CHARS, '');
    if (f.control !== 'textarea') text = text.replace(/\n+/g, ' ');
    if (f.type === 'email') text = text.replace(INVISIBLE, '');
    if (f.type === 'tel') text = text.normalize('NFKC');
    text = text.trim();
    if (f.control === 'textarea') text = text.split('\n').map((line) => line.trimEnd()).join('\n');
    if (text.replace(INVISIBLE, '').trim() === '') text = '';
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
    if (f.type === 'email' && (!EMAIL_RE.test(value) || /^\.|\.\.|\.@|@\.|\.$/.test(value))) errors[field] = 'email';
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
    const clipped = clip(line, SUBJECT_PART_MAX);
    return clipped === line ? line : `${clipped}…`;
  };
  // A site may have no company field, so it is read untyped.
  const company = (input as Partial<Record<string, string>>).company;
  const sender = company ? `${part(company)} · ${part(input.name)}` : part(input.name);
  const rows: Array<[string, string]> = FIELDS.map((f) => [f.emailLabel, input[f.name as InquiryField] || EMPTY]);
  rows.push(['접수 시각', formatKst(opts.now)]);
  rows.push(['문의 언어', opts.lang === 'en' ? '영어 (English)' : '한국어']);
  return { subject: `${SUBJECT_PREFIX} — ${sender}`, replyTo: input.email, rows };
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
 * Pre-filled `mailto:` link under `maxLength`: the longest row is shortened until
 * it fits, else the body is just a note. CRLF line breaks (RFC 6068).
 */
export function mailtoHref(to: string, mail: InquiryEmail, maxLength = MAILTO_MAX_LENGTH): string {
  const build = (subject: string, body: string) =>
    `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g, '\r\n'))}`;
  const rows = mail.rows.map(([label, value]): [string, string] => [label, value]);
  const cut = new Set<number>();
  const render = () =>
    build(mail.subject, toPlainText({ ...mail, rows: rows.map(([l, v], i): [string, string] => [l, cut.has(i) ? `${v}\n${TRUNCATED_NOTE}` : v]) }));

  let href = render();
  while (href.length > maxLength) {
    const lengths = rows.map(([, v]) => Array.from(v).length);
    const longest = lengths.indexOf(Math.max(...lengths));
    if (lengths[longest] === 0) return build(mail.subject, TRUNCATED_NOTE);
    rows[longest][1] = clip(rows[longest][1], Math.floor(lengths[longest] * 0.8));
    cut.add(longest);
    href = render();
  }
  return href;
}

export type InquiryEnv = { DEV?: boolean; PUBLIC_INQUIRY_TO?: string; PUBLIC_INQUIRY_LIVE?: string };

/** Env values the form reads, named singly so no others reach the bundle; dev overrides compile out of production. */
export const inquiryEnv = (): InquiryEnv => ({
  DEV: import.meta.env.DEV,
  PUBLIC_INQUIRY_TO: import.meta.env.DEV ? import.meta.env.PUBLIC_INQUIRY_TO : undefined,
  PUBLIC_INQUIRY_LIVE: import.meta.env.DEV ? import.meta.env.PUBLIC_INQUIRY_LIVE : undefined,
});

/** A plain address only: it goes into the endpoint path and a mailto: link. */
const devOverride = (env: InquiryEnv) => {
  const to = env.DEV === true && typeof env.PUBLIC_INQUIRY_TO === 'string' ? env.PUBLIC_INQUIRY_TO.trim() : '';
  return EMAIL_RE.test(to) && !/[/?#&%]/.test(to) ? to : null;
};

/** `PUBLIC_INQUIRY_TO` redirects mail during `astro dev` only; production builds always mail the owner. */
export function inquiryRecipient(env: InquiryEnv): string {
  return devOverride(env) ?? DEFAULT_RECIPIENT;
}

/** Preview unless on PRODUCTION_HOSTS, or in `astro dev` with `PUBLIC_INQUIRY_LIVE=true` and a `PUBLIC_INQUIRY_TO`. */
export function isDryRun(hostname: string, env: InquiryEnv): boolean {
  if (PRODUCTION_HOSTS.includes(hostname.toLowerCase().replace(/\.$/, ''))) return false;
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
    // An abort while the body was still arriving surfaces here as a null body.
    if (signal?.aborted) throw new InquirySendError('Timed out');
  } catch (error) {
    if (error instanceof InquirySendError) throw error;
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
