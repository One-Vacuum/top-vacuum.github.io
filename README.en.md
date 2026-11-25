# Top Vacuum Inc.

Company brochure website built with Astro + Tailwind CSS.

한국어: [README.md](README.md)

---

## Local Development

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Steps to Run Locally

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   - http://localhost:4321
   - Single page with client-side KO/EN language toggle in the header

4. **Test production build** (recommended before merging)
   ```bash
   npm run build
   npm run preview
   ```

### Verify Before Merge Checklist

- `npm run dev` starts without errors
- Page loads correctly (http://localhost:4321)
- Language switch works (KO = Korean, EN = English)
- All product images display
- Product card detail toggle works on click
- Product search and sorting works
- Mobile responsive layout works
- `npm run build` completes without errors
- `npm test` passes (inquiry form validation, email format and sending)
- `npm run check` passes (type check, needs Node 22)
- If you changed the shared inquiry/i18n files, `scripts/check-shared.sh ../one-vacuum.github.io` passes (both sites use the same files)
- Inquiry form: an empty submit shows errors; on localhost a submit shows the email preview and sends nothing

## Adding Images

> **Image size optimization**: Use small file sizes for product images whenever possible. JPG format is recommended over PNG for smaller file sizes. Large images affect page load speed and GitHub repository size.

### Company Logo & Favicon

There is no logo image or favicon yet. The "TOP VACUUM" in the header and footer is a text wordmark (Inter Tight) in `src/components/Header.astro` and `src/components/Footer.astro`. To add a logo or favicon, put the files in `public/images/` and link them from `<head>` in `src/layouts/BaseLayout.astro`.

## Managing Products

Everything is in one folder: `public/products/`

```
public/products/
├── products.json      ← Product data (part number, names, category, price)
└── images/            ← Product images
    ├── product-1.png
    ├── product-2.png
    └── ...
```

### To Add a New Product:

1. **Add your product image** to `public/products/images/`

2. **Edit `public/products/products.json`** - add a new entry:
   ```json
   {
     "partNumber": "ABC123",
     "image": "your-image.jpg",
     "nameKo": "제품 이름",
     "nameEn": "Product Name",
     "descriptionKo": "제품 설명 (optional)",
     "descriptionEn": "Product description (optional)",
     "category": "oil",
     "price": 50000,
     "bestSeller": false
   }
   ```
   - `partNumber`: product part number (required)
   - `category`: `oil`, `oil-filter`, or `vacuum-filter`
   - `price`: integer in KRW (e.g. 50000 → displayed as ₩50,000)
   - `bestSeller`: set to `true` to show BEST badge and prioritize in default sort

3. **Commit and push** - website updates automatically!

### To Remove a Product:

1. Delete the image from `public/products/images/`
2. Remove the entry from `products.json`

### If No Products:

Set `products.json` to `[]` and the website will show "Products Coming Soon..."

### Hiding the Entire Products Section:

If there are no products to sell yet and you want to hide the whole "Products" section, use the flag in `src/lib/features.ts`.

```ts
export const SHOW_PRODUCTS = false; // false = hides the products section and related nav links
```

- `false`: hides the products section and all product-related links in the header, footer, and hero (the code stays intact).
- `true`: after adding products, flip this to `true` to bring the section back.

## Inquiry Form (Email)

Submitting the "Quote & Technical Inquiry" form emails **kynam@topvac.co.kr** through [FormSubmit](https://formsubmit.co). GitHub Pages is static (no server), so the site uses this no-account form-to-email relay.

- **Email format:** subject `[탑베큠 홈페이지] 견적·기술 문의 — company · name`; the body is a table (회사명, 담당자/이름, 연락처, 이메일, 펌프 모델 · 필요 압력, 문의 내용, 접수 시각, 문의 언어 — Korean labels for the owner). Hitting "Reply" answers the customer directly.
- **One-time activation (required):** after deploy, the first submission makes FormSubmit send an "Activate Form" email to kynam@topvac.co.kr. Click its button once; later submissions are then delivered. Submissions made before activation are kept for 30 days and delivered after it; meanwhile visitors see a "received" message with an email link.
- **On failure:** network errors, no answer within 15 s, or a FormSubmit refusal keep the visitor's input and show an email link pre-filled with the same content.
- **Testing:** real sends happen only on the production domain (topvac.co.kr). On localhost, a phone on the same Wi-Fi (IP address), `npm run preview` and other hosts nothing is sent; a preview of the email the owner would receive is shown instead. To test a real send to your own inbox, run the command below (both values are required; it works under `npm run dev` only).
  ```bash
  PUBLIC_INQUIRY_LIVE=true PUBLIC_INQUIRY_TO=you@example.com npm run dev
  ```
- **Spam:** submissions that fill the hidden honeypot field are dropped. The endpoint is public, though, so bots posting to it directly are not stopped. Only a small server in front (e.g. a Cloudflare Worker with Turnstile) stops direct posts; the random alias FormSubmit gives after activation only avoids scanners that harvest the email address.
- **Before launch:** ① right after deploy, submit once from the live site to complete activation ② check with the owner whether a personal-data collection notice (name, phone, email) is needed — the form has none today
- **Files:** `src/components/InquirySection.astro` (markup), `src/lib/inquiry-config.ts` (fields, subject, recipient, production domain), `src/lib/inquiry.ts` (validation, email format, sending), `src/lib/inquiry-form.ts` (browser behaviour); text lives under `inquiry.*` in `src/i18n/ui.ts`

## Deployment

Pushing to `main` runs the tests (`npm test`) and the build, then deploys to GitHub Pages. Opening a PR runs the same tests and build in CI (`.github/workflows/ci.yml`).

### First-time GitHub Pages Setup

1. Go to repository **Settings** > **Pages**
2. Under "Build and deployment", select **GitHub Actions**
3. Push to `main` branch to trigger deployment
4. Site will be live at: https://topvac.co.kr
