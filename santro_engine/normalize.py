"""Safe input parsing. User input is DATA, never instruction, never executable.

Guarantees:
- length-capped, control chars stripped, whitespace collapsed
- intent detection is a keyword whitelist; the result is advisory metadata only
  and is NEVER used to construct a file path, URL, shell command, or SQL
- candidate ticker tokens are extracted by a strict charset regex; whether a
  token is "real" is decided later by membership in the closed known set
- prompt-control phrases (e.g. "ignore previous instructions") are flagged and
  neutralized to plain text — they carry no power here because nothing in this
  pipeline interprets the query as commands
"""
from __future__ import annotations

import re
import unicodedata

MAX_QUERY = 120

# advisory intent hints only
_INTENT_PATTERNS = [
    ("valuation", re.compile(r"\b(valuation|fair value|dcf|intrinsic|overvalued|undervalued|price target|worth)\b", re.I)),
    ("why_moving", re.compile(r"\b(why|moving|move|moved|dropp|fell|surg|spike|rally|selloff|catalyst)\w*\b", re.I)),
    ("compare", re.compile(r"\b(vs\.?|versus|compare|compared)\b", re.I)),
    ("screen", re.compile(r"\b(stocks?|etfs?|tokens?|names?|basket|list|which|top|best)\b", re.I)),
]

_ASSET_HINTS = [
    ("crypto", re.compile(r"\b(crypto|token|coin|on[- ]?chain|defi|depin)\b", re.I)),
    ("etf", re.compile(r"\b(etf|fund|index)\b", re.I)),
    ("theme", re.compile(r"\b(theme|sector|power|energy|semis?|semiconductors?|software|cloud|robotics?|data ?cent)\w*\b", re.I)),
]

# tokens that LOOK like a ticker (uppercase-ish, 1-6 chars). Confirmation happens
# in ticker_resolver against the closed universe; extraction here is charset-only.
_TICKER_TOKEN = re.compile(r"(?<![A-Za-z0-9])[A-Za-z]{1,6}(?:[.\-][A-Za-z]{1,3})?(?![A-Za-z0-9])")

# phrases that a naive prompt wrapper might obey — recorded so callers/tests can
# assert they were seen and neutralized. We do NOT act on them.
_INJECTION = re.compile(
    r"(ignore (all |previous |above )?(instructions|prompts?)|disregard|"
    r"system prompt|you are now|act as|jailbreak|reveal (your )?(prompt|secrets?|key)|"
    r"rm -rf|sudo |;\s*drop table|<script|\$\{|`.*`)", re.I)


def normalize_query(raw: str):
    """Return (clean_query, meta). Pure; never raises on hostile input."""
    if raw is None:
        raw = ""
    s = str(raw)
    # strip control / non-printable, normalize unicode, collapse whitespace, cap
    s = unicodedata.normalize("NFKC", s)
    s = "".join(ch for ch in s if ch.isprintable())
    s = re.sub(r"\s+", " ", s).strip()
    truncated = len(s) > MAX_QUERY
    s = s[:MAX_QUERY]

    injection_flag = bool(_INJECTION.search(s))

    intent = "overview"
    for name, pat in _INTENT_PATTERNS:
        if pat.search(s):
            intent = name
            break

    asset_type = "unknown"
    for name, pat in _ASSET_HINTS:
        if pat.search(s):
            asset_type = name
            break

    # candidate ticker-like tokens (charset only; membership decided later)
    candidates = [m.group(0).upper() for m in _TICKER_TOKEN.finditer(s)]
    # de-dupe, drop common English stopwords that fit the charset
    stop = {"THE", "AND", "FOR", "WHY", "IS", "ARE", "AI", "VS", "TOP", "BEST", "OF", "IN", "ON", "A", "AN"}
    seen, cands = set(), []
    for c in candidates:
        if c in stop or c in seen:
            continue
        seen.add(c)
        cands.append(c)

    meta = {
        "intent": intent,
        "asset_type": asset_type,
        "candidates": cands,
        "truncated": truncated,
        "injection_detected": injection_flag,
    }
    return s, meta
