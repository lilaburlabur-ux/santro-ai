# FINAL AUDIT REPORT — Santro AI production hard audit
2026-07-07T22:01:00Z · engine: Playwright chromium against LIVE https://santroai.tech

## 1. Scope & evidence
- repo: lilaburlabur-ux/santro-ai · audited from HEAD c3ea5e8 (branch hard-audit → merged main)
- sitemap URLs collected: **175** (qa/audit/sitemap-urls.txt)
- template groups: **23** (route-template-inventory.md/json)
- URLs checked: **175 × HTTP consistency** + **175 × 2 viewports rendered (350 loads)** + 21 desktop representatives
- screenshots captured: **127** (qa/screenshots/desktop, /mobile, /failures)

## 2. Findings & counts
| area | checked | failures found | fixed | remaining |
|---|---|---|---|---|
| debug/canary UI | all source + rendered | 0 public (1 allowed: noindexed /ds-v2/gallery) | — | 0 |
| design consistency (live) | 175 URLs | 0 (post-fix run 175/175) | — | 0 |
| mobile overflow @390+375 | 350 loads | 1 (/stocks/qcom @375, TV-embed fallback 600px) | ✅ containment in site.css v13, 5/5 clean loads live | 0 |
| console/runtime | 350 + 21 loads | 2 real (homepage loadData ReferenceError; qcom 503 transient) | ✅ orphan script removed; containment | 401 auth probes ×3 pages = known-benign (P2, backend) |
| content | 175 pages scanned | 11 hits → 3 real after per-hit context verdicts ('83 names' ×3) | ✅ drift-proof copy | 0 |
| finance language | 175 pages | **0** | — | 0 |
| SEO | 175 sitemap + engine | 0 on sitemap URLs (8 = intentional noindexed templates, listed) | — | 0 |
| links | 206 unique internal paths | 1 real (/stocks/sndk) after filtering JS-template false positives | ✅ → /t?sym=SNDK | 0 |
| tools (live, scripted) | 7 tests | 0 — cash-in-cushions ✅, 3 export formats non-blank ✅, unknown-ticker honest ✅, calculator disclaimer ✅ | — | 0 |
| header/footer | 175 (1 header + 1 footer asserted each) + drawer @375 | 0 | — | 0 |

## 3. P0/P1/P2 ledger (FIX_PLAN.md)
- P0 fixed: 2/2 (homepage ReferenceError, qcom mobile overflow)
- P1 fixed: 2/2 (stale universe counts, broken sndk link)
- P2 deferred, documented: 2 (anonymous-auth 401 console noise → backend change; transient 3rd-party 503)

## 4. Gates
stylelint PASS · audit:colors PASS (+self-test) · qa_stress 43/43 · seo_audit PASSED · sitemap 175 unchanged · CI qa workflow green on merge.

## 5. Verdict
Production is consistent with the approved ds_v2 reference (tokens resolve #0B0F0D/#101613/#3BE08F on every template — measured, not eyeballed), safe, and deployed. Live production re-checked after deploy: 175/175 consistency, qcom 0-overflow ×5, tools 7/7.

Artifacts: qa/audit/{sitemap-urls.txt, route-template-inventory.*, debug-ui-report.md, design-consistency-report.*, source-style-audit.*, mobile-overflow-report.*, header-footer-report.md, content-audit.*, finance-language-audit.md, seo-report.*, link-report.*, runtime-report.md, tools-functionality-report.md, data-pages-report.md, FIX_PLAN.md, FINAL_AUDIT_REPORT.md} + qa/screenshots/ (127 png).
