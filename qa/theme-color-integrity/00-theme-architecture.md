# 00 — Theme architecture (verified 2026-07-08, repo @ 6b0dea3)

Repo verified: `lilaburlabur-ux/santro-ai` @ main, fresh-synced clone, clean tree. Static site — no Tailwind, no bundler, no React provider. package.json = dev tooling only.

## Where theme state lives
- **State**: `localStorage["santro-theme"]` ("dark" default | "light").
- **DOM**: `html[data-theme="light"]` attribute (set by inline boot script in every page head + `window.SantroTheme` in nav.js v5). Dark = attribute absent.
- **Design-system flag**: `html.ds-v2` class, applied by `ds-v2/flags.js` (v4). remap.css re-points every legacy CSS-variable family (`--bg/--panel/--accent/--accent-2/…`) at semantic `--st-*` tokens under `html.ds-v2`.

## The three-layer truth
1. `ds-v2/tokens.css` — `--st-*` semantic tokens (dark values only, on `:root` in `@layer ds-v2`).
2. `ds-v2/remap.css` — `html.ds-v2 { --accent: var(--st-green); … }` (the bridge; loads after page styles).
3. Legacy palettes — `site.css:5-22` (+ inline copies in index.html/terminal.html): dark block with **blue accents** (`--accent:#5b9df0`) and `html[data-theme="light"]` block with **blue accents** (`--accent:#2f6fd0; --accent-2:#2059b8`).

## ROOT CAUSE of the light-mode blue
**flags.js v4 line ~21: `if (localStorage["santro-theme"]==="light") return false` — ds_v2 is dark-only by design** ("light sessions keep the legacy skin until light tokens exist" — a deferred P2). So:
- Dark: `html.ds-v2` present → remap wins → green everywhere.
- Light: class removed → remap inert → the legacy light palette renders — and that palette is **literally blue** (`site.css:20`), with `a{color:var(--accent-2)}` → blue links, blue hovers, blue badges, blue CTA borders. The product becomes the old blue SaaS.

Secondary findings (visible in DARK mode too — worse than reported):
- `etfs.html`/`e.html`/`gen_etf_pages.js`: `.rb.income` badge `#60a5fa` (blue), `.rb.spec` badge `#a78bfa` (purple — also off-brand), `.sa-cta-box` border `rgba(91,157,240,.28)` (blue tint).
- `index.html:529`: hero radial glow `rgba(124,176,245,.05)` (faint blue).
- 333 `var(--x, #blue)` fallbacks across ~170 files — invisible under ds_v2 but a leak path any time a variable goes undefined.
- `--gl-*` glass tokens (cyan family) in tokens.css/tokens.json — **iOS/share-card only** per docs/ds-v2/README.md; only consumer is the unused `.ds-glassframe` primitive. Not web UI.

## Multiple theme systems?
One state source (santro-theme) but **two skins** (ds_v2 vs legacy) switched by theme — that coupling IS the bug. Fix: ds_v2 always on; theme switches TOKEN VALUES via `html.ds-v2[data-theme="light"]` (specificity 0-2-1 beats both `:root` tokens 0-1-0 and legacy `html[data-theme="light"]` 0-1-1 — no order dependence).

## Fix plan (implemented in this pass)
1. `design/tokens.json` + `ds-v2/tokens.css`: add the **Santro daylight palette** — `--st-*` redefined under `html.ds-v2[data-theme="light"]` (green-graphite, AA-checked, `color-scheme:light`). `accent-color: var(--st-green)` on `.ds-v2` for native controls.
2. `flags.js` v5: drop the light-mode bail-out — ds_v2 on for every session.
3. Legacy palettes (site.css + inline copies): blue accents → green equivalents (honest fallback path; blue-gray neutrals → green-gray).
4. Mechanical sweep of all literal blues/purples: fallbacks → green equivalents; ETF badge recolor (income→green, spec→amber per brand semantics); CTA borders + hero glow → green tints. Generators patched the same way.
5. Enforcement: `ci/audit-theme-colors.mjs` + `npm run audit:theme-colors` (fails the build on any new blue).
