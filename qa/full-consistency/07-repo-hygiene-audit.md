# Repo hygiene audit — reference-graph classification

Method: full-corpus reference scan (all HTML/PY/JS/workflows/package.json +
manifest.json verified separately). Nothing deleted without a zero-reference proof.

| file | type | imported | route | sitemap | build-needed | verdict | reason |
|---|---|---|---|---|---|---|---|
| quiz.js | legacy quiz engine | NO (0 pages after rebuild) | no | no | no | SAFE_TO_DELETE | superseded by gated Exposure Check; git history preserves it |
| _sweep.py | one-shot sweep script | no | no | no | no | SAFE_TO_DELETE | 2026-07-01 positioning sweep, superseded by generators |
| assets/santro-mascot-day.png / -night.png | legacy footer/about mascot | NO (0 refs) | no | no | no | SAFE_TO_DELETE | mascot UI removed in prior redesigns |
| assets/icon-192/512/maskable-512.png | PWA icons | manifest.json ✓ | — | — | YES | KEEP | PWA installability |
| gen_etf_pages.js | ETF page generator | run manually | — | — | YES | KEEP | regenerates 40 ETF pages; pinned to current css/widths |
| IOS_PLAN.md / README.md / docs/** | documentation | — | — | — | — | KEEP | project docs |
| ds-v2/gallery.html | internal QA page | linked from nothing; noindexed | yes (unlisted) | no | — | KEEP | primitives QA surface; allowed per design-lab exception |
| marketing-research/** | rebuild contract + research | docs | no | no | — | KEEP | the documents win; contract requires them in-repo |
| qa/** artifacts | audit evidence | — | no | no | — | KEEP | requested evidence trail |
| blog/it-is-fine-meme.jpg, blog/spacex-cover.jpg | article images | blog articles ✓ | — | — | — | KEEP | referenced by articles |
| takeaways/, research/, hot-tickers/SPEC.md | data + methodology | pipelines ✓ | — | — | YES | KEEP | bot inputs/outputs |

REVIEW_REQUIRED: none — every candidate resolved to a proof.
