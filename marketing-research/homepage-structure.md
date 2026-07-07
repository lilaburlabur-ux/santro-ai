# New Santro Homepage — First Screen Spec + Full Structure

Style constants: ds_v2 dark terminal green, wide desktop grid, tabular figures, one padlock token, no emoji, no persona cards, no progress bars. Every data module carries the "delayed ~15 min" chip and the footer keeps "Hot means attention, not direction. Not financial advice."

---

## PART 1 — The first screen (replaces the quiz)

Desktop layout (1280+):

```
┌────────────────────────────────────────────────────────────────────────┐
│ TAPE: AI universe +1.8% · Hottest theme: Data-Center Power · Bubble    │
│ Index 71 (+3 d/d) · Quotes delayed ~15 min                    [Sign in]│
├──────────────────────────┬─────────────────────────────────────────────┤
│ H1  The AI trade is      │  ┌ AI BUBBLE RISK ──────────────┐           │
│     crowded. See where.  │  │   71 / Elevated   ▁▂▄▅▆ 7d   │           │
│                          │  │   valuation · momentum ·      │           │
│ Sub: Santro measures     │  │   crowding                    │           │
│ attention, crowding and  │  └───────────────────────────────┘           │
│ valuation pressure       │  HOT AI TICKERS          heat   why          │
│ across 84 AI stocks,     │  1 NVDA ████████ 94  guidance chatter        │
│ 40 ETFs and AI crypto.   │  2 SMCI ███████  88  export-probe report     │
│ Hot means attention,     │  3 MU   ██████   81  memory-cycle fears      │
│ not direction.           │  4 PLTR ██████   79  contract headlines      │
│                          │  5 AVGO █████    74  AI capex read-through   │
│ 84 tickers · 7 themes ·  │  6 ▒▒▒▒ ▒▒▒▒▒ 🔒                            │
│ 40 ETFs · 6 scenarios    │  7 ▒▒▒▒ ▒▒▒▒▒ 🔒  Rows 6–25 — free account  │
│                          │                                              │
│ [ Open the terminal ]    │                                              │
│ [ See today's Bubble     │                                              │
│   Index ]                │                                              │
│ Filing-verified research │                                              │
└──────────────────────────┴─────────────────────────────────────────────┘
```

Rules: right panel renders real delayed data server-side (never a screenshot); locked rows show real ticker symbols with blurred values; padlock is 12px, muted; market-closed state swaps tape to "As of Friday's close."

### 10 headline / subheadline / CTA combinations

1. **The AI trade is crowded. See where.** / Attention, crowding and valuation pressure across 84 AI stocks, 40 ETFs and AI crypto — in one terminal. / `Open the terminal` + `See today's Bubble Index`
2. **Track the heat behind the AI bubble.** / Daily heat scores, crowding signals and bubble-risk context. Hot means attention, not direction. / `Open the terminal` + `View hot tickers`
3. **The AI bubble terminal.** / One screen for the whole AI trade: stocks, ETFs, crypto, hot tickers, stress scenarios, bubble risk. Quotes delayed ~15 min. / `Open the terminal` + `Run a stress test`
4. **See what the AI market is crowding into.** / 84 AI names across 7 themes, ranked by attention — with the sourced reason each one is moving. / `See the heat table` + `Open the terminal`
5. **Hot means attention, not direction.** / Santro measures where money and attention concentrate in the AI trade — you judge the risk. / `Open the terminal` + `See the Bubble Index`
6. **Every bubble leaves a data trail.** / Crowding, valuation pressure and narrative rotation across the AI market, updated through the day. / `Follow the trail` + `Open the terminal`
7. **How crowded is your AI exposure?** / Run six historical crash scenarios against your portfolio. Hypothetical scenarios, not forecasts. / `Run a stress test` + `Open the terminal`
8. **The AI market, measured.** / Heat, crowding and bubble-risk signals on 84 stocks, 40 ETFs and AI crypto — free to explore. / `Open the terminal` + `See today's heat`
9. **One dial for the whole AI trade.** / The AI Bubble Index blends valuation, momentum and crowding into a single daily risk gauge. / `See today's reading` + `Open the terminal`
10. **Before the narrative gets crowded.** / Track attention flows across AI stocks, ETFs and crypto — with filing-verified research, not vibes. / `Open the terminal` + `Read the research`

(1 is the default; 9 is the strongest index-led variant for campaigns; 7 pairs with Concept C traffic.)

---

## PART 2 — Full homepage structure

### 1. Hero / terminal preview
- **Purpose:** prove the product in 3 seconds; kill the quiz memory.
- **Copy:** combo #1 above + credibility bar.
- **Layout:** split hero per diagram.
- **Visible:** Bubble gauge, top-5 hot tickers + reasons, tape.
- **Locked:** rows 6+ (blurred, padlock).
- **CTA:** `Open the terminal` / `See today's Bubble Index`.
- **Mobile:** gauge card → top-5 list → locked block → sticky CTA bar.

