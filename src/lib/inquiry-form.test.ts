// @vitest-environment happy-dom
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InquirySection from '../components/InquirySection.astro';
import { ui } from '../i18n/ui';
import { INQUIRY_FIELDS } from './inquiry-config';
import { initInquiryForms, showInquiryPreview, type InquiryFormOptions } from './inquiry-form';

const NOW = new Date(Date.UTC(2026, 10, 25, 10, 30));
const OWNER = 'kynam@topvac.co.kr';
let markup = '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const field = (name: string) => $<HTMLInputElement>(`[data-inquiry-form] [name="${name}"]`);
const form = () => $<HTMLFormElement>('[data-inquiry-form]');
const status = () => $('[data-inquiry-status]');
const button = () => $<HTMLButtonElement>('[data-inquiry-form] button[type="submit"]');

const validValues = {
  company: '(주)한빛진공',
  name: '홍길동',
  phone: '010-1234-5678',
  email: 'gildong@example.com',
  model: 'SOGEVAC SV65B',
  message: '견적 부탁드립니다.',
};

function fill(values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) field(name).value = value;
}

function submit() {
  form().dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

async function submitAndSettle(state: string) {
  submit();
  await vi.waitFor(() => expect(status().dataset.state).toBe(state));
}

/** Mount the way the page does (initInquiryForms), with test doubles. */
function mount(opts: InquiryFormOptions = {}) {
  const fetchImpl = vi.fn().mockResolvedValue(json({ success: 'true' }));
  initInquiryForms(document, {
    fetchImpl,
    now: () => NOW,
    hostname: 'topvac.co.kr',
    pageUrl: 'https://topvac.co.kr/',
    env: {},
    ...opts,
  });
  return fetchImpl;
}

/** What setLang() in HomePage.astro does for data-i18n text. */
function retranslate(lang: 'ko' | 'en') {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n as keyof (typeof ui)['ko'];
    el.textContent = ui[lang][key] || ui.ko[key];
  });
}

