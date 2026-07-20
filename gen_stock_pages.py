#!/usr/bin/env python3
"""gen_stock_pages.py — generate canonical /stocks/<sym> pages for tickers that
appear in Santro content but had no static page (previously served only by the
noindexed /t?sym= twin).

Template = the existing stock-page template (mirrors stocks/corz.html exactly):
head (title/description/canonical/OG/breadcrumb) + tkp main (About = Yahoo
business summary, industry context = the site's published INDUSTRY_ABOUT
editorial text, Key data, Valuation read via the SAME reverse-DCF the
fair-value calculator uses (accounts/api.js: r=9%, 10y, terminal 2.5%),
TradingView chart, related names) + live-patch script. Emits pageheader/footer
stubs — run gen_nav.py + gen_footer.py after to inject the ds-v2 shell, then
gen_sitemap.py (stocks/*.html is globbed automatically) and _gen_about.py.

Valuation read is OMITTED when forward EPS is not positive (story-stock
precedent — same rule as accounts/api.js _eps). No data is invented: quotes,
caps, summaries and analyst rows come from Yahoo (the site's data source);
if a field is missing the row is dropped.

Run:  ~/ai-stock-heatmap/.venv/bin/python gen_stock_pages.py
"""
import datetime, html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

# ── which pages to build ─────────────────────────────────────────────────────
# group  -> which published INDUSTRY_ABOUT editorial text frames the industry
# rel    -> related-names row (all must be existing /stocks pages)
# ctx    -> ONE honest per-company sentence tying it to the AI trade (facts
#           already covered by Santro's published articles/pages)
NEW_TICKERS = {
    "SNDK": {"group": "chip_equipment_and_ai_hardware", "h2": "The AI hardware &amp; storage industry",
             "rel": ["wdc", "stx", "mu", "sk-hynix"],
             "ctx": "SanDisk, spun out of Western Digital, sells NAND flash memory and SSDs — the storage side of the memory trade, and a top-ten holding of the Roundhill Memory ETF (DRAM)."},
    "WDC":  {"group": "chip_equipment_and_ai_hardware", "h2": "The AI hardware &amp; storage industry",
             "rel": ["sndk", "stx", "mu", "sk-hynix"],
             "ctx": "Western Digital makes hard drives and data-center storage; AI training and inference data has revived demand for high-capacity drives."},
    "STX":  {"group": "chip_equipment_and_ai_hardware", "h2": "The AI hardware &amp; storage industry",
             "rel": ["wdc", "sndk", "mu", "kioxia"],
             "ctx": "Seagate sells mass-capacity hard drives into cloud and AI data centers, where exabyte-scale storage demand is the AI hook."},
    "CRWV": {"group": "ai_software_and_cloud_infrastructure", "h2": "The AI software &amp; cloud infrastructure industry",
             "rel": ["nbis", "corz", "apld", "nvda"],
             "ctx": "CoreWeave is the flagship “neocloud” — GPU cloud capacity contracted out to AI labs and hyperscalers, financed by heavy debt-funded data-center buildout."},
    "NBIS": {"group": "ai_software_and_cloud_infrastructure", "h2": "The AI software &amp; cloud infrastructure industry",
             "rel": ["crwv", "corz", "apld", "nvda"],
             "ctx": "Nebius builds AI-focused cloud and GPU infrastructure across Europe and the US, competing for the same AI-compute demand as the neoclouds."},
    "CIFR": {"group": "dc_infra_paragraph", "h2": "The AI data-center infrastructure industry",
             "rel": ["iren", "wulf", "btdr", "corz"],
             "ctx": "Cipher, a bitcoin miner, is repurposing its power-rich sites toward AI and high-performance-computing hosting."},
    "IREN": {"group": "dc_infra_paragraph", "h2": "The AI data-center infrastructure industry",
             "rel": ["cifr", "wulf", "btdr", "apld"],
             "ctx": "IREN runs renewable-powered data centers and is shifting capacity from bitcoin mining toward AI cloud services."},
    "WULF": {"group": "dc_infra_paragraph", "h2": "The AI data-center infrastructure industry",
             "rel": ["iren", "cifr", "btdr", "corz"],
             "ctx": "TeraWulf pairs low-cost, largely zero-carbon power with data centers, pivoting mining capacity toward AI hosting."},
    "BTDR": {"group": "dc_infra_paragraph", "h2": "The AI data-center infrastructure industry",
             "rel": ["cifr", "iren", "wulf", "apld"],
             "ctx": "Bitdeer mines bitcoin and is building out HPC/AI hosting capacity on its power portfolio."},
    "BE":   {"group": "data_center_power_and_energy", "h2": "The data-center power &amp; energy industry",
             "rel": ["gev", "vst", "oklo", "vrt"],
             "ctx": "Bloom Energy's fuel cells provide on-site power for data centers — one way the grid bottleneck around AI buildout gets solved."},
    "CAT":  {"group": "applied_ai_industrial_defense_and_vertical", "h2": "Applied AI: industrials &amp; heavy machinery",
             "rel": ["burry-short-watch", "gev", "etn", "pwr"],
             "ctx": "Caterpillar's link to the AI trade is indirect: its engines and generator sets supply data-center backup and prime power, and the name sits on Santro's Burry short watch as a valuation-risk name rather than an AI pure-play."},
    "CBRS": {"group": "ai_chips_and_compute", "h2": "The AI chips &amp; compute industry",
             "rel": ["nvda", "amd", "arm", "mu"],
             "ctx": "Cerebras builds wafer-scale AI training chips — a genuinely different architecture from GPU clusters — and listed on Nasdaq in 2026 after a long run on Santro's IPO watch."},
}

