#!/usr/bin/env python3
"""
research.py — generates a research-journal report per ticker, following the
method in AEHR.research.31.05.2026.pdf (the user's Cowork template):

  1. Executive Summary (scored: momentum / setup / fundamentals / value / risk)
  2. Company Overview and Recent Catalysts
  3. Technical Analysis        (52w range, SMA20/50/200, RSI14, ATR14, beta)
  4. Fundamental Analysis      (revenue, margins, balance sheet, valuation)
  5. Institutional Ownership   (inst %, insider %, short float, top holders)
  6. Risk Review and Setup Plan (+ the standard setup checklist)
  7. Full Data Snapshot
  8. Analyst Actions
  9. Conclusion + Sources

Data: free Yahoo Finance via yfinance (the template's Finviz pages block
robots; the same metrics are computed from Yahoo data and labeled as such).

Run:    .venv/bin/python research.py
Output: research/<TICKER>.research.DD.MM.YYYY.md  +  research/INDEX.md
"""

import os
import sys
import json
import time
import statistics
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import yfinance as yf
from tickers import TICKERS, NAMES

TODAY = dt.date.today()
SIGN = TODAY.strftime("%d.%m.%Y")
OUTDIR = os.path.join(HERE, "research")

DISCLAIMER = ("> Research journal, not financial advice. For education and decision "
              "journaling only — not a recommendation to buy, hold, or sell. "
              f"Public Yahoo Finance data retrieved {TODAY.isoformat()}.")

KEY_QUESTIONS = """**Key questions before any trade (standard):**
- Is the stock forming a new tight base, or is it simply extended after news-driven gaps?
- Where is the actual invalidation level? If that level is too far away, the setup is not clean.
- Is the move supported by new institutional demand or just retail/short-covering momentum?
- Can earnings convert fast enough to justify the valuation?
"""

CHECKLIST = """### Setup checklist for your journal
| Question | Pass condition |
|---|---|
| Is there a new base? | Tight sideways action near highs, declining volume, clear resistance. |
| Is the pivot obvious? | A clean level that multiple traders can see; not a random candle high. |
| Is risk defined? | Stop based on structure and less than the expected first upside target. |
| Is volume confirming? | Breakout volume expands; pullback volume dries up. |
| Is position size small enough? | A normal shakeout should not cause emotional decision-making. |
"""


# ---------- formatting helpers ----------
def fnum(x, nd=2, suffix=""):
    if x is None:
        return "—"
    return f"{x:,.{nd}f}{suffix}"

def fpct(x, nd=2):           # x is a fraction (0.72 -> 72.00%)
    return "—" if x is None else f"{x*100:.{nd}f}%"

def fpp(x, nd=2):            # x already in percent points
    return "—" if x is None else f"{x:+.{nd}f}%"

def fcap(n):
    if n is None: return "—"
    for div, s in ((1e12, "T"), (1e9, "B"), (1e6, "M")):
        if n >= div: return f"${n/div:.2f}{s}"
    return f"${n:,.0f}"


