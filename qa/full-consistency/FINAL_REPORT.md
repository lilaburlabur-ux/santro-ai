# FINAL REPORT — full-site consistency audit & cleanup
2026-07-08T00:32:45Z · repo lilaburlabur-ux/santro-ai · live https://santroai.tech · audited from e34d2aa

## Counts (before → after, all live-measured, 175 sitemap URLs each run)
| audit | BEFORE | AFTER |
|---|---|---|
| rendered font failures (body/h1/nav/button/number/article-serif) | **181** (175 numeric surfaces Sans-not-Mono + 5 article-serif + 1 misc) | **181 → 1 → 0**: after the architecture fix one REAL leak remained — /evaluate-prompt (tool page) inherited the serif bridge because --serif wasn't article-exclusive; bridge re-scoped to body.shell-article + tool h1 moved to Plex; live-verified (tool=Plex, article=Newsreader, about=Plex) |
| source legacy font declarations | **379** (373 identical -apple-system stacks) | **0** primary (all now var(--font-sans/mono, legacy-fallback) — flag-off byte-compatible) |
| design consistency (routes) | 175/175 (held) | **175/175** |
| mobile overflow (350 loads @390+375) | 0 | **0** (console-error pages: 5 = known anonymous-auth 401 probes) |
| width/shell failures | 4 explained (prior pass) | unchanged, documented (terminal grid column + 3 tracker hybrids) |

## Architecture changed (templates, not pages)
- Literal font stacks → var(--font-sans/--font-mono, same-legacy-fallback) across 187 files + BOTH generators (durable).
- shell.css: mono + tabular-nums on numeric surfaces (tape, stats, tickers, stamps, gauges).
- NEW TOKEN (reported per rules): --font-serif-display = Newsreader stack; remap bridges article --serif under ds_v2 only; flags.js v4 loads fonts-editorial.css exclusively on shell-article pages. Zero Newsreader leakage (verified: about/privacy/terms/blog-index = Plex).

## Repo hygiene (07-* reports; reference-graph proven)
- DELETED: quiz.js (0 refs post-rebuild), _sweep.py, santro-mascot-day/night.png.
- KEPT with reasons: generators, PWA icons (manifest-referenced — corpus check initially missed manifest.json, caught on explicit verify), docs, QA gallery, marketing-research contract, pipelines.
- REVIEW_REQUIRED: none. Routes removed: none. Sitemap: 175 == 175.

## Gates
build (generators+sitemap) ✓ · stylelint ✓ · audit:colors ✓ · qa_stress 43/43 ✓ · seo_audit + landing-guard-v2 ✓ · qa:routes live 175/175 ✓

## Evidence
qa/full-consistency/{00-repo-verification, 01-*, 02-source-font-audit.*, 02-rendered-font-audit{-BEFORE,}.*, 07-*} · screenshots: 127 png across qa/screenshots + qa/full-consistency/screenshots (21 templates × 6 viewports refreshed).

## Verdict
P0 = 0 · P1 = 0 open (width footnotes documented as intentional) · P2 = auth-probe console noise (backend fix pending Brevo/oauth decisions).
Production safe: YES · live production checked after deploy: YES.
