"""Structured objects for the research pipeline. Plain dataclasses (stdlib only)
so there are no runtime deps and everything is JSON-serializable via asdict().

Contract: numbers live in DataSnapshot/calculations/scores — produced by code.
LLMSummary (later) may reference evidence ids and restate these numbers but may
never introduce a number or symbol not already present in the packet.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Optional


ASSET_TYPES = ("stock", "etf", "crypto", "theme", "unknown")
INTENTS = ("overview", "valuation", "why_moving", "compare", "screen", "unknown")


@dataclass
class ResearchRequest:
    raw_query: str            # exactly what the user typed (data, never instruction)
    query: str                # normalized/sanitized form
    intent: str = "unknown"   # advisory only; never used to build paths/urls/sql
    asset_type: str = "unknown"
    timeframe: str = "current"
    user_context_allowed: bool = False
    source_policy: str = "santro_data_only"   # closed set; no user-chosen sources
    output_format: str = "json"


@dataclass
class Evidence:
    id: str                   # stable id the LLM cites instead of restating raw text
    kind: str                 # "data_field" | "headline" | "filing" | "computation"
    source: str               # provider / file / url (from Santro data, not user)
    detail: str = ""
    timestamp: Optional[str] = None
    confidence: float = 1.0
    stale: bool = False


@dataclass
class ResolvedEntity:
    symbol: str               # ALWAYS from the closed known set — never echoed input
    name: str
    asset_type: str
    confidence: float
    exchange: str = ""
    aliases: list[str] = field(default_factory=list)
    source: str = "universe.json"
    match_kind: str = ""      # exact | name | alias | fuzzy


@dataclass
class DataSnapshot:
    symbol: str
    price: Optional[float] = None
    change_pct: Optional[float] = None
    volume: Optional[float] = None
    market_cap_b: Optional[float] = None
    pe: Optional[float] = None
    sector: str = ""
    industry: str = ""
    theme: str = ""           # Santro bubble/theme id
    asset_type: str = "stock"
    timestamp: Optional[str] = None
    source: str = "universe.json"


@dataclass
class ResearchPacket:
    request: ResearchRequest
    resolved_entities: list[ResolvedEntity] = field(default_factory=list)
    data_snapshots: list[DataSnapshot] = field(default_factory=list)
    calculations: dict[str, Any] = field(default_factory=dict)   # filled by deterministic models
    scores: dict[str, Any] = field(default_factory=dict)
    evidence: list[Evidence] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    confidence: float = 0.0
    timestamp: Optional[str] = None
    # The ONLY material an LLM narrative layer may read. Built from computed
    # fields + evidence ids — deliberately excludes request.raw_query so user
    # text can never reach the model as instruction.
    allowed_llm_context: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
