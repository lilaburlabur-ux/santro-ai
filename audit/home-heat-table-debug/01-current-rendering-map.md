# 01 — Current rendering map (before fix)

Rows built in `index.html` inline script (~line 1129): top-5 = links, rows 6–10 = `ds-lockrow`.

```
rows 1-5:  <tr><td>rank</td><td class="tk"><a href="/t?sym=TK">TK</a></td><td>heatbar</td><td>why</td></tr>
rows 6-10: <tr class="ds-lockrow" data-lock="table"><td>rank</td><td class="tk">TK</td><td>heatbar.ds-blur</td><td>why.ds-blur</td></tr>
```

| area | file | current behavior | expected | issue | sev | fix |
|---|---|---|---|---|---|---|
| Unlocked rows 1–5 | index.html:1130 | ONLY the ticker word is an `<a>`; rank/heatbar/why cells are dead space | whole row clickable | 3 of 4 cells are dead — row "looks active but mostly does nothing" | **P0** | full-row link (`.hp-hrow[data-href]` + delegated nav) |
| Locked rows 6–10, ANON | index.html:1133 | `data-lock="table"` → locks.js opens signup ✓ | locked + opens signup | works, but visual affordance only on non-blurred cells | P2 | keep; make whole row the target |
| Locked rows 6–10, REGISTERED | index.html:1133 + locks.js:44 | **NO href in the row.** locks.js authed-click path = `unlockAll(); return;` → un-blurs but NEVER navigates. Rows stay dead forever. | all rows clickable links | **THE reported bug: registered user's lower rows are dead** | **P0** | re-render rows as real links when authed |
| Lock band `#hh-lock` | index.html:985 | always visible, even for registered users | hidden when authed | stale lock copy for logged-in users | **P1** | hide on auth |
| Auth → table | index.html script | table built once, anon-only; never re-rendered on auth resolve | re-render/upgrade when auth known | registered user treated as anon | **P0** | `renderHeat(authed)` + `#sa-acct` detect + MutationObserver |
| Ticker URL | index.html:1130 | `/t?sym=TK` inline, ad-hoc | one helper | inconsistent, no ETF/crypto awareness | P2 | `tickerUrl()` helper |

## The eight audit questions
1. **Rows 1–5 `<a>`, rows 6+ `<div>`?** Rows 1–5 have an `<a>` only in the ticker cell; rows 6–10 are `<tr class="ds-lockrow">` with plain-text ticker (no anchor).
2. **Hard-coded preview limit?** Yes — `hot.slice(0,5)` unlocked, next 5 locked (`.slice(0,5)`). Intentional preview, but the locked half never upgrades for authed users.
3. **Auth state passed to the table?** No — the table renders once from data only; user state is never consulted.
4. **Registered user treated as anonymous?** Yes for this table — it's built before/without auth and never re-rendered.
5. **Lock copy shown for registered users?** Yes — `#hh-lock` band is static, never hidden.
6. **Ticker URLs consistent?** Ad-hoc `/t?sym=` string; locked rows have none.
7. **Rows missing hrefs?** Yes — all locked rows, and 3/4 cells of unlocked rows.
8. **Clicks blocked by overlay/pointer-events?** `.ds-blur{pointer-events:none}` on inner cells (fine — event bubbles to the `data-lock` row for anon). No z-index trap. The dead-ness is missing hrefs, not overlays.

## Root cause (one line)
The locked rows carry `data-lock` but **no link**, and the table is never re-rendered after auth resolves — so a registered user's rows 6–10 un-blur but have nothing to click; and even unlocked rows are only clickable on the ticker word.
