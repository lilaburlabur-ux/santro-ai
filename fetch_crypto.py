#!/usr/bin/env python3
"""
fetch_crypto.py — top 20 AI tokens by market cap → crypto.json

Pulls CoinMarketCap's "AI & Big Data" category (900+ tokens) and keeps the
top 20 by market cap — the basket rotates automatically as caps shift.
The category endpoint's default ordering is NOT market cap (limit=40 missed
Filecoin at $0.6B), so we pull 200 and sort ourselves. 200 coins = 2 CMC
credits per run (~192/day at the 15-min cadence vs the free tier's ~333/day).

Key: env CMC_API_KEY (GitHub Actions secret) or ~/.config/santro/cmc_key.
"""

import os
import json
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

import requests

AI_CATEGORY = "6051a81a66fc1b42617d6db7"   # CMC "AI & Big Data"
TOP_N = 20


def api_key():
    k = os.environ.get("CMC_API_KEY", "").strip()
    if k:
        return k
    return open(os.path.expanduser("~/.config/santro/cmc_key")).read().strip()


def main():
    r = requests.get(
        "https://pro-api.coinmarketcap.com/v1/cryptocurrency/category",
        params={"id": AI_CATEGORY, "limit": 200, "convert": "USD"},
        headers={"X-CMC_PRO_API_KEY": api_key()}, timeout=25)
    d = r.json()
    if r.status_code != 200 or d.get("status", {}).get("error_code"):
        raise SystemExit(f"CMC error {r.status_code}: "
                         f"{d.get('status', {}).get('error_message')}")

    raw = d.get("data", {}).get("coins", [])
    usable = [c for c in raw
              if c.get("quote", {}).get("USD", {}).get("market_cap")
              and c["quote"]["USD"].get("price")]
    usable.sort(key=lambda c: -c["quote"]["USD"]["market_cap"])

    coins = []
    for i, c in enumerate(usable[:TOP_N]):
        q = c["quote"]["USD"]
        coins.append({
            "rank": i + 1,
            "id": c["id"],                       # CMC logo CDN id
            "symbol": c["symbol"],
            "name": c.get("name") or c["symbol"],
            "slug": c.get("slug") or "",
            "price": q["price"],
            "change_24h": round(q.get("percent_change_24h") or 0, 2),
            "market_cap": q.get("market_cap") or 0,
            "volume_24h": q.get("volume_24h") or 0,
        })

    json.dump({
        "as_of": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "source": "CoinMarketCap · AI & Big Data category, top 20 by market cap",
        "coins": coins,
    }, open("crypto.json", "w"), indent=1)
    print(f"crypto.json — top {len(coins)} AI tokens, "
          f"credits: {d.get('status', {}).get('credit_count')}, "
          f"#1 {coins[0]['symbol']} ${coins[0]['market_cap']/1e9:.2f}B")


if __name__ == "__main__":
    main()
