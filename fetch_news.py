#!/usr/bin/env python3
"""
fetch_news.py — pulls headlines for the FULL coverage scope and writes news.json:
every ticker in universe.json (83 names, sector-tagged) plus the ETFs.

One story often surfaces for several tickers — items are deduped by id/title
and carry the list of tickers (and sectors) they belong to.

Run:    .venv/bin/python fetch_news.py
Output: news.json  {as_of_utc, count, items:[{title,url,publisher,published,tickers,sectors}]}
"""

import os
import sys
import json
import time
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import yfinance as yf
from tickers import ETF_HOLDINGS

MAX_PER_SYMBOL = 6
MAX_ITEMS = 80


def headlines_for(symbol):
    try:
        items = yf.Ticker(symbol).news or []
    except Exception:
        return []
    out = []
    for item in items[:MAX_PER_SYMBOL]:
        c = item.get("content", item)
        title = c.get("title")
        if not title:
            continue
        url = ""
        for key in ("clickThroughUrl", "canonicalUrl"):
            v = c.get(key)
            if isinstance(v, dict) and v.get("url"):
                url = v["url"]; break
        out.append({
            "id": c.get("id") or title,
            "title": title,
            "url": url,
            "publisher": (c.get("provider") or {}).get("displayName", ""),
            "published": c.get("pubDate", "") or c.get("displayTime", ""),
        })
    return out


def main():
    uni = json.load(open(os.path.join(HERE, "universe.json")))
    scope = []                      # [(symbol, sector_id)]
    for b in uni["bubbles"]:
        for t in b["tickers"]:
            scope.append((t["ticker"], b["id"]))
    for sym in ETF_HOLDINGS:
        scope.append((sym, "etf_" + sym.lower()))

    merged = {}                     # id -> item with tickers/sectors sets
    print(f"Pulling news for {len(scope)} symbols...")
    for sym, sector in scope:
        for h in headlines_for(sym):
            key = h["id"]
            if key not in merged:
                merged[key] = {**h, "tickers": [], "sectors": []}
                merged[key].pop("id")
            m = merged[key]
            if sym not in m["tickers"]:
                m["tickers"].append(sym)
            if sector not in m["sectors"]:
                m["sectors"].append(sector)
        time.sleep(0.25)

    items = sorted(merged.values(), key=lambda x: x["published"] or "", reverse=True)[:MAX_ITEMS]
    payload = {
        "as_of_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "count": len(items),
        "items": items,
    }
    with open(os.path.join(HERE, "news.json"), "w") as f:
        json.dump(payload, f, indent=1)
    print(f"Wrote news.json — {len(items)} unique stories from {len(scope)} symbols.")


if __name__ == "__main__":
    main()
