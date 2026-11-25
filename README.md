# Top Vacuum Inc. (탑베큠 주식회사)

Astro + Tailwind CSS로 제작된 회사 브로슈어 웹사이트입니다.

For English: [README.en.md](README.en.md)

---

## 로컬 개발

### 사전 요구사항

- Node.js 18+ 설치
- npm 또는 yarn

### 로컬 실행 방법

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **개발 서버 시작**
   ```bash
   npm run dev
   ```

3. **브라우저에서 열기**
   - http://localhost:4321
   - 단일 페이지이며, 우측 상단 KO/EN 토글로 언어 전환

4. **프로덕션 빌드 테스트** (병합 전 권장)
   ```bash
   npm run build
   npm run preview
   ```

### 병합 전 체크리스트

- `npm run dev` 오류 없이 실행
- 페이지 정상 로드 (http://localhost:4321)
- 언어 전환 버튼 동작 (KO는 한국어, EN은 영어)
- 모든 제품 이미지 표시
- 제품 카드 클릭 시 상세정보 전환 동작
- 제품 검색 및 정렬 동작
- 모바일 반응형 레이아웃 동작
- `npm run build` 오류 없이 완료
- `npm test` 통과 (문의 양식 검증·메일 형식·전송 로직 테스트)
- `npm run check` 통과 (타입 검사, Node 22 필요)
- 문의 양식·언어 전환 공통 파일을 고쳤다면 `scripts/check-shared.sh ../one-vacuum.github.io` 통과 (두 사이트가 같은 파일을 씀)
- 문의 양식: 빈칸으로 제출하면 오류 표시, localhost에서 제출하면 메일 미리보기만 뜨고 실제로는 발송되지 않음

## 이미지 추가

> **이미지 크기 최적화**: 제품 이미지는 가능한 작은 파일 크기를 사용해주세요. JPG 형식 권장 (PNG 대비 파일 크기가 작음). 큰 이미지는 페이지 로딩 속도와 GitHub 저장소 용량에 영향을 줍니다.

### 회사 로고 · 파비콘

현재 로고 이미지와 파비콘은 없습니다. 헤더/푸터의 "TOP VACUUM"은 텍스트 워드마크(Inter Tight)로 `src/components/Header.astro`, `src/components/Footer.astro`에 있습니다. 로고나 파비콘을 추가하려면 `public/images/`에 파일을 넣고 `src/layouts/BaseLayout.astro`의 `<head>`에 링크를 추가하세요.

## 제품 관리

모든 제품 파일은 `public/products/` 폴더에 있습니다.

```
public/products/
├── products.json      ← 제품 데이터 (품번, 이름, 카테고리, 가격)
└── images/            ← 제품 이미지
    ├── product-1.png
    ├── product-2.png
    └── ...
```

### 새 제품 추가:

1. **제품 이미지**를 `public/products/images/` 폴더에 추가

2. **`public/products/products.json`** 파일에 새 항목 추가:
   ```json
   {
     "partNumber": "ABC123",
     "image": "이미지파일.jpg",
     "nameKo": "제품 이름",
     "nameEn": "Product Name",
     "descriptionKo": "제품 설명 (선택)",
     "descriptionEn": "Product description (optional)",
     "category": "oil",
     "price": 50000,
     "bestSeller": false
   }
   ```
   - `partNumber`: 제품 품번 (필수)
   - `category`: `oil` (오일), `oil-filter` (오일 필터), `vacuum-filter` (진공 필터) 중 택 1
   - `price`: 원화 정수 (예: 50000 → ₩50,000으로 표시)
   - `bestSeller`: `true`로 설정하면 BEST 배지 표시 및 기본 정렬에서 상단 노출

3. **커밋 및 푸시** - 웹사이트가 자동으로 업데이트됩니다!

### 제품 삭제:

1. `public/products/images/`에서 이미지 삭제
2. `products.json`에서 해당 항목 삭제

### 제품이 없는 경우:

`products.json`을 빈 배열 `[]`로 설정하면 "제품 준비 중입니다..." 메시지가 표시됩니다.

### 제품 소개 섹션 전체 숨기기:

아직 판매할 제품이 없어 "제품 소개" 섹션 자체를 숨기고 싶다면 `src/lib/features.ts`의 플래그를 사용합니다.

```ts
export const SHOW_PRODUCTS = false; // false = 제품 섹션 및 관련 네비게이션 링크 숨김
```

- `false`: 제품 섹션과 헤더/푸터/히어로의 제품 관련 링크가 모두 숨겨집니다 (코드는 그대로 유지).
- `true`: 제품을 추가한 뒤 이 값을 `true`로 변경하면 섹션이 다시 표시됩니다.

## 문의 양식 (이메일 전송)

"견적 · 기술 문의" 양식을 제출하면 [FormSubmit](https://formsubmit.co)을 통해 **kynam@topvac.co.kr** 로 메일이 갑니다. GitHub Pages는 서버가 없는 정적 사이트라, 계정 없이 쓰는 폼→이메일 전달 서비스를 사용합니다.

- **메일 형식:** 제목은 `[탑베큠 홈페이지] 견적·기술 문의 — 회사명 · 이름`, 본문은 표(회사명, 담당자/이름, 연락처, 이메일, 펌프 모델 · 필요 압력, 문의 내용, 접수 시각, 문의 언어)입니다. 받은 메일에서 "답장"을 누르면 고객 이메일로 바로 답장됩니다.
- **최초 1회 인증 (필수):** 배포 후 첫 문의가 들어오면 FormSubmit이 kynam@topvac.co.kr로 "Activate Form" 메일을 보냅니다. 메일의 버튼을 한 번 눌러야 이후 문의가 전달됩니다. 인증 전에 들어온 문의는 FormSubmit이 30일간 보관했다가 인증 후 전달하며, 그동안 방문자에게는 "접수되었습니다" 안내와 이메일 링크가 표시됩니다.
- **실패 시:** 네트워크 오류·응답 없음(15초)·FormSubmit 거부 시 입력 내용은 그대로 남고, 같은 내용이 채워진 이메일 링크가 표시됩니다.
- **테스트:** 실제 발송은 운영 도메인(topvac.co.kr)에서만 됩니다. localhost, 같은 와이파이의 휴대폰(IP 주소), `npm run preview` 등에서는 보내지 않고 "사장님이 받게 될 메일" 미리보기만 띄웁니다. 본인 메일로 실제 발송을 시험하려면 아래처럼 실행합니다 (두 값 모두 필요하고, `npm run dev`에서만 동작합니다).
  ```bash
  PUBLIC_INQUIRY_LIVE=true PUBLIC_INQUIRY_TO=본인@이메일주소 npm run dev
  ```
- **스팸 방지:** 화면에 보이지 않는 함정 필드(honeypot)가 채워진 제출은 보내지 않습니다. 다만 전송 주소가 공개되어 있어 봇이 직접 보내는 스팸까지 막지는 못합니다. 봇의 직접 전송까지 막으려면 별도 서버(예: Cloudflare Worker + Turnstile)를 앞에 두어야 합니다. FormSubmit 인증 후 받는 무작위 별칭 주소는 이메일 주소를 노리는 수집 봇만 피할 수 있습니다.
- **출시 전 확인:** ① 배포 직후 운영 사이트에서 직접 한 번 문의해 인증을 끝내 두기 ② 개인정보(이름·연락처·이메일) 수집·이용 안내 문구가 필요한지 사장님과 확인하기 (현재 양식에는 없음)
- **관련 파일:** `src/components/InquirySection.astro`(화면), `src/lib/inquiry-config.ts`(필드·제목·수신자·운영 도메인), `src/lib/inquiry.ts`(검증·메일 형식·전송), `src/lib/inquiry-form.ts`(브라우저 동작), 문구는 `src/i18n/ui.ts`의 `inquiry.*`

## 배포

`main` 브랜치에 푸시하면 테스트(`npm test`)와 빌드 후 GitHub Pages로 자동 배포됩니다. PR을 열면 같은 테스트와 빌드가 CI(`.github/workflows/ci.yml`)로 실행됩니다.

### GitHub Pages 최초 설정

1. 저장소 **Settings** > **Pages** 이동
2. "Build and deployment"에서 **GitHub Actions** 선택
3. `main` 브랜치에 푸시하여 배포 시작
4. 사이트 주소: https://topvac.co.kr
