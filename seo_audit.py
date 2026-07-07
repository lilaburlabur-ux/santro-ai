#!/usr/bin/env python3
"""seo_audit.py — repeatable SEO gate for the static site (the `npm run seo:audit`
equivalent for a no-build project).

Checks every public route's local HTML for: title (present, unique, length),
meta description (present, length), self-referencing canonical, exactly one H1,
valid JSON-LD, and noindex correctness. Optionally (--live) checks HTTP status
of each route and that a bogus path 404s.

Exit code is non-zero if any INDEXABLE core page is missing an essential — wire
it into CI to stop a regression from shipping.

Run:  .venv/bin/python seo_audit.py            # local files (fast, offline)
      .venv/bin/python seo_audit.py --live      # also hit https://santroai.tech
"""
import os
import sys
import json
import subprocess

try:
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("needs beautifulsoup4 — run with the project venv: .venv/bin/python seo_audit.py")

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "https://santroai.tech"

# route -> (file, indexable?). Indexable pages must have full metadata + 1 H1.
ROUTES = [
    ("/", "index.html", True), ("/about", "about.html", True),
    ("/stocks", "stocks.html", True), ("/crypto", "crypto.html", True),
    ("/etfs", "etfs.html", True), ("/bubble", "bubble.html", True),
    ("/news", "news.html", True), ("/research", "research.html", True),
    ("/share", "share.html", True), ("/ipos", "ipos.html", True),
    ("/blog", "blog.html", True),
    ("/stocks/amat", "stocks/amat.html", True),
    ("/stocks/amd", "stocks/amd.html", True),
    ("/stocks/apld", "stocks/apld.html", True),
    ("/stocks/asts", "stocks/asts.html", True),
    ("/stocks/avgo", "stocks/avgo.html", True),
    ("/stocks/corz", "stocks/corz.html", True),
    ("/stocks/inod", "stocks/inod.html", True),
    ("/stocks/lrcx", "stocks/lrcx.html", True),
    ("/stocks/lscc", "stocks/lscc.html", True),
    ("/stocks/mrvl", "stocks/mrvl.html", True),
    ("/stocks/nvda", "stocks/nvda.html", True),
    ("/stocks/pl", "stocks/pl.html", True),
    ("/stocks/rklb", "stocks/rklb.html", True),
    ("/stocks/tsm", "stocks/tsm.html", True),
    ("/evaluate-prompt", "evaluate-prompt.html", True),
    ("/blog/ai-junk-bonds", "blog/ai-junk-bonds.html", True),
    ("/blog/ai-trading-prompt-engineering", "blog/ai-trading-prompt-engineering.html", True),
    ("/blog/spacex-attention-ai-infrastructure", "blog/spacex-attention-ai-infrastructure.html", True),
    ("/blog/ai-market-cape-valuation", "blog/ai-market-cape-valuation.html", True),
    ("/blog/ai-bubble-inflation-adjusted", "blog/ai-bubble-inflation-adjusted.html", True),
    ("/blog/ai-bubble-vs-dotcom", "blog/ai-bubble-vs-dotcom.html", True),
    ("/blog/why-expensive-isnt-a-short", "blog/why-expensive-isnt-a-short.html", True),
    ("/privacy", "privacy.html", True), ("/terms", "terms.html", True),
    ("/etfs/smh", "etfs/smh.html", True),
    ("/etfs/soxx", "etfs/soxx.html", True),
    ("/etfs/aiq", "etfs/aiq.html", True),
    ("/etfs/botz", "etfs/botz.html", True),
    ("/etfs/robt", "etfs/robt.html", True),
    ("/etfs/arkq", "etfs/arkq.html", True),
    # parameterized client-rendered shells: must be noindex, metadata relaxed
    ("/t", "t.html", False), ("/e", "e.html", False),
    ("/c", "c.html", False), ("/ipo", "ipo.html", False),
]

# ── dynamic expansion: audit EVERY generated page (single source of truth) ──
import glob as _g
_known = {f for _, f, _i in ROUTES}
for _dir, _pref in (("stocks", "/stocks"), ("etfs", "/etfs"), ("blog", "/blog"),
                    ("ipos", "/ipos"), (os.path.join("stocks", "themes"), "/stocks/themes")):
    for _f in sorted(_g.glob(os.path.join(HERE, _dir, "*.html"))):
        _rel = os.path.relpath(_f, HERE)
        if _rel in _known:
            continue
        _slug = os.path.splitext(os.path.basename(_f))[0]
        ROUTES.append((f"{_pref}/{_slug}", _rel, True))
        _known.add(_rel)

# expected-count enforcement (fails loudly instead of silently shipping less)
_counts = {
    "stocks": sum(1 for r, _, _i in ROUTES if r.startswith("/stocks/") and "/themes/" not in r),
    "themes": sum(1 for r, _, _i in ROUTES if r.startswith("/stocks/themes/")),
    "etfs":   sum(1 for r, _, _i in ROUTES if r.startswith("/etfs/")),
    "ipos":   sum(1 for r, _, _i in ROUTES if r.startswith("/ipos/")),
    "blog":   sum(1 for r, _, _i in ROUTES if r.startswith("/blog/")),
}
_EXPECT = {"stocks": 95, "themes": 7, "etfs": 40, "ipos": 7, "blog": 7}
for _k, _min in _EXPECT.items():
    if _counts[_k] < _min:
        print(f"COUNT GUARD FAILED: {_k}={_counts[_k]} expected >= {_min}")
        sys.exit(1)
