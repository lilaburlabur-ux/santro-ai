#!/usr/bin/env python3
"""Inject the shared premium sector bubble map into every theme page.

THE mechanism for keeping /stocks/themes/* on the canonical renderer
(components/sector-bubble-map.js). Idempotent: re-running replaces the
marker-delimited block, never duplicates. Bump V here on renderer changes.

Run:  python3 scripts/inject_sector_maps.py
"""
import glob, json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(HERE)
V = "3"   # cache-bust: bump on every sector-bubble-map.js edit

START, END = "<!-- sector-map:start -->", "<!-- sector-map:end -->"

labels = {b["id"]: b["label"] for b in json.load(open("universe.json"))["bubbles"]}

def block(bubble_id, label):
    return f"""{START}
    <figure style="margin:18px 0 8px;margin-inline:0">
      <div id="sector-map" data-bubble="{bubble_id}"></div>
      <figcaption style="font-size:11.5px;color:var(--faint);margin-top:6px;font-family:var(--font-mono,monospace)">Live heat — sized by market cap, colored by today's move. Click a bubble for detail; quotes delayed ~15 min.</figcaption>
    </figure>
    <script src="/components/sector-bubble-map.js?v={V}"></script>
    <script>SantroSectorMap.mount(document.getElementById('sector-map'),{{bubbleId:'{bubble_id}',label:{json.dumps(label)}}});</script>
    {END}"""

changed = 0
for f in sorted(glob.glob("stocks/themes/*.html")):
    slug = os.path.basename(f)[:-5]
    bid = slug.replace("-", "_")
    if bid not in labels:
        print(f"SKIP {f}: no universe bubble '{bid}'"); continue
    s = open(f, encoding="utf-8").read()
    orig = s
    # retire the legacy powering-ai sub-map (figure + script + mount)
    s = re.sub(r'<figure class="emap-wrap".*?</figure>\s*', "", s, flags=re.S)
    s = re.sub(r'<script src="/components/energy-heat-submap\.js[^"]*"></script>\s*', "", s)
    s = re.sub(r"<script>SantroEnergyMap\.mount[^<]*</script>\s*", "", s)
    # replace existing injected block, else insert after the .sub line
    if START in s:
        s = re.sub(re.escape(START) + r".*?" + re.escape(END), block(bid, labels[bid]), s, flags=re.S)
    else:
        m = re.search(r'(<p class="sub">.*?</p>)', s, flags=re.S)
        if not m:
            print(f"FAIL {f}: no .sub anchor"); sys.exit(1)
        s = s.replace(m.group(1), m.group(1) + "\n    " + block(bid, labels[bid]), 1)
    if s != orig:
        open(f, "w", encoding="utf-8").write(s); changed += 1
        print(f"injected {f} -> {bid}")
print(f"done: {changed} pages updated, V={V}")
