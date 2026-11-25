# CLAUDE.md

This file provides guidance for Claude Code when working on this project.

## Git & Commit Rules

- **NEVER commit directly to `main` branch.** Always create a feature/fix branch and open a PR.
- **NEVER create commits unless explicitly told to do so.**
- Always run `npm run build` before committing to verify no build errors.

## Documentation

- **IMPORTANT: Every time you make changes to the codebase, update CLAUDE.md, README.md, and README.en.md** to reflect the changes. This includes changes to project structure, features, commands, architecture, product schema, styling conventions, or any other documented aspect. All three files must stay in sync and accurately describe the current state of the project.

## Project Overview

Top Vacuum Inc. (탑베큠 주식회사) — Leybold(라이볼트) 한국 공식 대리점. A bilingual (Korean/English) company brochure website built with Astro and Tailwind CSS, hosted on GitHub Pages at https://topvac.co.kr.

**Copy rule:** all site text comes from the company's existing copy in `src/i18n/ui.ts`. Do not invent claims, services, application lists, or technical data (e.g. pressure ranges); design changes may only rearrange existing text. Functional UI text (form labels, validation and status messages) and copy the user has explicitly approved (e.g. the inquiry section heading and lead) are fine.

## Shared Code with one-vacuum.github.io

Both sites ship the same inquiry form and i18n runtime. These files must stay **byte-identical** in both repos — change both, then run `scripts/check-shared.sh ../one-vacuum.github.io` (it `cmp`s the list below):
`src/lib/inquiry.ts`, `src/lib/inquiry-form.ts`, `src/lib/inquiry.test.ts`, `src/lib/inquiry-form.test.ts`, `src/components/InquiryForm.astro`, `src/i18n/client.ts`, `src/i18n/client.test.ts`, `src/i18n/ui.test.ts`, `src/test/setup.ts`, `vitest.config.ts`, `scripts/check-shared.sh`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`.
Site-specific counterparts: `src/lib/inquiry-config.ts` (+ `inquiry-config.test.ts` pinning its values), `src/lib/contact.ts`, `src/i18n/ui.ts`, and the section wrapper `InquirySection.astro`.

## Tech Stack

- **Framework**: Astro 5.x (Static Site Generation)
- **Styling**: Tailwind CSS 3.4 with an "engineering partner" palette (ink `#0B1416`, petrol accent `#0B5D6B`, cool paper surfaces)
- **Node**: CI and deploy run Node 22 (`astro check` needs it)
- **Fonts**: Pretendard (body, loaded from CDN) + Inter Tight (wordmark, small uppercase labels, phone numbers; Google Fonts)
- **i18n**: Client-side toggle via `data-i18n` attributes (Korean default, single page)
- **Theme**: Dark/light mode toggle with Tailwind `dark:` classes (default: light)
- **Deployment**: GitHub Pages via GitHub Actions (auto-deploy on push to `main`)

## Project Structure

