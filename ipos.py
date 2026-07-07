#!/usr/bin/env python3
"""
ipos.py — curated AI IPO universe. Edit this file to add/remove names.

LISTED: already trading. ipo_date + ipo_price are HISTORICAL FACTS (the offering
date and price) — they never change; update_ipos.py computes day-1/week-1/
month-1 and since-IPO returns from them plus live Yahoo data.

PREIPO: private / filed companies with no ticker yet — curated cards. Valuations
are approximate, from public reporting; maintain them like a watchlist.
"""

# ticker, company, ipo_date (YYYY-MM-DD), ipo_price (offering $)
LISTED = [
    ("SPCX", "SpaceX",            "2026-06-12", 135.00),
    ("QNT",  "Quantinuum",        "2026-06-04", 60.00),
    ("CRCL", "Circle",            "2025-06-05", 31.00),
    ("CRWV", "CoreWeave",         "2025-03-28", 40.00),
    ("NBIS", "Nebius Group",      "2024-10-21", 20.00),
    ("ALAB", "Astera Labs",       "2024-03-20", 36.00),
    ("TEM",  "Tempus AI",         "2024-06-14", 37.00),
    ("RDDT", "Reddit",            "2024-03-21", 34.00),
    ("ARM",  "Arm Holdings",      "2023-09-14", 51.00),
]

# name, slug, sector blurb, last valuation (approx, public reporting), status
PREIPO = [
    ("Anthropic",  "anthropic",  "Claude models — the AI IPO the market is asking for",
     "~$350B", "Private · pre-IPO"),
    ("OpenAI",     "openai",     "ChatGPT and the GPT model family",
     "~$500B", "Private · pre-IPO"),
    ("xAI",        "xai",        "Grok, integrated with X",
     "~$200B", "Private · pre-IPO"),
    ("Databricks", "databricks", "Data + AI lakehouse platform",
     "~$130B", "Private · pre-IPO"),
    ("Anduril",    "anduril",    "Autonomous systems & defense AI",
     "~$30B",  "Private · pre-IPO"),
    ("Mistral AI", "mistral",    "Open-weight frontier models (France)",
     "~$14B",  "Private · pre-IPO"),
    ("Cerebras",   "cerebras",   "Wafer-scale AI training chips",
     "~$8B",   "Filed · S-1"),
    ("Syntiant",   "syntiant",   "Ultra-low-power edge-AI chips (filed S-1, 2026-07-06)",
     "—",      "Filed · S-1"),
    ("SK hynix US ADS", "sk-hynix-adr", "HBM leader listing ADSs on Nasdaq — reported ~$28B raise",
     "—",      "Filed · F-1"),
    ("Csquare",    "csquare",    "Brookfield-backed AI data centers — reported $23–27 range",
     "~$4.2B", "Filed · S-1"),
    ("GenXAI",     "genxai",     "AI analytics platform",
     "—",      "Private · pre-IPO"),
]
