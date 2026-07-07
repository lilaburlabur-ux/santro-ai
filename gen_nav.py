#!/usr/bin/env python3
"""Santro AI — navigation generator (single source of truth for the header).

Renders the self-contained mega-menu header (scoped CSS + markup) from NAV
below and sweeps it into every page, replacing the legacy header families:
  - <header class="pageheader"> … </header>   (section pages)
  - <header class="sa-head"> … </header>      (blog articles)
  - <div class="topbar"> … </div>             (index.html, terminal.html)
Also strips legacy site.js script tags (nav.js supersedes them) and validates
that every nav href resolves to a real file. Behavior lives in /nav.js.

Run after adding/removing a route:  python3 gen_nav.py
"""
import glob, html, os, re, sys

V = "2"  # bump with nav.js?v=

# ── the navigation config ──────────────────────────────────────────────────
# label/href/desc/badge per link; badge: live | account | soon | None
NAV = [
  dict(key="terminal", label="Terminal",
       desc="The main Santro market view across AI stocks, ETFs, crypto, hot tickers, and bubble-risk signals.",
       links=[
         ("AI Terminal", "/terminal", "Bubble map, market tape, hot tickers, and the daily brief.", "live"),
         ("AI Stocks", "/stocks", "84 AI names ranked by heat, research on every ticker.", None),
         ("AI Crypto", "/crypto", "AI tokens and rotating crypto baskets.", None),
         ("AI ETFs", "/etfs", "40 AI & tech ETFs, broad tech to pure-play robotics.", None),
         ("Market News", "/news", "Headlines that move the AI trade.", None),
       ]),
  dict(key="tools", label="Tools",
       desc="Every tool is free while Santro is in beta. Scenario outputs, not price targets.",
       links=[
         ("AI Bubble Risk", "/bubble", "Valuation, momentum, and crowding signals in one gauge.", "live"),
         ("Portfolio Stress Test", "/bubble#stress", "Six historical crash scenarios against your portfolio.", "live"),
         ("Fair-Value Calculator", "/tools/fair-value-calculator", "DCF, P/E, Graham, and PEG scenario values for any AI ticker.", "live"),
         ("60-Second Bubble Check", "/quiz", "Eight questions to profile your AI-bubble exposure.", "live"),
         ("Share Cards", "/share", "Terminal-grade market cards you can post anywhere.", "live"),
         ("Prompt Quality Check", "/evaluate-prompt", "Score any AI trading prompt before you trust it.", "live"),
         ("Watchlists & Alerts", "/signup", "Track tickers and get level alerts with a free account.", "account"),
       ]),
  dict(key="research", label="Research",
       desc="Filing-verified research. Tweets are leads; filings are sources.",
       links=[
         ("Research Feed", "/research", "Curated notes on the AI trade, updated through the day.", None),
         ("Blog", "/blog", "Long-form pieces on bubbles, valuation, and AI credit.", None),
         ("AI Bubble or Market Reset?", "/blog/ai-bubble-valuation-history", "The flagship read: CAPE, real-terms history, dot-com lessons.", None),
         ("IPO Watch", "/ipos", "Anthropic to SK hynix — 10 filings tracked on EDGAR.", None),
         ("Aschenbrenner Basket", "/stocks/aschenbrenner", "Situational Awareness LP's 13F, position by position.", None),
         ("Burry Short Watch", "/stocks/burry-short-watch", "Scion's disclosed AI puts, verified in filings.", None),
       ]),
  dict(key="universe", label="AI Universe",
       desc="84 tickers across seven themes. Hot means attention, not direction.",
       links=[
         ("All AI Stocks", "/stocks", "The full universe, ranked by heat.", None),
         ("AI Chips & Compute", "/stocks/themes/ai-chips-and-compute", "NVDA, AMD, AVGO and the accelerator complex.", None),
         ("AI Software & Cloud", "/stocks/themes/ai-software-and-cloud-infrastructure", "Hyperscalers and the model platforms.", None),
         ("Data-Center Power & Energy", "/stocks/themes/data-center-power-and-energy", "The electrons behind the GPUs.", None),
         ("Chip Equipment & AI Hardware", "/stocks/themes/chip-equipment-and-ai-hardware", "ASML, memory, and the fab supply chain.", None),
         ("AI Platforms & Adtech", "/stocks/themes/ai-platforms-internet-and-adtech", "Internet platforms monetizing AI.", None),
         ("AI Apps & Data Software", "/stocks/themes/ai-applications-and-data-software", "Applied AI and the data layer.", None),
         ("Applied AI, Industrial & Defense", "/stocks/themes/applied-ai-industrial-defense-and-vertical", "Robotics, defense, and vertical AI.", None),
       ]),
  dict(key="maps", label="Market Maps",
       desc="Visual entry points into the same delayed data.",
       links=[
         ("Stock Bubble Map", "/terminal", "84 bubbles sized by cap, colored by heat.", None),
         ("Crypto Movers", "/crypto", "AI tokens ranked by momentum.", None),
         ("ETF Map", "/etfs", "Overlap-aware list of the AI ETF complex.", None),
         ("Bubble-Risk Gauge", "/bubble", "One dial for the whole AI trade.", None),
         ("IPO Pipeline", "/ipos", "Who is filing, who is rumored, who is priced.", None),
       ]),
  dict(key="company", label="Company",
       desc=None,
       links=[
         ("About Santro AI", "/about", None, None),
         ("Contact", "mailto:hello@santroai.tech", None, None),
         ("Privacy Policy", "/privacy", None, None),
         ("Terms of Use", "/terms", None, None),
         ("@SantroAI on X", "https://x.com/SantroAI", None, None),
         ("iOS app", None, None, "soon"),
         ("Santro Pro", None, None, "soon"),
       ]),
]

