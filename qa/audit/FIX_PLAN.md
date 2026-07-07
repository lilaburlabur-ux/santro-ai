# FIX PLAN — hard audit 2026-07-08 (HEAD c3ea5e8 audited)

| pri | issue | affected | root cause | fix | risk |
|---|---|---|---|---|---|
| P0 | homepage console ReferenceError: loadData | / | orphan setInterval left from pre-split terminal code | remove orphan script block | none — dead code |
| P0 | mobile overflow 225px @375 | /stocks/qcom (1 of 350 loads) | TradingView embed fallback renders fixed 600px inner div | site.css containment: .tradingview-widget-container * max-width 100% (all embed pages inherit) | low |
| P1 | stale universe count "83 names" vs live 84 | /stocks ×2, /news ×1 | hardcoded count in copy while chip is live | remove numbers from static copy (drift-proof) | none |
| P1 | broken link /stocks/sndk | /ipos/sk-hynix-adr | SNDK never got a static page | link → /t?sym=SNDK dynamic ticker | none |
| P2 | 401 console noise (anon auth probe) | /, /terminal, /calculator | accounts backend returns 401 for anonymous /me | backend change (return 200 anon) — deferred, documented known-benign | n/a |
| P2 | transient 3rd-party 503 (qcom load) | random embeds | external CDN | containment shipped; nothing further actionable | n/a |

P0 fixed in this pass: 2/2 · P1 fixed: 2/2 · P2 deferred: 2 (documented).
