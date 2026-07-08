# 00 — Implementation start state

Date: 2026-07-08 · branch main · frontend `lilaburlabur-ux/santro-ai` @ `8ff10a2` (fresh sync of production HEAD; working tree clean) · backend `lilaburlabur-ux/santro-accounts` @ `c58abf9` (in sync with origin; **not modified this pass**).

Preconditions verified:
- audit/backend-discovery/ exists (16 files) incl. SECOND_OPINION_PACKAGE.md and DIAGNOSIS.md.
- package.json = dev tooling (playwright/stylelint); deps installed in this clone.
- No secrets printed; backend env values remain on Render only.

Second-opinion conclusion being implemented: backend healthy → build the missing frontend read/apply path. Scope: copy truth pass; `accounts/prefs.js` consumer; /terminal wiring (section markers, watchlist strip, Customize); visible Add-ticker/Pin; dashboard effect + honest labels; quiz → PATCH /account/preferences; signup return-context; retire the phantom `/valuation/run` reference; E2E + gates.

Out of scope (unchanged): stickers/widgets (not a feature), backend schema, Pro tier, iOS.

Planned section mapping on /terminal (`data-pref-section` → backend field):
| marker | element | pref |
|---|---|---|
| stocks | `.area-heat` bubble map | show_stocks |
| news | `.area-news` | show_news |
| research | `.area-takeaways` | show_research |
| bubble_risk | `#brief` (AI trade in 60 seconds) | show_bubble_risk |
| calculator | detail-panel calc render guard | show_fair_value_calculator |
| watchlist | NEW `#wl-strip` | show_watchlist |

`show_crypto` / `show_etfs` have no terminal section today → dashboard labels them "not on the terminal yet" (kept as valid saved fields; quiz maps universe picks additively). Baseline live behavior (from discovery audit): /terminal makes zero preference/watchlist reads; ☆ Pin hidden for anon; signup strands users on /dashboard; quiz saves to orphaned localStorage.