# ── published editorial industry texts (single source: ticker-about.js) ──────
src = open("ticker-about.js", encoding="utf-8").read()
m = re.search(r"window\.INDUSTRY_ABOUT=(\{.*?\});", src, re.S)
INDUSTRY_ABOUT = json.loads(m.group(1))
# the miner/data-center paragraph reuses the exact text already published on
# the CORZ/APLD pages (their shared industry section)
apld = open("stocks/apld.html", encoding="utf-8").read()
mm = re.search(r"<h2>The AI data-center infrastructure industry</h2>\s*<p>(.*?)(?:\s+[A-Z][^.]*\.)?</p>", apld, re.S)
DC_INFRA = re.search(r"<h2>The AI data-center infrastructure industry</h2>\s*<p>(.*?)</p>", apld, re.S).group(1)
# strip APLD's own company-specific closing sentence (starts after the shared text)
DC_INFRA = DC_INFRA.split(" Applied Digital")[0].split(" Core Scientific")[0].strip()

def industry_text(key):
    if key == "dc_infra_paragraph":
        return DC_INFRA
    return INDUSTRY_ABOUT[key]["text"]

# ── the SAME reverse-DCF as accounts/api.js (dcf + impliedGrowth, bisection) ─
def dcf(eps, g, r, years, tg):
    if r <= tg: r = tg + 0.01
    pv, e = 0.0, eps
    for t in range(1, years + 1):
        e *= 1 + g
        pv += e / ((1 + r) ** t)
    pv += (e * (1 + tg)) / (r - tg) / ((1 + r) ** years)
    return pv

def implied_growth(eps, price, r=0.09, years=10, tg=0.025):
    lo, hi = -0.30, 0.6
    for _ in range(60):
        mid = (lo + hi) / 2
        if dcf(eps, mid, r, years, tg) > price: hi = mid
        else: lo = mid
    return (lo + hi) / 2

def glabel(pct):
    if pct < 0:  return "discounted"
    if pct <= 5: return "modest"
    if pct < 18: return "moderate"
    return "punchy"

def fcap(b):
    return f"${b/1000:.2f}T" if b >= 1000 else f"${b:.1f}B"

esc = lambda s: html.escape(str(s or ""), quote=False)

