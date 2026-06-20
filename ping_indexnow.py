#!/usr/bin/env python3
"""
ping_indexnow.py — submit Santro AI URLs to IndexNow.

IndexNow instantly notifies Bing, Yandex, Seznam, Naver and other participating
engines that pages changed, so they recrawl in hours instead of weeks. (Google
does NOT participate — its only push route is GSC "Request indexing".)

Ownership is proven by the key file hosted at https://santroai.tech/<key>.txt.
"""

import os
import json

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

import requests

KEY = "2a5af4f291c8f21486d4350a922590fc"
HOST = "santroai.tech"


def load_urls():
    """Single source of truth: pull every <loc> from sitemap.xml so the IndexNow
    list can never drift out of sync with the sitemap again."""
    import re
    try:
        xml = open("sitemap.xml", encoding="utf-8").read()
        urls = [u.strip() for u in re.findall(r"<loc>(.*?)</loc>", xml, re.S)]
        return [u for u in urls if u]
    except Exception as e:
        print(f"could not read sitemap.xml ({e}); falling back to homepage only")
        return ["https://santroai.tech/"]


URLS = load_urls()


def main():
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": f"https://{HOST}/{KEY}.txt",
        "urlList": URLS,
    }
    r = requests.post("https://api.indexnow.org/indexnow",
                      json=payload,
                      headers={"Content-Type": "application/json; charset=utf-8"},
                      timeout=25)
    print(f"IndexNow → {r.status_code} ({len(URLS)} URLs)")
    # 200/202 = accepted; 403 = key not verifiable yet (file not live)
    if r.text:
        print(r.text[:200])


if __name__ == "__main__":
    main()
