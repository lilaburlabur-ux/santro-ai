# stoxheatmap.ai — Hot Tickers section spec

Replaces the "small cap runners" section. Hot = attention, not direction — losers qualify.

## Files
- `data.json` — data contract, seeded with the live Jun 10, 2026 example (5 cards)
- `hot-tickers.html` — working card component (open in browser; reads `data.json` from same folder)

## Data contract

```
meta
 ├ as_of                ISO timestamp — REPLACE every refresh
 ├ refresh_cycle_hours  4 (matches Key Takeaways cycle)
 ├ heat_criteria        inclusion rule (documented for editors/devs)
 └ render_spec          card layout, colors, max_cards
hot_tickers[]           ranked by heat_score desc, max 8
 ├ rank, ticker, company
 ├ move_pct             signed; drives chip color (green/red; amber for no-news movers)
 ├ price, volume, volume_vs_avg
 ├ heat_score           0-100, editorial/algorithmic blend
 ├ direction            "up" | "down"
 ├ why                  ONE sentence, the whole point of the card — concrete catalyst, no hype words
 ├ catalyst_type        financing | earnings | analyst_action | contract_win | momentum_narrative | no_news_mover | regulatory | mna
 └ source_url           link backing the "why" (empty allowed only for no_news_mover)
```

## Heat criteria (inclusion)
Any 2 of 4:
1. |day move| > 5% (or > 2x ATR for low-beta names)
2. Volume > 3x 30-day average
3. News catalyst published within the current 4h cycle
4. Social mention spike (fintwit/StockTwits)

## Editorial rules (from the research methodology)
- Every "why" must be sourced and dated; no figures from memory.
- No advice verbs (buy/sell/add); the card states what happened, not what to do.
- Losers and no-news movers are content, not gaps — "moving on no news" is its own honest label.
- If a cycle has fewer than 3 genuinely hot names, show fewer cards. Never pad.
- Disclaimer string from meta renders under the card stack.

## Refresh (every 4h cycle)
Replace the whole `hot_tickers` array + `meta.as_of`. The Key Takeaways skill generates the
content; this JSON is the handoff format between research output and the site front end.
