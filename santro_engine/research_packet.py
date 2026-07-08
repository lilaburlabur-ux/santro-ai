"""Build a deterministic ResearchPacket from a user query — no LLM, no network.

    python -m santro_engine.research_packet "VRT"
    python -m santro_engine.research_packet "Vertiv valuation"

Pipeline: normalize (data, not instruction) -> resolve against closed set ->
attach data snapshots + evidence from Santro's own files -> emit JSON. The
allowed_llm_context field is the ONLY thing a future narrative layer may read;
it excludes the raw query so user text can never reach a model as instruction.
"""
from __future__ import annotations

import json
import sys

from .schemas import ResearchRequest, ResearchPacket, DataSnapshot
from .normalize import normalize_query
from .ticker_resolver import resolve, snapshot_for
from . import evidence as ev


def build_packet(raw_query: str) -> ResearchPacket:
    clean, meta = normalize_query(raw_query)

    req = ResearchRequest(
        raw_query=str(raw_query)[:500],
        query=clean,
        intent=meta["intent"],
        asset_type=meta["asset_type"],
        user_context_allowed=False,
        source_policy="santro_data_only",
    )
    packet = ResearchPacket(request=req, timestamp=ev.now_iso())

    if meta["injection_detected"]:
        packet.warnings.append(
            "input contained prompt-control phrasing; treated strictly as data (no instruction executed)")
    if meta["truncated"]:
        packet.warnings.append("query truncated to 120 chars")

    entities = resolve(clean, candidates=meta["candidates"])
    packet.resolved_entities = entities

    if not entities:
        packet.warnings.append("no known Santro entity matched this query")
        packet.confidence = 0.0
    else:
        packet.confidence = round(entities[0].confidence, 3)
        if len(entities) > 1 and entities[0].confidence - entities[1].confidence < 0.1:
            packet.warnings.append(
                "ambiguous match — multiple entities with similar confidence; disambiguation required")

        for e in entities:
            raw = snapshot_for(e.symbol) or {}
            ts = None
            packet.data_snapshots.append(DataSnapshot(
                symbol=e.symbol,
                price=raw.get("price"),
                change_pct=raw.get("change_pct"),
                volume=raw.get("volume"),
                market_cap_b=raw.get("market_cap_b"),
                pe=raw.get("pe"),
                sector=raw.get("sector", ""),
                industry=raw.get("industry", ""),
                theme=e.source,
                asset_type=e.asset_type,
                timestamp=ts,
                source=e.source,
            ))
            packet.evidence.append(
                ev.data_field(f"ev:{e.symbol}:price", "price/change/mktcap", e.source, timestamp=ts))

    # calculations/scores are left for the deterministic model layer (Stage 3).
    # They are intentionally empty here — never filled by an LLM.
    packet.calculations = {}
    packet.scores = {}

    # LLM may see ONLY computed fields + evidence ids + warnings — never raw_query.
    packet.allowed_llm_context = {
        "intent": req.intent,
        "entities": [{"symbol": e.symbol, "name": e.name, "confidence": e.confidence,
                      "match_kind": e.match_kind} for e in entities],
        "snapshots": [{"symbol": s.symbol, "price": s.price, "change_pct": s.change_pct,
                       "market_cap_b": s.market_cap_b, "pe": s.pe, "sector": s.sector,
                       "industry": s.industry} for s in packet.data_snapshots],
        "evidence_ids": [e.id for e in packet.evidence],
        "warnings": packet.warnings,
        "confidence": packet.confidence,
    }
    return packet


def main(argv=None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    query = " ".join(argv) if argv else ""
    packet = build_packet(query)
    print(json.dumps(packet.to_dict(), indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