### 2. AI Bubble Index preview
- **Purpose:** establish the proprietary metric (the CNN F&G play — the thing people quote and revisit).
- **Copy:** "One dial for the whole AI trade. Valuation, momentum and crowding — weighted, published, updated daily. Risk context, not a crash prediction."
- **Layout:** big gauge left; 30-day history chart center; component list right (component names + today's direction arrows).
- **Visible:** value, trend, component names, methodology link.
- **Locked:** component sub-scores, history >30d ("History beyond 30 days — free account").
- **CTA:** `Track the index` (creates alert → signup).
- **Mobile:** gauge, then components as accordion; history chart 30d fixed.

### 3. Hot tickers preview
- **Purpose:** the core daily table; first lock encounter.
- **Copy:** "Hot means attention, not direction. Every mover ships with a sourced reason — tweets are leads, filings are sources."
- **Layout:** full-width table, 5 open rows, 5 blurred rows, footer link "See all 25 in the terminal."
- **Visible:** rank, ticker, heat bar, reason line (top 5).
- **Locked:** rows 6–25 values; full reason text beyond line one.
- **CTA:** row click → ticker page; lock click → signup modal.
- **Mobile:** cards instead of table rows; 3 open + 2 blurred.

### 4. AI universe map preview
- **Purpose:** the shareable visual; breadth proof ("not one trade anymore").
- **Copy:** "The AI trade moves through compute, power, cloud, software, ETFs and crypto. 84 bubbles, sized by cap, colored by heat."
- **Layout:** wide interactive map (hover = ticker + move); theme legend doubles as filter chips.
- **Visible:** entire map + theme heat strip.
- **Locked:** nothing on the map itself (distribution asset); "save this view" requires account.
- **CTA:** `Explore the full map` → /terminal.
- **Mobile:** static pre-rendered map image linking to terminal (perf), theme strip scrollable.

### 5. Portfolio stress hook (Concept C embedded)
- **Purpose:** convert high-intent holders; the strongest signup lever.
- **Copy:** "If the AI trade cracks, what happens to your portfolio? Six historical scenarios. Hypothetical, not a forecast."
- **Layout:** sample-portfolio picker (3 presets) left; scenario-1 result bar chart right; scenarios 2–6 named with blurred values + padlock.
- **Visible:** preset portfolios, scenario-1 full result.
- **Locked:** scenarios 2–6, custom portfolio input, saving.
- **CTA:** `Run it on your portfolio — free account`.
- **Mobile:** preset picker → result → locked list; input form deferred to post-signup.

### 6. Watchlist & alerts unlock
- **Purpose:** show the retention loop; frame the account as a workflow upgrade.
- **Copy:** "Your AI universe, watched. Save up to 30 tickers, set level and heat alerts, get the daily brief when it launches."
- **Layout:** three quiet feature cards (Watchlist / Alerts / Digest-coming-soon) with a mini mock of a watchlist row.
- **Visible:** feature explanation + honest status ("Email brief — coming soon, opt-in").
- **Locked:** all three are account features by nature.
- **CTA:** `Create a free account`.
- **Mobile:** stacked cards.

### 7. Research credibility section
- **Purpose:** separate Santro from vibes-Twitter; ARK/Stratechery play.
- **Copy:** "Filing-verified research. Burry's disclosed AI puts, position by position. Aschenbrenner's 13F, tracked quarterly. Ten AI IPO filings on EDGAR watch. Tweets are leads; filings are sources."
- **Layout:** three research cards (Burry Short Watch / Aschenbrenner Basket / IPO Watch) + latest research-feed note with timestamp.
- **Visible:** cards, current headline holdings, one full note.
- **Locked:** change-alerts and history timelines ("Get filing-change alerts — free account").
- **CTA:** `Read the research`.
- **Mobile:** horizontal scroll cards.

### 8. Share card / social proof section
- **Purpose:** distribution engine + honest social proof (no fake counts).
- **Copy:** "Terminal-grade market cards. Post the day's heat, your stress result, or the Bubble Index — sourced and timestamped."
- **Layout:** 3 example share cards rendered from today's real data; beneath, a plain trust row: data sources, methodology links, @SantroAI.
- **Visible:** card previews (watermarked).
- **Locked:** exporting your own card.
- **CTA:** `Make a card` → tool → export lock.
- **Mobile:** single card carousel.
- **Note:** no invented user counts, no fake testimonials. Until real numbers exist, proof = methodology + sources + the product itself.

### 9. Registration CTA band
- **Purpose:** one calm, final ask.
- **Copy:** "Free account: full tables, watchlists, alerts, saved stress tests. Pro later: faster refresh and deeper history — when it's ready, not before."
- **Layout:** single band, two lines, one button. No countdown, no confetti.
- **CTA:** `Create free account`.
- **Mobile:** identical.

### 10. Footer
- Keep current footer structure (it's already correct): terminal/tools/research/themes/company columns, disclaimers ("Quotes delayed ~15 min. Real-time data planned for Pro. Not financial advice."), privacy/terms, X link, iOS-coming-soon honesty. Add: methodology page link + data-sources page link (stockanalysis.com pattern). The Exposure Check (reframed quiz) lives here under Tools — not above the fold.
