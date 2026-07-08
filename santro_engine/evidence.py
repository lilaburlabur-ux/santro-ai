"""Evidence records: every material fact in a packet is traceable to a source
with a timestamp and a staleness flag. The LLM narrative layer cites these ids
rather than restating raw text, so provenance is preserved and nothing is
invented.
"""
from __future__ import annotations

from datetime import datetime, timezone

from .schemas import Evidence

_STALE_MINUTES = 90  # a delayed-quote product; flag data older than this


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def data_field(eid: str, field_name: str, source: str, timestamp: str | None = None,
               confidence: float = 1.0) -> Evidence:
    stale = _is_stale(timestamp)
    return Evidence(id=eid, kind="data_field", source=source,
                    detail=field_name, timestamp=timestamp, confidence=confidence, stale=stale)


def computation(eid: str, what: str, source: str = "santro_engine") -> Evidence:
    return Evidence(id=eid, kind="computation", source=source, detail=what,
                    timestamp=now_iso(), confidence=1.0, stale=False)


def _is_stale(timestamp: str | None) -> bool:
    if not timestamp:
        return False
    for fmt in ("%Y-%m-%d %H:%M UTC", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S UTC"):
        try:
            dt = datetime.strptime(timestamp, fmt).replace(tzinfo=timezone.utc)
            age_min = (datetime.now(timezone.utc) - dt).total_seconds() / 60
            return age_min > _STALE_MINUTES
        except ValueError:
            continue
    return False
