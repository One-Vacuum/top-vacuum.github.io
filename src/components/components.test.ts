import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Header from './Header.astro';
import Hero from './Hero.astro';
import LanguageSwitcher from './LanguageSwitcher.astro';

const render = async (component: Parameters<AstroContainer['renderToString']>[0]) =>
  (await AstroContainer.create()).renderToString(component);

describe('Hero', () => {
  it('links the 문의하기 button to the inquiry form', async () => {
    const html = await render(Hero);
    expect(html).toMatch(/<a href="#inquiry"[^>]*data-i18n="cta.inquiry"[^>]*>문의하기<\/a>/);
  });

  it('builds tel: links with digits only', async () => {
    const html = await render(Hero);
    expect(html).toContain('href="tel:0415448058"');
    expect(html).toContain('href="tel:01044551309"');
  });
});

describe('Header', () => {
  it('names the wordmark link by its visible text and translates control names', async () => {
    const html = await render(Header);
    expect(html).not.toContain('aria-label="Top Vacuum Inc."');
    expect(html).toContain('data-i18n-aria-label="a11y.darkMode"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('href="mailto:kynam@topvac.co.kr"');
  });
});

describe('LanguageSwitcher', () => {
  it('keeps the visible KO / EN text as the accessible name', async () => {
    const html = await render(LanguageSwitcher);
    expect(html).toMatch(/<button id="btnKO"[^>]*>KO<\/button>/);
    expect(html).not.toMatch(/<button id="btnKO"[^>]*aria-label/);
  });
});
