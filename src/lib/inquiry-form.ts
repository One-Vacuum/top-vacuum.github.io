/**
 * Browser side of the inquiry form: validation messages, sending states and
 * the preview shown instead of sending off production. Identical in
 * top-vacuum.github.io and one-vacuum.github.io — change both.
 *
 * Messages are written with `data-i18n` (setI18nText), so the KO/EN switch
 * re-translates them in place.
 */
import { currentLang, setI18nText, type UiKey } from '../i18n/client';
import {
  FIELD_ORDER,
  buildInquiryEmail,
  deliverInquiry,
  inquiryEnv,
  inquiryRecipient,
  isDryRun,
  mailtoHref,
  normalizeInquiry,
  validateInquiry,
  type InquiryEmail,
  type InquiryEnv,
  type InquiryError,
  type InquiryErrors,
  type InquiryField,
  type SendResult,
} from './inquiry';

export type InquiryStatus = 'invalid' | 'sending' | 'sent' | 'pending' | 'error' | 'dryRun';

/** ui.ts keys for every message the form can show (type-checked against ui.ts). */
export const STATUS_KEYS: Readonly<Record<InquiryStatus, UiKey>> = {
  invalid: 'inquiry.status.invalid',
  sending: 'inquiry.status.sending',
  sent: 'inquiry.status.sent',
  pending: 'inquiry.status.pending',
  error: 'inquiry.status.error',
  dryRun: 'inquiry.status.dryRun',
};
export const ERROR_KEYS: Readonly<Record<InquiryError, UiKey>> = {
  required: 'inquiry.error.required',
  email: 'inquiry.error.email',
  phone: 'inquiry.error.phone',
  tooLong: 'inquiry.error.tooLong',
};

export interface InquiryFormOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  hostname?: string;
  pageUrl?: string;
  env?: InquiryEnv;
  timeoutMs?: number;
  /** Called instead of sending when isDryRun() is true. */
  onDryRun?: (mail: InquiryEmail, to: string) => void;
}

type FieldControl = HTMLInputElement | HTMLTextAreaElement;

