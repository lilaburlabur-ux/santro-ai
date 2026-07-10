#!/usr/bin/env python3
"""Theme-page data injector — THE mechanism keeping /stocks/themes/* consistent
with the canonical AI Universe dataset (universe.json, what /terminal reads).

Responsibilities (all idempotent, marker-delimited — rerun anytime):
  1. sector-map block  — shared premium renderer (components/sector-bubble-map.js),
     terminal sizing semantics (|day move|).
  2. members table     — REGENERATED from universe.json: canonical /stocks/<slug>
     links (every universe ticker now has a static profile page),
     1D + Cap columns baked at generation time and live-refreshed in the browser
     from the SAME universe.json fetch the map makes (santro:universe event —
     zero extra requests).
  3. subtitle line     — "N names · combined market cap $X · part of the
     Santro AI <total>-name universe" recomputed from the dataset.

Bump V on every sector-bubble-map.js edit. Run: python3 scripts/inject_sector_maps.py
"""
import glob, json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(HERE)
V = "6"   # cache-bust: bump on every sector-bubble-map.js / engine edit
EV = "1"  # engine version (components/santro-bubble-engine.js)

MAP_S, MAP_E = "<!-- sector-map:start -->", "<!-- sector-map:end -->"
TBL_S, TBL_E = "<!-- sector-table:start -->", "<!-- sector-table:end -->"

u = json.load(open("universe.json"))
bubbles = {b["id"]: b for b in u["bubbles"]}
TOTAL = sum(len(b["tickers"]) for b in u["bubbles"])

GROUP_LABELS = {
    "nuclear_ipp": "Nuclear &amp; IPP", "electrical_turbines": "Electrical &amp; turbines",
    "uranium_fuel": "Uranium fuel", "grid_utilities": "Grid &amp; utilities",
    "dc_infra": "Data-center infra",
}

def esc(s): return str(s or "").replace("&", "&amp;").replace("<", "&lt;")
def fcap(b): return "—" if b is None else (f"${b/1000:.2f}T" if b >= 1000 else (f"${b:.0f}B" if b >= 10 else f"${b:.1f}B"))
def fpct(p): return "—" if p is None else f"{p:+.2f}%"

def map_block(bid, label):
    return f"""{MAP_S}
    <figure style="margin:18px 0 8px;margin-inline:0">
      <div id="sector-map" data-bubble="{bid}"></div>
      <figcaption style="font-size:11.5px;color:var(--faint);margin-top:6px;font-family:var(--font-mono,monospace)">Live heat — sized by the day's move, colored by direction (same live engine as the <a href="/terminal" style="color:inherit">terminal</a>). Bubble selects; ticker text opens its page. Quotes delayed ~15 min<span data-asof></span>.</figcaption>
    </figure>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
    <script src="/components/santro-bubble-engine.js?v={EV}"></script>
    <script src="/components/sector-bubble-map.js?v={V}"></script>
    <script>SantroSectorMap.mount(document.getElementById('sector-map'),{{bubbleId:'{bid}',label:{json.dumps(label)}}});</script>
    {MAP_E}"""

