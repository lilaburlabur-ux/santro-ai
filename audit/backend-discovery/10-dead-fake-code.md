# 10 — Dead / fake / prototype code

Severity: **P0** = user-facing broken/fake feature · **P1** = backend/frontend disconnected · **P2** = cleanup.

| File:line | Phrase / finding | Why it matters | Severity | Action |
|---|---|---|---|---|
| quiz.html:415-424 | "the output is a configured terminal snapshot… **preset dashboard** … **suggested watchlist you can edit** … **Default risk view**" | Sells a personalization engine that does not exist. This copy is the strongest fake-feature in the product — shown to every anonymous visitor as the signup pitch. | **P0** | Rewrite copy to what ships, or build the engine (REBUILD_PLAN) |
| accounts/auth-pages.js:184-186 | "Customize your terminal — Choose what shows up… **Saved to your account.**" + 8 toggles + view/theme/tickers/sectors | Entire panel is write-only. "Preferences saved." confirms a no-op. Registered users can prove the product ignores them. | **P0** | Wire terminal read-path or remove panel until it works |
| index.html:1086 | "Free account: full tables, watchlists, alerts, **saved stress tests**." | Saved stress tests have no model, no endpoint, no UI — pure fiction. | **P0** | Remove from copy (or scope into rebuild) |
| index.html:1051 | "Watchlist — Save up to 30 tickers. **Your list opens with the terminal, sorted by heat.**" | Terminal never loads the watchlist; no 30 cap; no heat sort. Three false claims in one card. | **P0** | Fix copy now; build terminal watchlist module in rebuild |
| quiz.html:491 | `localStorage.setItem("santro_calibration", …)` | Orphaned write — zero readers repo-wide. The "Save calibration" button's entire effect. | **P0/P1** | Map picks → PATCH /account/preferences |
| accounts/auth-pages.js:136-138 | `// localStorage only for now; TODO(v2): persist to the account…` + reads `santro_quiz` | Dead key: only the deleted old quiz ever wrote it. Profile chip permanently shows the take-the-quiz CTA even after completing the Exposure Check (also links to a quiz that no longer produces a "profile"). | **P1** | Delete chip or point it at calibration/preferences |
| accounts/api.js:58,276 + config.js:33 | `valuationRun: "/valuation/run"` / `RealValuation.run()` / `valuationProvider:"mock"` | Frontend references a backend endpoint that **does not exist**; prod pinned to "mock" provider forever. (Math itself is real client-side DCF/PE/Graham/PEG — not fake numbers, just never server-side.) | **P1** | Either ship the endpoint or delete RealValuation + config comment |
| ds-v2/gates.js:9,14 + lock-copy.js:15 | `map_save_view:"free"`, `watchlist:"free"`, `save_view:"Sign in to save this view."` | Gating/config/copy for features with no UI: "save this view" appears in zero pages; watchlist/alerts gate entries have no locked placeholder anywhere. Dead config that suggests missing intended features. | **P1** | Build or prune |
| ds-v2/events.js:3-12 | "Swap the sink for a backend endpoint later" — localStorage queue only | All funnel analytics (lock_click, modal_open, calibration_completed…) go nowhere. The owner is flying blind on the exact flows this audit covers. | **P1** | Add a tiny collector endpoint or accept blindness knowingly |
| accounts/accounts.js:292 | `user ? '<button class="sa-pin">☆ Pin</button>' : ""` | For anon: feature invisible rather than locked — contradicts the lock-modal design language used everywhere else, and the watchlist empty-state tells users to find this button. | **P1** | Render locked pin → openAuth |
| accounts/api.js:137-194 | `Mock` in-memory backend | Dev/demo fixture, correctly inert in prod (`apiMode:"live"`). Harmless but 60 lines of shippable-looking code a reviewer must rule out. | **P2** | Keep (documented) or split into api.mock.js |
| ~santro-accounts models.py:211 | Alert docstring: "evaluation currently happens client-side (no email provider yet)" | Slightly stale — server evaluator exists (services/alert_evaluator.py); push blocked on Apple enrollment, email on Brevo key. Copy in watchlist modal is honest ("checked while this site is open"). | **P2** | Update docstring |
| /auth/resend-verification, PATCH+GET /valuations/{id}, /devices, /notifications, /auth/token* | endpoints with zero web callers | Not dead — mobile-planned / flow-reserve — but a reviewer must know they're intentionally idle. | P2 | Keep; documented in 05 |
| Anonymous 401 pair (/account/me, /auth/refresh) on every page load | console noise | Known deferred P2; makes real errors harder to spot. | P2 | Backend 200-anon variant for /me |
| index.html:1053 etc. | "Email brief — coming soon", "iOS app — coming soon", "Santro Pro — coming soon" | Honest, clearly labeled — **not** counted as fake. | — | none |

## Search-term sweep notes

- `TODO/FIXME`: 1 product-level TODO (auth-pages.js:137). Repo is otherwise clean of TODOs in first-party code.
- `mock/demo/placeholder/stub`: all hits are the documented api.js Mock + valuationProvider pair, plus HTML input `placeholder=` attributes (cosmetic).
- `not implemented / throw new Error / alert(`: one legit `alert("Pick one option in each step.")` in quiz.html (crude but functional); no not-implemented throws.
- `console.log`: debug-level only in events.js (`console.debug`, intentional).
- `feature flag`: ds-v2/flags.js is visual-only; no feature is flag-hidden.
- `design-lab / prototype / canary`: zero hits in the production repo.
