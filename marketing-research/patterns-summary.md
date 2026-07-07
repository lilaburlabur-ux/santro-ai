# Landing-Page Pattern Extraction — What 66 Financial Platforms Actually Do

Source: `50-platform-benchmark.md` (38 live-verified July 8, 2026; rest documented). Every claim below names the platform it came from.

---

## 1. Best above-the-fold hooks

- **Real data as the hero.** Finviz (https://finviz.com) opens with live signal tables and a heat map — zero marketing copy. Token Terminal (https://tokenterminal.com) puts an actual Ethereum income statement in the hero. Portfolio Visualizer shows a "Top 10 Lazy Portfolios" table with real YTD/1Y/3Y returns. The message: *the product doesn't need to be described, it's already running.*
- **One proprietary number.** CNN Fear & Greed and alternative.me's crypto version prove a single gauge with a name drives daily return traffic. Earnings Whispers built a 25-year business on the "whisper number." TipRanks on the "Smart Score."
- **Search-first hero.** stockanalysis.com: "Search for a stock to start your analysis" + trending tickers. Lowest-friction first interaction in the set.
- **Thesis-as-tagline.** TradingView: "The best trades require research, then commitment." Quartr: "Numbers are easy. Understanding is hard." Kubera: "The balance sheet for those who manage their own wealth." A sentence with a worldview beats a feature list.
- **Demo-before-signup.** Simply Wall St ("View Portfolio demo") and Snowball Analytics ("Live-demo") let anonymous users click a real, populated product.

## 2. Best data-preview patterns

- **Full table, capped rows** — CryptoRank shows "1–10 from 11 · View All"; TipRanks cuts top-analyst lists after N rows. You see the shape of the data and exactly what you're missing.
- **Populated demo state** — Snowball's public demo portfolio; Dune's public dashboards. Anonymous users interact with real numbers, not screenshots.
- **Market tape / global stats strip** — CoinMarketCap and CryptoRank pin total cap, dominance, volume to the top of every page. Cheap, persistent "this is alive" signal.
- **Setup visible, payoff hidden** — MarketChameleon's trade-idea cards show market price vs. theoretical value, then lock the actual trade behind "UNLOCK TRADE IDEA!". The numbers you CAN see prove the numbers you can't are real.
- **Component breakdown under a headline number** — CNN F&G shows the 7 inputs behind the gauge; alternative.me publishes its 5-factor weights. Transparency makes an index quotable.

## 3. Best locked-data patterns

- **Blurred premium columns with a badge** — GuruFocus: table renders fully, premium cells blurred with a small badge. The table's structure stays honest.
- **Time-range gating** — Santiment: free users see charts with restricted date ranges (history capped). Maps perfectly to "historical heat locked."
- **Row-cut with a count** — TipRanks/CryptoRank: "22 more rows" beats a vague lock. Specificity converts.
- **Headline visible, body locked** — WSJ/Barron's/Seeking Alpha article walls; Morningstar shows the star rating but locks the analyst rationale. Direct template for locked "Why is this moving?" notes.
- **Quota, not blur** — TradingView (indicators/alerts count), Fiscal.ai (AI queries), Portfolio Visualizer (runs). Feels like fair use, not confiscation.
- **One-segment-free sampling** — Nansen makes Solana data free while other chains require signup: a whole vertical as free sample.

## 4. Best registration hooks

- **Save-state** — the dominant honest hook. TradingView (save layout), Finviz (portfolio/screens), Dune (fork a query), TIKR (watchlist). You register to *keep* something you already made.
- **Capacity freemium** — Sharesight: free up to 10 holdings, 1 portfolio. Numbers make the deal legible.
- **Alerts** — Simply Wall St (valuation/earnings alerts), TipRanks, Benzinga. Registration = delegation of attention.
- **Named artifact for email** — ARK's "Big Ideas 2026" report; Zacks' "7 Strongest Buys for July"; Messari's quarterly reports. A dated, named deliverable outperforms "join our newsletter."
- **Return-to-context** — Earnings Whispers' signup modal explicitly promises "Create a watchlist, receive weekly calendars and daily summaries" — signup framed as unlocking the exact page you're on.

## 5. Best onboarding flows

- **Goal-picker, not persona quiz** — iShares filters 350+ funds through "Focus on income / Maximize growth / Navigate risk." It collects the same signal as a quiz but reads as a professional filter, not a personality test.
- **Post-signup personalization** — Simply Wall St asks investor-type questions AFTER registration, where the data improves the product rather than blocking the door.
- **Template-first** — Koyfin drops new users into prebuilt dashboards to modify, rather than an empty state.
- **Activation checklist framing** — Snowball: "Start in just a couple of minutes" with broker-connect as the single first action.

## 6. Best dashboard previews

- Token Terminal and Quartr: real product screenshots in dark UI, actual tickers/numbers, no lorem-ipsum charts.
- Simply Wall St: product *video* of the portfolio view in the hero.
- DefiLlama/Finviz: the landing *is* the dashboard — nothing to preview because you're already inside.
- TIKR: rotating full-resolution screenshots of five core workflows (financials, gurus, screener, transcripts, valuation).

## 7. Best watchlist/alert hooks

- Yahoo Finance's star icon on every ticker row — the affordance is ambient, so the reg prompt appears at the exact moment of intent.
- Simply Wall St: "daily alerts on earnings, dividends, valuation changes... act decisively when it counts" — alerts sold as decisiveness, not notifications.
- Benzinga Pro sells *speed* of alerts as the paid tier — free alerts exist, faster ones cost. Honest urgency.
- CryptoRank ties alerts to token-unlock dates: event calendars make alerts self-evidently useful.

## 8. Best calculator/tool hooks

- Portfolio Visualizer: tools run anonymously, registration saves results. The canonical run-first pattern.
- GuruFocus: DCF calculator + a whole /calculators tree as SEO honeypots feeding premium.
- Sharesight/NerdWallet: every calculator variant gets its own SEO landing page (CAGR, CGT, dividend).
- Finbox: fair-value gauge free, full model assumptions locked — valuation as tease.
- investor.gov: plain-language field labels ("Step 1: Initial Investment") — the tone benchmark for tools that must feel educational, not advisory.

## 9. Best social proof / trust patterns

- **Logo walls that mean something:** Quartr ("700+ financial institutions" incl. Perplexity, Yahoo), Token Terminal (Bloomberg, Morgan Stanley, Google), TipRanks (broker integrations: Nasdaq, IBKR, eToro).
- **Radical transparency:** ARK publishes daily trades; alternative.me publishes index weightings; DefiLlama is open-source. Show your working = trust without age.
- **Compliance as design:** Finviz's plain footer line "Quotes delayed 15 minutes for NASDAQ, NYSE and AMEX"; MarketChameleon's "Market Data Delayed 15 Minutes"; Simply Wall St's AFSL licensing block. The disclosure itself signals seriousness.
- **Named-human testimonials with roles:** The Diff quotes a hedge-fund manager and fintech founder by role; Kubera quotes Kevin Rose and the Morning Brew CEO. Anonymous five-star widgets do nothing.
- **Methodology pages:** CNN F&G components; Earnings Whispers' data page; TipRanks' backtest disclaimer. Even the hype-forward players publish method.

## 10. Best paywall/blur patterns

- GuruFocus blurred columns (structure visible, values hidden).
- Santiment time-range caps (recent free, history paid — or inverse).
- MarketChameleon teaser-numbers-then-lock cards.
- Stratechery/The Diff free-weekly + paid-daily cadence split.
- Dune's export/private gating: viewing free, *taking it with you* costs.
- Rule from the winners: the lock must sit on **depth, persistence, or speed** — never on the headline fact.

## 11. Worst patterns to avoid (named)

- **Wallmine's forced signup wall** after N page views — kills SEO, breeds spite registrations.
- **Zacks' popup gauntlet** — welcome-gift modal ("7 Strongest Buys for July!") before you've read a word; 1998-era tables under ALL-CAPS buy buttons.
- **Motley Fool's countdown-discount theater** and curiosity-gap headlines ("5 Stocks... 3 Actions... in a Pricey Market").
- **Empower's tool-bait-then-phone-call** — free dashboard requires full account linking, then advisors call you. Tools as lead-gen bait erodes trust.
- **Earnings Whispers' "75.0% average annual return for A+ stocks"** — performance claims Santro must never imitate (and legally shouldn't).
- **TipRanks' meter fatigue** — locks on nearly every module plus discount coupons = premium product, discount-store feel.
- **Macrotrends' ad interstitials** — great data undercut by junk ads.
- **Seeking Alpha's re-subscription nagging** — every visit is a negotiation.

