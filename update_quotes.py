#!/usr/bin/env python3
"""
update_quotes.py — fast quote patch for ALL displayed tickers
(83-name AI Universe + 30-name NVIDIA Ecosystem, deduped ≈ 100 symbols).

One batched yf.download per run: refreshes price / change_pct / volume in
universe.json and ecosystem.json, scales market caps by the price ratio and
recomputes universe bubble aggregates. Slow fields (industry, P/E, perf,
spark) stay on update_universe.py / update_ecosystem.py's 4-hour cycle.

Runs every minute on the Mac (crontab) and every 5 min in the cloud
(refresh-data.yml), premarket through after-hours.
"""

import os
import sys
import json
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.chdir(HERE)

import yfinance as yf


def load(path):
    try:
        return json.load(open(path))
    except Exception:
        return None


def main():
    universe = load("universe.json")
    eco = load("ecosystem.json")
    if not universe and not eco:
        print("nothing to update"); return

    refs = []   # every ticker dict that needs patching, by symbol
    if universe:
        for b in universe.get("bubbles", []):
            refs += b.get("tickers", [])
    if eco:
        refs += eco.get("tickers", [])
    symbols = sorted({t["ticker"] for t in refs})

    px = yf.download(symbols, period="5d", interval="1d", auto_adjust=True,
                     progress=False, group_by="ticker", threads=True)

    quotes, fast_checked = {}, {}
    for sym in symbols:
        try:
            c = px[sym]["Close"].dropna()
            v = px[sym]["Volume"].dropna()
            if len(c) < 2:
                continue
            last, prev = float(c.iloc[-1]), float(c.iloc[-2])
            chg = (last / prev - 1) * 100
            # corrupt-bar guard: a >40% daily print must survive a fast_info
            # cross-check (valid intraday) before we publish it
            if abs(chg) > 40:
                try:
                    fi = yf.Ticker(sym).fast_info
                    p2, pc2 = fi.get("lastPrice"), fi.get("previousClose")
                    if p2 and pc2 and abs(p2 / pc2 - 1) * 100 < 40:
                        last, chg = float(p2), (p2 / pc2 - 1) * 100
                    fast_checked[sym] = True
                except Exception:
                    continue   # can't verify an extreme move — keep old values
            quotes[sym] = (last, chg, int(v.iloc[-1]) if len(v) else None)
        except Exception:
            continue

    patched = 0
    for t in refs:
        q = quotes.get(t["ticker"])
        if not q:
            continue
        last, chg, vol = q
        old = t.get("price")
        if old and old > 0 and last > 0 and t.get("market_cap_b"):
            # cap is split-invariant — only scale by the price ratio while it's
            # consistent with the day's move; a split-sized ratio keeps the
            # stored cap and the 4h full refresh re-anchors it properly
            ratio = last / old
            day = 1 + chg / 100
            if 0.5 < ratio / day < 2:
                t["market_cap_b"] = round(t["market_cap_b"] * ratio, 2)
        t["price"] = round(last, 2)
        t["change_pct"] = round(chg, 2)
        if vol is not None:
            t["volume"] = vol
        patched += 1

    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    if universe:
        for b in universe.get("bubbles", []):
            members = b.get("tickers", [])
            if members:
                b["avg_change_pct"] = round(
                    sum(t.get("change_pct") or 0 for t in members) / len(members), 2)
                b["total_market_cap_b"] = round(
                    sum(t.get("market_cap_b") or 0 for t in members), 2)
        universe.setdefault("meta", {})["as_of"] = stamp
        json.dump(universe, open("universe.json", "w"), indent=1)
    if eco:
        eco.setdefault("meta", {})["as_of"] = stamp
        json.dump(eco, open("ecosystem.json", "w"), indent=1)
    print(f"{stamp} patched {patched}/{len(refs)} refs "
          f"({len(symbols)} symbols, fast-checked: {sorted(fast_checked) or 'none'})")


if __name__ == "__main__":
    main()
