# 01 — Implementation report: preferences → terminal wiring (first shippable pass)

Base: frontend `8ff10a2` → this commit. Backend `c58abf9` **untouched** (full suite re-run: 54/54).

## What shipped

**Copy truth pass (Phase 1)** — no page promises a missing feature anymore:
- index.html:1051 watchlist card → "Pin tickers to your watchlist. Your list opens with the terminal, sorted by the day's move." (now TRUE — the strip ships in this commit; chips sort by |1D move|)
- index.html:1086 "saved stress tests" → "saved valuations, your terminal setup" (both real)
- ds-v2/lock-copy.js modal_body: "saved stress tests" → "saved valuations" (+ marketing-research/locked-state-copy.md annotated)
- quiz.html meta/OG/gate: "configured terminal snapshot / suggested watchlist you can edit" → "saves terminal preferences to your account — default view and focus sectors, applied on /terminal" (TRUE as of this commit); preview row "Suggested watchlist" → "Ideas to pin … from the terminal watchlist strip"
- "sticker/widget": zero occurrences before and after; vocabulary is Add ticker / Pin to watchlist / Customize terminal.

**Preferences consumer (Phase 2)** — NEW `accounts/prefs.js` (v1): `window.SantroPrefs {DEFAULTS, SECTION_PREF, load, apply, normalize, reset, getPreferredTickers, getVisibleSections, current}`. DEFAULTS mirror backend `DEFAULT_PREFERENCES`; normalize validates enums/booleans/ticker shape; 401→defaults silently, other failures→defaults + console.warn; page-lifetime cache; explicit light/dark account theme seeds `SantroTheme` once.

**/terminal wiring (Phase 3)** — terminal.html:
- `data-pref-section` markers: stocks→bubble map, news→News panel, research→Key takeaways, bubble_risk→daily brief, watchlist→new strip; calculator enforced at the `SantroCalc.render` guard (no marker element needed).
- Boot: public render unchanged and never blocked; after accounts.js settles auth (so anonymous visitors trigger ZERO extra API calls), prefs load → sections hidden per `show_*` → strip renders → `default_terminal_view` scrolls its section into view. Auth-change observer arms AFTER boot (no duplicate-render race).
- `show_crypto`/`show_etfs` have no terminal section; the dashboard labels them "don't have a terminal section yet" instead of pretending.

**Customize (Phase 4)** — `⚙ Customize` button in the topstrip (desktop + mobile ≥44px). Authed → `/dashboard?next=/terminal`; anonymous → lock modal "Save your terminal setup" with next-carrying signup/signin CTAs.

**Add ticker / Pin (Phase 5)** — watchlist strip on /terminal: pinned chips (mono, pill, price move, × remove, click opens the bubble), preferred-ticker suggestion chips (+ to pin), "＋ Add" input with uppercase normalization + datalist typeahead + clean invalid/duplicate/error states; authed empty state invites the first add; anonymous state is a visible locked strip (never nothing). ☆ Pin on calculator cards now renders for EVERYONE (anon click → auth modal; was: hidden).

**Dashboard (Phase 6)** — save message: "Saved — your terminal now uses these settings." + "View on terminal →"; Reset-to-defaults button (PATCHes backend defaults); toggle labels renamed to the real terminal sections; VIEW select limited to views the terminal honors; preferred-tickers labeled as feeding the strip; sectors labeled "terminal highlighting coming soon"; dead `santro_quiz` profile chip REMOVED (old deleted quiz's key).

**Quiz (Phase 7)** — "Save calibration" now PATCHes `/account/preferences` (mapping: risk="Bubble Index"→default view `bubble`, universe="AI stocks"→`stocks` else `all`; universe→`preferred_sectors`; additive — never hides sections). localStorage `santro_calibration` write REMOVED (+ both legacy keys cleaned on save). Success: "Saved to your terminal preferences." Gate CTAs carry `?next=/quiz`.

**Return context (Phase 8)** — lock modals append `?next=<current page>` to signup AND signin; /signup honors safe `next` like /signin (hard "/dashboard" redirect gone); signin↔signup cross-links preserve next; `safeNext` hardened: dots allowed, protocol-relative `//…` explicitly rejected (was only safe by accident).

**Valuation truth (Phase 9)** — `RealValuation` + the `/valuation/run` route entry DELETED from api.js (endpoint never existed in the backend); `valuationMode` reports "local"; config.js comment states math is client-side. E2E asserts a calculator run issues no such request.

## Tests & gates (all green before push)

| Gate | Result |
|---|---|
| NEW `qa/e2e_prefs.mjs` — full local stack (repo frontend on :8000 + santro-accounts on :8011, throwaway sqlite, synthetic user) | **29/29** — prefs affect terminal + persist across refresh; add/duplicate/invalid/persist/remove ticker; anon locked strip + Customize modal with next; signup?next returns to origin; anon default render; prefs-API-failure fallback; zero /valuation/run requests; 390px overflow 0 + 44px targets |
| qa_stress.js | 43/43 |
| stylelint / audit:colors | clean |
| seo_audit.py (landing guard v2) | exit 0, guard OK |
| Backend pytest (untouched) | 54/54 |
| Syntax | node --check on all edited JS + every inline block |

## Files changed
`accounts/prefs.js` (NEW) · `accounts/api.js` v13 · `accounts/accounts.js` v16 · `accounts/auth-pages.js` v6 · `accounts/config.js` · `terminal.html` · `quiz.html` · `index.html` · `ds-v2/locks.js` v2 · `ds-v2/lock-copy.js` v2 · `gen_nav.py` (v2 include bumps → header regenerated on 187 pages) · `marketing-research/locked-state-copy.md` (truth annotation) · `qa/e2e_prefs.mjs` (NEW) · version references bumped in all including pages (assert-checked).

## Explicitly NOT done (honest scope)
- Stickers/widgets: not a feature; not built (per instruction).
- No backend/schema change; no watchlist 30-cap (copy no longer claims one).
- preferred_sectors terminal highlighting: labeled coming soon.
- crypto/etf terminal sections: labeled "not on the terminal yet".
- Events analytics still localStorage-only (separate decision).
