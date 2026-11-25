import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_RECIPIENT,
  InquirySendError,
  buildInquiryEmail,
  formSubmitEndpoint,
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

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('normalizeInquiry', () => {
  it('trims fields and normalises message line endings', () => {
    const out = normalizeInquiry({ name: '  홍길동 ', message: '  첫 줄   \r\n둘째 줄  \r\n' });
    expect(out.name).toBe('홍길동');
    expect(out.message).toBe('첫 줄\n둘째 줄');
    expect(out.company).toBe('');
  });

  it('treats non-string values as empty', () => {
    expect(normalizeInquiry({ email: undefined, phone: 42 as unknown as string }).phone).toBe('');
  });
});

describe('validateInquiry', () => {
  it('accepts a complete inquiry', () => {
    expect(validateInquiry(valid)).toEqual({});
  });

  it('company and pump model are optional; name, phone, email, message are required', () => {
    const empty = normalizeInquiry({});
    expect(validateInquiry(empty)).toEqual({
      name: 'required',
      phone: 'required',
      email: 'required',
      message: 'required',
    });
    expect(validateInquiry({ ...valid, company: '', model: '' })).toEqual({});
  });

  it('rejects whitespace-only required fields after normalising', () => {
    expect(validateInquiry(normalizeInquiry({ ...valid, name: '   ' })).name).toBe('required');
  });

  it.each(['gildong', 'gildong@', 'gil dong@example.com', '@example.com'])('rejects email %s', (email) => {
    expect(validateInquiry({ ...valid, email }).email).toBe('email');
  });

  it.each(['010-1234-5678', '041-544-8058', '+82 10 1234 5678', '(041) 544-8058', '01012345678'])(
    'accepts phone %s',
    (phone) => {
      expect(validateInquiry({ ...valid, phone }).phone).toBeUndefined();
    },
  );

  it.each(['1234', 'call me', '010-1234-567a', '1'.repeat(16)])('rejects phone %s', (phone) => {
    expect(validateInquiry({ ...valid, phone }).phone).toBe('phone');
  });

  it('flags over-long values', () => {
    expect(validateInquiry({ ...valid, message: 'a'.repeat(5001) }).message).toBe('tooLong');
    expect(validateInquiry({ ...valid, company: 'a'.repeat(101) }).company).toBe('tooLong');
  });
});

describe('formatKst', () => {
  it('formats in Korea time regardless of the runtime zone', () => {
    expect(formatKst(NOW)).toBe('2026-11-25 19:30 (KST)');
    expect(formatKst(new Date(Date.UTC(2026, 11, 31, 15, 5)))).toBe('2027-01-01 00:05 (KST)');
  });
});

describe('buildInquiryEmail', () => {
  it('names company and person in the subject and keeps a fixed row order', () => {
    const mail = buildInquiryEmail(valid, { now: NOW, lang: 'ko' });
    expect(mail.subject).toBe('[탑베큠 홈페이지] 견적·기술 문의 — (주)한빛진공 · 홍길동');
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
    expect(mail.subject).toBe('[탑베큠 홈페이지] 견적·기술 문의 — 홍길동');
    expect(mail.rows[0]).toEqual(['회사명', '—']);
    expect(mail.rows[4]).toEqual(['펌프 모델 · 필요 압력', '—']);
    expect(mail.rows.at(-1)).toEqual(['문의 언어', '영어 (English)']);
  });
});

describe('toFormSubmitPayload', () => {
  it('sets FormSubmit options and keeps rows in display order', () => {
    const mail = buildInquiryEmail(valid, { now: NOW, lang: 'ko' });
    const payload = toFormSubmitPayload(mail, 'https://topvac.co.kr/#inquiry');
    expect(payload).toMatchObject({
      _subject: mail.subject,
      _template: 'table',
      _replyto: 'gildong@example.com',
      _captcha: 'false',
      _url: 'https://topvac.co.kr/#inquiry',
    });
    const rowKeys = Object.keys(payload).filter((k) => !k.startsWith('_'));
    expect(rowKeys).toEqual(mail.rows.map(([label]) => label));
  });
});

describe('plain text and mailto fallback', () => {
  it('puts multi-line values on their own lines', () => {
    const text = toPlainText(buildInquiryEmail(valid, { now: NOW, lang: 'ko' }));
    expect(text).toContain('담당자/이름: 홍길동');
    expect(text).toContain('문의 내용:\nSV65B 2대 견적 부탁드립니다.\n납기도 알려주세요.');
  });

  it('encodes subject and body into the mailto link', () => {
    const mail = buildInquiryEmail(valid, { now: NOW, lang: 'ko' });
    const href = mailtoHref('kynam@topvac.co.kr', mail);
    expect(href.startsWith('mailto:kynam@topvac.co.kr?subject=')).toBe(true);
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('subject')).toBe(mail.subject);
    expect(params.get('body')).toBe(toPlainText(mail));
  });
});

describe('recipient and dry run', () => {
  it('defaults to the owner and accepts an override', () => {
    expect(DEFAULT_RECIPIENT).toBe('kynam@topvac.co.kr');
    expect(inquiryRecipient({})).toBe('kynam@topvac.co.kr');
    expect(inquiryRecipient({ PUBLIC_INQUIRY_TO: '  test@example.com ' })).toBe('test@example.com');
    expect(formSubmitEndpoint('kynam@topvac.co.kr')).toBe('https://formsubmit.co/ajax/kynam@topvac.co.kr');
  });

  it('never sends from localhost unless PUBLIC_INQUIRY_LIVE=true', () => {
    expect(isDryRun('localhost', {})).toBe(true);
    expect(isDryRun('127.0.0.1', {})).toBe(true);
    expect(isDryRun('localhost', { PUBLIC_INQUIRY_LIVE: 'true' })).toBe(false);
    expect(isDryRun('topvac.co.kr', {})).toBe(false);
  });
});

describe('sendInquiry', () => {
  const payload = { _subject: 's', 담당자: '홍길동' };

  it('POSTs JSON to the endpoint and resolves "sent"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: 'true', message: 'The form was submitted successfully.' }));
    await expect(sendInquiry('https://formsubmit.co/ajax/a@b.co', payload, fetchMock)).resolves.toBe('sent');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://formsubmit.co/ajax/a@b.co');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', Accept: 'application/json' });
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('treats "needs activation" as accepted (FormSubmit keeps the submission)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: 'false', message: "This form needs Activation. We've sent you an email containing an 'Activate Form' button." }),
    );
    await expect(sendInquiry('u', payload, fetchMock)).resolves.toBe('pending-activation');
  });

  it('throws on HTTP errors, unexpected bodies and network failures', async () => {
    await expect(sendInquiry('u', payload, vi.fn().mockResolvedValue(jsonResponse({}, 500)))).rejects.toBeInstanceOf(InquirySendError);
    await expect(
      sendInquiry('u', payload, vi.fn().mockResolvedValue(jsonResponse({ success: 'false', message: 'Blocked' }))),
    ).rejects.toThrow('Blocked');
    await expect(
      sendInquiry('u', payload, vi.fn().mockResolvedValue(new Response('<html>oops</html>', { status: 200 }))),
    ).rejects.toBeInstanceOf(InquirySendError);
    await expect(sendInquiry('u', payload, vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))).rejects.toThrow(
      'Failed to fetch',
    );
  });
});
