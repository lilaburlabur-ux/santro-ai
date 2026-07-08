# 02 — Fix report: the star belongs to the ticker

## Root cause
The watchlist pin was born inside the fair-value calculator card (the first account-aware component) and never moved when ticker pages got real heroes. Users read it as "pin this valuation." Meanwhile the stock page's share button was hardcoded to `/share?card=hot` — the generic hot-tickers card — because per-ticker cards didn't exist on /share.

## Action model shipped
**Ticker-level (in the hero, next to the name):** ☆ Add to watchlist / ★ Pinned · Create alert · Share {SYM} stock card ↗ · ⧉ Copy link.
**Valuation-level (in the result panel):** ✓ Saved to your valuation history (authed, auto) / Save valuation — free account (anon) · Share valuation card ↗.
The star ALWAYS means ticker→watchlist. It never renders inside `.sa-calc` anymore (E2E-asserted).

## What changed
| File | Change |
|---|---|
| accounts/accounts.js v17 | `window.SantroWatch` (reusable TickerWatchlistButton: variants button/icon, optimistic toggle + rollback, toast, pinned-set cache, anon → auth modal + `santro_pending_action` return context completed after login) · `window.SantroAlerts.openFor(tk)` · pin REMOVED from calc run-row (`reflectPin`/`togglePin` deleted) · valuation actions row + `wireValActs` (share payload → localStorage → `/share?type=valuation&ticker&state`) · pending `save_val` completion |
| accounts/accounts.css v9 | `.sa-watch` (pill, tokens, 44px mobile), `.sa-toast`, `.sa-valacts` |
| t.html | hero: star in the h1 title row (`#tp-watch`), actions: **Share {SYM} stock card ↗** (`/share?type=stock&ticker=SYM`), Copy link, **Create alert**; `mountTickerActions` retry mount |
| terminal.html | detail header `.d-head` gets icon-variant star (`#d-watch`) — outside the calc |
| tools/fair-value-calculator.html | selected-ticker line gets the star |
| share.html | NEW `cardStock` (ticker, company, price+move, 1D/1W/1M/1Y chips, cap/PE/volume, AI theme, industry, bubble context, brand/foot) + NEW `cardValuation` (model, assumptions, fair value, premium/discount, price, "Scenario, not a forecast") + `?type=stock|valuation&ticker=&state=` boot (context card preselected + first in gallery; `?card=` legacy intact; fname includes ticker; ecosystem.json added for eco-only tickers; state key shape-validated) |
| accounts/auth-pages.js v7 | `safeNext` now accepts same-site query paths (`/t?sym=VRT`) — still rejects `//` and any host/scheme |
| gen_nav.py | stale "blue is a secondary link color" comment corrected (blue fully forbidden since theme pass); headers regenerated |

## Evidence
- **E2E `qa/e2e_stock_flow.mjs`: 20/20** — anon star visible in hero + modal + return context {action:pin, ticker:VRT, url}; logged-in pin → persists after refresh → unpin; valuation run → Saved-to-history + Share valuation card, star NOT in calc, star still in hero; share URLs + payload (real run: eps 8.86, growth 12.5, no nulls); /share preselects "VRT stock card" (first thumb) not hot; both cards export PNG (134KB/148KB); 390px star 44px, 0 overflow.
- Regression: e2e_prefs 29/29 · stress 43/43 · colors + theme-colors clean · seo exit 0.
- Screenshots: `screenshots/hero-vrt-anon.png`, `card-stock-vrt.png`, `card-valuation-vrt.png`.

## Deliberate scope notes
- `stocks/*.html` SEO landings don't load account JS (kept lightweight for crawl); their "open in terminal / ticker page" links lead to /t which now carries the hero star. The dynamic stock detail page (/t?sym=X, all ~105 tickers) is where the journey lives.
- `valuationId` deep links (saved-history → share) deferred: the state-key path covers the run-then-share flow; history-item share is a follow-up.
- Anonymous "Save valuation" stores the payload and completes the save right after signup/login via the pending-action mechanism.