BADGE = {"live": '<em class="mn-b mn-b-live">Live</em>',
         "account": '<em class="mn-b mn-b-acct">Account</em>',
         "soon": '<em class="mn-b mn-b-soon">Coming soon</em>'}

CSS = """
/* santro brand tokens — green is the identity color; blue stays a muted
   secondary for body links only. Do NOT let these drift back to blue. */
header.meganav{--sg:#22c55e;--sg-hi:#4ade80;--sg-deep:#15803d;
  --sg-soft:rgba(34,197,94,.12);--sg-border:rgba(34,197,94,.45);
  --ramber:#d9a13c;--ramber-border:rgba(217,161,60,.45);}
header.meganav{display:block;position:relative;z-index:60;background:var(--panel-2,#0c121a);border-bottom:1px solid var(--border,#1d2733);font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif;text-align:left;}
.meganav *{box-sizing:border-box;}
.meganav .mn-in{max-width:1280px;margin:0 auto;padding:0 18px;display:flex;align-items:center;gap:18px;height:56px;}
.meganav a{text-decoration:none;}
.meganav .mn-logo{display:flex;align-items:center;gap:8px;flex:0 0 auto;}
.meganav .mn-ls{font-weight:900;font-size:24px;line-height:.9;
  background:linear-gradient(165deg,var(--sg-hi) 10%,var(--sg-deep) 90%);
  -webkit-background-clip:text;background-clip:text;color:transparent;}
html[data-theme="light"] .meganav .mn-ls{background:linear-gradient(165deg,#16a34a 10%,#14532d 90%);-webkit-background-clip:text;background-clip:text;}
.meganav .mn-lr{display:flex;flex-direction:column;line-height:1.1;}
.meganav .mn-lr b{font-weight:800;font-size:14.5px;letter-spacing:.02em;color:var(--text,#e7edf3);}
.meganav .mn-lr i{font-style:normal;font-size:7.5px;letter-spacing:1.4px;color:var(--faint,#5a6573);font-weight:700;}
.meganav .mn-beta{font-style:normal;font-size:9px;font-weight:800;letter-spacing:.8px;color:var(--ramber);border:1px solid var(--ramber-border);border-radius:5px;padding:2px 5px;margin-left:2px;}
.meganav .mn-nav{display:flex;align-items:center;gap:2px;flex:1 1 auto;min-width:0;}
.meganav .mn-top{appearance:none;background:none;border:0;font:inherit;cursor:pointer;padding:19px 11px;font-size:13.5px;font-weight:600;color:var(--muted,#8895a4);letter-spacing:.2px;border-bottom:2px solid transparent;white-space:nowrap;}
.meganav .mn-item:hover>.mn-top,.meganav .mn-item.open>.mn-top{color:var(--text,#e7edf3);}
.meganav .mn-item.on>.mn-top{color:var(--text,#e7edf3);border-bottom-color:var(--sg);}
.meganav .mn-item{position:static;}
.meganav .mn-panel{display:none;position:absolute;left:0;right:0;top:56px;background:var(--panel,#111822);border-bottom:1px solid var(--border,#1d2733);box-shadow:0 18px 40px rgba(0,0,0,.45);padding:20px 0 22px;}
.meganav .mn-item.open>.mn-panel{display:block;}
@media(hover:hover) and (min-width:1021px){.meganav .mn-item:hover>.mn-panel{display:block;}}
.meganav .mn-pin{max-width:1280px;margin:0 auto;padding:0 18px;}
.meganav .mn-desc{margin:0 0 14px;font-size:12px;color:var(--faint,#5a6573);font-weight:500;max-width:640px;}
.meganav .mn-links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 26px;}
.meganav .mn-links.mn-w2{grid-template-columns:repeat(2,minmax(0,1fr));max-width:640px;}
.meganav .mn-link{display:block;padding:9px 10px;border-radius:9px;}
.meganav .mn-link:hover{background:var(--elev,#16202b);}
.meganav .mn-link b{display:block;font-size:13.5px;font-weight:700;color:var(--text,#e7edf3);}
.meganav .mn-link span{display:block;margin-top:2px;font-size:12px;line-height:1.45;color:var(--muted,#8895a4);font-weight:400;}
.meganav .mn-off{display:block;padding:9px 10px;font-size:13.5px;font-weight:700;color:var(--faint,#5a6573);}
.meganav .mn-b{font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;border-radius:5px;padding:1.5px 6px;margin-left:7px;vertical-align:2px;}
.meganav .mn-b-live{color:var(--green,#22c55e);border:1px solid rgba(34,197,94,.35);}
.meganav .mn-b-acct{color:#d9a13c;border:1px solid rgba(217,161,60,.4);}
.meganav .mn-b-soon{color:var(--faint,#5a6573);border:1px dashed var(--border,#1d2733);}
.meganav .mn-right{display:flex;align-items:center;gap:10px;flex:0 0 auto;margin-left:auto;}
.meganav .mn-search{position:relative;}
.meganav .mn-search .box{display:flex;align-items:center;gap:7px;background:var(--elev,#16202b);border:1px solid var(--border,#1d2733);border-radius:9px;padding:6px 10px;color:var(--faint,#5a6573);}
.meganav .mn-search input{background:none;border:0;outline:0;color:var(--text,#e7edf3);font:inherit;font-size:13px;width:120px;}
.meganav .mn-search .kbd{font-size:10px;border:1px solid var(--border,#1d2733);border-radius:4px;padding:0 5px;color:var(--faint,#5a6573);}
.meganav .mn-search .drop{position:absolute;right:0;top:40px;width:330px;max-width:calc(100vw - 24px);background:var(--panel,#111822);border:1px solid var(--border,#1d2733);border-radius:11px;box-shadow:0 16px 34px rgba(0,0,0,.5);overflow:hidden;z-index:70;}
.meganav .mn-search .sg{display:flex;align-items:center;gap:9px;padding:8px 11px;cursor:pointer;font-size:13px;}
.meganav .mn-search .sg.active,.meganav .mn-search .sg:hover{background:var(--elev,#16202b);}
.meganav .mn-search .sg img{width:18px;height:18px;border-radius:4px;}
.meganav .mn-search .sg .tk{font-weight:800;color:var(--text,#e7edf3);min-width:52px;}
.meganav .mn-search .sg .nm{color:var(--muted,#8895a4);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.meganav .mn-search .sg .pc{font-weight:700;font-variant-numeric:tabular-nums;}
.meganav .mn-search .sg .pc.up{color:var(--green,#22c55e);}.meganav .mn-search .sg .pc.down{color:var(--red,#f05a6e);}
.meganav .mn-asof{display:none;}
.meganav .mn-theme{appearance:none;background:var(--elev,#16202b);border:1px solid var(--border,#1d2733);border-radius:9px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted,#8895a4);}
.meganav .mn-theme:hover{color:var(--text,#e7edf3);border-color:var(--accent-border,#22436a);}
.meganav .mn-theme .ic-sun{display:none;}
html[data-theme="light"] .meganav .mn-theme .ic-sun{display:block;}
html[data-theme="light"] .meganav .mn-theme .ic-moon{display:none;}
.meganav .mn-signin{font-size:13px;font-weight:700;color:var(--muted,#8895a4);padding:7px 4px;}
.meganav .mn-signin:hover{color:var(--text,#e7edf3);}
.meganav .mn-signup{font-size:13px;font-weight:700;color:var(--sg);background:var(--sg-soft);border:1px solid var(--sg-border);border-radius:9px;padding:7px 13px;white-space:nowrap;}
.meganav .mn-signup:hover{background:var(--sg);color:#04140b;}
.meganav .mn-burger{appearance:none;background:none;border:1px solid var(--border,#1d2733);border-radius:9px;width:38px;height:36px;display:none;align-items:center;justify-content:center;cursor:pointer;color:var(--text,#e7edf3);}
.meganav :is(a,button):focus-visible{outline:2px solid var(--sg);outline-offset:2px;border-radius:6px;}
.meganav .mn-search .box:focus-within{border-color:var(--sg-border);}
/* drawer */
.meganav .mn-drawer{display:none;position:fixed;inset:0;z-index:80;background:var(--bg,#0a0e13);overflow-y:auto;padding:0 16px 28px;}
.meganav .mn-drawer.open{display:block;}
.meganav .mnd-head{display:flex;align-items:center;justify-content:space-between;height:56px;margin-bottom:6px;}
.meganav .mnd-close{appearance:none;background:none;border:1px solid var(--border,#1d2733);border-radius:9px;width:38px;height:36px;font-size:17px;color:var(--text,#e7edf3);cursor:pointer;}
.meganav .mnd-quick{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px;}
.meganav .mnd-quick a{display:block;text-align:center;padding:11px 8px;border:1px solid var(--border,#1d2733);border-radius:10px;font-size:13.5px;font-weight:700;color:var(--text,#e7edf3);background:var(--panel,#111822);}
.meganav details.mnd-sec{border-bottom:1px solid var(--border-soft,#161e28);}
.meganav details.mnd-sec summary{list-style:none;display:flex;justify-content:space-between;align-items:center;padding:14px 2px;font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted,#8895a4);cursor:pointer;}
.meganav details.mnd-sec summary::-webkit-details-marker{display:none;}
.meganav details.mnd-sec summary::after{content:"+";font-size:16px;color:var(--faint,#5a6573);}
.meganav details.mnd-sec[open] summary::after{content:"\\2212";}
.meganav .mnd-sec a{display:block;padding:9px 2px 9px 10px;font-size:14px;font-weight:600;color:var(--muted,#8895a4);}
.meganav .mnd-sec a:active,.meganav .mnd-sec a:hover{color:var(--text,#e7edf3);}
.meganav .mnd-sec .mn-off{padding:9px 2px 9px 10px;font-size:14px;}
.meganav .mnd-cta{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:18px 0 10px;}
.meganav .mnd-cta a{display:block;text-align:center;padding:12px 8px;border-radius:10px;font-size:14px;font-weight:700;}
.meganav .mnd-cta .a1{background:var(--sg-soft);border:1px solid var(--sg-border);color:var(--sg);}
.meganav .mnd-cta .a2{border:1px solid var(--border,#1d2733);color:var(--text,#e7edf3);}
.meganav .mnd-foot{font-size:11px;color:var(--faint,#5a6573);line-height:1.6;margin-top:6px;}
@media(max-width:1280px){
  /* terminal's native pill: knob-only when the bar gets tight (its .day knob
     position is calc(100%-32px), so it adapts to any width) */
  .meganav #theme-toggle{width:46px;}
  .meganav .tt-label{display:none;}
}
@media(max-width:1240px){
  .meganav .mn-top{padding:19px 8px;font-size:13px;}
  .meganav .mn-search input{width:92px;}
  .meganav .mn-in{gap:12px;}
}
@media(max-width:1100px){
  .meganav .mn-nav{display:none;}
  .meganav .mn-burger{display:flex;}
  .meganav .mn-signin{display:none;}
}
@media(max-width:760px){
  .meganav .mn-asof{display:none;}
  .meganav .mn-signup{display:none;}
  /* signed-out auth buttons (incl. accounts.js-rendered) live in the drawer
     on small screens; only the logged-in account chip stays in the bar */
  .meganav #santro-auth-slot #sa-signin,.meganav #santro-auth-slot .sa-signupbtn{display:none;}
  .meganav .mn-search input{width:64px;}
  .meganav .mn-search .kbd{display:none;}
  .meganav .mn-in{gap:8px;padding:0 12px;}
  .meganav .mn-right{gap:7px;}
}
@media(max-width:479px){
  /* compact logo for ALL phone widths — the old 389px cutoff missed 390px
     (iPhone 12-15) by one pixel and the right cluster overflowed the page */
  .meganav .mn-beta{display:none;}
  .meganav .mn-lr i{display:none;}
  .meganav .mn-search input{width:52px;}
}
""".strip()

