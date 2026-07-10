#!/usr/bin/env python3
"""
fetch_tweets.py — @DeItaone (Walter Bloomberg) squawk on SPCX / SpaceX.

X's API is paywalled and Nitter mirrors sit behind bot challenges, so this
reads his official public Telegram mirror (t.me/s/walter_bloomberg), which is
server-rendered and keyless. Messages mentioning SpaceX/SPCX are merged into
tweets.json (deduped by permalink, newest 30 kept) so the feed accumulates
beyond the ~20 messages visible per page load.

Runs with the 5-min cloud quote refresh + the 1-min local cron.
"""

import os
import json
import re
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

import requests
from bs4 import BeautifulSoup

MIRROR = "https://t.me/s/walter_bloomberg"
HANDLE = "@DeItaone"
TOPIC = re.compile(r"spacex|spcx|space exploration|sk\s*hynix|hynix|skhyv?\b", re.I)
BOILER = re.compile(r"\s*@walter_bloomberg\s*\|?\s*(Source)?\s*$", re.I)


def main():
    html = requests.get(MIRROR, timeout=20, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}).text
    soup = BeautifulSoup(html, "html.parser")

    fresh = []
    for m in soup.select(".tgme_widget_message"):
        t = m.select_one(".tgme_widget_message_text")
        tm = m.select_one("time")
        a = m.select_one("a.tgme_widget_message_date")
        if not (t and tm and a):
            continue
        txt = BOILER.sub("", t.get_text(" ", strip=True)).strip()
        if not TOPIC.search(txt):
            continue
        fresh.append({"text": txt[:400], "time": tm["datetime"], "url": a["href"]})

    # live SPCX pre-IPO perp on Hyperliquid's xyz equity DEX (keyless) — the
    # price the squawk tweets reference; shown in the panel alongside Nasdaq
    hl = None
    try:
        mids = requests.post("https://api.hyperliquid.xyz/info", timeout=12,
                             json={"type": "allMids", "dex": "xyz"}).json()
        if mids.get("xyz:SPCX"):
            hl = round(float(mids["xyz:SPCX"]), 2)
    except Exception:
        pass

    try:
        old = json.load(open("tweets.json")).get("items", [])
    except Exception:
        old = []
    seen = {it["url"] for it in fresh}
    items = fresh + [it for it in old if it["url"] not in seen]
    items.sort(key=lambda it: it["time"], reverse=True)
    items = items[:30]

    json.dump({
        "meta": {"handle": HANDLE, "mirror": "t.me/walter_bloomberg",
                 "topic": "SpaceX / $SPCX + SK hynix / $SKHY", "hyperliquid": hl,
                 "as_of": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")},
        "items": items,
    }, open("tweets.json", "w"), indent=1)
    print(f"tweets.json — {len(fresh)} fresh SPCX hits on page, {len(items)} kept, HL perp: {hl}")


if __name__ == "__main__":
    main()
