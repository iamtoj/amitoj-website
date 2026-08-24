import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.amitoj.co',
  trailingSlash: 'never',
  integrations: [
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        return !['/404', '/contact', '/contact/thanks'].includes(pathname)
          && !/\.(?:xml|txt)$/i.test(pathname);
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
