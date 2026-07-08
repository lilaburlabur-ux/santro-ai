# 04 — Terminal customization flow

There are **two separate customization UIs**. Both save. **Neither is ever read back into the terminal.** The break is not in the backend — it's the missing read/apply path on `/terminal`.

## UI #1: /dashboard "Customize your terminal" (account-backed)

Copy shown to the user: *"Choose what shows up, your default view and theme. **Saved to your account.**"* — toggles for Stocks/Crypto/ETFs/News/Research/Bubble-risk/Calculator/Watchlist, default terminal view, theme, preferred tickers, preferred sectors (`accounts/auth-pages.js:32-34,185-197`).

| # | Step | File / function | Expected | Actual | Status | Bug risk |
|---|---|---|---|---|---|---|
| 1 | Preference UI | auth-pages.js `renderDashboard` | form renders saved values | ✅ reads `GET /account/preferences` on load | exists and works | — |
| 2 | Frontend state | none (plain DOM read on save) | — | fine for a form | exists and works | — |
| 3 | API request | auth-pages.js:225 `savePrefs` | PATCH on click | ✅ `API.updatePreferences(body)` | exists and works | — |
| 4 | Backend endpoint | account.py:64 `update_preferences` | merge patch | ✅ delta-merge over stored JSON | exists and works | — |
| 5 | Validation | schemas.py:152 `PreferencesIn` | reject junk | ✅ `extra="forbid"`, typed enums, list caps (50/200) | exists and works | — |
| 6 | DB write | models.py:57 `User.preferences` JSON | persist | ✅ **proven: `pytest tests/test_profile_prefs.py tests/test_saved_data.py` → 16/16 pass (run 2026-07-08)** | exists and works | — |
| 7 | DB read | account.py:57 + `merged_preferences` | defaults ⊕ saved | ✅ | exists and works | — |
| 8 | **Terminal fetch** | should be in terminal.html | fetch prefs (or SantroAPI cache) on load | ❌ terminal.html contains **zero** references to SantroAPI/preferences. Live probe: no `/account/preferences` request from /terminal. | **missing** | **This is the break** |
| 9 | **Terminal rendering logic** | should hide/show sections per `show_*`, order per `default_terminal_view`, feature `preferred_tickers` | ❌ layout is hard-coded; every visitor gets the identical page | **missing** | **This is the break** |
| 10 | Cache/revalidation | — | n/a | no cache layer exists; nothing stale — nothing is fetched at all | missing (moot) | — |
| 11 | Auth/session | api.js `_fetch` | cookie + silent refresh | ✅ works (401→refresh→retry); /dashboard redirects anon to /signin?next=/dashboard (live-verified) | exists and works | — |
| 12 | localStorage | nav.js `SantroTheme` | — | ⚠️ theme is ALSO a saved account pref; site only honors `localStorage santro-theme`. Two sources of truth, account one dead. | saves but not read | medium |
| 13 | Feature flags | ds-v2/flags.js | — | visual skin only; does not gate customization | n/a | — |
| 14 | Error handling | savePrefs catch → "Couldn't save your preferences." | ok | ✅ but **misleading success**: "Preferences saved." is true yet implies the terminal will change; it won't | exists but misleading | UX P0 |

## UI #2: /quiz "Exposure Check" calibration (gated, account-adjacent)

Copy: *"the output is a configured terminal snapshot: a preset dashboard and a suggested watchlist you can edit"*; output panel lists "Preset dashboard / Suggested watchlist / Default risk view".

| # | Step | File / function | Expected | Actual | Status |
|---|---|---|---|---|---|
| 1 | Gate for anon | quiz.html `#xc-gate` | zero questions in DOM | ✅ live-verified (0 chips in DOM, gate visible) | exists and works |
| 2 | Auth detect | quiz.html MutationObserver on `#santro-auth-slot` | unlock in place | ✅ | exists and works |
| 3 | 4-step picker + preview | quiz.html `build/preview` | preview from universe.json | ✅ (top-10 by mcap preview) | exists and works |
| 4 | Save | quiz.html:491 `save()` | persist to the ACCOUNT (endpoint exists!) | ❌ writes `localStorage santro_calibration` only; **never calls `PATCH /account/preferences`** | local only |
| 5 | Read-back | anything | terminal/preset applies picks | ❌ repo-wide grep: `santro_calibration` has **zero readers** | saves but not read |
| 6 | Cross-device | — | account-backed | ❌ lost on another browser; also lost forever if localStorage cleared | local only |
| 7 | Suggested watchlist creation | — | create WatchlistItems or show editable list | ❌ nothing is created; "Open your terminal" CTA leads to the un-personalized terminal | missing |

## Root cause statement

The write pipeline (form → PATCH → Postgres → merged read-back into the same form) is **healthy and tested**. The product is broken because **no consumer exists**: `terminal.html` was built as a static, identical-for-everyone page and was never taught to (1) fetch `/account/preferences` (or the quiz calibration), (2) apply `show_*` / `default_terminal_view` / `preferred_tickers` to its sections, or (3) render the watchlist. The quiz additionally saves to the wrong store (localStorage) even though the right endpoint exists.