TKP_CSS = """<style>
  .tkp{max-width:1240px;margin:0 auto;padding:6px 20px 50px;}
  .tkp .crumb{font-size:13px;color:var(--faint,#6b7684);margin:14px 0 4px;} .tkp .crumb a{color:var(--muted,#9aa6b2);text-decoration:none;}
  .tkp h1{font-size:28px;margin:10px 0 4px;} .tkp .sub{color:var(--muted,#9aa6b2);font-size:15px;margin:0 0 18px;}
  .tkp h2{font-size:19px;margin:28px 0 8px;} .tkp p,.tkp li{color:var(--muted,#9aa6b2);font-size:15.5px;line-height:1.65;}
  .tkp b{color:var(--text,#e6edf3);} .tkp a{color:var(--accent,#22c55e);}
  .kv{width:100%;border-collapse:collapse;margin:8px 0 4px;} .kv td{padding:8px 10px;border-bottom:1px solid var(--border-soft,#1c2230);font-size:14.5px;color:var(--muted);} .kv td:first-child{color:var(--faint,#6b7684);width:38%;}
  .rbx{display:inline-block;font-size:11px;font-weight:700;padding:2px 7px;border-radius:5px;background:rgba(240,90,110,.14);color:#f0596e;margin-left:6px;}
  .relx a{display:inline-block;margin:0 8px 6px 0;padding:5px 11px;border:1px solid var(--border-soft,#1c2230);border-radius:7px;font-size:13.5px;text-decoration:none;}
  .ctaE{margin-top:22px;padding:18px 20px;border:1px solid rgba(34,197,94,.28);border-radius:12px;background:rgba(34,197,94,.06);}
  .ctaE a{display:inline-block;background:var(--accent,#22c55e);color:#fff;padding:9px 16px;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;margin-top:8px;}
  .nfax{color:var(--faint,#6b7684);font-size:13px;margin-top:18px;}
</style>"""

# pageheader/footer stubs — gen_nav.py / gen_footer.py replace these with the
# ds-v2 meganav + mega footer (same stubs gen_etf_pages.js emits)
HEADER = """  <header class="pageheader">
    <a class="logo" href="/" title="Santro AI — dashboard">
      <span class="logo-s">S<span class="logo-ai">AI</span></span>
      <span class="logo-rest"><span class="logo-antro">ANTRO</span>
        <span class="logo-tagline">AI&nbsp;RESEARCH&nbsp;·&nbsp;MARKETS</span></span>
    </a>
    <nav class="pagenav">
      <a class="nav-link" href="/">Terminal</a><a class="nav-link" href="/stocks">Stocks</a>
      <a class="nav-link" href="/crypto">Crypto</a><a class="nav-link" href="/bubble">Bubble risk</a>
      <a class="nav-link" href="/research">Research</a><a class="nav-link" href="/about">About</a>
    </nav>
  </header>"""
FOOTER = """  <footer>
    <nav class="foot-nav" style="margin-bottom:6px"><a href="/">Terminal</a> · <a href="/stocks">Stocks</a> · <a href="/ipos">IPOs</a> · <a href="/etfs">ETFs</a> · <a href="/crypto">Crypto</a> · <a href="/news">News</a> · <a href="/research">Research</a> · <a href="/blog">Blog</a> · <a href="/about">About</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></nav>
    Santro AI — the AI bubble terminal for AI stocks, ETFs, crypto, hot tickers, research and bubble-risk signals. Beta version.<br>
    Quotes delayed ~15 min. Real-time data planned for Pro. <span class="nfa">Not financial advice.</span><br>
    Contact us: <a href="mailto:hello@santroai.tech">hello@santroai.tech</a><br>
    © 2026 Santro AI. All rights reserved. Uses custom models.
  </footer>"""

