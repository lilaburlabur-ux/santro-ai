# Rebuild audit log (one section per route; loop order per master prompt)

Route status legend: PENDING → IN PROGRESS → DONE (verified)

| # | route | status |
|---|---|---|
| 1 | / | DONE |
| 2 | /terminal | DONE |
| 3 | /stocks | PENDING |
| 4 | /stocks/[ticker] | PENDING |
| 5 | /stocks/themes/* | PENDING |
| 6 | /etfs | PENDING |
| 7 | /crypto | PENDING |
| 8 | /bubble (+stress) | PENDING |
| 9 | /tools/fair-value-calculator | PENDING |
| 10 | /quiz | PENDING |
| 11 | /research + /blog/* | PENDING |
| 12 | /ipos | PENDING |
| 13 | /stocks/burry-short-watch | PENDING |
| 14 | /stocks/aschenbrenner | PENDING |
| 15 | /share | PENDING |
| 16 | /news | PENDING |
| 17 | /signin + /signup | PENDING |
| 18 | /about + legal | PENDING |
| 19 | remaining sitemap routes | PENDING |

## Route 1 — / (DONE)
AUDIT: quiz hero + persona cards + "Question 1 of 8" + quiz-led metas + "Live" nav badges (critique confirmed live).
PLAN: homepage-structure.md 10 sections; Concept A hero; C embedded as stress hook; locks per gates.js; copy from lock-copy map.
IMPLEMENT: full body rewrite; support layer shipped globally (ds-v2/{gates,compliance,lock-copy,events,locks}.js + lock.css);
  nav "Live"->"Beta" badges; quiz nav/footer entries -> "Exposure Check" (account); terminal-first metas; quiz.js include removed
  from / (route /quiz untouched until its own cycle — still the old quiz for now, by loop design).
VERIFY: hydration from real feeds (BI 57 Heating Up + 30d history + real components; hot 5 open w/ sourced reasons + 5 real
  symbols blurred; 7 themes; stress preset scenario-1 −44% + 5 locked; research note) · lock->modal (intent title, no Google,
  Esc restores) · events firing (lock_click/modal_open/modal_close) · 1 H1 · 0 quiz strings · desktop 1280 ov=0 ·
  mobile 375 ov=0, sticky CTA 48px, presets 44px · stylelint/audit:colors/qa_stress 43-43/seo_audit green.
DEVIATIONS (logged in rebuild-plan.md): hero hydrates client-side from delayed JSONs (static hosting); auth = email+password
  (the verified method; Google absent, not broken); events queue to localStorage pending backend.

## Route 2 — /terminal (DONE)
AUDIT: 'Live · 5m ago' squawk badge (rule-4 violation), 2x '60-second AI bubble check' quiz-era hooks; compliance lines present (7 delayed refs); map/tape free per gating matrix; existing free features grandfathered (locks never move backwards).
FIX: badge -> 'Squawk · 5m ago'; quiz hooks -> 'Exposure Check'. No layout change (terminal already the approved wide product).
VERIFY: greps clean; guards green.
