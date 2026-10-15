#!/usr/bin/env python3
"""
fetch_news.py — pulls headlines for the FULL coverage scope and writes news.json:
every ticker in universe.json (sector-tagged) plus the ETF symbols.

WHY THE TAGGING IS NOT "whatever feed it came from":
Yahoo's per-ticker feeds are noisy. NVDA's feed, for example, carries syndicated
Motley Fool / 24-7 Wall St / macro stories ("Is Coca-Cola a Buy?", "Social
Security move...", "Bitcoin ETF outflows...") that have nothing to do with NVDA.
The old code tagged a story with whatever ticker's feed it appeared in, so those
ended up labelled NVDA · Chips & Compute.

So we do NOT trust the source feed. We collect every story, then RE-TAG each one
purely by which of our companies its TITLE actually names — either the ticker
symbol ($NVDA, (NVDA), (NYSE:TSM)) or the company name (Nvidia, Micron, ...).
A story that names none of our companies is dropped from the AI feed entirely.
This also fixes mis-fed stories (e.g. "SpaceX Stock Began Trading", which Yahoo
served under GOOGL/META, now tags SPCX) and catches multi-company headlines
("Amazon vs. Microsoft" -> both).

Run:    .venv/bin/python fetch_news.py
Output: news.json  {as_of_utc, count, items:[{title,url,publisher,published,tickers,sectors}]}
"""

import os
import sys
import json
import time
import re
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import yfinance as yf
from tickers import ETF_HOLDINGS

MAX_PER_SYMBOL = 6
MAX_ITEMS = 80

# =====================================================================
#  Company-name matching — decides if a headline is really about a ticker
# =====================================================================
# Trailing words we strip off a company name to get its everyday "core"
# name, e.g. "Honeywell International Inc" -> "Honeywell",
# "Micron Technology Inc" -> "Micron", "Lattice Semiconductor Corp" -> "Lattice".
SUFFIX = {
    "inc", "inc.", "incorporated", "corp", "corp.", "corporation", "co", "co.",
    "company", "ltd", "ltd.", "limited", "plc", "llc", "nv", "n.v.", "sa",
    "s.a.", "se", "ag", "adr", "holdings", "holding", "group", "technologies",
    "technology", "systems", "networks", "platforms", "software", "manufacturing",
    "semiconductor", "semiconductors", "solutions", "international", "trust",
    "pharmaceuticals", "services", "automation", "enterprise",
}
# ...but never let the core collapse down to one of these generic / geographic
# words (e.g. don't reduce "Taiwan Semiconductor Manufacturing" to "Taiwan").
GENERIC = {
    "taiwan", "american", "global", "general", "international", "advanced",
    "applied", "super", "digital", "trade", "check", "united", "national",
    "first", "data", "cloud", "micro", "power", "energy", "research",
    "business", "services",
}
# Extra hand-picked aliases the core-name rule can't derive (brands, short forms).
EXTRA = {
    "ARM":   ["Arm Holdings"],
    "GOOGL": ["Google", "Alphabet", "Waymo"],
    "AMZN":  ["Amazon", "AWS"],
    "META":  ["Meta", "Facebook"],
    "TSM":   ["TSMC", "Taiwan Semiconductor"],
    "AI":    ["C3.ai", "C3 AI"],
    "NXPI":  ["NXP"],
    "AMD":   ["AMD"],
    "SPCX":  ["SpaceX", "Space Exploration"],
    "MU":    ["Micron"],
}
# Replace the auto aliases entirely for names that collide with common English.
# "Snap" alone matches "stocks snap back", so only its distinctive brand counts.
NAME_OVERRIDE = {
    "SNAP": ["Snapchat"],
}
# Symbols that are also everyday words: never match them bare or in "(AI)" form
# — "(AI)" almost always means "artificial intelligence", not the C3.ai ticker.
# These tickers are matched only via $CASHTAG or their company name.
COMMON_SYM = {"AI", "ARM", "NOW", "PATH", "NET", "APP", "ALL", "ANY", "ARE", "ONE"}


def core_name(company):
    """Strip corporate suffixes to get the everyday company name."""
    toks = company.replace(",", " ").split()
    while len(toks) > 1:
        last = toks[-1].lower().strip(".")
        if last in SUFFIX:
            remain = toks[:-1]
            # don't collapse onto a single generic/geographic word
            if len(remain) == 1 and remain[0].lower() in GENERIC:
                break
            toks = remain
        else:
            break
    return " ".join(toks)


def aliases_for(sym, company):
    """The set of name strings that count as 'this headline is about <sym>'."""
    if sym in NAME_OVERRIDE:
        return set(NAME_OVERRIDE[sym])
    al = set()
    c = core_name(company.get(sym, ""))
    if len(c) >= 4:                 # too-short cores (e.g. "KLA") are ambiguous
        al.add(c)
    al.update(EXTRA.get(sym, []))
    return al


