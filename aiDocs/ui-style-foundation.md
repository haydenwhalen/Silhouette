# Silhouette UI Style Foundation

> Tailwind v4 + Silhouette design tokens — the foundation for the upcoming
> insight-card redesign. **No UI redesign yet.** Existing inline-styled
> components still render unchanged; this doc describes what to use when
> writing the new components.

## Stack at a glance

| Piece | What | Where |
|---|---|---|
| Tailwind | v4.3+ via `@tailwindcss/postcss` | `package.json`, `postcss.config.mjs` |
| Global CSS | `@import "tailwindcss"` + `@theme` tokens + base layer | `src/app/globals.css` |
| Tokens | CSS-first via `@theme`; auto-generates utilities | `src/app/globals.css` |
| Fonts | Inter (UI) + Source Serif 4 (excerpt) via `next/font/google` | `src/app/layout.tsx` |
| Config file? | **None.** Tailwind v4 doesn't need `tailwind.config.ts` — tokens are CSS-first. |

## How v4 turns tokens into utilities

Anything declared in the `@theme` block becomes a utility class automatically. Naming follows v4 conventions:

| CSS variable | Generated utilities |
|---|---|
| `--color-sil-bg`        | `bg-sil-bg`, `text-sil-bg`, `border-sil-bg`, `ring-sil-bg`, etc. |
| `--color-sil-accent`    | `bg-sil-accent`, `text-sil-accent`, `border-sil-accent`, ... |
| `--font-sans`           | `font-sans` |
| `--font-serif`          | `font-serif` |
| `--radius-sil-card`     | `rounded-sil-card` |

If you want to use a token from non-Tailwind context (e.g. a one-off inline `style`), reach for the raw CSS variable: `style={{ background: 'var(--color-sil-bg)' }}`.

## Design tokens

All defined in `src/app/globals.css` under `@theme`. The visual direction is **calm, warm-dark, source-forward** — off-black background, near-white text, one warm-amber accent used sparingly.

### Colors

| Token | Value | When to use |
|---|---|---|
| `sil-bg` | `#0f0f0f` | Page background. Default `<body>` (eventually). |
| `sil-surface` | `#151515` | Cards that sit flush on the page (no elevation). |
| `sil-elevated` | `#1c1a18` | The insight card — the centerpiece surface. Slightly warm-toned. |
| `sil-text` | `#f3eee8` | Primary text. Slightly warm off-white. |
| `sil-muted` | `#b8afa6` | Attribution, captions, why-this-applies sentence. |
| `sil-subtle` | `#81786f` | Placeholder text, helper text, deemphasized labels. |
| `sil-border` | `rgba(255,255,255,0.10)` | Default hairline borders. |
| `sil-border-strong` | `rgba(255,255,255,0.18)` | Card outlines that need a touch more presence. |
| `sil-accent` | `#c97a4a` | THE accent. Open-quote glyph, focus moments, "submit" verb. **Never** as a large flat fill. |
| `sil-accent-soft` | `rgba(201,122,74,0.14)` | Subtle highlight backgrounds (selection, button hover, soft callout). |
| `sil-accent-strong` | `#d68a5c` | Hover/pressed accent state. |
| `sil-focus` | `rgba(201,122,74,0.45)` | Focus ring (already wired globally on `:focus-visible`). |
| `sil-danger` | `#e85b5b` | The 988 / safety callout only. |
| `sil-danger-soft` | `rgba(232,91,91,0.12)` | Background tint behind the safety block. |

### Fonts

| Token | Family | When to use |
|---|---|---|
| `font-sans` (Inter) | `var(--font-inter)` | Default for **everything** that isn't an excerpt. |
| `font-serif` (Source Serif 4) | `var(--font-source-serif)` | The insight excerpt **only**. The visual signal that this is a real human quote, not chatbot text. |

Fonts are loaded once via `next/font/google` in `src/app/layout.tsx` — no `<link>` tags, no runtime font request, FOUT-free.

### Radii

| Token | Value | When to use |
|---|---|---|
| `rounded-sil-card` | `0.875rem` (14px) | The insight card + the media card placeholder. |
| `rounded-sil-button` | `0.5rem` (8px) | Submit + feedback pills. |
| `rounded-sil-input` | `0.625rem` (10px) | The "What feels stuck?" textarea. |

## Component class patterns (use when writing v0 output back into the app)

These are conventions for the redesign — none are implemented yet.

### Page shell
```tsx
<main className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:py-12">
  ...
</main>
```

### Insight card (the centerpiece)
```tsx
<article className="rounded-sil-card bg-sil-elevated p-6 sm:p-8 space-y-6">
  ...
</article>
```

### Excerpt (the quote)
```tsx
<blockquote className="font-serif text-lg sm:text-xl leading-relaxed text-sil-text">
  <span className="text-sil-accent select-none" aria-hidden="true">"</span>
  {excerpt}
</blockquote>
```

