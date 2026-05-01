import { defineConfig } from 'astro/config';

// GitHub Pages serves project sites at <user>.github.io/<repo>/
// Override SITE / BASE in your fork via environment variables if needed.
const site = process.env.SITE ?? 'https://example.github.io';
const base = process.env.BASE ?? '/mystermap';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  output: 'static',
  build: {
    assets: 'assets',
  },
  image: {
    responsiveStyles: true,
  },
});
