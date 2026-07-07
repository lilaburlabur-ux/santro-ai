# Three Landing Concepts for Santro AI

All three obey the house rules: heat = attention not direction; bubble risk = context not prediction; stress = hypothetical scenario; quotes delayed ~15 min; no buy/sell language; no fake urgency.

---

## Concept A — "AI Bubble Terminal Preview" (data-first hero)

**Benchmarks it borrows from:** Finviz (data as homepage), CNN F&G (headline gauge + components), MarketChameleon (tease-then-lock), Santiment (time-gated history), CoinMarketCap (market tape).

- **Headline:** *The AI trade is crowded. See where.*
- **Subheadline:** *Santro measures attention, crowding and valuation pressure across 84 AI stocks, 40 ETFs and AI crypto — one terminal, updated through the day. Hot means attention, not direction.*
- **Above-the-fold layout (desktop, wide):**
  - Thin top tape: AI universe aggregates (universe move, hottest theme, Bubble Index delta) + "Quotes delayed ~15 min" chip.
  - Left column (~40%): headline, subheadline, credibility bar ("84 tickers · 7 themes · 40 ETFs · 6 stress scenarios"), primary + secondary CTA, one-line trust row ("Filing-verified research · Not financial advice").
  - Right column (~60%): live terminal card — AI Bubble Risk gauge (today's value + 7-day sparkline) stacked over Hot Tickers table (rows 1–5 full: ticker, heat, 1-line reason; rows 6–10 visible but blurred with a subtle padlock and "Rows 6–25 — free account").
- **Primary CTA:** `Open the terminal`
- **Secondary CTA:** `See today's Bubble Index` (anchors to gauge module)
- **Visible before signup:** gauge + components, top-5 hot tickers with reasons, full bubble map on /terminal, theme strip, 1 sample "why moving," sample-portfolio stress (1 scenario).
- **Locked:** rows 6–25, full why-moving, history >30d, scenarios 2–6, watchlist/alerts/saves/exports/share cards.
- **After signup:** full tables, saved watchlist, alerts, saved stress tests, full scenario breakdowns, share-card export, digest opt-in.
- **Mobile:** gauge card first (one number renders perfectly on 380px), then top-5 list, then locked-row block, CTAs sticky at bottom. Map demoted to a "view map" link.
- **Pros:** kills the school-project feel instantly; proves the product before asking anything; locked rows create reg pressure at the moment of interest; SEO-safe (data pages stay open).
- **Cons:** hero quality is hostage to data pipeline quality — a stale or empty table is worse than a quiz; needs graceful market-closed states.
- **Conversion strength:** High for account creation among genuinely interested visitors; highest retention (index = daily habit, CNN F&G proof).
- **Implementation difficulty:** Medium — components exist in /terminal and /bubble today; work is composition, lock states, and modal wiring.

---

## Concept B — "Market Profile Unlock" (diagnostic, done like an adult)

**Benchmarks:** iShares goal-picker (segmentation without personas), Simply Wall St (post-signup profiling), Kubera (confident voice).

- **Headline:** *How is your AI exposure positioned?*
- **Subheadline:** *A 4-step exposure check across universe, concentration, valuation sensitivity and crowding — scenario outputs, not advice.*
- **Above-the-fold layout:** left = headline + the 4 steps listed as instrument labels (Universe → Exposure → Valuation lens → Risk watch); right = a live preview of the OUTPUT (a configured terminal snapshot: preset watchlist, bubble gauge, theme weights) so the reward is visible before the first question. No progress bar, no personas, no emoji. Selector chips styled like terminal filters, not quiz cards.
- **Primary CTA:** `Run the exposure check`
- **Secondary CTA:** `Skip — open the terminal`
- **Visible before signup:** all 4 steps + a partial result (your heat-map focus + top 3 relevant tickers).
- **Locked:** the full profile (saved preset dashboard, suggested watchlist of 10, theme weighting, matching stress scenario) unlocks on account creation — because saving *requires* an account, which is a true statement, not a trick.
- **After signup:** terminal opens pre-configured to the profile; watchlist pre-seeded (editable); relevant alerts suggested.
- **Mobile:** steps become 4 sequential full-width cards; output preview collapses to the top-3 ticker list.
- **Pros:** cheapest to build (restyle existing quiz); collects segmentation data that genuinely improves activation; softest landing for cold traffic that doesn't know what a bubble terminal is.
- **Cons:** still a form before value — the exact pattern that produced the current problem; one styling misstep and it's the same quiz in a suit; weakest SEO story.
- **Conversion strength:** Medium signup rate, good activation quality for those who finish; highest bounce risk at step 1.
- **Implementation difficulty:** Low.

---

## Concept C — "Portfolio Stress Hook" (skin-in-the-game hero)

**Benchmarks:** Portfolio Visualizer (run-tool-first, register-to-save), Snowball (demo portfolio), MarketChameleon (partial result, locked breakdown).

- **Headline:** *If the AI trade cracks, what happens to your portfolio?*
- **Subheadline:** *Run six historical crash scenarios against your AI exposure. Hypothetical scenarios, not forecasts. Quotes delayed ~15 min.*
- **Above-the-fold layout:** left = headline + input panel (paste tickers/weights OR pick a sample: "Mag-7 heavy," "AI ETF core," "AI crypto tilt"); right = result preview panel showing the sample's Scenario 1 (e.g., "Dot-com 2000 replay: −34% modeled drawdown") as a bar chart, with scenarios 2–6 listed by name, values blurred, padlock + "Full breakdown — free account."
- **Primary CTA:** `Run a stress test`
- **Secondary CTA:** `Open the terminal`
- **Visible before signup:** sample portfolios fully runnable for scenario 1; custom input allowed with scenario-1 aggregate result only.
- **Locked:** scenarios 2–6 per-position breakdown, saving the test, re-running with edits, alerts on your exposure heat, share card of results.
- **After signup:** full 6-scenario breakdown per position; test saved to dashboard; "watch these holdings" one-click; share card.
- **Mobile:** sample-portfolio picker first (typing weights on a phone is misery), scenario result full-width, locked list below.
- **Pros:** highest-intent hook in the set — personal stakes beat market curiosity; the lock lands *after* a personalized taste, the strongest position in the funnel; naturally produces watchlists (their holdings).
- **Cons:** heaviest compliance surface (every number needs "hypothetical scenario" framing and clean methodology notes); custom-input parsing is real engineering; anonymous users pasting portfolios raises privacy questions to answer up front; narrower top-of-funnel (assumes visitor holds AI exposure).
- **Conversion strength:** Highest signup rate per visitor who engages; smaller share of visitors engage.
- **Implementation difficulty:** Medium-high (input parsing, per-position scenario math exposure, privacy note).

---

## Recommendation (and the honest trade-off)

**Ship A as the homepage. Embed C as section 3–4 of that homepage (sample-portfolio version only). Rebuild B's logic as post-signup onboarding.**

- A wins because Santro's differentiation is the *market view*, not the tool — and A is the only concept that fixes the "school project" perception on sight, protects SEO, and builds the daily-return habit (index pattern).
- C is the best *converter* but the worst *front door* — as a mid-page module it captures the high-intent segment without narrowing the funnel.
- B's data is valuable but its placement was the original sin. Post-signup, the same questions become a feature ("calibrate your terminal") instead of a gate.

Counter-case, stated plainly: if analytics later show homepage visitors ignore the map but hammer the stress tool, promote C to hero and demote the map — the architecture below supports swapping heroes without a rebuild.