```
top-vacuum.github.io/
├── src/
│   ├── components/
│   │   ├── Header.astro           # Petrol top strip + sticky header (wordmark, nav, lang/theme toggles)
│   │   ├── Footer.astro           # Light footer: wordmark, description, quick links, business info
│   │   ├── Hero.astro             # Headline, description, CTAs (문의하기 → #inquiry) + quick-contact card
│   │   ├── InquiryForm.astro      # Shared inquiry form + preview dialog markup (identical in both repos)
│   │   ├── HomePage.astro         # Main page (hero, inquiry section, products section) + client-side JS
│   │   ├── InquirySection.astro   # "견적 · 기술 문의" (#contact): direct contacts + inquiry form (#inquiry)
│   │   ├── ProductCard.astro      # Product card with opacity-based front/back toggle
│   │   └── LanguageSwitcher.astro # KO / EN segmented switch
│   ├── i18n/
│   │   ├── ui.ts                  # All translation strings (KO/EN)
│   │   ├── client.ts              # KO/EN runtime: applyLang(), translate(), setI18nText() (shared)
│   │   ├── client.test.ts         # applyLang tests (shared)
│   │   └── ui.test.ts             # KO/EN key parity + every key the form uses (shared)
│   ├── lib/
│   │   ├── products.ts            # Product loading utility (reads public/products/products.json)
│   │   ├── features.ts            # Feature flags (e.g. SHOW_PRODUCTS to hide the products section)
│   │   ├── contact.ts             # Phone / email values (ui.ts reads them) + tel:/mailto: helpers
│   │   ├── inquiry-config.ts      # This site's inquiry form settings (fields, subject, recipient, hosts)
│   │   ├── inquiry.ts             # Inquiry logic: validation, email layout, FormSubmit sending (shared)
│   │   ├── inquiry-form.ts        # Inquiry browser controller + preview dialog (shared)
│   │   └── *.test.ts              # Vitest tests
│   ├── layouts/
│   │   └── BaseLayout.astro       # Main HTML layout (head, header, footer)
│   ├── pages/
│   │   └── index.astro            # Single page entry (renders HomePage)
│   ├── styles/
│   │   └── global.css             # Tailwind imports + custom component classes
│   └── test/
│       └── setup.ts               # Vitest setup: unmocked fetch fails (no network in tests)
├── public/
│   ├── images/
│   │   └── placeholder-product.svg # Placeholder for missing product images
│   ├── products/
│   │   ├── products.json          # Product data (easy to edit!)
│   │   └── images/                # Product images
├── .github/workflows/
│   ├── deploy.yml                 # Test + build + deploy to GitHub Pages on push to main (per-job least-privilege permissions)
│   └── ci.yml                     # Test + build on every pull request (read-only token)
├── scripts/check-shared.sh        # Checks the shared files are identical to the other site's
├── vitest.config.ts               # Vitest via Astro's Vite config (getViteConfig)
├── astro.config.mjs               # Astro configuration (site URL, Tailwind)
├── tailwind.config.mjs            # Tailwind theme (custom colors, fonts)
├── tsconfig.json                  # TypeScript config (path aliases @ → src/)
└── package.json                   # Dependencies and scripts
```

## Architecture Notes

### Page Rendering Flow
1. `index.astro` renders `HomePage.astro` directly (single page, no routing)
2. `HomePage.astro` renders `Hero.astro` (headline + quick-contact card), `InquirySection.astro` (`id="contact"`, form `id="inquiry"`) and the products section, plus client-side JS for language switching, category filtering, search, and sorting
3. `BaseLayout.astro` wraps everything with HTML shell, Header, and Footer
4. All translatable elements use `data-i18n` attributes; client-side `setLang()` swaps text from `src/i18n/ui.ts`
5. Product names/descriptions use `data-name-ko`/`data-name-en` and `data-desc-ko`/`data-desc-en` attributes

### Feature Flags
- `src/lib/features.ts` holds compile-time feature flags consumed by the Astro components
- `SHOW_PRODUCTS` (default `false`): when `false`, the entire "제품 소개 / Products" section in `HomePage.astro` is hidden, along with all product-related navigation (header desktop + mobile links, footer quick link, hero CTA button). The code is gated with `{SHOW_PRODUCTS && (...)}`, not deleted — flip to `true` to restore the section once products exist
- The contact card, inquiry section and all other content remain visible regardless of this flag

### Product Loading
- Products are loaded at **build time** from `public/products/products.json` via `src/lib/products.ts`
- The `loadProducts()` function reads JSON, sorts by `order`, and returns bilingual product data
- Empty JSON `[]` shows "Products Coming Soon..." message
- Products are filterable by category via client-side JS tabs (All / Oil / Oil Filter / Vacuum Filter)
- Products are searchable by name or part number
- Products can be sorted by price (ascending/descending); default sort shows best sellers first
- Prices are displayed in KRW (₩) format
- Pagination via "Show More" button (8 items per page)

### Product JSON Schema
Each entry in `public/products/products.json`:
```json
{
  "partNumber": "ABC123",
  "image": "my-product.jpg",
  "nameKo": "제품 이름",
  "nameEn": "Product Name",
  "descriptionKo": "제품 설명 (optional)",
  "descriptionEn": "Product description (optional)",
  "category": "oil | oil-filter | vacuum-filter",
  "price": 50000,
  "bestSeller": true
}
```
- `partNumber`: product part number displayed on the card
- `image`: filename in `public/products/images/` (prefer JPG for smaller file size)
- `category`: must be one of `oil`, `oil-filter`, `vacuum-filter`
- `price`: integer in KRW (no decimals)
- `bestSeller`: optional, shows BEST badge and prioritizes in default sort

