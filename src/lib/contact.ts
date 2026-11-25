/** Company contact details: the single source for ui.ts text and tel:/mailto: links. */
export const CONTACT = {
  phone: '041-544-8058',
  mobile: '010-4455-1309',
  email: 'kynam@topvac.co.kr',
} as const;

/** `tel:` link with everything but digits and `+` stripped. */
export const telHref = (number: string) => 'tel:' + number.replace(/[^0-9+]/g, '');

export const mailHref = (email: string) => 'mailto:' + email;