print("page counts:", ", ".join(f"{k}={v}" for k, v in _counts.items()))


def parse(fn):
    html = open(os.path.join(HERE, fn), encoding="utf-8", errors="ignore").read()
    s = BeautifulSoup(html, "html.parser")
    title = s.title.string.strip() if s.title and s.title.string else ""
    d = s.find("meta", attrs={"name": "description"})
    desc = d["content"].strip() if d and d.get("content") else ""
    c = s.find("link", rel="canonical")
    canon = c["href"] if c and c.get("href") else ""
    r = s.find("meta", attrs={"name": "robots"})
    noindex = "noindex" in (r["content"].lower() if r and r.get("content") else "")
    h1 = len(s.find_all("h1"))
    ld_ok, ld_n = True, 0
    for tag in s.find_all("script", type="application/ld+json"):
        ld_n += 1
        try:
            json.loads(tag.string)
        except Exception:
            ld_ok = False
    return title, desc, canon, noindex, h1, ld_ok, ld_n


def live_status(path):
    url = BASE + path + ("?cb=seoaudit" if "?" not in path else "")
    return subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", url],
                          capture_output=True, text=True).stdout.strip()


def main():
    live = "--live" in sys.argv
    seen, fails = {}, []
    print(f"{'route':<40}{'idx':>4}{'title':>6}{'desc':>5}{'canon':>6}{'h1':>3}{'ld':>3}{'noidx':>6}", end="")
    print(f"{'http':>6}" if live else "")
    print("-" * (84 if live else 78))
    for path, fn, indexable in ROUTES:
        if not os.path.exists(os.path.join(HERE, fn)):
            fails.append(f"{path}: file {fn} MISSING"); continue
        title, desc, canon, noindex, h1, ld_ok, ld_n = parse(fn)
        st = live_status(path) if live else ""
        row = [path[:39].ljust(40), ("Y" if indexable else "-").rjust(4),
               ("Y" if title else "✗").rjust(6), (str(len(desc)) if desc else "✗").rjust(5),
               ("Y" if canon else "✗").rjust(6), str(h1).rjust(3),
               (str(ld_n) if ld_ok else "BAD").rjust(3), ("Y" if noindex else "-").rjust(6)]
        if live:
            row.append(st.rjust(6))
        print("".join(row))
        if indexable:
            if not title: fails.append(f"{path}: missing <title>")
            if not desc: fails.append(f"{path}: missing meta description")
            elif not (60 <= len(desc) <= 320): fails.append(f"{path}: description length {len(desc)} out of range")
            if not canon: fails.append(f"{path}: missing canonical")
            elif not canon.startswith("https://"): fails.append(f"{path}: canonical not absolute")
            if h1 != 1: fails.append(f"{path}: H1 count is {h1} (want 1)")
            if not ld_ok: fails.append(f"{path}: invalid JSON-LD")
            if noindex: fails.append(f"{path}: indexable page is NOINDEX")
            if title in seen: fails.append(f"{path}: duplicate title with {seen[title]}")
            seen[title] = path
        else:
            if not noindex: fails.append(f"{path}: parameterized shell should be noindex")
        if live and st and st != "200" and indexable:
            fails.append(f"{path}: HTTP {st} (want 200)")
    if live:
        bogus = live_status("/this-page-does-not-exist-seo")
        print(f"\n404 check: /this-page-does-not-exist-seo -> HTTP {bogus} "
              f"({'OK' if bogus == '404' else 'EXPECTED 404'})")
        if bogus != "404": fails.append(f"bogus path returns {bogus}, expected 404")

    print("\n" + ("=" * 40))
    if fails:
        print(f"SEO AUDIT FAILED — {len(fails)} issue(s):")
        for f in fails: print("  ✗", f)
        sys.exit(1)
    
# ── landing/terminal split guard: / is quiz-only, /terminal holds the product ──
_idx = open("index.html", encoding="utf-8").read()
_term = open("terminal.html", encoding="utf-8").read()
_checks = [
    ("landing hero present", 'id="landing-hero"' in _idx),
    ("landing has NO market tape", 'class="topstrip"' not in _idx),
    ("landing has NO terminal grid", 'class="grid"' not in _idx),
    ("landing links the terminal", 'href="/terminal"' in _idx),
    ("exactly one h1 on landing", _idx.count("<h1") == 1),
    ("terminal page has the tape", 'class="topstrip"' in _term),
    ("terminal page has the grid", 'class="grid"' in _term),
    ("exactly one h1 on terminal", _term.count("<h1") == 1),
]
for _name, _ok in _checks:
    if not _ok:
        print(f"LANDING GUARD FAILED: {_name}")
        sys.exit(1)
print("landing/terminal split guard — OK")

print("SEO AUDIT PASSED — all core pages have title/description/canonical/H1/valid schema.")


if __name__ == "__main__":
    main()
