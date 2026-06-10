#!/usr/bin/env python3
"""
report_pdf.py — one signed PDF research report, matching the user's
Momentum Stock Research Methodology exemplar (AEHR.research.31.05.2026.pdf):
9 sections + 6 charts + sources, footer-signed on every page.

Run:    .venv/bin/python report_pdf.py NVDA
Output: research/<TICKER>.research.DD.MM.YYYY.pdf
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import yfinance as yf

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, Image, PageBreak)

from research import indicators, scores, fnum, fpct, fpp, fcap, SIGN, TODAY, NAMES

NAVY = colors.HexColor("#101a2b")
GRID = colors.HexColor("#c9ced6")
BLUE = "#1f77b4"

ACTION = {"init": "Initiated", "reit": "Reiterated", "main": "Maintained",
          "up": "Upgrade", "down": "Downgrade"}


# ---------------- charts (the exemplar's six) ----------------
def chart_levels(path, sym, i):
    pts = [("52W Low", i["lo52"]), ("SMA200*", i.get("sma200")),
           ("SMA50*", i.get("sma50")), ("SMA20*", i.get("sma20")),
           ("Current", i["price"]), ("52W High", i["hi52"])]
    pts = [(n, v) for n, v in pts if v]
    fig, ax = plt.subplots(figsize=(7.4, 2.9))
    for n, v in pts:
        ax.scatter(v, 0, s=70, color=BLUE, zorder=3)
        ax.annotate(f"{n}\n${v:,.2f}", (v, 0), textcoords="offset points",
                    xytext=(0, 14), ha="center", fontsize=8)
    ax.set_xlim(0, max(v for _, v in pts) * 1.12)
    ax.set_yticks([]); ax.set_ylim(-0.6, 1.4)
    ax.set_xlabel("Price level, USD", fontsize=8)
    ax.set_title(f"{sym} technical levels: 52-week range and derived moving averages", fontsize=10)
    for s_ in ("left", "right", "top"): ax.spines[s_].set_visible(False)
    fig.tight_layout(); fig.savefig(path, dpi=140); plt.close(fig)


def _bars(path, labels, values, title, ylabel, fmt="{:+.1f}%"):
    fig, ax = plt.subplots(figsize=(7.4, 3.0))
    bars = ax.bar(labels, values, color=BLUE)
    for b, v in zip(bars, values):
        ax.annotate(fmt.format(v), (b.get_x() + b.get_width() / 2, v),
                    textcoords="offset points", xytext=(0, 4 if v >= 0 else -12),
                    ha="center", fontsize=8)
    ax.set_ylabel(ylabel, fontsize=8); ax.set_title(title, fontsize=10)
    ax.axhline(0, color="#666", lw=0.8)
    ax.grid(axis="y", alpha=0.3); ax.tick_params(labelsize=8)
    for s_ in ("right", "top"): ax.spines[s_].set_visible(False)
    fig.tight_layout(); fig.savefig(path, dpi=140); plt.close(fig)


def chart_holders(path, holders):
    names = [h[0] for h in holders][::-1]
    sh = [h[4] for h in holders][::-1]
    unit, div = ("billions", 1e9) if max(sh) >= 1e9 else ("millions", 1e6)
    fig, ax = plt.subplots(figsize=(7.4, 3.4))
    ax.barh(names, [x / div for x in sh], color=BLUE)
    ax.set_xlabel(f"Shares held ({unit})", fontsize=8)
    ax.set_title("Top institutional holders by shares", fontsize=10)
    ax.tick_params(labelsize=7.5); ax.grid(axis="x", alpha=0.3)
    for s_ in ("right", "top"): ax.spines[s_].set_visible(False)
    fig.tight_layout(); fig.savefig(path, dpi=140); plt.close(fig)


# ---------------- pdf assembly ----------------
def build(sym):
    tk = yf.Ticker(sym)
    info = tk.get_info()
    hist = tk.history(period="2y", auto_adjust=True)
    i = indicators(hist)
    s = scores(info, i)
    name = info.get("longName") or NAMES.get(sym, sym)
    exch = {"NMS": "NASDAQ", "NGM": "NASDAQ", "NCM": "NASDAQ", "NYQ": "NYSE",
            "ASE": "NYSE American"}.get(info.get("exchange", ""), info.get("exchange", ""))

    news = []
    try:
        for item in (tk.news or [])[:4]:
            c = item.get("content", item)
            if c.get("title"):
                news.append((c["title"], (c.get("provider") or {}).get("displayName", ""),
                             (c.get("pubDate") or "")[:10]))
    except Exception:
        pass

    holders = []
    try:
        ih = tk.institutional_holders
        if ih is not None and not ih.empty:
            for _, r in ih.head(10).iterrows():
                holders.append((str(r.get("Holder", "—")), f"{r.get('Shares', 0):,.0f}",
                                fpct(r.get("pctHeld")), str(r.get("Date Reported", "—"))[:10],
                                float(r.get("Shares", 0))))
    except Exception:
        pass

    actions = []
    try:
        ud = tk.upgrades_downgrades
        if ud is not None and not ud.empty:
            for idx, r in ud.head(8).iterrows():
                a = str(r.get("Action", "—"))
                actions.append((str(idx)[:10], ACTION.get(a, a.title()), str(r.get("Firm", "—")),
                                f"{r.get('FromGrade','') or '—'} → {r.get('ToGrade','') or '—'}"))
    except Exception:
        pass

    inst = info.get("heldPercentInstitutions") or 0
    ins = info.get("heldPercentInsiders") or 0
    off_high = (i["price"] / i["hi52"] - 1) * 100
    above_low = (i["price"] / i["lo52"] - 1) * 100
    stance = (f"{s['Technical momentum'][0]} technical momentum; "
              f"{s['Fundamental quality'][0].lower()} fundamentals; "
              f"value {s['Value attractiveness'][0].lower()}; risk {s['Risk level'][0].lower()}.")

    # charts
    cdir = os.path.join(HERE, "research", "_charts")
    os.makedirs(cdir, exist_ok=True)
    c1 = os.path.join(cdir, f"{sym}_levels.png"); chart_levels(c1, sym, i)
    perf = {k: v for k, v in i["perf"].items() if v is not None}
    c2 = os.path.join(cdir, f"{sym}_perf.png")
    _bars(c2, list(perf), list(perf.values()), f"{sym} performance snapshot", "Return (%)")
    mults = {"P/S": info.get("priceToSalesTrailing12Months"), "EV/Sales": info.get("enterpriseToRevenue"),
             "P/B": info.get("priceToBook"), "P/E ttm": info.get("trailingPE"),
             "PEG": info.get("trailingPegRatio"), "Forward P/E": info.get("forwardPE")}
    mults = {k: v for k, v in mults.items() if v}
    c3 = os.path.join(cdir, f"{sym}_mult.png")
    _bars(c3, list(mults), list(mults.values()),
          "Valuation multiples: what expectations are embedded", "Multiple", fmt="{:.1f}")
    prof = {"Gross Margin": info.get("grossMargins"), "Operating Margin": info.get("operatingMargins"),
            "Profit Margin": info.get("profitMargins"), "ROA": info.get("returnOnAssets"),
            "ROE": info.get("returnOnEquity")}
    prof = {k: v * 100 for k, v in prof.items() if v is not None}
    c4 = os.path.join(cdir, f"{sym}_prof.png")
    _bars(c4, list(prof), list(prof.values()), "Profitability and return profile", "Percent", fmt="{:.1f}%")
    c5 = os.path.join(cdir, f"{sym}_holders.png")
    if holders: chart_holders(c5, holders)
    c6 = os.path.join(cdir, f"{sym}_own.png")
    _bars(c6, ["Institutions", "Insiders", "Public and Others"],
          [inst * 100, ins * 100, max(0.0, 100 - inst * 100 - ins * 100)],
          "Ownership distribution", "% of outstanding", fmt="{:.1f}%")

    # ---- styles
    ss = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=ss["Normal"], fontSize=9, leading=12.5)
    cell = ParagraphStyle("cell", parent=body, fontSize=8, leading=10.5)
    h1 = ParagraphStyle("h1", parent=ss["Heading1"], fontSize=14, textColor=NAVY, spaceBefore=14)
    h2 = ParagraphStyle("h2", parent=ss["Heading2"], fontSize=11, textColor=NAVY)
    small = ParagraphStyle("small", parent=body, fontSize=7.5, textColor=colors.HexColor("#555"))
    title = ParagraphStyle("title", parent=ss["Title"], fontSize=20)
    sub = ParagraphStyle("sub", parent=body, alignment=1, fontSize=10.5, textColor=colors.HexColor("#333"))

    def T(rows, widths, header=True):
        data = [[Paragraph(str(x), cell) for x in r] for r in rows]
        t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
        style = [("GRID", (0, 0), (-1, -1), 0.4, GRID),
                 ("VALIGN", (0, 0), (-1, -1), "TOP"),
                 ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f6f9")])]
        if header:
            style += [("BACKGROUND", (0, 0), (-1, 0), NAVY),
                      ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]
            data[0] = [Paragraph(f"<b><font color='white'>{x}</font></b>", cell) for x in rows[0]]
        t.setStyle(TableStyle(style))
        return t

    def img(path, h=2.5):
        return Image(path, width=6.7 * inch, height=h * inch, kind="proportional")

    story = []
    story.append(Spacer(1, 60))
    story.append(Paragraph(f"{sym} Research Report", title))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Momentum Stock Research Methodology — Technical + Fundamental Analysis, "
                           "Data Snapshot, Institutional Investors", sub))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"{name} ({exch}: {sym})", sub))
    story.append(Paragraph(f"Signed file: {sym}.research.{SIGN}", sub))
    story.append(Spacer(1, 24))
    story.append(T([["Field", "Value"],
                    ["Current price / close", f"${fnum(i['price'])} — {TODAY.strftime('%b %d %Y')}, ~15-min delayed"],
                    ["Market cap", fcap(info.get("marketCap"))],
                    ["Sector / Industry", f"{info.get('sector','—')} / {info.get('industry','—')}"],
                    ["Main theme", "AI compute demand, data-center capex cycle, platform moat"],
                    ["Current stance", stance]], [1.6 * inch, 5.1 * inch]))
    story.append(Spacer(1, 16))
    story.append(Paragraph(f"<b>Important:</b> This PDF is for education and decision journaling only. "
                           f"It is not a recommendation to buy, hold, or sell {sym}. Data are public "
                           f"Yahoo Finance sources retrieved on {TODAY.strftime('%d %B %Y')}.", small))
    story.append(PageBreak())

    # 1
    story.append(Paragraph("1. Executive Summary", h1))
    story.append(Paragraph(
        f"{sym} trades {fpp(off_high)} from its 52-week high and {fpp(above_low)} above its 52-week low. "
        f"One-year performance is {fpp(i['perf'].get('1Y'))} with RSI(14) at {fnum(i['rsi14'],1)}. "
        f"The methodology reads this as: momentum first, then setup quality, then whether fundamentals "
        f"and valuation can carry the move.", body))
    story.append(Spacer(1, 6))
    story.append(T([["Area", "Score / Read", "Reason"]] + [[k, v[0], v[1]] for k, v in s.items()],
                   [1.7 * inch, 1.2 * inch, 3.8 * inch]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"<b>Bottom line:</b> {stance}", body))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>Key questions before any trade:</b>", body))
    for q in ["Is the stock forming a new tight base, or is it simply extended after news-driven gaps?",
              "Where is the actual invalidation level? If that level is too far away, the setup is not clean.",
              "Is the move supported by new institutional demand or just retail/short-covering momentum?",
              "Can earnings convert fast enough to justify the valuation?"]:
        story.append(Paragraph(f"• {q}", body))

    # 2
    story.append(Paragraph("2. Company Overview and Recent Catalysts", h1))
    summary = info.get("longBusinessSummary") or "—"
    if len(summary) > 700: summary = summary[:700].rsplit(". ", 1)[0] + "."
    story.append(Paragraph(summary, body))
    if news:
        story.append(Spacer(1, 6))
        story.append(T([["Headline (potential catalyst)", "Source", "Date"]] + list(news),
                       [4.6 * inch, 1.2 * inch, 0.9 * inch]))

    # 3
    story.append(Paragraph("3. Technical Analysis", h1))
    story.append(T([["Technical item", "Read"],
                    ["Price vs 52-week range",
                     f"Close ${fnum(i['price'])}; 52w high ${fnum(i['hi52'])} ({fpp(off_high)}); "
                     f"52w low ${fnum(i['lo52'])} ({fpp(above_low)})"],
                    ["Trend", f"{fpp(i.get('sma200_dist'))} vs SMA200, {fpp(i.get('sma50_dist'))} vs SMA50, "
                              f"{fpp(i.get('sma20_dist'))} vs SMA20"],
                    ["Momentum", f"RSI(14) {fnum(i['rsi14'],1)} "
                                 f"({'overbought' if i['rsi14']>70 else 'oversold' if i['rsi14']<30 else 'neutral'})"],
                    ["Volatility", f"ATR(14) {fnum(i['atr14'])} (~{fnum(i['atr_pct'],1)}% of price); "
                                   f"beta {fnum(info.get('beta'))}"],
                    ["Setup perspective", s["Fresh setup quality"][1]]], [1.6 * inch, 5.1 * inch]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Chart 1. Technical levels", h2)); story.append(img(c1, 2.5))
    story.append(Paragraph("*SMA values computed from Yahoo daily closes.", small))
    story.append(Paragraph("Chart 2. Recent performance snapshot", h2)); story.append(img(c2, 2.6))

    # 4
    story.append(Paragraph("4. Fundamental Analysis", h1))
    story.append(T([["Factor", "Observation", "Implication"],
                    ["Revenue", f"TTM {fcap(info.get('totalRevenue'))}; growth {fpct(info.get('revenueGrowth'))} y/y",
                     "Is growth accelerating enough to support the multiple?"],
                    ["Profitability", f"Gross {fpct(info.get('grossMargins'))}; operating {fpct(info.get('operatingMargins'))}; "
                                      f"net {fpct(info.get('profitMargins'))}; ROE {fpct(info.get('returnOnEquity'))}",
                     s["Fundamental quality"][0] + " fundamental quality per rubric."],
                    ["Balance sheet", f"Cash {fcap(info.get('totalCash'))}; debt {fcap(info.get('totalDebt'))}; "
                                      f"current ratio {fnum(info.get('currentRatio'))}",
                     "Liquidity/debt readiness for the cycle."],
                    ["Valuation", f"P/E {fnum(info.get('trailingPE'))}; forward P/E {fnum(info.get('forwardPE'))}; "
                                  f"P/S {fnum(info.get('priceToSalesTrailing12Months'))}; "
                                  f"EV/Sales {fnum(info.get('enterpriseToRevenue'))}",
                     s["Value attractiveness"][1]],
                    ["Growth expectations", f"Earnings growth {fpct(info.get('earningsGrowth'))}; "
                                            f"EPS q/q {fpct(info.get('earningsQuarterlyGrowth'))}",
                     f"Analyst mean target ${fnum(info.get('targetMeanPrice'))} "
                     f"({info.get('numberOfAnalystOpinions','—')} analysts)"]],
                   [1.4 * inch, 3.0 * inch, 2.3 * inch]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Chart 3. Valuation multiples", h2)); story.append(img(c3, 2.6))
    story.append(Paragraph("Chart 4. Profitability and return profile", h2)); story.append(img(c4, 2.6))

    # 5
    story.append(Paragraph("5. Institutional Investors and Ownership", h1))
    story.append(T([["Metric", "Value", "Read"],
                    ["Institutional ownership", fpct(info.get("heldPercentInstitutions")),
                     "Sponsorship level behind the move."],
                    ["Insider ownership", fpct(info.get("heldPercentInsiders")), "Alignment, not control."],
                    ["Short float", fpct(info.get("shortPercentOfFloat")),
                     "Squeeze fuel vs skepticism signal."],
                    ["Short ratio", fnum(info.get("shortRatio"), 1) + " days to cover", "—"]],
                   [1.8 * inch, 1.6 * inch, 3.3 * inch]))
    if holders:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Chart 5. Top institutional holders by shares", h2)); story.append(img(c5, 2.9))
        story.append(Paragraph("Chart 6. Ownership distribution", h2)); story.append(img(c6, 2.6))
        story.append(Spacer(1, 6))
        story.append(T([["Holder", "Shares", "% Out", "Reported"]] + [h[:4] for h in holders],
                       [3.1 * inch, 1.5 * inch, 1.0 * inch, 1.1 * inch]))

    # 6
    story.append(Paragraph("6. Risk Review and Setup Plan", h1))
    risks = []
    if "expensive" in s["Value attractiveness"][0] or "demanding" in s["Value attractiveness"][0]:
        risks.append(("Valuation risk", s["Value attractiveness"][1] + " Multiple compression is the downside if growth slips."))
    risks.append(("Volatility risk", s["Risk level"][1] + " Position sizing should absorb a normal shakeout."))
    if (info.get("shortPercentOfFloat") or 0) > 0.05:
        risks.append(("Short interest risk", f"Short float {fpct(info.get('shortPercentOfFloat'))} can fuel sharp moves both ways around news."))
    if off_high > -8:
        risks.append(("Technical trap", "Near 52-week highs — do not confuse an old breakout that already worked with a fresh entry."))
    elif off_high < -25:
        risks.append(("Trend risk", "Far below the 52-week high; entries without a rebuilt base are low-quality."))
    risks.append(("Macro/sector risk", "Semis are high-beta to AI capex sentiment, rates, and export-control headlines."))
    risks.append(("Concentration risk", "Revenue concentration among hyperscale customers; check the latest 10-Q customer mix."))
    for k, v in risks:
        story.append(Paragraph(f"• <b>{k}:</b> {v}", body))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Setup checklist for your journal", h2))
    story.append(T([["Question", "Pass condition"],
                    ["Is there a new base?", "Tight sideways action near highs, declining volume, clear resistance."],
                    ["Is the pivot obvious?", "A clean level multiple traders can see; not a random candle high."],
                    ["Is risk defined?", "Stop based on structure and less than the expected first upside target."],
                    ["Is volume confirming?", "Breakout volume expands; pullback volume dries up."],
                    ["Is position size small enough?", "A normal shakeout should not cause emotional decisions."]],
                   [2.2 * inch, 4.5 * inch]))

    # 7
    story.append(Paragraph("7. Full Data Snapshot", h1))
    snap = [("Price", f"${fnum(i['price'])}"), ("Market cap", fcap(info.get("marketCap"))),
            ("Beta", fnum(info.get("beta"))), ("RSI(14)", fnum(i["rsi14"], 1)),
            ("ATR(14)", fnum(i["atr14"])), ("ATR % of price", fnum(i["atr_pct"], 1) + "%"),
            ("SMA20 dist", fpp(i.get("sma20_dist"))), ("SMA50 dist", fpp(i.get("sma50_dist"))),
            ("SMA200 dist", fpp(i.get("sma200_dist"))), ("52W high / low", f"${fnum(i['hi52'])} / ${fnum(i['lo52'])}"),
            ("P/E ttm", fnum(info.get("trailingPE"))), ("Forward P/E", fnum(info.get("forwardPE"))),
            ("PEG (trailing)", fnum(info.get("trailingPegRatio"))), ("P/S", fnum(info.get("priceToSalesTrailing12Months"))),
            ("P/B", fnum(info.get("priceToBook"))), ("EV/Sales", fnum(info.get("enterpriseToRevenue"))),
            ("EV/EBITDA", fnum(info.get("enterpriseToEbitda"))), ("Gross margin", fpct(info.get("grossMargins"))),
            ("Operating margin", fpct(info.get("operatingMargins"))), ("Profit margin", fpct(info.get("profitMargins"))),
            ("ROA / ROE", f"{fpct(info.get('returnOnAssets'))} / {fpct(info.get('returnOnEquity'))}"),
            ("Revenue ttm", fcap(info.get("totalRevenue"))),
            ("Revenue growth y/y", fpct(info.get("revenueGrowth"))), ("Earnings growth", fpct(info.get("earningsGrowth"))),
            ("Inst. / insider own", f"{fpct(info.get('heldPercentInstitutions'))} / {fpct(info.get('heldPercentInsiders'))}"),
            ("Short float / ratio", f"{fpct(info.get('shortPercentOfFloat'))} / {fnum(info.get('shortRatio'),1)}"),
            ("Avg volume", f"{(info.get('averageVolume') or 0):,}"), ("Employees", f"{(info.get('fullTimeEmployees') or 0):,}"),
            ("Analyst rec (1=buy..5=sell)", fnum(info.get("recommendationMean"), 1)),
            ("Mean target", f"${fnum(info.get('targetMeanPrice'))}")]
    half = (len(snap) + 1) // 2
    rows = [["Metric", "Value", "Metric", "Value"]]
    pairs = snap[half:] + [("", "")] * (2 * half - len(snap))
    for a, b in zip(snap[:half], pairs):
        rows.append([a[0], a[1], b[0], b[1]])
    story.append(T(rows, [1.7 * inch, 1.65 * inch, 1.7 * inch, 1.65 * inch]))

    # 8
    story.append(Paragraph("8. Analyst Actions", h1))
    story.append(T([["Date", "Action", "Firm", "Rating change"]] + actions,
                   [1.0 * inch, 1.1 * inch, 2.2 * inch, 2.4 * inch]) if actions
                  else Paragraph("No recent analyst actions available.", body))

    # 9
    story.append(Paragraph("9. Conclusion", h1))
    story.append(Paragraph(
        f"{sym} screens as: {s['Technical momentum'][0]} momentum / {s['Fundamental quality'][0].lower()} "
        f"fundamentals / {s['Value attractiveness'][0].lower()} value / {s['Risk level'][0].lower()} risk. "
        f"Per the methodology, the clean action is to act only on a defined setup — a new tight base, a "
        f"controlled pullback, or a confirmed reclaim of a key level — with the invalidation point and "
        f"position size decided before entry. Never chase an extended move.", body))

    story.append(Paragraph("Sources", h1))
    story.append(T([["Source", "URL", "Used for"],
                    [f"Yahoo Finance — {sym} quote/statistics", f"https://finance.yahoo.com/quote/{sym}",
                     "Snapshot metrics, ownership, analyst data"],
                    ["Yahoo Finance — price history (yfinance)", f"https://finance.yahoo.com/quote/{sym}/history",
                     "SMA / RSI / ATR / performance calculations"],
                    ["Yahoo Finance — news feed", f"https://finance.yahoo.com/quote/{sym}/news", "Catalyst headlines"],
                    ["Methodology", "AEHR.research.31.05.2026.pdf (user's Cowork method)",
                     "Report structure, scoring areas, checklist"]],
                   [2.2 * inch, 2.7 * inch, 1.8 * inch]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Note: the methodology's native Finviz/Fintel/ADVFN pages block automated retrieval; "
                           "equivalent metrics are computed from Yahoo Finance data and labeled accordingly. "
                           "Charts are generated from that data, not screenshots of charting platforms.", small))

    out = os.path.join(HERE, "research", f"{sym}.research.{SIGN}.pdf")
    footer_text = f"{sym}.research.{SIGN} | Research journal, not financial advice"

    def footer(canvas, doc_):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#777777"))
        canvas.drawString(0.7 * inch, 0.45 * inch, footer_text)
        canvas.drawRightString(A4[0] - 0.7 * inch, 0.45 * inch, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()

    SimpleDocTemplate(out, pagesize=A4, leftMargin=0.7 * inch, rightMargin=0.7 * inch,
                      topMargin=0.7 * inch, bottomMargin=0.8 * inch
                      ).build(story, onFirstPage=footer, onLaterPages=footer)
    print(f"Wrote {out}")


if __name__ == "__main__":
    build((sys.argv[1] if len(sys.argv) > 1 else "NVDA").upper())
