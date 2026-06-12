#!/usr/bin/env python3
"""
update_ecosystem.py — NVIDIA Ecosystem basket (30 names, user-curated)
→ ecosystem.json with the same per-ticker contract as universe tickers:
price/change (corrupt-bar-repaired daily closes), market cap, Finviz-style
industry, P/E, volume, perf 1W/1M/1Y, 30-point 60-session sparkline.

Run:    .venv/bin/python update_ecosystem.py
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
os.chdir(HERE)

import yfinance as yf

ECOSYSTEM = ["SNDK","INTC","WDC","LITE","MU","NBIS","NVTS","FLEX","VRT","STM",
             "ARM","ASX","GLW","NOK","ON","AMKR","CRWV","DELL","COHR","CAMT",
             "KEYS","MPWR","LRCX","JBL","ADI","FN","KLAC","ASML","TSM","ETN"]


def repair(vals, sym):
    """Anchored corrupt-bar repair (same approach as update_universe.py)."""
    med10 = statistics.median(vals[-11:-1]) if len(vals) > 11 else vals[-1]
    if med10 > 0 and abs(vals[-1] / med10 - 1) > 0.4:
        try:
            p2 = yf.Ticker(sym).fast_info.get("lastPrice")
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
    for a, b in zip(idxg, idxg[1:]):
        if b - a > 1:
            la, lb = math.log(vals[a]), math.log(vals[b])
            for k in range(a + 1, b):
                vals[k] = math.exp(la + (lb - la) * (k - a) / (b - a))
    return vals


def main():
    px = yf.download(ECOSYSTEM, period="1y", interval="1d", auto_adjust=True,
                     progress=False, group_by="ticker", threads=True)
    out, failed = [], []
    for sym in ECOSYSTEM:
        try:
            c = px[sym]["Close"].dropna()
            v = px[sym]["Volume"].dropna()
            if len(c) < 2:
                raise ValueError("no price bars")
            vals = repair([float(x) for x in c], sym)
            last, prev = vals[-1], vals[-2]
            chg = (last / prev - 1) * 100
            if abs(chg) > 40:
                fi = yf.Ticker(sym).fast_info
                p2, pc2 = fi.get("lastPrice"), fi.get("previousClose")
                if p2 and pc2 and abs(p2 / pc2 - 1) * 100 < 40:
                    last, chg = float(p2), (p2 / pc2 - 1) * 100

            info = {}
            try:
                info = yf.Ticker(sym).get_info() or {}
            except Exception:
                pass

            # Yahoo info can be priced off a stale/pre-split quote (KLAC: $2,411
            # vs real $241 post 10:1 split) — cap and P/E are consistent with
            # info's own price, so re-anchor both to the repaired close.
            ipx = info.get("regularMarketPrice") or info.get("currentPrice")
            ratio = (last / ipx) if ipx and ipx > 0 else 1.0
            mcap = (info.get("marketCap") or 0) * ratio
            pe = info.get("trailingPE")
            if pe:
                pe = pe * ratio

            def perf(n):
                return round((last / vals[-1 - n] - 1) * 100, 1) if len(vals) > n else None

            tail = vals[-60:]
            step = max(1, len(tail) // 30)
            idx = list(range(len(tail) - 1, -1, -step))[::-1]

            out.append({
                "ticker": sym,
                "company": info.get("longName") or sym,
                "industry": info.get("industry") or "—",
                "price": round(last, 2),
                "change_pct": round(chg, 2),
                "market_cap_b": round(mcap / 1e9, 2) or None,
                "pe": round(pe, 2) if pe else None,
                "volume": int(v.iloc[-1]) if len(v) else None,
                "perf": {"1W": perf(5), "1M": perf(21),
                         "1Y": round((last / vals[0] - 1) * 100, 1) if len(vals) > 200 else None},
                "spark": [round(tail[i], 2) for i in idx],
            })
            print(f"  ok    {sym}  {chg:+.2f}%  {info.get('industry','—')}")
        except Exception as e:
            failed.append(sym)
            print(f"  FAIL  {sym}: {e}")
        time.sleep(0.3)

    out.sort(key=lambda t: -(t["market_cap_b"] or 0))
    json.dump({
        "meta": {"label": "NVIDIA Ecosystem", "count": len(out),
                 "as_of": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
                 "failed": failed},
        "tickers": out,
    }, open("ecosystem.json", "w"), indent=1)
    print(f"Wrote ecosystem.json — {len(out)} ok, failed: {failed or 'none'}")


if __name__ == "__main__":
    main()
