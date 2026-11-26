/// <reference types="vitest/config" />
// Shared: identical in top-vacuum.github.io and one-vacuum.github.io (change both;
// scripts/check-shared.sh compares them).
// Astro's Vite config (aliases, import.meta.env, .astro support) for Vitest,
// so tests can render real components with the Container API.
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
