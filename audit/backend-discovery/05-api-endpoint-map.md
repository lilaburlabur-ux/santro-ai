# 05 — API endpoint map (backend `santro-accounts`, served at api.santroai.tech)

Auth column: 🔒 = `require_user` (cookie/bearer), 👤 = optional user, open = none.
Callers = production frontend (`accounts/api.js` route table + call sites). Machine-readable copy: `05-api-endpoint-map.json`.

| Method | Path | File | Purpose | Auth | Callers (frontend) | DB writes | DB reads | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| POST | /auth/register | auth_password.py:55 | create account (+consent, profile fields) | open | signup page, auth modal | User, AuthIdentity, EmailToken | User | **active** | instant-access flow; then auto-login |
| POST | /auth/login | auth_password.py:136 | password login → cookies | open | signup/signin/modal | RefreshToken | User | **active** | |
| POST | /auth/verify-email | auth_password.py:106 | verify token | open | auth-pages (link landing) | User | EmailToken | active | email sending blocked on Brevo key (user-side) |
| POST | /auth/resend-verification | auth_password.py:119 | resend | open | — | EmailToken | User | **unused by web** | no UI button found |
| POST | /auth/request-password-reset | auth_password.py:156 | reset mail | open | signin (only if methods.password_reset) | EmailToken | User | dormant | hidden until email backend live |
| POST | /auth/reset-password | auth_password.py:187 | set new pw | open | reset landing | User | EmailToken | dormant | |
| POST | /auth/magic/request · /verify | auth_magic.py | magic link | open | modal (only if methods.magic_link) | EmailToken/RefreshToken | User | dormant by design | capability-gated off; never rendered broken |
| GET | /auth/google/login · /callback | auth_oauth.py | OAuth | open | only if methods.google | User/AuthIdentity | — | dormant by design | not configured; button never shown |
| POST | /auth/refresh | auth_session.py:24 | rotate session cookie | cookie | api.js silent-retry on 401 | RefreshToken | RefreshToken | **active** | source of anon 401 console noise (probe on every page load) |
| POST | /auth/logout | auth_session.py:49 | kill session | cookie | account menu, dashboard | RefreshToken | — | **active** | |
| POST | /auth/token · /refresh · /revoke | auth_token.py | body-token trio (mobile) | open/token | **none (web)** | RefreshToken | User | **frontend missing (by plan)** | built for iOS app; unused until app ships |
| GET | /account/me | account.py:37 | current user | 🔒 | every page w/ accounts.js | — | User | **active** | anon → 401 (known noise; backend could return 200-anon) |
| PATCH | /account/profile | account.py:42 | onboarding profile | 🔒 | dashboard "Save profile" | User | User | **active** | |
| GET | /account/preferences | account.py:57 | terminal prefs (merged defaults) | 🔒 | dashboard form load ONLY | — | User | **active but orphaned** | ⚠️ never called by /terminal — the whole point of the endpoint |
| PATCH | /account/preferences | account.py:64 | save prefs delta | 🔒 | dashboard "Save preferences" | User.preferences | User | **active** | write-only in practice; no consumer renders the result |
| POST | /account/consent | account.py:81 | ToS/privacy consent | 🔒 | register flow | User | — | active | |
| GET | /account/export | account.py:94 | GDPR export | 🔒 | **none** | — | all user tables | **backend only** | no UI |
| DELETE | /account/ | account.py:117 | delete/anonymize | 🔒 | **none** | all | all | **backend only** | no UI — legal gap to close eventually |
| GET | /usage/status | usage.py:53 | runs remaining | 👤 + X-Santro-Anon | calc render | — | UsageCounter | **active** (live 200 ✓) | |
| POST | /usage/run | usage.py:67 | consume a run (402 gate) | 👤 + X-Santro-Anon | calc "Run" | UsageEvent/Counter | UsageCounter | **active** | 402 → register gate UI |
| GET | /watchlist | watchlist.py:17 | list pins | 🔒 | reflectPin, watchlist modal | — | WatchlistItem | **active** | healthy |
| POST | /watchlist | watchlist.py:30 | pin (idempotent) | 🔒 | ☆ Pin | WatchlistItem | WatchlistItem | **active** | no size cap (homepage says 30) |
| DELETE | /watchlist/{ticker} | watchlist.py:51 | unpin | 🔒 | modal ×, ☆ toggle | WatchlistItem | WatchlistItem | **active** | |
| GET/POST | /valuations | valuations.py:40,53 | history list/save | 🔒 | calc save, history modal | SavedValuation | SavedValuation | **active** | |
| GET/PATCH/DELETE | /valuations/{id} | valuations.py:73-98 | single item | 🔒 | delete only | SavedValuation | SavedValuation | active (PATCH unused) | |
| GET/POST/PATCH/DELETE | /alerts[…] | alerts.py | alert CRUD | 🔒 | watchlist modal bell | Alert | Alert | **active** | |
| GET/POST/DELETE | /devices[…] | devices.py | push device registry | 🔒 | **none (web)** | Device | Device | **frontend missing (by plan)** | iOS app blocked on Apple enrollment |
| GET · POST /read | /notifications | notifications.py | alert inbox | 🔒 | **none (web)** | Notification | Notification | **frontend missing (by plan)** | |
| GET | /auth/methods | (auth) | capability discovery | open | every page w/ accounts.js | — | — | **active** (live 200 ✓) | the reason no broken auth button ever renders |
| POST | **/valuation/run** | **DOES NOT EXIST** | server-side valuation | — | referenced by `api.js:58,276` (`RealValuation.run`) | — | — | **backend missing** | Why prod runs `valuationProvider:"mock"`. Frontend switch exists; endpoint never shipped. |

## Frontend-only "endpoints" (no backend at all)

| Flow | Where it should call the API | What it does instead |
|---|---|---|
| Quiz calibration save | PATCH /account/preferences (exists!) | localStorage `santro_calibration` |
| Analytics events | a collector endpoint | localStorage `santro_events` (capped 200) |
| Stress-test save | (promised on homepage) | nothing — no save exists |

## Danger / duplicate scan

- No dangerous endpoints found (delete is auth-scoped + GDPR-intentional; CORS locked to one origin; anon metering shape-validated `usage.py:38-48`).
- Duplicate risk: `/auth/refresh` exists in both cookie flavor (auth_session) and token flavor (auth_token) — intentional (web vs mobile), not a bug.
