# FINAL REPORT — theme + width frontend debug
repo lilaburlabur-ux/santro-ai · audited from ca2c970 · live https://santroai.tech

| metric | BEFORE (frozen first) | AFTER (deployed) |
|---|---|---|
| sitemap URLs tested | 175 | 175 (identical method) |
| theme toggle failures | **175/175** (attr flipped, visuals didn't) | **0** |
| width failures (narrow terminal mains @1920) | **155** | **4** — /terminal (audit fallback measured one column of its intentional two-column grid) + 3 tracker pages (approved detail/article hybrid) |
| mobile overflow failures (350 loads @390+375) | 0 | 0 |
| mobile console-error pages | 26 | 3 (known-benign anonymous-auth 401 probes) |

Root causes, both architectural:
1. THEME: ds-v2/remap.css pins dark tokens at html.ds-v2, outranking legacy
   html[data-theme="light"] overrides — toggle changed the attribute, pixels
   held until a reload re-evaluated the flag. Fix: window.SantroTheme
   (nav.js v5) re-applies design flags in the same tick on every change
   (light = legacy-light instantly, dark = ds_v2 instantly); the terminal's
   native pill (chart repaint) is synced by a delegated listener.
2. WIDTH: 151 generated detail pages (main.tkp / main.etfp) carried
   article-width caps (780/820/900px). All widened to the 1240px detail
   shell; gen_etf_pages.js pinned so regeneration cannot regress.

Artifacts: BEFORE_STATE.md · theme-toggle-audit-after.{md,json} ·
width-shell-audit{,-after}.json · mobile-audit-before.json ·
shell-assignment.md · route-template-inventory.* · route-count.md.
Gates at ship: stylelint / audit:colors / qa_stress 43-43 / seo_audit green.
Live production re-verified after deploy (theme 0 fails, width 4 explained,
mobile 0 overflow).
