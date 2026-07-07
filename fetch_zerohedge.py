#!/usr/bin/env python3
"""
fetch_zerohedge.py — ZeroHedge coverage → zerohedge.json

X has no free API, but ZeroHedge tweets its articles and publishes a public RSS
feed — so the feed is their substantive coverage. We pull it and tag items that
mention the pre-IPO / listed AI names, for the AI IPO pages.
"""

import os
import re
import json
import datetime as dt
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

import requests
from ipos import LISTED, PREIPO

FEEDS = [
    "https://feeds.feedburner.com/zerohedge/feed",
    "https://cms.zerohedge.com/fullrss2.xml",
]
UA = {"User-Agent": "SantroAI/1.0 (+https://santroai.tech; hello@santroai.tech)"}

# company name -> match regex: whole-name phrase with word boundaries, plus
# curated aliases for pre-IPO names (first-word matching mistagged "SK hynix
# US ADS" onto any headline containing an "SK" word)
try:
    from ipos import ALIASES
except ImportError:
    ALIASES = {}
def _rx(phrases):
    parts = [r"\b" + re.escape(p.strip()).replace(r"\ ", r"\s+") + r"\b" for p in phrases]
    return re.compile("|".join(parts), re.I)
NAMES = {c[1]: _rx([c[1]]) for c in LISTED}
NAMES.update({p[0]: _rx(ALIASES.get(p[1], [p[0]])) for p in PREIPO})


def main():
    items, seen = [], set()
    for url in FEEDS:
        try:
            xml = requests.get(url, headers=UA, timeout=20).text
            root = ET.fromstring(xml)
            for it in root.iter("item"):
                link = (it.findtext("link") or "").strip()
                title = (it.findtext("title") or "").strip()
                pub = (it.findtext("pubDate") or "").strip()
                if not link or link in seen:
                    continue
                seen.add(link)
                tags = [name for name, rx in NAMES.items() if rx.search(title)]
                items.append({"title": title, "link": link, "published": pub,
                              "tags": tags})
        except Exception as e:
            print(f"  feed err {url}: {e}")
        if items:
            break

    json.dump({
        "as_of": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "source": "ZeroHedge", "source_url": "https://www.zerohedge.com",
        "items": items[:60],
    }, open("zerohedge.json", "w"), indent=1)
    tagged = sum(1 for it in items if it["tags"])
    print(f"zerohedge.json — {len(items)} items, {tagged} tagged to AI names")


if __name__ == "__main__":
    main()
