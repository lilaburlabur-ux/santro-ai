# 01 — Source-level blue audit (before → after)

Machine-readable: `01-blue-source-audit.json` (BEFORE, frozen pre-fix) · `01-blue-source-audit-after.json` (AFTER).

## Before: 546 blue/purple findings in 173 files

| Category | Count | Severity | What it was |
|---|---|---|---|
| Light-palette definitions | 4 blocks (site.css:7,20 + identical inline blocks in index.html, terminal.html) | **P0** | THE root cause: `html[data-theme="light"]{--accent:#2f6fd0; --accent-2:#2059b8; --accent-soft:#e7effb; --accent-border:#bcd3f1}` + blue-gray neutrals — the entire light theme was blue. Dark legacy block also carried blue accents (#5b9df0/#7cb0f5), masked only by remap. |
| Element rules with literal blue/purple | 203 | **P0 (some visible in DARK mode today)** | `.rb.income` #60a5fa blue badge + `.rb.spec` #a78bfa PURPLE badge (etfs/e/gen_etf_pages), `.sa-cta-box` blue borders (etfs/ipos), homepage hero glow rgba(124,176,245), `.tkchip.blue/.purple` + `.fchip.blue` chips (2 blog articles + /evaluate-prompt, hexes #7cc4ff/#2f6dbf/#c79bff/#7a4bd0), blog link colors. |
| `var(--x, #blue)` fallbacks | 333 | P1 | Invisible under ds_v2 (vars defined) but the leak path if any var is ever undefined. Swept to green equivalents. |
| Glass tokens (--gl-*) | 6 (tokens.css + tokens.json) | allowed | iOS/share-card canvas palette per docs/ds-v2/README.md; only web consumer is the unused `.ds-glassframe` primitive. Kept, allow-listed, rendered audit confirms nothing draws them. |

## The replacement mapping (mechanical, case-insensitive, 191 files, ~909 replacements + 3 chip files)

| Blue/purple | → Santro | Role |
|---|---|---|
| #5b9df0 → #22c55e · #7cb0f5 → #7ce8b1 | dark accents | legacy accent family |
| #2f6fd0 → #157a4a · #2059b8 → #0f6b41 | light accents | AA on light bg |
| #e7effb → #e7f5ec · #bcd3f1 → #bfdcc9 | light soft/border tints | green-gray |
| #12233a → #10241a · #22436a → #1e4634 · #2b4a75 → #2c5a44 | dark soft/border tints | green-graphite |
| #60a5fa → #4ade80 + rgba(96,165,250→74,222,128) | ETF "income" badge | blue → green (neutral category) |
| #a78bfa → #e0a73f + rgba(167,139,250→224,167,63) | ETF "spec" badge | purple → amber (speculative = elevated, per brand semantics) |
| rgba(91,157,240→34,197,94) | CTA borders (etfs/ipos) | green |
| rgba(124,176,245→59,224,143) | homepage hero glow | green |
| #7cc4ff→#7ce8b1 · #2f6dbf→#1e6b45 · rgba(70,150,255→59,224,143) | article/tool chips | green |
| #c79bff→#ecc06a · #7a4bd0→#8a6420 · rgba(150,90,240→224,167,63) | purple chips | amber |
| light neutrals #f3f5f8/#eef1f5/#e8edf3/#d9dfe7/#e5eaf0/#1b242f/#5b6675/#8a94a3 | → green-gray equivalents | de-blue the light grays |
| class names `.tkchip.blue/.purple`, `.fchip.blue` | → `.alt`/`.warm` | no color words in class names |

Generators patched in the same pass (gen_etf_pages.js, gen_nav.py) so regeneration cannot resurrect blue.

## After: 14 findings in 5 files → then 6 chip findings fixed → **8 remaining, all allow-listed glass tokens**

`npm run audit:theme-colors` (new gate, in the `qa` chain) scans everything outside the allow-list on every run and **fails the build** on any blue/purple hex, blue-dominant rgb(), or blue-ish class token. Current status: **clean**.
