/**
 * Top Vacuum's settings for the inquiry form: fields, email subject, recipient
 * and the hosts that really send. The logic in ./inquiry.ts is shared with
 * one-vacuum.github.io; only this file differs between the two sites.
 */
import { CONTACT } from './contact';
import type { InquiryFieldDef } from './inquiry';

/** The form's fields, in display order (also the row order of the email). */
export const INQUIRY_FIELDS = [
  { name: 'company', required: false, maxLength: 100, emailLabel: '회사명', labelKey: 'inquiry.company', control: 'input', type: 'text', autocomplete: 'organization' },
  { name: 'name', required: true, maxLength: 50, emailLabel: '담당자/이름', labelKey: 'inquiry.name', control: 'input', type: 'text', autocomplete: 'name' },
  { name: 'phone', required: true, maxLength: 40, emailLabel: '연락처', labelKey: 'inquiry.phone', control: 'input', type: 'tel', autocomplete: 'tel' },
  { name: 'email', required: true, maxLength: 254, emailLabel: '이메일', labelKey: 'inquiry.email', control: 'input', type: 'email', autocomplete: 'email' },
  { name: 'model', required: false, maxLength: 200, emailLabel: '펌프 모델 · 필요 압력', labelKey: 'inquiry.model', control: 'input', type: 'text', placeholderKey: 'inquiry.modelPlaceholder', wide: true },
  { name: 'message', required: true, maxLength: 5000, emailLabel: '문의 내용', labelKey: 'inquiry.message', control: 'textarea', wide: true },
] as const satisfies readonly InquiryFieldDef[];

export const SUBJECT_PREFIX = '[탑베큠 홈페이지] 견적·기술 문의';

/** Owner's inbox (the public contact email in ui.ts). */
export const DEFAULT_RECIPIENT: string = CONTACT.email;

/** Hostnames where the form really sends. Anywhere else it only previews. */
export const PRODUCTION_HOSTS: readonly string[] = ['topvac.co.kr', 'www.topvac.co.kr'];
