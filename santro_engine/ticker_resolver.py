"""Deterministic entity resolution against a CLOSED known set.

Loads the known universe from Santro's own data files (a FIXED path — never
derived from user input). Resolution is exact-ticker / company-name / alias /
fuzzy, all restricted to that closed set. Therefore any symbol this module
returns is guaranteed to already exist in Santro's data — user input can never
introduce a new symbol, path, or URL.
"""
from __future__ import annotations

import difflib
import json
import os
from functools import lru_cache

from .schemas import ResolvedEntity

# fixed, code-controlled data locations (never user-influenced)
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_UNIVERSE = os.path.join(_ROOT, "universe.json")
_ECOSYSTEM = os.path.join(_ROOT, "ecosystem.json")

# hand-curated aliases (extend as needed). Keys are lowercase alias -> ticker.
_ALIASES = {
    "vertiv": "VRT", "nvidia": "NVDA", "advanced micro devices": "AMD",
    "micron": "MU", "super micro": "SMCI", "palantir": "PLTR",
    "taiwan semiconductor": "TSM", "tsmc": "TSM", "broadcom": "AVGO",
    "arm holdings": "ARM", "sk hynix": "HXSCL", "alibaba": "BABA",
}


@lru_cache(maxsize=1)
def _known():
    """Return (by_ticker, by_name, names_list). Closed set from data files."""
    by_ticker, by_name = {}, {}

    def add(t, source, theme=""):
        sym = str(t.get("ticker", "")).strip().upper()
        if not sym:
            return
        rec = {
            "symbol": sym,
            "name": str(t.get("company", "") or sym),
            "sector": t.get("sector", ""),
            "industry": t.get("industry", ""),
            "theme": theme,
            "asset_type": "stock",
            "source": source,
            "raw": t,
        }
        by_ticker.setdefault(sym, rec)
        nm = rec["name"].lower().strip()
        if nm:
            by_name.setdefault(nm, rec)

    try:
        u = json.load(open(_UNIVERSE, encoding="utf-8"))
        for b in u.get("bubbles", []):
            for t in b.get("tickers", []):
                add(t, "universe.json", theme=b.get("id", ""))
    except (OSError, ValueError):
        pass
    try:
        e = json.load(open(_ECOSYSTEM, encoding="utf-8"))
        for t in e.get("tickers", []):
            add(t, "ecosystem.json", theme="nvidia_ecosystem")
    except (OSError, ValueError):
        pass

    return by_ticker, by_name, list(by_name.keys())


def _core_name(name: str) -> str:
    n = name.lower()
    for suf in (" corp", " corporation", " inc", " inc.", " ltd", " plc",
                " holdings", " co", " company", " technologies", " group", ","):
        n = n.replace(suf, "")
    return n.strip()


def resolve(query: str, candidates=None, limit: int = 5):
    """Resolve a normalized query to ranked ResolvedEntity list (closed set).

    Never fetches, never evals, never touches a path/url from `query`.
    """
    by_ticker, by_name, names = _known()
    out, seen = [], set()

    def emit(rec, conf, kind):
        if rec["symbol"] in seen:
            return
        seen.add(rec["symbol"])
        out.append(ResolvedEntity(
            symbol=rec["symbol"], name=rec["name"], asset_type=rec["asset_type"],
            confidence=round(conf, 3), aliases=[], source=rec["source"], match_kind=kind))

    q = (query or "").strip()
    ql = q.lower()

    # 1) exact ticker(s) — from charset-validated candidates and the whole query
    toks = list(candidates or [])
    if q.upper() not in toks:
        toks = [q.upper()] + toks
    for tok in toks:
        if tok in by_ticker:
            emit(by_ticker[tok], 0.99, "exact")

    # 2) alias exact
    if ql in _ALIASES and _ALIASES[ql] in by_ticker:
        emit(by_ticker[_ALIASES[ql]], 0.97, "alias")

    # 3) company-name: exact, then core-name, then substring
    if ql in by_name:
        emit(by_name[ql], 0.95, "name")
    core = _core_name(ql)
    for nm, rec in by_name.items():
        if _core_name(nm) == core and core:
            emit(rec, 0.9, "name")
    if len(q) >= 3:
        for nm, rec in by_name.items():
            if ql in nm or core and core in _core_name(nm):
                emit(rec, 0.7, "name")

    # 4) fuzzy — ONLY against the known name set (bounded, never invents)
    if not out and len(q) >= 3:
        for nm in difflib.get_close_matches(ql, names, n=limit, cutoff=0.72):
            emit(by_name[nm], round(difflib.SequenceMatcher(None, ql, nm).ratio(), 2), "fuzzy")

    out.sort(key=lambda e: e.confidence, reverse=True)
    return out[:limit]


def snapshot_for(symbol: str):
    """Return the raw data record for a resolved symbol (closed set), or None."""
    by_ticker, _, _ = _known()
    rec = by_ticker.get(symbol.upper())
    return rec["raw"] if rec else None
