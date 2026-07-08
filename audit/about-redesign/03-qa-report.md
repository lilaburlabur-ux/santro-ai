# 03 — /about QA report

Rendered (local server, `qa/about-redesign/screenshots/`):

| combo | overflow | h1 | ds_v2 | accent | primary btn | blues | errors |
|---|---|---|---|---|---|---|---|
| 1440 dark | 0px | 1 | on | rgb(59,224,143) green | green | 0 | 0 |
| 1440 light | 0px | 1 | on | rgb(18,138,82) green | green | 0 | 0 |
| 390 dark | 0px | 1 | on | green | green | 0 | 0 |
| 390 light | 0px | 1 | on | green | green | 0 | 0 |

- **Dark/light:** both Santro green (dark #3BE08F, light #128A52) — no blue, no pink/purple. Light = off-white/graphite base, dark graphite text. Terminal card values use green/red/amber tokens.
- **Mobile:** hero grid collapses to one column, grid → single column, chips wrap, buttons/chips ≥44px, no horizontal overflow at 390.
- **Shell:** switched `shell-article` (1080, editorial serif) → `shell-tool` (1240, sharp sans) — trader-native, not essay-like. No Newsreader leak.
- **Gates:** audit:theme-colors clean · audit:colors clean · qa_stress 43/43 · seo_audit exit 0.
- **Residue:** 0 hits for "is/is not", mascot, research journal, pigeon, "Santro in numbers", stale counts.

## Remaining risks
- Terminal snapshot card in the hero shows illustrative sample values (49/BABA/−28%) — static by design (it's a product illustration, not a live feed); labeled "live surfaces" generically, no fake real-time claim, carries no timestamp.
- `/bubble#stress` is an in-page anchor, not a standalone route (the requested `/bubble/portfolio-stress-test` doesn't exist) — deliberate, points to the real stress section.
