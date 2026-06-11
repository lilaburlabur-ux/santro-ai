# stoxheatmap.ai — AI Bubble Map data spec

## Files
- `data.json` — the data contract your code consumes (83 tickers, 7 bubbles)
- `bubblemap.html` — working D3 reference implementation (open directly in a browser; serves `data.json` from same folder)

## Data contract (`data.json`)

```
meta
 ├ source              "Finviz theme:artificialintelligence"
 ├ as_of               snapshot timestamp — REPLACE on every data refresh
 ├ min_bubble_size     7 (grouping rule)
 └ render_spec         sizing/coloring/tooltip rules (documented for devs)
bubbles[]              exactly the top-level circles, every bubble ≥ 7 tickers
 ├ id                  stable slug — use as DOM/route key (e.g. /category/ai_chips_and_compute)
 ├ label               display name
 ├ color               category hex (top-level view)
 ├ count               number of member tickers
 ├ total_market_cap_b  drives bubble AREA via sqrt scale
 ├ avg_change_pct      mean day % — drives bubble heat color if you prefer heat over category colors
 ├ industries_included original Finviz industries merged into this bubble (display in description/tooltip)
 └ tickers[]           members, sorted by market cap desc
    ├ ticker, company, sector, industry   ← industry = ORIGINAL Finviz value, always preserved
    ├ country
    ├ market_cap_b     ticker circle size (sqrt scale)
    ├ pe               null = not meaningful (loss-making)
    ├ price, change_pct, volume           ← refresh these every cycle (site updates every 4h)
```

## Grouping rules (how the 7 bubbles were formed)
1. Any Finviz industry with ≥ 7 names keeps its own bubble (Semiconductors 13, Software-Infrastructure 14, Software-Application 11).
2. Smaller industries are merged into the nearest theme until the bubble has ≥ 7 names.
3. The original industry is NEVER discarded — it lives in `tickers[].industry` and the bubble's `industries_included`, shown in tooltips/descriptions.
4. Every ticker appears in exactly one bubble; total = 83.

| Bubble | Names | Cap | Merged industries |
|---|---|---|---|
| AI Chips & Compute | 13 | $11.9T | Semiconductors |
| AI Software & Cloud Infrastructure | 14 | $4.5T | Software - Infrastructure |
| AI Applications & Data Software | 11 | $0.8T | Software - Application |
| Chip Equipment & AI Hardware | 12 | $2.8T | Semi Equipment, Computer Hardware, Communication Equipment |
| AI Platforms, Internet & AdTech | 12 | $13.1T | Internet Content, Advertising, Internet Retail, Consumer Electronics |
| Data Center, Power & Energy | 8 | $0.5T | Utilities (x3), REIT-Specialty, Electrical Equipment, Eng. & Construction |
| Applied AI: Industrial, Defense & Vertical | 13 | $2.1T | Industrial Machinery, Conglomerates, Sci. Instruments, Aerospace & Defense, Auto, IT Services, Medical, Biotech, Credit Services |

## Render rules
- Bubble/ticker size: `sqrt(market_cap)` — linear scale makes NVDA/AAPL drown everything.
- Top level: category color fill at low opacity + colored stroke; label + "N names · $cap · avg%".
- Drill-down: ticker circles colored by `change_pct` heat (green/red), label only when radius > ~16px, full data in tooltip.
- Tooltip must show the original Finviz `industry` — that's the agreed compromise for merged bubbles.
- Refresh cadence: update `price/change_pct/volume/market_cap_b` and `meta.as_of` every 4h cycle; structure (bubbles/membership) changes only when the Finviz theme list changes.

Snapshot date: Jun 10, 2026 intraday (red session — SMCI -28%). Informational only, not investment advice.
