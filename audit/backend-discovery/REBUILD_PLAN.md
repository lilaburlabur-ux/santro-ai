# REBUILD PLAN — proposed, post-audit (no code changed yet)

Scope philosophy: **wire, don't rewrite.** The backend survives as-is. One new frontend module, one storage swap, a handful of honesty patches. Locks never move backwards (grandfathering rule stays).

## A. Product contract

**Anonymous visitor**
- Terminal: full grandfathered view (map, tape, hot table, news, brief) — unchanged.
- Sees a visible "★ Watchlist" strip slot and "⚙ Customize" button on the terminal in LOCKED state → lock modal → signup (consistent with homepage locks).
- Calculator: 5 metered runs (unchanged). Quiz: gate (unchanged, but copy must match reality).

**Registered (free) user**
- Terminal boot loads effective preferences (defaults ⊕ saved) and applies them: sections hidden per `show_*`, initial view per `default_terminal_view`, watchlist strip populated from `/watchlist` sorted by heat, preferred tickers highlighted on the map.
- "⚙ Customize" on the terminal opens the SAME preferences (inline panel or link to /dashboard#customize) — one vocabulary, one store.
- Add ticker: visible "+ Add ticker" input in the watchlist strip AND in the watchlist modal (typeahead over universe.json). ☆ Pin stays, and renders a locked variant for anon.
- Quiz "Save calibration" → PATCH /account/preferences (picks mapped to show_*/default_terminal_view/preferred_tickers) → CTA "Open your terminal" now genuinely opens a configured terminal.
- Persistence expectation: server-side, cross-device, survives localStorage wipes. localStorage keeps only theme + anon-id + event queue.

## B. API contract (backend changes are tiny)

Existing endpoints keep their shapes. Additions/decisions only:
1. **No new endpoints required for the core fix.** `/account/preferences` + `/watchlist` already carry everything.
2. Watchlist cap: enforce `max 30` in POST /watchlist (422 beyond) — makes homepage copy true. New test.
3. `/account/me`: return 200 `{authenticated:false}` for anon (kills the 401 console noise pair). Optional but cheap.
4. Decision: `/valuation/run` — either implement (POST {ticker,growth,discount} → same shape as client math) or delete `RealValuation`/route entry from api.js. Recommend: delete for now; client math is fine and keyless.
5. Events sink (optional, P1): `POST /events` accepting the existing queue items, fire-and-forget, sampled. Unblocks funnel measurement.
6. Auth rules unchanged (require_user on all personal data; optional+anon-header on usage).

## C. Database schema

**No new tables for the core fix.** `User.preferences` JSON already holds the vocabulary; `watchlist_items` done.
Optional later: `saved_stress_tests(user_id, name, payload JSON, created_at)` ONLY if the homepage promise is kept; otherwise delete the copy. Index: existing uniques suffice; add `watchlist_items` count check app-side for the cap.

## D. Frontend state

- New `accounts/prefs.js` (~80 lines): `SantroPrefs.load()` → GET /account/preferences (authed) or defaults (anon); caches in-memory for the page life; `SantroPrefs.apply(prefs)` toggles section visibility (`data-pref-section="stocks|crypto|etfs|news|research|bubble_risk|calculator|watchlist"` attributes added to terminal sections), sets initial view, exposes `preferred_tickers`.
- Terminal boot order: static JSON render (unchanged, fast, SEO-safe) → prefs applied progressively when /me resolves (no flash-block for anon).
- Optimistic updates: on toggle change in the customize panel, apply locally then PATCH; revert on failure.
- Refetch: none needed beyond page load (full-page-load site). No cache invalidation problem exists.
- Theme: on login, if `preferences.theme` set and differs from `santro-theme`, apply + sync once; SantroTheme.set() also PATCHes when authed.
- Delete `santro_calibration` after successful migration PATCH; delete `santro_quiz` reader.

## E. UI requirements

- Terminal: visible **"⚙ Customize"** button in the topstrip (locked for anon); **watchlist strip** between tape and map (empty state for authed: "+ Add ticker"; locked state for anon); "+ Add ticker" input w/ typeahead; ☆ Pin rendered ALWAYS (locked variant for anon → lock modal).
- /dashboard panel: unchanged visually, plus "View on terminal →" link after save; success message becomes "Saved — your terminal now uses these settings."
- Save/reset: "Reset to defaults" button → PATCH with defaults delta.
- Loading: skeleton on watchlist strip; error: quiet fallback to default view + toast "Couldn't load your settings."
- Locked states: reuse existing `.ds-blur`/lock modal + `save_view` copy line (finally used) — and lock modal links gain `?next=<current path>`; signup honors `next` like signin does.
- Mobile: strip collapses to horizontal chip scroll; Customize lives in the drawer; no new nav items ≤760px.

## F. Tests

- Unit (JS, node): prefs merge logic; picks→preferences mapping from quiz; watchlist cap error rendering.
- Backend (pytest): watchlist cap 30; /me anon 200 (if adopted); events sink shape (if adopted).
- Integration (Playwright + staging account): the four journeys in 09 — A (save prefs → terminal reflects), B (add ticker → strip + reload persists), C (lock → signup?next → RETURNS to action), D (cross-refresh persistence). Auth tests: anon sees locked customize/pin; authed sees real ones.
- Guards (CI): assert terminal.html contains `SantroPrefs` mount; forbid the phrase "saved stress tests" unless the table exists; qa:routes stays green.

## G. Migration

**Keep**: entire backend; accounts/api.js (minus RealValuation decision); accounts.js modals/pin/alerts; gates/locks system; all static/SEO pages; quiz UI shell.
**Rewire** (the actual work): terminal.html (+prefs.js, watchlist strip, customize button); quiz.html save(); auth-pages.js signup `next` handling; lock modal URLs.
**Delete**: santro_quiz chip block; santro_calibration key (after mapping); RealValuation + /valuation/run reference (if decision = delete); "saved stress tests" copy; unused save_view entries IF the save-view feature is explicitly dropped instead of built.
**Copy truth pass** (can ship day 1, independent of code): quiz gate promise ("preset dashboard/suggested watchlist" → describe what ships), homepage watchlist card, index.html:1086 list.

## Suggested sequence (each step shippable alone)
1. Copy truth pass (P0 honesty, zero risk).
2. `prefs.js` + terminal apply + Customize button (the flagship fix).
3. Watchlist strip + "+ Add ticker" + always-rendered Pin (locked for anon) + 30-cap.
4. Quiz save → preferences PATCH (+ delete localStorage path).
5. Return-context: `?next=` on lock modal + signup.
6. Cleanups: dead chip, theme unification, /me 200-anon, valuation decision, events sink.