MOON = '<svg class="ic-moon" viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/></svg>'
SUN = '<svg class="ic-sun" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.1"/><path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1M5.2 5.2l1.5 1.5M17.3 17.3l1.5 1.5M18.8 5.2l-1.5 1.5M6.7 17.3l-1.5 1.5"/></svg>'

# terminal.html keeps its native pill + reload (its inline JS owns them,
# including the ECharts repaint on theme change) — see data-native handling
# in nav.js
TERMINAL_UTILS = """<button id="reload" title="Reloads saved data.">↻</button>
      <button id="theme-toggle" class="mn-theme-native" data-native="1" title="Switch day / night mode" aria-label="Toggle day or night mode">
        <span class="tt-label" id="tt-label">NIGHTMODE</span>
        <span class="tt-knob">""" + MOON + SUN + """</span>
      </button>"""

DEFAULT_UTILS = ('<button class="mn-theme" title="Switch day / night mode" '
                 'aria-label="Toggle day or night mode">' + MOON + SUN + '</button>')

def esc(s): return html.escape(s, quote=True)

def render_links(menu, drawer=False):
    out = []
    for label, href, desc, badge in menu["links"]:
        b = BADGE.get(badge, "") if badge else ""
        if href is None:
            out.append(f'<span class="mn-off">{esc(label)}{b}</span>')
            continue
        ext = ' target="_blank" rel="noopener"' if href.startswith("https://") else ""
        if drawer or not desc:
            out.append(f'<a href="{href}"{ext}>{esc(label)}{b}</a>')
        else:
            out.append(f'<a class="mn-link" href="{href}"{ext}><b>{esc(label)}{b}</b><span>{esc(desc)}</span></a>')
    return "\n        ".join(out)

