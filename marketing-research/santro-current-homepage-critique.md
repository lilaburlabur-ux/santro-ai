# Santro Current Homepage — Audit of the Live First Screen

Audited live at https://santroai.tech/ on July 8, 2026. Quotes below are verbatim from the page.

## What's actually on the first screen today

- H1: **"What kind of AI-market trader are you?"**
- Sub: "Take the **60-second AI bubble check** and get your Santro market profile."
- Primary CTA: "Start the AI bubble check" → #quiz. Secondary: "Open terminal."
- Six persona cards: ▲ Heat chaser, ≈ Valuation skeptic, ▦ Infrastructure mapper, ◔ Bubble-risk watcher, 🔥 Narrative trader, ▣ Daily terminal user — followed by "Question 1 of 8."
- A sample "Santro market profile" card ("Infrastructure Mapper / Bubble-risk sensitivity: High / First move: check compute + power names").
- Meta description leads with "Take the AI bubble check, get your market profile…" — the quiz owns the SEO snippet too.
- Below the fold: the actual value ("The AI trade is not one trade anymore," daily loop, terminal links, footer with correct disclaimers).

## 1. Why it feels like a school project — the honest answer

1. **It asks before it gives.** Every strong terminal in the benchmark (Finviz, Token Terminal, stockanalysis.com, DefiLlama) *shows the market* in the first second. Santro opens with a questionnaire — the homepage takes attention instead of paying it. That's homework framing: "answer 8 questions, get graded."
2. **Persona cards read as a personality test, not a market instrument.** "What kind of trader are you?" is BuzzFeed grammar. The 🔥 emoji on "Narrative trader" and the ▲≈▦◔ glyph cards are quiz-app UI, not terminal UI. Compare iShares: identical segmentation collected through a sober goal-picker ("Focus on income / Navigate risk").
3. **"Question 1 of 8" above the fold.** A progress counter is the single strongest "this is a quiz for beginners" signal in the whole set. No benchmark platform with premium positioning shows one pre-signup.
4. **The product is demoted to the second button.** "Open terminal" — the actual asset, an 84-ticker live map — is the *secondary* CTA. The site literally ranks a quiz above its terminal.
5. **The proof is buried.** "84 tickers · 7 themes · 40 ETFs · 6 crash scenarios" sits in small text under the quiz. Those numbers are the credibility; they're set like a footnote.
6. **Self-contradiction on data claims.** Nav badges say "*Live*" (AI Terminal *Live*, Bubble Risk *Live*) while the footer says "Quotes delayed ~15 min." Compliance-literate visitors notice. Either the badge means "feature is launched," in which case it must not look like a data-freshness claim, or it has to go.
7. **A school project explains itself; a terminal demonstrates itself.** The current page spends its hero explaining what Santro will tell you about *you*. Bloomberg-class products spend the hero showing what they know about *the market*.

## Steelman — what the quiz gets right (don't lose these)

- The segmentation logic is genuinely useful: heat-chaser vs. valuation-skeptic maps cleanly to default dashboard presets.
- "Hot means attention, not direction" appears at the right moments — best compliance-native tagline in the entire 66-platform set. Keep it everywhere.
- Footer discipline (delayed quotes, not financial advice, no fake Pro claims, "email brief coming soon" honesty) is already better than half the benchmark.
- The daily-loop section (see what moved → why → risk → fair value → save) is a real workflow story. It's just below the wrong hero.

## 2. Delete

- H1 "What kind of AI-market trader are you?" — delete, full stop.
- The six persona cards from the homepage.
- "Question 1 of 8" and any progress UI from first paint.
- The 🔥 emoji and glyph-card styling anywhere near the hero.
- "*Live*" badges on nav items (or rename to "Beta"/"New" and never adjacent to data).
- The sample profile card from the hero (fine inside the tool itself).

## 3. Reframe

