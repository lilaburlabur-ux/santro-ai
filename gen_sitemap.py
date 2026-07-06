#!/usr/bin/env python3
"""gen_sitemap.py — regenerate sitemap.xml from the known public routes.

Data-driven pages get today's date as lastmod (they genuinely refresh daily);
static/legal/blog pages get their file's last git-commit date, so we never fake
freshness on content that hasn't changed. Blog posts are auto-discovered from
blog/*.html. Parameterized client-rendered pages (/t, /e, /c, /ipo) are
intentionally excluded — they are noindex,follow shells, not standalone content.

Run:  .venv/bin/python gen_sitemap.py   (safe to wire into the refresh workflow)
"""
import os
import glob
import subprocess
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "https://santroai.tech"
TODAY = dt.date.today().isoformat()

# (url path, file, priority, changefreq, dynamic?) — dynamic ⇒ lastmod = today
ROUTES = [
    ("/",         "index.html",    "1.0", "hourly",  True),
    ("/stocks",   "stocks.html",   "0.9", "hourly",  True),
    ("/crypto",   "crypto.html",   "0.8", "hourly",  True),
    ("/etfs",     "etfs.html",     "0.8", "daily",   True),
    ("/bubble",   "bubble.html",   "0.8", "daily",   True),
    ("/ipos",     "ipos.html",     "0.8", "daily",   True),
    ("/news",     "news.html",     "0.8", "hourly",  True),
    ("/research", "research.html", "0.8", "daily",   True),
    ("/blog",     "blog.html",     "0.7", "weekly",  True),
    ("/quiz",     "quiz.html",     "0.7", "monthly", False),
    ("/evaluate-prompt","evaluate-prompt.html","0.6","monthly",False),
    ("/share",    "share.html",    "0.6", "weekly",  False),
    ("/about",    "about.html",    "0.6", "monthly", False),
    ("/privacy",  "privacy.html",  "0.3", "yearly",  False),
    ("/terms",    "terms.html",    "0.3", "yearly",  False),
]


def git_date(relpath):
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", relpath],
            cwd=HERE, capture_output=True, text=True).stdout.strip()
        return out or TODAY
    except Exception:
        return TODAY


def main():
    urls = []
    for path, file, pr, cf, dyn in ROUTES:
        lm = TODAY if dyn else git_date(file)
        urls.append((BASE + path, lm, cf, pr))
    # blog posts — real post date (git), never faked fresh
    for f in sorted(glob.glob(os.path.join(HERE, "blog", "*.html"))):
        slug = os.path.splitext(os.path.basename(f))[0]
        urls.append((f"{BASE}/blog/{slug}", git_date(f"blog/{os.path.basename(f)}"), "monthly", "0.6"))

    # individual AI-stock landing pages
    for f in sorted(glob.glob(os.path.join(HERE, "stocks", "*.html"))):
        sym = os.path.splitext(os.path.basename(f))[0]
        urls.append((f"{BASE}/stocks/{sym}", git_date(f"stocks/{os.path.basename(f)}"), "weekly", "0.6"))

    # individual AI-ETF landing pages
    for f in sorted(glob.glob(os.path.join(HERE, "etfs", "*.html"))):
        sym = os.path.splitext(os.path.basename(f))[0]
        urls.append((f"{BASE}/etfs/{sym}", git_date(f"etfs/{os.path.basename(f)}"), "weekly", "0.5"))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lm, cf, pr in urls:
        lines.append(f'  <url><loc>{loc}</loc><lastmod>{lm}</lastmod>'
                     f'<changefreq>{cf}</changefreq><priority>{pr}</priority></url>')
    lines.append('</urlset>')
    open(os.path.join(HERE, "sitemap.xml"), "w").write("\n".join(lines) + "\n")
    print(f"sitemap.xml — {len(urls)} URLs (refreshed {TODAY})")


if __name__ == "__main__":
    main()
