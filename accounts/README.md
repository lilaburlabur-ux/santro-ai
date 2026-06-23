# Santro Accounts — frontend

The gated fair-value calculator + user accounts for santroai.tech. It **extends
the existing terminal** (vanilla static site) — no framework, no build step,
reuses `index.html`'s design tokens and night-mode aesthetic.

## Files

| File | Role |
|------|------|
| `config.js` | The "env" — `apiMode`, `apiBase`, `valuationProvider`. No secrets. |
| `api.js` | **The one API module.** Auth / usage / watchlist / valuations, the valuation provider (mock↔real), centralized 401 (refresh→login) and 402 (gate→register). Also a dev in-memory backend so the UX runs with no server. |
| `accounts.css` | Components (modal, calculator, sensitivity grid, gate, skeletons) using `site.css`/`index.html` tokens. |
| `accounts.js` | UI: auth modal (Google / magic link / email+password + verify + reset), header state, the calculator on the Selected-stock card, watchlist + history, gating. Exposes `window.SantroCalc.render(t)`. |

## How it's wired into the terminal

Three small hooks in `index.html` (nothing restyled):

1. `<link rel="stylesheet" href="accounts/accounts.css?v=1">` in `<head>`.
2. `config.js`, `api.js`, `accounts.js` after `site.js`.
3. One line at the end of `showUniverseDetail(t)`:
   `if(window.SantroCalc) SantroCalc.render(t);`

The header "Sign in" / account control auto-mounts into `.topbar .right`.

## Configure (no hardcoded hosts, no secrets)

Edit `config.js` (or inject `window.SANTRO_CONFIG` before it loads):

```js
window.SANTRO_CONFIG = {
  apiMode: "live",                      // "live" → real backend; "mock" → in-memory demo
  apiBase: "https://api.santroai.tech", // backend origin (empty = same origin)
  valuationProvider: "real",            // "real" → POST {apiBase}/valuation/run; "mock" → local
};
```

**Mock → real is one line each** (`apiMode`, `valuationProvider`). The valuation
endpoint can lag the rest: keep `valuationProvider:"mock"` (typed local DCF) and
flip it to `"real"` the moment `/valuation/run` ships — nothing else changes.

## Running against the backend

The frontend assumes **cookie sessions** (httpOnly, Secure) — it never reads or
stores tokens; every request is `credentials:"include"`. So the backend must:

- **CORS**: allow this site's exact origin with `allow_credentials=true`
  (`FRONTEND_ORIGIN` in the FastAPI service).
- **Cookies**: for cross-site (`santroai.tech` → `api.santroai.tech`) set the
  session cookies `SameSite=None; Secure`. (Same-site or same-origin can use `Lax`.)
- Expose: `POST /auth/register|login|magic/request|magic/verify|verify-email|
  request-password-reset|reset-password`, `GET /auth/google/login` +
  `/auth/google/callback`, `GET /account/me`, `POST /auth/refresh|logout`,
  `GET /usage/status`, `POST /usage/run`, `watchlist` + `valuations` CRUD.
  Route paths live in one map at the top of `api.js` if yours differ.

Local dev: serve this folder's parent (`python3 -m http.server 8000`) and run the
backend with `FRONTEND_ORIGIN=http://localhost:8000` (cookie mode:
`COOKIE_SECURE=false COOKIE_SAMESITE=lax`). Then point the UI at it **without
editing anything** — open:

```
http://localhost:8000/?santro_api=http://localhost:8088
```

(`?santro_api=<base>` or `localStorage.SANTRO_API_BASE` flips `apiMode` to live.)
Use the **same host** for both (e.g. `localhost`), not `localhost` ↔ `127.0.0.1`,
so the cookies count as same-site.

> **Verified end-to-end** against the FastAPI backend (cookie-access mode):
> anonymous metering → real 402 wall → register/login → cookie session restored
> across reload → real watchlist + saved-valuation CRUD. The backend reads the
> access token from the httpOnly `santro_access` cookie, so no tokens live in JS.

Want to demo with **no backend at all**? Leave `apiMode:"mock"` — the static
reads, metering wall, gate, sign-in, watchlist and history all work in-memory.

## The product split (free vs gated)

- **Public, no signup** — every stock shows the static *"Fair value $X, ±N% vs
  fair value (Lynch/PEG basis)"*. Client-side, un-metered, SEO-safe.
- **Metered/interactive** — "Run valuation" → reverse-DCF, premium, the
  "what's priced in" growth line, and the growth×discount sensitivity grid.
  Remaining runs come from `GET /usage/status` (never hardcoded). On the wall,
  `POST /usage/run` returns 402 → a register prompt that sells unlimited runs +
  saved watchlist + history (not a bare paywall).
- **Signed-in** — edit assumptions (growth, discount) and re-run, pin tickers,
  and every run is saved to history (re-openable).
- **No earnings** — `storyStockFlag` renders *"Story stock — no earnings,
  valuation N/A"* with bear-case framing. Never a fake premium.

## Brand & UX

Reuses the terminal's tokens and components. "Not financial advice" on every
output; premiums/priced-in growth are framed as **conditions, not instructions**;
skeletons (never bare "Loading…"); the last result is cached per ticker so the
panel never resets to a placeholder on a data refresh. Responsive + keyboard
accessible (Esc closes the modal, focus moves to the first field). All data flows
go through `api.js`, so an iOS client can reuse the same contract.
