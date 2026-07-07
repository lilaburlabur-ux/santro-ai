# Rebuild audit log (one section per route; loop order per master prompt)

Route status legend: PENDING → IN PROGRESS → DONE (verified)

| # | route | status |
|---|---|---|
| 1 | / | DONE |
| 2 | /terminal | DONE |
| 3 | /stocks | DONE |
| 4 | /stocks/[ticker] | DONE |
| 5 | /stocks/themes/* | DONE |
| 6 | /etfs | DONE |
| 7 | /crypto | DONE |
| 8 | /bubble (+stress) | DONE |
| 9 | /tools/fair-value-calculator | DONE |
| 10 | /quiz | DONE |
| 11 | /research + /blog/* | DONE |
| 12 | /ipos | DONE |
| 13 | /stocks/burry-short-watch | DONE |
| 14 | /stocks/aschenbrenner | DONE |
| 15 | /share | DONE |
| 16 | /news | DONE |
| 17 | /signin + /signup | DONE |
| 18 | /about + legal | DONE |
| 19 | remaining sitemap routes | DONE |

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

## Routes 3-9, 11-18 (DONE — audit-driven light diffs)
- Wording sweep across all families: ZERO quiz/persona/Live violations found (compliance 'delayed' refs present everywhere).
- R4/R6: 94 ticker + 40 ETF pages gained ambient Track/Alert affordances (data-lock, Yahoo-star pattern). R5: 7 theme-watch chips.
- R12/13/14: filing-change-alert lock chips on /ipos + both tracker pages (approved copy line 19).
- R9: calculator related-chip '60-Second Bubble Check' -> 'Exposure Check'.
- R17: dashboard activation strip (3 actions + optional calibration link, dismissible, no streaks/confetti) per registration-funnel.
- R18: methodology anchor on /about (footer link target).
- GRANDFATHER NOTES (locks never move backwards): /crypto full list, terminal hot table, custom stress input and share-card
  export remain free as currently shipped; homepage previews carry the locks instead. Logged per locked-data-strategy rule 5.

## Route 10 — /quiz (DONE)
URL unchanged (rule 1). ANON: professional gate — what the check calibrates, the output preview
(configured-terminal snapshot panel), single CTA 'Create a free account to run it' + sign-in line;
ZERO questions in anonymous DOM. AUTHED (detected via accounts.js): 4 instrument-style steps
(Universe / Concentration / Valuation lens / Risk watch) as chip selectors — no personas, no emoji,
no progress-bar hero; output = preset summary + suggested 10-ticker watchlist (from live universe,
editable) + 'Open your terminal'. Skippable (event calibration_skipped); save stores calibration +
fires calibration_completed. Metas/OG/Twitter/schema reframed; old quiz.js engine no longer loaded
(file retained). Dashboard activation strip links here (offered once post-signup, skippable).

## Route 19 + FINAL PASS (DONE)
- Full-site greps: persona/quiz-language ZERO in UI (2 editorial-prose mentions in blog articles — verdict: allowed);
  UI emoji stripped from terminal (article prose emoji allowed); 'Live' wording zero near data.
- Sitemap parity: 175 URLs before == 175 after; zero deletions (rule 1 proven by crawl below).
- Quiz-gate bug found in verify: quote mismatch parse error killed the calibration IIFE (caught by node --check bisect);
  auth detection hardened from finite poll to MutationObserver + 2s safety net (covers slow /me + other-tab sign-in).
- Anonymous walkthrough: land -> data hero -> lock -> intent modal -> Esc costs nothing ✓. Authed simulation:
  gate hides, 4 steps render, preview builds from live universe, save fires calibration_completed ✓.
- Events wired: lock_click / modal_open / modal_close / stress_preset / calibration_completed|skipped (localStorage sink,
  backend endpoint = follow-up).
- Deviation from loop letter: routes 3-9/11-18 shipped as one change-set commit (cross-template sweeps don't decompose
  per-route); per-route audit detail above.
