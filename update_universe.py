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
import math
import time
import statistics
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import yfinance as yf

PATH = os.path.join(HERE, "universe.json")


def main():
    d = json.load(open(PATH))
    ok = fail = 0

    # One batch download for all symbols. Daily closes are the source of truth:
    # change = last bar vs prior bar. During market hours the last bar is the
    # live session; outside hours it's the completed session (so premarket
    # shows the last REAL session move — never fast_info's bogus previousClose,
    # which returns garbage outside trading hours).
    syms = [t["ticker"] for b in d["bubbles"] for t in b["tickers"]]
    px = yf.download(syms, period="1y", interval="1d", auto_adjust=True,
                     progress=False, group_by="ticker", threads=True)

    for b in d["bubbles"]:
        for t in b["tickers"]:
            try:
                c = px[t["ticker"]]["Close"].dropna()
                v = px[t["ticker"]]["Volume"].dropna()
                if len(c) < 2:
                    raise ValueError("not enough bars")
                # repair corrupt bars (Yahoo can serve runs of 10x-off bars, e.g.
                # KLAC's half-applied split). Anchor on the latest bar — verified
                # against fast_info if it disagrees wildly with recent history —
                # then walk backward keeping bars within 3x of the last trusted
                # bar; rejected runs get log-interpolated. Real crashes stay
                # (no legit name moves 3x in a day); 10x glitch runs cannot.
                vals = [float(x) for x in c]
                med10 = statistics.median(vals[-11:-1]) if len(vals) > 11 else vals[-1]
                if med10 > 0 and abs(vals[-1] / med10 - 1) > 0.4:
                    try:
                        p2 = yf.Ticker(t["ticker"]).fast_info.get("lastPrice")
                        if p2:
                            vals[-1] = float(p2)
                    except Exception:
                        pass
                good = [False] * len(vals)
                good[-1] = True
                lg = vals[-1]
                for i in range(len(vals) - 2, -1, -1):
                    if vals[i] > 0 and lg / 3 <= vals[i] <= lg * 3:
                        good[i] = True
                        lg = vals[i]
                idxg = [i for i, g in enumerate(good) if g]
                for i in range(idxg[0]):
                    vals[i] = vals[idxg[0]]
                for a, b2 in zip(idxg, idxg[1:]):
                    if b2 - a > 1:
                        la, lb = math.log(vals[a]), math.log(vals[b2])
                        for k in range(a + 1, b2):
                            vals[k] = math.exp(la + (lb - la) * (k - a) / (b2 - a))
                c = c.copy(); c[:] = vals
                last, prev = float(c.iloc[-1]), float(c.iloc[-2])
                old_price = t.get("price") or last
                t["change_pct"] = round((last / prev - 1) * 100, 2)
                # >40% daily moves are usually corrupt bars or corporate actions
                # (seen: KLAC bar off by 10x) — cross-check against fast_info
                if abs(t["change_pct"]) > 40:
                    try:
                        fi = yf.Ticker(t["ticker"]).fast_info
                        p2, pc2 = fi.get("lastPrice"), fi.get("previousClose")
                        if p2 and pc2 and abs(p2 / pc2 - 1) * 100 < 40:
                            t["change_pct"] = round((p2 / pc2 - 1) * 100, 2)
                            last = float(p2)
                    except Exception:
                        pass
                # scale stored cap by price move (avoids 83 slow per-ticker calls).
                # Market cap is split-invariant: when the stored price is from a
                # pre-split series (KLAC 10:1 — ratio 0.1 vs a ~1.0 day move),
                # raw ratio scaling corrupts the cap. Only scale while the ratio
                # is consistent with the day's move; otherwise re-anchor from
                # info, falling back to the stored (still valid) cap.
                if t.get("market_cap_b") and old_price:
                    ratio = last / old_price
                    day = 1 + (t["change_pct"] or 0) / 100
                    if 0.5 < ratio / day < 2:
                        t["market_cap_b"] = round(t["market_cap_b"] * ratio, 2)
                    else:
                        try:
                            info = yf.Ticker(t["ticker"]).get_info() or {}
                            ipx = info.get("regularMarketPrice") or info.get("currentPrice")
                            if info.get("marketCap") and ipx:
                                t["market_cap_b"] = round(
                                    info["marketCap"] * (last / ipx) / 1e9, 2)
                        except Exception:
                            pass
                t["price"] = round(last, 2)
                if len(v):
                    t["volume"] = int(v.iloc[-1])
                # multi-timeframe performance + 30-point sparkline (for the
                # stock-info card: 1D = change_pct, plus 1W / 1M / 1Y)
                def perf(nbars):
                    if len(c) > nbars:
                        return round((last / float(c.iloc[-1 - nbars]) - 1) * 100, 1)
                    return None
                t["perf"] = {"1W": perf(5), "1M": perf(21),
                             "1Y": round((last / float(c.iloc[0]) - 1) * 100, 1) if len(c) > 200 else None}
                # sample from the END so the latest bar is always included
                tail = c.iloc[-60:]
                step = max(1, len(tail) // 30)
                idx = list(range(len(tail) - 1, -1, -step))[::-1]
                t["spark"] = [round(float(tail.iloc[i]), 2) for i in idx]
                # Forward EPS + trailing P/E for the fair-value calculator's
                # implied-growth read. Forward EPS lets unprofitable-trailing
                # names (negative P/E) still get a read. Re-anchor per-share
                # figures to the repaired close (info can be priced off a stale
                # pre-split quote). Best-effort: keep the prior value on failure.
                try:
                    info = yf.Ticker(t["ticker"]).get_info() or {}
                    ipx = info.get("regularMarketPrice") or info.get("currentPrice")
                    rr = (last / ipx) if ipx and ipx > 0 else 1.0
                    fe = info.get("forwardEps")
                    if fe:
                        t["fwd_eps"] = round(fe * rr, 2)
                    pe = info.get("trailingPE")
                    if pe:
                        t["pe"] = round(pe * rr, 2)
                    time.sleep(0.15)   # be polite to Yahoo across ~80 names
                except Exception:
                    pass
                ok += 1
            except Exception as e:
                fail += 1
                print(f"  FAIL {t['ticker']}: {e}")

        # bubble aggregates follow the fresh ticker data (None-safe: a ticker
        # that failed this cycle keeps old values and must not crash the bubble)
        dedup = {}
        for t in b["tickers"]:
            dedup[t.get("ticker")] = t   # merge races can duplicate rows — keep freshest
        if len(dedup) != len(b["tickers"]):
            b["tickers"] = list(dedup.values())
        b["count"] = len(b["tickers"])   # self-heal: merge races have corrupted counts
        b["total_market_cap_b"] = round(sum(t.get("market_cap_b") or 0 for t in b["tickers"]), 1)
        b["avg_change_pct"] = round(sum(t.get("change_pct") or 0 for t in b["tickers"]) / len(b["tickers"]), 2)
        b["tickers"].sort(key=lambda t: t.get("market_cap_b") or 0, reverse=True)
        print(f"  bubble {b['id']}: cap ${b['total_market_cap_b']}B, avg {b['avg_change_pct']:+.2f}%")

    d["meta"]["total_tickers"] = sum(len(b["tickers"]) for b in d["bubbles"])
    d["meta"]["as_of"] = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    json.dump(d, open(PATH, "w"), indent=1)
    print(f"Wrote universe.json — {ok} tickers refreshed, {fail} failed, as of {d['meta']['as_of']}")


if __name__ == "__main__":
    main()
