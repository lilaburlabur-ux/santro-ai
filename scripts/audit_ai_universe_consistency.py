#!/usr/bin/env python3
"""AI Universe consistency audit: terminal source of truth vs theme pages.

Terminal reads universe.json live — so universe.json IS the canonical dataset.
This script diffs every /stocks/themes/* page against it at ticker level:
  - table ticker set vs bubble membership (missing / extra)
  - baked market caps vs live values (staleness)
  - ticker link patterns (canonical: /t?sym=SYM — works for every ticker;
    /stocks/<sym> static research pages don't exist for newer names)
  - injected map block presence + bubbleId match
Exit 0 = consistent, 1 = divergence. Also writes a JSON report when run with
--report <path>.
"""
import glob, json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(HERE)

u = json.load(open("universe.json"))
bubbles = {b["id"]: b for b in u["bubbles"]}
as_of = (u.get("meta") or {}).get("as_of", "?")

report = {"as_of": as_of, "commit": None, "pages": [], "summary": {}}
fails = []

for f in sorted(glob.glob("stocks/themes/*.html")):
    slug = os.path.basename(f)[:-5]
    bid = slug.replace("-", "_")
    page = {"route": f"/stocks/themes/{slug}", "bubble_id": bid}
    s = open(f, encoding="utf-8").read()
    b = bubbles.get(bid)
    if not b:
        page["error"] = "no matching universe bubble"; fails.append(page["route"]); report["pages"].append(page); continue
    canon = {t["ticker"] for t in b["tickers"]}
    caps = {t["ticker"]: t.get("market_cap_b") for t in b["tickers"]}

    # table ticker set: hrefs inside the members table
    tbl = re.search(r'<table class="tt">.*?</table>', s, re.S)
    tset, links_stock, links_t = set(), 0, 0
    if tbl:
        for m in re.finditer(r'href="?/(?:t\?sym=([A-Z.]+)|stocks/([a-z.]+))"?', tbl.group(0)):
            if m.group(1): tset.add(m.group(1)); links_t += 1
            else: tset.add(m.group(2).upper()); links_stock += 1
    page["expected"] = sorted(canon)
    page["table_missing"] = sorted(canon - tset)
    page["table_extra"] = sorted(tset - canon)
    page["links_stocks_pattern"] = links_stock
    page["links_t_pattern"] = links_t

    # baked caps staleness: compare table $ values against live (±15% tolerance)
    stale = []
    if tbl:
        for m in re.finditer(r'sym=([A-Z.]+)"?[^$]*?\$([0-9.]+)([TB])', tbl.group(0)):
            tk, val, unit = m.group(1), float(m.group(2)), m.group(3)
            baked = val * (1000 if unit == "T" else 1)
            live = caps.get(tk)
            if live and abs(baked - live) / live > 0.15:
                stale.append({"ticker": tk, "baked_b": baked, "live_b": round(live, 1)})
    page["stale_caps"] = stale

    # injected shared map present with the right bubble?
    mmap = re.search(r'data-bubble="([a-z_]+)"', s)
    page["map_bubble"] = mmap.group(1) if mmap else None
    page["map_ok"] = bool(mmap and mmap.group(1) == bid and "sector-bubble-map.js" in s)

    ok = (not page["table_missing"] and not page["table_extra"]
          and page["map_ok"] and links_stock == 0 and not stale)
    page["consistent"] = ok
    if not ok: fails.append(page["route"])
    report["pages"].append(page)

# canonical URL rule: /t?sym= serves every ticker (t.html exists); count static gaps
static = {os.path.basename(p)[:-5].upper() for p in glob.glob("stocks/*.html")}
allt = {t["ticker"] for b in u["bubbles"] for t in b["tickers"]}
report["summary"] = {
    "universe_tickers": len(allt),
    "tickers_without_static_stocks_page": sorted(allt - static),
    "inconsistent_pages": fails,
    "sizing_note": "terminal sizes by |day move|+0.5; pages must use the same semantics (renderer sizeBy='move')",
}

if "--report" in sys.argv:
    out = sys.argv[sys.argv.index("--report") + 1]
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(report, open(out, "w"), indent=1)
print(f"universe as_of {as_of} · {len(allt)} tickers · pages checked: {len(report['pages'])}")
for p in report["pages"]:
    flag = "OK " if p.get("consistent") else "DIVERGENT"
    print(f"  {flag} {p['route']}: missing={len(p.get('table_missing',[]))} extra={len(p.get('table_extra',[]))} "
          f"staleCaps={len(p.get('stale_caps',[]))} stockLinks={p.get('links_stocks_pattern',0)} mapOk={p.get('map_ok')}")
print("no static /stocks page (need /t?sym=):", ", ".join(report["summary"]["tickers_without_static_stocks_page"]) or "none")
sys.exit(1 if fails else 0)