beforeEach(async () => {
  if (!markup) {
    const container = await AstroContainer.create();
    // Drop the component's bundled <script>; tests mount through initInquiryForms.
    markup = (await container.renderToString(InquirySection)).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  }
  document.documentElement.lang = 'ko';
  document.body.innerHTML = markup;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('InquirySection markup', () => {
  it('renders every field from INQUIRY_FIELDS with matching label, required flag and maxlength', () => {
    const labels = [...document.querySelectorAll('[data-inquiry-form] label[for]')].map((l) => l.textContent?.replace(/\s+/g, ' ').trim());
    expect(labels).toEqual(['회사명 (선택)', '담당자/이름', '연락처', '이메일', '펌프 모델 · 필요 압력 (선택)', '문의 내용']);
    for (const f of INQUIRY_FIELDS) {
      expect(field(f.name).required).toBe(f.required);
      expect(field(f.name).maxLength).toBe(f.maxLength);
      expect(field(f.name).getAttribute('aria-describedby')).toBe(`iq-${f.name}-error`);
    }
    expect(field('email').type).toBe('email');
    expect(field('phone').type).toBe('tel');
    expect(button().textContent?.trim()).toBe('문의 보내기');
  });

  it('posts (not GETs) if the script never runs, so details stay out of the URL', () => {
    expect(form().getAttribute('method')).toBe('post');
    expect(form().id).toBe('inquiry');
    expect($('#contact').tagName).toBe('SECTION');
  });

  it('hides the honeypot from people, keyboards and autofill', () => {
    const wrapper = $('[data-honeypot]');
    expect(wrapper.classList.contains('hidden')).toBe(true);
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
    expect(field('_honey').tabIndex).toBe(-1);
    expect(field('_honey').getAttribute('autocomplete')).toBe('off');
  });

  it('keeps the status live region focusable for the outcome', () => {
    expect(status().getAttribute('role')).toBe('status');
    expect(status().getAttribute('aria-live')).toBe('polite');
    expect(status().tabIndex).toBe(-1);
  });
});

describe('validation', () => {
  it('shows required-field errors, focuses the first one, and sends nothing', async () => {
    const fetchImpl = mount();
    await submitAndSettle('invalid');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(field('name').getAttribute('aria-invalid')).toBe('true');
    expect(field('company').getAttribute('aria-invalid')).toBe('false');
    expect($('[data-error-for="name"]').textContent).toBe('필수 입력 항목입니다.');
    expect($('[data-error-for="name"]').dataset.i18n).toBe('inquiry.error.required');
    expect(status().textContent).toBe('입력한 내용을 확인해 주세요.');
    expect(document.activeElement).toBe(field('name'));
  });

  it('shows format errors in the current language', async () => {
    document.documentElement.lang = 'en';
    const fetchImpl = mount();
    fill({ ...validValues, email: 'not-an-email', phone: '12' });
    await submitAndSettle('invalid');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect($('[data-error-for="email"]').textContent).toBe('Please check the email address.');
    expect($('[data-error-for="phone"]').textContent).toBe('Please check the phone number.');
  });

  it('re-translates shown errors when the language switches', async () => {
    mount();
    await submitAndSettle('invalid');
    retranslate('en');
    expect($('[data-error-for="name"]').textContent).toBe('This field is required.');
    expect(status().textContent).toBe('Please check the highlighted fields.');
  });

  it('clears a field error as soon as the field is edited, and stale errors on resubmit', async () => {
    mount();
    await submitAndSettle('invalid');
    field('name').value = '홍';
    field('name').dispatchEvent(new Event('input', { bubbles: true }));
    expect(field('name').getAttribute('aria-invalid')).toBe('false');
    expect($('[data-error-for="name"]').textContent).toBe('');
    expect($('[data-error-for="name"]').dataset.i18n).toBeUndefined();

    fill({ ...validValues, email: 'bad' });
    status().dataset.state = '';
    await submitAndSettle('invalid');
    expect($('[data-error-for="message"]').textContent).toBe('');
    expect($('[data-error-for="email"]').textContent).toBe('이메일 주소를 확인해 주세요.');
  });
});

describe('sending', () => {
  it('sends a clean, Korean-labelled email to the owner, resets the form and focuses the outcome', async () => {
    const fetchImpl = mount();
    fill(validValues);
    await submitAndSettle('sent');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`https://formsubmit.co/ajax/${OWNER}`);
    expect(JSON.parse(init.body)).toEqual({
      _subject: '[탑베큠 홈페이지] 견적·기술 문의 — (주)한빛진공 · 홍길동',
      _template: 'table',
      _replyto: 'gildong@example.com',
      _captcha: 'false',
      _url: 'https://topvac.co.kr/',
      회사명: '(주)한빛진공',
      '담당자/이름': '홍길동',
      연락처: '010-1234-5678',
      이메일: 'gildong@example.com',
      '펌프 모델 · 필요 압력': 'SOGEVAC SV65B',
      '문의 내용': '견적 부탁드립니다.',
      '접수 시각': '2026-11-25 19:30 (KST)',
      '문의 언어': '한국어',
    });
    expect(status().textContent).toBe('문의가 전송되었습니다.');
    expect(status().querySelector('a')).toBeNull();
    expect(field('name').value).toBe('');
    expect(document.activeElement).toBe(status());
  });

  it('records an English-page inquiry as such for the owner', async () => {
    document.documentElement.lang = 'en';
    const fetchImpl = mount();
    fill(validValues);
    await submitAndSettle('sent');
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)['문의 언어']).toBe('영어 (English)');
    expect(status().textContent).toBe('Your inquiry has been sent.');
  });

  it('keeps focus on the button (aria-disabled), locks the fields and ignores a second submit while sending', async () => {
    let resolve!: (r: Response) => void;
    const fetchImpl = vi.fn().mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    mount({ fetchImpl });
    fill(validValues);
    button().focus();
    submit();
    submit();
    await vi.waitFor(() => expect(button().getAttribute('aria-disabled')).toBe('true'));
    expect(button().disabled).toBe(false);
    expect(document.activeElement).toBe(button());
    expect(button().getAttribute('aria-busy')).toBe('true');
    expect(button().textContent?.trim()).toBe('보내는 중…');
    expect(field('message').readOnly).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    resolve(json({ success: 'true' }));
    await vi.waitFor(() => expect(status().dataset.state).toBe('sent'));
    expect(button().getAttribute('aria-disabled')).toBe('false');
    expect(field('message').readOnly).toBe(false);
    expect(button().textContent?.trim()).toBe('문의 보내기');
  });

  it.each([
    ['a network failure', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['HTTP 500', () => Promise.resolve(json({ success: 'true' }, 500))],
    ['a refusal', () => Promise.resolve(json({ success: 'false', message: 'This form is deactivated' }))],
    ['a non-JSON body', () => Promise.resolve(new Response('<html>portal</html>'))],
  ])('on %s keeps the input, offers a pre-filled email link, and allows a retry', async (_label, failure) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchImpl = vi.fn().mockImplementationOnce(failure).mockResolvedValueOnce(json({ success: 'true' }));
    mount({ fetchImpl });
    fill(validValues);
    await submitAndSettle('error');

    const link = status().querySelector('a')!;
    expect(link.textContent).toBe(OWNER);
    const params = new URLSearchParams(link.getAttribute('href')!.split('?')[1]);
    expect(params.get('subject')).toBe('[탑베큠 홈페이지] 견적·기술 문의 — (주)한빛진공 · 홍길동');
    expect(params.get('body')).toContain('견적 부탁드립니다.');
    expect(field('message').value).toBe('견적 부탁드립니다.');
    expect(button().getAttribute('aria-disabled')).toBe('false');
    expect(document.activeElement).toBe(status());

    await submitAndSettle('sent');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(status().querySelector('a')).toBeNull();
  });

  it('times out a request that never answers', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const hanging = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    mount({ fetchImpl: hanging as unknown as typeof fetch, timeoutMs: 20 });
    fill(validValues);
    await submitAndSettle('error');
    expect(status().querySelector('a')).not.toBeNull();
  });

  it('when the form is not activated yet: resets, says "received" and still offers the email link', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mount({ fetchImpl: vi.fn().mockResolvedValue(json({ success: 'false', message: 'This form needs Activation.' })) });
    fill(validValues);
    await submitAndSettle('pending');
    expect(field('name').value).toBe('');
    expect(status().textContent).toContain('문의가 접수되었습니다.');
    expect(status().querySelector('a')?.getAttribute('href')).toMatch(/^mailto:kynam@topvac\.co\.kr\?/);
    expect(warn).toHaveBeenCalled();
  });

  it('clears a "sent" message once a new inquiry is typed', async () => {
    mount();
    fill(validValues);
    await submitAndSettle('sent');
    field('name').value = '김';
    field('name').dispatchEvent(new Event('input', { bubbles: true }));
    expect(status().dataset.state).toBe('');
    expect(status().textContent).toBe('');
  });
});