LIVE_PATCH = """<script>
/* live-patch the static Key data from universe.json at view time; crawlable
   static values remain the fallback if this fails */
(async()=>{try{
  const SYM=document.querySelector(".kv b").textContent.trim();
  const u=await (await fetch("/universe.json?t="+Date.now())).json();
  let x=null; for(const b of u.bubbles){ x=b.tickers.find(t=>t.ticker===SYM); if(x) break; }
  if(!x||x.price==null) return;
  const fmt=v=>v==null?"—":(v>=0?"+":"")+v.toFixed(1)+"%";
  const rows=[...document.querySelectorAll(".kv tr")];
  const cell=l=>{const r=rows.find(r=>r.cells[0].textContent.trim()===l); return r?r.cells[1]:null;};
  const pc=cell("Price");
  if(pc){const ch=x.change_pct; pc.innerHTML="$"+x.price.toFixed(2)+(ch!=null?' <span style="color:'+(ch>=0?"#22c55e":"#f05a6e")+';font-weight:700">'+fmt(ch)+" today</span>":"");}
  const mc=cell("Market cap"); if(mc&&x.market_cap_b) mc.textContent="$"+x.market_cap_b.toFixed(2)+"B";
  const pf=cell("Performance"); if(pf&&x.perf) pf.textContent="1W "+fmt(x.perf["1W"])+" · 1M "+fmt(x.perf["1M"])+" · 1Y "+fmt(x.perf["1Y"]);
  const sp=document.querySelector(".tkp h2 span");
  if(sp&&u.meta&&u.meta.as_of) sp.textContent="· delayed ~15 min · "+u.meta.as_of;
}catch(e){}})();
</script>"""

def page(sym, cfg, d, asof):
    slug = sym.lower()
    co, sector, ind = d["company"], d.get("sector") or "—", d.get("industry") or "—"
    REL_LABELS = {"sk-hynix": "SK Hynix", "burry-short-watch": "Burry Short Watch"}
    rel = "".join(f'<a href="/stocks/{r}">{REL_LABELS.get(r, r.upper() if len(r)<=5 else r.replace("-", " ").title())}</a>' for r in cfg["rel"])
    # key data rows (only real fields)
    rows = [f'<tr><td>Ticker</td><td><b>{sym}</b></td></tr>',
            f'<tr><td>Company</td><td>{esc(co)}</td></tr>']
    if d.get("price") is not None: rows.append(f'<tr><td>Price</td><td>${d["price"]:.2f}</td></tr>')
    if d.get("market_cap_b"):      rows.append(f'<tr><td>Market cap</td><td>{fcap(d["market_cap_b"])}</td></tr>')
    rows.append(f'<tr><td>Sector / industry</td><td>{esc(sector)} / {esc(ind)}</td></tr>')
    if d.get("target") and d.get("n_analysts"):
        rec = f', {d["rec"]}' if d.get("rec") and d["rec"] != "none" else ""
        rows.append(f'<tr><td>Analyst mean target</td><td>${round(d["target"])} ({d["n_analysts"]} analysts{rec})</td></tr>')
    # valuation read — forward EPS only, same rule as accounts/api.js
    val = ""
    if d.get("fwd_eps") and d["fwd_eps"] > 0 and d.get("price"):
        g = implied_growth(d["fwd_eps"], d["price"]) * 100
        val = (f'\n    <h2>Valuation read</h2>\n'
               f'    <p><b>What the price implies:</b> the market is pricing in roughly <b>~{g:.0f}%/yr</b> '
               f'earnings growth ({glabel(g)}), on a reverse-DCF of forward earnings (${d["fwd_eps"]:.2f}). '
               f'Run your own assumptions in the <a href="/tools/fair-value-calculator">fair-value calculator</a>.</p>\n')
    return f"""<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="theme-color" content="#0a0e13" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Santro AI" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<title>{sym} ({esc(co)}) — AI exposure, valuation &amp; data | Santro AI</title>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"/>
<link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48.png"/>
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png"/>
<link rel="manifest" href="/manifest.json" />
<meta name="description" content="{sym} ({esc(co)}): {esc(ind)}. What it does, the industry it's in, the growth its price implies, key data and related names. Delayed data, not advice."/>
<link rel="canonical" href="https://santroai.tech/stocks/{slug}"/>
<meta property="og:type" content="website"/><meta property="og:site_name" content="Santro AI"/>
<meta property="og:title" content="{sym} — {esc(co)}"/>
<meta property="og:description" content="{esc(ind)} · in the Santro AI universe"/>
<meta property="og:url" content="https://santroai.tech/stocks/{slug}"/>
<meta property="og:image" content="https://santroai.tech/assets/og-map.png"/>
<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="https://santroai.tech/assets/og-map.png"/>
<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
 {{"@type":"ListItem","position":1,"name":"Home","item":"https://santroai.tech/"}},
 {{"@type":"ListItem","position":2,"name":"AI Stocks","item":"https://santroai.tech/stocks"}},
 {{"@type":"ListItem","position":3,"name":"{sym}","item":"https://santroai.tech/stocks/{slug}"}}]}}
</script>
<link rel="stylesheet" href="/site.css?v=14"/>
{TKP_CSS}
</head><body>
{HEADER}
  <main class="tkp">
    <nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/stocks">AI Stocks</a> › {sym}</nav>
    <h1>{sym} — {esc(co)}</h1>
    <div class="ds-actrow"><button class="ds-act" data-lock="watch">★ Track {sym}</button><button class="ds-act" data-lock="alert">Set alert</button></div>
    <p class="sub">{esc(sector)} · {esc(ind)}</p>

    <h2>About {esc(co)}</h2>
    <p>{esc(d["summary"])}</p>

    <h2>{cfg["h2"]}</h2>
    <p>{industry_text(cfg["group"])} {esc(cfg["ctx"])}</p>

    <h2>Key data <span style="font-size:12px;color:var(--faint,#6b7684)">· delayed ~15 min, as of {asof}</span></h2>
    <table class="kv">
      {chr(10).join("      " + r for r in rows).strip()}
    </table>
{val}
    <h2>Chart</h2>
    <div class="tradingview-widget-container"><div id="tv_{sym}"></div></div>
    <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js" async>
    {{"symbols":[["{sym}"]],"chartOnly":false,"width":"100%","height":300,"colorTheme":"dark","isTransparent":true,"autosize":false}}
    </script>

    <h2>Related AI names</h2>
    <p class="relx">{rel}</p>
    <p>See the full picture on the <a href="/stocks">AI stocks bubble map</a>, gauge froth with the <a href="/bubble">AI bubble-risk index</a>, or read <a href="/blog/ai-bubble-valuation-history">AI vs the dot-com bubble</a>.</p>

    <div class="ctaE">
      <b>Run a fair-value read on {sym} — free.</b>
      <p>Create a free Santro AI account to run unlimited valuations, save {sym} to a watchlist, and keep your history.</p>
      <a href="/?auth=register">Create a free account →</a>
    </div>
    <p class="nfax">Market data is delayed ~15 minutes and provided for education, not as financial advice. "Hot" means attention, not direction.</p>
  </main>
{FOOTER}
{LIVE_PATCH}
</body></html>"""

