/**
 * Browser-side i18n: the KO/EN switch and helpers for scripts that insert
 * text at runtime. Identical in top-vacuum.github.io and one-vacuum.github.io
 * — change both.
 *
 * The page language lives on `<html lang>`. Elements tagged with the
 * attributes below are re-translated by `applyLang()` on every switch:
 * `data-i18n` (text; HTML only for keys in `htmlKeys`), `data-i18n-option`,
 * `data-i18n-placeholder`, `data-i18n-aria-label`, `img[data-alt-ko|en]`,
 * `.product-name` / `.product-desc` (`data-name-*` / `data-desc-*`).
 */
import { ui } from './ui';

export type Lang = keyof typeof ui;
export type UiKey = keyof (typeof ui)['ko'];

export const currentLang = (): Lang => (document.documentElement.lang === 'en' ? 'en' : 'ko');

// Own keys only, so markup like data-i18n="constructor" cannot reach Object.prototype.
const own = (lang: Lang, key: string) => (Object.prototype.hasOwnProperty.call(ui[lang], key) ? ui[lang][key as UiKey] : '');

/** Korean is the fallback for a missing or empty translation. */
export const translate = (key: string, lang: Lang = currentLang()): string => own(lang, key) || own('ko', key) || '';

/** Write a translatable string into an element and tag it for applyLang(). */
export function setI18nText(el: HTMLElement, key: UiKey) {
  el.dataset.i18n = key;
  el.textContent = translate(key);
}

/**
 * Switch every tagged element on the page to `lang`. Only keys listed in
 * `htmlKeys` (constant strings from ui.ts that contain markup) are written as
 * HTML; everything else is text.
 */
export function applyLang(lang: Lang, opts: { htmlKeys?: ReadonlySet<string>; root?: Document } = {}) {
  const root = opts.root ?? document;
  root.documentElement.lang = lang;

  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n!;
    const value = translate(key, lang);
    if (!value) return;
    if (el.tagName === 'TITLE') root.title = value;
    else if (el.tagName === 'META') el.setAttribute('content', value);
    else if (el.hasAttribute('data-i18n-html') && opts.htmlKeys?.has(key)) el.innerHTML = value;
    else el.textContent = value;
  });

  root.querySelectorAll<HTMLElement>('[data-i18n-option]').forEach((el) => {
    const value = translate(el.dataset.i18nOption!, lang);
    if (value) el.textContent = value;
  });

  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    const value = translate(el.dataset.i18nPlaceholder!, lang);
    if (value) el.placeholder = value;
  });

  root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((el) => {
    const value = translate(el.dataset.i18nAriaLabel!, lang);
    if (value) el.setAttribute('aria-label', value);
  });

  root.querySelectorAll<HTMLImageElement>('img[data-alt-ko]').forEach((el) => {
    el.alt = (lang === 'ko' ? el.dataset.altKo : el.dataset.altEn) || '';
  });

  root.querySelectorAll<HTMLElement>('.product-name').forEach((el) => {
    el.textContent = (lang === 'ko' ? el.dataset.nameKo : el.dataset.nameEn) || '';
  });
  root.querySelectorAll<HTMLElement>('.product-desc').forEach((el) => {
    el.textContent = (lang === 'ko' ? el.dataset.descKo : el.dataset.descEn) || '';
  });
}
