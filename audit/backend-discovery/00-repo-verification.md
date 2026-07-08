# 00 — Repo verification

Audit date: 2026-07-08 · read-only discovery · no code changed.

## Repos (there are TWO — this product is a two-repo system)

| | Frontend | Backend |
|---|---|---|
| Repo | `lilaburlabur-ux/santro-ai` | `lilaburlabur-ux/santro-accounts` |
| Audited copy | fresh clone `/tmp/lk` @ `c281695` (2026-07-08 10:40 UTC = origin/main HEAD) | `~/santro-accounts` @ `c58abf9` (in sync with origin/main, 0 ahead / 0 behind) |
| Branch | main | main |
| Working tree | clean (fresh clone) | clean |

⚠️ The long-lived local checkout `~/ai-stock-heatmap` is **3,813 commits behind origin** (last local commit 2026-06-30; data bots commit every 1–5 min). It was NOT used for this audit — everything below was read from the fresh clone at production HEAD.

## Stack detection

| Question | Answer | Evidence |
|---|---|---|
| Frontend framework | **None — static vanilla JS/HTML/CSS**, no bundler, no SPA. 187 HTML pages, most generated (gen_nav.py, gen_etf_pages.js, gen_footer.py, gen_sitemap.py). | `package.json` — "Dev tooling only — the site itself is static (GitHub Pages)". Only devDeps: playwright, stylelint. |
| Backend framework | **FastAPI** (Python), app-factory in `app/main.py`, 12 routers | `app/main.py:66-77` |
| Database | **PostgreSQL** via SQLAlchemy 2.0 async + **Alembic** migrations (tests run on `sqlite+aiosqlite`) | `app/db.py`, `alembic/`, `tests/conftest.py:13` |
| Auth | Email+password, **httpOnly cookie sessions** (access+refresh) first-party on `api.santroai.tech`; body-token endpoints (`/auth/token`) for the planned mobile app. Google OAuth + magic-link routers exist but are **switched off** via `/auth/methods` capability discovery (never shown broken). | `app/routers/auth_password.py`, `auth_token.py`, `accounts/api.js:78` (`credentials:"include"`), `accounts/accounts.js:14-20` |
| API routing | FastAPI `APIRouter` per domain: auth_password, auth_magic, auth_oauth, auth_session, account, usage, watchlist, valuations, alerts, auth_token, devices, notifications | `app/main.py:66-77` |
| Deployment | Frontend: **GitHub Pages** (santroai.tech, CNAME). Backend: **Render** (`render.yaml`, Dockerfile) at `https://api.santroai.tech`. | `CNAME`, `render.yaml`, `accounts/config.js:29` |
| Frontend "env" | `accounts/config.js` — public config only, no secrets. Production values: `apiMode:"live"`, `apiBase:"https://api.santroai.tech"`, **`valuationProvider:"mock"`** (see 05/10 — the real endpoint doesn't exist). | `accounts/config.js` |
| Backend env files | `.env` on Render (DATABASE_URL, JWT secret, email keys). Present in deploy config; **values not read and not printed** per audit rules. | `render.yaml`, `app/config.py` |

## CORS / connectivity

`app/main.py:47-50` — CORS locked to exactly one configured frontend origin, credentials allowed. Live probe (2026-07-08, anonymous, santroai.tech/terminal): `/auth/methods` 200, `/usage/status` 200, `/account/me` 401, `/auth/refresh` 401 → backend is **live and reachable from production pages**; the 401s are the known anonymous-probe console noise.

## Verdict

- repo verified: **yes** (both, at production HEAD)
- frontend framework: static vanilla JS (GitHub Pages), generator-driven
- backend framework: FastAPI + SQLAlchemy async + Alembic
- database: PostgreSQL (Render) / SQLite in tests
- auth: cookie-session email+password (+ mobile token endpoints; OAuth/magic dormant)
- API routing: FastAPI routers, 12 domains
- safe to continue: **yes**
