#!/usr/bin/env python3
"""Inject FAQ sections + FAQPage JSON-LD into /ipos/* watch pages.

Content source: data/ipo_faqs.json — FAQ entries composed strictly from facts
already on each page and adversarially fact-checked (no invented dates,
valuations, or tickers; hedged language preserved; no advice).

Idempotent: marker-delimited (<!-- ipo-faq:start/end -->); rerun replaces.
The FAQPage JSON-LD makes these pages eligible for rich results — the
query-matching Q&A text is the thin-content fix ("<company> ipo date",
"is <company> going public", etc.).

Run: python3 scripts/inject_ipo_faq.py
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(HERE)

S, E = "<!-- ipo-faq:start -->", "<!-- ipo-faq:end -->"

def esc(t): return str(t or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

data = json.load(open("data/ipo_faqs.json"))
changed = 0
for page in data["pages"]:
    slug, company, faqs = page["slug"], page["company"], page["faqs"]
    f = f"ipos/{slug}.html"
    if not os.path.exists(f):
        print(f"SKIP {slug}: no page"); continue
    s = open(f, encoding="utf-8").read(); orig = s

    items = "".join(
        f'\n      <div style="margin:0 0 14px"><h3 style="font-size:15px;margin:0 0 5px;color:var(--text)">{esc(q["q"])}</h3>'
        f'<p style="margin:0;color:var(--muted);font-size:14px;line-height:1.6">{esc(q["a"])}</p></div>'
        for q in faqs)
    ld = json.dumps({
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q["q"],
                        "acceptedAnswer": {"@type": "Answer", "text": q["a"]}} for q in faqs]
    }, ensure_ascii=False)
    block = (f'{S}\n    <section>\n      <h2>{esc(company)} IPO — frequently asked</h2>{items}\n'
             f'      <p style="font-size:12px;color:var(--faint);margin:2px 0 0">Answers reflect public reporting as of the page date and are subject to change. Not financial advice.</p>\n'
             f'    </section>\n    <script type="application/ld+json">{ld}</script>\n    {E}')

    if S in s:
        s = re.sub(re.escape(S) + r".*?" + re.escape(E), lambda m: block, s, flags=re.S)
    else:
        # before the closing nfax disclaimer paragraph inside <main>
        m = re.search(r'(<p class="nfax">)', s)
        if not m: print(f"FAIL {slug}: no nfax anchor"); sys.exit(1)
        s = s.replace(m.group(1), block + "\n    " + m.group(1), 1)

    if s != orig:
        open(f, "w", encoding="utf-8").write(s); changed += 1
        print(f"faq injected: {slug} ({len(faqs)} Q&A)")
print(f"done: {changed} pages")
