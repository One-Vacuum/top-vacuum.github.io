// @vitest-environment happy-dom
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InquirySection from '../components/InquirySection.astro';
import { mountInquiryForm, showInquiryPreview } from './inquiry-form';

const NOW = new Date(Date.UTC(2026, 10, 25, 10, 30));
let markup = '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const field = (name: string) => $<HTMLInputElement>(`[name="${name}"]`);

function fill(values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) field(name).value = value;
}

const validValues = {
  company: '(주)한빛진공',
  name: '홍길동',
  phone: '010-1234-5678',
  email: 'gildong@example.com',
  model: 'SOGEVAC SV65B',
  message: '견적 부탁드립니다.',
};

async function submit() {
  $<HTMLFormElement>('[data-inquiry-form]').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  // let the async handler settle
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

function mount(opts: Parameters<typeof mountInquiryForm>[1] = {}) {
  const fetchImpl = vi.fn().mockResolvedValue(json({ success: 'true' }));
  mountInquiryForm($<HTMLFormElement>('[data-inquiry-form]'), {
    fetchImpl,
    now: () => NOW,
    hostname: 'topvac.co.kr',
    pageUrl: 'https://topvac.co.kr/',
    env: {},
    ...opts,
  });
  return fetchImpl;
}

beforeEach(async () => {
  if (!markup) {
    const container = await AstroContainer.create();
    // Drop the component's bundled <script>; tests mount the controller directly.
    markup = (await container.renderToString(InquirySection)).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  }
  document.documentElement.lang = 'ko';
  document.body.innerHTML = markup;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InquirySection markup', () => {
  it('has the agreed fields: company optional, 담당자/이름, and the rest required', () => {
    const labels = [...document.querySelectorAll('[data-inquiry-form] label')].map((l) => l.textContent?.replace(/\s+/g, ' ').trim());
    expect(labels).toEqual(
      expect.arrayContaining(['회사명 (선택)', '담당자/이름', '연락처', '이메일', '펌프 모델 · 필요 압력 (선택)', '문의 내용']),
    );
    for (const name of ['name', 'phone', 'email', 'message']) expect(field(name).required).toBe(true);
    for (const name of ['company', 'model']) expect(field(name).required).toBe(false);
    expect($('[data-inquiry-form] button[type="submit"]').textContent?.trim()).toBe('문의 보내기');
    expect($('#inquiry').tagName).toBe('FORM');
    expect($('#contact').tagName).toBe('SECTION');
  });
});

describe('mountInquiryForm', () => {
  it('shows required-field errors, focuses the first one, and sends nothing', async () => {
    const fetchImpl = mount();
    await submit();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(field('name').getAttribute('aria-invalid')).toBe('true');
    expect(field('company').getAttribute('aria-invalid')).toBe('false');
    expect($('[data-error-for="name"]').textContent).toBe('필수 입력 항목입니다.');
    expect($('[data-error-for="email"]').textContent).toBe('필수 입력 항목입니다.');
    expect(document.activeElement).toBe(field('name'));
  });

  it('shows format errors in the current language', async () => {
    document.documentElement.lang = 'en';
    const fetchImpl = mount();
    fill({ ...validValues, email: 'not-an-email', phone: '12' });
    await submit();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect($('[data-error-for="email"]').textContent).toBe('Please check the email address.');
    expect($('[data-error-for="phone"]').textContent).toBe('Please check the phone number.');
  });

  it('clears a field error as soon as the field is edited', async () => {
    mount();
    await submit();
    field('name').value = '홍';
    field('name').dispatchEvent(new Event('input', { bubbles: true }));
    expect(field('name').getAttribute('aria-invalid')).toBe('false');
    expect($('[data-error-for="name"]').textContent).toBe('');
  });

  it('sends a clean, Korean-labelled email to the owner and resets the form', async () => {
    const fetchImpl = mount();
    fill(validValues);
    await submit();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://formsubmit.co/ajax/kynam@topvac.co.kr');
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
    expect($('[data-inquiry-status]').dataset.state).toBe('sent');
    expect($('[data-inquiry-status]').textContent).toBe('문의가 전송되었습니다.');
    expect(field('name').value).toBe('');
  });

  it('disables the button while sending and ignores a second submit', async () => {
    let resolve!: (r: Response) => void;
    const fetchImpl = vi.fn().mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    mount({ fetchImpl });
    fill(validValues);
    const form = $<HTMLFormElement>('[data-inquiry-form]');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));
    const button = $<HTMLButtonElement>('[data-inquiry-form] button[type="submit"]');
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe('보내는 중…');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    resolve(json({ success: 'true' }));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(button.disabled).toBe(false);
    expect(button.textContent?.trim()).toBe('문의 보내기');
  });

  it('on failure keeps the input and offers a pre-filled email link', async () => {
    mount({ fetchImpl: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) });
    fill(validValues);
    await submit();
    const status = $('[data-inquiry-status]');
    expect(status.dataset.state).toBe('error');
    const link = status.querySelector('a')!;
    expect(link.textContent).toBe('kynam@topvac.co.kr');
    expect(link.getAttribute('href')).toMatch(/^mailto:kynam@topvac\.co\.kr\?subject=/);
    expect(field('message').value).toBe('견적 부탁드립니다.');
  });

  it('silently drops submissions that filled the honeypot', async () => {
    const fetchImpl = mount();
    fill({ ...validValues, _honey: 'spam' });
    await submit();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect($('[data-inquiry-status]').dataset.state).toBe('sent');
  });

  it('on localhost shows a preview instead of sending', async () => {
    const onDryRun = vi.fn();
    const fetchImpl = mount({ hostname: 'localhost', onDryRun });
    fill(validValues);
    await submit();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(onDryRun).toHaveBeenCalledTimes(1);
    const [mail, to] = onDryRun.mock.calls[0];
    expect(to).toBe('kynam@topvac.co.kr');
    expect(mail.subject).toContain('견적·기술 문의');
    expect($('[data-inquiry-status]').dataset.state).toBe('dryRun');
  });

  it('respects PUBLIC_INQUIRY_TO / PUBLIC_INQUIRY_LIVE for a real test send from localhost', async () => {
    const fetchImpl = mount({ hostname: 'localhost', env: { PUBLIC_INQUIRY_LIVE: 'true', PUBLIC_INQUIRY_TO: 'me@example.com' } });
    fill(validValues);
    await submit();
    expect(fetchImpl.mock.calls[0][0]).toBe('https://formsubmit.co/ajax/me@example.com');
  });
});

describe('showInquiryPreview', () => {
  it('fills the dialog with text only (no HTML injection)', () => {
    const dialog = $<HTMLDialogElement>('[data-inquiry-preview]');
    showInquiryPreview(
      dialog,
      { subject: '<b>제목</b>', replyTo: 'a@b.co', rows: [['문의 내용', '<img src=x onerror=alert(1)>']] },
      'kynam@topvac.co.kr',
    );
    expect(dialog.querySelector('[data-preview="subject"]')!.textContent).toBe('<b>제목</b>');
    expect(dialog.querySelector('img')).toBeNull();
    expect(dialog.querySelector('td')!.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(dialog.hasAttribute('open') || dialog.open).toBe(true);
  });
});
