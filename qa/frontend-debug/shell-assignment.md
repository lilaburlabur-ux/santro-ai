# Shell assignment (final)

| template group | count | target shell | width | mechanism |
|---|---|---|---|---|
| / | 1 | DsWideShell (marketing) | hero 1400 | index inline |
| /terminal | 1 | DsTerminalShell | own full-width grid (map+detail columns) | terminal inline — audit fallback measured one grid column; intentional |
| /stocks /crypto /etfs /bubble /news /research /ipos /share /quiz indexes | 9 | DsTerminalShell | main 1560 | site.css default |
| /stocks/[ticker] | 94 | Detail shell (hybrid) | main.tkp **1240** (was 820) | sweep + template |
| /etfs/[ticker] | 40 | Detail shell (hybrid) | main.etfp **1240** (was 820) | sweep + gen_etf_pages.js |
| /ipos/[slug] | 10 | Detail shell (hybrid) | **1240** (was 780) | sweep |
| /stocks/themes/[slug] | 7 | Detail shell (hybrid) | **1240** (was 900) | sweep |
| tracker pages (burry/aschenbrenner/burry) | 3 | Detail/article hybrid | inherit main 1560 w/ inner caps | unchanged (approved layout) |
| /blog /blog/[slug] /about /privacy /terms | 8 | DsArticleShell | 1080 (article body ~720–1040) | body.shell-article |
| /tools/[tool] /evaluate-prompt /quiz | 3 | DsToolShell | 1240 | body.shell-tool |
| auth (signin/signup/dashboard, noindexed) | — | DsAuthShell | 1240 tool shell | body.shell-tool |

Theme system: ONE global — window.SantroTheme (nav.js v5): sets data-theme +
persists + re-applies design flags in the same tick (light = legacy-light
instantly, dark = ds_v2 instantly). Terminal's native pill handler runs first
(chart repaint), then a delegated listener syncs flags on the same click.