## 12. What looks premium (observed traits)

Dark, restrained palettes with one accent (Token Terminal, Quartr, Delta); dense-but-aligned tables with tabular figures; real numbers in every screenshot; a thesis sentence instead of adjectives (Kubera, Quartr); institutional logo walls; methodology and disclosure text set calmly in the footer, not hidden; confident pricing stated flat (Kubera: "$250 a year. Whether you have $250K or $2.5 billion."); monospace/terminal typography cues used sparingly.

## 13. What looks cheap (observed traits)

Countdown timers and coupon banners (TipRanks 30%-off ribbons, Fool sales); stacked popups (Zacks); ALL-CAPS CTAs with exclamation marks ("UNLOCK TRADE IDEA!"); stock photos of smiling people pointing at laptops (Empower's lifestyle carousel — works for mass-market retirement, fatal for a terminal); ad slots inside data tables (Macrotrends); "as seen on" walls of low-tier media; red/green casino gradients; performance-claim headlines.

## 14. What looks too childish

Persona quizzes with illustrated cards and emoji (Santro's current "What kind of AI-market trader are you?" with a 🔥 Narrative-trader card is the live example); gamification points/candies in a research context (CoinGecko candies are fine for CoinGecko's audience, wrong for a terminal); progress bars with confetti; mascots; "Which stock are YOU?" framing. Note the contrast: iShares collects identical segmentation data through a sober goal-picker.

## 15. What looks too enterprise/boring

AlphaSense, FactSet, LSEG: no product visible, demo-gated everything, abstract value language ("decision intelligence," "workflow solutions"), corporate stock imagery. Conversion requires talking to sales. Quartr flirts with this but rescues itself with beautiful product shots and a free app. Santro must keep self-serve energy: the terminal is one click away, always.

---

## Counter-evidence file (so we don't drink our own Kool-Aid)

1. **Locked data is not free money.** The most-loved brands in the set (DefiLlama, stockanalysis.com, Macrotrends, Finviz) gate almost nothing and won distribution *because* of it. Gating too early trades long-term SEO/backlink compounding for short-term emails. Santro's counterweight: keep ticker/theme/ETF pages fully crawlable; gate persistence and depth, not pages.
2. **Full registration walls do work — for some.** TIKR and Koyfin gate the entire product and still built large user bases, because their *marketing pages* carry the proof (screenshots, data-source namedrops, user counts). If Santro's preview can't be made impressive quickly, a TIKR-style gate is the fallback — but it sacrifices Santro's current no-signup virality.
3. **Quizzes aren't inherently childish.** Robo-advisors onboard with suitability questionnaires; Simply Wall St's post-signup profiling works. The failure mode is *placement* (before any value) and *styling* (personas/emoji), not the concept. Keep the segmentation logic; move it post-signup; restyle it as calibration.
4. **Urgency isn't always fake.** Benzinga sells genuine speed; CryptoRank's unlock calendar and alternative.me's "next update in..." countdown are real clocks. Santro's honest equivalents: data refresh timestamps, heat-change deltas since yesterday, IPO/earnings dates.
5. **Dark ≠ premium by itself.** ZeroHedge is dark and dense and reads as doom-merchant. Premium = dark + restraint + methodology + calm disclosure. Tone carries more weight than palette.
