/**
 * Company contact details, read from `ui.ko` so `src/i18n/ui.ts` stays the
 * single place to change them.
 */
import { ui } from '../i18n/ui';

export const CONTACT = {
  phone: ui.ko['contact.phoneValue'],
  mobile: ui.ko['contact.mobileValue'],
  email: ui.ko['contact.emailValue'],
} as const;

/** `tel:` link with everything but digits and `+` stripped. */
export const telHref = (number: string) => 'tel:' + number.replace(/[^0-9+]/g, '');

export const mailHref = (email: string) => 'mailto:' + email;
