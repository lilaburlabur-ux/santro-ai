#!/usr/bin/env python3
"""
update_takeaways.py — generate takeaways/takeaways.json from the live data.

WHY THIS EXISTS: the Key Takeaways panel read a hand-authored takeaways.json
that had NO generator and NO workflow, so it froze whenever nobody ran the
Cowork "key-takeaways" skill by hand (it sat on Fri Jun 12's close for days).

The full editorial methodology (takeaways/methodology.md) is an LLM skill with
web research — not runnable keyless in CI. This is the automated baseline:
honest, session-aware cards built from the same data the site already
publishes (AI universe movers + sectors, AI Bubble Index, hot tickers, tape).
Always fresh, never stale. Card format + session lenses follow methodology.md.
"""

import os
import json
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

try:
    from zoneinfo import ZoneInfo
    NY = ZoneInfo("America/New_York")
except Exception:
    NY = dt.timezone(dt.timedelta(hours=-4))   # fallback ~ET

# NYSE full-day market holidays (the tape is frozen on these — we must label the
# panel so it doesn't imply live trading). Dates are the actual closures incl.
# observed-day shifts. Extend yearly.
MARKET_HOLIDAYS = {
    "2026-01-01": "New Year's Day",
    "2026-01-19": "Martin Luther King Jr. Day",
    "2026-02-16": "Presidents' Day",
    "2026-04-03": "Good Friday",
    "2026-05-25": "Memorial Day",
    "2026-06-19": "Juneteenth",
    "2026-07-03": "Independence Day (observed)",
    "2026-09-07": "Labor Day",
    "2026-11-26": "Thanksgiving",
    "2026-12-25": "Christmas Day",
    "2027-01-01": "New Year's Day",
    "2027-01-18": "Martin Luther King Jr. Day",
    "2027-02-15": "Presidents' Day",
    "2027-03-26": "Good Friday",
    "2027-05-31": "Memorial Day",
    "2027-06-18": "Juneteenth (observed)",
    "2027-07-05": "Independence Day (observed)",
    "2027-09-06": "Labor Day",
    "2027-11-25": "Thanksgiving",
    "2027-12-24": "Christmas Day (observed)",
}


def _now():
    """Current ET time, overridable via SANTRO_NOW (ISO) for testing holidays/
    sessions, e.g. SANTRO_NOW=2026-06-19T11:00:00."""
    override = os.environ.get("SANTRO_NOW")
    if override:
        try:
            d = dt.datetime.fromisoformat(override)
            return d if d.tzinfo else d.replace(tzinfo=NY)
        except Exception:
            pass
    return dt.datetime.now(NY)


def load(p):
    try:
        return json.load(open(p))
    except Exception:
        return None


def pct(x):
    x = x or 0
    return ("+" if x >= 0 else "") + f"{x:.2f}%"


def market_status(now):
    """(session_label, closed_reason). closed_reason is the holiday name or
    'the weekend' when the tape is shut all day, else None."""
    holiday = MARKET_HOLIDAYS.get(now.strftime("%Y-%m-%d"))
    if holiday:
        return f"{holiday} — markets closed", holiday
    if now.weekday() >= 5:
        return "Weekend recap", "the weekend"
    m = now.hour * 60 + now.minute
    if m < 4 * 60:
        return "Overnight", None
    if m < 9 * 60 + 30:
        return "Premarket", None
    if m < 14 * 60:
        return "Midday", None
    if m < 16 * 60:
        return "Into the close", None
    if m < 20 * 60:
        return "After hours", None
    return "Overnight", None


