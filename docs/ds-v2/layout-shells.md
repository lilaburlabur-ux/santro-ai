# Layout shells — width by page type (2026-07-08)

Article width is for articles only. One global max-width caused the
"cut in half" desktop: site.css had `main{max-width:1080px}` for EVERY page.

| Shell | Width | How | Routes |
|---|---|---|---|
| App (header/footer/mega panels) | 1680px, pad clamp(16px,2vw,40px) | gen_nav/gen_footer | all pages |
| Terminal/data (DEFAULT) | 1560px | site.css `main` | /stocks /crypto /etfs /bubble /share /news /research /ipos, t/e/c/ipo, all generated ticker/etf/theme/ipo pages |
| Marketing/landing | 1400px | index inline `.land-hero`; `body.shell-marketing` | / hero (index has its own layout) |
| Tool | 1240px | `body.shell-tool` | /tools/*, /evaluate-prompt, /quiz, auth pages |
| Article/editorial | 1080px (article body ~720-1040 inner) | `body.shell-article` | /blog, /blog/*, /about, /privacy, /terms |

Nav collapse ladder (gen_nav renders BOTH the collapsible groups and a
synthesized More; CSS switches): >=1366 shows all six groups, More hidden ·
1024-1365 hides Market Maps + Company, shows More · <1024 burger drawer
(all six sections + search + theme). Never re-add a fixed 1280 header cap.
Body classes are applied per page file — new generated pages default to the
terminal shell, which is correct for data pages.