export function mountInquiryForm(form: HTMLFormElement, options: InquiryFormOptions = {}) {
  // A second mount would bind a second submit handler and send twice.
  if (form.dataset.inquiryMounted === 'true') return;
  form.dataset.inquiryMounted = 'true';
  const fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = options.now ?? (() => new Date());
  const hostname = options.hostname ?? window.location.hostname;
  // Origin and path only: the query string (ad and tracking ids) stays out of the email.
  const pageUrl = options.pageUrl ?? window.location.origin + window.location.pathname;
  const env = options.env ?? inquiryEnv();

  const status = form.querySelector<HTMLElement>('[data-inquiry-status]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submitLabel = submit?.querySelector<HTMLElement>('[data-i18n]') ?? null;
  const control = (name: string) => form.elements.namedItem(name) as FieldControl | null;
  const errorSlot = (field: string) => form.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
  let sending = false;

  function clearError(field: InquiryField) {
    control(field)?.setAttribute('aria-invalid', 'false');
    const slot = errorSlot(field);
    if (slot) {
      delete slot.dataset.i18n;
      slot.textContent = '';
    }
  }

  function showErrors(errors: InquiryErrors) {
    for (const field of FIELD_ORDER) {
      const error = errors[field];
      const slot = errorSlot(field);
      if (!error) {
        clearError(field);
        continue;
      }
      control(field)?.setAttribute('aria-invalid', 'true');
      if (slot) setI18nText(slot, ERROR_KEYS[error]);
    }
  }

  function setStatus(kind: InquiryStatus | null, mail?: InquiryEmail, to?: string) {
    if (!status) return;
    status.replaceChildren();
    status.dataset.state = kind ?? '';
    if (!kind) return;
    const message = document.createElement('span');
    setI18nText(message, STATUS_KEYS[kind]);
    status.append(message);
    if ((kind === 'error' || kind === 'pending') && to) {
      const link = document.createElement('a');
      try {
        link.href = mail ? mailtoHref(to, mail) : `mailto:${to}`;
      } catch {
        link.href = `mailto:${to}`;
      }
      link.textContent = to;
      link.className = 'font-semibold underline underline-offset-2';
      status.append(' ', link);
    }
  }

  // aria-disabled rather than `disabled`: disabling the focused button would
  // drop keyboard focus. Fields go read-only so nothing typed meanwhile is
  // lost when the form resets.
  function setSending(on: boolean) {
    sending = on;
    submit?.setAttribute('aria-disabled', String(on));
    submit?.setAttribute('aria-busy', String(on));
    for (const field of FIELD_ORDER) {
      const el = control(field);
      if (el) el.readOnly = on;
    }
    if (submitLabel) setI18nText(submitLabel, on ? 'inquiry.sending' : 'inquiry.submit');
  }

  form.addEventListener('input', (event) => {
    const field = (event.target as FieldControl | null)?.name as InquiryField | undefined;
    if (field && FIELD_ORDER.includes(field) && control(field)?.getAttribute('aria-invalid') === 'true') clearError(field);
    // A finished send's message no longer applies once a new inquiry starts,
    // and "check the fields" goes once no field is flagged.
    const state = status?.dataset.state ?? '';
    if (['sent', 'pending', 'dryRun'].includes(state)) setStatus(null);
    if (state === 'invalid' && !form.querySelector('[aria-invalid="true"]')) setStatus(null);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;

    const input = normalizeInquiry(Object.fromEntries(FIELD_ORDER.map((field) => [field, control(field)?.value ?? ''])));
    const errors = validateInquiry(input);
    showErrors(errors);
    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      setStatus('invalid');
      control(firstInvalid)?.focus();
      return;
    }

    // Honeypot: only bots fill the hidden field. Pretend success, send nothing.
    if ((control('_honey')?.value ?? '') !== '') {
      console.warn('[inquiry] honeypot field was filled; submission dropped');
      form.reset();
      setStatus('sent');
      return;
    }

    const to = inquiryRecipient(env);
    let mail: InquiryEmail | undefined;
    let result: SendResult | 'preview' | 'failed';
    try {
      setSending(true);
      setStatus('sending');
      mail = buildInquiryEmail(input, { now: now(), lang: currentLang() });
      result = isDryRun(hostname, env) ? 'preview' : await deliverInquiry(mail, { to, pageUrl, fetchImpl, timeoutMs: options.timeoutMs });
    } catch (error) {
      console.error('[inquiry] sending failed', error);
      result = 'failed';
    } finally {
      // Always unlock, or every later submit would be silently ignored.
      setSending(false);
    }

    // The outcome is shown outside the try above, so a display problem can
    // never be reported as a failed send.
    if (result === 'preview') {
      setStatus('dryRun');
      try {
        options.onDryRun?.(mail!, to);
      } catch (error) {
        console.error('[inquiry] preview failed', error);
      }
      return;
    }
    if (result === 'failed') {
      setStatus('error', mail, to);
    } else {
      form.reset();
      if (result === 'pending-activation') {
        console.warn('[inquiry] FormSubmit form is not activated yet; the inquiry is held until it is');
        setStatus('pending', mail, to);
      } else {
        setStatus('sent');
      }
    }
    status?.focus();
  });
}

/** Fill and open the preview dialog (text only — never innerHTML with user input). */
export function showInquiryPreview(dialog: HTMLDialogElement, mail: InquiryEmail, to: string) {
  const set = (name: string, value: string) => {
    const el = dialog.querySelector<HTMLElement>(`[data-preview="${name}"]`);
    if (el) el.textContent = value;
  };
  set('to', to);
  set('replyTo', mail.replyTo);
  set('subject', mail.subject);
  dialog.querySelector<HTMLElement>('[data-preview="rows"]')?.replaceChildren(
    ...mail.rows.map(([label, value]) => {
      const row = document.createElement('tr');
      const th = document.createElement('th');
      const td = document.createElement('td');
      th.scope = 'row';
      th.textContent = label;
      td.textContent = value;
      row.append(th, td);
      return row;
    }),
  );
  if (dialog.open) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

/**
 * Mount the page's inquiry form (and its preview dialog), and make in-page
 * links to the form move keyboard focus into it.
 */
export function initInquiryForms(root: Document = document, options: InquiryFormOptions = {}) {
  const form = root.querySelector<HTMLFormElement>('[data-inquiry-form]');
  if (!form) return null;
  if (form.dataset.inquiryMounted === 'true') return form;
  const preview = root.querySelector<HTMLDialogElement>('[data-inquiry-preview]');
  mountInquiryForm(form, {
    onDryRun: (mail, to) => {
      if (preview) showInquiryPreview(preview, mail, to);
    },
    ...options,
  });
  if (form.id) {
    root.addEventListener('click', (event) => {
      if (!(event.target as Element | null)?.closest?.(`a[href="#${form.id}"]`)) return;
      const first = form.elements.namedItem(FIELD_ORDER[0]) as FieldControl | null;
      setTimeout(() => first?.focus({ preventScroll: true }), 0);
    });
  }
  return form;
}