def main():
    uni = load("universe.json")
    bi = load("bubble_index.json")
    hot = load("hot_tickers.json")
    data = load("data.json")
    now = _now()
    session, closed_reason = market_status(now)

    tickers, sectors = [], []
    if uni and uni.get("bubbles"):
        for b in uni["bubbles"]:
            if b.get("avg_change_pct") is not None:
                sectors.append(b)
            for t in b.get("tickers", []):
                if t.get("change_pct") is not None:
                    tickers.append(t)

    tot = len(tickers)
    up = sum(1 for t in tickers if t["change_pct"] > 0)
    breadth = round(up / tot * 100) if tot else 0
    by_move = sorted(tickers, key=lambda t: -abs(t["change_pct"]))
    gainers = sorted([t for t in tickers if t["change_pct"] > 0],
                     key=lambda t: -t["change_pct"])[:5]
    losers = sorted([t for t in tickers if t["change_pct"] < 0],
                    key=lambda t: t["change_pct"])[:4]
    sec = sorted(sectors, key=lambda b: -b["avg_change_pct"])
    strong, weak = (sec[0], sec[-1]) if len(sec) >= 2 else (None, None)
    ix = (bi or {}).get("index") or {}

    cards = []

    # 0. markets-closed notice (holiday or weekend) — the tape is frozen, so say so
    if closed_reason:
        for_what = "the weekend" if closed_reason == "the weekend" else closed_reason
        cards.append({
            "headline": ("Markets closed for the weekend" if closed_reason == "the weekend"
                         else f"Markets closed — {closed_reason}"),
            "body": (f"US equity markets are shut for {for_what}, so the tape is frozen at the "
                     "previous session's close. Everything below reflects that last close — not live "
                     "trading — and refreshes when the market reopens."),
            "tickers": [], "watch": None})

    # 1. market / macro card — the tape + breadth + dominant story
    tape_bits = []
    for it in (data or {}).get("tape", []) or []:
        lab = (it.get("label") or "")
        if any(k in lab for k in ("SPX", "Nasdaq", "Dow", "BTC", "Gold")):
            tape_bits.append(f"{lab} {pct(it.get('change_pct'))}")
    tone = ("a broad bid" if breadth >= 58 else
            "broad selling" if breadth <= 42 else "a mixed, rotational tape")
    if closed_reason:
        mbody = f"At the last close, {breadth}% of {tot} AI names were green — {tone}."
    else:
        mbody = f"{breadth}% of {tot} AI names are green — {tone}."
    if tape_bits:
        mbody = " · ".join(tape_bits[:4]) + ". " + mbody
    if strong:
        lift = "did the heavy lifting" if closed_reason else "is doing the heavy lifting"
        mbody += f" {strong['label']} {lift} at {pct(strong['avg_change_pct'])}."
    cards.append({
        "headline": (f"Last close: {tone}, {breadth}% of AI names green" if closed_reason
                     else f"The tape: {tone}, {breadth}% of AI names green"),
        "body": mbody, "tickers": [], "watch": None})

    # 2. sector rotation card
    if strong and weak and strong is not weak:
        cards.append({
            "headline": f"{strong['label']} leads, {weak['label']} lags",
            "body": (f"Strongest AI sector is {strong['label']} at {pct(strong['avg_change_pct'])}; "
                     f"weakest is {weak['label']} at {pct(weak['avg_change_pct'])}. "
                     f"Rotation within the AI trade, not a one-way move."),
            "tickers": [], "watch": None})

    # 3. movers card — leaders and laggards
    if gainers or losers:
        top = by_move[0]
        body = ""
        if gainers:
            body += "Leaders: " + ", ".join(f"{t['ticker']} {pct(t['change_pct'])}" for t in gainers)
        if losers:
            body += (". Laggards: " if body else "Laggards: ") + ", ".join(
                f"{t['ticker']} {pct(t['change_pct'])}" for t in losers)
        body += "."
        cards.append({
            "headline": f"{top['ticker']} is the standout at {pct(top['change_pct'])}",
            "body": body, "tickers": [t["ticker"] for t in (gainers + losers)][:6],
            "watch": "Hot means attention, not direction — watch whether the leaders hold the bid or fade into the next session."})

    # 4. SpaceX single-name card (the attention magnet)
    spcx = next((t for t in tickers if t["ticker"] == "SPCX"), None)
    if spcx:
        px = spcx.get("price")
        cards.append({
            "headline": f"SpaceX (SPCX) {pct(spcx['change_pct'])}" + (f" at ${px}" if px else ""),
            "body": (f"The SpaceX debut keeps pulling attention — SPCX is {pct(spcx['change_pct'])} this session. "
                     f"The biggest IPO in history remains the tape's attention magnet."),
            "tickers": ["SPCX"], "watch": None})

    # 5. hot, no-catalyst single-name card
    nn = next((c for c in ((hot or {}).get("hot_tickers") or [])
               if c.get("catalyst_type") == "no_news_mover"), None)
    if nn:
        cards.append({
            "headline": f"{nn['ticker']} moving on no clear catalyst",
            "body": (f"{nn['ticker']} is {pct(nn.get('move_pct'))} with no fresh headline this cycle — "
                     f"attention without a story. Volume, not news, is doing the work."),
            "tickers": [nn["ticker"]], "watch": None})

    # 6. risk card — the AI Bubble Index (the thing that could invalidate)
    if ix.get("overall") is not None:
        P = [("valuation", "Valuation"), ("capitalFlows", "Market Concentration"),
             ("adoption", "Momentum & Technical"), ("sentiment", "Sentiment & Hype"),
             ("systemicRisk", "Systemic Risk")]
        drv = max(((ix[k], nm) for k, nm in P if ix.get(k) is not None), default=(None, None))
        cards.append({
            "headline": f"Risk: AI bubble index {round(ix['overall'])} — {ix.get('label', '')}",
            "body": (f"The composite AI Bubble Index sits at {round(ix['overall'])}/100"
                     + (f", led by {drv[1]} at {round(drv[0])}" if drv[1] is not None else "")
                     + ". Higher = frothier; the risk is everyone caring at once while valuations are already stretched."),
            "tickers": [], "watch": None})

    # "since last" one-line summary of the current picture
    sl = f"{breadth}% of {tot} AI names green"
    if strong:
        sl += f"; {strong['label']} leads {pct(strong['avg_change_pct'])}"
    if ix.get("overall") is not None:
        sl += f"; AI bubble risk {round(ix['overall'])} {ix.get('label', '')}"
    sl += "."

    out = {
        "session": session,
        "generated_et": now.strftime("%a %b %-d, %Y · %-I:%M %p ET"),
        "generated_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "since_last": sl,
        "cards": cards,
    }
    os.makedirs("takeaways", exist_ok=True)
    json.dump(out, open("takeaways/takeaways.json", "w"), indent=1)
    print(f"takeaways.json — {session}, {len(cards)} cards, breadth {breadth}% "
          f"({up}/{tot})")


if __name__ == "__main__":
    main()