### Product Card Interaction
- Cards use an **opacity fade** transition (not 3D flip) to toggle between front (product image/price) and back (detail info)
- Clicking a card toggles the `.flipped` class; CSS handles opacity transitions on `.card-front` and `.card-back`

### i18n System
- Single page with client-side language toggle (default: Korean)
- KO sets Korean, EN sets English (segmented switch; the active side gets `lang-active`)
- All translatable elements have `data-i18n="key"` attributes
- `setLang()` in `HomePage.astro` updates the KO/EN buttons and calls `applyLang(lang, { htmlKeys })` from `src/i18n/client.ts`, which re-translates every tagged element (the shared, tested part); site-only extras stay in `setLang()`
- For translations that contain HTML (e.g. inline links), add `data-i18n-html` to the element and use Astro's `set:html={...}` for static render; the runtime switcher uses `innerHTML` when `data-i18n-html` is present
- Product cards use `data-name-ko`/`data-name-en` for bilingual product names
- Accessible names follow the language too: `data-i18n-aria-label="key"` (nav landmarks, theme/menu/clear/close buttons, search and sort, store buttons) and product image `alt` via `data-alt-ko`/`data-alt-en`
- `data-i18n-html` is honoured only for keys in the `HTML_KEYS` set passed to `applyLang()` (the strings that contain markup); other keys always use `textContent`
- Korean is the fallback language if a translation key is missing

### Theme System
- Dark/light mode toggle in header (default: light/day mode)
- Uses Tailwind `dark:` variant with `class` strategy
- The preference is not persisted (reload returns to light)
- The sun/moon icon swaps via `dark:` classes, no JS; the button's `aria-pressed` reflects dark mode
- `<html>` element gets `class="dark"` toggled

