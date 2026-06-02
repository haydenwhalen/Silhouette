// Tailwind v4 — postcss-only setup. No tailwind.config.ts needed.
// The Silhouette design tokens live CSS-first in src/app/globals.css
// via the @theme directive; Tailwind v4 generates utilities from
// them automatically (e.g. --color-sil-bg → bg-sil-bg).
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
