import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_RECIPIENT, INQUIRY_FIELDS, SUBJECT_PREFIX } from './inquiry-config';
import {
  FIELD_ORDER,
  InquirySendError,
  MAILTO_MAX_LENGTH,
  MAX_LENGTH,
  buildInquiryEmail,
  deliverInquiry,
  formatKst,
  inquiryRecipient,
  isDryRun,
  mailtoHref,
  normalizeInquiry,
  sendInquiry,
  toFormSubmitPayload,
  toPlainText,
  validateInquiry,
  type InquiryInput,
} from './inquiry';

const valid: InquiryInput = {
  company: '(주)한빛진공',
  name: '홍길동',
  phone: '010-1234-5678',
  email: 'gildong@example.com',
  model: 'SOGEVAC SV65B',
  message: 'SV65B 2대 견적 부탁드립니다.\n납기도 알려주세요.',
};

// 2026-11-25 10:30 UTC = 19:30 KST
const NOW = new Date(Date.UTC(2026, 10, 25, 10, 30));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  vi.useRealTimers();
});

describe('field definitions', () => {
  it('derive order and limits from INQUIRY_FIELDS', () => {
    expect(FIELD_ORDER).toEqual(['company', 'name', 'phone', 'email', 'model', 'message']);
    for (const f of INQUIRY_FIELDS) expect(MAX_LENGTH[f.name]).toBe(f.maxLength);
    expect(INQUIRY_FIELDS.filter((f) => !f.required).map((f) => f.name)).toEqual(['company', 'model']);
  });
});

describe('normalizeInquiry', () => {
  it('trims fields and normalises message line endings', () => {
    const out = normalizeInquiry({ name: '  홍길동 ', message: '  첫 줄   \r\n둘째 줄  \r셋째 줄\r\n' });
    expect(out.name).toBe('홍길동');
    expect(out.message).toBe('첫 줄\n둘째 줄\n셋째 줄');
    expect(out.company).toBe('');
  });

  it('turns full-width digits in the phone into ASCII', () => {
    expect(normalizeInquiry({ phone: '０１０－１２３４－５６７８' }).phone).toBe('010-1234-5678');
  });

  it('treats non-string values as empty', () => {
    const out = normalizeInquiry({ email: undefined, phone: 42, name: null });
    expect(out.phone).toBe('');
    expect(out.name).toBe('');
  });
});

describe('validateInquiry', () => {
  it('accepts a complete inquiry', () => {
    expect(validateInquiry(valid)).toEqual({});
  });

  it('company and pump model are optional; name, phone, email, message are required', () => {
    expect(validateInquiry(normalizeInquiry({}))).toEqual({
      name: 'required',
      phone: 'required',
      email: 'required',
      message: 'required',
    });
    expect(validateInquiry({ ...valid, company: '', model: '' })).toEqual({});
  });

  it('rejects whitespace-only required fields after normalising', () => {
    const errors = validateInquiry(normalizeInquiry({ ...valid, name: '   ', message: '\n\n  \n' }));
    expect(errors).toMatchObject({ name: 'required', message: 'required' });
  });

  it.each(['gildong', 'gildong@', 'gil dong@example.com', '@example.com', 'a,b@c.co', 'a@b.co,c@d.co', '<x@evil.com>', 'a@b..co', '"a b"@x.co', 'a;b@c.co'])(
    'rejects email %s',
    (email) => {
      expect(validateInquiry({ ...valid, email }).email).toBe('email');
    },
  );

  it.each(['gildong@example.com', 'first.last+tag@sub.example.co.kr'])('accepts email %s', (email) => {
    expect(validateInquiry({ ...valid, email }).email).toBeUndefined();
  });

  it.each(['010-1234-5678', '041-544-8058', '+82 10 1234 5678', '(041) 544-8058', '01012345678', '1588-1234', '02-123-4567 내선 12', '010-1234-5678 김과장'])(
    'accepts phone %s',
    (phone) => {
      expect(validateInquiry({ ...valid, phone }).phone).toBeUndefined();
    },
  );

  it.each(['1234', 'call me', '123-4567', '1'.repeat(21)])('rejects phone %s', (phone) => {
    expect(validateInquiry({ ...valid, phone }).phone).toBe('phone');
  });

  it('flags values over the limit, and accepts values at the limit', () => {
    expect(validateInquiry({ ...valid, message: 'a'.repeat(5000) }).message).toBeUndefined();
    expect(validateInquiry({ ...valid, message: 'a'.repeat(5001) }).message).toBe('tooLong');
    expect(validateInquiry({ ...valid, company: 'a'.repeat(101) }).company).toBe('tooLong');
  });
});