def table_block(b):
    rows, tks = [], sorted(b["tickers"], key=lambda t: -(t.get("market_cap_b") or 0))
    grouped = any(t.get("sub_theme") for t in tks)
    def row(t):
        tk = t["ticker"]
        return (f'<tr><td class="tk"><a href="/stocks/{tk.lower()}"><b>{tk}</b></a></td>'
                f'<td>{esc(t.get("company"))}</td><td>{esc(t.get("industry"))}</td>'
                f'<td class="num" data-move-for="{tk}">{fpct(t.get("change_pct"))}</td>'
                f'<td class="num" data-cap-for="{tk}">{fcap(t.get("market_cap_b"))}</td></tr>')
    if grouped:
        seen = []
        for t in tks:
            g = t.get("sub_theme") or "other"
            if g not in seen: seen.append(g)
        for g in seen:
            rows.append(f'<tr class="grp"><td colspan="5">{GROUP_LABELS.get(g, esc(g))}</td></tr>')
            rows += [row(t) for t in tks if (t.get("sub_theme") or "other") == g]
    else:
        rows = [row(t) for t in tks]
    live = ("<script>document.addEventListener('santro:universe',function(e){"
            "var u=e.detail||{};var px={};(u.bubbles||[]).forEach(function(b){b.tickers.forEach(function(t){px[t.ticker]=t;});});"
            "var f=function(p){return p==null?'—':(p>=0?'+':'')+p.toFixed(2)+'%';};"
            "var c=function(b){return b==null?'—':(b>=1000?'$'+(b/1000).toFixed(2)+'T':b>=10?'$'+Math.round(b)+'B':'$'+b.toFixed(1)+'B');};"
            "document.querySelectorAll('[data-move-for]').forEach(function(td){var t=px[td.dataset.moveFor];if(t){td.textContent=f(t.change_pct);td.style.color=(t.change_pct||0)>=0?'var(--green,#22c55e)':'var(--red,#f05a6e)';}});"
            "document.querySelectorAll('[data-cap-for]').forEach(function(td){var t=px[td.dataset.capFor];if(t)td.textContent=c(t.market_cap_b);});"
            "var a=document.querySelector('[data-asof]');if(a&&u.meta&&u.meta.as_of)a.textContent=' · as of '+u.meta.as_of;"
            "});</script>")
    return (f"{TBL_S}\n    <table class=\"tt\"><thead><tr><th>Ticker</th><th>Company</th><th>Industry</th>"
            f"<th style=\"text-align:right\">1D</th><th style=\"text-align:right\">Market cap</th></tr></thead>\n"
            f"    <tbody>{''.join(rows)}</tbody></table>\n    {live}\n    {TBL_E}")

changed = 0
for f in sorted(glob.glob("stocks/themes/*.html")):
    slug = os.path.basename(f)[:-5]
    bid = slug.replace("-", "_")
    if bid not in bubbles:
        print(f"SKIP {f}: no universe bubble '{bid}'"); continue
    b = bubbles[bid]
    s = open(f, encoding="utf-8").read(); orig = s
    # legacy powering-ai sub-map leftovers
    s = re.sub(r'<figure class="emap-wrap".*?</figure>\s*', "", s, flags=re.S)
    s = re.sub(r'<script src="/components/energy-heat-submap\.js[^"]*"></script>\s*', "", s)
    s = re.sub(r"<script>SantroEnergyMap\.mount[^<]*</script>\s*", "", s)
    # 1) map block
    if MAP_S in s:
        s = re.sub(re.escape(MAP_S) + r".*?" + re.escape(MAP_E), lambda m: map_block(bid, b["label"]), s, flags=re.S)
    else:
        m = re.search(r'(<p class="sub">.*?</p>)', s, flags=re.S)
        if not m: print(f"FAIL {f}: no .sub anchor"); sys.exit(1)
        s = s.replace(m.group(1), m.group(1) + "\n    " + map_block(bid, b["label"]), 1)
    # 2) members table (replace legacy table once, markers thereafter)
    if TBL_S in s:
        s = re.sub(re.escape(TBL_S) + r".*?" + re.escape(TBL_E), lambda m: table_block(b), s, flags=re.S)
    else:
        s = re.sub(r'<table class="tt">.*?</table>', lambda m: table_block(b), s, count=1, flags=re.S)
    # 3) subtitle recomputed from the dataset
    sub = (f'<p class="sub">{len(b["tickers"])} names · combined market cap '
           f'{fcap(b.get("total_market_cap_b"))} · part of the Santro AI {TOTAL}-name universe</p>')
    s = re.sub(r'<p class="sub">.*?</p>', lambda m: sub, s, count=1, flags=re.S)
    if s != orig:
        open(f, "w", encoding="utf-8").write(s); changed += 1
        print(f"regenerated {f} -> {bid} ({len(b['tickers'])} tickers)")

# 4) hero/landing stat counts — keep data-stat numbers synced with the dataset
for page in ("index.html", "stocks.html"):
    idx = open(page, encoding="utf-8").read()
    idx2 = re.sub(r'(data-stat="tickers">)\d+(<)', rf'\g<1>{TOTAL}\g<2>', idx)
    idx2 = re.sub(r'(data-stat="themes">)\d+(<)', rf'\g<1>{len(bubbles)}\g<2>', idx2)
    if idx2 != idx:
        open(page, "w", encoding="utf-8").write(idx2)
        print(f"{page} stat counts synced: {TOTAL} tickers / {len(bubbles)} themes")

print(f"done: {changed} pages, V={V}, universe={TOTAL} tickers")