### Attribution line
```tsx
<p className="text-xs uppercase tracking-wider text-sil-muted">
  {speaker} <span className="text-sil-subtle">·</span> {show} <span className="text-sil-subtle">·</span> {year}
</p>
```

### Bridge sentence
```tsx
<p className="text-sm italic text-sil-muted">{bridge}</p>
```

### Why-this-applies
```tsx
<p className="text-sm text-sil-muted leading-relaxed">{why}</p>
```

### Muted source link
```tsx
<a
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  className="text-sm text-sil-accent hover:text-sil-accent-strong underline-offset-4 hover:underline"
>
  {label} →
</a>
```

### Warm accent submit button
```tsx
<button
  type="submit"
  className="rounded-sil-button bg-sil-accent px-4 py-2.5 text-sm font-medium text-sil-bg
             hover:bg-sil-accent-strong disabled:opacity-50 disabled:cursor-not-allowed
             transition-colors"
>
  Find a moment
</button>
```

### Feedback pill buttons (low-pressure, in-card)
```tsx
<button
  type="button"
  className="rounded-sil-button border border-sil-border bg-sil-surface px-3 py-1.5
             text-xs text-sil-muted
             hover:bg-sil-accent-soft hover:text-sil-text hover:border-sil-border-strong
             transition-colors"
>
  This landed
</button>
```

### Textarea (the "What feels stuck?" input)
```tsx
<textarea
  className="w-full rounded-sil-input bg-sil-surface border border-sil-border
             px-4 py-3 text-base text-sil-text placeholder:text-sil-subtle
             resize-none focus:border-sil-border-strong"
  rows={3}
  placeholder="A few sentences is enough — you don't have to make it perfect."
/>
```

## Adapting v0 output

v0 will likely emit Tailwind classes with stock color names (`bg-zinc-900`, `text-amber-500`, etc.). When integrating:

1. **Don't** import the v0 output verbatim. Map stock colors to Silhouette tokens during integration.
2. **Color mapping** to apply during the v0 → repo step:
   - Page bg / `bg-zinc-950` / `bg-black` → `bg-sil-bg`
   - Card bg / `bg-zinc-900` / `bg-stone-900` → `bg-sil-elevated`
   - Primary text / `text-white` / `text-zinc-100` → `text-sil-text`
   - Muted text / `text-zinc-400` / `text-stone-400` → `text-sil-muted`
   - Placeholder / `text-zinc-500` → `text-sil-subtle`
   - Accent / `text-amber-500` / `bg-amber-500` → `text-sil-accent` / `bg-sil-accent`
   - Borders / `border-zinc-800` / `border-white/10` → `border-sil-border`
3. **Font mapping**: apply `font-serif` only on the excerpt block. Everything else defaults to `font-sans` (already set on `<html>` in `globals.css`).
4. **Radii**: replace `rounded-xl` on the insight card with `rounded-sil-card`, `rounded-md` on buttons with `rounded-sil-button`.
5. **Don't** import any UI library that v0 may have added (shadcn/ui, Radix, lucide-react) unless you've explicitly decided to adopt it. For the first redesign pass, plain Tailwind is enough.

## What NOT to do

- **Don't add `tailwind.config.ts`.** v4 doesn't need it. All config goes in `@theme` in `globals.css`. Adding a config file alongside the CSS-first config creates two sources of truth.
- **Don't add `autoprefixer` or any other postcss plugin.** v4's `@tailwindcss/postcss` handles everything.
- **Don't `@apply` Silhouette tokens inside `@layer components` blocks** unless you have a strong reason. Prefer raw utilities on JSX — easier to grep, easier to reason about.
- **Don't install shadcn/ui yet.** Decide after the first redesign pass whether the abstractions help. Tailwind alone is enough for the insight card + welcome + feedback surface.
- **Don't theme-toggle.** Dark-only is fine for the beta. No `light` mode tokens were defined on purpose.
- **Don't replace the inline body styles in `layout.tsx`** until you're actively migrating the matching component. The redesign should happen one component at a time, not by ripping out the body style in advance.
- **Don't surface internal review status** (`prototype_only`, `talking_point`, `needs_review`) to end users via UI labels. The data is in the API response but is deliberately not visualized — see Component 8 trust architecture.
- **Don't break the feedback marker contract.** `FEEDBACK_MARKER_TEXT` in `src/presentation/feedbackMarker` is how the renderer knows which assistant turn gets feedback buttons. Keep importing it from there.
- **Don't replace `InsightMediaCard`'s allowlist check** (`isAllowedEmbedHost`). It's the runtime safety boundary against future malicious `embed_url` values.

## Reminder on Silhouette's visual register

The product should feel: **calm, human, warm, credible, simple, emotionally safe, source-forward.** Not clinical. Not corny. Not chatbot. Not wellness-app. Not content-feed.

When in doubt: smaller type, more whitespace, fewer colors, more visible attribution, no celebration of "AI." The user's stuck moment is the subject; the system is the calm intermediary.
