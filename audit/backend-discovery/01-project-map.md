# 01 — Project map (relevant files only)

## Frontend — `lilaburlabur-ux/santro-ai` (static, GitHub Pages)

```
/
├─ index.html                  Homepage (Concept A: tape, gauge, hot-5, locked rows 6-10)
├─ terminal.html               THE terminal (/terminal): bubble map, tape, hot tickers,
│                              news, SpaceX IPO, daily brief, detail panel w/ calculator
├─ dashboard.html              /dashboard — account page; hosts "Customize your terminal"
│                              panel (rendered by accounts/auth-pages.js). Private, noindex.
├─ quiz.html                   /quiz "Exposure Check" — 2nd customization UI (calibration)
├─ signin.html / signup.html   Auth pages (rendered by accounts/auth-pages.js)
├─ t.html / e.html / c.html    Stock / ETF / crypto detail (t.html mounts calculator+Pin)
├─ stocks.html crypto.html etfs.html news.html ipos.html research.html
│                              Section list pages (static data render)
├─ bubble.html                 Bubble Index + stress test + share-card renderer v3
├─ share.html                  /share — share-card gallery/export (client-side canvas)
├─ tools/fair-value-calculator.html   Standalone calculator (mounts SantroCalc)
├─ stocks/*.html etfs/*.html hot-tickers/*.html ipos/*.html blog/*.html
│                              ~155 generated SEO detail pages (no account features)
│
├─ accounts/                   ★ ALL user-account frontend code
│  ├─ config.js                Public config: apiMode:"live", apiBase, valuationProvider:"mock"
│  ├─ api.js                   window.SantroAPI — full REST client + dev Mock backend +
│  │                           valuation provider switch (Mock ↔ Real) + anon metering id
│  ├─ accounts.js              window.SantroCalc — header auth slot, account menu, auth
│  │                           modals, calculator card, ☆ Pin, watchlist/alerts/valuations
│  │                           modals, client-side alert loop
│  └─ auth-pages.js            /signup /signin /dashboard page controllers;
│                              "Customize your terminal" preferences form lives here
│
├─ ds-v2/                      Design system + product chrome
│  ├─ gates.js                 Gating matrix (feature → anon|free|pro) — single source
│  ├─ locks.js                 Lock click → signup modal; unlock-in-place on auth
│  ├─ lock-copy.js             Approved lock microcopy (incl. UNUSED save_view line)
│  ├─ events.js                Analytics queue → localStorage ONLY (no backend sink)
│  ├─ flags.js                 ds_v2 design flag (visual only, not feature gating)
│  └─ tokens/primitives/shell/remap.css   Visual system (not product logic)
│
├─ nav.js + gen_nav.py         Generated header/nav (single source); static auth slot
├─ gen_sitemap.py, seo_audit.py, gen_etf_pages.js, gen_footer.py   Generators/guards
├─ universe.json data.json hot_tickers.json bubble_index.json crypto.json
│  ecosystem.json news.json ipos.json research/research.json
│                              ★ The DATA layer of the site: bot-written static JSON,
│                              refreshed by cron (fetch*.py) every 1–5 min
├─ qa/                         Playwright audit harness (qa_routes, audit_browser)
└─ qa_stress.js                43-test stress-test gate
```

## Backend — `lilaburlabur-ux/santro-accounts` (FastAPI on Render)

```
app/
├─ main.py                     App factory; CORS (single origin, credentials); 12 routers
├─ models.py                   User (incl. preferences JSON), AuthIdentity, RefreshToken,
│                              EmailToken, UsageEvent, UsageCounter, WatchlistItem,
│                              SavedValuation, Alert, Device, Notification
├─ schemas.py                  Pydantic: PreferencesIn/Out (+DEFAULT_PREFERENCES,
│                              merged_preferences), RegisterIn, WatchlistItemIn/Out, …
├─ deps.py                     require_user / get_optional_user
├─ security.py, cookies.py, auth_flow.py, ratelimit.py, config.py, db.py
├─ routers/
│  ├─ account.py               /account: me, profile, preferences (GET/PATCH), consent,
│  │                           export (GDPR), delete
│  ├─ watchlist.py             /watchlist: list, pin (idempotent), unpin
│  ├─ valuations.py            /valuations: list, save, get, patch, delete
│  ├─ alerts.py                /alerts: list, create, patch, delete
│  ├─ usage.py                 /usage: status, run (X-Santro-Anon metering)
│  ├─ auth_password.py         register, login, verify-email, resend, reset ×2
│  ├─ auth_session.py          refresh, logout (cookies)
│  ├─ auth_token.py            body-token trio for mobile
│  ├─ auth_magic.py            magic link (dormant — email backend unverified)
│  ├─ auth_oauth.py            Google OAuth (dormant — not configured)
│  ├─ devices.py               push-device registry (mobile; unused by web)
│  └─ notifications.py         notification inbox (unused by web)
├─ services/                   users, metering, tokens, push, alert_evaluator
└─ emailer/                    email backends (Brevo pending user-side key)
tests/                         13 suites incl. test_profile_prefs.py, test_saved_data.py
alembic/                       migrations
```

## Where state lives (summary — detail in 06/07)

- **Server truth**: Postgres via the models above (registered users only).
- **Client truth**: localStorage — `santro-theme`, `santro_calibration` (quiz, orphaned),
  `santro_anon_id` (metering), `santro_events` (analytics queue), `santro_return` (lock
  return-context), `SANTRO_API_BASE` (dev override), `santro_quiz` (DEAD key, old quiz).
- **Market data**: bot-written static JSON files, same for every visitor. The terminal
  renders exclusively from these + theme; it reads NO per-user state (see 04).