def render_header(active, utils, is_terminal=False):
    items = []
    for m in NAV:
        on = " on" if m["key"] == active else ""
        desc = f'<p class="mn-desc">{esc(m["desc"])}</p>' if m["desc"] else ""
        wide = "" if len(m["links"]) > 5 and any(l[2] for l in m["links"]) else " mn-w2"
        grid = "" if m["key"] == "company" else ""
        items.append(f'''<div class="mn-item{on}" data-menu="{m['key']}">
      <button class="mn-top" type="button" aria-expanded="false" aria-haspopup="true">{esc(m['label'])}</button>
      <div class="mn-panel"><div class="mn-pin">{desc}<div class="mn-links{wide if m['key']=='company' or m['key']=='maps' else ''}">
        {render_links(m)}
      </div></div></div>
    </div>''')
    drawer_secs = []
    for m in NAV:
        drawer_secs.append(f'''<details class="mnd-sec"><summary>{esc(m['label'])}</summary>
      {render_links(m, drawer=True)}
    </details>''')
    return f'''<!-- meganav v{V} — generated by gen_nav.py; edit NAV there, not here -->
<link rel="stylesheet" href="/ds-v2/tokens.css?v=1">
<link rel="stylesheet" href="/ds-v2/primitives.css?v=1">
<link rel="stylesheet" href="/ds-v2/shell.css?v=1">
<script src="/ds-v2/flags.js?v=2"></script>
<header class="meganav" id="meganav">
<style>
{CSS}
</style>
<div class="mn-in">
  <a class="mn-logo" href="/" aria-label="Santro AI — home">
    <span class="mn-ls">S</span>
    <span class="mn-lr"><b>Santro&nbsp;AI</b><i>THE&nbsp;AI&nbsp;BUBBLE&nbsp;TERMINAL</i></span>
    <em class="mn-beta">Beta</em>
  </a>
  <nav class="mn-nav" aria-label="Main">
    {"".join(items)}
  </nav>
  <div class="mn-right">
    <div class="mn-search"></div>
    {'<span id="asof" class="mn-asof"></span>' if is_terminal else '<span class="mn-asof"></span>'}
    {utils}
    <span id="santro-auth-slot"><a class="mn-signin" href="/signin">Sign in</a><a class="mn-signup" href="/signup">Sign up</a></span>
    <button class="mn-burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mn-drawer"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
  </div>
</div>
<div class="mn-drawer" id="mn-drawer" role="dialog" aria-label="Menu" aria-modal="true">
  <div class="mnd-head">
    <span class="mn-ls">S</span>
    <button class="mnd-close" type="button" aria-label="Close menu">✕</button>
  </div>
  <div class="mnd-quick">
    <a href="/terminal">AI Terminal</a><a href="/stocks">AI Stocks</a>
    <a href="/crypto">AI Crypto</a><a href="/etfs">AI ETFs</a>
  </div>
  {"".join(drawer_secs)}
  <div class="mnd-cta">
    <a class="a1" href="/signup">Create free account</a>
    <a class="a2" href="/signin">Sign in</a>
  </div>
  <p class="mnd-foot">Hot means attention, not direction.<br>Quotes delayed ~15 min. Real-time data planned for Pro. Not financial advice.</p>
</div>
<script src="/nav.js?v={V}" defer></script>
</header>'''