describe('honeypot', () => {
  it('drops a filled honeypot silently: no request, "sent", form reset', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = mount();
    fill({ ...validValues, _honey: 'spam' });
    await submitAndSettle('sent');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(field('name').value).toBe('');
  });

  it('still shows validation errors when the other fields are invalid', async () => {
    const fetchImpl = mount();
    fill({ _honey: 'spam' });
    await submitAndSettle('invalid');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('preview instead of sending (off production)', () => {
  it('on localhost opens the real preview dialog and sends nothing', async () => {
    const fetchImpl = mount({ hostname: 'localhost' });
    fill(validValues);
    await submitAndSettle('dryRun');
    expect(fetchImpl).not.toHaveBeenCalled();
    const dialog = $<HTMLDialogElement>('[data-inquiry-preview]');
    expect(dialog.open || dialog.hasAttribute('open')).toBe(true);
    expect(dialog.querySelector('[data-preview="to"]')!.textContent).toBe(OWNER);
    expect(dialog.querySelector('[data-preview="subject"]')!.textContent).toContain('견적·기술 문의');
    const headers = [...dialog.querySelectorAll('th')];
    expect(headers).toHaveLength(8);
    expect(headers.every((th) => th.getAttribute('scope') === 'row')).toBe(true);
    expect(field('name').value).toBe('홍길동');
  });

  it('also on LAN addresses and other non-production hosts', async () => {
    const fetchImpl = mount({ hostname: '192.168.0.12' });
    fill(validValues);
    await submitAndSettle('dryRun');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends from astro dev only with PUBLIC_INQUIRY_LIVE and PUBLIC_INQUIRY_TO', async () => {
    const fetchImpl = mount({ hostname: 'localhost', env: { DEV: true, PUBLIC_INQUIRY_LIVE: 'true', PUBLIC_INQUIRY_TO: 'me@example.com' } });
    fill(validValues);
    await submitAndSettle('sent');
    expect(fetchImpl.mock.calls[0][0]).toBe('https://formsubmit.co/ajax/me@example.com');
  });
});

describe('page defaults', () => {
  it('uses window.location and the global fetch; the query string is not sent', async () => {
    (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL('https://topvac.co.kr/?gclid=abc#inquiry');
    const fetchStub = vi.fn().mockResolvedValue(json({ success: 'true' }));
    vi.stubGlobal('fetch', fetchStub);
    initInquiryForms(document);
    fill(validValues);
    await submitAndSettle('sent');
    const [url, init] = fetchStub.mock.calls[0];
    expect(url).toBe(`https://formsubmit.co/ajax/${OWNER}`);
    expect(JSON.parse(init.body)._url).toBe('https://topvac.co.kr/');
  });

  it('moves keyboard focus into the form when an in-page link to it is used', async () => {
    mount();
    const link = document.createElement('a');
    link.href = '#inquiry';
    document.body.append(link);
    link.click();
    await vi.waitFor(() => expect(document.activeElement).toBe(field('company')));
  });

  it('returns null when the page has no form', () => {
    document.body.innerHTML = '<main></main>';
    expect(initInquiryForms(document)).toBeNull();
  });
});

describe('showInquiryPreview', () => {
  const mail = { subject: '<b>제목</b>', replyTo: 'a@b.co', rows: [['문의 내용', '<img src=x onerror=alert(1)>']] as Array<[string, string]> };

  it('fills the dialog with text only (no HTML injection) and opens it modally', () => {
    const dialog = $<HTMLDialogElement>('[data-inquiry-preview]');
    const showModal = vi.fn();
    dialog.showModal = showModal;
    showInquiryPreview(dialog, mail, OWNER);
    expect(dialog.querySelector('[data-preview="subject"]')!.textContent).toBe('<b>제목</b>');
    expect(dialog.querySelector('img')).toBeNull();
    expect(dialog.querySelector('td')!.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it('falls back to the open attribute without showModal, and refreshes an open dialog', () => {
    const dialog = $<HTMLDialogElement>('[data-inquiry-preview]');
    Object.defineProperty(dialog, 'showModal', { value: undefined, configurable: true });
    showInquiryPreview(dialog, mail, OWNER);
    expect(dialog.hasAttribute('open')).toBe(true);
    showInquiryPreview(dialog, { ...mail, subject: '두 번째' }, OWNER);
    expect(dialog.querySelector('[data-preview="subject"]')!.textContent).toBe('두 번째');
    expect(dialog.querySelectorAll('tr')).toHaveLength(1);
  });
});
