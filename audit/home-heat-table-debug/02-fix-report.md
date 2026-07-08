# 02 — Fix report: home heat-table row state model

## Root cause
Two defects made lower rows dead:
1. **Unlocked rows were only clickable on the ticker word** — `<td class="tk"><a>` while the rank/heatbar/reason cells were inert. Most of the row looked active but did nothing.
2. **Locked rows carried `data-lock` but no link, and the table never re-rendered after auth resolved.** For a registered user, `locks.js` un-blurred rows 6–10 but its authed click-path is `unlockAll(); return;` — no navigation — so those rows stayed permanently dead, and the lock band never disappeared.

## Fix (index.html, one reusable builder)
- `heatRow(o)` — three explicit states, no dead rows:
  - **unlocked** → `<tr class="hp-hrow" data-href="/t?sym=TK">` with a real `<a>` in the ticker cell (keyboard/SEO) + a delegated `#hh-rows` click handler that navigates from anywhere else on the row.
  - **locked** → `<tr class="hp-hrow ds-lockrow" data-lock="table" role="button" tabindex="0">` — blurred, opens signup via locks.js.
- `renderHeat()` reads auth (`#sa-acct` present): anon = 5 unlocked + 5 locked; authed = all 10 unlocked, lock band `hidden`.
- Re-renders on auth change via `MutationObserver` on `#santro-auth-slot` — a registered user's lower rows become links and the lock copy vanishes with no manual refresh.
- `tickerUrl(tk)` helper → `/t?sym=TK` (the dynamic detail route that 200s for every ticker; `/stocks/TK` only exists for a subset). No `#`, no `javascript:void`.
- CSS: `.hp-hrow` cursor/hover/focus-visible using tokens (`--accent-soft`, `--accent-border`); ticker link is text-colored (accent only on row hover) so it never reads as a browser-blue link; mobile row padding → ≥44px tap targets.
- tokens.css v3: `.ds-v2 :focus { outline-color: var(--st-focus-ring) }` — kills the one browser-default blue focus ring (`#005FCC`) the live theme crawl found on `/etfs/vgt`; now every focus state is green.

## Behavior
- **Anonymous:** rows 1–5 full-row links; rows 6–10 blurred locked rows → signup modal "Unlock the full table" with `?next`. Lock band visible.
- **Registered:** all 10 rows full-row links → `/t?sym=…`; no blur, no lock icon, lock band hidden. Detected async, upgraded in place.
- **Mobile 375/390/430:** full-width tap rows ≥44px, no overflow.

## Evidence
- **E2E `qa/e2e_home_heat.mjs`: 13/13** — anon 5 links + row 6 locked+blurred + lock band + no bad hrefs + locked click → modal/CTA; logged-in 10 links + no locks + band hidden + lower-row (SAP) navigates; keyboard focusable link; 390px row 46.6px + 0 overflow.
- Gates: stress 43/43 · colors + theme-colors clean · seo exit 0 · stock-flow 20/20 + prefs 29/29 (regression, prior runs).
- Screenshot: `screenshots/anon-hero-card.png` (rows 1–5 live, 6–10 blurred, lock band).

## Remaining
- Rows are capped at 5+5 by the current data slice; the lock copy says "6–25" but only 5 preview rows render (design choice — full 25 is a terminal feature). Not a dead-row issue; noted for a future "show 25" pass.
