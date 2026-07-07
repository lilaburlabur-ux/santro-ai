# Rebuild plan — the 10 rules I must not break
(Phase 0 summary, written after reading all 8 research docs. If this conflicts
with marketing-research/, the documents win.)

1. **Show the market before asking anything.** The homepage opens with real
   delayed data (gauge, top-5 heat with sourced reasons, tape) — Finviz/CNN-F&G
   pattern. No questionnaire, no persona, no progress UI anywhere on `/`.
2. **Nothing gets deleted.** All 175 sitemap URLs keep answering 200 at the
   same address; before/after sitemap crawls prove it. /quiz survives as a
   gated instrument, never a redirect.
3. **The quiz is registered-only, reframed as calibration.** Anonymous /quiz =
   a professional gate ("Exposure Check", what it configures, one CTA).
   Questions render only for authenticated users; same calibration offered
   once post-signup, skippable. No personas, no emoji, no "what kind of
   trader are you."
4. **Show the headline, gate the depth; show the sample, gate the save.**
   Gating follows locked-data-strategy.md exactly, from ONE config
   (ds-v2/gates.js — static-site equivalent of src/config/gates.ts). No
   inline gating decisions in components.
5. **Blur real data only.** Locked rows keep real ticker symbols crawlable;
   values blur. Pipeline down = module hidden, never a blurred placeholder.
6. **One padlock, one copy map.** The single lock token everywhere; lock text
   only from locked-state-copy.md (imported as ds-v2/lock-copy.js). Never
   freestyle lock copy.
7. **Compliance constants from one module** (ds-v2/compliance.js): delayed
   ~15 min · not financial advice · hot means attention, not direction — on
   every data surface. Zero "Live"/real-time strings near market data;
   status badges say Beta/New.
8. **The modal never ambushes and never loses your place.** Signup only on
   user action; title mirrors intent; auth methods only if actually working
   (email+password IS live; Google isn't configured — so no Google button,
   and no magic links until email infra is verified); Esc costs nothing;
   after auth the exact element un-blurs in place.
9. **No dark patterns, no invented proof.** No entry/exit popups, countdowns,
   fake counts or testimonials. Until real numbers exist, proof = data +
   methodology + sources.
10. **SEO is load-bearing.** Ticker/theme/ETF/research pages stay open and
    crawlable; gate modules ON pages, never pages; metas terminal-first;
    canonicals intact.

## Documented static-site adaptations (approved-pattern-closest choices)
- `src/config/gates.ts` → `ds-v2/gates.js`; `src/lib/compliance.ts` →
  `ds-v2/compliance.js` (no bundler; classic scripts).
- "Server-rendered hero data": GitHub Pages can't template per-request; hero
  hydrates from the same delayed JSON feeds as the terminal (1 fetch), with
  honest static labels pre-hydration. Deviation logged.
- Auth: existing verified path is email+password (instant-access backend on
  Render). Google OAuth not configured ⇒ per registration-funnel hard rule 5
  (never show broken methods) the modal offers the working method only.
- Analytics events (`lock_click` etc.): no analytics backend exists;
  ds-v2/events.js queues to localStorage + console.debug. Deviation logged;
  backend endpoint is a follow-up.
