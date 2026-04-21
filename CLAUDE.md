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

## Tech Stack

- **Framework**: Astro 5.x (Static Site Generation)
- **Styling**: Tailwind CSS 3.4 with custom primary color palette (sky blue)
- **Fonts**: Pretendard (body, loaded from CDN) + Outfit (brand title, loaded from Google Fonts)
- **i18n**: Client-side toggle via `data-i18n` attributes (Korean default, single page)
- **Theme**: Dark/light mode toggle with Tailwind `dark:` classes (default: light)
- **Deployment**: GitHub Pages via GitHub Actions (auto-deploy on push to `main`)

## Project Structure

```
top-vacuum.github.io/
├── src/
│   ├── components/
│   │   ├── Header.astro           # Sticky header with nav, lang/theme toggles
│   │   ├── Footer.astro           # Dark footer with contact info & quick links
│   │   ├── Hero.astro             # Hero section with animated product tile background
│   │   ├── HomePage.astro         # Main page (products, contact) + client-side JS
│   │   ├── ProductCard.astro      # Product card with opacity-based front/back toggle
│   │   └── LanguageSwitcher.astro # KO/EN toggle (tap either side to switch)
│   ├── i18n/
│   │   └── ui.ts                  # All translation strings (KO/EN)
│   ├── lib/
│   │   └── products.ts            # Product loading utility (reads public/products/products.json)
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
├── .github/workflows/deploy.yml   # GitHub Pages deployment workflow
├── astro.config.mjs               # Astro configuration (site URL, Tailwind)
├── tailwind.config.mjs            # Tailwind theme (custom colors, fonts)
├── tsconfig.json                  # TypeScript config (path aliases @ → src/)
└── package.json                   # Dependencies and scripts
```

## Architecture Notes

### Page Rendering Flow
1. `index.astro` renders `HomePage.astro` directly (single page, no routing)
2. `HomePage.astro` contains all page content (products, contact) and client-side JS for language switching, category filtering, search, and sorting
3. `BaseLayout.astro` wraps everything with HTML shell, Header, and Footer
4. All translatable elements use `data-i18n` attributes; client-side `setLang()` swaps text from `src/i18n/ui.ts`
5. Product names/descriptions use `data-name-ko`/`data-name-en` and `data-desc-ko`/`data-desc-en` attributes

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
- Tapping either KO or EN button toggles to the other language
- All translatable elements have `data-i18n="key"` attributes
- `setLang('ko'|'en')` in `HomePage.astro` script swaps all text at runtime
- Product cards use `data-name-ko`/`data-name-en` for bilingual product names
- Korean is the fallback language if a translation key is missing

### Theme System
- Dark/light mode toggle in header (default: light/day mode)
- Uses Tailwind `dark:` variant with `class` strategy
- Theme preference persisted in `localStorage`
- `<html>` element gets `class="dark"` toggled

## Image Optimization

- **Prefer JPG over PNG** for product images — significantly smaller file sizes
- Keep product images as small as possible to improve page load speed and minimize repository size

## Key Files for Content Updates

| What to Update | File(s) |
|----------------|---------|
| **Products** | `public/products/products.json` + images in `public/products/images/` |
| UI text translations | `src/i18n/ui.ts` |
| Contact info | `src/i18n/ui.ts` (phone, email, address values) |

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Start dev server (http://localhost:4321)
npm run build  # Build for production (outputs to ./dist)
npm run preview # Preview production build locally
```

## Styling Conventions

- Uses Tailwind CSS utility classes
- Custom components defined in `src/styles/global.css`:
  - `.container-custom` — Max-width container with padding
  - `.section` — Standard section padding
  - `.btn-primary` / `.btn-secondary` — Button styles
  - `.card-flip` / `.card-inner` / `.card-front` / `.card-back` — Product card toggle styles
- Brand title uses Outfit font (`font-family: 'Outfit'`)
- Primary color: `primary-600` (#0284c7, sky blue)
- Responsive breakpoint: `md:` for desktop nav and layout transitions

## Deployment

Automatic deployment via GitHub Actions on push to `main` branch. Requires GitHub Pages to be configured with "GitHub Actions" as the build source.
