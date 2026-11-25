// Top Vacuum's inquiry settings, pinned so a copy edit cannot silently change
// where inquiries go or how they look.
import { describe, expect, it } from 'vitest';
import { DEFAULT_RECIPIENT, INQUIRY_FIELDS, PRODUCTION_HOSTS, SUBJECT_PREFIX } from './inquiry-config';

describe('Top Vacuum inquiry config', () => {
  it('mails the owner with the agreed subject, only from topvac.co.kr', () => {
    expect(DEFAULT_RECIPIENT).toBe('kynam@topvac.co.kr');
    expect(SUBJECT_PREFIX).toBe('[탑베큠 홈페이지] 견적·기술 문의');
    expect(PRODUCTION_HOSTS).toEqual(['topvac.co.kr', 'www.topvac.co.kr']);
  });

  it('has the agreed fields: 회사명 optional, 담당자/이름, pump model optional', () => {
    expect(INQUIRY_FIELDS.map((f) => [f.name, f.emailLabel, f.required])).toEqual([
      ['company', '회사명', false],
      ['name', '담당자/이름', true],
      ['phone', '연락처', true],
      ['email', '이메일', true],
      ['model', '펌프 모델 · 필요 압력', false],
      ['message', '문의 내용', true],
    ]);
  });
});
