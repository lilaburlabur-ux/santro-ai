#!/usr/bin/env python3
"""
fetch.py  —  pulls delayed quotes + headlines and writes data.json

Run it:   .venv/bin/python fetch.py
Output:   data.json  (read by index.html)

Data is delayed ~15 min. It comes from free Yahoo Finance endpoints via the
`yfinance` library — no API key, no signup. Re-run this whenever you want
fresh numbers (later we can put it on a 15-minute timer).
"""

import os
import sys
import json
import time
import datetime as dt

# Make sure we can import tickers.py and write data.json next to THIS file,
# no matter which folder you run the command from.
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import yfinance as yf
from tickers import TICKERS, NAMES, ETF_HOLDINGS

# ETFs rendered as a "holdings" heatmap (tile size = weight in the ETF).
ETFS = [
    {"symbol": "DRAM", "name": "Roundhill Memory ETF"},
]

# Words that mark a non-stock holding (cash / money-market) to skip.
_CASH_WORDS = ("oblig", "government", "money market", "treasury", "cash", "repo", "deposit")
# Filler words stripped when shortening a company name for a tile label.
_DROP_WORDS = ("inc", "corp", "corporation", "ltd", "limited", "plc", "co",
               "holdings", "holding", "ordinary", "shares", "technology",
               "technologies", "company", "group", "the", "&")


def _is_cash(name):
    n = (name or "").lower()
    return any(w in n for w in _CASH_WORDS)


def _short_name(name, symbol):
    """A compact, readable label for a heatmap tile (e.g. 'SK Hynix')."""
    if not name:
        return symbol
    words = [w for w in name.replace(".", " ").split()
             if w.lower().strip(",") not in _DROP_WORDS]
    if not words:
        return name[:16]
    if len(words[0]) <= 3 and len(words) > 1:
        return (words[0] + " " + words[1])[:16]
    return words[0][:16]


def get_headlines(ticker, limit=3):
    """Return up to `limit` recent headlines as simple dicts."""
    try:
        items = ticker.news or []
    except Exception:
        items = []

    out = []
    for item in items:
        # Newer yfinance nests the real fields under "content".
        c = item.get("content", item)
        title = c.get("title")
        if not title:
            continue

        # The clickable link lives under one of these keys.
        url = ""
        for key in ("clickThroughUrl", "canonicalUrl"):
            v = c.get(key)
            if isinstance(v, dict) and v.get("url"):
                url = v["url"]
                break

        provider = c.get("provider") or {}
        out.append({
            "title": title,
            "url": url,
            "publisher": provider.get("displayName", ""),
            "published": c.get("pubDate", "") or c.get("displayTime", ""),
        })
        if len(out) >= limit:
            break
    return out


def fetch_one(symbol):
    """Fetch price, % change, market cap and headlines for one symbol."""
    t = yf.Ticker(symbol)
    fi = t.fast_info  # fast + reliable; avoids the rate-limited .info call

    price = fi.get("lastPrice")
    prev = fi.get("previousClose")
    cap = fi.get("marketCap")
    shares = fi.get("shares")

    # Fall back to price * shares if Yahoo didn't hand us a market cap.
    if cap is None and price and shares:
        cap = price * shares

    if price is None or cap is None:
        raise ValueError(f"missing data (price={price}, market_cap={cap})")

    change_pct = ((price / prev) - 1) * 100 if prev else 0.0

    return {
        "symbol": symbol,
        "name": NAMES.get(symbol, symbol),
        "price": round(float(price), 2),
        "previous_close": round(float(prev), 2) if prev else None,
        "change_pct": round(float(change_pct), 2),
        "market_cap": float(cap),
        "headlines": get_headlines(t, 3),
    }


def fetch_etf(symbol, name):
    """Fetch an ETF's holdings (weights) + each holding's daily move.

    Tile size will be the weight in the fund; color is the daily % change.
    Weights come from the manual sheet in tickers.py (ETF_HOLDINGS) when
    one exists — the fund's own published numbers — otherwise from
    Yahoo's auto-pulled top holdings.
    """
    t = yf.Ticker(symbol)
    fi = t.fast_info
    price = fi.get("lastPrice")
    prev = fi.get("previousClose")
    etf_chg = ((price / prev) - 1) * 100 if (price and prev) else 0.0

    sheet = ETF_HOLDINGS.get(symbol)
    if sheet:
        rows = [(h["symbol"], h["name"], float(h["weight_pct"])) for h in sheet]
    else:
        # funds_data.top_holdings -> DataFrame indexed by Symbol,
        # with columns ["Name", "Holding Percent"] (percent as a 0..1 fraction).
        th = t.funds_data.top_holdings
        rows = [(sym, row.get("Name", sym), float(row.get("Holding Percent", 0)) * 100.0)
                for sym, row in th.iterrows()]

    holdings = []
    for sym, hname, weight in rows:
        if _is_cash(hname) or weight <= 0:
            continue

        chg, hprice, hccy = 0.0, None, "USD"
        try:
            h = yf.Ticker(sym).fast_info
            hp, hpc = h.get("lastPrice"), h.get("previousClose")
            if hp and hpc:
                chg = ((hp / hpc) - 1) * 100
            hprice = round(float(hp), 2) if hp else None
            hccy = h.get("currency") or "USD"  # foreign holdings price in KRW/JPY/etc.
        except Exception:
            pass  # keep the holding (sized by weight) even if its quote failed

        holdings.append({
            "symbol": sym,
            "name": hname,
            "short": _short_name(hname, sym),
            "weight_pct": round(weight, 2),
            "change_pct": round(float(chg), 2),
            "price": hprice,
            "currency": hccy,
        })
        time.sleep(0.3)

    holdings.sort(key=lambda h: h["weight_pct"], reverse=True)
    return {
        "symbol": symbol,
        "name": name,
        "price": round(float(price), 2) if price else None,
        "change_pct": round(float(etf_chg), 2),
        "holdings": holdings,
    }


def main():
    stocks, errors = [], []

    print(f"Fetching {len(TICKERS)} tickers...")
    for sym in TICKERS:
        try:
            stocks.append(fetch_one(sym))
            print(f"  ok    {sym}")
        except Exception as e:
            errors.append(sym)
            print(f"  FAIL  {sym}: {e}")
        time.sleep(0.4)  # be gentle with the free endpoint

    # Biggest company first -> biggest tile.
    stocks.sort(key=lambda s: s["market_cap"], reverse=True)

    # ETFs: holdings sized by their weight in the fund.
    etfs = []
    for e in ETFS:
        try:
            etf = fetch_etf(e["symbol"], e["name"])
            etfs.append(etf)
            print(f"  ok    ETF {e['symbol']} ({len(etf['holdings'])} holdings)")
        except Exception as ex:
            print(f"  FAIL  ETF {e['symbol']}: {ex}")

    now = dt.datetime.now(dt.timezone.utc)
    payload = {
        "as_of_utc": now.isoformat(timespec="seconds"),
        "as_of_local": now.astimezone().strftime("%Y-%m-%d %H:%M:%S %Z"),
        "delay_note": "Quotes delayed ~15 min — free Yahoo Finance data, no API key.",
        "errors": errors,
        "stocks": stocks,
        "etfs": etfs,
        "etf": etfs[0] if etfs else None,
    }

    out_path = os.path.join(HERE, "data.json")
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"\nWrote {out_path}")
    print(f"{len(stocks)} stocks ok, {len(errors)} failed.")


if __name__ == "__main__":
    main()