# ── per-page section mapping ───────────────────────────────────────────────
def section_for(f):
    p = "/" + f[:-5]
    if f == "index.html": return None
    if p in ("/stocks/aschenbrenner", "/stocks/burry-short-watch", "/stocks/burry"): return "research"
    if p == "/terminal" or p in ("/stocks", "/crypto", "/etfs", "/news", "/t", "/e", "/c"): return "terminal"
    if p.startswith("/etfs/"): return "terminal"
    if p.startswith("/stocks/"): return "universe"
    if p in ("/bubble", "/quiz", "/share", "/evaluate-prompt") or p.startswith("/tools/"): return "tools"
    if p in ("/research", "/blog", "/ipos", "/ipo") or p.startswith(("/blog/", "/ipos/", "/research/")): return "research"
    if p in ("/about", "/privacy", "/terms"): return "company"
    return None

# ── sweep ──────────────────────────────────────────────────────────────────
RE_MEGA   = re.compile(r'<!-- meganav v[^>]*-->.*?<header class="meganav".*?</header>', re.S)
RE_PAGEH  = re.compile(r'<header class="pageheader">.*?</header>', re.S)
RE_SAHEAD = re.compile(r'<header class="sa-head">.*?</header>', re.S)
RE_TOPBAR_IDX = re.compile(r'<div class="topbar">.*?</div>\s*</div>\s*(?=\n\s*<!-- ══ QUIZ-FIRST)', re.S)
RE_TOPBAR_TRM = re.compile(r'<div class="topbar">.*?</div>\s*</div>\s*(?=\n\s*<div class="topstrip">)', re.S)
RE_SITEJS = re.compile(r'[ \t]*<script src="/?site\.js\?v=\d+"[^>]*></script>\n?')