# ---------- indicators from price history ----------
def indicators(hist):
    """SMA distances, RSI14, ATR14, perf windows from daily OHLC history."""
    c = hist["Close"]
    out = {"price": float(c.iloc[-1])}
    for n in (20, 50, 200):
        if len(c) >= n:
            sma = float(c.rolling(n).mean().iloc[-1])
            out[f"sma{n}"] = sma
            out[f"sma{n}_dist"] = (out["price"] / sma - 1) * 100
    # RSI(14), Wilder
    delta = c.diff()
    gain = delta.clip(lower=0).ewm(alpha=1/14, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1/14, adjust=False).mean()
    rs = gain / loss
    out["rsi14"] = float((100 - 100 / (1 + rs)).iloc[-1])
    # ATR(14), Wilder
    tr = (hist["High"] - hist["Low"]).combine(
        (hist["High"] - c.shift()).abs(), max).combine(
        (hist["Low"] - c.shift()).abs(), max)
    out["atr14"] = float(tr.ewm(alpha=1/14, adjust=False).mean().iloc[-1])
    out["atr_pct"] = out["atr14"] / out["price"] * 100
    # performance windows (trading days)
    def perf(days):
        if len(c) > days:
            return (out["price"] / float(c.iloc[-1 - days]) - 1) * 100
        return None
    out["perf"] = {"Week": perf(5), "Month": perf(21), "Quarter": perf(63),
                   "Half Y": perf(126), "1Y": perf(252)}
    ytd = c[c.index.year == TODAY.year]
    out["perf"]["YTD"] = (out["price"] / float(ytd.iloc[0]) - 1) * 100 if len(ytd) else None
    out["hi52"] = float(c[-252:].max()) if len(c) else None
    out["lo52"] = float(c[-252:].min()) if len(c) else None
    # dated closes + structural stop level for the website research card
    out["last_bar"] = (str(hist.index[-1].date()), float(c.iloc[-1]))
    out["prev_bar"] = (str(hist.index[-2].date()), float(c.iloc[-2]))
    out["swing_low"] = float(hist["Low"].iloc[-20:].min())
    return out


# ---------- the method's scoring rubric (rule-based, documented) ----------
def scores(t, i):
    s = {}
    p1y, sma200 = i["perf"].get("1Y"), i.get("sma200_dist")
    if (p1y or 0) > 60 or (sma200 or 0) > 25:
        s["Technical momentum"] = ("High", f"1Y {fpp(p1y)}; price {fpp(sma200)} vs SMA200.")
    elif (sma200 or 0) < 0 and (i["perf"].get("Half Y") or 0) < 0:
        s["Technical momentum"] = ("Low", f"Below SMA200 ({fpp(sma200)}) with negative half-year ({fpp(i['perf'].get('Half Y'))}).")
    else:
        s["Technical momentum"] = ("Moderate", f"1Y {fpp(p1y)}; price {fpp(sma200)} vs SMA200.")

    off_high = (i["price"] / i["hi52"] - 1) * 100 if i.get("hi52") else None
    if off_high is not None and off_high > -5 and abs(i.get("sma20_dist") or 9) < 4:
        s["Fresh setup quality"] = ("Watch", f"{fpp(off_high)} from 52w high and near SMA20 — check for a tight base.")
    elif off_high is not None and off_high < -25:
        s["Fresh setup quality"] = ("Poor / broken", f"{fpp(off_high)} from 52w high — base needs to rebuild.")
    else:
        s["Fresh setup quality"] = ("Moderate / wait", f"{fpp(off_high)} from 52w high; no clean fresh pivot by default.")

    pm, rg = t.get("profitMargins"), t.get("revenueGrowth")
    if pm is not None and pm > 0.15 and (rg or 0) > 0.10:
        s["Fundamental quality"] = ("Strong", f"Profit margin {fpct(pm)}, revenue growth {fpct(rg)}.")
    elif pm is not None and pm < 0:
        s["Fundamental quality"] = ("Weak", f"Negative profit margin ({fpct(pm)}).")
    else:
        s["Fundamental quality"] = ("Mixed", f"Profit margin {fpct(pm)}, revenue growth {fpct(rg)}.")

    fpe, evs = t.get("forwardPE"), t.get("enterpriseToRevenue")
    if fpe is not None and fpe < 20:
        s["Value attractiveness"] = ("Reasonable", f"Forward P/E {fnum(fpe)}, EV/Sales {fnum(evs)}.")
    elif fpe is not None and fpe < 35:
        s["Value attractiveness"] = ("Fair-to-demanding", f"Forward P/E {fnum(fpe)}, EV/Sales {fnum(evs)}.")
    else:
        s["Value attractiveness"] = ("Low (expensive)", f"Forward P/E {fnum(fpe)}, EV/Sales {fnum(evs)}.")

    beta, atrp, sf = t.get("beta"), i.get("atr_pct"), t.get("shortPercentOfFloat")
    if (beta or 0) > 2 or (atrp or 0) > 5 or (sf or 0) > 0.10:
        s["Risk level"] = ("High", f"Beta {fnum(beta)}, ATR {fnum(atrp,1)}% of price, short float {fpct(sf)}.")
    elif (beta or 0) > 1.2 or (atrp or 0) > 3:
        s["Risk level"] = ("Elevated", f"Beta {fnum(beta)}, ATR {fnum(atrp,1)}% of price, short float {fpct(sf)}.")
    else:
        s["Risk level"] = ("Moderate", f"Beta {fnum(beta)}, ATR {fnum(atrp,1)}% of price, short float {fpct(sf)}.")
    return s


