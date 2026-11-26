import { CONTACT } from '../lib/contact';

export const ui = {
  ko: {
    // Site
    'site.title': 'Top Vacuum Inc. | 탑베큠 주식회사',
    'site.description': '<a href="https://www.leybold.com/ko-kr" target="_blank" rel="noopener" class="font-semibold text-ink dark:text-snow underline underline-offset-2">Leybold(라이볼트)</a> 한국 공식 대리점 | 진공펌프 및 부품 전문',

    // Top strip
    'strip.label': 'Leybold(라이볼트) 한국 공식 대리점',

    // Navigation
    'nav.home': '홈',
    'nav.products': '제품',
    'nav.contact': '연락처',
    'nav.leybold': '라이볼트',

    // Hero — headline and eyebrow reuse existing copy (site.description, company names)
    'hero.eyebrow': 'Top Vacuum Inc. · 탑베큠 주식회사',
    'hero.headline': 'Leybold(라이볼트)<br>한국 공식 대리점',
    'hero.description': '<a href="https://www.leybold.com/ko-kr" target="_blank" rel="noopener" class="font-semibold text-accent dark:text-accent-light underline underline-offset-2">Leybold(라이볼트)</a> 한국 공식 대리점으로서 진공펌프 및 부품을 전문으로 취급합니다. 다양한 산업 분야에 최적화된 진공 솔루션을 제공합니다.',

    // Products
    'products.title': '제품 소개',
    'products.subtitle': '다양한 진공펌프 및 부품을 만나보세요',
    'products.comingSoon': '제품 준비 중입니다...',
    'products.filterAll': '전체',
    'products.filterOil': '오일',
    'products.filterOilFilter': '오일 필터',
    'products.filterVacuumFilter': '진공 필터',
    'products.bestSeller': 'BEST',
    'products.showMore': '더 보기',
    'products.searchPlaceholder': '제품 검색...',
    'products.sortDefault': '기본 정렬 (베스트)',
    'products.sortPriceAsc': '가격 낮은순',
    'products.sortPriceDesc': '가격 높은순',
    'products.detailComingSoon': '상세정보 준비중입니다',
    'products.tapToFlip': '상세정보 보기',

    // Contact
    'contact.title': '연락처',
    'contact.phone': '전화',
    'contact.email': '이메일',
    'contact.emailValue': CONTACT.email,
    'contact.address': '주소',
    'contact.addressValue': '충청남도 아산시 음봉면 월암로 265-6',
    'contact.phoneValue': CONTACT.phone,
    'contact.mobile': '휴대폰',
    'contact.mobileValue': CONTACT.mobile,


    // Accessible names (read by screen readers, switched with the language)
    'a11y.language': '언어',
    'a11y.darkMode': '다크 모드',
    'a11y.menu': '메뉴',
    'a11y.mainNav': '주 메뉴',
    'a11y.mobileNav': '모바일 메뉴',
    'a11y.footerNav': '하단 메뉴',
    'a11y.clearSearch': '검색어 지우기',
    'products.sortLabel': '정렬',

    // Footer
    'footer.company': '상호: 탑베큠 주식회사',
    'footer.owner': '대표: 남경연',
    'footer.bizNo': '사업자등록번호: 790-88-03637',
    'footer.copyright': '© 2026 Top Vacuum Inc. All rights reserved.',
  },
  en: {
    // Site
    'site.title': 'Top Vacuum Inc.',
    'site.description': 'Authorized <a href="https://www.leybold.com/en" target="_blank" rel="noopener" class="font-semibold text-ink dark:text-snow underline underline-offset-2">Leybold</a> Dealer in Korea | Vacuum Pumps & Parts',

    // Top strip
    'strip.label': 'Authorized Leybold Dealer in Korea',

    // Navigation
    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.contact': 'Contact',
    'nav.leybold': 'Leybold',

    // Hero
    'hero.eyebrow': 'Top Vacuum Inc.',
    'hero.headline': 'Authorized Leybold<br>Dealer in Korea',
    'hero.description': 'As an authorized <a href="https://www.leybold.com/en" target="_blank" rel="noopener" class="font-semibold text-accent dark:text-accent-light underline underline-offset-2">Leybold</a> dealer in Korea, we specialize in vacuum pumps and parts. We offer optimized vacuum solutions for various industries.',

    // Products
    'products.title': 'Our Products',
    'products.subtitle': 'Explore our range of vacuum pumps and parts',
    'products.comingSoon': 'Products Coming Soon...',
    'products.filterAll': 'All',
    'products.filterOil': 'Oil',
    'products.filterOilFilter': 'Oil Filter',
    'products.filterVacuumFilter': 'Vacuum Filter',
    'products.bestSeller': 'BEST',
    'products.showMore': 'Show More',
    'products.searchPlaceholder': 'Search products...',
    'products.sortDefault': 'Default (Best Sellers)',
    'products.sortPriceAsc': 'Price: Low to High',
    'products.sortPriceDesc': 'Price: High to Low',
    'products.detailComingSoon': 'Details Coming Soon',
    'products.tapToFlip': 'View Details',

    // Contact
    'contact.title': 'Contact Us',
    'contact.phone': 'Phone',
    'contact.email': 'Email',
    'contact.emailValue': CONTACT.email,
    'contact.address': 'Address',
    'contact.addressValue': '265-6 Woram-ro, Eumbong-myeon, Asan-si, Chungcheongnam-do',
    'contact.phoneValue': CONTACT.phone,
    'contact.mobile': 'Mobile',
    'contact.mobileValue': CONTACT.mobile,


    // Accessible names
    'a11y.language': 'Language',
    'a11y.darkMode': 'Dark mode',
    'a11y.menu': 'Menu',
    'a11y.mainNav': 'Main menu',
    'a11y.mobileNav': 'Mobile menu',
    'a11y.footerNav': 'Footer menu',
    'a11y.clearSearch': 'Clear search',
    'products.sortLabel': 'Sort',

    // Footer
    'footer.company': 'Company: Top Vacuum Inc.',
    'footer.owner': 'Owner: KyungYeon Nam',
    'footer.bizNo': 'Business Reg. No: 790-88-03637',
    'footer.copyright': '© 2026 Top Vacuum Inc. All rights reserved.',
  },
} as const;
