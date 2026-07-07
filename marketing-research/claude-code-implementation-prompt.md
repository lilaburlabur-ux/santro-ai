# Claude Code Master Prompt — Santro Full-Site Rebuild (Audit Loop)

Version 2 — supersedes the homepage-only prompt. Copy everything below the line into Claude Code at the repo root.

---

You are rebuilding the entire Santro AI website (santroai.tech) according to a completed competitive-research program. You work in a **loop**: audit one route, fix it, verify it, log it, commit it, move to the next. You do not big-bang the site in one pass.

## Phase 0 — Read the research first (mandatory)

Parse these documents in `marketing-research/` before touching any code. They are the specification; do not improvise against them:

1. `patterns-summary.md` — what good and bad look like, with named examples.
2. `santro-current-homepage-critique.md` — what is wrong today and the delete/reframe/keep lists.
3. `landing-concepts.md` — Concept A is the chosen homepage; C embedded mid-page; B becomes post-signup calibration.
4. `locked-data-strategy.md` — the gating matrix. This is law for every feature on every page.
5. `homepage-structure.md` — hero spec, 10 headline combos (default = #1), full 10-section homepage.
6. `locked-state-copy.md` — the only allowed lock microcopy (import as a copy map, never freestyle new lock text).
7. `registration-funnel.md` — modal spec, return-to-context behavior, activation strip.
8. `50-platform-benchmark.md` / `.csv` — reference evidence; consult when a pattern decision is ambiguous.

After reading, write `docs/rebuild-plan.md` summarizing, in your own words, the 10 rules you must not break. If your summary conflicts with the documents, the documents win.

## Non-negotiable rules (apply on every loop iteration)

1. **No page deletions. Ever.** Every existing route keeps responding 200 at its current URL. Changes are rewrites in place. Sitemap URL set stays identical.
2. **The quiz is registered-only.** 
   - Homepage `/`: zero quiz content, for anyone, anywhere above or below the fold.
   - `/quiz` route stays alive (no deletion, no redirect). For **anonymous** users it renders a professional gate page: title "Exposure Check", 2–3 sentences explaining that it calibrates your terminal (universe, concentration, valuation lens, risk watch), the output preview (a configured terminal snapshot), and one CTA: `Create a free account to run it`. No questions render for anonymous users.
   - For **registered** users, `/quiz` runs the reframed calibration: 4 instrument-style steps, no personas, no emoji, no progress-bar-as-hero, no "what kind of trader are you" language. Output = preset dashboard + suggested watchlist (editable), per `landing-concepts.md` Concept B.
   - The same calibration is offered once post-signup as an optional, skippable step in the activation strip.
3. **ds_v2 only.** Existing tokens and primitives; no raw hex/rgb outside token files; no browser-default blue links; one padlock token reused everywhere.
4. **Compliance constants** from one module (`src/lib/compliance.ts` or existing equivalent): "Quotes delayed ~15 min." / "Not financial advice." / "Hot means attention, not direction." Present on every data surface. No "real-time" or "Live" strings adjacent to market data — rename status badges to "Beta"/"New".
5. **Gating follows `locked-data-strategy.md` exactly**, implemented through a single `src/config/gates.ts` (feature → anon | free | pro). Components read the config; no inline gating decisions. Pro entries exist in the enum but render no user-facing upsell until Pro launches.
6. **Never blur fake data.** Locked cells blur real values (server-obfuscated so devtools can't recover them); pipeline failure hides the module. Locked rows keep real ticker symbols crawlable.
7. **Signup modal** per `registration-funnel.md`: triggered only by user action, intent-mirroring title, Google OAuth; email option only behind `AUTH_EMAIL_ENABLED` when the backend is verified — no broken magic links. After auth, deep-link back to the exact element and un-blur in place.
8. **No dark patterns:** no on-load/scroll/exit modals, no countdowns, no fake scarcity, no invented user counts or testimonials.
9. **SEO preservation:** ticker/theme/ETF/research pages stay fully crawlable; core data server-rendered; metas rewritten terminal-first; canonical tags intact.
10. **Copy tone** everywhere: finance-terminal register per `locked-state-copy.md` and the homepage copy in `homepage-structure.md`. Plain, verb-first, one idea per sentence. Delete marketing adjectives on sight.

## The Loop

Create `docs/rebuild-audit.md` as the running log. Then iterate **one route per cycle** in this priority order:

```
1. /                      (rebuild per homepage-structure.md — biggest change)
2. /terminal              3. /stocks               4. /stocks/[ticker] (template)
5. /stocks/themes/*       6. /etfs                 7. /crypto
8. /bubble (+ stress)     9. /tools/fair-value-calculator
10. /quiz (reframe/gate)  11. /research + /blog/*  12. /ipos
13. /stocks/burry-short-watch                      14. /stocks/aschenbrenner
15. /share                16. /news                17. /signin + /signup
18. /about + legal pages  19. any route found in sitemap not listed above
```

For each route run this exact cycle:

**A. AUDIT** — Render the route (desktop + 390px). Grade it against a fixed checklist: quiz/persona leakage? gating matches gates.ts? compliance strings present? "Live"/real-time claims? raw colors/default links? lock copy from the approved map? metas terminal-first? mobile layout sane? SSR of core data? Record findings in `docs/rebuild-audit.md` under the route heading with a PASS/FAIL per item.

**B. PLAN** — List the exact diffs (components, copy, gating, meta). If a needed decision isn't covered by the research docs, choose the option closest to a named benchmark pattern in `patterns-summary.md` and note the reasoning in the log.

**C. IMPLEMENT** — Smallest diff that satisfies the plan. Reuse existing terminal/bubble/stress components; this is composition, not reinvention.

**D. VERIFY** — Build passes; route-level checks: grep `#[0-9a-fA-F]{3,8}|rgb\(` outside token files (no new hits), grep `real-time|live` near data surfaces (none), lock click → modal → auth → return-to-context works, JS-disabled render shows core data, CLS from blur overlays ≈ 0, tap targets ≥ 44px at 390px.

**E. LOG + COMMIT** — Update the route's section in `docs/rebuild-audit.md` to DONE with a one-line summary. One commit per route: `rebuild(<route>): <summary>`.

**F. NEXT** — Proceed to the next route. Do not start a new route with the previous one failing verification.

## Final pass (after route 19)

- Crawl `sitemap.xml` before/after: identical URL set, all 200.
- Lighthouse on `/`, `/terminal`, one ticker page: mobile LCP < 2.5s, CLS < 0.1.
- Full-site greps (colors, real-time claims, quiz language: "what kind of", "Question 1 of", persona names, emoji in UI strings) — all clean.
- Anonymous walkthrough: land → explore → hit lock → modal → (stop). Registered walkthrough: signup → return-to-context → activation strip → calibration → preset dashboard → save watchlist → set alert.
- Analytics events firing: `lock_click(context)`, `modal_open/close(context)`, `signup_complete(source)`, `activation_step(n)`, `calibration_completed/skipped`.
- Any failure re-enters the loop for that route. The job is done only when `docs/rebuild-audit.md` shows every route DONE and the final pass all-green.

## Acceptance criteria (the stop condition)

1. First-time visitor sees real delayed market data above the fold on `/` in < 2.5s — no quiz anywhere on the landing page.
2. Anonymous `/quiz` shows the gate page; questions render only for authenticated users; calibration also offered once post-signup, skippable.
3. Every route from the pre-rebuild sitemap still resolves at the same URL. Zero deletions.
4. Gating across the whole site matches `locked-data-strategy.md` via `gates.ts`; every lock uses approved microcopy and unlocks in place after auth.
5. Compliance strings on every data surface; zero real-time/"Live" claims; no performance promises; no dark patterns.
6. ds_v2 intact: no raw colors, no default links, one padlock token.
7. `docs/rebuild-audit.md` documents the audit → fix → verify trail for all routes.