def make_card(sym, info, i, s, fname):
    """Compact research card for the website's Selected panel (research.json)."""
    last_d, last_c = i["last_bar"]
    prev_d, prev_c = i["prev_bar"]
    # "Close" must carry its real date: if the last daily bar is today's
    # (still-running) session, the completed close is the previous bar.
    close_d, close_c = (prev_d, prev_c) if last_d == TODAY.isoformat() else (last_d, last_c)

    px = i["price"]
    rec = info.get("recommendationMean")
    tgt = info.get("targetMeanPrice")
    upside = (tgt / px - 1) * 100 if tgt else None

    if rec is None:
        narrative = "—"
    elif rec <= 1.9 and (upside or 0) > 10:
        narrative = "Strong"
    elif rec <= 2.4:
        narrative = "Supportive"
    elif rec <= 3.0:
        narrative = "Neutral"
    else:
        narrative = "Weak"

    off_high = (px / i["hi52"] - 1) * 100 if i.get("hi52") else 0
    s200 = i.get("sma200_dist") or 0
    s50 = i.get("sma50_dist") or 0
    s20 = i.get("sma20_dist") or 0
    if s200 < 0:
        entry = "Broken — no zone"
    elif off_high > -5 and abs(s20) < 4:
        entry = "Near-high pivot watch"
    elif -18 < off_high <= -5 and (abs(s50) < 5 or 38 <= i["rsi14"] <= 55):
        entry = "Pullback zone forming"
    elif off_high <= -18:
        entry = "Deep pullback — needs base"
    else:
        entry = "Extended — wait"

    # R:R — structural stop = lower of SMA50 / 20-day swing low; reward to
    # analyst mean target (52w high if no target above price). Risk is floored
    # at 1x ATR(14): a stop tighter than one day's range is noise, and the
    # ratio is capped at 10+ so a near-zero denominator can't fake a setup.
    stop = min(i.get("sma50") or px, i.get("swing_low") or px)
    risk = max(px - stop, i.get("atr14") or 0)
    reward = (tgt - px) if (tgt and tgt > px) else ((i["hi52"] - px) if (i.get("hi52") or 0) > px else None)
    rr = None
    if reward and risk > 0:
        v = reward / risk
        rr = "10+" if v >= 10 else round(v, 1)

    thesis = (f"{s['Fundamental quality'][0]} fundamentals ({fpct(info.get('profitMargins'),0)} net margin, "
              f"{fpct(info.get('revenueGrowth'),0)} growth) at {fnum(info.get('forwardPE'),0)}x forward; "
              f"{s['Technical momentum'][0].lower()} momentum — {entry.lower()}.")

    base = f"{sym}.research.{SIGN}"
    report = base + (".pdf" if os.path.exists(os.path.join(OUTDIR, base + ".pdf")) else ".md")
    sf = info.get("shortPercentOfFloat")
    return {
        "name": info.get("longName") or NAMES.get(sym, sym),
        "thesis": thesis,
        "close": round(close_c, 2), "close_date": close_d,
        "pe_ttm": info.get("trailingPE"), "fwd_pe": info.get("forwardPE"),
        "short_float": round(sf * 100, 2) if sf is not None else None,
        "market_cap": info.get("marketCap"),
        "target": tgt, "analysts": info.get("numberOfAnalystOpinions"),
        "scores": {"technical": s["Technical momentum"][0], "narrative": narrative,
                   "entry_zone": entry, "rr": rr},
        "report": report,
    }


