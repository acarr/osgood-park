// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// Pages are prerendered (static) by default; the API routes under src/pages/api
// opt out via `export const prerender = false` and run as Vercel functions.
export default defineConfig({
  integrations: [react()],
  adapter: vercel(),

  vite: {
    plugins: [tailwindcss()]
  }
});