def build_matcher(company):
    """Compile, once, the regex patterns that detect each ticker in a title."""
    matcher = {}
    for sym in company:
        pats = []
        s = re.escape(sym)
        # $TICKER cashtag — always an unambiguous ticker reference
        pats.append(re.compile(r"(?<![A-Za-z0-9])\$" + s + r"\b"))
        # (TICKER) or (NYSE:TICKER) — skip common-word tickers like "(AI)"
        if sym not in COMMON_SYM:
            pats.append(re.compile(r"[(:]\s*" + s + r"\b"))
        # bare UPPERCASE symbol — case-sensitive so "on"/"now"/"arm" don't match
        if len(sym) >= 3 and sym not in COMMON_SYM:
            pats.append(re.compile(r"(?<![A-Za-z0-9.$])" + s + r"(?![A-Za-z0-9])"))
        # company-name aliases — case-insensitive, whole-word
        for a in aliases_for(sym, company):
            pats.append(re.compile(r"(?<![A-Za-z0-9])" + re.escape(a) + r"(?![A-Za-z0-9])", re.I))
        matcher[sym] = pats
    return matcher


def title_tickers(text, matcher):
    """Tickers whose symbol or company name actually appears in the title."""
    hits = [sym for sym, pats in matcher.items() if any(p.search(text) for p in pats)]
    return sorted(set(hits))


def _iso(ts):
    try:
        return dt.datetime.fromtimestamp(int(ts), dt.timezone.utc).isoformat(timespec="seconds")
    except (TypeError, ValueError):
        return str(ts or "")


def _search_headlines(symbol):
    # Yahoo's per-ticker feed (Ticker.news) returns an empty list for every
    # symbol as of Oct 2026, so the feed went blank. The search endpoint still
    # returns the same stories, so it is the primary source now.
    try:
        raw = yf.Search(symbol, news_count=MAX_PER_SYMBOL, max_results=1).news or []
    except Exception:
        return []
    out = []
    for n in raw[:MAX_PER_SYMBOL]:
        if not n.get("title"):
            continue
        out.append({
            "id": n.get("uuid") or n["title"],
            "title": n["title"],
            "url": n.get("link", ""),
            "publisher": n.get("publisher", ""),
            "published": _iso(n.get("providerPublishTime")),
        })
    return out


def headlines_for(symbol):
    found = _search_headlines(symbol)
    if found:
        return found
    try:
        items = yf.Ticker(symbol).news or []
    except Exception:
        return []
    out = []
    for item in items[:MAX_PER_SYMBOL]:
        c = item.get("content", item)
        title = c.get("title")
        if not title:
            continue
        url = ""
        for key in ("clickThroughUrl", "canonicalUrl"):
            v = c.get(key)
            if isinstance(v, dict) and v.get("url"):
                url = v["url"]; break
        out.append({
            "id": c.get("id") or title,
            "title": title,
            "url": url,
            "publisher": (c.get("provider") or {}).get("displayName", ""),
            "published": c.get("pubDate", "") or c.get("displayTime", ""),
        })
    return out


def main():
    uni = json.load(open(os.path.join(HERE, "universe.json")))
    company = {}                     # ticker -> company name (for matching)
    sector = {}                      # ticker -> bubble/sector id (for tags)
    for b in uni["bubbles"]:
        for t in b["tickers"]:
            company[t["ticker"]] = t.get("company", "")
            sector[t["ticker"]] = b["id"]
    matcher = build_matcher(company)

    # Feeds we PULL stories from (the source feed no longer decides the tags).
    scope = list(company) + list(ETF_HOLDINGS)
    seen = set()
    scope = [s for s in scope if not (s in seen or seen.add(s))]

    merged = {}                     # id -> story (title/url/publisher/published)
    print(f"Pulling news for {len(scope)} symbols...")
    for sym in scope:
        for h in headlines_for(sym):
            merged.setdefault(h["id"], {k: h[k] for k in ("title", "url", "publisher", "published")})
        time.sleep(0.25)

    if not merged:
        # keep the last good news.json (the panel must not go blank) and fail
        # loudly so the Actions run shows red instead of publishing nothing
        sys.exit("fetch_news: 0 headlines collected from any symbol — news.json left unchanged")

    # Re-tag every story by what its title actually names; drop the off-topic ones.
    items = []
    for m in merged.values():
        tickers = title_tickers(m["title"], matcher)
        if not tickers:             # names none of our companies -> not AI news
            continue
        sectors = sorted({sector[t] for t in tickers})
        items.append({**m, "tickers": tickers, "sectors": sectors})

    dropped = len(merged) - len(items)
    items = sorted(items, key=lambda x: x["published"] or "", reverse=True)[:MAX_ITEMS]
    payload = {
        "as_of_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "count": len(items),
        "items": items,
    }
    with open(os.path.join(HERE, "news.json"), "w") as f:
        json.dump(payload, f, indent=1)
    print(f"Wrote news.json — {len(items)} tagged stories "
          f"({len(merged)} collected, {dropped} dropped as off-topic).")


if __name__ == "__main__":
    main()
