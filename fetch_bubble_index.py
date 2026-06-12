#!/usr/bin/env python3
"""
fetch_bubble_index.py — AI Bubble Index → bubble_index.json

Mirrors the composite bubble-risk index published by AI Bubble Monitor
(https://aibubblemonitor.com), shown on the site WITH source attribution and
a link back. Their index updates once a day (~00:02 UTC), so the 3x/day
universe-refresh cadence is plenty.
"""

import os
import json
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

import requests

BASE = "https://aibubblemonitor.com"
UA = {"User-Agent": "SantroAI/1.0 (+https://santroai.tech; hello@santroai.tech)"}


def main():
    cur = requests.get(f"{BASE}/api/index/current", headers=UA, timeout=20).json()
    hist = []
    try:
        h = requests.get(f"{BASE}/api/index/history?days=180", headers=UA, timeout=20).json()
        if isinstance(h, list):
            hist = [{"t": x.get("timestamp") or x.get("date"),
                     "v": x.get("overall")} for x in h
                    if (x.get("overall") is not None)]
    except Exception:
        pass

    json.dump({
        "fetched_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "source": BASE,
        "source_name": "AI Bubble Monitor",
        "index": cur,
        "history": hist[-180:],
    }, open("bubble_index.json", "w"), indent=1)
    print(f"bubble_index.json — overall {cur.get('overall')} ({cur.get('label')}), "
          f"{len(hist)} history points")


if __name__ == "__main__":
    main()