def md_table(rows, headers):
    out = ["| " + " | ".join(headers) + " |",
           "|" + "|".join("---" for _ in headers) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(x) for x in r) + " |")
    return "\n".join(out)


# ---------- one ticker -> one signed markdown report ----------
def build_report(sym):
    tk = yf.Ticker(sym)
    info = tk.get_info()
    hist = tk.history(period="2y", auto_adjust=True)
    if hist.empty:
        raise ValueError("no price history")
    i = indicators(hist)
    s = scores(info, i)
    name = info.get("longName") or NAMES.get(sym, sym)

    # news (catalysts)
    news = []
    try:
        for item in (tk.news or [])[:4]:
            c = item.get("content", item)
            if c.get("title"):
                news.append((c["title"],
                             (c.get("provider") or {}).get("displayName", ""),
                             (c.get("pubDate") or "")[:10]))
    except Exception:
        pass

    # institutional holders
    holders = []
    try:
        ih = tk.institutional_holders
        if ih is not None and not ih.empty:
            for _, r in ih.head(10).iterrows():
                pct = r.get("pctHeld")
                holders.append((r.get("Holder", "—"),
                                f"{r.get('Shares', 0):,.0f}",
                                fpct(pct) if pct is not None else "—",
                                str(r.get("Date Reported", "—"))[:10]))
    except Exception:
        pass

    # analyst actions
    actions = []
    try:
        ud = tk.upgrades_downgrades
        if ud is not None and not ud.empty:
            for idx, r in ud.head(8).iterrows():
                actions.append((str(idx)[:10], r.get("Action", "—"), r.get("Firm", "—"),
                                f"{r.get('FromGrade','') or '—'} → {r.get('ToGrade','') or '—'}"))
    except Exception:
        pass

    off_high = (i["price"] / i["hi52"] - 1) * 100 if i.get("hi52") else None
    above_low = (i["price"] / i["lo52"] - 1) * 100 if i.get("lo52") else None

    stance = (f"{s['Technical momentum'][0]} technical momentum, "
              f"{s['Fundamental quality'][0].lower()} fundamentals, "
              f"value: {s['Value attractiveness'][0].lower()}, risk: {s['Risk level'][0].lower()}.")

    risks = []
    if "expensive" in s["Value attractiveness"][0] or "demanding" in s["Value attractiveness"][0]:
        risks.append(f"**Valuation risk:** {s['Value attractiveness'][1]} Multiple compression is the main downside if growth disappoints.")
    if s["Risk level"][0] in ("High", "Elevated"):
        risks.append(f"**Volatility risk:** {s['Risk level'][1]} Size positions accordingly.")
    if (info.get("shortPercentOfFloat") or 0) > 0.05:
        risks.append(f"**Short interest risk:** short float {fpct(info.get('shortPercentOfFloat'))} can fuel squeezes both ways around news.")
    if (info.get("profitMargins") or 1) < 0:
        risks.append("**Profitability risk:** trailing margins are negative; not yet a proven compounding earnings story.")
    if off_high is not None and off_high > -8:
        risks.append("**Technical trap:** near 52-week highs — do not confuse an old breakout that already worked with a fresh entry.")
    elif off_high is not None and off_high < -25:
        risks.append("**Trend risk:** far below the 52-week high; falling-knife entries without a base are low-quality setups.")
    risks.append("**Macro/sector risk:** semis are high-beta to AI capex sentiment, rates, and export-control headlines.")

    m = []
    m.append(f"# {sym} Research Report")
    m.append(f"**{name}** — Technical + Fundamental Analysis, Data Snapshot, Institutional Investors")
    m.append(f"Signed file: `{sym}.research.{SIGN}`\n")
    m.append(md_table([
        ("Current price", f"${fnum(i['price'])} ({TODAY.isoformat()}, ~15-min delayed)"),
        ("Market cap", fcap(info.get("marketCap"))),
        ("Sector / Industry", f"{info.get('sector','—')} / {info.get('industry','—')}"),
        ("Main theme", info.get("industryDisp", "Semiconductors") + " — see catalysts below"),
        ("Current stance", stance),
    ], ["Field", "Value"]))
    m.append("\n" + DISCLAIMER + "\n")

    m.append("## 1. Executive Summary")
    m.append(md_table([(k, v[0], v[1]) for k, v in s.items()],
                      ["Area", "Score / Read", "Reason"]))
    m.append(f"\n**Bottom line:** {stance}\n")
    m.append(KEY_QUESTIONS)

    m.append("## 2. Company Overview and Recent Catalysts")
    summary = (info.get("longBusinessSummary") or "—")
    m.append(summary if len(summary) < 600 else summary[:600].rsplit(". ", 1)[0] + ".")
    if news:
        m.append("\n**Recent headlines (potential catalysts):**\n")
        m.append(md_table(news, ["Headline", "Source", "Date"]))

    m.append("\n## 3. Technical Analysis")
    m.append(md_table([
        ("Price vs 52-week range",
         f"Close ${fnum(i['price'])}; 52w high ${fnum(i.get('hi52'))} ({fpp(off_high)}); "
         f"52w low ${fnum(i.get('lo52'))} ({fpp(above_low)})"),
        ("Trend", f"{fpp(i.get('sma200_dist'))} vs SMA200, {fpp(i.get('sma50_dist'))} vs SMA50, "
                  f"{fpp(i.get('sma20_dist'))} vs SMA20"),
        ("Momentum", f"RSI(14) {fnum(i['rsi14'],1)} "
                     f"({'overbought' if i['rsi14']>70 else 'oversold' if i['rsi14']<30 else 'neutral'})"),
        ("Volatility", f"ATR(14) {fnum(i['atr14'])} (~{fnum(i['atr_pct'],1)}% of price); beta {fnum(info.get('beta'))}"),
        ("Setup perspective", s["Fresh setup quality"][1]),
    ], ["Technical item", "Read"]))
    m.append("\n**Performance snapshot:**\n")
    m.append(md_table([[k, fpp(v, 1)] for k, v in i["perf"].items()],
                      ["Window", "Return"]))

    m.append("\n## 4. Fundamental Analysis")
    m.append(md_table([
        ("Revenue (ttm)", fcap(info.get("totalRevenue")), f"Revenue growth {fpct(info.get('revenueGrowth'))} y/y"),
        ("Profitability", f"Gross {fpct(info.get('grossMargins'))}, operating {fpct(info.get('operatingMargins'))}, "
                          f"net {fpct(info.get('profitMargins'))}",
         f"ROA {fpct(info.get('returnOnAssets'))}, ROE {fpct(info.get('returnOnEquity'))}"),
        ("Balance sheet", f"Cash {fcap(info.get('totalCash'))}, debt {fcap(info.get('totalDebt'))}",
         f"Current ratio {fnum(info.get('currentRatio'))}, debt/equity {fnum(info.get('debtToEquity'))}"),
        ("Valuation", f"P/E {fnum(info.get('trailingPE'))}, forward P/E {fnum(info.get('forwardPE'))}, "
                      f"P/S {fnum(info.get('priceToSalesTrailing12Months'))}, P/B {fnum(info.get('priceToBook'))}",
         f"EV/Sales {fnum(info.get('enterpriseToRevenue'))}, EV/EBITDA {fnum(info.get('enterpriseToEbitda'))}"),
        ("Growth expectations", f"Earnings growth {fpct(info.get('earningsGrowth'))}, "
                                f"EPS q/q {fpct(info.get('earningsQuarterlyGrowth'))}",
         f"Analyst mean target ${fnum(info.get('targetMeanPrice'))} "
         f"({info.get('numberOfAnalystOpinions','—')} analysts)"),
    ], ["Factor", "Observation", "Implication / extra"]))

    m.append("\n## 5. Institutional Investors and Ownership")
    m.append(md_table([
        ("Institutional ownership", fpct(info.get("heldPercentInstitutions"))),
        ("Insider ownership", fpct(info.get("heldPercentInsiders"))),
        ("Short float", fpct(info.get("shortPercentOfFloat"))),
        ("Short ratio (days to cover)", fnum(info.get("shortRatio"), 1)),
    ], ["Metric", "Value"]))
    if holders:
        m.append("\n**Top institutional holders:**\n")
        m.append(md_table(holders, ["Holder", "Shares", "% Out", "Reported"]))

    m.append("\n## 6. Risk Review and Setup Plan")
    m.append("\n".join(f"- {r}" for r in risks) + "\n")
    m.append(CHECKLIST)

    m.append("## 7. Full Data Snapshot")
    snap = [
        ("Price", f"${fnum(i['price'])}"), ("Market cap", fcap(info.get("marketCap"))),
        ("Beta", fnum(info.get("beta"))), ("RSI(14)", fnum(i["rsi14"], 1)),
        ("ATR(14)", fnum(i["atr14"])), ("SMA20 dist", fpp(i.get("sma20_dist"))),
        ("SMA50 dist", fpp(i.get("sma50_dist"))), ("SMA200 dist", fpp(i.get("sma200_dist"))),
        ("52W high", f"${fnum(i.get('hi52'))}"), ("52W low", f"${fnum(i.get('lo52'))}"),
        ("P/E (ttm)", fnum(info.get("trailingPE"))), ("Forward P/E", fnum(info.get("forwardPE"))),
        ("PEG (trailing)", fnum(info.get("trailingPegRatio"))), ("P/S", fnum(info.get("priceToSalesTrailing12Months"))),
        ("P/B", fnum(info.get("priceToBook"))), ("EV/Sales", fnum(info.get("enterpriseToRevenue"))),
        ("EV/EBITDA", fnum(info.get("enterpriseToEbitda"))), ("Gross margin", fpct(info.get("grossMargins"))),
        ("Operating margin", fpct(info.get("operatingMargins"))), ("Profit margin", fpct(info.get("profitMargins"))),
        ("ROA", fpct(info.get("returnOnAssets"))), ("ROE", fpct(info.get("returnOnEquity"))),
        ("Revenue (ttm)", fcap(info.get("totalRevenue"))), ("Revenue growth y/y", fpct(info.get("revenueGrowth"))),
        ("Inst. ownership", fpct(info.get("heldPercentInstitutions"))), ("Insider ownership", fpct(info.get("heldPercentInsiders"))),
        ("Short float", fpct(info.get("shortPercentOfFloat"))), ("Avg volume", f"{(info.get('averageVolume') or 0):,}"),
        ("Employees", f"{(info.get('fullTimeEmployees') or 0):,}"), ("Analyst rec (1=buy..5=sell)", fnum(info.get("recommendationMean"), 1)),
    ]
    half = (len(snap) + 1) // 2
    m.append(md_table([(a[0], a[1], b[0], b[1]) for a, b in
                       zip(snap[:half], snap[half:] + [("", "")] * (2 * half - len(snap)))],
                      ["Metric", "Value", "Metric", "Value"]))

    m.append("\n## 8. Analyst Actions")
    m.append(md_table(actions, ["Date", "Action", "Firm", "Rating change"]) if actions
             else "_No recent analyst actions available from Yahoo._")

    m.append("\n## 9. Conclusion")
    m.append(f"{sym}: {s['Technical momentum'][0]} momentum / {s['Fundamental quality'][0].lower()} fundamentals / "
             f"{s['Value attractiveness'][0].lower()} value / {s['Risk level'][0].lower()} risk. "
             "Per the journal method: act only on a defined setup (new tight base, controlled pullback, or "
             "confirmed reclaim of a key level) with risk sized in advance — never chase an extended move.")

    m.append("\n## Sources")
    m.append(md_table([
        (f"Yahoo Finance quote/profile/statistics for {sym}", f"https://finance.yahoo.com/quote/{sym}", "Snapshot metrics, ownership, analyst data"),
        ("Yahoo Finance price history (via yfinance)", f"https://finance.yahoo.com/quote/{sym}/history", "SMA/RSI/ATR/performance calculations"),
        ("Yahoo Finance news feed", f"https://finance.yahoo.com/quote/{sym}/news", "Catalyst headlines"),
        ("Method template", "AEHR.research.31.05.2026.pdf (user's Cowork method)", "Report structure, scoring areas, checklist"),
    ], ["Source", "URL", "Used for"]))
    m.append("\n_Note: the template's native Finviz/Fintel/ADVFN pages block automated retrieval; "
             "equivalent metrics above are computed from Yahoo Finance data instead and labeled accordingly._")

    return f"{sym}.research.{SIGN}.md", "\n".join(m), s, i, info


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    rows, failed, cards, perf1y = [], [], {}, []
    for sym in TICKERS:
        try:
            fname, text, s, i, info = build_report(sym)
            with open(os.path.join(OUTDIR, fname), "w") as f:
                f.write(text)
            cards[sym] = make_card(sym, info, i, s, fname)
            if i["perf"].get("1Y") is not None:
                perf1y.append(i["perf"]["1Y"])
            rows.append((sym, fcap(info.get("marketCap")), fpp(i["perf"].get("1Y"), 0),
                         fnum(info.get("forwardPE"), 1), fpct(info.get("profitMargins"), 0),
                         s["Technical momentum"][0], s["Value attractiveness"][0], s["Risk level"][0]))
            print(f"  ok    {sym} -> research/{fname}")
        except Exception as e:
            failed.append(sym)
            print(f"  FAIL  {sym}: {e}")
        time.sleep(1.0)

    # sector-level Macro score (same for every name in the basket)
    med = statistics.median(perf1y) if perf1y else 0
    pos = sum(1 for p in perf1y if p > 0)
    macro_score = "Tailwind" if med > 40 else ("Neutral" if med > 0 else "Headwind")
    macro = {"score": macro_score,
             "note": f"Watchlist median 1Y {med:+.0f}%; {pos}/{len(perf1y)} names positive. Sector-level proxy."}

    with open(os.path.join(OUTDIR, "research.json"), "w") as f:
        json.dump({"signed": SIGN, "generated_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                   "macro": macro, "stocks": cards}, f, indent=1)
    print(f"Wrote research/research.json ({len(cards)} cards; macro: {macro_score})")

    idx = [f"# Watchlist Research Index — {SIGN}",
           DISCLAIMER, "",
           md_table(rows, ["Ticker", "Mkt cap", "1Y", "Fwd P/E", "Net margin",
                           "Momentum", "Value", "Risk"]),
           "", f"{len(rows)} reports generated; failed: {', '.join(failed) or 'none'}.",
           "", "Method: AEHR.research template (Cowork). One signed file per ticker in this folder."]
    with open(os.path.join(OUTDIR, "INDEX.md"), "w") as f:
        f.write("\n".join(idx))
    print(f"\nWrote research/INDEX.md ({len(rows)} ok, {len(failed)} failed)")


if __name__ == "__main__":
    main()