def sweep():
    files = sorted(f for f in set(glob.glob("*.html") + glob.glob("*/*.html") + glob.glob("*/*/*.html"))
                   if not os.path.basename(f).startswith("_"))
    stats = dict(mega=0, pageheader=0, sahead=0, topbar=0, none=0, sitejs=0)
    for f in files:
        s = open(f, encoding="utf-8").read()
        if 'name="robots" content="noindex' in s and 'http-equiv="refresh"' in s:
            continue  # retired-slug redirect stub — no header/footer chrome
        utils = TERMINAL_UTILS if f == "terminal.html" else DEFAULT_UTILS
        hdr = render_header(section_for(f), utils, is_terminal=(f == "terminal.html"))
        if RE_MEGA.search(s):
            s2 = RE_MEGA.sub(lambda m: hdr, s, count=1); stats["mega"] += 1
        elif RE_PAGEH.search(s):
            s2 = RE_PAGEH.sub(lambda m: hdr, s, count=1); stats["pageheader"] += 1
        elif RE_SAHEAD.search(s):
            s2 = RE_SAHEAD.sub(lambda m: hdr, s, count=1); stats["sahead"] += 1
        elif f == "index.html" and RE_TOPBAR_IDX.search(s):
            s2 = RE_TOPBAR_IDX.sub(lambda m: hdr + "\n", s, count=1); stats["topbar"] += 1
        elif f == "terminal.html" and RE_TOPBAR_TRM.search(s):
            s2 = RE_TOPBAR_TRM.sub(lambda m: hdr + "\n", s, count=1); stats["topbar"] += 1
        else:
            stats["none"] += 1
            print("NO HEADER MATCHED:", f)
            continue
        n = len(RE_SITEJS.findall(s2))
        if n: stats["sitejs"] += n; s2 = RE_SITEJS.sub("", s2)
        open(f, "w", encoding="utf-8").write(s2)
    print("sweep:", stats, "files:", len(files))
    assert stats["none"] == 0, "some pages have no recognizable header"

def validate():
    hrefs = set()
    for m in NAV:
        for _, href, _, _ in m["links"]:
            if href: hrefs.add(href)
    hrefs |= {"/signin", "/signup", "/terminal", "/stocks", "/crypto", "/etfs", "/privacy"}
    bad = []
    for h in sorted(hrefs):
        if h.startswith(("mailto:", "https://")): continue
        path = h.split("#")[0].lstrip("/")
        target = "index.html" if path == "" else path + ".html"
        if not os.path.exists(target): bad.append(h)
    print("nav hrefs:", len(hrefs), "| broken:", bad or "none")
    assert not bad
    assert 'id="stress"' in open("bubble.html").read()

if __name__ == "__main__":
    sweep()
    validate()
    print("OK — header regenerated on all pages")
