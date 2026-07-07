# Santro Registration Funnel

Design law: **value before identity, and never lose the user's place.** (Benchmarks: Earnings Whispers' modal promises the exact page you're on; Portfolio Visualizer's run-then-save; Wallmine as the anti-pattern.)

## Funnel diagram

```
   Homepage
      │  sees Bubble Index + top-5 heat + map (no gate)
      ▼
   Explores ── ticker page / terminal / stress sample ── (all free)
      │
      │ clicks a LOCK (row 6+, scenario 2+, full note, track, alert, export)
      ▼
 ┌─ Signup modal (compact, contextual) ───────────────┐
 │  Title mirrors intent: "Unlock the full table"     │
 │  [Continue with Google]  [Continue with email*]    │
 │  *hidden if email backend not live — no broken     │
 │   magic links, ever                                │
 │  "No card. No spam."                               │
 └──────────────┬─────────────────────────────────────┘
                │ auth success (same tab, <10 s)
                ▼
   RETURN TO CONTEXT: the exact row/scenario/note un-blurs
   in place (200 ms fade). No redirect to a dashboard.
                │
                ▼
   Activation nudge strip (dismissible, shown once):
   ① Save your first watchlist ticker
   ② Run a stress test on your portfolio
   ③ Set one alert
   (+ optional: "Calibrate your terminal" — the reframed
    4-step exposure check, skippable, no personas)
                │
                ▼
   Retention: alert emails → daily brief (opt-in, when live)
   → iOS waitlist (optional) → Pro (later, honest)
```

## Page states

| State | Anonymous | Registered |
|---|---|---|
| Homepage hero table | 5 rows + blurred rows w/ padlock | 10 rows + "open terminal" |
| Terminal | full map, tables capped, SAMPLE note | full tables, notes, saved layout |
| Ticker page | data + first-line reason + locked modules | full modules, track/alert buttons live |
| Stress tool | presets, scenario 1 | custom input, 6 scenarios, save |
| Research | all readable; bookmark locked | bookmarks, filing alerts |
| Nav | `Sign in` + `Create free account` | avatar menu + watchlist counter |

## Modal spec

- Triggered ONLY by user action on a locked element or the nav button. Never on load, never on scroll, never on exit.
- Compact: ~360 px, dark ds_v2 surface, one padlock icon, no illustration.
- Title mirrors the clicked intent (six variants: full table / full note / stress breakdown / watchlist / alert / export).
- Auth: Google OAuth first-class. Email+password or magic link ONLY if backend verified in prod — a dead magic link is a brand funeral in fintech.
- Copy block: "Free account. Full tables, watchlists, alerts, saved stress tests. Quotes stay delayed ~15 min — real-time is planned for Pro." (Repeat of the honest claim = trust.)
- Below buttons: Terms/Privacy links. No newsletter pre-checked box (opt-in only).
- Esc/backdrop click closes it and restores scroll position — a closed modal must cost the user nothing.

## Post-signup screen (first session)

Not a welcome tour. The unlocked context + one strip:

> **You're in. Three things worth doing:**
> ① `Track a ticker` — start your watchlist (30 slots)
> ② `Run your stress test` — your portfolio, six scenarios
> ③ `Set an alert` — heat or price level
> `Calibrate your terminal` (optional, 60 seconds) — sets your default view. Skip anytime.

Checklist state persists in the account menu until 3/3 or dismissed. No streaks, no badges, no confetti.

## Activation checklist (team-facing metrics)

- A0: signup completed from a lock click (target: >60% of signups come from locks, not nav — proves the gating works).
- A1: first watchlist save < 24 h.
- A2: first stress test on custom portfolio < 72 h.
- A3: first alert set < 7 d.
- A4: return visit on day 2–4 (index habit forming).
- Guardrails to watch: anonymous bounce on hero table, lock-click → modal-close rate (>70% close = locks feel cheap; loosen), SEO traffic to ticker pages (must not fall after gating ships).

## Hard rules

1. Signup never required to see the homepage's headline data.
2. Context is never lost: deep-link back to the exact element after OAuth round-trip (store `returnTo` + element id).
3. No fake Pro claims anywhere; Pro appears only when purchasable.
4. iOS waitlist stays optional, one field, clearly "waitlist."
5. If email infra isn't live, the modal shows Google only + "Email sign-in coming soon" — stated, not broken.
