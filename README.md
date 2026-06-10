# AI Sector Heatmap

A treemap of stocks sized by market cap and colored by today's % change, with the
latest news headlines per ticker. Data is **delayed ~15 min** and comes from free
Yahoo Finance endpoints — **no API key, no signup**.

```
ai-stock-heatmap/
├── tickers.py     <- the ONE file you edit (your list of symbols)
├── fetch.py       <- pulls the data, writes data.json
├── data.json      <- generated; what the webpage reads
├── index.html     <- the heatmap webpage
└── .venv/         <- private Python environment (already set up)
```

## See it
The server may already be running on http://localhost:8000 . If not, start it:

```bash
cd ~/ai-stock-heatmap
.venv/bin/python -m http.server 8000
```

Then open **http://localhost:8000** in your browser.

## Refresh the prices (the ~15-min delayed data)
Re-run the fetcher, then click **↻ Reload** on the page (or just wait 60s):

```bash
cd ~/ai-stock-heatmap
.venv/bin/python fetch.py
```

## Use your own tickers
1. Open `tickers.py`.
2. Replace the symbols in the `TICKERS = [ ... ]` list with the ones you researched.
3. (Optional) add a friendly name in the `NAMES = { ... }` dictionary.
4. Re-run `.venv/bin/python fetch.py` and Reload the page.

That's it — the heatmap resizes itself to however many tickers you list.

## How it fits together (the 30-second mental model)
- `fetch.py` talks to the internet, grabs numbers + headlines, and saves a plain
  text file called `data.json`.
- `index.html` is just a webpage that reads `data.json` and draws the colored boxes.
- They're decoupled on purpose: the page never talks to the internet for stock data,
  so it's fast and can't get rate-limited.

## Next steps (not done yet)
- **Auto-refresh:** run `fetch.py` automatically every 15 min (a `cron` job).
- **Public URL:** put it online so others can see it (free hosting).
