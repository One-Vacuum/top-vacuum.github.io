// Shared — identical in top-vacuum.github.io and one-vacuum.github.io (change both).
import { describe, expect, it } from 'vitest';
import { ERROR_KEYS, STATUS_KEYS } from '../lib/inquiry-form';
import { INQUIRY_FIELDS } from '../lib/inquiry-config';
import { ui } from './ui';

describe('ui translations', () => {
  it('Korean and English define the same keys', () => {
    expect(Object.keys(ui.en).sort()).toEqual(Object.keys(ui.ko).sort());
  });

  it('every message and label the inquiry form uses exists in both languages', () => {
    const keys = [
      ...Object.values(STATUS_KEYS),
      ...Object.values(ERROR_KEYS),
      ...INQUIRY_FIELDS.flatMap((f) => [f.labelKey, ...('placeholderKey' in f ? [f.placeholderKey] : [])]),
      'inquiry.submit',
      'inquiry.sending',
      'inquiry.optional',
      'a11y.close',
    ];
    for (const lang of ['ko', 'en'] as const) {
      for (const key of keys) expect(ui[lang][key as keyof (typeof ui)['ko']], `${lang} ${key}`).toBeTruthy();
    }
  });
});
