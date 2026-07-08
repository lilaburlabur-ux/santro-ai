# 09 — User journey traces

## Flow A — open terminal → choose content preference → terminal updates

**Expected**: /terminal → (somewhere obvious) choose what to see → terminal reflects it now and on every future visit.

**Actual code sequence**:
1. /terminal renders 100% from static JSON (universe/data/hot_tickers/news/bubble_index) + `santro-theme`. No customization control exists ON the terminal (zero `[data-lock]`, zero settings UI, no "customize" button).
2. The choose-UI lives two clicks away, only for authed users: account chip → "⚙ Account & settings" → /dashboard → "Customize your terminal" panel.
3. Save → `PATCH /account/preferences` → Postgres ✅ ("Preferences saved.")
4. "← Back to terminal" link → /terminal reloads → **fetches nothing user-specific** (live probe: only /account/me, /auth/methods, /usage/status) → identical page.

**Missing steps**: terminal boot never calls `GET /account/preferences`; no render logic consumes `show_*`/`default_terminal_view`/`preferred_tickers`.
**Broken link**: step 3→4. Data reaches the DB and dies there.
**Files**: terminal.html (missing consumer), accounts/auth-pages.js:185-228 (working producer), app/routers/account.py:57-77 (working API), accounts/api.js:110-111.

## Flow B — add sticker/widget → appears → save → reload → persists

**Expected**: a visible "Add sticker/widget" button on the terminal.

**Actual**: **The feature does not exist** — 0 occurrences of sticker/widget concepts in either repo (03). Nearest real path (watchlist pin):
1. Be logged in. 2. Open a ticker detail (bubble click on /terminal, or /t?sym=X). 3. Inside the fair-value calculator card, click ☆ Pin → `POST /watchlist` ✅. 4. View list: account chip → "★ My watchlist" → modal ✅ persists across reloads/devices.
- Anonymous: Pin is **not rendered** (no locked placeholder) — nothing to click.
- Nothing pinned ever appears **on** the terminal itself.
- No add-by-typing exists anywhere; the modal is list-only.

**Missing steps**: any visible entry point; anon locked state; terminal watchlist module.
**Files**: accounts/accounts.js:292,465-476,550-575; app/routers/watchlist.py (healthy).

## Flow C — anonymous clicks locked customization → signup → returns to same action → saved

**Actual sequence (live + code verified)**:
1. Homepage locked row click → `.ds-gate` modal "Unlock the full table" ✅ (live).
2. locks.js stores `santro_return` = path#elementId ✅.
3. Modal CTA → `/signup` (**no `?next=`**) → account created → auto-login → **hard redirect to /dashboard** (auth-pages.js:89).
4. User is now on /dashboard, NOT back at the locked table. `santro_return` is only consumed if they navigate back to the original page themselves (locks.js:47-58 then scrolls to the element and un-blurs).
5. The /quiz variant: gate CTA → /signup → /dashboard → user must find /quiz again; when they do, MutationObserver unlocks it in place ✅.

**Verdict**: signup works, unlock works, but the **return leg is manual**. `?next=` support exists on /signin only.
**Files**: ds-v2/locks.js:26,34,47-58; accounts/auth-pages.js:80-110.

## Flow D — registered user updates preferences → refreshes → persists

1. /dashboard form seeded from `GET /account/preferences` ✅ (merged defaults).
2. Save → PATCH ✅ → refresh /dashboard → values come back from Postgres ✅ (backend tests prove round-trip; form re-seeds on every render).
3. …and that is the entire universe in which those preferences are visible. Any other page: no effect. Cross-device: values sync (they're server-side) but still render nowhere.

**Verdict**: persistence WORKS; application of the persisted state is the missing product.

## Summary table

| Flow | Write path | Read path | User-visible result |
|---|---|---|---|
| A dashboard prefs → terminal | ✅ tested | ❌ none | "I saved and nothing changed" |
| A' quiz calibration → terminal | ⚠️ localStorage only | ❌ none | same, plus lost on device switch |
| B sticker/widget | — | — | feature absent; pin hidden for anon |
| C lock → signup → return | ✅ | ⚠️ manual return only | user stranded on /dashboard |
| D prefs persistence | ✅ | ✅ (dashboard form only) | works, but pointless until A is built |
