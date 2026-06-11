#!/usr/bin/env python3
"""
update_hot.py — generates hot_tickers.json per hot-tickers/SPEC.md.

Hot = attention, not direction. Inclusion = any 2 of the measurable criteria:
  1. |day move| > 5%
  2. volume > 3x 30-day average
  3. news catalyst within the current 4h window (from news.json)
(The spec's 4th criterion, social spikes, has no keyless source — the
takeaways editorial cycle can add such names by hand.)

"why" rules per spec: news-backed cards quote the sourced headline;
no-news movers get the honest amber label. Never pads — if only 2 names
qualify, 2 cards ship.

Run:    .venv/bin/python update_hot.py     (every 15 min via workflow)
Output: hot_tickers.json
"""

import os
import sys
import json
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.chdir(HERE)

import yfinance as yf

CATALYST_KEYWORDS = [
    ("analyst_action", ["upgrade", "downgrade", "price target", "initiat", "overweight", "underweight", "double upgrade"]),
    ("earnings", ["earnings", "revenue", "results", "guidance", "quarter", "eps", "outlook", "sales jump", "sales soar"]),
    ("financing", ["financing", "offering", "raise", "debt deal", "loan", "convertible", "dilut", "billion debt"]),
    ("contract_win", ["contract", "award", "order from", "wins", "selected", "megafab", "project"]),
    ("mna", ["merger", "acquisition", "acquire", "buyout", "takeover", "stake in"]),
    ("regulatory", ["regulat", "antitrust", "probe", "export", "ban", "tariff", "curbs", "license"]),
]


def fresh_news(hours=4):
    """ticker -> freshest story within the window."""
    out = {}
    now = dt.datetime.now(dt.timezone.utc)
    try:
        for it in json.load(open("news.json"))["items"]:
            try:
                ts = dt.datetime.fromisoformat(it["published"].replace("Z", "+00:00"))
            except Exception:
                continue
            if (now - ts).total_seconds() <= hours * 3600:
                for tk in it.get("tickers", []):
                    out.setdefault(tk, {"title": it["title"], "url": it.get("url", "")})
    except Exception:
        pass
    return out


def main():
    uni = json.load(open("universe.json"))
    scope = {}
    for b in uni["bubbles"]:
        for t in b["tickers"]:
            scope[t["ticker"]] = t["company"]
    try:
        for h in (json.load(open("data.json")).get("etf") or {}).get("holdings", []):
            scope.setdefault(h["symbol"], h["name"])
    except Exception:
        pass

    syms = list(scope)
    px = yf.download(syms, period="3mo", interval="1d", auto_adjust=True,
                     progress=False, group_by="ticker", threads=True)
    news = fresh_news()

    cards = []
    for sym in syms:
        try:
            c = px[sym]["Close"].dropna()
            v = px[sym]["Volume"].dropna()
            if len(c) < 25:
                continue
            last, prev = float(c.iloc[-1]), float(c.iloc[-2])
            move = (last / prev - 1) * 100
            # corrupt-bar guard (e.g. KLAC's 10x-off Jun-10 bar): cross-check vs fast_info
            if abs(move) > 40:
                try:
                    fi = yf.Ticker(sym).fast_info
                    p2, pc2 = fi.get("lastPrice"), fi.get("previousClose")
                    if p2 and pc2 and abs(p2 / pc2 - 1) * 100 < 40:
                        last, move = float(p2), (p2 / pc2 - 1) * 100
                    else:
                        continue
                except Exception:
                    continue
            vol = int(v.iloc[-1])
            avg = float(v.iloc[-31:-1].mean()) if len(v) > 31 else float(v.iloc[:-1].mean())
            ratio = vol / avg if avg else 0.0

            story = news.get(sym)
            criteria = (abs(move) > 5) + (ratio > 3) + (1 if story else 0)
            if criteria < 2:
                continue

            if story:
                why, src = story["title"], story["url"]
                low = why.lower()
                ctype = "momentum_narrative"
                for k, words in CATALYST_KEYWORDS:
                    if any(w in low for w in words):
                        ctype = k
                        break
            else:
                ctype, src = "no_news_mover", ""
                why = (f"Moving {'up' if move > 0 else 'down'} {abs(move):.1f}% on ~{ratio:.0f}x "
                       f"average volume with no fresh headline this cycle — attention without a story.")

            heat = min(99, round(min(abs(move), 15) * 3.5 + min(ratio, 8) * 5
                                 + (15 if story else 0) + (10 if abs(move) > 8 else 0)))
            cards.append({
                "rank": 0, "ticker": sym, "company": scope[sym],
                "move_pct": round(move, 2), "price": round(last, 2),
                "volume": vol, "volume_vs_avg": f"~{ratio:.0f}x" if ratio >= 1.5 else f"~{ratio:.1f}x",
                "heat_score": heat, "direction": "up" if move > 0 else "down",
                "why": why, "catalyst_type": ctype, "source_url": src,
            })
        except Exception:
            continue

    cards.sort(key=lambda x: -x["heat_score"])
    cards = cards[:8]
    for i, cd in enumerate(cards, 1):
        cd["rank"] = i

    payload = {
        "meta": {
            "section": "hot_tickers",
            "as_of": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "refresh_cycle": "15m quantitative; editorial enrichment each 4h takeaways cycle",
            "heat_criteria": "Any 2 of: |day move| > 5%; volume > 3x 30d avg; news catalyst within 4h. "
                             "Rank by heat_score. Losers qualify — hot means attention, not direction. Never padded.",
            "disclaimer": "For informational purposes only. Not investment advice.",
        },
        "hot_tickers": cards,
    }
    json.dump(payload, open("hot_tickers.json", "w"), indent=1)
    print(f"Wrote hot_tickers.json — {len(cards)} hot names "
          f"({', '.join(c['ticker'] + ' ' + c['catalyst_type'] for c in cards)})")


if __name__ == "__main__":
    main()
