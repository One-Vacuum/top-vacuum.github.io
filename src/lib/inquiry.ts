/**
 * "견적 · 기술 문의" form → email.
 *
 * GitHub Pages only serves static files, so the form posts to FormSubmit
 * (https://formsubmit.co), a no-account form-to-email relay. The email layout
 * is built here so the owner gets the same clean, Korean-labelled message
 * every time; FormSubmit's `table` template renders `rows` as a two-column
 * table.
 *
 * First submission after deploy: FormSubmit emails the recipient an
 * "Activate Form" link once. Submissions are kept (30 days) until then and
 * delivered after activation, so an activation response is treated as
 * accepted. See README → "문의 양식".
 */

export type Lang = 'ko' | 'en';

export interface InquiryInput {
  company: string; // optional
  name: string;
  phone: string;
  email: string;
  model: string; // pump model · required pressure (optional)
  message: string;
}

export type InquiryField = keyof InquiryInput;
export type InquiryError = 'required' | 'email' | 'phone' | 'tooLong';
export type InquiryErrors = Partial<Record<InquiryField, InquiryError>>;

/** Order of the fields in the form and of the rows in the email. */
export const FIELD_ORDER: readonly InquiryField[] = ['company', 'name', 'phone', 'email', 'model', 'message'];

export const REQUIRED_FIELDS: readonly InquiryField[] = ['name', 'phone', 'email', 'message'];

export const MAX_LENGTH: Readonly<Record<InquiryField, number>> = {
  company: 100,
  name: 50,
  phone: 30,
  email: 254,
  model: 200,
  message: 5000,
};

/** Row labels as the owner reads them in the email (always Korean). */
export const EMAIL_LABELS: Readonly<Record<InquiryField, string>> = {
  company: '회사명',
  name: '담당자/이름',
  phone: '연락처',
  email: '이메일',
  model: '펌프 모델 · 필요 압력',
  message: '문의 내용',
};

export const SUBJECT_PREFIX = '[탑베큠 홈페이지] 견적·기술 문의';
export const DEFAULT_RECIPIENT = 'kynam@topvac.co.kr';
const EMPTY = '—';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS_RE = /^[0-9+()\-.\s]+$/;

/** Trim every field; inside the message keep line breaks but drop trailing spaces. */
export function normalizeInquiry(raw: Partial<Record<InquiryField, unknown>>): InquiryInput {
  const text = (v: unknown) => (typeof v === 'string' ? v : '').trim();
  return {
    company: text(raw.company),
    name: text(raw.name),
    phone: text(raw.phone),
    email: text(raw.email),
    model: text(raw.model),
    message: text(raw.message)
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n'),
  };
}

export function validateInquiry(input: InquiryInput): InquiryErrors {
  const errors: InquiryErrors = {};
  for (const field of FIELD_ORDER) {
    const value = input[field];
    if (!value) {
      if (REQUIRED_FIELDS.includes(field)) errors[field] = 'required';
      continue;
    }
    if (value.length > MAX_LENGTH[field]) {
      errors[field] = 'tooLong';
      continue;
    }
    if (field === 'email' && !EMAIL_RE.test(value)) errors.email = 'email';
    if (field === 'phone') {
      const digits = value.replace(/\D/g, '').length;
      if (!PHONE_CHARS_RE.test(value) || digits < 8 || digits > 15) errors.phone = 'phone';
    }
  }
  return errors;
}

/** "2026-11-25 19:30 (KST)" — fixed to Korea time regardless of the visitor's zone. */
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
  const sender = input.company ? `${input.company} · ${input.name}` : input.name;
  const rows: Array<[string, string]> = FIELD_ORDER.map((field) => [EMAIL_LABELS[field], input[field] || EMPTY]);
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

export function mailtoHref(to: string, mail: InquiryEmail): string {
  return `mailto:${to}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(toPlainText(mail))}`;
}

type Env = Record<string, string | boolean | undefined>;

/** `PUBLIC_INQUIRY_TO` overrides the recipient (e.g. to test with your own inbox). */
export function inquiryRecipient(env: Env = import.meta.env): string {
  const to = env.PUBLIC_INQUIRY_TO;
  return typeof to === 'string' && to.trim() ? to.trim() : DEFAULT_RECIPIENT;
}

export function formSubmitEndpoint(to: string): string {
  return `https://formsubmit.co/ajax/${to}`;
}

export function isLocalHostname(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname) || hostname.endsWith('.localhost');
}

/**
 * On localhost nothing is sent unless `PUBLIC_INQUIRY_LIVE=true`; the form shows
 * a preview of the email instead, so local testing never mails the owner.
 */
export function isDryRun(hostname: string, env: Env = import.meta.env): boolean {
  return isLocalHostname(hostname) && env.PUBLIC_INQUIRY_LIVE !== 'true';
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
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  let data: { success?: unknown; message?: unknown } | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) throw new InquirySendError(`HTTP ${res.status}`);
  if (String(data?.success) === 'true') return 'sent';
  // The form has not been activated yet: FormSubmit keeps the submission and
  // delivers it once the owner clicks "Activate Form".
  if (/activat/i.test(String(data?.message ?? ''))) return 'pending-activation';
  throw new InquirySendError(String(data?.message ?? 'Unexpected response'));
}
