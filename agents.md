# agents.md

Conventions for anyone (human or agent) working in this repo.

## What this is

**Draw**: a client-only, installable random number generator for games. No backend, no analytics,
no trackers. Deployed to GitHub Pages (custom domain `draw.ammaarm.com`).

## Stack

- Vite 8, React 18, TypeScript 6 (strict)
- Tailwind CSS 3.4 (theme tokens are CSS variables), Framer Motion
- Zustand for state
- `vite-plugin-pwa` (Workbox) for offline and install
- Vitest + React Testing Library (jsdom)
- ESLint 9 (flat config) + Prettier (with the Tailwind class-sorting plugin)

React is pinned to 18 and Tailwind to 3.4 on purpose; do not bump majors casually.

## Scripts

| Command             | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Dev server                                                   |
| `npm test`          | Run all tests once                                           |
| `npm run lint`      | ESLint, zero warnings allowed                                |
| `npm run typecheck` | `tsc --noEmit`                                               |
| `npm run format`    | Prettier write                                               |
| `npm run build`     | Type-check, build to `dist/`, copy `index.html` → `404.html` |
| `npm run preview`   | Serve the production build (needed to test the PWA)          |
| `npm run icons`     | Regenerate PNG icons from `public/icons/*.svg`               |

Before finishing any change, run `npm run lint && npm run typecheck && npm test && npm run build`.
CI runs the same and blocks the deploy on failure.

## Folder structure

```
index.html              HTML shell; inline script applies the theme before first paint
public/                 CNAME, favicon, icons (SVG sources + generated PNGs)
scripts/                generate-icons.mjs, copy-404.mjs
src/
  main.tsx              Entry
  App.tsx               Layout: bottom sheet below 1024px, side panel above
  store.ts              The single Zustand store: state, actions, persistence
  index.css             Tailwind layers and theme tokens (dark default, .light override)
  lib/                  Framework-free logic. No React imports here.
    random.ts           crypto RNG: rejection sampling, Fisher–Yates, Set rejection
    draw.ts             Config type, validation, drawing, formatting, parsing stored data
    presets.ts          Built-in presets, custom preset parsing
    storage.ts          try/catch-wrapped localStorage
    platform.ts         vibrate, clipboard, id helpers
  hooks/                useRoll (shuffle animation), useCopy, useMediaQuery
  components/           Small, focused components; fields.tsx holds the form primitives
  test/setup.ts         jest-dom, matchMedia stub (reports reduced motion), cleanup
```

Tests sit next to the code they cover (`*.test.ts`, `*.test.tsx`).

## Conventions

- **Randomness:** only through `src/lib/random.ts`. Never `Math.random`, including for cosmetic
  animation; ESLint enforces this in `src/`.
- **Types:** no `any`. Data read from storage is `unknown` and goes through the `parse*` functions
  in `lib/`.
- **Storage:** only through `lib/storage.ts`. The app must work when storage throws.
- **State:** everything shared lives in `store.ts`. Components select the slices they need;
  purely local UI state (open/closed, input drafts) stays in the component.
- **Invalid config:** number inputs write `NaN` to the store while half-typed. `validateConfig` is
  the one place that decides validity; invalid configs disable Draw and are not persisted.
- **Styling:** use the semantic colour tokens (`bg-surface`, `text-muted`, `bg-accent`…), not raw
  colours or `dark:` variants. Change a colour by editing the variables in `index.css`, and keep
  text at WCAG AA contrast in both themes.
- **Accessibility:** touch targets at least 44px (`min-h-11`), visible focus, labelled controls,
  results announced through the `aria-live` region in `ResultDisplay`. Animation must respect
  `prefers-reduced-motion` (`useRoll` and `MotionConfig` handle this).
- **Layout:** design at 360–430px first. Use the `px-safe`, `pt-safe`, `pb-safe` utilities for
  safe-area insets.
- **Deployment:** Vite `base` defaults to `/` and is overridden only by the `BASE_PATH` env var the
  deploy workflow sets from GitHub Pages. Never hard-code absolute `/…` URLs in `src/`; they break
  on the `github.io/<repo>/` path. `public/CNAME` stays `draw.ammaarm.com`.
- **Commits:** do not commit `dist/`. Generated PNG icons are committed.
