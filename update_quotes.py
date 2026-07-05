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
import logging
import datetime as dt
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.chdir(HERE)

import yfinance as yf


def load(path):
    try:
        return json.load(open(path))
    except Exception:
        return None


def session_now():
    """US equity session on the NY clock: pre 4:00-9:30, regular 9:30-16:00,
    post 16:00-20:00, else closed."""
    now = dt.datetime.now(ZoneInfo("America/New_York"))
    if now.weekday() >= 5:
        return "closed"
    m = now.hour * 60 + now.minute
    if 240 <= m < 570:
        return "pre"
    if 570 <= m < 960:
        return "regular"
    if 960 <= m < 1200:
        return "post"
    return "closed"


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
    # fresh IPOs have a single daily bar and no previous close — their seeded
    # base_close (the IPO reference price) anchors the day move instead
    base_ref = {t["ticker"]: t["base_close"] for t in refs if t.get("base_close")}

    px = yf.download(symbols, period="5d", interval="1d", auto_adjust=True,
                     progress=False, group_by="ticker", threads=True)

    # during pre/after-market, daily bars are frozen at the last official close
    # — overlay live extended-session prices from the 1-minute prepost feed
    session = session_now()
    ext = {}
    if session in ("pre", "post"):
        # Illiquid names often have no premarket / after-hours prints, so this
        # 1-minute prepost batch comes back empty for them. yfinance logs that
        # as a scary "possibly delisted", but it's expected and harmless — they
        # simply keep their last official close below. Quiet just this call so
        # the daily-download diagnostics still surface a genuine delisting.
        yflog = logging.getLogger("yfinance")
        _lvl = yflog.level
        yflog.setLevel(logging.CRITICAL)
        try:
            xp = yf.download(symbols, period="1d", interval="1m", prepost=True,
                             auto_adjust=True, progress=False, group_by="ticker",
                             threads=True)
        finally:
            yflog.setLevel(_lvl)
        for sym in symbols:
            try:
                c = xp[sym]["Close"].dropna()
                if len(c):
                    ext[sym] = float(c.iloc[-1])
            except Exception:
                pass

    quotes, fast_checked = {}, {}
    for sym in symbols:
        try:
            c = px[sym]["Close"].dropna()
            v = px[sym]["Volume"].dropna()
            if len(c) >= 2:
                last, prev = float(c.iloc[-1]), float(c.iloc[-2])
            elif len(c) == 1 and base_ref.get(sym):
                last, prev = float(c.iloc[-1]), base_ref[sym]
            else:
                continue
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
            # extended-session semantics: change is ALWAYS measured against the
            # previous official close. pre: base = yesterday (daily last bar,
            # today's bar doesn't exist yet); no premarket trades = 0.0% move.
            # post: base = yesterday (prev bar); no AH trades = the day's move.
            if session in ("pre", "post"):
                base = last if session == "pre" else prev
                now_px = ext.get(sym, last)
                x = (now_px / base - 1) * 100
                if abs(x) < 40 and base > 0:
                    last, chg = now_px, x
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
                # self-heal: merge races can also DUPLICATE ticker rows — dedupe
                # by symbol (keep the last, freshest row) before aggregating
                dedup = {}
                for t in members:
                    dedup[t.get("ticker")] = t
                if len(dedup) != len(members):
                    members = list(dedup.values())
                    b["tickers"] = members
                b["count"] = len(members)   # self-heal: merge races have corrupted counts
                b["avg_change_pct"] = round(
                    sum(t.get("change_pct") or 0 for t in members) / len(members), 2)
                b["total_market_cap_b"] = round(
                    sum(t.get("market_cap_b") or 0 for t in members), 2)
        universe.setdefault("meta", {})["as_of"] = stamp
        universe["meta"]["total_tickers"] = sum(
            len(b.get("tickers", [])) for b in universe.get("bubbles", []))
        universe["meta"]["session"] = session
        json.dump(universe, open("universe.json", "w"), indent=1)
    if eco:
        eco.setdefault("meta", {})["as_of"] = stamp
        eco["meta"]["session"] = session
        json.dump(eco, open("ecosystem.json", "w"), indent=1)
    print(f"{stamp} [{session}] patched {patched}/{len(refs)} refs "
          f"({len(symbols)} symbols, ext quotes: {len(ext)}, "
          f"fast-checked: {sorted(fast_checked) or 'none'})")


if __name__ == "__main__":
    main()
