# Top Vacuum Solution (탑베큠솔루션)

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
- 언어 전환 버튼 동작 (KO/EN 어느 쪽이든 터치하면 토글)
- 모든 제품 이미지 표시
- 제품 카드 클릭 시 상세정보 전환 동작
- 제품 검색 및 정렬 동작
- 모바일 반응형 레이아웃 동작
- `npm run build` 오류 없이 완료

## 이미지 추가

> **이미지 크기 최적화**: 제품 이미지는 가능한 작은 파일 크기를 사용해주세요. JPG 형식 권장 (PNG 대비 파일 크기가 작음). 큰 이미지는 페이지 로딩 속도와 GitHub 저장소 용량에 영향을 줍니다.

### 회사 로고

로고 파일 위치:
```
public/images/logo.png
```
- 지원 형식: PNG, JPG, SVG

### 파비콘

파비콘 파일 위치:
```
public/images/favicon/
├── favicon.ico
├── favicon-16x16.png
├── favicon-32x32.png
├── apple-touch-icon.png
├── android-chrome-192x192.png
└── android-chrome-512x512.png
```

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

## 배포

`main` 브랜치에 푸시하면 GitHub Pages로 자동 배포됩니다.

### GitHub Pages 최초 설정

1. 저장소 **Settings** > **Pages** 이동
2. "Build and deployment"에서 **GitHub Actions** 선택
3. `main` 브랜치에 푸시하여 배포 시작
4. 사이트 주소: https://topvac.co.kr
