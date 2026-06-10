---
name: stoxheatmap-key-takeaways
description: Generate the recurring "Key Takeaways" content block for stoxheatmap.ai — short, structured market-takeaway cards covering narrative, fundamentals, technicals, and watch-level plays, refreshed on a 4-hour cycle. Use this skill whenever the user asks to generate, update, refresh, or write key takeaways, market takeaways, the 4-hour update, website research content, or a market digest for their site — including scheduled runs and one-off requests like "run the takeaways" or "what should this cycle's cards say".
---

# stoxheatmap.ai — Key Takeaways Methodology (4-Hour Cycle)

Produce the Key Takeaways block published on stoxheatmap.ai. Each cycle converts the freshest available picture of the market into a small set of structured cards a trader can scan in under a minute. All analysis follows the owner's research methodology (the `momentum-stock-research` skill — momentum-first, anti-bias, watch levels): if that skill is available, apply its pillars and bias rules; the essentials are also restated here so this skill works standalone.

## Inputs per cycle

1. **Site data (when provided in the request)**: heatmap movers, ETF flow data, and items from the site's AI news feed. Treat these as the cycle's starting candidates.
2. **Core watchlist**: read `references/watchlist.md`. These names are always checked, even on quiet cycles.
3. **Fresh web research**: quotes and technical context (stockanalysis.com single pages and its `/stocks/compare/a-vs-b-vs-c/` tool batch up to ~6 tickers per fetch), plus news search for anything moving. Date every price.

When site data is not provided, do not stall — research the watchlist plus the day's notable movers from the web and say in the output that site data was unavailable that cycle.

## Session awareness

Determine the current US Eastern time and pick the lens:

- **Premarket (4:00–9:30 ET)** — gaps, overnight news, earnings reactions, futures, notable premarket volume. Plays = "watch the open" levels.
- **Midday (9:30–14:00 ET)** — intraday leadership, VWAP holds/losses, volume vs average, sector rotation since the open.
- **Into the close (14:00–16:00 ET)** — daily structure: who's closing strong/weak, levels that held or broke, unusual closing volume.
- **After hours / overnight (16:00–4:00 ET)** — after-hours earnings movers, next-day catalysts, Asia/Europe handoff, futures.

Name the session in the block header so readers know the vantage point.

## Card format

Each takeaway is one card:

- **Headline** — punchy, specific, ≤ 12 words ("Memory names shrug off chip selloff, MU reclaims 20EMA")
- **Body** — 2–3 sentences max, covering whichever angles actually matter for this card: the narrative driver, the fundamental fact (dated, sourced), and the technical picture (EMA/VWAP/volume/relative strength)
- **Tickers** — tagged tickers the card concerns
- **Watch level** (only when warranted) — a specific level and what it would signal ("reclaim of $210 opens door to $225 prior high"). Watch-level ONLY: never "buy", "sell", "add", "entry", "stop", or "target" in published cards. Frame as conditions, not instructions.

Tone: trader-casual — tickers, levels, short sentences, fintwit energy — but every claim factual and sourced. No hype words ("massive", "explosive", "moon"), no certainty about the future, no first-person trade talk ("I'd buy here").

## Card count — let the tape decide

Quiet cycle: 2–3 cards. Normal: 4–6. Heavy news flow (Fed days, earnings clusters, big selloffs): up to 10. Never pad a quiet cycle — a reader who sees filler stops trusting the feed. Every card must answer: "would a trader change their attention because of this?"

## Composition rules

A good block usually covers, in order:
1. **Market/macro card** — what the tape is doing and why (indices, rates, the session's dominant story)
2. **Sector/theme cards** — rotation, group moves, ETF flows if provided
3. **Single-name cards** — watchlist names or movers with a real story this cycle
4. **Risk card** (when warranted) — the thing most likely to invalidate the current narrative (event tonight, extreme positioning, parabolic extension)

Anti-bias rules carry over from the research methodology: don't write three bullish cards on the same theme without checking the bear side; note short interest or crowding when it's the story; if a popular name's setup is breaking down, say so — negative takeaways are takeaways.

## What changed since last cycle

If previous takeaways are provided as input, open the block with a one-line "Since last update" delta (what followed through, what reversed). Never repeat a card unchanged; if nothing new happened to a name, it drops out.

## Output format

ALWAYS use this exact template (markdown; the site ingests it):

```
# Key Takeaways — [Session name] · [Date, time ET]
*Since last update: [one line, only if prior cycle provided]*

## [Card 1 headline]
[Body 2–3 sentences.]
**Tickers:** $XXX, $YYY · **Watch:** [level + meaning, or omit]

## [Card 2 headline]
...

---
[Disclaimer from references/disclaimer.md]
*Data as of [timestamp ET]. Sources: [compact source list].*
```

Also deliver a plain-text copy of the block as a `.md` file when running inside a session with file outputs.

## Quality gate before publishing

- Every number checked against a source fetched this cycle (no figures from memory)
- Every price dated; session label correct for the actual time
- No advice verbs in any card; watch levels framed as conditions
- Disclaimer present from `references/disclaimer.md`
- Cards sorted by importance, not by ticker order
