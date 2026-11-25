import { describe, expect, it } from 'vitest';
import type { InquiryError } from '../lib/inquiry';
import type { InquiryStatus } from '../lib/inquiry-form';
import { ui } from './ui';

describe('ui translations', () => {
  it('Korean and English define the same keys', () => {
    expect(Object.keys(ui.en).sort()).toEqual(Object.keys(ui.ko).sort());
  });

  it('every message the inquiry form can show exists in both languages', () => {
    const errors: InquiryError[] = ['required', 'email', 'phone', 'tooLong'];
    const statuses: InquiryStatus[] = ['invalid', 'sending', 'sent', 'pending', 'error', 'dryRun'];
    const keys = [...errors.map((e) => `inquiry.error.${e}`), ...statuses.map((s) => `inquiry.status.${s}`), 'inquiry.submit', 'inquiry.sending'];
    for (const lang of ['ko', 'en'] as const) {
      for (const key of keys) expect(ui[lang][key as keyof (typeof ui)['ko']], `${lang} ${key}`).toBeTruthy();
    }
  });
});