### Inquiry Form (email)
- **Files:** the shared `InquiryForm.astro` (form + preview dialog, the markup `inquiry-form.ts` binds to) is placed by `InquirySection.astro`, which renders the form (`#inquiry`) inside the "견적 · 기술 문의" section (`#contact`); `src/lib/inquiry-config.ts` holds this site's fields, subject prefix, recipient and production hosts; `src/lib/inquiry.ts` (validation, email layout, sending) and `src/lib/inquiry-form.ts` (browser controller, preview dialog) are **identical in one-vacuum.github.io — change both**
- **Fields:** one list, `INQUIRY_FIELDS` in `inquiry-config.ts`, drives the markup, validation, max lengths and email rows. 회사명 and 펌프 모델 · 필요 압력 (`model`) are optional; 담당자/이름, 연락처, 이메일, 문의 내용 are required. Phone: 8–20 digits, anything else around them allowed (extensions, 내선), full-width digits normalised. Email: no whitespace or `, ; < > ( ) "` so it can never become several Reply-To addresses
- **Delivery:** GitHub Pages is static, so `deliverInquiry` POSTs JSON to FormSubmit's AJAX endpoint `https://formsubmit.co/ajax/<recipient>` (no account or key) and aborts after 15 s. Recipient: **kynam@topvac.co.kr** (`DEFAULT_RECIPIENT`, the public contact email from `ui.ts`)
- **Email layout (for the owner):** subject `[탑베큠 홈페이지] 견적·기술 문의 — <company> · <name>` (name only without a company; each part one line, max 40 characters); FormSubmit `_template: table` with Korean row labels in field order, then 접수 시각 (KST) and 문의 언어. Empty optional fields show `—`. `_replyto` is the customer, so "Reply" goes straight to them. `_url` is the page origin + path (no query string)
- **Outcomes:** sent → form resets, "문의가 전송되었습니다". FormSubmit's exact "This form needs Activation" reply (recipient has not clicked the one-time activation email; FormSubmit keeps those submissions 30 days) → form resets, "문의가 접수되었습니다…" plus a pre-filled email link. Any other refusal, HTTP error, non-JSON body, network failure or timeout → input kept, error message plus a pre-filled `mailto:` link (capped at 1800 characters by shortening the message)
- **While sending:** the button is `aria-disabled` (not `disabled`, which would drop keyboard focus) and fields are read-only; afterwards focus moves to the status message. The status region (`role="status"`) stays rendered when empty (`sr-only`) so it is announced
- **Preview instead of sending:** real sends happen only on `topvac.co.kr`, `www.topvac.co.kr` (`PRODUCTION_HOSTS`). Everywhere else (localhost, LAN IPs, tunnels, `npm run preview`) the form opens a dialog showing the exact email and sends nothing. A real send from `astro dev` needs both `PUBLIC_INQUIRY_LIVE=true` and `PUBLIC_INQUIRY_TO=<address>`; `PUBLIC_INQUIRY_TO` / `PUBLIC_INQUIRY_LIVE` are compiled out of production builds, and the override must be a plain address
- **Spam:** a hidden `_honey` field; if filled, the submit pretends success and sends nothing. The endpoint itself is public, so direct POSTs bypass every client check — accepted for a no-backend site; see README
- **No-JS:** the form is `method="post"`, so if the script never loads, typed details are not put in the URL
- **Input cleaning:** control characters, bidi overrides and half emoji (lone surrogates) are dropped; single-line fields lose line breaks. Truncation (subject parts, the mailto body) counts whole characters, so emoji are never split
- **Message keys:** `STATUS_KEYS` / `ERROR_KEYS` in `inquiry-form.ts` map every status and error to a `ui.ts` key, so `npm run check` fails if one is missing
- **i18n:** labels use `inquiry.*` keys; error/status messages carry `data-i18n` so the KO/EN switch re-translates them. Email labels stay Korean regardless of page language
- **Tests:** shared `src/lib/inquiry.test.ts` (logic) and `src/lib/inquiry-form.test.ts` (renders `InquiryForm.astro` with Astro's `experimental_AstroContainer` in happy-dom and drives it through `initInquiryForms` with a mocked `fetch`) take every site value from `inquiry-config.ts`; `src/lib/inquiry-config.test.ts` pins this site's values; `src/components/components.test.ts` covers the site's components and a HomePage smoke render. `src/test/setup.ts` makes any unmocked `fetch` fail, so tests can never email the owner. The Container API is experimental: re-run `npm test` after any `astro` upgrade

## Image Optimization

- **Prefer JPG over PNG** for product images — significantly smaller file sizes
- Keep product images as small as possible to improve page load speed and minimize repository size

## Key Files for Content Updates

| What to Update | File(s) |
|----------------|---------|
| **Products** | `public/products/products.json` + images in `public/products/images/` |
| UI text translations | `src/i18n/ui.ts` |
| Contact info | `src/lib/contact.ts` (phone, email — also the inquiry recipient) and `src/i18n/ui.ts` (address) |
| Inquiry form fields / subject / recipient / live hosts | `src/lib/inquiry-config.ts` |

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Start dev server (http://localhost:4321)
npm run build  # Build for production (outputs to ./dist)
npm run preview # Preview production build locally
npm test       # Run unit + component tests (Vitest)
npm run check  # Type-check .astro and .ts files (astro check; needs Node 22)
```

## Styling Conventions

- Uses Tailwind CSS utility classes
- Colour tokens (`tailwind.config.mjs`): `ink` (text), `paper` (contact card, inquiry form panel), `line` / `line-strong` (dividers / form control borders, 3:1), `danger` (errors), `accent` (petrol `#0B5D6B`: top strip, primary button, labels; `accent-light` on dark), `night-*` and `snow-*` (dark mode). There is no `primary-*` palette any more
- Custom components defined in `src/styles/global.css`: `.container-custom`, `.section`, `.label` (small uppercase petrol label), `.focus-ring`, `.btn-primary` / `.btn-secondary`, `.icon-btn`, `.nav-link`, `.lang-btn`, `.filter-btn`, `.field`, `.input` / `.field-error` / `.inquiry-status` / `.inquiry-preview` (inquiry form), and `.card-flip`. `.focus-ring` adds a transparent outline so focus stays visible in forced-colors (high contrast) mode / `.card-inner` / `.card-front` / `.card-back` (product card toggle)
- The wordmark is plain text ("TOP VACUUM" in Inter Tight 800) in `Header.astro` and `Footer.astro`; there is no logo image or favicon yet
- Classes used inside HTML strings in `ui.ts` (e.g. the Leybold links) are picked up because Tailwind scans `.ts` files
- Responsive breakpoint: `md:` for desktop nav and layout transitions

## Deployment

Automatic deployment via GitHub Actions on push to `main` branch (type check, tests, then build, then deploy; only the deploy job has `pages: write` / `id-token: write`). `ci.yml` runs the type check, tests and build on every pull request with a read-only token. Requires GitHub Pages to be configured with "GitHub Actions" as the build source.
