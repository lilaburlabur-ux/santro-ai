#!/usr/bin/env python3
"""
fetch_crypto.py — AI crypto market via CoinMarketCap → crypto.json

20 coins (3 anchors + 17 AI tokens), ONE batched quotes/latest call = 1 CMC
credit per run. At the 10-min cloud cadence that's ~144 credits/day against
the free tier's ~333/day budget.

Key: env CMC_API_KEY (GitHub Actions secret) or ~/.config/santro/cmc_key.
Edit COINS below to change the basket — the page follows automatically.
"""

import os
import json
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

import requests

COINS = ["BTC", "ETH", "SOL",                                   # anchors
         "TAO", "FET", "RENDER", "NEAR", "ICP", "GRT", "WLD",   # AI tokens
         "AKT", "AIOZ", "ARKM", "IO", "VIRTUAL", "THETA",
         "KAITO", "GRASS", "AI16Z", "TURBO"]


def api_key():
    k = os.environ.get("CMC_API_KEY", "").strip()
    if k:
        return k
    return open(os.path.expanduser("~/.config/santro/cmc_key")).read().strip()


def main():
    r = requests.get(
        "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
        params={"symbol": ",".join(COINS), "convert": "USD"},
        headers={"X-CMC_PRO_API_KEY": api_key()}, timeout=25)
    d = r.json()
    if r.status_code != 200 or d.get("status", {}).get("error_code"):
        raise SystemExit(f"CMC error {r.status_code}: "
                         f"{d.get('status', {}).get('error_message')}")

    coins = []
    for sym in COINS:
        entries = d.get("data", {}).get(sym) or []
        # symbol collisions: keep the listing with the largest market cap
        entries = [e for e in entries if e.get("quote", {}).get("USD", {}).get("price")]
        if not entries:
            print(f"  miss  {sym}")
            continue
        c = max(entries, key=lambda e: e["quote"]["USD"].get("market_cap") or 0)
        q = c["quote"]["USD"]
        coins.append({
            "symbol": sym,
            "name": c.get("name") or sym,
            "price": q["price"],
            "change_24h": round(q.get("percent_change_24h") or 0, 2),
            "market_cap": q.get("market_cap") or 0,
            "volume_24h": q.get("volume_24h") or 0,
        })

    coins.sort(key=lambda c: -c["market_cap"])
    for i, c in enumerate(coins):
        c["rank"] = i + 1

    json.dump({
        "as_of": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "source": "CoinMarketCap",
        "coins": coins,
    }, open("crypto.json", "w"), indent=1)
    print(f"crypto.json — {len(coins)}/{len(COINS)} coins, "
          f"credits this call: {d.get('status', {}).get('credit_count')}")


if __name__ == "__main__":
    main()
