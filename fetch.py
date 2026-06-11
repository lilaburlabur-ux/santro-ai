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

# top-strip market tape (Coinglass-style header)
TAPE = [
    ("SPX", "^GSPC"),
    ("BTC", "BTC-USD"),
    ("Gold", "GC=F"),
    ("Nasdaq100", "^NDX"),
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


def batch_closes(symbols):
    """One download for everything: {symbol: (last_close, prev_close, volume)}.

    Daily bars are the truth for price/change in AND out of market hours —
    fast_info's previousClose returns garbage outside trading sessions.
    """
    px = yf.download(symbols, period="5d", interval="1d", auto_adjust=True,
                     progress=False, group_by="ticker", threads=True)
    out = {}
    for sym in symbols:
        try:
            c = px[sym]["Close"].dropna()
            v = px[sym]["Volume"].dropna()
            if len(c) >= 2:
                out[sym] = (float(c.iloc[-1]), float(c.iloc[-2]),
                            int(v.iloc[-1]) if len(v) else None)
        except Exception:
            pass
    return out


def ccy_for(symbol):
    """Currency by exchange suffix — no API call needed."""
    if symbol.endswith(".KS"): return "KRW"
    if symbol.endswith(".T"):  return "JPY"
    if symbol.endswith(".TW"): return "TWD"
    return "USD"


def fetch_one(symbol, closes):
    """Fetch price, % change, market cap and headlines for one symbol."""
    t = yf.Ticker(symbol)

    if symbol not in closes:
        raise ValueError("no price bars")
    price, prev, _vol = closes[symbol]

    cap = None
    try:
        fi = t.fast_info
        cap = fi.get("marketCap")
        if cap is None and fi.get("shares"):
            cap = price * fi.get("shares")
    except Exception:
        pass
    if cap is None:
        raise ValueError("missing market cap")

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


def fetch_etf(symbol, name, closes):
    """Fetch an ETF's holdings (weights) + each holding's daily move.

    Tile size will be the weight in the fund; color is the daily % change.
    Weights come from the manual sheet in tickers.py (ETF_HOLDINGS) when
    one exists — the fund's own published numbers — otherwise from
    Yahoo's auto-pulled top holdings.
    """
    t = yf.Ticker(symbol)
    price, prev, _ = closes.get(symbol, (None, None, None))
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

        chg, hprice = 0.0, None
        hp, hpc, _ = closes.get(sym, (None, None, None))
        if hp and hpc:
            chg = ((hp / hpc) - 1) * 100
            hprice = round(float(hp), 2)

        holdings.append({
            "symbol": sym,
            "name": hname,
            "short": _short_name(hname, sym),
            "weight_pct": round(weight, 2),
            "change_pct": round(float(chg), 2),
            "price": hprice,
            "currency": ccy_for(sym),
        })

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

    # one batch download covers watchlist + ETFs + every ETF holding
    holding_syms = [h["symbol"] for sheet in ETF_HOLDINGS.values() for h in sheet]
    tape_syms = [s for _, s in TAPE]
    allsyms = list(dict.fromkeys(TICKERS + list(ETF_HOLDINGS.keys()) + holding_syms + tape_syms))
    closes = batch_closes(allsyms)

    print(f"Fetching {len(TICKERS)} tickers...")
    for sym in TICKERS:
        try:
            stocks.append(fetch_one(sym, closes))
            print(f"  ok    {sym}")
        except Exception as e:
            errors.append(sym)
            print(f"  FAIL  {sym}: {e}")
        time.sleep(0.2)  # headlines call pacing

    # Biggest company first -> biggest tile.
    stocks.sort(key=lambda s: s["market_cap"], reverse=True)

    # ETFs: holdings sized by their weight in the fund.
    etfs = []
    for e in ETFS:
        try:
            etf = fetch_etf(e["symbol"], e["name"], closes)
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
        "tape": [
            {"label": label,
             "price": round(closes[sym][0], 2),
             "change_pct": round((closes[sym][0] / closes[sym][1] - 1) * 100, 2)}
            for label, sym in TAPE if sym in closes and closes[sym][1]
        ],
    }

    out_path = os.path.join(HERE, "data.json")
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"\nWrote {out_path}")
    print(f"{len(stocks)} stocks ok, {len(errors)} failed.")


if __name__ == "__main__":
    main()
