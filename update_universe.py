#!/usr/bin/env python3
"""
update_universe.py — refreshes quotes inside universe.json (the AI-universe
bubble map: 83 tickers in 7 themed bubbles, contract in universe/SPEC.md).

Per the spec: refresh ticker price / change_pct / volume / market_cap_b and
meta.as_of each cycle, and recompute each bubble's total_market_cap_b and
avg_change_pct. Bubble structure/membership never changes here.

Run:  .venv/bin/python update_universe.py
"""

import os
import sys
import json
import time
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import yfinance as yf

PATH = os.path.join(HERE, "universe.json")


def main():
    d = json.load(open(PATH))
    ok = fail = 0

    for b in d["bubbles"]:
        for t in b["tickers"]:
            try:
                fi = yf.Ticker(t["ticker"]).fast_info
                price, prev = fi.get("lastPrice"), fi.get("previousClose")
                if price and prev:
                    t["price"] = round(float(price), 2)
                    t["change_pct"] = round((price / prev - 1) * 100, 2)
                cap = fi.get("marketCap")
                if cap:
                    t["market_cap_b"] = round(cap / 1e9, 2)
                vol = fi.get("lastVolume")
                if vol:
                    t["volume"] = int(vol)
                ok += 1
            except Exception as e:
                fail += 1
                print(f"  FAIL {t['ticker']}: {e}")
            time.sleep(0.25)

        # bubble aggregates follow the fresh ticker data
        b["total_market_cap_b"] = round(sum(t["market_cap_b"] for t in b["tickers"]), 1)
        b["avg_change_pct"] = round(sum(t["change_pct"] for t in b["tickers"]) / len(b["tickers"]), 2)
        b["tickers"].sort(key=lambda t: t["market_cap_b"], reverse=True)
        print(f"  bubble {b['id']}: cap ${b['total_market_cap_b']}B, avg {b['avg_change_pct']:+.2f}%")

    d["meta"]["as_of"] = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    json.dump(d, open(PATH, "w"), indent=1)
    print(f"Wrote universe.json — {ok} tickers refreshed, {fail} failed, as of {d['meta']['as_of']}")


if __name__ == "__main__":
    main()
