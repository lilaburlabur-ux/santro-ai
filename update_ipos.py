#!/usr/bin/env python3
"""
update_ipos.py — AI IPO data → ipos.json

For each LISTED name: live price / market cap / volume (Yahoo) + the historical
debut-day, first-week, first-month and since-IPO returns (anchored at the curated
ipo_date / ipo_price) + a 60-session spark. PREIPO names pass through as curated
cards. Runs in the universe-refresh cycle (3x/day).
"""

import os
import sys
import json
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.chdir(HERE)

import yfinance as yf
from ipos import LISTED, PREIPO


def fmt_date(d):
    try:
        return dt.datetime.strptime(d, "%Y-%m-%d").strftime("%b %-d ’%y")
    except Exception:
        return d


def main():
    syms = [t[0] for t in LISTED]
    px = yf.download(syms, period="5y", interval="1d", auto_adjust=True,
                     progress=False, group_by="ticker", threads=True)

    listed = []
    for ticker, name, ipo_date, ipo_price in LISTED:
        row = {"ticker": ticker, "name": name, "ipo_date": ipo_date,
               "ipo_date_fmt": fmt_date(ipo_date), "ipo_price": ipo_price}
        try:
            c = px[ticker]["Close"].dropna()
            v = px[ticker]["Volume"].dropna()
            after = c[c.index >= ipo_date]
            if len(after) < 1:
                after = c
            now = float(after.iloc[-1])
            row["price"] = round(now, 2)
            row["since_ipo"] = round((now / ipo_price - 1) * 100, 1)
            row["change_pct"] = round(
                (now / float(after.iloc[-2]) - 1) * 100, 2) if len(after) > 1 else 0.0

            def win(n, label):
                # debut-window returns are historical once the window has passed;
                # before then (a fresh IPO) we show what exists so far, else None
                if len(after) > n:
                    row[label] = round((float(after.iloc[n]) / ipo_price - 1) * 100, 1)
                elif len(after) >= 1 and n == 0:
                    row[label] = round((now / ipo_price - 1) * 100, 1)
                else:
                    row[label] = None
            win(0, "day1")
            win(4, "week1")
            win(20, "month1")

            try:
                info = yf.Ticker(ticker).get_info() or {}
                ipx = info.get("regularMarketPrice") or info.get("currentPrice")
                ratio = (now / ipx) if ipx and ipx > 0 else 1.0
                row["market_cap_b"] = round((info.get("marketCap") or 0) * ratio / 1e9, 2) or None
                fe = info.get("forwardEps")   # for the calculator's implied-growth read
                row["fwd_eps"] = round(fe * ratio, 2) if fe else None
            except Exception:
                row["market_cap_b"] = None
            row["volume"] = int(v.iloc[-1]) if len(v) else None

            tail = [round(float(x), 2) for x in after.iloc[-60:]]
            step = max(1, len(tail) // 30)
            idx = list(range(len(tail) - 1, -1, -step))[::-1]
            row["spark"] = [tail[i] for i in idx]
            print(f"  ok    {ticker}  since IPO {row['since_ipo']:+.0f}%")
        except Exception as e:
            row["price"] = None
            print(f"  partial {ticker}: {e}")
        listed.append(row)

    try:
        from ipos import ALIASES
    except ImportError:
        ALIASES = {}
    preipo = [{"name": n, "slug": s, "what": w, "valuation": val, "status": st,
               "aliases": ALIASES.get(s, [n]),
               **({"brief": f"/ipos/{s}"} if os.path.exists(os.path.join(HERE, "ipos", f"{s}.html")) else {})}
              for n, s, w, val, st in PREIPO]

    json.dump({
        "as_of": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "listed": listed,
        "preipo": preipo,
    }, open("ipos.json", "w"), indent=1)
    print(f"ipos.json — {len(listed)} listed, {len(preipo)} pre-IPO")


if __name__ == "__main__":
    main()
