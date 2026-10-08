# Draw

A mobile-first random number generator for game night: board games, tabletop sessions, party
games, raffles and picking turn order. Set up how numbers are generated, then tap one big button
as often as you like.

Live at **https://draw.ammaarm.com**. Installable, works offline, no backend, no analytics.

## Features

- Min/max (negatives allowed), 1–100 numbers per draw, optional unique values
- Output as a list of tiles, a summed total, or digits joined into one code
- One-tap presets (1–6, 1–10, 1–20, 1–100, two 1–6 summed, coin flip) plus your own
- Shuffle animation (skipped under `prefers-reduced-motion`) and haptics
- Double-tap the result to draw again; a small corner badge copies it
- Last 50 draws kept in a collapsible history
- Dark and light themes; follows the system on first load
- Settings, presets and history persist in `localStorage`, and the app still works without it

## Local development

Requires Node 22 or newer.

```bash
npm install
npm run dev          # dev server at http://localhost:5173
npm test             # run the test suite once
npm run test:watch   # watch mode
npm run lint         # ESLint (zero warnings allowed)
npm run typecheck    # tsc --noEmit
npm run format       # Prettier
npm run build        # type-check, build to dist/, copy index.html to 404.html
npm run preview      # serve the production build (use this to test the PWA/offline)
npm run icons        # regenerate PNG icons from public/icons/*.svg
```

The service worker is only registered in production builds, so test install and offline behaviour
with `npm run build && npm run preview`.

## How the RNG works

All randomness lives in [`src/lib/random.ts`](src/lib/random.ts), a pure module with no framework
dependencies. `Math.random` is never used, and an ESLint rule bans it in `src/`.

- **Source.** Every value comes from `crypto.getRandomValues`, read as unsigned 32-bit integers.
- **No modulo bias.** Mapping a 32-bit value onto a range with `x % n` favours the low results
  whenever `n` does not divide 2³². Draw uses rejection sampling instead: it computes the largest
  multiple of `n` that fits in 2³², throws away any raw value at or above it, and only then takes
  the remainder. Every result in the range is exactly equally likely. Ranges wider than 2³² use
  the same method on a 53-bit value built from two draws.
- **Unique values.** With repeats off, Draw picks one of two strategies:
  - a **partial Fisher–Yates shuffle** over the whole range when the range is small (up to 4,096
    values) or the draw takes more than half of it. Only the first `count` positions are shuffled.
  - **rejection against a `Set`** when the draw is sparse relative to a large range, so memory
    scales with the count rather than the range.
- **Tests.** [`src/lib/random.test.ts`](src/lib/random.test.ts) covers bounds, uniqueness on both
  strategies, chi-square uniformity over tens of thousands of samples, the rejection step with a
  deterministic source, and the edge cases (min = max, negative ranges, count = range size).

The numbers that flicker past during the animation are cosmetic; the result is drawn once, up
front, and the animation settles on it.

## Deployment

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which:

1. installs with `npm ci`
2. runs lint, type-check and tests (any failure stops the deploy)
3. asks GitHub Pages for the site's base path and builds to `dist/`
4. publishes `dist/` to GitHub Pages

Vite's `base` defaults to `/`, which is what the custom domain needs. The workflow passes the
path GitHub Pages reports as `BASE_PATH`, so until the custom domain is set the same build works at
`https://<github-username>.github.io/random-number-generator/`; once it is set, the path becomes
`/` with no code change. `dist/404.html` is a copy of `index.html` so deep links keep working if
routing is added later.

## Custom domain setup

One-off manual steps:

1. **Repo Settings → Pages → Source:** choose **GitHub Actions**.
2. **Cloudflare DNS for `ammaarm.com`:** add a `CNAME` record with name `draw` and target
   `<github-username>.github.io`. Set it to **DNS only (grey cloud)** until GitHub issues the
   certificate.
3. **Repo Settings → Pages → Custom domain:** enter `draw.ammaarm.com`, wait for the DNS check
   to pass, then tick **Enforce HTTPS**.
4. **Optional:** switch the record to **Proxied (orange cloud)** afterwards, with Cloudflare
   SSL/TLS mode set to **Full**.

## Project layout

See [`agents.md`](agents.md) for the folder structure and conventions.
