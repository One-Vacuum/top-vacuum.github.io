import fs from 'node:fs';
import path from 'node:path';

export type Category = 'oil' | 'oil-filter' | 'vacuum-filter';

export interface Product {
  partNumber: string;
  image: string;
  nameKo: string;
  nameEn: string;
  descriptionKo?: string;
  descriptionEn?: string;
  category: Category;
  price: number;
  bestSeller?: boolean;
}

export function loadProducts(): Product[] {
  let raw: Product[] = [];
  try {
    const filePath = path.join(process.cwd(), 'public/products/products.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    raw = JSON.parse(fileContent);
  } catch {
    return [];
  }

  return raw;
}

export function formatPrice(price: number): string {
  return '₩' + price.toLocaleString('ko-KR');
}
