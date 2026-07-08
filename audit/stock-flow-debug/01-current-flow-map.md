# 01 — Current flow map (before fix)

| area | file | current behavior | expected | issue | sev | fix |
|---|---|---|---|---|---|---|
| Stock hero title | t.html:661 | `<h1>Company · SYM</h1>` — no watchlist action anywhere in hero | ☆ Add to watchlist next to ticker identity | star buried elsewhere | **P0** | hero star (SantroWatch mount) |
| Share button | t.html:650 | `href="/share?card=hot"` — the GENERIC hot-tickers card | stock-specific card | loses ticker context entirely | **P0** | `/share?type=stock&ticker=SYM` + new cardStock renderer |
| Copy link | t.html:703 | works (clipboard + ✓ feedback) | keep | — | ok | keep |
| Star/pin | accounts/accounts.js runRowHtml (calc card only) | ☆ Pin renders inside the fair-value calculator run row, on 3 calc surfaces | star = ticker action in hero | **users think pin = valuation**; wrong hierarchy | **P0** | remove from calc; reusable TickerWatchlistButton in hero/detail/tool |
| Anonymous star | accounts.js:292 (fixed earlier to render) | visible, opens auth modal, but STILL inside calc | visible locked action near ticker | placement | P1 | hero placement + pending-action completion |
| Pinned state on load | reflectPin (calc only) | GET /watchlist reflects state in calc card | hero shows Pinned on load | placement | P1 | SantroWatch initial state w/ shared cache |
| Valuation actions | doRun (accounts.js:374) | auto-saves history for logged-in (silent, invisible); NO share action | explicit "Saved ✓" + Share valuation card | user can't see save happened; no valuation card exists | **P0** | actions row in resultsHtml + cardValuation |
| /share page | share.html RENDER registry | 8 curated cards; `?card=` param; no per-ticker, no valuation card | type=stock / type=valuation context cards | context cards missing | **P0** | add cardStock + cardValuation + type param boot |
| Alert creation | accounts.js renderAlertPanel (watchlist modal only) | reachable only via account menu → My watchlist → bell | Create alert from stock hero | discoverability | P1 | SantroAlerts.openFor(ticker) + hero button |
| Signup context | locks.js/auth-pages (fixed for ?next= paths) | safeNext REJECTS query strings (`/t?sym=VRT` fails the regex) → falls to /dashboard | return to ticker page | **P1** | allow `?`/`=`/`&`/`%` in safeNext (still block `//`) |
| Terminal detail panel | terminal.html:1500 showUniverseDetail | ticker header row, no watch action outside calc | icon star next to ticker | placement | P1 | mount in `.d-head` |
| Calculator tool | tools/fair-value-calculator.html:583 | ticker sub-line, star only in calc card | compact star next to selected ticker | placement | P1 | mount in sub-line |

## The seven audit questions
1. **Where is the star rendered?** Only inside the calculator card run-row (`runRowHtml`), on /t, terminal detail panel, and the calculator tool.
2. **Why near valuation?** Historical: the calc card was the first (only) account-aware component; the pin was bolted onto it (task #27 era). Nobody moved it when the hero shipped.
3. **Ticker or valuation?** It pins the TICKER (POST /watchlist) — correct action, wrong home. Saved valuations are separate (auto-save on run).
4. **Hidden for anonymous?** No longer (fixed in 9f31d81) — but still in the wrong place.
5. **Does the page know pinned state?** Calc card does (reflectPin). Hero doesn't — hero has no button.
6. **Does share pass ticker context?** **No — hardcoded `?card=hot`.**
7. **Does valuation share pass context?** **No such action exists.**
