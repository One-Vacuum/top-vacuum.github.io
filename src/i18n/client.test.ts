// @vitest-environment happy-dom
// Shared tests for ./client.ts — identical in top-vacuum.github.io and
// one-vacuum.github.io (change both).
import { beforeEach, describe, expect, it } from 'vitest';
import { applyLang, currentLang, translate } from './client';
import { ui } from './ui';

const KEY = 'nav.contact';

beforeEach(() => {
  document.documentElement.lang = 'ko';
  document.head.innerHTML = `<title data-i18n="${KEY}">x</title><meta name="description" data-i18n="${KEY}" content="x">`;
  document.body.innerHTML = `
    <p id="text" data-i18n="${KEY}">x</p>
    <p id="html" data-i18n="${KEY}" data-i18n-html>x</p>
    <select><option id="opt" data-i18n-option="${KEY}">x</option></select>
    <input id="input" data-i18n-placeholder="${KEY}" data-i18n-aria-label="${KEY}">
    <img id="img" data-alt-ko="오일" data-alt-en="Oil" alt="">
    <h3 class="product-name" data-name-ko="이름" data-name-en="Name">x</h3>
    <p class="product-desc" data-desc-ko="설명" data-desc-en="Description">x</p>`;
});

describe('translate', () => {
  it('reads the current <html lang> and falls back to Korean', () => {
    expect(currentLang()).toBe('ko');
    document.documentElement.lang = 'en';
    expect(currentLang()).toBe('en');
    expect(translate(KEY)).toBe(ui.en[KEY]);
    expect(translate('no.such.key')).toBe('');
    expect(translate('constructor')).toBe('');
    expect(translate('__proto__')).toBe('');
  });
});

describe('applyLang', () => {
  it('switches every kind of tagged element', () => {
    applyLang('en');
    const en = ui.en[KEY];
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe(en);
    expect(document.querySelector('meta')!.getAttribute('content')).toBe(en);
    expect(document.getElementById('text')!.textContent).toBe(en);
    expect(document.getElementById('opt')!.textContent).toBe(en);
    expect((document.getElementById('input') as HTMLInputElement).placeholder).toBe(en);
    expect(document.getElementById('input')!.getAttribute('aria-label')).toBe(en);
    expect((document.getElementById('img') as HTMLImageElement).alt).toBe('Oil');
    expect(document.querySelector('.product-name')!.textContent).toBe('Name');
    expect(document.querySelector('.product-desc')!.textContent).toBe('Description');
  });

  it('writes HTML only for allow-listed keys', () => {
    const html = document.getElementById('html')!;
    html.dataset.i18n = 'no.such.key';
    applyLang('en');
    expect(html.textContent).toBe('x');

    html.dataset.i18n = KEY;
    const spy = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!;
    let wroteHtml = false;
    Object.defineProperty(html, 'innerHTML', { set: (v: string) => { wroteHtml = true; spy.set!.call(html, v); }, get: () => spy.get!.call(html), configurable: true });
    applyLang('en');
    expect(wroteHtml).toBe(false);
    applyLang('en', { htmlKeys: new Set([KEY]) });
    expect(wroteHtml).toBe(true);
  });

  it('switches back to Korean', () => {
    applyLang('en');
    applyLang('ko');
    expect(document.getElementById('text')!.textContent).toBe(ui.ko[KEY]);
    expect((document.getElementById('img') as HTMLImageElement).alt).toBe('오일');
  });
});
