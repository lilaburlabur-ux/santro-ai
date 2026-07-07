# Santro AI — Phase 0: token freeze (ds_v2)

**Status: frozen, NOT applied to production. Phases 1–7 blocked pending review of this package.**

## Files

| File | Purpose |
|---|---|
| `tokens.json` | Single source of truth. `tokens.css` and `ios/DesignTokens.swift` (Phase 7) are generated from it. |
| `tokens.css` | CSS custom properties in `@layer ds-v2`. All visual rules scoped to `.ds-v2` — zero pixel change while the flag is off. |
| `fonts.css` | IBM Plex Sans + Mono. Load only on ds_v2 routes. |
| `fonts-editorial.css` | Newsreader. Research/article routes only. |
| `flags.js` | `ds_v2` flag (default **off**), localStorage QA override, `applyDesignFlags()` boot hook. |
| `stylelint.config.json` | Bans raw hex / rgb / hsl / named colors and unqualified color properties outside `tokens.css`. |
| `Token Preview.dc.html` | Approval preview — renders live from `tokens.json`. |

## Install (when wiring into the real repo)

1. `npm i -D stylelint stylelint-declaration-strict-value`
2. Merge `stylelint.config.json` into the repo's stylelint config (keep the `tokens.css` override).
3. Include `tokens.css` globally (safe — inert without the flag), `fonts.css` only where ds_v2 is enabled.
4. Call `applyDesignFlags()` at boot. QA can toggle with `flagOn('ds_v2')` / `flagOff('ds_v2')` + reload.

## Rules now in force

- All colors come from tokens. CI fails on raw color values outside `tokens.css`.
- Links are `--st-green`; browser-default blue is impossible inside `.ds-v2`.
- No pink/purple tokens exist; none may be added without a token PR + design sign-off.
- Numbers always `--font-mono` + `tabular-nums` (`.num` / `[data-num]`).
- `--r-glass`, `--gl-*` are iOS/share-card only. `--sc-heat-*` is share-card only.
- iOS maps type to SF Pro / SF Mono at the same scale (no bundled Plex unless later decided).

## Explicitly NOT done in Phase 0

- No production component touched, no route restyled, no font loaded on production pages.
- Rollback: delete this folder / never enable the flag.
