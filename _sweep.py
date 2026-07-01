#!/usr/bin/env python3
"""One-shot SEO/positioning sweep. Exact-string replaces for the footer
positioning line + foot-nav (identical across pages); regex for per-page
metadata; targeted replaces for stale 'live' wording. UTF-8 safe."""
import glob, re, os

files = sorted(set(glob.glob("*.html") + glob.glob("blog/*.html") + glob.glob("stocks/*.html")))

OLD_POS = "AI bubble map &amp; research journal for the AI narrative"
NEW_POS = "the AI bubble terminal for AI stocks, ETFs, crypto, hot tickers, research and bubble-risk signals"

FOOTNAV_OLD = ('<a href="/">Terminal</a> · <a href="/stocks">Stocks</a> · <a href="/ipos">IPOs</a> · '
  '<a href="/etfs">ETFs</a> · <a href="/crypto">Crypto</a> · <a href="/news">News</a> · '
  '<a href="/research">Research</a> · <a href="/blog">Blog</a> · <a href="/about">About</a> · '
  '<a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>')
FOOTNAV_NEW = ('<a href="/">Terminal</a> · <a href="/stocks">Stocks</a> · <a href="/crypto">Crypto</a> · '
  '<a href="/bubble">Bubble risk</a> · <a href="/etfs">ETFs</a> · <a href="/ipos">IPOs</a> · '
  '<a href="/news">News</a> · <a href="/research">Research</a> · <a href="/blog">Blog</a> · '
  '<a href="/share">Share</a> · <a href="/about">About</a> · <a href="/privacy">Privacy</a> · '
  '<a href="/terms">Terms</a>')

# per-file targeted (filename -> list of (old, new))
TARGET = {
  "news.html": [("AI Market News — live feed", "AI Market News — auto-updated, sourced headlines")],
  "index.html": [
    ("Santro AI — Live AI Stock Bubble Map, IPOs &amp; Research", "Santro AI — AI Bubble Terminal for Stocks, ETFs &amp; Crypto"),
    ("Bubble map and research journal for the AI narrative: live AI-sector bubbles, hot tickers with the why, signed research and market news.",
     "The AI bubble terminal: AI-sector bubbles, hot tickers with the sourced why, ETFs, AI crypto, research, valuation tools and a bubble-risk signal. Quotes delayed ~15 min."),
  ],
  "share.html": [("Auto-built from the live tape", "Auto-built from the delayed market tape")],
}

# per-file metadata (filename -> {title, desc})
META = {
  "stocks.html": {
    "title": "AI Stocks Bubble Map — Hot Tickers &amp; Sector Signals | Santro AI",
    "desc": "Track AI stocks across semiconductors, memory, power, data centers, software and infrastructure with bubble maps and delayed market data. Hot means attention, not direction. Not financial advice."},
  "etfs.html": {
    "title": "AI ETFs List — Compare AI, Semiconductor &amp; Robotics Funds | Santro AI",
    "desc": "Compare AI-related ETFs by theme, exposure, overlap, concentration and fund structure with Santro AI. See what's actually inside each fund. Not financial advice."},
  "research.html": {
    "title": "AI Stock Research Reports &amp; Market Notes | Santro AI",
    "desc": "Read Santro AI research on AI stocks, ETFs, crypto, valuation, bubble risk and market narratives. Delayed data; educational, not investment advice."},
  "share.html": {
    "title": "AI Market Share Cards — Movers, Bubble Risk &amp; Tickers | Santro AI",
    "desc": "Create Santro AI share cards for market movers, bubble risk, AI crypto, ETFs and ticker stories. Hot means attention, not direction. Not financial advice."},
}

def set_tag(s, title=None, desc=None):
    if title is not None:
        s = re.sub(r'<title>.*?</title>', '<title>' + title + '</title>', s, count=1, flags=re.S)
        # og:title + twitter:title that mirror the page title
        s = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + title + m.group(2), s, count=1)
        s = re.sub(r'(<meta name="twitter:title" content=")[^"]*(")', lambda m: m.group(1) + title.split(" | ")[0] + m.group(2), s, count=1)
    if desc is not None:
        s = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + desc + m.group(2), s, count=1)
        s = re.sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + desc + m.group(2), s, count=1)
    return s

changed = []
for f in files:
    s = open(f, encoding="utf-8").read(); orig = s
    s = s.replace(OLD_POS, NEW_POS)
    s = s.replace(FOOTNAV_OLD, FOOTNAV_NEW)
    for old, new in TARGET.get(os.path.basename(f), []):
        s = s.replace(old, new)
    if os.path.basename(f) in META:
        s = set_tag(s, META[os.path.basename(f)].get("title"), META[os.path.basename(f)].get("desc"))
    if s != orig:
        open(f, "w", encoding="utf-8").write(s); changed.append(f)

print("changed", len(changed), "files:")
for f in changed: print(" ", f)
# sanity: no old positioning left
import subprocess
left = subprocess.run(["grep", "-rl", "research journal for the AI narrative"] + files, capture_output=True, text=True).stdout.strip()
print("remaining old positioning:", left or "NONE")
