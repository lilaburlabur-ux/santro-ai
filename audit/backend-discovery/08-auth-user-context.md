# 08 — Auth & user context

## How it works (verified in code + live probes)

- **Detection**: `accounts/api.js` `me()` on every accounts-enabled page (5 pages: index, terminal, quiz, t, tools/fair-value-calculator; plus signup/signin/dashboard via auth-pages.js). Anonymous → 401 (+ one silent `/auth/refresh` retry → second 401). These two 401s are the well-known console noise on every anonymous load.
- **Session transport**: httpOnly cookies on `api.santroai.tech` (first-party subdomain — no third-party-cookie problem), every request `credentials:"include"` (`api.js:78`). Silent refresh-and-retry on 401 (`api.js:91`).
- **Anonymous context**: random `santro_anon_id` in localStorage → `X-Santro-Anon` header → server-side metering (5 free calculator runs). Backend validates shape (`usage.py:38-48`).
- **Protected actions**: backend `require_user` (401); UI side — lock modal via `[data-lock]` click (locks.js), or `openAuth()` when clicking Pin/save while anon, or 402 payload from `/usage/run` → register gate.
- **Auth-state broadcasting**: accounts.js renders `#sa-acct` chip; locks.js and quiz.html *sniff the DOM* for it (interval/MutationObserver). Works; fragile by design.
- **Capability discovery**: `/auth/methods` (live 200 ✓) so Google/magic-link/reset UI renders only if the backend can fulfil it. This is why there is no broken Google button.

## The six questions

1. **Can anonymous users customize the terminal?**
   No, and they correctly can't reach the UIs: /dashboard hard-redirects (live-verified → `/signin?next=/dashboard`), /quiz shows the gate with zero question DOM (live-verified). What anon users DO get is the *promise* of customization in quiz-gate copy and homepage cards.

2. **Can registered users save terminal settings?**
   Yes — genuinely. PATCH /account/preferences persists (16/16 backend tests). The settings then have **zero effect** anywhere. Saving works; the product lies about what saving means ("Choose what shows up… Saved to your account").

3. **Anonymous user clicks a locked action?**
   Homepage: blur + `[data-lock]` → modal "Unlock the full table" with /signup + /signin CTAs (live-verified this audit). Calculator out-of-runs: 402 → "Create free account" gate (code-verified). Pin/save while anon: auth modal opens (`togglePin`: `if (!user) { openAuth("home") }`).

4. **Does signup return the user to the same action?**
   **Broken half-way.** locks.js stores `santro_return` (path#element) before opening the modal — but the modal links to plain `/signup` with **no `next` param**, and `renderSignup` ends with a hard `location.href = "/dashboard"` (`auth-pages.js:89`). So: lock click → signup → **user lands on /dashboard**, not back at the locked table. The `santro_return` scroll-back only fires if the user manually navigates back to the original page while authed (locks.js:47-58). `?next=` is honored by /signin only (`auth-pages.js:103`).

5. **Does the backend distinguish anonymous vs registered?**
   Yes, three-tier: authenticated user (cookie) / anonymous-with-id (X-Santro-Anon) / bare IP fallback — `usage.py:_resolve`. Metering limits differ by tier. Data endpoints are strictly `require_user`.

6. **Are broken buttons hidden because auth state is wrong?**
   Mostly no — but two real cases:
   - **☆ Pin is not rendered at all for anon** (`accounts.js:292`) instead of rendering locked→modal. Combined with the watchlist modal's "Open a stock and tap Pin" empty-state, users are told to find a button that doesn't exist for them. This is the closest thing in the product to the reported "there is no visible add-[s]ticker button anywhere".
   - **Mobile bar hides signed-out auth buttons ≤760px** (gen_nav.py:211) *by design* — the drawer carries "Create free account"+"Sign in" (live-verified visible). Not a bug, but worth knowing when testing on a phone.

## Post-login preference loading

After login, nothing loads preferences except the /dashboard form itself. No page applies them. `unlockAll()` (locks.js) un-blurs locked content in place when `#sa-acct` appears — that part works.
