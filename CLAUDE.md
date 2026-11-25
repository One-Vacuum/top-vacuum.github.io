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

## Tech Stack

- **Framework**: Astro 5.x (Static Site Generation)
- **Styling**: Tailwind CSS 3.4 with an "engineering partner" palette (ink `#0B1416`, petrol accent `#0B5D6B`, cool paper surfaces)
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
│   │   ├── HomePage.astro         # Main page (hero, inquiry section, products section) + client-side JS
│   │   ├── InquirySection.astro   # "견적 · 기술 문의" (#contact): direct contacts + inquiry form (#inquiry)
│   │   ├── ProductCard.astro      # Product card with opacity-based front/back toggle
│   │   └── LanguageSwitcher.astro # KO / EN segmented switch
│   ├── i18n/
│   │   └── ui.ts                  # All translation strings (KO/EN)
│   ├── lib/
│   │   ├── products.ts            # Product loading utility (reads public/products/products.json)
│   │   ├── features.ts            # Feature flags (e.g. SHOW_PRODUCTS to hide the products section)
│   │   ├── inquiry.ts             # Inquiry form logic: validation, email layout, FormSubmit sending
│   │   ├── inquiry-form.ts        # Browser controller for the inquiry form (+ localhost preview)
│   │   └── *.test.ts              # Vitest tests for the two modules above
│   ├── layouts/
│   │   └── BaseLayout.astro       # Main HTML layout (head, header, footer)
│   ├── pages/
│   │   └── index.astro            # Single page entry (renders HomePage)
│   └── styles/
│       └── global.css             # Tailwind imports + custom component classes
├── public/
│   ├── images/
│   │   └── placeholder-product.svg # Placeholder for missing product images
│   ├── products/
│   │   ├── products.json          # Product data (easy to edit!)
│   │   └── images/                # Product images
├── .github/workflows/
│   ├── deploy.yml                 # Test + build + deploy to GitHub Pages on push to main
│   └── ci.yml                     # Test + build on every pull request
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
- `setLang('ko'|'en')` in `HomePage.astro` script swaps all text at runtime
- For translations that contain HTML (e.g. inline links), add `data-i18n-html` to the element and use Astro's `set:html={...}` for static render; the runtime switcher uses `innerHTML` when `data-i18n-html` is present
- Product cards use `data-name-ko`/`data-name-en` for bilingual product names
- Korean is the fallback language if a translation key is missing

### Theme System
- Dark/light mode toggle in header (default: light/day mode)
- Uses Tailwind `dark:` variant with `class` strategy
- The preference is not persisted (reload returns to light)
- The sun/moon icon swaps via `dark:` classes, no JS
- `<html>` element gets `class="dark"` toggled

### Inquiry Form (email)
- `InquirySection.astro` renders the form; `src/lib/inquiry-form.ts` (`mountInquiryForm`) runs it in the browser; `src/lib/inquiry.ts` holds the pure logic (validation, email layout, sending)
- **Delivery:** GitHub Pages is static, so the form POSTs JSON to FormSubmit's AJAX endpoint `https://formsubmit.co/ajax/<recipient>`; FormSubmit emails **kynam@topvac.co.kr** (`DEFAULT_RECIPIENT`). No account or key is needed
- **Email layout (for the owner):** subject `[탑베큠 홈페이지] 견적·기술 문의 — <company> · <name>` (name only when no company); FormSubmit `_template: table` with Korean row labels in a fixed order: 회사명, 담당자/이름, 연락처, 이메일, 펌프 모델 · 필요 압력, 문의 내용, 접수 시각 (KST, `formatKst`), 문의 언어. Empty optional fields show `—`. `_replyto` is the customer's email so "Reply" goes straight to them
- **Fields:** 회사명 and 펌프 모델 · 필요 압력 (`model`) are optional; 담당자/이름, 연락처, 이메일, 문의 내용 are required. Phone allows digits, spaces, `+ ( ) - .` with 8–15 digits; max lengths in `MAX_LENGTH`
- **Activation:** the first submission to a new recipient makes FormSubmit send an "Activate Form" email; until it is clicked the API answers `success: "false"` with an activation message. FormSubmit keeps those submissions (30 days) and delivers them after activation, so `sendInquiry` returns `pending-activation` and the visitor sees "sent"
- **Failure:** network/HTTP errors keep the visitor's input and show a `mailto:` link pre-filled with the same subject and body (`mailtoHref`)
- **Localhost dry run:** on `localhost`/`127.0.0.1` nothing is sent unless `PUBLIC_INQUIRY_LIVE=true`; the form opens a preview dialog of the exact email instead. `PUBLIC_INQUIRY_TO` overrides the recipient (for testing with your own inbox)
- **Spam:** a hidden `_honey` field; if filled, the submit pretends success and sends nothing
- **i18n:** labels use `inquiry.*` keys; error/status messages are written with `data-i18n` so the KO/EN switch re-translates them in place. Email labels stay Korean regardless of page language
- **Tests:** `src/lib/inquiry.test.ts` (pure logic) and `src/lib/inquiry-form.test.ts` (renders `InquirySection.astro` with the Astro Container API in happy-dom and drives the form with a mocked `fetch`). Run `npm test`; CI runs it on every PR and before deploy

## Image Optimization

- **Prefer JPG over PNG** for product images — significantly smaller file sizes
- Keep product images as small as possible to improve page load speed and minimize repository size

## Key Files for Content Updates

| What to Update | File(s) |
|----------------|---------|
| **Products** | `public/products/products.json` + images in `public/products/images/` |
| UI text translations | `src/i18n/ui.ts` |
| Contact info | `src/i18n/ui.ts` (phone, email, address values) |
| Inquiry form recipient / email layout | `src/lib/inquiry.ts` (`DEFAULT_RECIPIENT`, `EMAIL_LABELS`, `SUBJECT_PREFIX`) |

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Start dev server (http://localhost:4321)
npm run build  # Build for production (outputs to ./dist)
npm run preview # Preview production build locally
npm test       # Run unit + component tests (Vitest)
```

## Styling Conventions

- Uses Tailwind CSS utility classes
- Colour tokens (`tailwind.config.mjs`): `ink` (text), `paper` (contact card, inquiry form panel), `line`, `accent` (petrol `#0B5D6B`: top strip, primary button, labels; `accent-light` on dark), `night-*` and `snow-*` (dark mode). There is no `primary-*` palette any more
- Custom components defined in `src/styles/global.css`: `.container-custom`, `.section`, `.label` (small uppercase petrol label), `.focus-ring`, `.btn-primary` / `.btn-secondary`, `.icon-btn`, `.nav-link`, `.lang-btn`, `.filter-btn`, `.field`, `.input` / `.field-error` / `.inquiry-status` / `.inquiry-preview` (inquiry form), and `.card-flip` / `.card-inner` / `.card-front` / `.card-back` (product card toggle)
- The wordmark is plain text ("TOP VACUUM" in Inter Tight 800) in `Header.astro` and `Footer.astro`; there is no logo image or favicon yet
- Classes used inside HTML strings in `ui.ts` (e.g. the Leybold links) are picked up because Tailwind scans `.ts` files
- Responsive breakpoint: `md:` for desktop nav and layout transitions

## Deployment

Automatic deployment via GitHub Actions on push to `main` branch. Requires GitHub Pages to be configured with "GitHub Actions" as the build source.
