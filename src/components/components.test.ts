import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Header from './Header.astro';
import Hero from './Hero.astro';
import HomePage from './HomePage.astro';
import ContactSection from './ContactSection.astro';
import LanguageSwitcher from './LanguageSwitcher.astro';

const render = async (component: Parameters<AstroContainer['renderToString']>[0]) =>
  (await AstroContainer.create()).renderToString(component);

describe('Hero', () => {
  it('links the 연락처 button to the contact section', async () => {
    const html = await render(Hero);
    expect(html).toMatch(/<a href="#contact"[^>]*data-i18n="nav.contact"[^>]*>연락처<\/a>/);
  });

  it('builds tel: links with digits only', async () => {
    const html = await render(Hero);
    expect(html).toContain('href="tel:0415448058"');
    expect(html).toContain('href="tel:01044551309"');
  });
});

describe('ContactSection', () => {
  it('is the #contact section with phone, mobile, email and address', async () => {
    const html = await render(ContactSection);
    expect(html).toMatch(/<section id="contact"/);
    expect(html).toContain('href="tel:0415448058"');
    expect(html).toContain('href="tel:01044551309"');
    expect(html).toContain('href="mailto:kynam@topvac.co.kr"');
    expect(html).toContain('data-i18n="contact.addressValue"');
    expect(html).not.toContain('<form');
  });
});

describe('HomePage', () => {
  it('renders the hero, the contact section and the language switch', async () => {
    const html = await render(HomePage);
    expect(html).toContain('id="contact"');
    expect(html).not.toContain('<form');
    expect(html).toContain('id="btnKO"');
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