- Quiz → **"Exposure Check"** (or "Market Profile"), moved to (a) post-signup onboarding and (b) a secondary module/route — reframed from "what kind of trader are you?" to "how is your AI exposure positioned?" Questions become instrument-like: universe (stocks/ETFs/crypto), horizon, what you already hold, which risk you watch. Output = a preset terminal layout + watchlist suggestions, not a persona name.
- Meta description → lead with the terminal: "The AI bubble terminal — heat, crowding and bubble-risk signals across 84 AI stocks, 40 ETFs and AI crypto. Quotes delayed ~15 min."
- "60-second bubble check" as a phrase can survive in the footer/tools menu; it just can't be the front door.

## 4. Keep, but professionalize

- The stats strip ("84 tickers · 7 themes · 40 ETFs · 6 crash scenarios · ~15 min delayed · honest") — promote it into the hero as a credibility bar.
- "The AI trade is not one trade anymore" — strong line; make it a section header over the theme map preview.
- Daily-loop section — keep, retitle "The Santro loop," tie each step to a real module screenshot.
- Research links (Burry Short Watch, Aschenbrenner Basket, IPO Watch) — these are elite differentiators; surface one of them on the homepage as proof of research seriousness (ARK pattern: research artifact as brand engine).

## 5. The better first interaction

Seeing today's market state and touching it: a live (delayed-labeled) bubble map + AI Bubble Risk gauge + top-5 hot tickers with reasons — with rows 6–25 visibly locked. First click = explore data; second click = hit a lock; third click = create account. (Benchmarks: Finviz data-first + CNN gauge + MarketChameleon tease-then-lock.)

## 6. What should the homepage lead with?

**Terminal preview (Concept A), with portfolio stress as the mid-page hook (C embedded), and the profiling quiz demoted to post-signup onboarding (B's content, repositioned).** Rationale in `landing-concepts.md`. Locked data supports the hero; it isn't the hero itself.

## 7. Registration without looking desperate

- Gate persistence, personalization and depth — never the headline data. (Save watchlist, save stress test, unlock rows 6+, full "why moving.")
- Lock copy states what the account *does*, not "sign up now!!": "Save this stress test — free account." One sentence, one verb.
- No popups on entry, no exit-intent modals, no discount ribbons. The lock lives inside the component the user already wants.
- Show the account's price ("Free") and its contents at the lock, like Sharesight's legible free tier (10 holdings) — a legible deal reads confident, not needy.

## 8. Visible before registration (anonymous)

AI Bubble Index value + 7-day trend + component names; top 5 hot tickers with heat score and one-line sourced reason; full bubble map (colored, hoverable); theme heat strip (7 themes); top 5 of each: ETFs, crypto movers; one full sample "why is this moving" note (marked SAMPLE); stress test on preset sample portfolios only, one scenario result; every ticker/theme/ETF page's core data (SEO — protect the crawl, per Macrotrends/stockanalysis lesson); one research note per week fully open (Stratechery pattern).

## 9. Blurred/locked (visible but gated)

Hot tickers rows 6–25 (show ticker symbols, blur heat/reason); "why moving" beyond the first line on non-sample tickers; stress scenarios 2–6 (show scenario names + one aggregate number, lock the breakdown); historical heat beyond 30 days (Santiment time-gate); ETF overlap matrix beyond top-2 funds; Burry/Aschenbrenner position-level changes (headline holdings free); advanced filters on all tables.

## 10. Actions that require an account

Save/create watchlist; set any alert; run stress on a custom portfolio; save a valuation calculation; export/download anything; generate a share card with your data on it; bookmark research; email digest subscription; (later) iOS push.

## Priority order

1. Replace hero: terminal preview + Bubble Index gauge + hot-tickers table with locked rows (kills the school-project signal in one move).
2. Wire the signup modal to locked elements with return-to-context.
3. Add stress-test hook section with sample portfolios (1 scenario free, 5 locked).
4. Move quiz → post-signup "calibrate your terminal" (3–4 questions, no personas, no emoji) + keep /quiz route 301'd or reframed for SEO continuity.
5. Fix "Live" badges; promote stats strip + delayed-data line into hero.
6. Homepage research module (Burry watch teaser) for credibility.
7. Meta/OG rewrite to terminal-first language.
