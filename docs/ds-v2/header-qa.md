# Header QA — regression guard (P0, 2026-07-08)

The header must pass this matrix before ANY deploy that touches gen_nav.py,
shell.css, or tokens/fonts. History: two shipped header regressions were
invisible to page-overflow checks — always measure ELEMENT overlap.

## Matrix (run on /blog — the strictest standard page — flag OFF and ON)
Viewports: 1440 · 1280 · 1024 · 768 · 430 · 390 · 375
(390 is iPhone 12–15: a ≤389px breakpoint shipped an overflow. Phone-class
compaction starts at ≤479px — do not lower it.)

Per viewport, assert:
1. `.mn-lr b` renders on ONE line (height ≈ one line-height) — logo never splits.
2. No element overlap: last `.mn-item .mn-top` right edge < `.mn-right` left edge
   (desktop); `.mn-logo` right < `.mn-right` left (burger mode).
3. `document.documentElement.scrollWidth - innerWidth === 0`.
4. Burger hidden ≥1101px, visible ≤1100px; desktop nav the inverse.
5. Header height stays 57px with a mega menu open.
6. Drawer at 375: opens (scroll locked), closes (scroll restored), no overflow.
7. Terminal page separately (native theme pill + reload widen the right cluster).

## Harness
Serve the repo, open iframes at each width, run the audit() snippet in
git history (`_qa.html` in the header-p0-fix branch) or re-create: it reports
wordmarkLines / navRightOverlap / logoRightOverlap / pageOverflow per width.

## Flag rules
ds_v2 shell (shell.css) is a COLOR/TYPE skin only — it must never change
layout metrics. If flag-on metrics differ from flag-off, the skin has leaked
layout properties: fix shell.css, do not patch page CSS.
