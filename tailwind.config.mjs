/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  // Only apply `hover:` styles on devices that actually support hover, so hover
  // states don't stick after a tap on touch screens.
  future: { hoverOnlyWhenSupported: true },
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      // "Engineering partner" palette: deep ink, cool paper surfaces and a
      // single petrol accent.
      colors: {
        ink: {
          DEFAULT: '#0B1416', // text, wordmark
          soft: '#3E4A4F', // secondary text (9.5:1 on white)
          mute: '#5E6B70', // tertiary text (5.1:1 on paper)
        },
        paper: '#F4F6F7', // contact card, product image wells
        line: {
          DEFAULT: '#D8DFE1', // dividers
          strong: '#7F8D92', // form control borders (3:1 on white and paper)
        },
        danger: {
          DEFAULT: '#B42318', // error text and borders
          light: '#FDA29B', // the same on dark backgrounds
        },
        accent: {
          DEFAULT: '#0B5D6B', // petrol: top strip, primary button, labels (7.5:1 with white)
          deep: '#084651', // hover on accent
          light: '#5FB3C0', // accent on dark backgrounds
        },
        night: {
          DEFAULT: '#0A1012', // dark-mode page
          raised: '#111A1D',
          high: '#18242A',
          line: '#23323A',
          strong: '#5A6D75', // form control borders in dark mode
        },
        snow: {
          DEFAULT: '#ECF1F2', // dark-mode text
          soft: '#B3C0C4',
          mute: '#8D9CA1',
        },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'sans-serif'],
        // Wordmark, small uppercase labels and phone numbers.
        display: ['"Inter Tight"', 'Pretendard', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
