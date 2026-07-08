# 06 / Phase 9 — all-route theme report (final)

Live crawl: `node qa/theme_render_audit.mjs live` — **175 sitemap URLs × dark+light × 1440+390 = 700 page audits.** JSON: `02-rendered-color-audit-live.json`.

## Result

| | before | after |
|---|---|---|
| Source blue/purple findings | 546 (173 files) | 0 (8 allow-listed `--gl-*` glass tokens, iOS/share-card only) |
| Rendered blue findings (700 loads) | (light mode = entirely blue) | **0** |
| Exact URL count checked | — | 175 |
| Theme toggle works every route | — | yes (pure token swap, persists) |

The crawl's single finding — `/etfs/vgt` dark, a focused link showing the browser-default outline `rgb(0,95,204)` — was a UA focus ring, not a painted color. Fixed in `tokens.css` v3 (`.ds-v2 :focus { outline-color: var(--st-focus-ring) }`); live re-check now returns `rgba(59,224,143,0.45)` (Santro green). **Rendered findings after fix: 0.**

## Root cause (recap)
`flags.js` kept ds_v2 dark-only, so light sessions fell back to the legacy `html[data-theme="light"]` palette in site.css — which was literally blue (`--accent:#2f6fd0; --accent-2:#2059b8`). Light mode = the old blue SaaS.

## Fix
- Santro daylight palette: `html.ds-v2[data-theme="light"]` in tokens.css redefines the `--st-*` set (green-graphite, AA-checked). One block relights all ~190 pages via remap.css.
- flags.js v5: ds_v2 on for both themes.
- 909 mechanical blue→green replacements across 191 files + generators; ETF income badge blue→green, spec badge purple→amber; article/tool chips greened; `accent-color: var(--st-green)` for native controls; every UA focus ring recolored green.

## Enforcement (permanent)
- `npm run audit:theme-colors` (`ci/audit-theme-colors.mjs`) in the `qa` chain — fails the build on any blue/purple hex, blue-dominant rgb(), or blue class token.
- `node qa/theme_render_audit.mjs local|live` — rendered computed-color audit, both themes, blue-hue detection 185–260°, screenshots.

## Verdict: production safe — 0 visible blue in either theme, Santro green is the accent everywhere, toggle works on every route.