describe('formatKst', () => {
  it('formats in Korea time regardless of the runtime zone', () => {
    expect(formatKst(NOW)).toBe('2026-11-25 19:30 (KST)');
    expect(formatKst(new Date(Date.UTC(2026, 11, 31, 15, 5)))).toBe('2027-01-01 00:05 (KST)');
    expect(formatKst(new Date(Date.UTC(2026, 10, 25, 15, 0)))).toBe('2026-11-26 00:00 (KST)');
  });
});

describe('buildInquiryEmail', () => {
  it('names company and person in the subject and keeps a fixed row order', () => {
    const mail = buildInquiryEmail(valid, { now: NOW, lang: 'ko' });
    expect(mail.subject).toBe(`${SUBJECT_PREFIX} — (주)한빛진공 · 홍길동`);
    expect(mail.replyTo).toBe('gildong@example.com');
    expect(mail.rows).toEqual([
      ['회사명', '(주)한빛진공'],
      ['담당자/이름', '홍길동'],
      ['연락처', '010-1234-5678'],
      ['이메일', 'gildong@example.com'],
      ['펌프 모델 · 필요 압력', 'SOGEVAC SV65B'],
      ['문의 내용', 'SV65B 2대 견적 부탁드립니다.\n납기도 알려주세요.'],
      ['접수 시각', '2026-11-25 19:30 (KST)'],
      ['문의 언어', '한국어'],
    ]);
  });

  it('uses only the name when no company is given and marks empty optional rows', () => {
    const mail = buildInquiryEmail({ ...valid, company: '', model: '' }, { now: NOW, lang: 'en' });
    expect(mail.subject).toBe(`${SUBJECT_PREFIX} — 홍길동`);
    expect(mail.rows[0]).toEqual(['회사명', '—']);
    expect(mail.rows[4]).toEqual(['펌프 모델 · 필요 압력', '—']);
    expect(mail.rows.at(-1)).toEqual(['문의 언어', '영어 (English)']);
  });

  it('keeps the subject on one short line', () => {
    const mail = buildInquiryEmail({ ...valid, company: '가'.repeat(80), name: '홍\n길동' }, { now: NOW, lang: 'ko' });
    expect(mail.subject).not.toMatch(/\n/);
    expect(mail.subject).toBe(`${SUBJECT_PREFIX} — ${'가'.repeat(40)}… · 홍 길동`);
  });
});

describe('toFormSubmitPayload', () => {
  it('sets FormSubmit options and keeps rows in display order', () => {
    const mail = buildInquiryEmail(valid, { now: NOW, lang: 'ko' });
    const payload = toFormSubmitPayload(mail, 'https://topvac.co.kr/');
    expect(payload).toMatchObject({
      _subject: mail.subject,
      _template: 'table',
      _replyto: 'gildong@example.com',
      _captcha: 'false',
      _url: 'https://topvac.co.kr/',
    });
    expect(Object.keys(payload).filter((k) => !k.startsWith('_'))).toEqual(mail.rows.map(([label]) => label));
  });
});

describe('plain text and mailto fallback', () => {
  it('puts multi-line values on their own lines', () => {
    const text = toPlainText(buildInquiryEmail(valid, { now: NOW, lang: 'ko' }));
    expect(text).toContain('담당자/이름: 홍길동');
    expect(text).toContain('문의 내용:\nSV65B 2대 견적 부탁드립니다.\n납기도 알려주세요.');
  });

  it('encodes subject and body, with CRLF line breaks', () => {
    const mail = buildInquiryEmail({ ...valid, message: '&#%? 😀\n둘째 줄' }, { now: NOW, lang: 'ko' });
    const href = mailtoHref('kynam@topvac.co.kr', mail);
    expect(href.startsWith('mailto:kynam@topvac.co.kr?subject=')).toBe(true);
    expect(href).toContain('%0D%0A');
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('subject')).toBe(mail.subject);
    expect(params.get('body')).toBe(toPlainText(mail).replace(/\n/g, '\r\n'));
  });

  it('shortens a long message so the link stays within mail-client limits', () => {
    const mail = buildInquiryEmail({ ...valid, message: '가나다라마바사'.repeat(700) }, { now: NOW, lang: 'ko' });
    const href = mailtoHref('kynam@topvac.co.kr', mail);
    expect(href.length).toBeLessThanOrEqual(MAILTO_MAX_LENGTH);
    const body = new URLSearchParams(href.split('?')[1]).get('body')!;
    expect(body).toContain('담당자/이름: 홍길동');
    expect(body).toContain('일부만 담았습니다');
  });
});

