/**
 * Browser side of the inquiry form: validation messages, sending states, and
 * the localhost preview. Pure email logic lives in ./inquiry.ts.
 *
 * Every message shown here is written as `data-i18n` + text, so the page's
 * KO/EN switch (setLang in HomePage.astro) re-translates it in place.
 */
import { ui } from '../i18n/ui';
import {
  FIELD_ORDER,
  buildInquiryEmail,
  formSubmitEndpoint,
  inquiryRecipient,
  isDryRun,
  mailtoHref,
  normalizeInquiry,
  sendInquiry,
  toFormSubmitPayload,
  validateInquiry,
  type InquiryEmail,
  type InquiryErrors,
  type InquiryField,
  type Lang,
} from './inquiry';

type UiKey = keyof (typeof ui)['ko'];
type Status = 'sending' | 'sent' | 'error' | 'dryRun';

export interface InquiryFormOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  hostname?: string;
  pageUrl?: string;
  env?: Record<string, string | boolean | undefined>;
  /** Called instead of sending when running on localhost (see isDryRun). */
  onDryRun?: (mail: InquiryEmail, to: string) => void;
}

const currentLang = (): Lang => (document.documentElement.lang === 'en' ? 'en' : 'ko');
const translate = (key: UiKey): string => ui[currentLang()][key] || ui.ko[key];

/** Put a translatable string into an element (kept in sync by setLang). */
function setText(el: HTMLElement, key: UiKey) {
  el.dataset.i18n = key;
  el.textContent = translate(key);
}

export function mountInquiryForm(form: HTMLFormElement, options: InquiryFormOptions = {}) {
  const fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = options.now ?? (() => new Date());
  const hostname = options.hostname ?? window.location.hostname;
  const pageUrl = options.pageUrl ?? window.location.href;
  const env = options.env ?? import.meta.env;

  const status = form.querySelector<HTMLElement>('[data-inquiry-status]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submitLabel = submit?.querySelector<HTMLElement>('[data-i18n]') ?? null;
  const fieldEl = (field: string) =>
    form.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement | null;
  let sending = false;

  function showErrors(errors: InquiryErrors) {
    for (const field of FIELD_ORDER) {
      const input = fieldEl(field);
      const slot = form.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
      const error = errors[field];
      input?.setAttribute('aria-invalid', error ? 'true' : 'false');
      if (!slot) continue;
      if (error) {
        setText(slot, `inquiry.error.${error}` as UiKey);
      } else {
        delete slot.dataset.i18n;
        slot.textContent = '';
      }
    }
  }

  function setStatus(kind: Status | null, mail?: InquiryEmail, to?: string) {
    if (!status) return;
    status.replaceChildren();
    status.dataset.state = kind ?? '';
    if (!kind) return;
    const message = document.createElement('span');
    setText(message, `inquiry.status.${kind}` as UiKey);
    status.append(message);
    if (kind === 'error' && mail && to) {
      const link = document.createElement('a');
      link.href = mailtoHref(to, mail);
      link.textContent = to;
      link.className = 'font-semibold underline underline-offset-2';
      status.append(' ', link);
    }
  }

  function setSending(on: boolean) {
    sending = on;
    if (submit) {
      submit.disabled = on;
      submit.setAttribute('aria-busy', String(on));
    }
    if (submitLabel) setText(submitLabel, on ? 'inquiry.sending' : 'inquiry.submit');
  }

  // Clear a field's error as soon as it is edited.
  form.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement | null;
    const field = target?.name as InquiryField | undefined;
    if (!field || !FIELD_ORDER.includes(field)) return;
    if (target.getAttribute('aria-invalid') === 'true') {
      target.setAttribute('aria-invalid', 'false');
      const slot = form.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
      if (slot) {
        delete slot.dataset.i18n;
        slot.textContent = '';
      }
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;

    const raw = Object.fromEntries(FIELD_ORDER.map((field) => [field, fieldEl(field)?.value ?? '']));
    const input = normalizeInquiry(raw);
    const errors = validateInquiry(input);
    showErrors(errors);
    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      setStatus(null);
      fieldEl(firstInvalid)?.focus();
      return;
    }

    // Honeypot: bots fill the hidden field. Pretend success, send nothing.
    if ((fieldEl('_honey')?.value ?? '') !== '') {
      form.reset();
      setStatus('sent');
      return;
    }

    const mail = buildInquiryEmail(input, { now: now(), lang: currentLang() });
    const to = inquiryRecipient(env);

    if (isDryRun(hostname, env)) {
      setStatus('dryRun');
      options.onDryRun?.(mail, to);
      return;
    }

    setSending(true);
    setStatus('sending');
    try {
      await sendInquiry(formSubmitEndpoint(to), toFormSubmitPayload(mail, pageUrl), fetchImpl);
      form.reset();
      setStatus('sent');
    } catch {
      setStatus('error', mail, to);
    } finally {
      setSending(false);
    }
  });
}

/** Fill the localhost preview dialog (text only — never innerHTML with user input). */
export function showInquiryPreview(dialog: HTMLDialogElement, mail: InquiryEmail, to: string) {
  const set = (name: string, value: string) => {
    const el = dialog.querySelector<HTMLElement>(`[data-preview="${name}"]`);
    if (el) el.textContent = value;
  };
  set('to', to);
  set('replyTo', mail.replyTo);
  set('subject', mail.subject);
  const body = dialog.querySelector<HTMLElement>('[data-preview="rows"]');
  if (body) {
    body.replaceChildren(
      ...mail.rows.map(([label, value]) => {
        const row = document.createElement('tr');
        const th = document.createElement('th');
        const td = document.createElement('td');
        th.textContent = label;
        td.textContent = value;
        row.append(th, td);
        return row;
      }),
    );
  }
  if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
  else dialog.setAttribute('open', '');
}
