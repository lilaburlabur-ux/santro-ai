# 06 — Persistence map

## Storage layers in play

| Layer | Where | Real? |
|---|---|---|
| PostgreSQL (Render) | santro-accounts via SQLAlchemy async + Alembic | ✅ real, migrated, tested (16/16 prefs+saved-data tests pass) |
| Static JSON files (market data) | santro-ai repo root, bot-committed every 1–5 min | ✅ real, but global — identical for all users |
| localStorage | six+ keys, see below | ✅ real but device-local, and one key is orphaned, one is dead |
| In-memory Mock backend | `accounts/api.js` `Mock` object | dev/demo only — **NOT active in production** (`apiMode:"live"`) |
| sessionStorage / IndexedDB / cookies (frontend-set) | — | none (cookies are httpOnly, set by API) |

## Entity table

| Entity | Schema/model file | Fields (key ones) | Used by endpoints | Used by frontend | Persistence real? | Notes |
|---|---|---|---|---|---|---|
| User | models.py:38 (`users`) | email, password_hash (via AuthIdentity), display/first/last name, professional_status, trading_experience, main_market_interest, consent…, **preferences JSON** | /auth/*, /account/* | signup, signin, dashboard | ✅ | `preferences` = the terminal-customization store; write-only in practice |
| TerminalPreference | = `User.preferences` JSON (schemas.py:152 PreferencesIn) | show_stocks/crypto/etfs/news/research/bubble_risk/fair_value_calculator/watchlist, show_all_data, default_terminal_view, theme, preferred_sectors[≤50], preferred_tickers[≤200] | GET/PATCH /account/preferences | dashboard form only | ✅ saved / ❌ **never read by the terminal** | THE broken flow |
| Watchlist | models.py:169 `watchlist_items` | user_id FK cascade, ticker(20), created_at, **unique(user,ticker)** | /watchlist CRUD | ☆ Pin + modal | ✅ wired | no 30-item cap despite homepage copy |
| Alert | models.py:209 `alerts` | ticker, kind(price_above/below, pct_up/down), threshold, active, last_triggered_at | /alerts CRUD | watchlist modal bell | ✅ wired | client eval while page open + server evaluator for future push |
| SavedValuation | models.py:185 `saved_valuations` | ticker, inputs JSON, fair_value, premium_pct, created_at | /valuations CRUD | calc save + history modal | ✅ wired | |
| SavedStressTest | **does not exist** | — | — | promised at `index.html:1086` ("saved stress tests") | ❌ | fake promise — nothing anywhere |
| Sticker / Widget / DashboardLayout | **does not exist** | — | — | — | ❌ | no trace in either repo |
| ShareCard | none (by design) | — | — | client-side canvas export | n/a | no persistence intended |
| Session/Auth | models.py:102 RefreshToken, 82 AuthIdentity, 122 EmailToken | rotating refresh tokens, identity per provider, one-time email tokens | /auth/* | cookie-transparent | ✅ | httpOnly first-party cookies on api.santroai.tech |
| Usage/metering | models.py:139 UsageEvent, 155 UsageCounter | subject (user or X-Santro-Anon id or IP), window counts | /usage/* | calculator | ✅ wired | live-verified 200 |
| Device | models.py:234 `devices` | platform, push_token unique | /devices | none (web) | ✅ backend-only | for iOS app |
| Notification | models.py:251 `notifications` | alert firings, pushed_at | /notifications | none (web) | ✅ backend-only | |
| Subscription/Plan | **does not exist** | — | — | "Santro Pro — coming soon" (honest) | ❌ | Pro tier is copy-only; gates.js has "pro" values but nothing resolves to pro |

## localStorage keys (frontend persistence)

| Key | Written by | Read by | Verdict |
|---|---|---|---|
| `santro-theme` | nav.js SantroTheme, terminal toggle | every page (theme) | ✅ healthy — but conflicts with account `preferences.theme`, which nothing applies |
| `santro_calibration` | quiz.html:491 | **nobody** | ⚠️ orphaned write — flow #2's second half |
| `santro_quiz` | OLD deleted quiz | dashboard profile chip (auth-pages.js:138) | ☠️ dead key — chip can never show a profile again |
| `santro_anon_id` | api.js:25 | api.js → X-Santro-Anon header | ✅ healthy (metering) |
| `santro_events` | ds-v2/events.js | **nobody** (no sink) | ⚠️ analytics go nowhere; capped 200 so no leak |
| `santro_return` | ds-v2/locks.js:34 | locks.js (same page revisit) | partial — see 08 (signup never redirects back) |
| `SANTRO_API_BASE` | dev override only | config.js | ✅ dev convenience |

## The one-sentence summary

Postgres persistence is real and healthy for everything that has an endpoint; the product's gaps are (a) features promised with **no entity at all** (stress-test saves, widgets/stickers), and (b) entities that are **written but never read by the surface they were built for** (User.preferences → terminal, santro_calibration → anything).
