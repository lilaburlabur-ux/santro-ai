# 07 — Frontend state map

## What state management exists

No framework, no store library, no react-query/swr, no router — this is a static multi-page site. State is:

| Mechanism | Instances |
|---|---|
| Module-scoped variables (IIFE closures) | `accounts/accounts.js`: `user`, `ctx` (selected ticker), `usage`, `_px` price cache (45 s TTL), `_alerts`; `accounts/api.js`: `ANON_ID`; per-page inline scripts (terminal chart state, quiz picks) |
| localStorage | 7 keys — see 06. The only cross-page state that exists. |
| DOM-as-state | auth is detected by *presence of `#sa-acct` in the DOM* (`locks.js:10`, `quiz.html authed()`); lock state = `.ds-blur` class |
| Server state | cookies (httpOnly) + Postgres, fetched ad hoc, no client cache/invalidation layer |
| Full page reloads | every navigation; nothing survives except localStorage and cookies |

## The eight questions

1. **Where does terminal customization state live?**
   In THREE unconnected places: ① `User.preferences` (Postgres, written by /dashboard form), ② `localStorage santro_calibration` (written by /quiz), ③ nowhere at render time — terminal.html consults none of them (its only personal read is `santro-theme`, line 1835).

2. **Does changing preference trigger save?**
   Yes for /dashboard (PATCH /account/preferences on "Save preferences" — verified path + backend tests). Yes-but-wrong-store for /quiz (localStorage only despite the endpoint existing).

3. **Does changing preference trigger terminal rerender?**
   **No.** Not on next visit either. There is no code path from either preference store to the terminal DOM. This is the answer to "I choose things and the terminal doesn't update" — nothing was ever wired to update it.

4. **Is there stale cache?**
   No — worse: there is no fetch at all. Nothing to be stale. (Static market JSON is cache-busted with `?t=Date.now()`, that side is fine. The 45 s `_px` price cache in accounts.js is healthy.)

5. **Is there route refresh?**
   Full page loads everywhere, so every visit is a clean chance to apply prefs — the terminal just never takes it.

6. **Anonymous vs logged-in mismatch?**
   Yes, by construction: the terminal renders identically for both (live-probed). The only authed differences on /terminal are the header account chip and the ☆ Pin inside the calc card. A paying-attention registered user sees their "saved" customization change nothing — trust-destroying.

7. **Is localStorage fighting the database?**
   Twice. ① **Theme**: `preferences.theme` (account, "Match system/Light/Dark") vs `santro-theme` (localStorage, actually honored by nav.js/SantroTheme). Saving "Light" to your account does nothing on any page. ② **Calibration vs preferences**: two customization vocabularies (quiz picks vs show_* toggles) in two stores with no reconciliation and no reader.

8. **Duplicate state?**
   - `santro_quiz` (dead) vs `santro_calibration` (orphaned) — dashboard chip reads the dead one (`auth-pages.js:138`).
   - Auth state = `user` variable in accounts.js closure AND `#sa-acct` DOM sniffing in locks.js/quiz — works, but fragile coupling (documented: locks.js polls 20×500 ms for it).
   - Usage meter mirrored in `usage` var + server counters — server wins on every render, fine.

## Missing pieces a rebuild must add (forward-pointer to REBUILD_PLAN)

- One client module (e.g. `accounts/prefs.js`) that resolves **effective preferences** = DEFAULTS ⊕ account prefs (if authed) ⊕ nothing else, exposes `SantroPrefs.get()`, and is called by terminal.html at boot.
- One decision on calibration: quiz should PATCH the same `/account/preferences` (mapping picks → show_*/default_terminal_view/preferred_tickers), then delete `santro_calibration` entirely.
- Theme unification: account theme (if set) seeds `santro-theme` on login.
