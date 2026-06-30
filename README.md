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

## SEO

```bash
.venv/bin/python seo_audit.py          # gate: title/desc/canonical/H1/JSON-LD on every public page
.venv/bin/python seo_audit.py --live   # also check HTTP 200s + that a bogus path 404s
.venv/bin/python gen_sitemap.py        # regenerate sitemap.xml (fresh lastmod; auto-discovers blog posts)
```

`seo_audit.py` exits non-zero if any indexable page is missing an essential — run it before deploying (and it's safe to wire into CI). Re-run `gen_sitemap.py` whenever pages are added so `lastmod` stays honest.

**Indexing model.** Content pages (`/`, `/about`, `/stocks`, `/crypto`, `/etfs`, `/bubble`, `/news`, `/research`, `/ipos`, `/share`, `/blog`, `/blog/*`, `/privacy`, `/terms`) ship real static HTML — title, description, canonical, OG/Twitter, one H1, explanatory copy and footer links — before any JS runs. The parameterized client-rendered detail shells (`/t`, `/e`, `/c`, `/ipo`) are `noindex,follow` on purpose: they share one static template, so indexing them would create thin/duplicate pages. To make ticker pages indexable later, prerender per-symbol static HTML at build time.

**Post-deploy checklist (Google Search Console).**
1. Submit `https://santroai.tech/sitemap.xml`.
2. URL-inspect `/`, `/blog`, the newest article, `/etfs`, `/bubble`, `/crypto`, `/stocks` → Request indexing.
3. Pages report: watch "Crawled – currently not indexed", "Discovered – currently not indexed", "Duplicate without user-selected canonical".
4. Rich Results Test on `/` (WebApplication/Organization), `/etfs` (Dataset + Breadcrumb), a blog post (Article).
5. Check Mobile Usability and Core Web Vitals (mobile).
6. Confirm no important URL is `noindex`; confirm the `noindex` shells (`/t`, `/e`, `/c`, `/ipo`) stay excluded.

Data is delayed ~15 min — pages must say "delayed", never "live/real-time". Not financial advice.

Contact: hello@santroai.tech
