#!/usr/bin/env python3
"""
fetch_crypto.py — two AI token baskets → crypto.json

Two CoinMarketCap categories, each kept to the top 20 by market cap:
  • "AI & Big Data" (900+ tokens)  → pull 200, sort ourselves (2 credits)
  • "AI Agents"     (240+ tokens)  → pull 100, sort ourselves (1 credit)

The category endpoint's default ordering is NOT market cap (a shallow pull
once missed Filecoin at $0.6B), so we over-pull and sort by cap here. Total
3 credits/run; every 15 min ≈ 288 credits/day against the free tier's ~333.

Each coin carries 1h / 24h / 7d moves so the bubble map can size by either
timeframe. CMC's category feed occasionally leaks junk tokens with fabricated
caps (e.g. a $587-trillion "market cap" and 277-million-% moves) — CMC's own
UI hides them; we drop anything with a cap over $1T or a move over 500%.

Key: env CMC_API_KEY (GitHub Actions secret) or ~/.config/santro/cmc_key.
"""

import os
import json
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

import requests

# (key, id, label, pull-limit, source-note)
BASKETS = [
    ("bigdata", "6051a81a66fc1b42617d6db7", "AI & Big Data", 200,
     "CoinMarketCap · AI & Big Data category, top 20 by market cap"),
    ("agents", "67250af2622a021a2592cba5", "AI Agents", 100,
     "CoinMarketCap · AI Agents category, top 20 by market cap"),
]
TOP_N = 20


def api_key():
    k = os.environ.get("CMC_API_KEY", "").strip()
    if k:
        return k
    return open(os.path.expanduser("~/.config/santro/cmc_key")).read().strip()


def usable(c):
    """Drop coins with missing or clearly fabricated market data."""
    q = c.get("quote", {}).get("USD", {})
    mc, pr = q.get("market_cap"), q.get("price")
    if not mc or not pr:
        return False
    if mc > 1e12:                                    # >$1T cap = bogus
        return False
    for k in ("percent_change_1h", "percent_change_24h", "percent_change_7d"):
        if abs(q.get(k) or 0) > 500:                 # no real token moves 500%+/hr
            return False
    return True


def fetch_basket(key, cat_id, limit):
    r = requests.get(
        "https://pro-api.coinmarketcap.com/v1/cryptocurrency/category",
        params={"id": cat_id, "limit": limit, "convert": "USD"},
        headers={"X-CMC_PRO_API_KEY": key}, timeout=25)
    d = r.json()
    if r.status_code != 200 or d.get("status", {}).get("error_code"):
        raise SystemExit(f"CMC error {r.status_code}: "
                         f"{d.get('status', {}).get('error_message')}")

    raw = [c for c in d.get("data", {}).get("coins", []) if usable(c)]
    raw.sort(key=lambda c: -c["quote"]["USD"]["market_cap"])

    coins = []
    for i, c in enumerate(raw[:TOP_N]):
        q = c["quote"]["USD"]
        coins.append({
            "rank": i + 1,
            "id": c["id"],                           # CMC logo CDN id
            "symbol": c["symbol"],
            "name": c.get("name") or c["symbol"],
            "slug": c.get("slug") or "",
            "price": q["price"],
            "change_1h": round(q.get("percent_change_1h") or 0, 2),
            "change_24h": round(q.get("percent_change_24h") or 0, 2),
            "change_7d": round(q.get("percent_change_7d") or 0, 2),
            "market_cap": q.get("market_cap") or 0,
            "volume_24h": q.get("volume_24h") or 0,
        })
    return coins, d.get("status", {}).get("credit_count", 0)


def main():
    key = api_key()
    baskets, credits = {}, 0
    for slug, cat_id, label, limit, note in BASKETS:
        coins, cc = fetch_basket(key, cat_id, limit)
        credits += cc or 0
        baskets[slug] = {"label": label, "source": note, "coins": coins}

    json.dump({
        "as_of": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "baskets": baskets,
    }, open("crypto.json", "w"), indent=1)

    parts = [f"{s}: {len(b['coins'])} (#1 {b['coins'][0]['symbol']})"
             for s, b in baskets.items() if b["coins"]]
    print("crypto.json — " + " · ".join(parts) + f" · credits {credits}")


if __name__ == "__main__":
    main()