describe('recipient and dry run', () => {
  it('defaults to the owner; PUBLIC_INQUIRY_TO only applies in astro dev', () => {
    expect(DEFAULT_RECIPIENT).toBe('kynam@topvac.co.kr');
    expect(inquiryRecipient({})).toBe('kynam@topvac.co.kr');
    expect(inquiryRecipient({ PUBLIC_INQUIRY_TO: 'test@example.com' })).toBe('kynam@topvac.co.kr');
    expect(inquiryRecipient({ DEV: true, PUBLIC_INQUIRY_TO: '  test@example.com ' })).toBe('test@example.com');
    expect(inquiryRecipient({ DEV: true, PUBLIC_INQUIRY_TO: '   ' })).toBe('kynam@topvac.co.kr');
  });

  it('sends for real only on the production hosts', () => {
    expect(isDryRun('topvac.co.kr', {})).toBe(false);
    expect(isDryRun('www.topvac.co.kr', {})).toBe(false);
    expect(isDryRun('TOPVAC.CO.KR', {})).toBe(false);
    for (const host of ['localhost', '127.0.0.1', '[::1]', '192.168.0.5', 'foo.ngrok.app', 'top-vacuum.github.io', 'localhost.evil.com']) {
      expect(isDryRun(host, {})).toBe(true);
    }
  });

  it('a local real send needs astro dev + PUBLIC_INQUIRY_LIVE=true + PUBLIC_INQUIRY_TO', () => {
    expect(isDryRun('localhost', { DEV: true, PUBLIC_INQUIRY_LIVE: 'true', PUBLIC_INQUIRY_TO: 'me@example.com' })).toBe(false);
    expect(isDryRun('localhost', { DEV: true, PUBLIC_INQUIRY_LIVE: 'true' })).toBe(true);
    expect(isDryRun('localhost', { PUBLIC_INQUIRY_LIVE: 'true', PUBLIC_INQUIRY_TO: 'me@example.com' })).toBe(true);
    expect(isDryRun('localhost', { DEV: true, PUBLIC_INQUIRY_LIVE: 'false', PUBLIC_INQUIRY_TO: 'me@example.com' })).toBe(true);
  });
});

describe('sendInquiry', () => {
  const payload = { _subject: 's', 담당자: '홍길동' };

  it('POSTs JSON to the endpoint and resolves "sent"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ success: 'true', message: 'The form was submitted successfully.' }));
    await expect(sendInquiry('https://formsubmit.co/ajax/a@b.co', payload, fetchMock)).resolves.toBe('sent');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://formsubmit.co/ajax/a@b.co');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', Accept: 'application/json' });
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('accepts success as a boolean too', async () => {
    await expect(sendInquiry('u', payload, vi.fn().mockResolvedValue(json({ success: true })))).resolves.toBe('sent');
  });

  it('returns pending-activation only for FormSubmit\'s "needs Activation" reply', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ success: 'false', message: "This form needs Activation. We've sent you an email containing an 'Activate Form' button." }),
    );
    await expect(sendInquiry('u', payload, fetchMock)).resolves.toBe('pending-activation');
  });

  it.each(['This form is deactivated', 'Please reactivate this form', 'Blocked'])('treats "%s" as an error', async (message) => {
    await expect(sendInquiry('u', payload, vi.fn().mockResolvedValue(json({ success: 'false', message })))).rejects.toThrow(message);
  });

  it('throws on HTTP errors, bodies that are not JSON, and network failures', async () => {
    await expect(sendInquiry('u', payload, vi.fn().mockResolvedValue(json({ success: 'true' }, 500)))).rejects.toThrow('HTTP 500');
    await expect(sendInquiry('u', payload, vi.fn().mockResolvedValue(json({}, 429)))).rejects.toBeInstanceOf(InquirySendError);
    await expect(sendInquiry('u', payload, vi.fn().mockResolvedValue(new Response('<html>portal</html>')))).rejects.toThrow(
      'Unexpected response',
    );
    await expect(sendInquiry('u', payload, vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))).rejects.toThrow(
      'Failed to fetch',
    );
  });
});

describe('deliverInquiry', () => {
  const mail = buildInquiryEmail(valid, { now: NOW, lang: 'ko' });

  it('posts the FormSubmit payload to the recipient endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ success: 'true' }));
    await deliverInquiry(mail, { to: 'kynam@topvac.co.kr', pageUrl: 'https://topvac.co.kr/', fetchImpl: fetchMock });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://formsubmit.co/ajax/kynam@topvac.co.kr');
    expect(JSON.parse(init.body)).toEqual(toFormSubmitPayload(mail, 'https://topvac.co.kr/'));
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('gives up after the timeout', async () => {
    vi.useFakeTimers();
    const hanging = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const pending = deliverInquiry(mail, { to: 'x@y.co', pageUrl: 'p', fetchImpl: hanging as unknown as typeof fetch, timeoutMs: 15_000 });
    const assertion = expect(pending).rejects.toThrow('Timed out');
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });
});
