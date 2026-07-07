# Data pages audit

Verified on live production (desktop 1440 + mobile crawl):

- /stocks: bubble map renders (canvas), live count chip, honest delayed-data line, sector drill-down — main 1560px, 0 overflow
- /stocks/[ticker] ×94: one template; qcom overflow was the only failure of 350 loads (third-party embed fallback; containment shipped)
- /crypto: baskets + timestamp badge (fixed earlier — #asof dedup), 0 overflow
- /etfs + /etfs/[ticker] ×40: table + detail template, v13 css, 0 overflow
- /bubble: gauge + pillars + stress module; hurts/cushions derived; disclaimers inline + footer
- /terminal: tape, map, native theme pill flow intact (console clean except auth probe)
- heat colors from tokens under ds_v2 (remap verified: --accent #3BE08F on all templates)
- no real-time claims outside approved phrasing (content audit verdicts)
