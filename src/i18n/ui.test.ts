// Shared — identical in top-vacuum.github.io and one-vacuum.github.io (change both).
import { describe, expect, it } from 'vitest';
import { ui } from './ui';

describe('ui translations', () => {
  it('Korean and English define the same keys', () => {
    expect(Object.keys(ui.en).sort()).toEqual(Object.keys(ui.ko).sort());
  });

  it('has no empty translation', () => {
    for (const lang of ['ko', 'en'] as const) {
      for (const [key, value] of Object.entries(ui[lang])) expect(value, `${lang} ${key}`).toBeTruthy();
    }
  });
});
