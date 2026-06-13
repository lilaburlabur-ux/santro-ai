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
URLS = [
    "https://santroai.tech/",
    "https://santroai.tech/stocks",
    "https://santroai.tech/ipos",
    "https://santroai.tech/crypto",
    "https://santroai.tech/etfs",
    "https://santroai.tech/news",
    "https://santroai.tech/research",
    "https://santroai.tech/bubble",
    "https://santroai.tech/blog",
    "https://santroai.tech/blog/ai-junk-bonds",
    "https://santroai.tech/about",
]


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
