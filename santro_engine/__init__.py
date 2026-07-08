"""Santro research engine — deterministic core.

Python/data-first. The LLM (when one is ever added) is a NARRATIVE layer that
may only consume a finished ResearchPacket; it never computes numbers, resolves
tickers, or receives raw user input as instruction. See llm_summary boundary
policy in the audit docs.

Nothing here calls an LLM or the network. Entity resolution is a membership test
against a CLOSED set loaded from Santro's own data files, so user input can never
select a file path, URL, or symbol outside the known universe.
"""
__all__ = ["schemas", "normalize", "ticker_resolver", "evidence", "research_packet"]
__version__ = "0.1.0"