def main():
    import yfinance as yf
    asof = datetime.date.today().strftime("%-d %B %Y")
    built, skipped = [], []
    for sym, cfg in NEW_TICKERS.items():
        # idempotent like the other generators: re-running refreshes the baked
        # quotes/analyst rows on the pages this script owns (NEW_TICKERS only)
        try:
            i = yf.Ticker(sym).info
        except Exception as e:
            print(f"SKIP {sym}: fetch failed ({e})"); skipped.append(sym); continue
        d = {"company": i.get("longName") or i.get("shortName"),
             "sector": i.get("sector"), "industry": i.get("industry"),
             "price": i.get("currentPrice") or i.get("regularMarketPrice"),
             "market_cap_b": round((i.get("marketCap") or 0)/1e9, 2) or None,
             "fwd_eps": i.get("forwardEps"), "target": i.get("targetMeanPrice"),
             "n_analysts": i.get("numberOfAnalystOpinions"), "rec": i.get("recommendationKey"),
             "summary": i.get("longBusinessSummary")}
        if not d["company"] or not d["summary"] or i.get("quoteType") != "EQUITY":
            print(f"SKIP {sym}: insufficient real data (company/summary/equity check failed)")
            skipped.append(sym); continue
        # honest tense: analyst rows/quotes are point-in-time; page carries as-of date
        open(f"stocks/{sym.lower()}.html", "w", encoding="utf-8").write(page(sym, cfg, d, asof))
        built.append(sym); print(f"  wrote stocks/{sym.lower()}.html")
    print(f"done: {len(built)} built ({', '.join(built)})" + (f" · {len(skipped)} skipped" if skipped else ""))
    print("now run: python3 gen_nav.py && python3 gen_footer.py && python3 gen_sitemap.py && python3 _gen_about.py")

if __name__ == "__main__":
    main()
