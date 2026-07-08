# 03 — "Add sticker" flow audit

## Search results (both repos, case-insensitive)

| Term | Frontend hits | Backend hits |
|---|---|---|
| sticker / stickers / addSticker | **0** | **0** |
| widget / widgets | only TradingView embed class names (`tradingview-widget-container`) — a third-party chart embed, not a user widget system | 0 |
| dashboard item / layout item / custom block / terminal card | 0 (no layout system exists) | 0 |
| personalize / customize | "Customize your terminal" panel on /dashboard (`accounts/auth-pages.js:185`) | — |
| pin / save card / add card | ☆ Pin button (`accounts/accounts.js:292`) — watchlist pin; share-card download buttons on /bubble /share (client-side export, no save) | `/watchlist` POST ("pin_ticker") |
| add ticker / add to watchlist | **0 UI copy anywhere** | — |

**Conclusion: there is no sticker/widget feature in any form — not hidden, not flagged, not prototyped, not in dead code.** The word does not appear in either repo.

## What the user almost certainly encountered

The owner voice-dictates; "add sticker" ≈ **"add ticker"**. The product repeatedly *promises* an add-a-ticker/watchlist affordance and never renders a button for it:

| Where the promise appears | Exact copy | What actually exists |
|---|---|---|
| /quiz gate + output panel (`quiz.html:415-424`) | "a **suggested watchlist you can edit**", "Suggested watchlist — 10 names, **editable**", "**Editable after save**" | Nothing. Save writes localStorage and offers a link to /terminal, which shows no watchlist at all. |
| Homepage watchlist card (`index.html:1051`) | "Save up to 30 tickers. Your list opens with the terminal." | No add UI, no terminal integration, no 30 cap. |
| Watchlist modal empty state (`accounts.js:552`) | "No pinned tickers yet. **Open a stock and tap Pin**." | Sends the user hunting for a Pin button that is invisible unless (a) logged in AND (b) inside the calculator card. |
| /dashboard prefs (`auth-pages.js:194`) | "**Preferred tickers** (comma-separated)" input | Saves to `User.preferences.preferred_tickers`. **Nothing reads it. Ever.** |

## The 12 questions

1. **Backend code for stickers/widgets?** No. Nearest analog: `/watchlist` (real, tested) and `User.preferences.preferred_tickers` (real storage, zero consumers).
2. **Frontend code for stickers/widgets?** No widget system. Watchlist UI exists (modal + pin).
3. **Visible button?** No. Live probe 2026-07-08: anonymous /terminal, opened NVDA detail panel — `pinPresent:false`. The ☆ Pin renders only for authenticated users (`accounts.js:292`: `user ? '<button class="sa-pin">☆ Pin</button>' : ""`).
4. **Hidden button?** Effectively yes: ☆ Pin exists but is auth-conditional and buried inside the fair-value calculator card on 3 surfaces (terminal detail panel `terminal.html:1472`, `t.html:701`, `/tools/fair-value-calculator.html:574`). Anonymous users never see it and get no locked placeholder for it.
5. **Route/modal/drawer for adding?** The "My watchlist" modal (account menu) can only LIST/unpin/alert — it has **no add-ticker input** (`renderWatchlist`, `accounts.js:550-575`).
6. **Behind auth?** Yes — watchlist is `free` tier (`ds-v2/gates.js:14`), pin button auth-only, API `require_user`.
7. **Behind a flag?** No. `ds-v2/flags.js` is visual-only (ds_v2 skin), not feature gating.
8. **In old code only?** No old sticker code either. The dead `santro_quiz` key on /dashboard is a different orphan (see 10).
9. **In design/prototype only?** The *promises* are in shipped marketing/UI copy (quiz, homepage). No design-lab prototype for widgets exists in the repo.
10. **Referenced in copy but not implemented?** **Yes — this is the core finding.** Four separate copy locations promise an editable watchlist/personalized terminal (table above).
11. **Does it save to database?** Pins do (WatchlistItem, tested). preferred_tickers does (User.preferences). Quiz calibration does NOT (localStorage only).
12. **Does the terminal read saved stickers/widgets/watchlist?** **No.** Live probe: /terminal network calls = `/account/me`, `/auth/methods`, `/auth/refresh`, `/usage/status` only. Zero `/watchlist`, zero `/account/preferences` reads.

## File/function table

| File | Function/component | Role | Implemented? | Called by | Calls | Problem |
|---|---|---|---|---|---|---|
| accounts/accounts.js:292 | calc card template | Renders ☆ Pin (auth-only) | yes | SantroCalc.render | — | Invisible to anon; no locked placeholder; only lives inside calc card |
| accounts/accounts.js:465 | `togglePin` | pin/unpin API call | yes | ☆ Pin click | POST/DELETE /watchlist | works |
| accounts/accounts.js:474 | `reflectPin` | shows pinned state | yes | render | GET /watchlist | works |
| accounts/accounts.js:550 | `renderWatchlist` | watchlist modal rows | yes | openSaved | GET /watchlist + unpin + alerts | **No add-ticker input**; empty state points to hidden Pin |
| accounts/auth-pages.js:194 | prefs form `#ptk` | "Preferred tickers" input | yes (write) | savePrefs | PATCH /account/preferences | **No consumer of preferred_tickers** |
| quiz.html:461-495 | `save()` | "Save calibration" | write only | user click | localStorage | Promises editable watchlist; nothing created |
| terminal.html | — | should read watchlist/prefs | **missing** | — | — | Terminal reads no per-user data at all |
| ~santro-accounts/app/routers/watchlist.py | list/pin/unpin | backend CRUD | yes, tested | api.js | Postgres | healthy — underused by UI |
