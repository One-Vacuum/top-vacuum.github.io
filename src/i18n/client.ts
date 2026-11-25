/**
 * Browser-side i18n helpers for scripts that insert text at runtime.
 *
 * The page language lives on `<html lang>`, set by `setLang()` in
 * HomePage.astro. Text written with `data-i18n="<key>"` is re-translated by
 * `setLang()` on every switch, so runtime messages stay in sync.
 */
import { ui } from './ui';

export type Lang = 'ko' | 'en';
export type UiKey = keyof (typeof ui)['ko'];

export const currentLang = (): Lang => (document.documentElement.lang === 'en' ? 'en' : 'ko');

export const translate = (key: UiKey, lang: Lang = currentLang()): string => ui[lang][key] || ui.ko[key];

/** Write a translatable string into an element and tag it for setLang(). */
export function setI18nText(el: HTMLElement, key: UiKey) {
  el.dataset.i18n = key;
  el.textContent = translate(key);
}
