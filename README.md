# Santro AI — santroai.tech

Bubble map & research journal for the AI narrative. Live at **https://santroai.tech**.
All market data is keyless Yahoo Finance, ~15-min delayed. Not financial advice.

## Pages
- `index.html` — the **Terminal**: bubble map (AI Universe / NVIDIA Ecosystem),
  news, hot tickers, SpaceX IPO panel, key takeaways
- `stocks.html` / `etfs.html` / `crypto.html` / `news.html` / `research.html` / `about.html`

## Data pipelines
| script | output | cadence |
|---|---|---|
| `fetch.py` | `data.json` (watchlist + DRAM ETF + tape) | 1 min local · 5 min cloud |
| `update_quotes.py` | quote patch for all 114 displayed tickers + extended-session prices | 1 min local · 5 min cloud |
| `fetch_tweets.py` | `tweets.json` (@DeItaone SPCX squawk + Hyperliquid perp) | 1 min local · 5 min cloud |
| `update_universe.py` | `universe.json` (84 names, 7 sectors, full refresh) | 3×/day |
| `update_ecosystem.py` | `ecosystem.json` (30-name NVIDIA basket, full refresh) | 3×/day |
| `update_hot.py` | `hot_tickers.json` (2-of-3 attention criteria) | 15 min |
| `fetch_news.py` | `news.json` (full-scope headlines, deduped) | 20 min |
| `research.py` | `research/` signed reports + `research.json` | post-close |

Cloud refresh runs via GitHub Actions (`.github/workflows/`), dispatched from a
local cron because GitHub's scheduler alone is unreliable.

## Run locally
```bash
.venv/bin/python -m http.server 8000   # serve
.venv/bin/python fetch.py              # refresh watchlist data
```

Contact: hello@santroai.tech
