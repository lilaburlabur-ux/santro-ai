# DIAGNOSIS — plain English

**One sentence: the backend is real and healthy; the frontend saves user choices into it correctly; and then no page — above all the terminal — ever reads those choices back, while the site's own copy promises in four places that it does.**

1. **Is the backend actually broken, or is the frontend not wired?**
   The backend is NOT broken. Watchlist, alerts, valuations, profile, preferences: all real FastAPI + Postgres, auth-scoped, validated, and passing their own tests (16/16 for preferences + saved data, run today). The live API answered correctly during probes. The frontend is half-wired: every WRITE path works, the READ/APPLY paths into the product were never built.

2. **Is "add sticker" implemented anywhere?**
   No. The word "sticker" appears zero times in both repos. There is no widget/layout/sticker system, hidden or otherwise. What exists nearby: a ☆ Pin (watchlist) button, and a "Preferred tickers" text input on /dashboard whose value nothing consumes. ("Add sticker" is almost certainly voice-dictation for "add ticker.")

3. **Why is there no visible "add sticker" button?**
   Because (a) the feature it gestures at (add ticker to watchlist by typing) was never built — the watchlist can ONLY be fed by the ☆ Pin, and (b) that Pin is rendered ONLY for logged-in users, ONLY inside the fair-value calculator card, on 3 surfaces. Anonymous users get nothing — not even a locked button. Meanwhile the watchlist modal's empty state says "Open a stock and tap Pin", and the quiz promises an "editable" watchlist. The product points at a button it doesn't render.

4. **Why does the terminal not update after user choices?**
   Because terminal.html is a static page that renders the same bot-generated JSON for every human on earth. It fetches zero user data — live-probed: its only API traffic is auth probing and usage metering. Both customization UIs (dashboard preferences, quiz calibration) write to stores the terminal has never heard of.

5. **Is data saved to backend?**
   Dashboard preferences, watchlist pins, alerts, saved valuations, profile: YES (Postgres, tested). Quiz calibration: NO — localStorage only, even though the right endpoint exists. Stress tests: NO storage exists despite homepage copy claiming "saved stress tests."

6. **Is data read back into terminal?**
   No. Nothing user-specific is read by /terminal. Preferences are read back only by the /dashboard form that wrote them.

7. **Cache/revalidation issue?**
   No. There is nothing to go stale — the fetch was never written. (Static market data is aggressively cache-busted; that layer is fine.)

8. **Is auth blocking the flow?**
   Auth works (cookies, refresh, gates, redirect). Two auth-adjacent gaps: the Pin renders nothing for anonymous users instead of a locked state; and after signup users are hard-redirected to /dashboard instead of back to the action that triggered signup (the `next` param exists on /signin only; lock modals don't pass it).

9. **Is mock/prototype code pretending to be real?**
   Mostly no — the one config-level truth to know: `valuationProvider:"mock"` in production, because the frontend's "real" valuation endpoint (`/valuation/run`) **does not exist in the backend**. The math is genuine client-side DCF/PE/Graham/PEG — numbers aren't fake, they're just computed in the browser. The in-memory Mock backend in api.js is dev-only and inert in prod. The FAKE things are copy, not code: quiz "configured terminal snapshot", homepage "saved stress tests", "your list opens with the terminal."

10. **Top 10 root causes**
    1. terminal.html never fetches or applies `/account/preferences` (the flagship break).
    2. Quiz saves calibration to localStorage instead of the existing preferences endpoint; zero readers.
    3. No watchlist module on the terminal, contradicting homepage copy.
    4. No "add ticker by typing" affordance anywhere; watchlist only feedable via a hidden, auth-only Pin.
    5. Pin renders nothing for anonymous users (no locked state), while other copy points at it.
    6. Marketing/UI copy shipped ahead of features in 4+ places (quiz gate, dashboard panel header, homepage watchlist card, "saved stress tests").
    7. Two competing theme stores; account theme never applied.
    8. Signup flow drops return-context (lands on /dashboard; `next` only on signin; lock modal passes nothing).
    9. Dead `santro_quiz` key still drives the dashboard profile chip (old deleted quiz).
    10. Analytics events have no sink, so none of these funnel breaks are measurable.

11. **What must be rewritten?**
    Nothing large. The terminal needs a NEW preferences-consumer module (fetch → apply show_*/view/tickers → render watchlist strip). The quiz save function needs its storage swapped (localStorage → PATCH preferences). That's wiring, not rewriting.

12. **What can be fixed safely (small, independent)?**
    Copy fixes (remove "saved stress tests", soften quiz/watchlist promises until real); locked Pin for anon; `?next=` passthrough on lock modal + signup; dashboard chip removal; theme unification; `/valuation/run` decision (delete RealValuation or ship endpoint); events sink.

13. **What should be deleted?**
    `santro_quiz` chip block (auth-pages.js:136-149); `save_view`/`map_save_view` gate+copy entries (or build the feature); `RealValuation` + `valuationRun` route entry if the endpoint won't ship; eventually the api.js Mock into its own file.

14. **What should be tested?**
    - E2E (Playwright, against a staging account): save prefs → reload /terminal → sections hidden/shown accordingly; pin → terminal watchlist strip shows it; quiz save → prefs PATCHed → terminal reflects.
    - Backend: already well-tested; add a watchlist 30-cap test if the cap becomes real.
    - Regression guard: a qa script asserting terminal.html contains a `SantroPrefs.apply` call (so the wiring can't silently vanish), and a copy-guard forbidding promises of features absent from gates.js.

**Bottom line for the owner**: you don't have a broken backend — you have a backend that was built, tested, and then never plugged into the product's face. The fix is one new frontend module plus five small honesty patches, not a rebuild of the API.
