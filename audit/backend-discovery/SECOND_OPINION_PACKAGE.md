# Santro AI — Second-opinion code package

Purpose: let an independent reviewer (ChatGPT) verify the diagnosis in DIAGNOSIS.md
without repo access. All code below is **verbatim** from:

- Frontend `lilaburlabur-ux/santro-ai` @ `577a901` (production HEAD, GitHub Pages → santroai.tech)
- Backend `lilaburlabur-ux/santro-accounts` @ `c58abf9` (in sync with origin/main, Render → api.santroai.tech)

No secrets: the frontend "config" is public by design; backend env values live only on
Render and are not included. Assembled mechanically (cat/sed) on 2026-07-08 — no hand edits.

**The diagnosis to check (one sentence):** the backend is real and healthy; the frontend
saves user choices into it correctly; and then no page — above all /terminal — ever reads
those choices back, while shipped copy promises in four places that it does.

---

# PART 1 — The 8 must-share files

## File 1 — `santro-ai/accounts/auth-pages.js (FULL FILE, 235 lines)`

**Why it matters:** renders /signup, /signin and /dashboard — including the
"Customize your terminal" preferences panel (the primary customization UI).
**Claims it supports:** (a) preferences form PATCHes the real API and reports
"Preferences saved." — a true statement with no product effect; (b) signup ends in a
hard redirect to /dashboard, dropping lock return-context (`?next` handled on signin only);
(c) the dashboard profile chip reads the DEAD localStorage key `santro_quiz`
(only the deleted old quiz ever wrote it) — see the `TODO(v2)` comment.
**Reviewer should verify:** find `renderDashboard` → `savePrefs` (writes, never applies);
`renderSignup` → `location.href = "/dashboard"`; `santro_quiz` read; confirm nothing here
or elsewhere pushes preferences into any market page.

```javascript
/* Santro Accounts — dedicated /signup, /signin and /dashboard pages.
   Separate from the in-terminal modal (accounts.js): these are full pages so
   "sign up" (create) and "sign in" (existing) can never be confused, and so we
   can collect a profile at signup and edit profile + terminal preferences after.
   Reuses window.SantroAPI (api.js) + the site's design tokens / sa-* styles. */
(function () {
  "use strict";
  const API = window.SantroAPI;
  const page = document.body.getAttribute("data-auth-page");
  const root = document.getElementById("auth-root");
  if (!API || !root) return;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const node = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const msg = (txt, kind) => `<div class="sa-msg ${kind}">${esc(txt)}</div>`;
  const qs = (k) => { try { return new URLSearchParams(location.search).get(k); } catch (_) { return null; } };
  const safeNext = (n) => (n && /^\/[A-Za-z0-9/_-]*$/.test(n) ? n : null); // same-site path only

  // ── controlled vocabularies (must mirror the backend Literal enums) ───────
  const PROF = [["individual_trader", "Individual trader"], ["investor", "Investor"],
    ["finance_professional", "Finance professional"], ["founder_operator", "Founder / operator"],
    ["student_researcher", "Student / researcher"], ["developer_data", "Developer / data"],
    ["curious_observer", "Curious observer"], ["other", "Other"]];
  const EXP = [["beginner", "Beginner"], ["intermediate", "Intermediate"],
    ["advanced", "Advanced"], ["professional", "Professional"]];
  const INTEREST = [["ai_stocks", "AI stocks"], ["ai_crypto", "AI crypto"], ["ai_etfs", "AI ETFs"],
    ["all", "All markets"], ["valuation_tools", "Valuation tools"], ["research_articles", "Research & articles"]];
  const VIEW = [["all", "Everything"], ["stocks", "Stocks"], ["crypto", "Crypto"], ["etfs", "ETFs"],
    ["news", "News"], ["research", "Research"], ["bubble", "Bubble risk"], ["calculator", "Calculator"],
    ["watchlist", "Watchlist"]];
  const THEME = [["system", "Match system"], ["light", "Light"], ["dark", "Dark"]];
  const TOGGLES = [["show_stocks", "Stocks"], ["show_crypto", "Crypto"], ["show_etfs", "ETFs"],
    ["show_news", "News"], ["show_research", "Research"], ["show_bubble_risk", "Bubble-risk index"],
    ["show_fair_value_calculator", "Fair-value calculator"], ["show_watchlist", "Watchlist"]];

  const options = (pairs, sel, placeholder) =>
    (placeholder ? `<option value="">${esc(placeholder)}</option>` : "") +
    pairs.map(([v, l]) => `<option value="${v}"${v === sel ? " selected" : ""}>${esc(l)}</option>`).join("");
  const select = (id, pairs, sel, placeholder) =>
    `<select class="sa-input" id="${id}">${options(pairs, sel, placeholder)}</select>`;
  const busy = (form, on) => form.querySelectorAll("input,button,select").forEach((el) => { el.disabled = on; });

  // ── /signup ───────────────────────────────────────────────────────────────
  function renderSignup() {
    const w = node(`<div class="auth-card">
      <h1>Create your account</h1>
      <p class="auth-sub">Unlimited valuations, a saved watchlist, and your own terminal. No spam.</p>
      <div id="err"></div>
      <div class="auth-grid2">
        <div class="sa-field"><label>First name</label><input class="sa-input" id="fn" autocomplete="given-name"></div>
        <div class="sa-field"><label>Last name</label><input class="sa-input" id="ln" autocomplete="family-name"></div>
      </div>
      <div class="sa-field"><label>Email</label><input class="sa-input" id="em" type="email" autocomplete="email" placeholder="you@example.com"></div>
      <div class="sa-field"><label>Password</label><input class="sa-input" id="pw" type="password" autocomplete="new-password" placeholder="At least 8 characters, with a letter and a number"></div>
      <div class="auth-grid2">
        <div class="sa-field"><label>I am a…</label>${select("ps", PROF, "", "Select (optional)")}</div>
        <div class="sa-field"><label>Trading experience</label>${select("te", EXP, "", "Select (optional)")}</div>
      </div>
      <div class="sa-field"><label>Main market interest</label>${select("mi", INTEREST, "", "Select (optional)")}</div>
      <label class="sa-consent"><input type="checkbox" id="cons"> I agree to the <a href="/terms" target="_blank" rel="noopener">Terms</a> and <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</label>
      <button class="sa-btn primary" id="go">Sign up</button>
      <p class="auth-alt">Already have an account? <a href="/signin">Sign in</a></p>
    </div>`);
    const val = (id) => w.querySelector("#" + id).value.trim();
    w.querySelector("#go").onclick = async () => {
      const err = w.querySelector("#err");
      const email = val("em"), password = w.querySelector("#pw").value, consent = w.querySelector("#cons").checked;
      if (!email) { err.innerHTML = msg("Please enter your email.", "err"); return; }
      if (password.length < 8) { err.innerHTML = msg("Password must be at least 8 characters.", "err"); return; }
      if (!consent) { err.innerHTML = msg("Please accept the Terms and Privacy Policy.", "err"); return; }
      const body = { email, password, consent };
      if (val("fn")) body.first_name = val("fn");
      if (val("ln")) body.last_name = val("ln");
      if (val("ps")) body.professional_status = val("ps");
      if (val("te")) body.trading_experience = val("te");
      if (val("mi")) body.main_market_interest = val("mi");
      busy(w, true);
      try {
        await API.register(body);
        try {
          await API.login({ email, password });   // instant access — straight in
        } catch (e) {
          if (e && e.status === 401) {
            err.innerHTML = `<div class="sa-msg err">An account with this email already exists, and this password doesn't match it. <a href="/signin">Sign in instead</a> — or use a different email.</div>`;
            busy(w, false); return;
          }
          throw e;
        }
        location.href = "/dashboard";
      } catch (e) {
        err.innerHTML = msg(e.detail || "Couldn't create the account. Try a different email.", "err");
        busy(w, false);
      }
    };
    root.appendChild(w);
  }

  // ── /signin ───────────────────────────────────────────────────────────────
  async function renderSignin() {
    let m = { email_password: true, google: false, magic_link: false, password_reset: false };
    try { const r = await API.methods(); if (r && typeof r === "object") m = r; } catch (_) {}
    const next = safeNext(qs("next"));
    const dest = next || "/dashboard";
    const google = m.google
      ? `<a class="sa-btn google" id="g" href="${API.googleLoginUrl && API.googleLoginUrl()}">Continue with Google</a>` : "";
    const forgot = m.password_reset ? `<a class="sa-link" href="/signin?reset=1">Forgot password?</a>` : "";
    const w = node(`<div class="auth-card">
      <h1>Sign in</h1>
      <p class="auth-sub">Welcome back. Use your email and password.</p>
      <div id="err"></div>
      ${google}${google ? '<div class="sa-or">or</div>' : ""}
      <div class="sa-field"><label>Email</label><input class="sa-input" id="em" type="email" autocomplete="email"></div>
      <div class="sa-field"><label>Password</label><input class="sa-input" id="pw" type="password" autocomplete="current-password"></div>
      <button class="sa-btn primary" id="go">Sign in</button>
      <div class="sa-row" style="margin-top:12px">${forgot || "<span></span>"}</div>
      <p class="auth-alt">New to Santro AI? <a href="/signup">Create an account</a></p>
    </div>`);
    w.querySelector("#go").onclick = async () => {
      const err = w.querySelector("#err");
      const email = w.querySelector("#em").value.trim(), password = w.querySelector("#pw").value;
      if (!email || !password) { err.innerHTML = msg("Enter your email and password.", "err"); return; }
      busy(w, true);
      try { await API.login({ email, password }); location.href = dest; }
      catch (e) {
        const txt = e.status === 403 ? (e.detail || "This account can't sign in.") : "Invalid email or password.";
        err.innerHTML = msg(txt, "err"); busy(w, false);
      }
    };
    root.appendChild(w);
  }

  // ── /dashboard ──────────────────────────────────────────────────────────────
  async function renderDashboard() {
    let user = null;
    try { user = await API.me(); } catch (_) { user = null; }
    // Santro market profile from the /quiz check (localStorage only for now;
    // TODO(v2): persist to the account once a profile endpoint exists)
    let quizProfile = null;
    try { quizProfile = JSON.parse(localStorage.getItem("santro_quiz") || "null"); } catch (_) {}
    if (!user) { location.href = "/signin?next=/dashboard"; return; }
    let prefs = {};
    try { prefs = (await API.getPreferences()) || {}; } catch (_) { prefs = {}; }

    const fn = (user.first_name || "").trim();
    const greeting = fn ? `Hello, ${esc(fn)}.` : "Welcome back.";
    const name = (user.display_name || fn || user.email || "").trim();

    const toggleRow = ([k, label]) =>
      `<label class="dash-toggle"><input type="checkbox" data-pref="${k}"${prefs[k] !== false ? " checked" : ""}> ${esc(label)}</label>`;

    const w = node(`<div class="dash">
      <header class="dash-head">
        <div>
          <h1>${greeting}</h1>
          ${quizProfile && quizProfile.name ? `<p style="margin:4px 0 0;font-size:13px;color:var(--muted,#9aa6b2)">Your Santro market profile:
            <b style="color:var(--accent-2,#7cb0f5)">${esc(quizProfile.name)}</b>
            · bubble-risk sensitivity ${Number(quizProfile.sens) || "—"}/100
            · <a href="/quiz" style="color:var(--accent-2,#7cb0f5)">retake</a></p>` : `<p style="margin:4px 0 0;font-size:13px;color:var(--muted,#9aa6b2)"><a href="/quiz" style="color:var(--accent-2,#7cb0f5)">Take the 60-second AI bubble check</a> to get your market profile.</p>`}
          <p class="auth-sub">${esc(name)} · <span class="dash-mail">${esc(user.email)}</span></p>
        </div>
        <div class="dash-actions">
          <a class="sa-btn" href="/terminal" style="width:auto">← Back to terminal</a>
          <button class="sa-btn" id="logout" style="width:auto">Log out</button>
        </div>
      </header>

      <section class="dash-card">
        <h2>Your profile</h2>
        <div id="perr"></div>
        <div class="auth-grid2">
          <div class="sa-field"><label>First name</label><input class="sa-input" id="fn" value="${esc(user.first_name || "")}"></div>
          <div class="sa-field"><label>Last name</label><input class="sa-input" id="ln" value="${esc(user.last_name || "")}"></div>
        </div>
        <div class="sa-field"><label>Display name (what we greet you by)</label><input class="sa-input" id="dn" value="${esc(user.display_name || "")}"></div>
        <div class="auth-grid2">
          <div class="sa-field"><label>I am a…</label>${select("ps", PROF, user.professional_status || "", "Select")}</div>
          <div class="sa-field"><label>Trading experience</label>${select("te", EXP, user.trading_experience || "", "Select")}</div>
        </div>
        <div class="sa-field"><label>Main market interest</label>${select("mi", INTEREST, user.main_market_interest || "", "Select")}</div>
        <button class="sa-btn primary" id="saveProfile" style="width:auto">Save profile</button>
      </section>

      <section class="dash-card">
        <h2>Customize your terminal</h2>
        <p class="auth-sub">Choose what shows up, your default view and theme. Saved to your account.</p>
        <div id="prerr"></div>
        <div class="dash-toggles">${TOGGLES.map(toggleRow).join("")}</div>
        <div class="auth-grid2" style="margin-top:14px">
          <div class="sa-field"><label>Default terminal view</label>${select("dview", VIEW, prefs.default_terminal_view || "all")}</div>
          <div class="sa-field"><label>Theme</label>${select("theme", THEME, prefs.theme || "system")}</div>
        </div>
        <div class="sa-field"><label>Preferred tickers (comma-separated)</label><input class="sa-input" id="ptk" value="${esc((prefs.preferred_tickers || []).join(", "))}" placeholder="NVDA, MU, ASML"></div>
        <div class="sa-field"><label>Preferred sectors (comma-separated)</label><input class="sa-input" id="psec" value="${esc((prefs.preferred_sectors || []).join(", "))}" placeholder="semis, cloud, robotics"></div>
        <button class="sa-btn primary" id="savePrefs" style="width:auto">Save preferences</button>
      </section>
    </div>`);

    w.querySelector("#logout").onclick = async () => { try { await API.logout(); } catch (_) {} location.href = "/"; };

    const val = (id) => w.querySelector("#" + id).value.trim();
    w.querySelector("#saveProfile").onclick = async () => {
      const perr = w.querySelector("#perr");
      const body = {
        first_name: val("fn") || null, last_name: val("ln") || null, display_name: val("dn") || null,
        professional_status: val("ps") || null, trading_experience: val("te") || null,
        main_market_interest: val("mi") || null,
      };
      try {
        const u = await API.updateProfile(body);
        const nf = (u.first_name || "").trim();
        w.querySelector("h1").textContent = nf ? `Hello, ${nf}.` : "Welcome back.";
        perr.innerHTML = msg("Profile saved.", "ok");
      } catch (e) { perr.innerHTML = msg(e.detail || "Couldn't save your profile.", "err"); }
    };

    const toList = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
    w.querySelector("#savePrefs").onclick = async () => {
      const prerr = w.querySelector("#prerr");
      const body = {};
      w.querySelectorAll("[data-pref]").forEach((el) => { body[el.getAttribute("data-pref")] = el.checked; });
      body.default_terminal_view = val("dview");
      body.theme = val("theme");
      body.preferred_tickers = toList(val("ptk")).map((t) => t.toUpperCase());
      body.preferred_sectors = toList(val("psec"));
      try { await API.updatePreferences(body); prerr.innerHTML = msg("Preferences saved.", "ok"); }
      catch (e) { prerr.innerHTML = msg(e.detail || "Couldn't save your preferences.", "err"); }
    };

    root.appendChild(w);
  }

  if (page === "signup") renderSignup();
  else if (page === "signin") renderSignin();
  else if (page === "dashboard") renderDashboard();
})();
```

---

## File 2 — `santro-ai/accounts/accounts.js (FULL FILE, 670 lines)`

**Why it matters:** the core account UI module — header auth slot, account menu, auth
modals, the fair-value calculator card, the ☆ Pin button, and the watchlist/alerts/
valuations modals.
**Claims it supports:** (a) ☆ Pin renders ONLY when `user` is truthy (anon gets nothing,
not even a locked button) — see the calculator template (`pinBtn`); (b) the watchlist
modal has NO add-ticker input — `renderWatchlist` lists/unpins only, and its empty state
says "Open a stock and tap Pin"; (c) watchlist/alerts/valuations round-trips are real
(togglePin/reflectPin/loadSaved call the live API).
**Reviewer should verify:** `pinBtn = user ? ... : ""`; absence of any input field in
`renderWatchlist`; that nothing in this file renders anything ON the terminal layout
itself (it only mounts into the calculator card + modals).

```javascript
/* Santro Accounts — UI controllers. Reflects backend state; never owns auth or
   metering logic. Exposes window.SantroCalc.render(t) for the detail card. */
(function () {
  "use strict";
  const API = window.SantroAPI;
  if (!API) { console.warn("SantroAPI missing — load api.js first"); return; }

  let user = null;            // current account (from /me) or null
  let ctx = null;            // last selected stock {ticker,company,price,pe}
  let usage = null;          // cached /usage/status
  // Which auth methods this deployment can actually offer (from /auth/methods).
  // Default: email+password only — the one path that always works — so the UI
  // never shows a Google/magic/reset button that would dead-end.
  let authMethods = { email_password: true, google: false, magic_link: false, password_reset: false };
  async function ensureMethods() {
    try { const m = await API.methods(); if (m && typeof m === "object") authMethods = m; }
    catch (_) { /* keep the safe email-only default */ }
    return authMethods;
  }
  const cache = {};          // ticker -> {res, a} last interactive result (survives panel re-renders)
  const fmtUSD = (v) => v == null ? "—" : "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (v) => v == null ? "—" : (v >= 0 ? "+" : "") + Number(v).toFixed(1) + "%";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const node = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  // ── header ────────────────────────────────────────────────────────────
  function headerSlot() {
    let slot = document.getElementById("santro-auth-slot");
    if (!slot) {
      // Prefer the market-tape row's right side (terminal top-right corner);
      // fall back to the section-page header, then the controls row.
      const right = document.querySelector(".topstrip .langs")
        || document.querySelector(".pageheader .pageright")
        || document.querySelector(".topbar .right");
      if (!right) return null;
      slot = node('<span id="santro-auth-slot" style="position:relative;display:inline-flex;margin-right:6px"></span>');
      right.insertBefore(slot, right.firstChild);
    }
    return slot;
  }
  function renderHeader() {
    const slot = headerSlot(); if (!slot) return;
    if (user) {
      const label = (user.display_name || user.first_name || user.email || "?");
      const initial = label[0].toUpperCase();
      slot.innerHTML = `<button class="sa-authbtn" id="sa-acct" aria-haspopup="true" aria-expanded="false">
        <span class="sa-dot"></span>${esc(initial)} · Account ▾</button>`;
      slot.querySelector("#sa-acct").onclick = toggleMenu;
    } else {
      slot.innerHTML = `<button class="sa-authbtn" id="sa-signin">Sign in</button><a class="sa-authbtn sa-signupbtn" href="/signup">Sign up</a>`;
      slot.querySelector("#sa-signin").onclick = () => openAuth("home");
    }
  }
  function toggleMenu(e) {
    e.stopPropagation();
    const slot = headerSlot(); let m = slot.querySelector(".sa-menu");
    if (m) { m.remove(); return; }
    const nm = (user.display_name || user.first_name || "").trim();
    m = node(`<div class="sa-menu" role="menu">
      <div class="sa-email" style="white-space:normal">${nm ? `<b style="color:var(--text);font-size:12.5px">${esc(nm)}</b><br>` : ""}${esc(user.email)}</div>
      <button data-a="dashboard">⚙ Account &amp; settings</button>
      <button data-a="watchlist">★ My watchlist</button>
      <button data-a="history">🕘 Saved valuations</button>
      <button data-a="logout">Log out</button></div>`);
    slot.appendChild(m);
    m.querySelector('[data-a="dashboard"]').onclick = () => { location.href = "/dashboard"; };
    m.querySelector('[data-a="watchlist"]').onclick = () => { m.remove(); openSaved("watchlist"); };
    m.querySelector('[data-a="history"]').onclick = () => { m.remove(); openSaved("history"); };
    m.querySelector('[data-a="logout"]').onclick = async () => { m.remove(); await doLogout(); };
    setTimeout(() => document.addEventListener("click", function h() { m.remove(); document.removeEventListener("click", h); }), 0);
  }

  async function refreshUser() { try { user = await API.me(); } catch (_) { user = null; } renderHeader(); if (user) startAlertLoop(); }
  async function doLogout() { try { await API.logout(); } catch (_) {} user = null; stopAlertLoop(); renderHeader(); if (ctx) SantroCalc.render(ctx); }

  // ── modal scaffolding ─────────────────────────────────────────────────
  let backdrop = null;
  function closeModal() { if (backdrop) { backdrop.remove(); backdrop = null; document.removeEventListener("keydown", onKey); } }
  function onKey(e) { if (e.key === "Escape") closeModal(); }
  function showModal(inner) {
    closeModal();
    backdrop = node('<div class="sa-backdrop" role="dialog" aria-modal="true"></div>');
    const modal = node('<div class="sa-modal"></div>');
    modal.appendChild(node('<button class="sa-x" aria-label="Close">×</button>'));
    modal.querySelector(".sa-x").onclick = closeModal;
    modal.appendChild(inner);
    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
    document.body.appendChild(backdrop);
    document.addEventListener("keydown", onKey);
    const f = modal.querySelector("input,button.sa-btn"); if (f) f.focus();
  }
  const msg = (txt, kind) => `<div class="sa-msg ${kind}">${esc(txt)}</div>`;

  // ── auth views ────────────────────────────────────────────────────────
  async function openAuth(view) {
    await ensureMethods();
    view = view || "home";
    // With no alternative methods, the "home" chooser would hold a single
    // button — skip it and open the sign-in form directly.
    if (view === "home" && !authMethods.google && !authMethods.magic_link) view = "email";
    openAuthView(view);
  }
  function openAuthView(view, data) {
    const v = {
      home: authHome, email: authEmail, register: authRegister, magicLink: authMagic, reset: authReset,
      magicSent: () => authNotice("Check your email", "If an account exists for that address, we've sent a sign-in link. It expires in 15 minutes.", data),
      verifyNotice: () => authNotice("Verify your email", "We've sent a verification link to confirm your address. Click it, then sign in.", data),
      resetSent: () => authNotice("Check your email", "If an account exists, we've sent a password-reset link.", data),
    }[view] || authHome;
    showModal(v());
  }
  function authHome() {
    // Only render methods this deployment can actually fulfil (from /auth/methods),
    // so no button leads to a 503 or a fake "check your email".
    const alts =
      (authMethods.google ? `<button class="sa-btn google" id="g">${googleSvg()} Continue with Google</button>` : "") +
      (authMethods.magic_link ? `<button class="sa-btn" id="m">✉️ Email me a sign-in link</button>` : "");
    const w = node(`<div>
      <h2>Sign in to Santro AI</h2>
      <p class="sa-sub">${API.mode === "mock"
        ? "🧪 Preview — sign-in is simulated until accounts launch; nothing is saved yet. The valuation calculator runs for real."
        : "Unlimited valuations, a saved watchlist, and your valuation history. No spam."}</p>
      ${alts}
      ${alts ? '<div class="sa-or">or</div>' : ""}
      <button class="sa-btn primary" id="e">Continue with email & password</button>
      <div class="sa-row" style="justify-content:center;margin-top:10px">
        <button class="sa-link" id="reg0">New here? Create a free account</button></div>
      <p class="sa-nfa">Not financial advice. We use cookies to keep you signed in.</p>
    </div>`);
    const g = w.querySelector("#g");
    if (g) g.onclick = () => { const u = API.googleLoginUrl(); if (u && u.startsWith("http")) location.href = u; else mockGoogle(); };
    const m = w.querySelector("#m");
    if (m) m.onclick = () => openAuthView("magicLink");
    w.querySelector("#e").onclick = () => openAuthView("email");
    w.querySelector("#reg0").onclick = () => { location.href = "/signup"; };
    return w;
  }
  function authMagic() {
    const w = node(`<div>
      <h2>Email me a link</h2>
      <p class="sa-sub">We'll send a one-time sign-in link. No password needed.</p>
      <div id="err"></div>
      <div class="sa-field"><label>Email</label><input class="sa-input" id="em" type="email" autocomplete="email" placeholder="you@example.com"></div>
      <button class="sa-btn primary" id="go">Send link</button>
      <button class="sa-link" id="back">← other options</button>
    </div>`);
    w.querySelector("#back").onclick = () => openAuthView("home");
    const regRow = node(`<div class="sa-row" style="justify-content:center;margin-top:8px"><button class="sa-link" id="regM">No account yet? Create one</button></div>`);
    w.appendChild(regRow);
    regRow.querySelector("#regM").onclick = () => { location.href = "/signup"; };
    w.querySelector("#go").onclick = async () => {
      const email = w.querySelector("#em").value.trim();
      if (!email) return; toggle(w, true);
      try { await API.magicRequest(email); openAuthView("magicSent", email); }
      catch (e) { w.querySelector("#err").innerHTML = msg(e.detail || "Something went wrong.", "err"); toggle(w, false); }
    };
    return w;
  }
  function authEmail() {
    const hasAlts = authMethods.google || authMethods.magic_link;
    const forgot = authMethods.password_reset ? `<button class="sa-link" id="forgot">Forgot password?</button>` : "";
    const w = node(`<div>
      <h2>Sign in</h2>
      <p class="sa-sub">Use your email and password.</p>
      <div id="err"></div>
      <div class="sa-field"><label>Email</label><input class="sa-input" id="em" type="email" autocomplete="email"></div>
      <div class="sa-field"><label>Password</label><input class="sa-input" id="pw" type="password" autocomplete="current-password"></div>
      <button class="sa-btn primary" id="go">Sign in</button>
      <div class="sa-row"><button class="sa-link" id="reg">Create an account</button>${forgot}</div>
      ${hasAlts ? '<div class="sa-or">or</div><button class="sa-btn" id="back">← all sign-in options</button>' : ""}
    </div>`);
    const back = w.querySelector("#back"); if (back) back.onclick = () => openAuthView("home");
    // Signup is a dedicated page (collects a profile) — keep it separate from sign-in.
    w.querySelector("#reg").onclick = () => { location.href = "/signup"; };
    const forgotBtn = w.querySelector("#forgot"); if (forgotBtn) forgotBtn.onclick = () => openAuthView("reset");
    w.querySelector("#go").onclick = async () => {
      const email = w.querySelector("#em").value.trim(), password = w.querySelector("#pw").value;
      if (!email || !password) return; toggle(w, true);
      try { await API.login({ email, password }); closeModal(); await refreshUser(); if (ctx) SantroCalc.render(ctx); }
      catch (e) {
        const txt = e.status === 403 ? (e.detail || "This account can't sign in.") : "Invalid email or password.";
        w.querySelector("#err").innerHTML = msg(txt, "err"); toggle(w, false);
      }
    };
    return w;
  }
  function authRegister() {
    const w = node(`<div>
      <h2>Create your account</h2>
      <p class="sa-sub">Unlimited runs, saved watchlist & history.</p>
      <div id="err"></div>
      <div class="sa-field"><label>Email</label><input class="sa-input" id="em" type="email" autocomplete="email"></div>
      <div class="sa-field"><label>Password</label><input class="sa-input" id="pw" type="password" autocomplete="new-password" placeholder="At least 8 characters, with a letter and a number"></div>
      <label class="sa-consent"><input type="checkbox" id="cons"> I agree to the Terms and Privacy Policy.</label>
      <button class="sa-btn primary" id="go">Create account</button>
      <button class="sa-link" id="back">← I already have an account</button>
    </div>`);
    w.querySelector("#back").onclick = () => openAuthView("email");
    w.querySelector("#go").onclick = async () => {
      const email = w.querySelector("#em").value.trim(), password = w.querySelector("#pw").value, consent = w.querySelector("#cons").checked;
      if (!consent) { w.querySelector("#err").innerHTML = msg("Please accept the terms to continue.", "err"); return; }
      if (password.length < 8) { w.querySelector("#err").innerHTML = msg("Password must be at least 8 characters.", "err"); return; }
      toggle(w, true);
      try {
        await API.register({ email, password, consent });
        // Instant access: registration grants access immediately (no email
        // verification step), so sign straight in instead of waiting on a link.
        await API.login({ email, password });
        closeModal(); await refreshUser(); if (ctx) SantroCalc.render(ctx);
      } catch (e) { w.querySelector("#err").innerHTML = msg(e.detail || "Couldn't create the account.", "err"); toggle(w, false); }
    };
    return w;
  }
  function authReset() {
    const w = node(`<div>
      <h2>Reset password</h2>
      <p class="sa-sub">We'll email you a reset link.</p>
      <div id="err"></div>
      <div class="sa-field"><label>Email</label><input class="sa-input" id="em" type="email" autocomplete="email"></div>
      <button class="sa-btn primary" id="go">Send reset link</button>
      <button class="sa-link" id="back">← back</button>
    </div>`);
    w.querySelector("#back").onclick = () => openAuthView("email");
    w.querySelector("#go").onclick = async () => {
      const email = w.querySelector("#em").value.trim(); if (!email) return; toggle(w, true);
      try { await API.requestReset(email); openAuthView("resetSent", email); }
      catch (e) { w.querySelector("#err").innerHTML = msg("Something went wrong.", "err"); toggle(w, false); }
    };
    return w;
  }
  function authNotice(title, body, email) {
    const w = node(`<div><h2>${esc(title)}</h2><p class="sa-sub">${esc(body)}${email ? "<br><br><b>" + esc(email) + "</b>" : ""}</p>
      <button class="sa-btn primary" id="ok">Done</button></div>`);
    w.querySelector("#ok").onclick = closeModal;
    return w;
  }
  function mockGoogle() { (async () => { await API.login({ email: "you@gmail.com", password: "x" }); closeModal(); await refreshUser(); if (ctx) SantroCalc.render(ctx); })(); }
  function toggle(w, busy) { w.querySelectorAll("button,input").forEach((b) => { b.disabled = busy; }); }

  // ── the calculator on the detail card ─────────────────────────────────
  const SantroCalc = {
    render(t, hostEl) {
      ctx = { ticker: t.ticker, company: t.company, price: t.price, pe: t.pe, fwdEps: t.fwd_eps, change_pct: t.change_pct };
      const host = hostEl || document.getElementById("detail"); if (!host) return;
      const old = host.querySelector(".sa-calc"); if (old) old.remove();
      const stat = API.staticValuation(t.ticker, { price: t.price, pe: t.pe, fwdEps: t.fwd_eps });
      const block = node(`<div class="sa-calc"></div>`);
      block.innerHTML = staticHtml(stat) + runRowHtml(stat) + `<div class="sa-out" id="sa-out"></div>` + nfaLine();
      host.appendChild(block);
      wireRunRow(block, stat);
      refreshUsage(block);
      if (user) reflectPin(block);
      // Restore the last interactive result for this ticker (never a bare panel).
      const cached = cache[t.ticker];
      if (cached) {
        block.querySelector("#sa-out").innerHTML = resultsHtml(cached.res, cached.a);
        const gi = block.querySelector("#sa-g"), ri = block.querySelector("#sa-r");
        if (gi) gi.value = cached.a.growth; if (ri) ri.value = cached.a.discount;
        wireSensRerun(block);
      }
    },
  };

  function growthRead(g) {
    if (g >= 30) return "demanding — priced for a lot to go right";
    if (g >= 18) return "punchy expectations";
    if (g >= 8) return "moderate expectations";
    if (g >= 2) return "modest expectations";
    if (g >= -1) return "very low — priced for near-flat earnings";
    return "negative — priced for declining earnings; on cyclicals that's the cycle speaking, not automatically cheap";
  }
  function staticHtml(stat) {
    if (stat.storyStockFlag) {
      return `<div class="sa-lbl">What the price implies</div>
        <div class="sa-story"><b>No earnings to value on yet.</b> This name has neither positive trailing nor
        forward earnings, so there's nothing to anchor a growth read — it's priced on revenue and story, not
        profits. Watch the path to profitability, not a multiple.</div>`;
    }
    const g = stat.impliedGrowth;
    const hot = g >= 18 || g <= -1;            // demanding OR negative = caution (red); modest = green
    const basis = stat.basis === "forward" ? "forward earnings" : "trailing earnings";
    return `<div class="sa-lbl">What the price implies <span class="badge live">Free</span></div>
      <div class="sa-static">
        <span class="fv">~${g >= 0 ? g.toFixed(0) : g.toFixed(1)}%<span class="sa-unit"> / yr</span></span>
        <span class="sa-prem ${hot ? "over" : "under"}">${growthRead(g)}</span>
        <span class="sa-basis">Annual earnings growth the price bakes in · reverse-DCF on ${basis}</span>
        ${g <= -1 ? `<span class="sa-basis" style="color:#e0a73f">After a big run-up, current ${basis} can be peak-cycle — scenario values built on them look inflated. Lower the earnings base below to normalize.</span>` : ""}
      </div>`;
  }
  function runRowHtml(stat) {
    const pinBtn = user ? `<button class="sa-pin" id="sa-pin">☆ Pin</button>` : "";
    if (stat && stat.storyStockFlag) {
      // No interactive valuation without an earnings base — don't let a click burn a run.
      return pinBtn ? `<div class="sa-runrow"><span class="sa-remaining">Interactive valuation N/A — no earnings to value on yet.</span>${pinBtn}</div>` : "";
    }
    // Pre-fill growth with what the price implies, so the user starts from the
    // market's own assumption and adjusts from there (not an arbitrary 12%).
    const g0 = stat.impliedGrowth != null ? Math.round(stat.impliedGrowth * 10) / 10 : 12;
    const gi = stat.impliedGrowth;
    const eps0 = ctx.fwdEps && ctx.fwdEps > 0 ? ctx.fwdEps : (ctx.pe && ctx.pe > 0 ? Math.round(ctx.price / ctx.pe * 100) / 100 : "");
    const assume = `
      <div class="sa-modeltabs" id="sa-modeltabs">
        <button type="button" class="sa-mtab on" data-m="dcf" title="10-yr two-stage discounted cash flow on EPS">DCF</button>
        <button type="button" class="sa-mtab" data-m="pe" title="Fair value = EPS × a target P/E multiple">Fair P/E</button>
        <button type="button" class="sa-mtab" data-m="graham" title="Graham 1974: EPS × (8.5 + 2g) × 4.4 / AAA yield">Graham</button>
        <button type="button" class="sa-mtab" data-m="peg" title="Lynch: fair P/E = PEG × growth">PEG</button>
      </div>
      <div class="sa-assume sa-epsrow">
        <div class="f"><label>Earnings base $/sh <span class="sa-hint">(default: forward EPS — lower it to normalize peak-cycle earnings)</span></label>
          <input id="sa-eps" type="number" step="0.01" value="${eps0}"></div>
      </div>
      <div class="sa-presets" id="sa-presets" data-for="dcf graham peg"><span class="sa-preset-lbl">Growth:</span>
        <button type="button" class="sa-chipbtn" data-g="${gi != null ? Math.round(gi * 10) / 10 : 0}">Market-implied ${gi != null ? (gi >= 0 ? "+" : "") + gi.toFixed(1) + "%" : "—"}</button>
        <button type="button" class="sa-chipbtn" data-g="4">Conservative 4%</button>
        <button type="button" class="sa-chipbtn" data-g="8">Moderate 8%</button>
        <button type="button" class="sa-chipbtn" data-g="14">Aggressive 14%</button>
      </div>
      <div class="sa-assume" data-for="dcf graham peg" style="display:flex">
        <div class="f"><label>Growth % / yr <span class="sa-hint">(negative allowed)</span></label><input id="sa-g" type="number" step="0.5" value="${g0}"></div>
      </div>
      <div class="sa-assume" data-for="dcf" style="display:flex">
        <div class="f"><label>Discount rate %</label><input id="sa-r" type="number" step="0.25" value="9"></div>
        <div class="f"><label>Years</label><input id="sa-y" type="number" step="1" min="3" max="15" value="10"></div>
        <div class="f"><label>Terminal growth %</label><input id="sa-tg" type="number" step="0.25" value="2.5"></div>
      </div>
      <div class="sa-assume" data-for="pe" style="display:none">
        <div class="f"><label>Target P/E × <span class="sa-hint">(current ${ctx.pe && ctx.pe > 0 ? "~" + ctx.pe.toFixed(0) + "×" : "n/a"})</span></label><input id="sa-mult" type="number" step="0.5" value="18"></div>
      </div>
      <div class="sa-assume" data-for="graham" style="display:none">
        <div class="f"><label>AAA bond yield %</label><input id="sa-aaa" type="number" step="0.1" value="5.0"></div>
      </div>
      <div class="sa-assume" data-for="peg" style="display:none">
        <div class="f"><label>Target PEG ×</label><input id="sa-peg" type="number" step="0.1" value="1.0"></div>
      </div>`;
    return assume + `<div class="sa-runrow">
        <button class="sa-run" id="sa-run">▶ Run valuation</button>
        <span class="sa-remaining" id="sa-rem"></span>${pinBtn}
      </div>`;
  }
  function nfaLine() { return `<div class="sa-nfa">Reverse-DCF &amp; sensitivity are scenarios, not forecasts. Premiums describe price vs. an assumption — a condition, not a recommendation. Not financial advice.</div>`; }

  function activeModel(block) { return block.querySelector(".sa-mtab.on")?.dataset.m || "dcf"; }
  function wireRunRow(block, stat) {
    block.querySelectorAll(".sa-chipbtn").forEach((c) => { c.onclick = () => {
      const g = block.querySelector("#sa-g"); if (g) g.value = c.dataset.g;
      block.querySelectorAll(".sa-chipbtn").forEach((x) => x.classList.toggle("on", x === c));
    }; });
    block.querySelectorAll(".sa-mtab").forEach((t) => { t.onclick = () => {
      block.querySelectorAll(".sa-mtab").forEach((x) => x.classList.toggle("on", x === t));
      const m = t.dataset.m;
      block.querySelectorAll("[data-for]").forEach((d) => {
        d.style.display = d.dataset.for.split(" ").includes(m) ? "flex" : "none";
      });
    }; });
    const runBtn = block.querySelector("#sa-run");
    if (runBtn) runBtn.onclick = () => doRun(block, stat);
    const pin = block.querySelector("#sa-pin");
    if (pin) pin.onclick = () => togglePin(block);
  }

  async function refreshUsage(block) {
    const rem = block.querySelector("#sa-rem"); if (!rem) return;
    rem.innerHTML = `<span class="sa-skel" style="display:inline-block;width:90px;height:12px"></span>`;
    try {
      usage = await API.usageStatus();
      if (usage.authenticated) rem.innerHTML = `<b>${usage.remaining}</b> runs left today`;
      else rem.innerHTML = `<b>${usage.remaining}</b> of ${usage.limit} free runs left`;
    } catch (_) { rem.textContent = ""; }
  }

  async function doRun(block, stat) {
    const out = block.querySelector("#sa-out");
    const runBtn = block.querySelector("#sa-run"); runBtn.disabled = true;
    out.innerHTML = skeletonResults();
    const model = activeModel(block);
    const a = { model,
      epsBase: num(block.querySelector("#sa-eps"), null),
      growth: num(block.querySelector("#sa-g"), stat && stat.impliedGrowth != null ? Math.round(stat.impliedGrowth * 10) / 10 : 8), discount: num(block.querySelector("#sa-r"), 9),
      years: num(block.querySelector("#sa-y"), 10), tgrowth: num(block.querySelector("#sa-tg"), 2.5),
      mult: num(block.querySelector("#sa-mult"), 18), aaayield: num(block.querySelector("#sa-aaa"), 5.0),
      peg: num(block.querySelector("#sa-peg"), 1.0) };
    try {
      const res = await API.runValuation(ctx.ticker, Object.assign({ price: ctx.price, pe: ctx.pe, fwdEps: ctx.fwdEps }, a));
      out.innerHTML = resultsHtml(res, a);
      cache[ctx.ticker] = { res, a };   // survive panel re-renders
      wireSensRerun(block, stat);
      await refreshUsage(block);
      if (user && !res.storyStockFlag) {
        const saved = { model, eps: res.epsUsed };
        if (model === "pe") saved.mult = a.mult;
        else if (model === "graham") { saved.growth = a.growth; saved.aaayield = a.aaayield; }
        else if (model === "peg") { saved.growth = a.growth; saved.peg = a.peg; }
        else { saved.growth = a.growth; saved.discount = a.discount; saved.years = a.years; }
        API.saveValuation({ ticker: ctx.ticker, inputs: saved, fair_value: res.fairValue, premium_pct: res.premiumPct })
          .catch(() => {});
      }
    } catch (e) {
      runBtn.disabled = false;
      if (e instanceof API.GateError) { out.innerHTML = gateHtml(e.payload); wireGate(block); }
      else if (e.status === 401) { out.innerHTML = ""; openAuth("home"); }
      else out.innerHTML = `<div class="sa-msg err">${esc(e.detail || "Couldn't run the valuation. Try again.")}</div>`;
    } finally { runBtn.disabled = false; }
  }

  function resultsHtml(res, a) {
    if (res.storyStockFlag) {
      return `<div class="sa-story"><b>No earnings to value on yet.</b> Neither trailing nor forward earnings are
        positive, so there's no base for an earnings model. This name is priced on revenue and story, not profits.</div>`;
    }
    const over = res.premiumPct >= 0;
    const MODEL_NOTE = {
      dcf: `10-yr two-stage DCF on $${(res.epsUsed || 0).toFixed(2)}/sh: <b>${a.growth}%</b> growth for ${a.years || 10} yrs, ${a.tgrowth != null ? a.tgrowth : 2.5}% terminal, <b>${a.discount}%</b> discount.`,
      pe: `Fair P/E multiple: $${(res.epsUsed || 0).toFixed(2)}/sh × <b>${a.mult}×</b> target multiple.`,
      graham: `Graham (1974 revised): $${(res.epsUsed || 0).toFixed(2)}/sh × (8.5 + 2×<b>${a.growth}</b>) × 4.4 / <b>${a.aaayield}</b>% AAA yield.`,
      peg: `Lynch PEG: fair P/E = <b>${a.peg}</b> PEG × <b>${a.growth}%</b> growth on $${(res.epsUsed || 0).toFixed(2)}/sh.`,
    };
    return `<div class="sa-res">
      ${res.model !== "pe" && res.pricedInGrowth != null && res.pricedInGrowth < 2 && (a.growth - res.pricedInGrowth) >= 6 ? `<div class="sa-cycwarn">⚠ <b>Cyclical check:</b> the market prices in ~${res.pricedInGrowth.toFixed(1)}%/yr, but this run assumed ${a.growth}%. On names at peak earnings (very low forward P/E — often cyclicals like memory), growing peak EPS at a constant rate inflates fair value, so a large "discount" usually reflects the earnings cycle — not a mispricing.</div>` : ""}
      <div class="sa-resgrid">
        <div class="sa-card"><div class="k">Scenario value · ${(res.model || "dcf").toUpperCase()} · your inputs</div><div class="v">${fmtUSD(res.fairValue)}</div></div>
        <div class="sa-card"><div class="k">Premium vs price</div><div class="v ${over ? "over" : "under"}">${fmtPct(res.premiumPct)}</div></div>
      </div>
      <div class="sa-priced">${MODEL_NOTE[res.model || "dcf"] || ""} For reference, the market itself is pricing in about
        <b>${res.pricedInGrowth == null ? "—" : res.pricedInGrowth.toFixed(1) + "%"}</b> annual earnings growth (reverse-DCF).
        Premiums describe price vs. your assumption — a condition to watch, not advice.</div>
      ${sensitivityHtml(res.sensitivityGrid, ctx.price)}
    </div>`;
  }
  function sensitivityHtml(grid, price) {
    if (!grid) return "";
    const head = grid.discount.map((d) => `<th>${d.toFixed(2)}%</th>`).join("");
    const midR = Math.floor(grid.growth.length / 2), midC = Math.floor(grid.discount.length / 2);
    const rows = grid.cells.map((row, ri) => {
      const cells = row.map((v, ci) => {
        const cls = (ri === midR && ci === midC) ? "mid" : "";
        return `<td class="${cls}" title="${fmtUSD(v)}">${fmtUSD(v)}</td>`;
      }).join("");
      return `<tr><th class="axis">${grid.growth[ri]}%</th>${cells}</tr>`;
    }).join("");
    return `<div class="sa-sens"><table><caption>Fair value · growth (rows) × discount rate (cols)</caption>
      <tr><th class="axis">g \\ r</th>${head}</tr>${rows}</table></div>`;
  }
  function wireSensRerun(block) {
    ["#sa-g", "#sa-r"].forEach((sel) => { const i = block.querySelector(sel); if (i) i.onkeydown = (e) => { if (e.key === "Enter") block.querySelector("#sa-run").click(); }; });
  }

  // ── gate (402 → register) ─────────────────────────────────────────────
  function gateHtml(p) {
    if (p && p.action === "wait") {
      return `<div class="sa-gate"><h4>Daily limit reached</h4>
        <p>You've used today's runs. They reset at midnight UTC. Thanks for kicking the tyres.</p></div>`;
    }
    return `<div class="sa-gate"><h4>You're out of free runs</h4>
      <p>Create a free account to keep going — it takes a few seconds:</p>
      <ul><li><b>Unlimited</b> interactive valuations</li>
        <li>A saved <b>watchlist</b> across devices</li>
        <li>Your <b>valuation history</b>, re-openable any time</li>
        <li>Editable assumptions (growth, discount rate)</li></ul>
      <button class="sa-btn primary" id="sa-gate-go" style="margin:0">Create free account</button></div>`;
  }
  function wireGate(block) { const b = block.querySelector("#sa-gate-go"); if (b) b.onclick = () => openAuth("register"); }

  // ── watchlist / saved valuations modal ────────────────────────────────
  async function togglePin(block) {
    if (!user) { openAuth("home"); return; }
    const btn = block.querySelector("#sa-pin"); const on = btn.classList.contains("on");
    btn.disabled = true;
    try { if (on) { await API.unpin(ctx.ticker); btn.classList.remove("on"); btn.textContent = "☆ Pin"; }
      else { await API.pin(ctx.ticker); btn.classList.add("on"); btn.textContent = "★ Pinned"; } }
    catch (_) {} finally { btn.disabled = false; }
  }
  async function reflectPin(block) {
    const btn = block.querySelector("#sa-pin"); if (!btn) return;
    try { const wl = await API.listWatchlist(); if (wl.some((w) => w.ticker === ctx.ticker)) { btn.classList.add("on"); btn.textContent = "★ Pinned"; } } catch (_) {}
  }
  function openSaved(tab) {
    const w = node(`<div>
      <h2>Your saved data</h2>
      <div class="sa-tabs"><button data-t="watchlist">★ Watchlist</button><button data-t="history">🕘 Valuations</button></div>
      <div id="sa-saved"><div class="sa-skel" style="height:120px"></div></div>
    </div>`);
    const select = (name) => { w.querySelectorAll(".sa-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.t === name)); loadSaved(w, name); };
    w.querySelectorAll(".sa-tabs button").forEach((b) => b.onclick = () => select(b.dataset.t));
    showModal(w); select(tab || "watchlist");
  }
  async function loadSaved(w, name) {
    const box = w.querySelector("#sa-saved");
    try {
      if (name === "watchlist") {
        box.innerHTML = `<div class="sa-skel" style="height:120px"></div>`;
        const [wl] = await Promise.all([API.listWatchlist(), loadPrices(), loadAlerts(true)]);
        renderWatchlist(w, box, wl);
      } else {
        const vs = await API.listValuations();
        box.innerHTML = vs.length ? `<div class="sa-list">${vs.map((v) => {
          const over = (v.premium_pct || 0) >= 0;
          return `<div class="sa-li"><span class="tk" data-tk="${esc(v.ticker)}">${esc(v.ticker)}</span>
            <span class="meta">${fmtUSD(v.fair_value)} · <span class="${over ? "" : ""}">${fmtPct(v.premium_pct)}</span> · ${(function(i){ i = i || {};
              if (i.model === "pe") return "P/E " + esc(i.mult) + "×";
              if (i.model === "graham") return "Graham g" + esc(i.growth) + "% Y" + esc(i.aaayield) + "%";
              if (i.model === "peg") return "PEG " + esc(i.peg) + "× g" + esc(i.growth) + "%";
              return "DCF g" + esc(i.growth) + "% r" + esc(i.discount) + "%"; })(v.inputs)}</span>
            <span class="meta sp">${new Date(v.created_at).toLocaleDateString()}</span>
            <button class="x" data-del="${esc(v.id)}" title="Delete">×</button></div>`;
        }).join("")}</div>` : `<div class="sa-empty">No saved valuations yet. Run one and it lands here.</div>`;
        box.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { await API.removeValuation(b.dataset.del); loadSaved(w, "history"); });
        box.querySelectorAll("[data-tk]").forEach((b) => b.onclick = () => { closeModal(); jumpTo(b.dataset.tk); });
      }
    } catch (e) { box.innerHTML = `<div class="sa-empty">Couldn't load this right now.</div>`; }
  }
  function jumpTo(ticker) {
    // Re-open the ticker in the terminal if the host exposes openTicker; else go to its page.
    if (typeof window.openTicker === "function") { try { window.openTicker(ticker); return; } catch (_) {} }
    location.href = "t?sym=" + encodeURIComponent(ticker);
  }

  // ── watchlist terminal: live prices + alerts ───────────────────────────
  let _px = null, _pxAt = 0, _alerts = null, alertTimer = null;
  async function loadPrices(force) {
    if (_px && !force && Date.now() - _pxAt < 45000) return _px;
    const map = {};
    const add = (t) => { if (t && t.ticker && (t.price != null || t.change_pct != null))
      map[t.ticker] = { price: t.price, change_pct: t.change_pct, company: t.company, pe: t.pe, fwdEps: t.fwd_eps }; };
    const grab = (u) => fetch(u + "?t=" + Date.now()).then((r) => r.json()).catch(() => null);
    const [d, u, e] = await Promise.all([grab("/data.json"), grab("/universe.json"), grab("/ecosystem.json")]);
    if (u && u.bubbles) u.bubbles.forEach((b) => (b.tickers || []).forEach(add));
    if (e && e.tickers) e.tickers.forEach(add);
    if (d) ["stocks", "etfs"].forEach((k) => (d[k] || []).forEach(add));
    _px = map; _pxAt = Date.now(); return map;
  }
  async function loadAlerts(force) { if (_alerts && !force) return _alerts; try { _alerts = await API.listAlerts(); } catch (_) { _alerts = []; } return _alerts; }
  function alertsFor(tk) { return (_alerts || []).filter((a) => a.ticker === tk); }
  function alertDesc(a) {
    if (a.kind === "price_above") return "Price ≥ $" + a.threshold;
    if (a.kind === "price_below") return "Price ≤ $" + a.threshold;
    if (a.kind === "pct_up") return "Day move ≥ +" + a.threshold + "%";
    if (a.kind === "pct_down") return "Day move ≤ −" + a.threshold + "%";
    return a.kind;
  }
  function alertMet(a, p) {
    if (!p) return false;
    if (a.kind === "price_above") return p.price != null && p.price >= a.threshold;
    if (a.kind === "price_below") return p.price != null && p.price <= a.threshold;
    if (a.kind === "pct_up") return p.change_pct != null && p.change_pct >= a.threshold;
    if (a.kind === "pct_down") return p.change_pct != null && p.change_pct <= -a.threshold;
    return false;
  }

  function renderWatchlist(w, box, wl) {
    const px = _px || {};
    if (!wl.length) { box.innerHTML = `<div class="sa-empty">No pinned tickers yet. Open a stock and tap <b>Pin</b>.</div>`; return; }
    const rows = wl.map((i) => {
      const p = px[i.ticker] || {};
      const mv = p.change_pct;
      const mvHtml = typeof mv === "number" ? `<span class="wl-mv ${mv >= 0 ? "up" : "dn"}">${fmtPct(mv)}</span>` : `<span class="wl-mv na">—</span>`;
      const na = alertsFor(i.ticker).filter((a) => a.active).length;
      return `<div class="wl-row">
        <button class="wl-tk" data-tk="${esc(i.ticker)}">${esc(i.ticker)}</button>
        <span class="wl-co">${esc(p.company || "")}</span>
        <span class="wl-px">${p.price != null ? fmtUSD(p.price) : "—"}</span>
        ${mvHtml}
        <button class="wl-bell${na ? " on" : ""}" data-al="${esc(i.ticker)}" title="Alerts">🔔${na ? `<span class="wl-badge">${na}</span>` : ""}</button>
        <button class="wl-x" data-un="${esc(i.ticker)}" title="Unpin">×</button>
      </div>`;
    }).join("");
    box.innerHTML = `<div class="wl-head"><span>Ticker</span><span>Company</span><span>Price</span><span>1D</span><span></span><span></span></div>
      <div class="wl-list">${rows}</div><div id="wl-panel"></div>
      <p class="sa-nfa">Live-ish quotes (~15 min delayed). Alerts are checked while this site is open. Not financial advice.</p>`;
    box.querySelectorAll("[data-tk]").forEach((b) => b.onclick = () => { closeModal(); jumpTo(b.dataset.tk); });
    box.querySelectorAll("[data-un]").forEach((b) => b.onclick = async () => { await API.unpin(b.dataset.un); loadSaved(w, "watchlist"); });
    box.querySelectorAll("[data-al]").forEach((b) => b.onclick = () => renderAlertPanel(w, b.dataset.al));
  }
  function updateBell(w, tk) {
    const bell = w.querySelector('.wl-bell[data-al="' + tk + '"]'); if (!bell) return;
    const na = alertsFor(tk).filter((a) => a.active).length;
    bell.classList.toggle("on", na > 0);
    bell.innerHTML = "🔔" + (na ? `<span class="wl-badge">${na}</span>` : "");
  }
  function renderAlertPanel(w, tk) {
    const panel = w.querySelector("#wl-panel"); if (!panel) return;
    const p = (_px || {})[tk] || {};
    const existing = alertsFor(tk);
    const rows = existing.length ? existing.map((a) => `<div class="al-row ${a.active ? "" : "off"}">
        <span class="al-desc">${esc(alertDesc(a))}</span>
        <button class="al-toggle" data-tog="${esc(a.id)}">${a.active ? "On" : "Off"}</button>
        <button class="al-del" data-del="${esc(a.id)}" title="Delete">×</button></div>`).join("")
      : `<div class="al-empty">No alerts on ${esc(tk)} yet.</div>`;
    const notif = window.Notification && Notification.permission !== "granted"
      ? `<button class="sa-link" id="al-notif">🔔 Enable browser notifications</button>` : "";
    panel.innerHTML = `<div class="al-box">
      <div class="al-h">Alerts · <b>${esc(tk)}</b>${p.price != null ? ` <span class="al-now">now ${fmtUSD(p.price)}${p.change_pct != null ? " · " + fmtPct(p.change_pct) : ""}</span>` : ""}
        <button class="al-close" id="al-close" title="Close">×</button></div>
      <div class="al-list">${rows}</div>
      <div class="al-form">
        <select id="al-kind" class="sa-input">
          <option value="price_above">Price ≥ $</option><option value="price_below">Price ≤ $</option>
          <option value="pct_up">Day move ≥ +%</option><option value="pct_down">Day move ≤ −%</option>
        </select>
        <input id="al-th" class="sa-input" type="number" step="0.01" min="0" placeholder="value" aria-label="Alert threshold">
        <button class="sa-btn primary" id="al-add">Add alert</button>
      </div>
      <div id="al-err"></div>${notif}</div>`;
    panel.querySelector("#al-close").onclick = () => { panel.innerHTML = ""; };
    panel.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { await API.deleteAlert(b.dataset.del); _alerts = await API.listAlerts(); renderAlertPanel(w, tk); updateBell(w, tk); });
    panel.querySelectorAll("[data-tog]").forEach((b) => b.onclick = async () => { const a = alertsFor(tk).find((x) => x.id === b.dataset.tog); if (a) { await API.updateAlert(a.id, { active: !a.active }); _alerts = await API.listAlerts(); renderAlertPanel(w, tk); updateBell(w, tk); } });
    const nb = panel.querySelector("#al-notif"); if (nb) nb.onclick = () => { try { Notification.requestPermission().then(() => renderAlertPanel(w, tk)); } catch (_) {} };
    panel.querySelector("#al-add").onclick = async () => {
      const kind = panel.querySelector("#al-kind").value, th = parseFloat(panel.querySelector("#al-th").value);
      const err = panel.querySelector("#al-err");
      if (!(th > 0)) { err.innerHTML = msg("Enter a value greater than 0.", "err"); return; }
      try {
        await API.createAlert({ ticker: tk, kind: kind, threshold: th });
        _alerts = await API.listAlerts();
        try { if (window.Notification && Notification.permission === "default") Notification.requestPermission(); } catch (_) {}
        renderAlertPanel(w, tk); updateBell(w, tk);
      } catch (e) { err.innerHTML = msg(e.detail || "Couldn't add that alert.", "err"); }
    };
  }

  // ── client-side alert checker (runs while the terminal is open) ─────────
  async function checkAlerts() {
    if (!user) return;
    let alerts, px;
    try { [alerts, px] = await Promise.all([loadAlerts(true), loadPrices(true)]); } catch (_) { return; }
    const now = Date.now(), DEDUPE = 4 * 3600 * 1000;
    for (const a of alerts) {
      if (!a.active || !alertMet(a, px[a.ticker])) continue;
      const last = a.last_triggered_at ? new Date(a.last_triggered_at).getTime() : 0;
      if (now - last < DEDUPE) continue;
      fireAlert(a, px[a.ticker]);
      a.last_triggered_at = new Date().toISOString();
      API.updateAlert(a.id, { triggered: true }).catch(() => {});
    }
  }
  function fireAlert(a, p) {
    const msgTxt = `${a.ticker} · ${alertDesc(a)} — now ${p.price != null ? fmtUSD(p.price) : ""}${p.change_pct != null ? " (" + fmtPct(p.change_pct) + ")" : ""}`;
    toast(msgTxt);
    try { if (window.Notification && Notification.permission === "granted") new Notification("Santro AI alert", { body: msgTxt }); } catch (_) {}
  }
  function toast(txt) {
    let host = document.getElementById("sa-toasts");
    if (!host) { host = node('<div id="sa-toasts"></div>'); document.body.appendChild(host); }
    const t = node(`<div class="sa-toast">🔔 <span>${esc(txt)}</span></div>`);
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    const kill = () => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); };
    t.onclick = kill; setTimeout(kill, 9000);
  }
  function startAlertLoop() { if (alertTimer) return; setTimeout(checkAlerts, 4000); alertTimer = setInterval(checkAlerts, 90000); }
  function stopAlertLoop() { if (alertTimer) { clearInterval(alertTimer); alertTimer = null; } _alerts = null; }

  // ── helpers ───────────────────────────────────────────────────────────
  function num(input, dflt) { if (!input) return dflt; const v = parseFloat(input.value); return isNaN(v) ? dflt : v; }
  function skeletonResults() { return `<div class="sa-res"><div class="sa-resgrid"><div class="sa-skel" style="height:62px"></div><div class="sa-skel" style="height:62px"></div></div><div class="sa-skel" style="height:60px"></div><div class="sa-skel" style="height:120px"></div></div>`; }
  function googleSvg() { return `<svg width="17" height="17" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-4 2.7-6.5z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/></svg>`; }

  // ── boot ──────────────────────────────────────────────────────────────
  window.SantroCalc = SantroCalc;
  API.onUnauthorized(() => { user = null; renderHeader(); openAuth("home"); });
  function boot() {
    renderHeader(); refreshUser(); ensureMethods();
    // "Create a free account" CTAs across the site (/?auth=register) now go to the
    // dedicated pages so signup (with profile) and sign-in are clearly separate.
    const v = new URLSearchParams(location.search).get("auth");
    if (v === "register") location.href = "/signup";
    else if (v === "login") location.href = "/signin";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
```

---

## File 3 — `santro-ai/accounts/api.js (FULL FILE, 321 lines)`

**Why it matters:** the entire REST client — route table, cookie/refresh handling,
anonymous metering id, the dev Mock backend, and the valuation provider switch.
**Claims it supports:** (a) the route table declares `valuationRun: "/valuation/run"`
and `RealValuation.run()` POSTs to it — an endpoint that DOES NOT EXIST in the backend
(see File 7/8 and the backend router list in 05-api-endpoint-map.md); (b) the in-memory
`Mock` backend is selected only when `apiMode === "mock"` — production config is "live",
so Mock is inert in prod; (c) `getPreferences/updatePreferences` exist and work — the
client is fully capable, just never called from the terminal.
**Reviewer should verify:** `const backend = CFG.apiMode === "live" ? Live : Mock;`
`const valuation = CFG.valuationProvider === "real" ? RealValuation : MockValuation;`
and that grep for "/valuation/run" in the backend returns nothing.

```javascript
/* Santro Accounts — the ONE API module.
 *
 * Everything network goes through here. The backend owns auth + metering; this
 * just reflects it. Sessions are httpOnly cookies, so we never read/store tokens
 * in JS — every request is credentials:"include". 401 is handled centrally
 * (refresh once → else surface to the login modal); 402 becomes a GateError the
 * calculator turns into a register prompt.
 *
 * Swap mock→real backend: SANTRO_CONFIG.apiMode = "live".
 * Swap mock→real valuation: SANTRO_CONFIG.valuationProvider = "real".  (one line each)
 */
(function () {
  "use strict";
  const CFG = window.SANTRO_CONFIG || {};
  const BASE = (CFG.apiBase || "").replace(/\/+$/, "");

  // Anonymous metering id. The browser mints one random id and reuses it, sent
  // as X-Santro-Anon so the backend can count free runs per browser WITHOUT a
  // cross-site cookie (dropped as third-party) or the client IP (which rotates
  // on carrier NAT / VPN / iCloud Private Relay and so leaked the limit). It is
  // NOT a credential — clearing it merely resets the free-run count — so
  // first-party localStorage is the right home; real auth stays in httpOnly
  // cookies. If storage is blocked (private mode) the backend falls back to IP.
  const ANON_ID = (function () {
    const K = "santro_anon_id", ok = (v) => v && /^[A-Za-z0-9_-]{8,64}$/.test(v);
    try {
      let v = localStorage.getItem(K);
      if (!ok(v)) {
        v = (crypto.randomUUID ? crypto.randomUUID()
              : "a" + Math.random().toString(36).slice(2) + Date.now().toString(36))
            .replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
        localStorage.setItem(K, v);
      }
      return v;
    } catch (_) { return null; }
  })();

  // Backend routes in one place — adjust here if the backend differs.
  const R = {
    me: "/account/me",
    profile: "/account/profile",
    preferences: "/account/preferences",
    register: "/auth/register",
    login: "/auth/login",
    magicRequest: "/auth/magic/request",
    magicVerify: "/auth/magic/verify",
    verifyEmail: "/auth/verify-email",
    requestReset: "/auth/request-password-reset",
    resetPassword: "/auth/reset-password",
    googleLogin: "/auth/google/login",
    methods: "/auth/methods",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    usageStatus: "/usage/status",
    usageRun: "/usage/run",
    watchlist: "/watchlist",
    alerts: "/alerts",
    valuations: "/valuations",
    valuationRun: "/valuation/run",
  };

  class ApiError extends Error {
    constructor(status, detail) { super(detail || "API error"); this.status = status; this.detail = detail; }
  }
  class GateError extends Error {
    constructor(payload) { super((payload && payload.detail) || "Register to continue"); this.payload = payload || {}; }
  }

  let _onUnauthorized = () => {};

  // ── Live backend (cookie sessions) ──────────────────────────────────────
  const Live = {
    async _fetch(path, { method = "GET", body, silent401 = false } = {}, _retried = false) {
      let res;
      try {
        res = await fetch(BASE + path, {
          method,
          credentials: "include",
          cache: "no-store",
          headers: Object.assign(
            ANON_ID ? { "x-santro-anon": ANON_ID } : {},
            body ? { "content-type": "application/json" } : {}
          ),
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch (e) {
        throw new ApiError(0, "Network error — check your connection.");
      }
      if (res.status === 401 && !_retried) {
        // Try a silent refresh, then replay once.
        const ok = await fetch(BASE + R.refresh, { method: "POST", credentials: "include" })
          .then((r) => r.ok).catch(() => false);
        if (ok) return Live._fetch(path, { method, body, silent401 }, true);
        if (!silent401) _onUnauthorized();
        let d401 = null; try { d401 = await res.json(); } catch (_) {}
        throw new ApiError(401, (d401 && d401.detail) || "Authentication required.");
      }
      if (res.status === 402) {
        let p = {}; try { p = await res.json(); } catch (_) {}
        throw new GateError(p);
      }
      if (res.status === 204) return null;
      let data = null; try { data = await res.json(); } catch (_) {}
      if (!res.ok) throw new ApiError(res.status, (data && data.detail) || res.statusText);
      return data;
    },
    me() { return Live._fetch(R.me, { silent401: true }).catch((e) => { if (e.status === 401) return null; throw e; }); },
    methods() { return Live._fetch(R.methods); },
    updateProfile(b) { return Live._fetch(R.profile, { method: "PATCH", body: b }); },
    getPreferences() { return Live._fetch(R.preferences); },
    updatePreferences(b) { return Live._fetch(R.preferences, { method: "PATCH", body: b }); },
    register(b) { return Live._fetch(R.register, { method: "POST", body: b }); },
    login(b) { return Live._fetch(R.login, { method: "POST", body: b }); },
    magicRequest(email) { return Live._fetch(R.magicRequest, { method: "POST", body: { email } }); },
    magicVerify(token) { return Live._fetch(R.magicVerify, { method: "POST", body: { token } }); },
    verifyEmail(token) { return Live._fetch(R.verifyEmail, { method: "POST", body: { token } }); },
    requestReset(email) { return Live._fetch(R.requestReset, { method: "POST", body: { email } }); },
    resetPassword(token, password) { return Live._fetch(R.resetPassword, { method: "POST", body: { token, password } }); },
    logout() { return Live._fetch(R.logout, { method: "POST" }); },
    usageStatus() { return Live._fetch(R.usageStatus); },
    usageRun() { return Live._fetch(R.usageRun, { method: "POST" }); },
    listWatchlist() { return Live._fetch(R.watchlist); },
    pin(ticker) { return Live._fetch(R.watchlist, { method: "POST", body: { ticker } }); },
    unpin(ticker) { return Live._fetch(R.watchlist + "/" + encodeURIComponent(ticker), { method: "DELETE" }); },
    listAlerts() { return Live._fetch(R.alerts); },
    createAlert(b) { return Live._fetch(R.alerts, { method: "POST", body: b }); },
    updateAlert(id, b) { return Live._fetch(R.alerts + "/" + encodeURIComponent(id), { method: "PATCH", body: b }); },
    deleteAlert(id) { return Live._fetch(R.alerts + "/" + encodeURIComponent(id), { method: "DELETE" }); },
    listValuations() { return Live._fetch(R.valuations); },
    saveValuation(rec) { return Live._fetch(R.valuations, { method: "POST", body: rec }); },
    removeValuation(id) { return Live._fetch(R.valuations + "/" + encodeURIComponent(id), { method: "DELETE" }); },
  };

  // ── Dev mock backend (in-memory; demo with no server) ──────────────────
  // A fixture only — never prod logic. The LIVE path delegates entirely to the
  // backend. Mirrors Live's interface so the UI code is identical either way.
  const Mock = (function () {
    const FREE = Math.max(2, CFG.mockFreeRuns || 4);
    let user = null;                 // {id,email,email_verified,...}
    let anonUsed = 0;
    let userUsed = 0;
    const wl = new Map();            // ticker -> {id,ticker,created_at}
    const al = new Map();            // id -> alert
    const vals = [];                 // saved valuations
    const MOCK_PREFS = { show_all_data: true, show_stocks: true, show_crypto: true, show_etfs: true,
      show_news: true, show_research: true, show_bubble_risk: true, show_fair_value_calculator: true,
      show_watchlist: true, default_terminal_view: "all", theme: "system", preferred_sectors: [], preferred_tickers: [] };
    let _mockPrefs = {};
    const id = () => "m_" + Math.random().toString(36).slice(2, 10);
    const ensureUser = (email) => ({ id: id(), email: email.toLowerCase(), email_verified: true,
      display_name: null, consented_at: new Date().toISOString(), created_at: new Date().toISOString() });
    const requireUser = () => { if (!user) { _onUnauthorized(); throw new ApiError(401, "Authentication required."); } };
    const nextMidnight = () => { const d = new Date(); d.setUTCHours(24, 0, 0, 0); return d.toISOString(); };
    return {
      async me() { return user; },
      async methods() { return { email_password: true, google: false, magic_link: false, password_reset: false }; },
      async updateProfile(b) { if (user) Object.assign(user, b); return user || {}; },
      async getPreferences() { return Object.assign({}, MOCK_PREFS, _mockPrefs); },
      async updatePreferences(b) { Object.assign(_mockPrefs, b || {}); return Object.assign({}, MOCK_PREFS, _mockPrefs); },
      async register(b) { return { detail: "If an account exists, we've sent a message." }; },
      async login(b) { user = ensureUser(b.email); return { ok: true }; },
      async magicRequest() { return { detail: "If an account exists, we've sent a login link." }; },
      async magicVerify() { user = user || ensureUser("you@santro.dev"); return { ok: true }; },
      async verifyEmail() { return { detail: "Email verified." }; },
      async requestReset() { return { detail: "If an account exists, we've sent a message." }; },
      async resetPassword() { return { detail: "Password updated." }; },
      async logout() { user = null; return { detail: "Logged out." }; },
      async usageStatus() {
        const authed = !!user;
        const limit = authed ? 100 : FREE;
        const used = authed ? userUsed : anonUsed;
        return { authenticated: authed, limit, used, remaining: Math.max(0, limit - used), resets_at: nextMidnight() };
      },
      async usageRun() {
        const s = await this.usageStatus();
        if (s.remaining <= 0) throw new GateError({ detail: "Daily free limit reached. Register for more runs.",
          action: user ? "wait" : "register", limit: s.limit, used: s.used, remaining: 0 });
        if (user) userUsed++; else anonUsed++;
        return { allowed: true, limit: s.limit, used: s.used + 1, remaining: s.remaining - 1 };
      },
      async listWatchlist() { requireUser(); return [...wl.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)); },
      async pin(ticker) { requireUser(); const k = ticker.toUpperCase();
        if (!wl.has(k)) wl.set(k, { id: id(), ticker: k, created_at: new Date().toISOString() }); return wl.get(k); },
      async unpin(ticker) { requireUser(); wl.delete(ticker.toUpperCase()); return null; },
      async listAlerts() { requireUser(); return [...al.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)); },
      async createAlert(b) { requireUser(); const a = { id: id(), ticker: (b.ticker || "").toUpperCase(), kind: b.kind, threshold: b.threshold, active: true, note: b.note || null, last_triggered_at: null, created_at: new Date().toISOString() }; al.set(a.id, a); return a; },
      async updateAlert(aid, b) { requireUser(); const a = al.get(aid); if (!a) return null; if (b.active != null) a.active = b.active; if (b.triggered) a.last_triggered_at = new Date().toISOString(); return a; },
      async deleteAlert(aid) { requireUser(); al.delete(aid); return { detail: "Alert deleted." }; },
      async listValuations() { requireUser(); return vals.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)); },
      async saveValuation(rec) { requireUser(); const v = Object.assign({ id: id(), created_at: new Date().toISOString() }, rec); vals.push(v); return v; },
      async removeValuation(vid) { requireUser(); const i = vals.findIndex((v) => v.id === vid); if (i >= 0) vals.splice(i, 1); return null; },
    };
  })();

  const backend = CFG.apiMode === "live" ? Live : Mock;

  // ── Valuation provider (mock ↔ real) ───────────────────────────────────
  function dcf(eps, g, r, years, tg) {
    if (r <= tg) r = tg + 0.01;
    let pv = 0, e = eps;
    for (let t = 1; t <= years; t++) { e *= 1 + g; pv += e / Math.pow(1 + r, t); }
    const terminal = (e * (1 + tg)) / (r - tg);
    pv += terminal / Math.pow(1 + r, years);
    return pv;
  }
  // Traditional single-shot models (assumption-based, educational)
  function grahamValue(eps, g, aaa) {           // Graham 1974 revised: EPS x (8.5 + 2g) x 4.4 / Y
    if (!aaa || aaa <= 0) aaa = 4.4;
    return eps * (8.5 + 2 * Math.max(0, g)) * 4.4 / aaa;
  }
  function multipleValue(eps, mult) { return eps * mult; }
  function pegValue(eps, g, peg) { return eps * Math.max(0, g) * peg; } // fair P/E = PEG x g
  function impliedGrowth(eps, price, r, years, tg) {
    // bisection: find g such that dcf == price
    let lo = -0.30, hi = 0.6;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      (dcf(eps, mid, r, years, tg) > price ? (hi = mid) : (lo = mid));
    }
    return (lo + hi) / 2;
  }
  const MockValuation = {
    // Earnings base for the model: prefer FORWARD EPS (normalized — handles
    // names that are unprofitable on a trailing basis but profitable looking
    // forward), fall back to trailing EPS (price/PE). Null only when neither is
    // positive (nothing to anchor a growth read on).
    _eps(price, pe, fwdEps) {
      if (fwdEps && fwdEps > 0) return fwdEps;
      return pe && pe > 0 ? price / pe : null;
    },
    static_(ticker, { price, pe, fwdEps }) {
      const eps = this._eps(price, pe, fwdEps);
      if (eps == null) return { ticker, storyStockFlag: true, impliedGrowth: null, basis: null };
      // Free read = the annual earnings growth the current price ALREADY implies
      // (reverse-DCF). We don't guess a growth rate for the whole universe (that
      // produced nonsense) — we report the one the market has baked into price.
      return { ticker, storyStockFlag: false,
        impliedGrowth: impliedGrowth(eps, price, 0.09, 10, 0.025) * 100,
        basis: (fwdEps && fwdEps > 0) ? "forward" : "trailing" };
    },
    run(ticker, a) {
      const { price, pe, fwdEps } = a;
      const model = a.model || "dcf";
      const eps = (a.epsBase != null && a.epsBase > 0) ? a.epsBase : this._eps(price, pe, fwdEps);
      if (eps == null) return { ticker, storyStockFlag: true, fairValue: null, premiumPct: null, pricedInGrowth: null, sensitivityGrid: null };
      const growth = a.growth != null ? a.growth : 8;
      const discount = a.discount != null ? a.discount : 9;
      const years = Math.min(15, Math.max(3, a.years != null ? a.years : 10));
      const tg = (a.tgrowth != null ? a.tgrowth : 2.5) / 100;
      let fair = null, grid = null;
      if (model === "pe") {
        fair = multipleValue(eps, a.mult != null ? a.mult : 18);
      } else if (model === "graham") {
        fair = grahamValue(eps, growth, a.aaayield != null ? a.aaayield : 5.0);
      } else if (model === "peg") {
        fair = pegValue(eps, growth, a.peg != null ? a.peg : 1.0);
      } else {                                   // dcf (default)
        fair = dcf(eps, growth / 100, discount / 100, years, tg);
        grid = { growth: [], discount: [], cells: [] };
        const gs = [growth - 4, growth - 2, growth, growth + 2, growth + 4];
        const rs = [discount - 1.5, discount - 0.75, discount, discount + 0.75, discount + 1.5];
        grid.growth = gs; grid.discount = rs;
        gs.forEach((gg) => grid.cells.push(rs.map((rr) => dcf(eps, gg / 100, rr / 100, years, tg))));
      }
      return {
        ticker, storyStockFlag: false, model, epsUsed: eps,
        fairValue: fair, premiumPct: fair > 0 ? (price / fair - 1) * 100 : null,
        pricedInGrowth: impliedGrowth(eps, price, discount / 100, years, tg) * 100,
        sensitivityGrid: grid,
        basis: (a.epsBase != null && a.epsBase > 0) ? "custom" : ((fwdEps && fwdEps > 0) ? "forward" : "trailing"),
      };
    },
  };
  const RealValuation = {
    static_(ticker, ctx) { return MockValuation.static_(ticker, ctx); }, // free read stays client-side
    run(ticker, a) { return Live._fetch(R.valuationRun, { method: "POST", body: { ticker, growth: a.growth, discount: a.discount } }); },
  };
  const valuation = CFG.valuationProvider === "real" ? RealValuation : MockValuation;

  // ── Public surface ──────────────────────────────────────────────────────
  window.SantroAPI = {
    ApiError, GateError,
    mode: CFG.apiMode, valuationMode: CFG.valuationProvider,
    onUnauthorized(cb) { _onUnauthorized = cb; },

    me: () => backend.me(),
    methods: () => backend.methods(),
    updateProfile: (b) => backend.updateProfile(b),
    getPreferences: () => backend.getPreferences(),
    updatePreferences: (b) => backend.updatePreferences(b),
    register: (b) => backend.register(b),
    login: (b) => backend.login(b),
    magicRequest: (email) => backend.magicRequest(email),
    magicVerify: (token) => backend.magicVerify(token),
    verifyEmail: (token) => backend.verifyEmail(token),
    requestReset: (email) => backend.requestReset(email),
    resetPassword: (token, password) => backend.resetPassword(token, password),
    googleLoginUrl: () => (CFG.apiMode === "live" ? BASE + R.googleLogin : "#mock-google"),
    logout: () => backend.logout(),

    usageStatus: () => backend.usageStatus(),
    // Free, un-metered read shown to everyone.
    staticValuation: (ticker, ctx) => valuation.static_(ticker, ctx),
    // Metered interactive run: backend meters (may 402), then we get the numbers.
    async runValuation(ticker, ctx) {
      await backend.usageRun();                 // throws GateError on the wall
      return valuation.run(ticker, ctx);
    },

    listWatchlist: () => backend.listWatchlist(),
    pin: (t) => backend.pin(t),
    unpin: (t) => backend.unpin(t),
    listAlerts: () => backend.listAlerts(),
    createAlert: (b) => backend.createAlert(b),
    updateAlert: (id, b) => backend.updateAlert(id, b),
    deleteAlert: (id) => backend.deleteAlert(id),
    listValuations: () => backend.listValuations(),
    saveValuation: (rec) => backend.saveValuation(rec),
    removeValuation: (id) => backend.removeValuation(id),
  };
})();
```

---

## File 4 — `santro-ai/accounts/config.js (FULL FILE, 41 lines — public config, no secrets by design)`

**Why it matters:** the frontend's "env". Proves production runs `apiMode:"live"`
against `https://api.santroai.tech` with `valuationProvider:"mock"`.
**Claims it supports:** production valuation math is client-side ("mock" provider name),
pinned that way because the server endpoint never shipped — see the file's own comment
"swap to 'real' the moment the endpoint ships".
**Reviewer should verify:** no secret material present; the mock/live switch semantics.

```javascript
/* Santro Accounts — frontend config (the "env" for a static site).
 *
 * No secrets here — only public, build-time configuration. To point the UI at a
 * real backend, set apiMode:"live" and apiBase to the API origin. CORS on the
 * backend must allow this site's origin and credentials.
 *
 * Override at deploy time by defining window.SANTRO_CONFIG before this file
 * loads (e.g. an injected <script>), or just edit the defaults below.
 */
// Dev/staging convenience: point at a live backend without editing this file via
//   ?santro_api=https://api.santroai.tech   (or localStorage SANTRO_API_BASE)
// In production you wouldn't pass it, so your deploy config wins.
var _override = {};
try {
  var _u = new URLSearchParams(location.search).get("santro_api") ||
           localStorage.getItem("SANTRO_API_BASE");
  if (_u) { _override.apiMode = "live"; _override.apiBase = _u; }
} catch (e) {}

window.SANTRO_CONFIG = Object.assign(
  {
    // "live"  → talk to the FastAPI backend at apiBase (cookies, credentials:include)
    // "mock"  → in-memory fixture so the full UX works with no backend (local/demo)
    apiMode: "live",

    // Backend origin. Empty = same origin. Example: "https://api.santroai.tech"
    // Same-site subdomain of santroai.tech → session cookies are first-party
    // (no third-party-cookie blocking by Safari/ITP or Chrome's 3p phase-out).
    apiBase: "https://api.santroai.tech",

    // Valuation math source. "real" → POST {apiBase}/valuation/run.
    // "mock" → typed local mock (swap to "real" the moment the endpoint ships).
    valuationProvider: "mock",

    // Only used by the dev mock so the demo behaves like a real meter.
    // The LIVE app never reads this — it reads remaining runs from /usage/status.
    mockFreeRuns: 4,
  },
  window.SANTRO_CONFIG || {},
  _override
);
```

---

## File 5 — `santro-ai/quiz.html — lines 407-503: the #xc-gate section + the entire app script (file is 660 lines; the rest is nav/footer/CSS)`

**Why it matters:** the second customization UI ("Exposure Check") and the single
biggest phantom promise in the product, shown to every anonymous visitor.
**Claims it supports:** (a) the gate copy promises "a configured terminal snapshot:
a preset dashboard and a suggested watchlist you can edit"; (b) `save()` writes
`localStorage.setItem("santro_calibration", ...)` and NOTHING else — no API call,
even though PATCH /account/preferences exists (File 3 has the client method for it);
(c) repo-wide, `santro_calibration` has zero readers.
**Reviewer should verify:** the `save()` function body; the absence of any
`SantroAPI.updatePreferences` call in this file; the promise copy vs. what save() does.

```html
<main class="xc">
  <span class="k">Tools · account feature</span>
  <h1>Exposure Check</h1>

  <!-- anonymous gate: professional, no questions in the DOM -->
  <section id="xc-gate">
    <p class="lead">The Exposure Check calibrates your terminal. Four instrument-style steps — universe,
    concentration, valuation lens, risk watch — and the output is a configured terminal snapshot:
    a preset dashboard and a suggested watchlist you can edit. It takes about a minute, and it's
    offered once after signup too, skippable.</p>
    <div class="xc-grid">
      <div>
        <p style="margin:0 0 14px"><a class="xc-cta" href="/signup">Create a free account to run it</a></p>
        <p style="font-size:12.5px;color:var(--faint)">Already have one? <a href="/signin" style="font-weight:700">Sign in</a> — this page unlocks in place.
        Scenario outputs, not advice. Quotes delayed ~15 min.</p>
      </div>
      <div class="xc-panel" aria-label="Example output — configured terminal snapshot">
        <p class="xc-klabel">Your output — a configured terminal</p>
        <div class="xc-row"><b>Preset dashboard</b><span>bubble gauge · your themes first</span></div>
        <div class="xc-row"><b>Suggested watchlist</b><span>10 names, editable</span></div>
        <div class="xc-row"><b>Default risk view</b><span>scenarios or index, your pick</span></div>
        <div class="xc-bars" style="margin-top:12px">
          <div style="font-size:11px;color:var(--faint)">theme weighting preview</div>
          <div class="bar"><i style="width:62%"></i></div>
          <div class="bar"><i style="width:38%"></i></div>
        </div>
      </div>
    </div>
  </section>

  <!-- calibration renders ONLY for authenticated users (built by JS) -->
  <section id="xc-run" hidden></section>
</main>

<script src="/accounts/config.js?v=3"></script>
<script src="/accounts/api.js?v=12"></script>
<script src="/accounts/accounts.js?v=15"></script>
<script>
(function(){
"use strict";
var STEPS=[
 {id:"universe",t:"Universe",p:"What does your AI exposure live in?",o:["AI stocks","AI ETFs","AI crypto","All of it"]},
 {id:"conc",t:"Concentration",p:"How is it distributed?",o:["A few concentrated names","Spread across themes","Mostly ETFs","Holdings plus cash buffer"]},
 {id:"lens",t:"Valuation lens",p:"How do you read a price?",o:["Growth-forward","Value-sensitive","Implied-growth checker"]},
 {id:"risk",t:"Risk watch",p:"Which risk view opens first?",o:["Bubble Index","Drawdown scenarios","Filing trackers"]}];
var THEME_BY_UNIVERSE={"AI stocks":["ai_chips","software"],"AI ETFs":["etf"],"AI crypto":["crypto"],"All of it":["ai_chips","power"]};
function authed(){return !!document.getElementById("sa-acct");}
function build(){
  var run=document.getElementById("xc-run"),gate=document.getElementById("xc-gate");
  gate.hidden=true; run.hidden=false;
  run.innerHTML='<p class="lead">Four steps. No personas — the output is a terminal configuration.</p>'+
   '<div class="xc-grid"><div class="xc-panel">'+
   STEPS.map(function(st){return '<div class="xc-step" data-step="'+st.id+'"><h3>'+st.t+'</h3><p>'+st.p+'</p>'+
     '<div class="xc-chips">'+st.o.map(function(o){return '<button class="xc-chip" data-v="'+o+'">'+o+'</button>';}).join("")+'</div></div>';}).join("")+
   '<p style="margin:14px 0 0"><button class="xc-cta" id="xc-save">Save calibration</button> '+
   '<a class="xc-alt" href="/terminal" id="xc-skip">Skip — open the terminal</a></p></div>'+
   '<div class="xc-panel" id="xc-out"><p class="xc-klabel">Output preview</p><p style="font-size:13px;color:var(--muted)">Pick options to preview your configuration.</p></div></div>';
  run.addEventListener("click",function(e){
    var c=e.target.closest(".xc-chip"); if(c){var g=c.closest(".xc-step");
      g.querySelectorAll(".xc-chip").forEach(function(x){x.classList.remove("on");}); c.classList.add("on"); preview();}
  });
  document.getElementById("xc-save").addEventListener("click",save);
  document.getElementById("xc-skip").addEventListener("click",function(){ if(window.SantroEvents)SantroEvents.track("calibration_skipped",{});});
}
function picks(){var out={};document.querySelectorAll(".xc-step").forEach(function(g){
  var on=g.querySelector(".xc-chip.on"); if(on)out[g.dataset.step]=on.dataset.v;});return out;}
function preview(){
  var p=picks(), el=document.getElementById("xc-out");
  fetch("/universe.json?t="+Date.now()).then(function(r){return r.json();}).then(function(u){
    var all=[];u.bubbles.forEach(function(b){b.tickers.forEach(function(t){t._b=b.id;all.push(t);});});
    all.sort(function(a,b){return (b.market_cap_b||0)-(a.market_cap_b||0);});
    var wl=all.slice(0,10).map(function(t){return t.ticker;});
    el.innerHTML='<p class="xc-klabel">Output preview</p>'+
     '<div class="xc-row"><b>Universe</b><span>'+(p.universe||"—")+'</span></div>'+
     '<div class="xc-row"><b>Concentration</b><span>'+(p.conc||"—")+'</span></div>'+
     '<div class="xc-row"><b>Lens</b><span>'+(p.lens||"—")+'</span></div>'+
     '<div class="xc-row"><b>Risk view</b><span>'+(p.risk||"—")+'</span></div>'+
     '<div class="xc-row"><b>Suggested watchlist</b><span>'+wl.slice(0,5).join(" · ")+' +5</span></div>'+
     '<p style="font-size:11.5px;color:var(--faint);margin:10px 0 0">Editable after save. Scenario outputs, not advice.</p>';
  });
}
function save(){
  var p=picks();
  if(Object.keys(p).length<4){alert("Pick one option in each step.");return;}
  try{localStorage.setItem("santro_calibration",JSON.stringify({v:1,at:Date.now(),picks:p}));}catch(e){}
  if(window.SantroEvents)SantroEvents.track("calibration_completed",{});
  var el=document.getElementById("xc-out");
  el.insertAdjacentHTML("beforeend",'<p style="margin:12px 0 0"><a class="xc-cta" href="/terminal">Open your terminal</a></p>');
}
var built=false;
function tryBuild(){ if(!built&&authed()){built=true;build();} }
tryBuild();
var slot=document.getElementById("santro-auth-slot");
if(slot&&window.MutationObserver){ new MutationObserver(tryBuild).observe(slot,{childList:true,subtree:true}); }
setInterval(tryBuild,2000); // cheap safety net (covers sign-in from another tab)
})();
</script>
```

---

## File 6 — `santro-ai/terminal.html — lines 1096-1847: the ENTIRE terminal application script + trailing includes (file is 1847 lines; lines 1-1095 are meta/CSS/nav/footer markup with no logic)`

**Why it matters:** the page the user is told they are customizing. This is the full
runtime logic of /terminal.
**Claims it supports:** (a) it fetches ONLY static market JSON (universe/data/hot_tickers/
news/bubble_index...) — there is no SantroAPI/preferences/watchlist/calibration read
anywhere in it; (b) its only personalization is the theme key `santro-theme` from
localStorage; (c) the calculator mounts via `SantroCalc.render(t)` on ticker select —
the ONLY account-aware surface on the page; (d) live probe confirmed: an anonymous load
makes exactly 4 API calls (me 401, methods 200, refresh 401, usage/status 200), zero
preference/watchlist reads.
**Reviewer should verify:** search this extract for "preferences", "watchlist",
"calibration", "SantroAPI" — expect only the SantroCalc.render mount and theme handling.
Confirm the layout/sections are hard-coded with no conditional rendering per user.

```html
<script>
const fmtPct = x => (x>=0?"+":"") + x.toFixed(2) + "%";
function fmtCap(n){
  if(n>=1e12) return "$"+(n/1e12).toFixed(2)+"T";
  if(n>=1e9)  return "$"+(n/1e9).toFixed(1)+"B";
  if(n>=1e6)  return "$"+(n/1e6).toFixed(1)+"M";
  return "$"+Math.round(n);
}
function timeAgo(iso){
  if(!iso) return "";
  const m=Math.round((Date.now()-new Date(iso))/60000);
  if(isNaN(m)) return "";
  if(m<60) return m+"m ago";
  const h=Math.round(m/60); if(h<24) return h+"h ago";
  return Math.round(h/24)+"d ago";
}
// ±10% scale with distinct bands — deep red … light red, slate at flat,
// light green … deep green (multi-stop, piecewise linear)
const HEAT_STOPS=[
  [-10,[112,15,25]], [-6,[185,28,28]], [-3,[239,68,68]], [-1,[247,123,123]],
  [0,[38,42,46]],
  [1,[105,205,145]], [3,[34,197,94]], [6,[21,128,61]], [10,[10,82,45]],
];
function colorFor(pct){
  const x=Math.max(-10, Math.min(10, pct||0));
  for(let i=0;i<HEAT_STOPS.length-1;i++){
    const [a,ca]=HEAT_STOPS[i], [b,cb]=HEAT_STOPS[i+1];
    if(x>=a && x<=b){
      const t=(x-a)/((b-a)||1);
      return `rgb(${ca.map((v,k)=>Math.round(v+(cb[k]-v)*t)).join(",")})`;
    }
  }
  return "rgb(38,42,46)";
}
const pctClass = x => x>=0 ? "up":"down";

const chart=echarts.init(document.getElementById("chart"),null,{renderer:"canvas"});
let stocks=[], selectedSymbol=null, heatMode="universe";
let research=null, asOfUtc=null;   // research.json cards + quote timestamp
let takeaways=null;                // takeaways/takeaways.json (4-hour cycle)
let tkExpanded=false;              // "See more" state — survives the 60s auto-refresh
let hotData=null;                  // hot_tickers.json — 15-min hot-tickers scan (hot-tickers/SPEC.md)
let bubbleIx=null;                  // bubble_index.json — AI bubble-risk index + history (homepage band)
let universe=null, uniGroup=null;  // universe.json — AI universe (count from meta.total_tickers) in 7 themed bubbles
let eco=null;                      // ecosystem.json — 30-name NVIDIA Ecosystem basket
let newsFeed=null;                 // news.json — deduped headlines for the FULL scope (universe + ETFs)
let tweets=null;                   // tweets.json — @DeItaone SPCX squawk via Telegram mirror

// short labels that fit inside small group bubbles (full label in tooltip/detail)
const UNI_SHORT={
  ai_chips_and_compute:"Chips & Compute",
  ai_software_and_cloud_infrastructure:"Software & Cloud",
  ai_applications_and_data_software:"Apps & Data",
  chip_equipment_and_ai_hardware:"Equip & HW",
  ai_platforms_internet_and_adtech:"Platforms & Ads",
  data_center_power_and_energy:"DC Power",
  applied_ai_industrial_defense_and_vertical:"Applied AI",
};
// sector icons (lucide-style line art, white stroke) as SVG data-URIs
const UNI_ICONS=(()=>{
  const wrap=p=>"data:image/svg+xml;utf8,"+encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`);
  return {
    ai_chips_and_compute: wrap('<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="10" y="10" width="4" height="4"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>'),
    ai_software_and_cloud_infrastructure: wrap('<path d="M17.5 19H6.3A4.3 4.3 0 0 1 5.4 10.5a7 7 0 0 1 13.6 1.9A3.8 3.8 0 0 1 17.5 19z"/>'),
    ai_applications_and_data_software: wrap('<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>'),
    chip_equipment_and_ai_hardware: wrap('<rect x="3" y="3.5" width="18" height="7" rx="2"/><rect x="3" y="13.5" width="18" height="7" rx="2"/><path d="M7 7h.01M7 17h.01"/>'),
    ai_platforms_internet_and_adtech: wrap('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M9 21h6M12 17v4"/><path d="M8 13v-2.5M12 13V8M16 13v-4"/>'),
    data_center_power_and_energy: wrap('<polygon points="13 2 4 14 11.5 14 11 22 20 10 12.5 10 13 2"/>'),
    applied_ai_industrial_defense_and_vertical: wrap('<circle cx="9.5" cy="9.5" r="3.6"/><circle cx="14.5" cy="9.5" r="3.6"/><circle cx="9.5" cy="14.5" r="3.6"/><circle cx="14.5" cy="14.5" r="3.6"/>'),
  };
})();
function hexToRgba(hex,a){
  const h=hex.replace("#","");
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;
}
const fmtVol=v=>v==null?"—":v>=1e9?(v/1e9).toFixed(1)+"B":v>=1e6?(v/1e6).toFixed(1)+"M":v>=1e3?(v/1e3).toFixed(0)+"K":""+v;

// ---- cryptobubbles-style helpers ----------------------------------------------
// SPCX: parqet still serves the old AXS SPAC ETF logo for this ticker — use our local SpaceX mark
const logoUrl = sym => sym==="SPCX" ? "assets/spacex.png"
  : `https://assets.parqet.com/logos/symbol/${encodeURIComponent(sym.split(".")[0])}?format=png&size=64`;
function heatDark(pct){            // dark bubble core, tinted toward the heat color
  const m=colorFor(pct).match(/\d+/g).map(Number);
  return `rgb(${m.map(v=>Math.round(v*0.30+8)).join(",")})`;
}
const heatText = pct => (pct>=0 ? "#8df0b4" : "#ff9aa2");
const tfChip=(k,v)=>`<div class="score-chip"><span class="k">${k}</span><span class="${(v??0)>=0?"up":"down"}">${v==null?"—":fmtPct(v)}</span></div>`;
function sparkSvg(s){
  const w=260,h=56,min=Math.min(...s),max=Math.max(...s),rng=(max-min)||1;
  const pts=s.map((v,i)=>`${(i/(s.length-1)*w).toFixed(1)},${(h-4-((v-min)/rng)*(h-8)).toFixed(1)}`).join(" ");
  const col=(s[s.length-1]>=s[0])?"#22c55e":"#f05a6e";
  return `<div class="sec-label">Last 60 sessions</div>
   <svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block">
     <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2"/></svg>`;
}

// ---- floating-bubble physics (cryptobubbles-style drift) -----------------------
let simNodes=null, simBounds=null, motionTimer=null;
// largest font (capped) at which `len` characters fit across the circle's usable width
function fitFs(len, r, cap){
  return Math.max(7, Math.min(cap, Math.floor((r*1.62)/(0.62*Math.max(len,3)))));
}

function bubbleItem(n){
  if(n.kind==="sector"){
    // reference style: near-black core, thin clean ring, icon / name / $cap / ±%
    const g=n.obj, avg=g.avg_change_pct||0, heat=colorFor(avg);
    const m=heat.match(/\d+/g).map(Number);
    const core=`rgb(${m.map(v=>Math.round(v*0.18+7)).join(",")})`;
    const name=UNI_SHORT[g.id]||g.label;
    const fs=Math.max(9, fitFs(name.length, n.r, 16));
    const showIcon = n.r>=46;
    const showCap = n.r>=34;
    const isz=Math.max(14, Math.min(26, Math.round(n.r*0.26)));
    const icon=showIcon ? UNI_ICONS[g.id] : null;
    const rich={
      nm:{color:"#fff",fontWeight:700,fontSize:fs,lineHeight:Math.round(fs*1.6),align:"center"},
      pc:{color:heatText(avg),fontWeight:700,fontSize:Math.max(9,Math.round(fs*0.85)),lineHeight:Math.round(fs*1.35),align:"center"}};
    let fmt=`{nm|${name}}`;
    if(icon){ rich.ic={backgroundColor:{image:icon},width:isz,height:isz,align:"center"}; fmt=`{ic|}\n`+fmt; }
    if(showCap){ rich.cap={color:"rgba(255,255,255,.55)",fontWeight:600,fontSize:Math.max(8,Math.round(fs*0.8)),lineHeight:Math.round(fs*1.25),align:"center"}; fmt+=`\n{cap|${fmtCap(g.total_market_cap_b*1e9)}}`; }
    fmt+=`\n{pc|${fmtPct(avg)}}`;
    return {value:[n.x,n.y], symbolSize:n.r*2, group:g,
      itemStyle:{color:core, borderColor:heat, borderWidth:2, shadowBlur:0},
      label:{show:true, position:"inside", align:"center", verticalAlign:"middle", formatter:fmt, rich}};
  }
  const x=n.obj, sym=x.ticker;   // post-sector path is always a universe/eco ticker
  const pct=x.change_pct||0, heat=colorFor(pct);
  const txt=sym;
  // font fits BOTH the radius and the text's width across the circle
  const fs=Math.min(Math.max(9, Math.round(n.r*0.30)), fitFs(txt.length, n.r, 22));
  const pcFs=Math.max(8, Math.round(fs*0.82));
  const showLabel = n.r>=13 && fs>=8;
  const ls=Math.round(n.r*0.5);
  const showLogo = n.r>30 && !sym.includes(".")
    && (ls + fs*1.35 + pcFs*1.2) < n.r*1.7;   // whole stack must fit vertically
  const sel=sym===selectedSymbol;
  const rich={
    tk:{color:"#fff",fontWeight:700,fontSize:fs,lineHeight:Math.round(fs*1.35),align:"center"},
    pc:{color:heatText(pct),fontWeight:600,fontSize:pcFs,lineHeight:Math.round(pcFs*1.3),align:"center"}};
  let fmt="";
  if(showLogo){
    rich.lg={backgroundColor:{image:logoUrl(sym)},width:ls,height:ls,borderRadius:ls/2,align:"center"};
    fmt+="{lg|}\n";
  }
  fmt+=`{tk|${txt}}\n{pc|${fmtPct(pct)}}`;
  return {value:[n.x,n.y], symbolSize:n.r*2, uniTicker:x,
    itemStyle:{color:heatDark(pct),
      borderColor:sel?"#ffffff":heat,
      borderWidth:sel?3.5:Math.max(2,Math.round(n.r*0.09)),
      shadowColor:heat, shadowBlur:Math.max(8,Math.round(n.r*0.35))},
    label:{show:showLabel, position:"inside", align:"center", verticalAlign:"middle",
      formatter:fmt, rich}};
}
function stopMotion(){ if(motionTimer){ clearInterval(motionTimer); motionTimer=null; } }
function startMotion(){
  stopMotion();
  motionTimer=setInterval(()=>{
    if(!simNodes || document.hidden) return;
    const {W,H}=simBounds;
    for(const n of simNodes){
      n.x+=n.vx; n.y+=n.vy;
      if(n.x-n.r<2){n.x=n.r+2; n.vx=Math.abs(n.vx);}  if(n.x+n.r>W-2){n.x=W-2-n.r; n.vx=-Math.abs(n.vx);}
      if(n.y-n.r<2){n.y=n.r+2; n.vy=Math.abs(n.vy);}  if(n.y+n.r>H-2){n.y=H-2-n.r; n.vy=-Math.abs(n.vy);}
    }
    for(let i=0;i<simNodes.length;i++) for(let j=i+1;j<simNodes.length;j++){
      const a=simNodes[i], b=simNodes[j];
      const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||1, min=a.r+b.r+2;
      if(d<min){
        const ux=dx/d, uy=dy/d, ov=(min-d)/2;
        a.x-=ux*ov; a.y-=uy*ov; b.x+=ux*ov; b.y+=uy*ov;
        let t=a.vx; a.vx=b.vx; b.vx=t; t=a.vy; a.vy=b.vy; b.vy=t;
      }
    }
    chart.setOption({series:[{animation:false, data:simNodes.map(bubbleItem)}]});
  }, 50);
}

// ---- day / night theme -------------------------------------------------------
const currentTheme = () => document.documentElement.dataset.theme==="light" ? "light" : "dark";
function chartTheme(){            // chart colors that CSS variables can't reach
  const l = currentTheme()==="light";
  return {
    bubbleBorder: l ? "#f3f5f8" : "rgba(10,14,19,.9)",
    ring:         l ? "#2f6fd0" : "#5b9df0",
    ringHover:    l ? "#2059b8" : "#7cb0f5",
    ttBg:         l ? "#ffffff" : "#111822",
    ttBorder:     l ? "#d9dfe7" : "#1d2733",
    ttText:       l ? "#1b242f" : "#e7edf3",
  };
}
function applyTheme(mode, save){
  document.documentElement.dataset.theme = mode;
  const lbl = document.getElementById("tt-label");
  if(lbl) lbl.textContent = mode==="dark" ? "NIGHTMODE" : "DAYMODE";   // pill shows the CURRENT mode
  const btn = document.getElementById("theme-toggle");
  if(btn) btn.classList.toggle("day", mode==="light");
  if(save) try{ localStorage.setItem("santro-theme", mode); }catch(e){}
  if(stocks.length) render();    // repaint bubbles with themed borders/tooltip
}

// "Jun 10, 16:22 ET" — the quote time on the NY exchange clock
function etTime(iso){
  if(!iso) return "";
  try{
    return new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",
      month:"short", day:"numeric", hour:"numeric", minute:"2-digit", hour12:false})
      .format(new Date(iso)) + " ET";
  }catch(e){ return ""; }
}
function fmtDay(isoDate){           // "2026-06-09" -> "Jun 9"
  if(!isoDate) return "";
  try{
    return new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",
      month:"short", day:"numeric"}).format(new Date(isoDate+"T12:00:00Z"));
  }catch(e){ return isoDate; }
}
const chip=(k,v,title)=>`<div class="score-chip"${title?` title="${title}"`:""}><span class="k">${k}</span>${v??"—"}</div>`;
const fnum2=x=>x==null?"—":Number(x).toFixed(2);

// thesis + method scores + signed-report link for a symbol (if researched)
function researchExtras(sym){
  const r=research&&research.stocks?research.stocks[sym]:null;
  if(!r) return "";
  const macro=(research.macro||{});
  let h=`<div class="thesis">${r.thesis||""}</div>`;
  h+=`<div class="sec-label">Method scores · signed ${research.signed}</div><div class="chips">`;
  h+=chip("Technical", r.scores.technical);
  h+=chip("Narrative", r.scores.narrative, r.target?`Mean target $${fnum2(r.target)} (${r.analysts||"—"} analysts)`:"");
  h+=chip("Macro", macro.score, macro.note||"");
  h+=chip("Entry zone", r.scores.entry_zone);
  h+=chip("R:R", r.scores.rr!=null?r.scores.rr+":1":null, "Reward to mean target vs structural stop (SMA50 / 20d swing low)");
  h+=`</div>`;
  return h;
}

// Bubble layout: biggest first, each next circle spirals out until it finds
// a free spot. Every ticker gets at least `minR`, so small caps stay visible.
function packBubbles(items, key, W, H){
  const maxV = Math.max(...items.map(x=>x[key]));
  const maxR = Math.min(W,H)*0.22;
  const minR = Math.max(22, Math.min(W,H)*0.06);
  const nodes = items.map(x=>({it:x, r:Math.max(minR, maxR*Math.sqrt(x[key]/maxV))}))
                     .sort((a,b)=>b.r-a.r);
  const placed=[];
  for(const n of nodes){
    if(!placed.length){ n.x=0; n.y=0; placed.push(n); continue; }
    for(let t=0.1;; t+=0.07){
      const x=2.1*t*Math.cos(t), y=2.1*t*Math.sin(t)*0.8;
      const free=placed.every(p=>{const dx=p.x-x, dy=p.y-y;
        return dx*dx+dy*dy >= (p.r+n.r+4)*(p.r+n.r+4);});
      if(free || t>2500){ n.x=x; n.y=y; break; }
    }
    placed.push(n);
  }
  // scale + center the cluster to fill the panel
  const minX=Math.min(...placed.map(p=>p.x-p.r)), maxX=Math.max(...placed.map(p=>p.x+p.r));
  const minY=Math.min(...placed.map(p=>p.y-p.r)), maxY=Math.max(...placed.map(p=>p.y+p.r));
  const pad=10, s=Math.min((W-2*pad)/(maxX-minX), (H-2*pad)/(maxY-minY), 1.2);
  const ox=(W-(maxX-minX)*s)/2 - minX*s, oy=(H-(maxY-minY)*s)/2 - minY*s;
  placed.forEach(p=>{ p.x=p.x*s+ox; p.y=p.y*s+oy; p.r*=s; });
  return placed;
}

function render(){
  const W = chart.getWidth()||516, H = chart.getHeight()||384;
  const th = chartTheme();
  const lightUI = currentTheme()==="light";
  const pageBg = lightUI ? "#f3f5f8" : "#0a0e13";

  const ttFormatter = p=>{
    if(p.data.group){const g=p.data.group; const c=g.avg_change_pct>=0?"#22c55e":"#f05a6e";
      return `<b>${g.label}</b><br/>${g.count} names · ${fmtCap(g.total_market_cap_b*1e9)} combined<br/>`
           + `<span style="color:${c}">${fmtPct(g.avg_change_pct)} avg of members today</span><br/>`
           + `<span style="opacity:.7">Industries: ${g.industries_included.join(", ")}</span><br/>`
           + `<span style="opacity:.7">click to drill into members ↓</span>`;}
    if(p.data.uniTicker){const t=p.data.uniTicker; const c=t.change_pct>=0?"#22c55e":"#f05a6e";
      return `<b>${t.ticker}</b> · ${t.company}<br/>`
           + `<span style="color:${c}">${fmtPct(t.change_pct)}</span> &nbsp; $${(t.price??0).toFixed(2)}<br/>`
           + `Cap ${fmtCap(t.market_cap_b*1e9)} · Vol ${fmtVol(t.volume)} · P/E ${t.pe==null?"—":t.pe}<br/>`
           + `<span style="opacity:.7">${t.industry}</span>`;}
    return "";
  };
  const tooltip = {borderColor:th.ttBorder, backgroundColor:th.ttBg,
    textStyle:{color:th.ttText,fontSize:12}, formatter:ttFormatter};

  stopMotion();
  // ---- all views are floating heat bubbles; sectors are just bigger bubbles ----
  let items, kind;
  if(heatMode==="universe" && universe && !uniGroup){ kind="sector"; items=universe.bubbles; }
  else if(heatMode==="universe" && universe && uniGroup){ kind="uni"; items=uniGroup.tickers; }
  else if(heatMode==="eco" && eco){ kind="uni"; items=eco.tickers; }
  else { return; }   // no data loaded yet — nothing to draw
  // bubble size = magnitude of the day move (cryptobubbles semantics);
  // +0.5 floor keeps flat names visible, minR in packBubbles keeps them readable
  const key="_sz";
  items.forEach(o=>{ o._sz = Math.abs((o.change_pct!=null ? o.change_pct : o.avg_change_pct)||0) + 0.5; });
  simNodes = packBubbles(items, key, W, H).map(n=>({
    x:n.x, y:n.y, r:n.r,
    vx:(Math.random()-0.5)*0.7, vy:(Math.random()-0.5)*0.7,
    obj:n.it, kind,
  }));
  simBounds = {W, H};
  chart.setOption({
    backgroundColor:"transparent",
    grid:{left:0, right:0, top:0, bottom:0},
    xAxis:{show:false, min:0, max:W},
    yAxis:{show:false, min:0, max:H},
    tooltip,
    series:[{type:"scatter", data:simNodes.map(bubbleItem), animationDuration:380,
      emphasis:{itemStyle:{borderColor:"#fff", borderWidth:3}}}],
  }, true);
  startMotion();
}


function showGroupDetail(g){
  document.getElementById("detail-title").innerHTML=
    `Sector — ${UNI_SHORT[g.id]||g.label} <span class="badge live">AI Universe</span>`;
  const rows=g.tickers.map(t=>`
      <tr><td><a href="t?sym=${encodeURIComponent(t.ticker)}" title="Open the ${t.ticker} page">${t.ticker}</a></td>
        <td class="num">$${(t.price??0).toFixed(2)}</td>
        <td class="num ${pctClass(t.change_pct)}">${fmtPct(t.change_pct)}</td>
        <td class="num">${t.market_cap_b?fmtCap(t.market_cap_b*1e9):"—"}</td></tr>`).join("");
  document.getElementById("detail").innerHTML=`
    <div class="d-head"><span class="d-sym" style="font-size:19px">${g.label}</span>
      <span class="d-pct ${pctClass(g.avg_change_pct)}">${fmtPct(g.avg_change_pct)} avg</span></div>
    <div class="d-stats">
      <div class="d-stat"><div class="k">Combined market cap</div><div class="v">${fmtCap(g.total_market_cap_b*1e9)}</div></div>
      <div class="d-stat"><div class="k">Members</div><div class="v">${g.count} tickers</div></div>
    </div>
    <div class="sec-label">Members · ticker opens its page</div>
    <table class="sect-tbl"><thead>
      <tr><th>Ticker</th><th class="num">Price</th><th class="num">1D</th><th class="num">Cap</th></tr></thead>
      <tbody>${rows}</tbody></table>
    <div class="sec-label">Finviz industries merged into this sector</div>
    <div class="chips">${g.industries_included.map(i=>`<span class="chip">${i}</span>`).join("")}</div>`;
}

function showEcoOverview(){
  document.getElementById("detail-title").innerHTML=
    `NVIDIA Ecosystem <span class="badge live">${eco.tickers.length} names</span>`;
  const rows=eco.tickers.map(t=>`
      <tr><td><a href="t?sym=${encodeURIComponent(t.ticker)}" title="Open the ${t.ticker} page">${t.ticker}</a></td>
        <td class="num">$${(t.price??0).toFixed(2)}</td>
        <td class="num ${pctClass(t.change_pct)}">${fmtPct(t.change_pct)}</td>
        <td class="num">${t.market_cap_b?fmtCap(t.market_cap_b*1e9):"—"}</td></tr>`).join("");
  document.getElementById("detail").innerHTML=`
    <div class="sec-label" style="margin-top:0">All members by market cap · ticker opens its page · click a bubble for the full card</div>
    <table class="sect-tbl"><thead>
      <tr><th>Ticker</th><th class="num">Price</th><th class="num">1D</th><th class="num">Cap</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
}

function showUniverseDetail(t){
  document.getElementById("detail-title").innerHTML=
    `Selected — ${t.ticker} <span class="badge live">${uniGroup?(UNI_SHORT[uniGroup.id]||uniGroup.label):(heatMode==="eco"?"NVIDIA Ecosystem":"AI Universe")}</span>`;
  document.getElementById("detail").innerHTML=`
    <div class="d-head"><span class="d-sym">${t.ticker}</span><span class="d-name">${t.company}</span>
      <span class="d-pct ${pctClass(t.change_pct)}">${fmtPct(t.change_pct)}</span></div>
    <div class="d-stats">
      <div class="d-stat"><div class="k">Price</div><div class="v">$${(t.price??0).toFixed(2)}</div></div>
      <div class="d-stat"><div class="k">Market cap</div><div class="v">${fmtCap(t.market_cap_b*1e9)}</div></div>
      <div class="d-stat"><div class="k">Finviz industry</div><div class="v" style="font-size:13px">${t.industry}</div></div>
      <div class="d-stat"><div class="k">P/E · Volume</div><div class="v">${t.pe==null?"—":t.pe} · ${fmtVol(t.volume)}</div></div>
    </div>
    ${t.perf?`<div class="sec-label">Performance</div><div class="chips">
      ${tfChip("1D",t.change_pct)}${tfChip("1W",t.perf["1W"])}${tfChip("1M",t.perf["1M"])}${tfChip("1Y",t.perf["1Y"])}
    </div>`:""}
    ${t.spark&&t.spark.length>2?sparkSvg(t.spark):""}
    ${researchExtras(t.ticker)}
    <div class="links">
      <a class="see-more" href="t?sym=${encodeURIComponent(t.ticker)}">Ticker page ↗</a>
      <a class="see-more" href="https://finance.yahoo.com/quote/${t.ticker}" target="_blank" rel="noopener">Yahoo Finance →</a>
    </div>`;
  if(window.SantroCalc) SantroCalc.render(t);   // gated fair-value calculator (accounts/)
}

function allHeadlines(){
  const seen=new Set(), out=[];
  for(const s of stocks) for(const h of (s.headlines||[])){
    if(!h.title||seen.has(h.title))continue; seen.add(h.title); out.push({...h,symbol:s.symbol});}
  out.sort((a,b)=>new Date(b.published||0)-new Date(a.published||0));
  return out;
}
function renderNews(){
  // full-scope feed (universe + ETFs, deduped, sector-tagged) with fallback to
  // the legacy per-watchlist headlines from data.json
  let items;
  if(newsFeed && newsFeed.items && newsFeed.items.length){
    items = newsFeed.items.map(h=>({...h, symbol:(h.tickers||[])[0]||""}));
  } else {
    items = allHeadlines().map(h=>({...h, tickers:[h.symbol], sectors:[]}));
  }
  const secLabel = id => id&&id.startsWith("etf_") ? id.replace("etf_","").toUpperCase()+" ETF" : (UNI_SHORT[id]||"");
  document.getElementById("news").innerHTML=items.slice(0,18).map(h=>{
    const tks=(h.tickers||[]).slice(0,3).map(t=>`<span class="chip">${t}</span>`).join("");
    const more=(h.tickers||[]).length>3?`<span class="chip">+${h.tickers.length-3}</span>`:"";
    const secs=[...new Set((h.sectors||[]).map(secLabel).filter(Boolean))].slice(0,2).join(" · ");
    return `
    <div class="news-row"><a href="${h.url}" target="_blank" rel="noopener">${h.title}</a>
      <div class="meta">${tks}${more}<span>${h.publisher||""}</span>
        <span>${h.published?"· "+timeAgo(h.published):""}</span>${secs?`<span>· ${secs}</span>`:""}</div></div>`;
  }).join("")||"No headlines.";
}
// manual refresh: force-pull the latest published news.json and re-render.
// (The feed itself is rebuilt server-side every ~20 min, 24/7; this grabs
// whatever's newest on demand, between auto-refresh cycles.)
async function refreshNews(btn){
  if(btn){ btn.classList.add("spin"); btn.disabled=true; }
  try{ newsFeed=await (await fetch("news.json?t="+Date.now())).json(); }catch(e){}
  renderNews();
  if(btn) setTimeout(()=>{ btn.classList.remove("spin"); btn.disabled=false; }, 450);
}
// click-through from Hot Tickers (and anywhere) to the bubble info card:
// drills the chart into the ticker's sector, selects its bubble, fills the detail panel
function openTicker(sym){
  const setSeg = mode => document.querySelectorAll(".seg-btn[data-mode]")
    .forEach(x=>x.classList.toggle("active", x.dataset.mode===mode));
  if(universe){
    for(const b of universe.bubbles){
      const t = b.tickers.find(x=>x.ticker===sym);
      if(t){
        heatMode="universe"; uniGroup=b; selectedSymbol=sym;
        setSeg("universe"); applyHeat();
        return;
      }
    }
  }
  // ecosystem-only names (SNDK, KEYS, …) drill the eco basket — never Yahoo
  if(eco && eco.tickers.some(x=>x.ticker===sym)){
    heatMode="eco"; selectedSymbol=sym;
    setSeg("eco"); applyHeat();
    return;
  }
  // not on the map at all: our ticker page for US names, Yahoo only for
  // foreign-suffix symbols the site has no page data for
  if(sym.includes(".")) window.open("https://finance.yahoo.com/quote/"+sym, "_blank", "noopener");
  else location.href="t?sym="+encodeURIComponent(sym);
}

// ---- AI trade in 60 seconds + AI bubble risk (homepage band, #6 + #10) ----
function riskColor(v){ if(v==null) return "#8895a4"; if(v<25) return "#22c55e"; if(v<45) return "#69cd91";
  if(v<60) return "#e0a73f"; if(v<80) return "#f05a6e"; return "#b91c1c"; }
function pillarDriver(ix){
  const P=[["valuation","Valuation"],["capitalFlows","Market Concentration"],["adoption","Momentum & Technical"],
           ["sentiment","Sentiment & Hype"],["systemicRisk","Systemic Risk"]];
  let best=null; P.forEach(([k,nm])=>{ if(ix[k]!=null && (!best||ix[k]>best.v)) best={nm,v:ix[k]}; });
  return best; }
function briefSpark(hist,w=150,h=30){
  const vs=(hist||[]).map(p=>p.v).filter(v=>v!=null).slice(-60); if(vs.length<2) return "";
  const mn=Math.min(...vs),mx=Math.max(...vs),rng=(mx-mn)||1;
  const pts=vs.map((v,i)=>`${(i/(vs.length-1)*w).toFixed(1)},${(h-2-((v-mn)/rng)*(h-4)).toFixed(1)}`).join(" ");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block;max-width:100%"><polyline points="${pts}" fill="none" stroke="${riskColor(vs[vs.length-1])}" stroke-width="1.6"/></svg>`;
}
function renderBrief(){
  const el=document.getElementById("brief"); if(!el) return;
  if(!universe||!universe.bubbles||!universe.bubbles.length){ el.style.display="none"; return; }
  el.style.display="";
  const tk=[]; universe.bubbles.forEach(b=>b.tickers.forEach(t=>{ if(t.change_pct!=null) tk.push(t); }));
  const secs=universe.bubbles.filter(b=>b.avg_change_pct!=null);
  const tot=tk.length, up=tk.filter(t=>t.change_pct>0).length;
  const breadth=tot?Math.round(up/tot*100):0;
  const mood=breadth>=58?"Risk-on":breadth<=42?"Risk-off":"Mixed";
  const moodCls=breadth>=58?"up":breadth<=42?"down":"";
  const sBy=[...secs].sort((a,b)=>b.avg_change_pct-a.avg_change_pct);
  const strong=sBy[0], weak=sBy[sBy.length-1];
  const byMove=[...tk].sort((a,b)=>Math.abs(b.change_pct)-Math.abs(a.change_pct));
  const top=byMove[0]||{ticker:"—",change_pct:0};
  let weird, weirdTag;
  const nn=((hotData&&hotData.hot_tickers)||[]).find(t=>t.catalyst_type==="no_news_mover");
  if(nn){ weird={ticker:nn.ticker,change_pct:nn.move_pct}; weirdTag="no catalyst"; }
  else { const w=byMove.find(t=>t.ticker!==top.ticker && (t.market_cap_b||9999)<60)||byMove[1]||top;
    weird=w; weirdTag=(w.market_cap_b||0)<60?"small-cap":"outlier"; }
  const ix=(bubbleIx&&bubbleIx.index)||null;
  const clk=(document.getElementById("asof")?.textContent||"").replace("As of ","");
  let riskTile;
  if(ix){
    const hist=bubbleIx.history||[];
    const prev=hist.length>=2?hist[hist.length-2].v:ix.overall;
    const delta=+(ix.overall-prev).toFixed(1);
    const arrow=delta>0?`▲ ${Math.abs(delta)}`:delta<0?`▼ ${Math.abs(delta)}`:"flat";
    const aCls=delta>0?"down":delta<0?"up":"";   // risk rising = red, falling = green
    const drv=pillarDriver(ix);
    riskTile=`<div class="bt risk">
      <div class="k">AI bubble risk today</div>
      <div class="top"><span class="num" style="color:${riskColor(ix.overall)}">${Math.round(ix.overall)}</span>
        <span class="s">/100 · ${ix.label||""}</span>
        <span class="s ${aCls}" style="font-weight:700">${arrow} vs prev</span></div>
      <div class="s">Top driver: ${drv?drv.nm+" ("+Math.round(drv.v)+")":"—"}</div>
      <div class="spark">${briefSpark(hist)}</div>
      <a class="rsh" href="/share?card=risk">Share risk card ↗</a></div>`;
  } else {
    riskTile=`<div class="bt risk"><div class="k">AI bubble risk today</div><div class="s">Index feed connecting…</div></div>`;
  }
  let note;
  if(ix && breadth>=58 && ix.overall>=58) note=`Broad green across the AI tape, but the bubble gauge is hot at ${Math.round(ix.overall)} — strength and froth at once.`;
  else if(ix && breadth<=42 && ix.overall<45) note=`The tape is mostly red, yet the bubble gauge is calm at ${Math.round(ix.overall)} — fear without froth.`;
  else if(nn && top && nn.ticker===top.ticker && Math.abs(top.change_pct)>6) note=`${top.ticker} leads the board with no clear catalyst — that's attention, not news.`;
  else if(strong && weak) note=`${strong.label} leads while ${weak.label} lags — rotation within the AI trade, not a one-way move.`;
  else note=`Mixed tape — no single signal dominates this session.`;
  el.innerHTML=`
    <div class="brief-head"><span class="t">⚡ AI trade in 60 seconds</span>
      <span class="clk">${clk}</span>
      <a class="sh" href="/share?card=sixty">Share ↗</a></div>
    <div class="brief-grid">
      ${riskTile}
      <div class="bt"><div class="k">Market mood</div><div class="v ${moodCls}">${mood}</div><div class="s">${breadth}% of ${tot} up</div></div>
      <div class="bt" title="${strong?strong.label:""}"><div class="k">Strongest sector</div><div class="v up">${strong?(UNI_SHORT[strong.id]||strong.label):"—"}</div><div class="s up">${strong?fmtPct(strong.avg_change_pct):""}</div></div>
      <div class="bt" title="${weak?weak.label:""}"><div class="k">Weakest sector</div><div class="v down">${weak?(UNI_SHORT[weak.id]||weak.label):"—"}</div><div class="s down">${weak?fmtPct(weak.avg_change_pct):""}</div></div>
      <div class="bt"><div class="k">Top mover</div><div class="v ${top.change_pct>=0?'up':'down'}" style="cursor:pointer" onclick="openTicker('${top.ticker}')">${top.ticker}</div><div class="s ${top.change_pct>=0?'up':'down'}">${fmtPct(top.change_pct)}</div></div>
      <div class="bt"><div class="k">Weirdest mover</div><div class="v ${weird.change_pct>=0?'up':'down'}" style="cursor:pointer" onclick="openTicker('${weird.ticker}')">${weird.ticker}</div><div class="s">${fmtPct(weird.change_pct)} · ${weirdTag}</div></div>
    </div>
    <div class="brief-note"><b>Contrarian read:</b> ${note}</div>`;
}

function renderSamples(){
  const rb=document.getElementById("runners-badge");
  // Hot tickers (15-min scan) — replaces small-cap runners; hot = attention, not direction
  if(hotData && hotData.hot_tickers && hotData.hot_tickers.length){
    if(rb){ rb.textContent=`Auto · ${timeAgo(hotData.meta.as_of)}`; rb.className="badge live"; }
    document.getElementById("small").innerHTML =
      `<div class="hot-slogan">Hot = attention, not direction</div>` +
      hotData.hot_tickers.map(t=>{
        const cls=t.catalyst_type==="no_news_mover"?"chip-nonews":(t.move_pct>0?"chip-up":"chip-down");
        const src=t.source_url?` · <a href="${t.source_url}" target="_blank" rel="noopener">source ↗</a>`:"";
        const cat=t.catalyst_type==="no_news_mover"?`<span class="nocat">No clear catalyst found</span>`:t.catalyst_type.replace(/_/g," ");
        const when=t.published?` · ${timeAgo(t.published)}`:(t.catalyst_type==="no_news_mover"?" · this cycle":"");
        const sect=t.sector?`${t.sector.split(":")[0]} · `:"";
        return `<div class="hot">
          <div class="htk"><div class="sym" onclick="openTicker('${t.ticker}')" title="Show ${t.ticker} on the bubble map">${t.ticker}</div><div class="pr">$${t.price.toLocaleString()}</div>
            <div class="hact"><span onclick="openTicker('${t.ticker}')" title="Show on the bubble map">◉ map</span><a href="t?sym=${t.ticker}" title="Open the ${t.ticker} page">page ↗</a></div></div>
          <span class="chip-mv ${cls}">${fmtPct(t.move_pct)}</span>
          <div class="hwhy">${t.why}
            <div class="hmeta">${sect}${t.company} · vol ${fmtVol(t.volume)} (${t.volume_vs_avg} avg) · ${cat}${when}${src}</div></div>
          <div class="fire"> ${t.heat_score}</div>
        </div>`;}).join("")
      + `<div class="runner-note">${hotData.meta.heat_criteria}<br>${hotData.meta.disclaimer}</div>`;
  } else if(hotData && hotData.meta){
    // feed is HEALTHY, just nothing qualifies this cycle (common in premarket/
    // quiet tape) — say that honestly instead of pretending we're offline
    if(rb){ rb.textContent=`Auto · ${timeAgo(hotData.meta.as_of)}`; rb.className="badge live"; }
    document.getElementById("small").innerHTML=
      `<div class="hot-slogan">Hot = attention, not direction</div>`+
      `<div class="runner-note"><b style="color:var(--text)">Nothing is hot this cycle.</b> No ticker currently
       meets 2 of 3: |day move| &gt; 5%, volume &gt; 3× its 30-day average, or a fresh catalyst.
       A quiet tape is information too — we never pad this list. Re-scans every 15 minutes.</div>`;
  } else {
    // no fake fallbacks — an honest empty state beats stale sample data
    if(rb){ rb.textContent="Offline"; rb.className="badge sample"; }
    document.getElementById("small").innerHTML=
      `<div class="runner-note">Hot tickers feed temporarily unavailable — refreshes every 15 minutes.</div>`;
  }
  renderSpaceX();
}
// SpaceX IPO feature — the panel's only IPO: big live SPCX price (universe.json,
// extended-session aware) + running SpaceX headlines from the news feed
function renderSpaceX(){
  const el=document.getElementById("ipo");
  if(!el) return;
  const s = universe ? universe.bubbles.flatMap(b=>b.tickers).find(t=>t.ticker==="SPCX") : null;
  const badge=document.getElementById("spcx-badge");
  if(badge){
    // freshness stamp, same style as the Hot Tickers badge ("Squawk · 5m ago");
    // the squawk feed's as_of is the panel's fastest-moving timestamp
    const ts=(tweets&&tweets.meta&&tweets.meta.as_of)||(universe&&universe.meta.as_of)||null;
    const ago=ts?timeAgo(ts.replace(" UTC","Z").replace(" ","T")):"";
    badge.textContent="Auto"+(ago?" · "+ago:"");
  }
  let h="";
  if(s){
    const traded = s.change_pct!==0 || s.price!==135;
    h+=`<div class="spcx-head" onclick="openTicker('SPCX')" title="Open SPCX in the bubble map">
      <div class="spcx-logo"><img src="assets/spacex.png" alt="SpaceX"></div>
      <div class="spcx-main"><div class="spcx-nm">SpaceX</div>
        <div class="spcx-tk">SPCX · Nasdaq · ${fmtCap(s.market_cap_b*1e9)} · Aerospace &amp; Defense</div></div>
      <div class="spcx-px"><div class="big">$${s.price.toFixed(2)}</div>
        <div class="chg ${pctClass(s.change_pct)}">${fmtPct(s.change_pct)}</div>
        <div class="ref">${traded?"vs IPO $135.00":"IPO price · awaiting first trade"}${universe&&universe.meta.session?` · ${({pre:"premarket",post:"after hours",regular:"market open",closed:"market closed"})[universe.meta.session]||""}`:""}</div>
        ${tweets&&tweets.meta&&tweets.meta.hyperliquid?`<div class="ref hl">Hyperliquid perp $${Number(tweets.meta.hyperliquid).toFixed(2)}</div>`:""}</div>
    </div>`;
  }
  const tw=(tweets&&tweets.items?tweets.items:[]).slice(0,4);
  if(tw.length){
    h+=`<div class="spcx-srclbl">𝕏 ${tweets.meta.handle} · live squawk</div>`
      +tw.map(it=>`
      <div class="spcx-tweet"><a href="${it.url}" target="_blank" rel="noopener">${it.text}</a>
        <div class="m">${timeAgo(it.time)}</div></div>`).join("");
  }
  const items=(newsFeed&&newsFeed.items?newsFeed.items:[])
    .filter(it=>(it.tickers||[]).includes("SPCX") || /spacex|space exploration/i.test(it.title||""))
    .slice(0,4);
  h+=`<div class="spcx-news">${items.length?`<div class="spcx-srclbl">Headlines</div>`:""}`
    +(items.length?items.map(it=>`
    <div class="spcx-item"><a href="${it.link||"#"}" target="_blank" rel="noopener">${it.title}</a>
      <div class="m">${it.publisher||""}${it.published?" · "+timeAgo(it.published):""}</div></div>`).join("")
    :(tw.length?"":`<div class="spcx-wait">Waiting for fresh SpaceX headlines — feed updates every 20 minutes…</div>`))+`</div>`;
  el.innerHTML=h;
}
function renderTakeaways(){
  const badge=document.getElementById("tk-badge");
  // live 4-hour cycle from takeaways/takeaways.json (the Cowork methodology)
  if(takeaways && takeaways.cards && takeaways.cards.length){
    if(badge){ badge.textContent=`Auto · ${takeaways.session}`; badge.className="badge live"; }
    const cards = tkExpanded ? takeaways.cards : takeaways.cards.slice(0,3);
    const hidden = takeaways.cards.length - 3;
    let h=`<div class="tk-since">${takeaways.generated_et}${takeaways.since_last?" — "+takeaways.since_last:""}</div>`;
    h+=cards.map(c=>`
      <div class="tk-card">
        <div class="tk-h">${c.headline}</div>
        <div class="tk-b">${c.body}</div>
        <div class="tk-meta">${(c.tickers||[]).map(t=>`<span class="chip">${t}</span>`).join("")}</div>
        ${c.watch?`<div class="tk-watch">⚑ Watch: ${c.watch}</div>`:""}
      </div>`).join("");
    if(hidden>0) h+=`<button class="tk-more" id="tk-more">${tkExpanded?"Show less ▲":`See more · ${hidden} more ▼`}</button>`;
    document.getElementById("takeaways").innerHTML=h;
    const mb=document.getElementById("tk-more");
    if(mb) mb.addEventListener("click", ()=>{ tkExpanded=!tkExpanded; renderTakeaways(); });
    return;
  }
  // fallback: computed quick lines (takeaways feed momentarily unavailable)
  if(badge){ badge.textContent="Auto"; badge.className="badge live"; }
  const top3=stocks.slice(0,3), total=stocks.reduce((a,s)=>a+s.market_cap,0)||1;
  const share=Math.round(top3.reduce((a,s)=>a+s.market_cap,0)/total*100);
  const gainers=stocks.filter(s=>s.change_pct>0).length;
  const lines=[
    `Top 3 (${top3.map(s=>s.symbol).join(", ")}) = <b>${share}%</b> of this basket's market cap — concentration risk.`,
    `${gainers}/${stocks.length} names are green today — breadth check.`,
  ];
  document.getElementById("takeaways").innerHTML=lines.map(t=>
    `<div class="takeaway"><span class="b">▸</span><span>${t}</span></div>`).join("");
}

function applyHeat(){
  const back=document.getElementById("uni-back");
  if(back) back.style.display = (heatMode==="universe" && uniGroup) ? "" : "none";

  if(heatMode==="universe" && universe){
    document.getElementById("heat-title").textContent = uniGroup
      ? `${uniGroup.label} · sized by day move`
      : `AI Universe · ${universe.meta.total_tickers} names · ${universe.bubbles.length} sectors`;
    // Keep the bottom summary blurb's count in sync with the live universe.
    const _trk=document.getElementById("trk-tickers"); if(_trk) _trk.textContent = universe.meta.total_tickers;
    const _trs=document.getElementById("trk-sectors"); if(_trs) _trs.textContent = universe.bubbles.length;
    render();
    if(uniGroup){
      const t = uniGroup.tickers.find(x=>x.ticker===selectedSymbol);
      t ? showUniverseDetail(t) : showGroupDetail(uniGroup);
    } else {
      showGroupDetail(universe.bubbles[0]);
    }
    return;
  }
  if(heatMode==="eco" && eco){
    document.getElementById("heat-title").textContent =
      `NVIDIA Ecosystem · ${eco.tickers.length} names · sized by day move`;
    render();
    // no selection yet → the whole basket as a table; a click swaps to the ticker card
    const t = eco.tickers.find(x=>x.ticker===selectedSymbol);
    t ? showUniverseDetail(t) : showEcoOverview();
    return;
  }
}

async function loadData(){
  try{
    const d=await (await fetch("data.json?t="+Date.now())).json();
    stocks=d.stocks||[]; asOfUtc=d.as_of_utc||null;
    try{ research=await (await fetch("research/research.json?t="+Date.now())).json(); }
    catch(e){ research=null; }
    try{ takeaways=await (await fetch("takeaways/takeaways.json?t="+Date.now())).json(); }
    catch(e){ takeaways=null; }
    try{ hotData=await (await fetch("hot_tickers.json?t="+Date.now())).json(); }
    catch(e){ hotData=null; }
    try{
      universe=await (await fetch("universe.json?t="+Date.now())).json();
      if(uniGroup) uniGroup = universe.bubbles.find(b=>b.id===uniGroup.id) || null;
    }catch(e){ universe=null; uniGroup=null; }
    try{ eco=await (await fetch("ecosystem.json?t="+Date.now())).json(); }
    catch(e){ eco=null; }
    try{ tweets=await (await fetch("tweets.json?t="+Date.now())).json(); }
    catch(e){ tweets=null; }
    try{ newsFeed=await (await fetch("news.json?t="+Date.now())).json(); }
    catch(e){ newsFeed=null; }
    try{ bubbleIx=await (await fetch("bubble_index.json?t="+Date.now())).json(); }
    catch(e){ bubbleIx=null; }
    document.getElementById("asof").textContent="As of "+d.as_of_local;
    const ts=document.getElementById("tape-stats");
    if(ts && d.tape && d.tape.length){
      ts.innerHTML=d.tape.map(t=>
        `<span class="ts-item"><span class="lbl">${t.label}</span>`+
        `<span class="val">${t.price.toLocaleString()}</span>`+
        `<span class="${pctClass(t.change_pct)}">${fmtPct(t.change_pct)}</span></span>`).join("");
      if(bubbleIx && bubbleIx.index && bubbleIx.index.overall!=null){
        const ix=bubbleIx.index;
        const col=ix.overall<25?"#22c55e":ix.overall<45?"#69cd91":ix.overall<60?"#e0a73f":ix.overall<80?"#f05a6e":"#b91c1c";
        ts.innerHTML+=`<a class="ts-item ts-bubble" href="/bubble" title="AI Bubble metrics — open">`+
          `<span class="lbl">AI Bubble risk</span>`+
          `<span class="val" style="color:${col}">${Math.round(ix.overall)}</span>`+
          `<span style="color:${col};font-weight:600">${ix.label||""}</span></a>`;
      }
    }
    renderBrief(); renderNews(); renderSamples(); renderTakeaways();
    applyHeat();
  }catch(e){
    document.getElementById("asof").textContent="data.json not found — run fetch.py";
    console.error(e);
  }
}

chart.on("click", p=>{
  if(p.data && p.data.group){ uniGroup=p.data.group; selectedSymbol=null; applyHeat(); }
  else if(p.data && p.data.uniTicker){ selectedSymbol=p.data.uniTicker.ticker; render(); showUniverseDetail(p.data.uniTicker); }
});
document.querySelectorAll(".seg-btn[data-mode]").forEach(b=>b.addEventListener("click",()=>{
  if(b.dataset.mode===heatMode) return;
  heatMode=b.dataset.mode; selectedSymbol=null; uniGroup=null;
  document.querySelectorAll(".seg-btn[data-mode]").forEach(x=>x.classList.toggle("active",x.dataset.mode===heatMode));
  applyHeat();
}));
document.getElementById("uni-back").addEventListener("click", ()=>{
  uniGroup=null; selectedSymbol=null; applyHeat();
});
// ---- main nav: Stocks / ETFs jump the heatmap mode, News scrolls to the feed ----
function setNav(id){
  document.querySelectorAll(".mainnav .nav-link").forEach(b=>b.classList.toggle("active", b.id===id));
}
function navMode(mode, navId){
  heatMode=mode; uniGroup=null; selectedSymbol=null;
  document.querySelectorAll(".seg-btn[data-mode]").forEach(x=>x.classList.toggle("active", x.dataset.mode===mode));
  applyHeat(); setNav(navId);
  document.querySelector(".area-heat").scrollIntoView({behavior:"smooth", block:"start"});
}
document.getElementById("nav-terminal")?.addEventListener("click", ()=>navMode("universe","nav-terminal"));
window.addEventListener("resize", ()=>{chart.resize(); render();});
document.getElementById("reload").addEventListener("click", loadData);
document.getElementById("theme-toggle").addEventListener("click",
  ()=>applyTheme(currentTheme()==="dark" ? "light" : "dark", true));
let savedTheme="dark"; try{ savedTheme=localStorage.getItem("santro-theme")||"dark"; }catch(e){}
applyTheme(savedTheme, false);
loadData();
</script>
<!-- Gated fair-value calculator + user accounts (extends the terminal) -->
<script src="accounts/config.js?v=3"></script>
<script src="accounts/api.js?v=12"></script>
<script src="accounts/accounts.js?v=15"></script>
<script>
setInterval(loadData, 60000);
</script>
</body>
</html>
```

---

## File 7 — `santro-accounts/app/routers/account.py (FULL FILE, 150 lines)`

**Why it matters:** the preferences/profile API — the backend half of terminal
customization.
**Claims it supports:** the backend is healthy and was explicitly designed for this:
GET /account/preferences returns "the caller's terminal/dashboard preferences (app
defaults overlaid with anything they've saved)"; PATCH merges a delta so future default
changes still reach existing users. Nothing wrong here — included as proof the break
is frontend-side.
**Reviewer should verify:** correctness of the merge logic; auth scoping (require_user);
that this router matches what api.js calls in File 3.

```python
"""Account self-service: profile, consent capture, GDPR data export, and
account deletion (hard-delete by default, with an anonymize option)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.deps import require_user
from app.models import (
    AuthIdentity,
    SavedValuation,
    User,
    WatchlistItem,
)
from app.schemas import (
    AccountExport,
    ConsentIn,
    IdentityOut,
    MessageOut,
    PreferencesIn,
    PreferencesOut,
    ProfileIn,
    SavedValuationOut,
    UserOut,
    WatchlistItemOut,
    merged_preferences,
)
from app.services.tokens import revoke_all_for_user

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(require_user)):
    return user


@router.patch("/profile", response_model=UserOut)
async def update_profile(
    payload: ProfileIn,
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Edit onboarding profile fields. Only keys present in the body change;
    pass null to clear a field, omit it to leave it untouched."""
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await session.commit()
    await session.refresh(user)
    return user


@router.get("/preferences", response_model=PreferencesOut)
async def get_preferences(user: User = Depends(require_user)):
    """The caller's terminal/dashboard preferences (app defaults overlaid with
    anything they've saved)."""
    return PreferencesOut(**merged_preferences(user.preferences))


@router.patch("/preferences", response_model=PreferencesOut)
async def update_preferences(
    payload: PreferencesIn,
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Partial update: merge the supplied keys over what's stored. We persist
    only the user's explicit choices (a delta), so evolving the app defaults
    later still reaches existing users via ``merged_preferences`` on read."""
    patch = payload.model_dump(exclude_unset=True)
    if patch:
        user.preferences = {**(user.preferences or {}), **patch}
        await session.commit()
        await session.refresh(user)
    return PreferencesOut(**merged_preferences(user.preferences))


@router.post("/consent", response_model=UserOut)
async def give_consent(
    payload: ConsentIn,
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    if payload.consent and user.consented_at is None:
        user.consented_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(user)
    return user


@router.get("/export", response_model=AccountExport)
async def export_data(
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """GDPR data-portability: everything we hold about the caller."""
    idents = (await session.execute(
        select(AuthIdentity).where(AuthIdentity.user_id == user.id)
    )).scalars().all()
    items = (await session.execute(
        select(WatchlistItem).where(WatchlistItem.user_id == user.id)
    )).scalars().all()
    vals = (await session.execute(
        select(SavedValuation).where(SavedValuation.user_id == user.id)
    )).scalars().all()
    return AccountExport(
        user=UserOut.model_validate(user),
        identities=[IdentityOut.model_validate(i) for i in idents],
        watchlist=[WatchlistItemOut.model_validate(i) for i in items],
        valuations=[SavedValuationOut.model_validate(v) for v in vals],
    )


@router.delete("/", response_model=MessageOut)
async def delete_account(
    response: Response,
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_session),
    anonymize: bool = Query(
        default=False,
        description="If true, keep the row but strip PII; otherwise hard-delete.",
    ),
):
    await revoke_all_for_user(session, user.id)
    if anonymize:
        # Keep aggregate/usage history intact but remove identifying data.
        await session.execute(delete(AuthIdentity).where(AuthIdentity.user_id == user.id))
        await session.execute(delete(WatchlistItem).where(WatchlistItem.user_id == user.id))
        await session.execute(delete(SavedValuation).where(SavedValuation.user_id == user.id))
        user.email = f"deleted+{user.id}@anonymized.invalid"
        user.password_hash = None
        user.display_name = None
        user.first_name = None
        user.last_name = None
        user.professional_status = None
        user.trading_experience = None
        user.main_market_interest = None
        user.preferences = None
        user.is_active = False
        user.email_verified = False
        user.anonymized_at = datetime.now(timezone.utc)
        await session.commit()
        return MessageOut(detail="Account anonymized.")
    # Hard delete — cascades remove identities, tokens, watchlist, valuations.
    await session.delete(user)
    await session.commit()
    return MessageOut(detail="Account permanently deleted.")
```

---

## File 8 — `santro-accounts/app/schemas.py — lines 1-200: defaults, merged_preferences, auth/profile/preferences schemas (file is 363 lines; the rest is watchlist/valuation/alert/usage schemas)`

**Why it matters:** the full preference vocabulary the terminal SHOULD render from —
DEFAULT_PREFERENCES, merged_preferences(), PreferencesIn (extra="forbid", typed enums,
list caps) and PreferencesOut.
**Claims it supports:** a complete, validated customization contract exists server-side:
show_stocks/crypto/etfs/news/research/bubble_risk/fair_value_calculator/watchlist,
default_terminal_view, theme, preferred_sectors, preferred_tickers. No frontend consumer
applies ANY of these fields (cross-check File 6).
**Reviewer should verify:** the field list matches the dashboard form in File 1; that
nothing in Files 5/6 references these field names.

```python
"""Pydantic v2 schemas — every inbound payload is validated here; every
outbound shape is explicit (no leaking ORM internals)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.security import validate_password_policy


# ── Profile / preferences vocabulary (Phase 4/5) ──────────────────────────
# Literal types auto-reject anything off-list with a 422 (no extra validators).
ProfStatus = Literal[
    "individual_trader", "investor", "finance_professional", "founder_operator",
    "student_researcher", "developer_data", "curious_observer", "other",
]
TradingExp = Literal["beginner", "intermediate", "advanced", "professional"]
MarketInterest = Literal[
    "ai_stocks", "ai_crypto", "ai_etfs", "all", "valuation_tools", "research_articles",
]
TerminalView = Literal[
    "all", "stocks", "crypto", "etfs", "news", "research", "bubble", "calculator", "watchlist",
]
Theme = Literal["system", "light", "dark"]

DEFAULT_PREFERENCES: dict = {
    "show_all_data": True, "show_stocks": True, "show_crypto": True, "show_etfs": True,
    "show_news": True, "show_research": True, "show_bubble_risk": True,
    "show_fair_value_calculator": True, "show_watchlist": True,
    "default_terminal_view": "all", "theme": "system",
    "preferred_sectors": [], "preferred_tickers": [],
}


def merged_preferences(stored: Optional[dict]) -> dict:
    """App defaults overlaid with the user's saved prefs (null => all defaults)."""
    return {**DEFAULT_PREFERENCES, **(stored or {})}


# ── Auth: email + password ────────────────────────────────────────────────


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: Optional[str] = Field(default=None, max_length=120)
    # Optional onboarding profile (Phase 4) — captured at signup, editable later.
    first_name: Optional[str] = Field(default=None, max_length=80)
    last_name: Optional[str] = Field(default=None, max_length=80)
    professional_status: Optional[ProfStatus] = None
    trading_experience: Optional[TradingExp] = None
    main_market_interest: Optional[MarketInterest] = None
    consent: bool = Field(description="Must be true: accepts terms & privacy policy.")

    @field_validator("password")
    @classmethod
    def _policy(cls, v: str) -> str:
        validate_password_policy(v)
        return v

    @field_validator("consent")
    @classmethod
    def _must_consent(cls, v: bool) -> bool:
        if v is not True:
            raise ValueError("You must accept the terms and privacy policy.")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class EmailIn(BaseModel):
    """Used by verify-resend, magic-link request, and password-reset request."""
    email: EmailStr


class TokenIn(BaseModel):
    token: str = Field(min_length=10, max_length=512)


class PasswordResetIn(BaseModel):
    token: str = Field(min_length=10, max_length=512)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def _policy(cls, v: str) -> str:
        validate_password_policy(v)
        return v


# ── Auth responses ─────────────────────────────────────────────────────────


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class MessageOut(BaseModel):
    detail: str


# ── Account ────────────────────────────────────────────────────────────────


class IdentityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    provider: str
    created_at: datetime


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    email_verified: bool
    display_name: Optional[str]
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    professional_status: Optional[str] = None
    trading_experience: Optional[str] = None
    main_market_interest: Optional[str] = None
    preferences: dict = Field(default_factory=dict)
    consented_at: Optional[datetime]
    created_at: datetime

    @field_validator("preferences", mode="before")
    @classmethod
    def _merge_prefs(cls, v: Any) -> dict:
        # The ORM column is null/partial; always return defaults overlaid.
        return merged_preferences(v if isinstance(v, dict) else None)


class ProfileIn(BaseModel):
    """PATCH /account/profile — only the fields present are updated."""
    model_config = ConfigDict(extra="forbid")
    first_name: Optional[str] = Field(default=None, max_length=80)
    last_name: Optional[str] = Field(default=None, max_length=80)
    display_name: Optional[str] = Field(default=None, max_length=120)
    professional_status: Optional[ProfStatus] = None
    trading_experience: Optional[TradingExp] = None
    main_market_interest: Optional[MarketInterest] = None


class PreferencesIn(BaseModel):
    """PATCH /account/preferences — partial; unknown keys rejected (extra=forbid)."""
    model_config = ConfigDict(extra="forbid")
    show_all_data: Optional[bool] = None
    show_stocks: Optional[bool] = None
    show_crypto: Optional[bool] = None
    show_etfs: Optional[bool] = None
    show_news: Optional[bool] = None
    show_research: Optional[bool] = None
    show_bubble_risk: Optional[bool] = None
    show_fair_value_calculator: Optional[bool] = None
    show_watchlist: Optional[bool] = None
    default_terminal_view: Optional[TerminalView] = None
    theme: Optional[Theme] = None
    preferred_sectors: Optional[list[str]] = Field(default=None, max_length=50)
    preferred_tickers: Optional[list[str]] = Field(default=None, max_length=200)


class PreferencesOut(BaseModel):
    show_all_data: bool
    show_stocks: bool
    show_crypto: bool
    show_etfs: bool
    show_news: bool
    show_research: bool
    show_bubble_risk: bool
    show_fair_value_calculator: bool
    show_watchlist: bool
    default_terminal_view: str
    theme: str
    preferred_sectors: list[str]
    preferred_tickers: list[str]


class AccountExport(BaseModel):
    """GDPR data export — everything we hold about the user."""
    user: UserOut
    identities: list[IdentityOut]
    watchlist: list["WatchlistItemOut"]
    valuations: list["SavedValuationOut"]


class ConsentIn(BaseModel):
    consent: bool

    @field_validator("consent")
    @classmethod
    def _must(cls, v: bool) -> bool:
        if v is not True:
```

---

# PART 2 — The audit documents (verbatim)

<!-- ══════════ audit/backend-discovery/DIAGNOSIS.md ══════════ -->

# DIAGNOSIS — plain English

**One sentence: the backend is real and healthy; the frontend saves user choices into it correctly; and then no page — above all the terminal — ever reads those choices back, while the site's own copy promises in four places that it does.**

1. **Is the backend actually broken, or is the frontend not wired?**
   The backend is NOT broken. Watchlist, alerts, valuations, profile, preferences: all real FastAPI + Postgres, auth-scoped, validated, and passing their own tests (16/16 for preferences + saved data, run today). The live API answered correctly during probes. The frontend is half-wired: every WRITE path works, the READ/APPLY paths into the product were never built.

2. **Is "add sticker" implemented anywhere?**
   No. The word "sticker" appears zero times in both repos. There is no widget/layout/sticker system, hidden or otherwise. What exists nearby: a ☆ Pin (watchlist) button, and a "Preferred tickers" text input on /dashboard whose value nothing consumes. ("Add sticker" is almost certainly voice-dictation for "add ticker.")

3. **Why is there no visible "add sticker" button?**
   Because (a) the feature it gestures at (add ticker to watchlist by typing) was never built — the watchlist can ONLY be fed by the ☆ Pin, and (b) that Pin is rendered ONLY for logged-in users, ONLY inside the fair-value calculator card, on 3 surfaces. Anonymous users get nothing — not even a locked button. Meanwhile the watchlist modal's empty state says "Open a stock and tap Pin", and the quiz promises an "editable" watchlist. The product points at a button it doesn't render.

4. **Why does the terminal not update after user choices?**
   Because terminal.html is a static page that renders the same bot-generated JSON for every human on earth. It fetches zero user data — live-probed: its only API traffic is auth probing and usage metering. Both customization UIs (dashboard preferences, quiz calibration) write to stores the terminal has never heard of.

5. **Is data saved to backend?**
   Dashboard preferences, watchlist pins, alerts, saved valuations, profile: YES (Postgres, tested). Quiz calibration: NO — localStorage only, even though the right endpoint exists. Stress tests: NO storage exists despite homepage copy claiming "saved stress tests."

6. **Is data read back into terminal?**
   No. Nothing user-specific is read by /terminal. Preferences are read back only by the /dashboard form that wrote them.

7. **Cache/revalidation issue?**
   No. There is nothing to go stale — the fetch was never written. (Static market data is aggressively cache-busted; that layer is fine.)

8. **Is auth blocking the flow?**
   Auth works (cookies, refresh, gates, redirect). Two auth-adjacent gaps: the Pin renders nothing for anonymous users instead of a locked state; and after signup users are hard-redirected to /dashboard instead of back to the action that triggered signup (the `next` param exists on /signin only; lock modals don't pass it).

9. **Is mock/prototype code pretending to be real?**
   Mostly no — the one config-level truth to know: `valuationProvider:"mock"` in production, because the frontend's "real" valuation endpoint (`/valuation/run`) **does not exist in the backend**. The math is genuine client-side DCF/PE/Graham/PEG — numbers aren't fake, they're just computed in the browser. The in-memory Mock backend in api.js is dev-only and inert in prod. The FAKE things are copy, not code: quiz "configured terminal snapshot", homepage "saved stress tests", "your list opens with the terminal."

10. **Top 10 root causes**
    1. terminal.html never fetches or applies `/account/preferences` (the flagship break).
    2. Quiz saves calibration to localStorage instead of the existing preferences endpoint; zero readers.
    3. No watchlist module on the terminal, contradicting homepage copy.
    4. No "add ticker by typing" affordance anywhere; watchlist only feedable via a hidden, auth-only Pin.
    5. Pin renders nothing for anonymous users (no locked state), while other copy points at it.
    6. Marketing/UI copy shipped ahead of features in 4+ places (quiz gate, dashboard panel header, homepage watchlist card, "saved stress tests").
    7. Two competing theme stores; account theme never applied.
    8. Signup flow drops return-context (lands on /dashboard; `next` only on signin; lock modal passes nothing).
    9. Dead `santro_quiz` key still drives the dashboard profile chip (old deleted quiz).
    10. Analytics events have no sink, so none of these funnel breaks are measurable.

11. **What must be rewritten?**
    Nothing large. The terminal needs a NEW preferences-consumer module (fetch → apply show_*/view/tickers → render watchlist strip). The quiz save function needs its storage swapped (localStorage → PATCH preferences). That's wiring, not rewriting.

12. **What can be fixed safely (small, independent)?**
    Copy fixes (remove "saved stress tests", soften quiz/watchlist promises until real); locked Pin for anon; `?next=` passthrough on lock modal + signup; dashboard chip removal; theme unification; `/valuation/run` decision (delete RealValuation or ship endpoint); events sink.

13. **What should be deleted?**
    `santro_quiz` chip block (auth-pages.js:136-149); `save_view`/`map_save_view` gate+copy entries (or build the feature); `RealValuation` + `valuationRun` route entry if the endpoint won't ship; eventually the api.js Mock into its own file.

14. **What should be tested?**
    - E2E (Playwright, against a staging account): save prefs → reload /terminal → sections hidden/shown accordingly; pin → terminal watchlist strip shows it; quiz save → prefs PATCHed → terminal reflects.
    - Backend: already well-tested; add a watchlist 30-cap test if the cap becomes real.
    - Regression guard: a qa script asserting terminal.html contains a `SantroPrefs.apply` call (so the wiring can't silently vanish), and a copy-guard forbidding promises of features absent from gates.js.

**Bottom line for the owner**: you don't have a broken backend — you have a backend that was built, tested, and then never plugged into the product's face. The fix is one new frontend module plus five small honesty patches, not a rebuild of the API.

---

<!-- ══════════ audit/backend-discovery/REBUILD_PLAN.md ══════════ -->

# REBUILD PLAN — proposed, post-audit (no code changed yet)

Scope philosophy: **wire, don't rewrite.** The backend survives as-is. One new frontend module, one storage swap, a handful of honesty patches. Locks never move backwards (grandfathering rule stays).

## A. Product contract

**Anonymous visitor**
- Terminal: full grandfathered view (map, tape, hot table, news, brief) — unchanged.
- Sees a visible "★ Watchlist" strip slot and "⚙ Customize" button on the terminal in LOCKED state → lock modal → signup (consistent with homepage locks).
- Calculator: 5 metered runs (unchanged). Quiz: gate (unchanged, but copy must match reality).

**Registered (free) user**
- Terminal boot loads effective preferences (defaults ⊕ saved) and applies them: sections hidden per `show_*`, initial view per `default_terminal_view`, watchlist strip populated from `/watchlist` sorted by heat, preferred tickers highlighted on the map.
- "⚙ Customize" on the terminal opens the SAME preferences (inline panel or link to /dashboard#customize) — one vocabulary, one store.
- Add ticker: visible "+ Add ticker" input in the watchlist strip AND in the watchlist modal (typeahead over universe.json). ☆ Pin stays, and renders a locked variant for anon.
- Quiz "Save calibration" → PATCH /account/preferences (picks mapped to show_*/default_terminal_view/preferred_tickers) → CTA "Open your terminal" now genuinely opens a configured terminal.
- Persistence expectation: server-side, cross-device, survives localStorage wipes. localStorage keeps only theme + anon-id + event queue.

## B. API contract (backend changes are tiny)

Existing endpoints keep their shapes. Additions/decisions only:
1. **No new endpoints required for the core fix.** `/account/preferences` + `/watchlist` already carry everything.
2. Watchlist cap: enforce `max 30` in POST /watchlist (422 beyond) — makes homepage copy true. New test.
3. `/account/me`: return 200 `{authenticated:false}` for anon (kills the 401 console noise pair). Optional but cheap.
4. Decision: `/valuation/run` — either implement (POST {ticker,growth,discount} → same shape as client math) or delete `RealValuation`/route entry from api.js. Recommend: delete for now; client math is fine and keyless.
5. Events sink (optional, P1): `POST /events` accepting the existing queue items, fire-and-forget, sampled. Unblocks funnel measurement.
6. Auth rules unchanged (require_user on all personal data; optional+anon-header on usage).

## C. Database schema

**No new tables for the core fix.** `User.preferences` JSON already holds the vocabulary; `watchlist_items` done.
Optional later: `saved_stress_tests(user_id, name, payload JSON, created_at)` ONLY if the homepage promise is kept; otherwise delete the copy. Index: existing uniques suffice; add `watchlist_items` count check app-side for the cap.

## D. Frontend state

- New `accounts/prefs.js` (~80 lines): `SantroPrefs.load()` → GET /account/preferences (authed) or defaults (anon); caches in-memory for the page life; `SantroPrefs.apply(prefs)` toggles section visibility (`data-pref-section="stocks|crypto|etfs|news|research|bubble_risk|calculator|watchlist"` attributes added to terminal sections), sets initial view, exposes `preferred_tickers`.
- Terminal boot order: static JSON render (unchanged, fast, SEO-safe) → prefs applied progressively when /me resolves (no flash-block for anon).
- Optimistic updates: on toggle change in the customize panel, apply locally then PATCH; revert on failure.
- Refetch: none needed beyond page load (full-page-load site). No cache invalidation problem exists.
- Theme: on login, if `preferences.theme` set and differs from `santro-theme`, apply + sync once; SantroTheme.set() also PATCHes when authed.
- Delete `santro_calibration` after successful migration PATCH; delete `santro_quiz` reader.

## E. UI requirements

- Terminal: visible **"⚙ Customize"** button in the topstrip (locked for anon); **watchlist strip** between tape and map (empty state for authed: "+ Add ticker"; locked state for anon); "+ Add ticker" input w/ typeahead; ☆ Pin rendered ALWAYS (locked variant for anon → lock modal).
- /dashboard panel: unchanged visually, plus "View on terminal →" link after save; success message becomes "Saved — your terminal now uses these settings."
- Save/reset: "Reset to defaults" button → PATCH with defaults delta.
- Loading: skeleton on watchlist strip; error: quiet fallback to default view + toast "Couldn't load your settings."
- Locked states: reuse existing `.ds-blur`/lock modal + `save_view` copy line (finally used) — and lock modal links gain `?next=<current path>`; signup honors `next` like signin does.
- Mobile: strip collapses to horizontal chip scroll; Customize lives in the drawer; no new nav items ≤760px.

## F. Tests

- Unit (JS, node): prefs merge logic; picks→preferences mapping from quiz; watchlist cap error rendering.
- Backend (pytest): watchlist cap 30; /me anon 200 (if adopted); events sink shape (if adopted).
- Integration (Playwright + staging account): the four journeys in 09 — A (save prefs → terminal reflects), B (add ticker → strip + reload persists), C (lock → signup?next → RETURNS to action), D (cross-refresh persistence). Auth tests: anon sees locked customize/pin; authed sees real ones.
- Guards (CI): assert terminal.html contains `SantroPrefs` mount; forbid the phrase "saved stress tests" unless the table exists; qa:routes stays green.

## G. Migration

**Keep**: entire backend; accounts/api.js (minus RealValuation decision); accounts.js modals/pin/alerts; gates/locks system; all static/SEO pages; quiz UI shell.
**Rewire** (the actual work): terminal.html (+prefs.js, watchlist strip, customize button); quiz.html save(); auth-pages.js signup `next` handling; lock modal URLs.
**Delete**: santro_quiz chip block; santro_calibration key (after mapping); RealValuation + /valuation/run reference (if decision = delete); "saved stress tests" copy; unused save_view entries IF the save-view feature is explicitly dropped instead of built.
**Copy truth pass** (can ship day 1, independent of code): quiz gate promise ("preset dashboard/suggested watchlist" → describe what ships), homepage watchlist card, index.html:1086 list.

## Suggested sequence (each step shippable alone)
1. Copy truth pass (P0 honesty, zero risk).
2. `prefs.js` + terminal apply + Customize button (the flagship fix).
3. Watchlist strip + "+ Add ticker" + always-rendered Pin (locked for anon) + 30-cap.
4. Quiz save → preferences PATCH (+ delete localStorage path).
5. Return-context: `?next=` on lock modal + signup.
6. Cleanups: dead chip, theme unification, /me 200-anon, valuation decision, events sink.

---

<!-- ══════════ audit/backend-discovery/03-sticker-flow-audit.md ══════════ -->

# 03 — "Add sticker" flow audit

## Search results (both repos, case-insensitive)

| Term | Frontend hits | Backend hits |
|---|---|---|
| sticker / stickers / addSticker | **0** | **0** |
| widget / widgets | only TradingView embed class names (`tradingview-widget-container`) — a third-party chart embed, not a user widget system | 0 |
| dashboard item / layout item / custom block / terminal card | 0 (no layout system exists) | 0 |
| personalize / customize | "Customize your terminal" panel on /dashboard (`accounts/auth-pages.js:185`) | — |
| pin / save card / add card | ☆ Pin button (`accounts/accounts.js:292`) — watchlist pin; share-card download buttons on /bubble /share (client-side export, no save) | `/watchlist` POST ("pin_ticker") |
| add ticker / add to watchlist | **0 UI copy anywhere** | — |

**Conclusion: there is no sticker/widget feature in any form — not hidden, not flagged, not prototyped, not in dead code.** The word does not appear in either repo.

## What the user almost certainly encountered

The owner voice-dictates; "add sticker" ≈ **"add ticker"**. The product repeatedly *promises* an add-a-ticker/watchlist affordance and never renders a button for it:

| Where the promise appears | Exact copy | What actually exists |
|---|---|---|
| /quiz gate + output panel (`quiz.html:415-424`) | "a **suggested watchlist you can edit**", "Suggested watchlist — 10 names, **editable**", "**Editable after save**" | Nothing. Save writes localStorage and offers a link to /terminal, which shows no watchlist at all. |
| Homepage watchlist card (`index.html:1051`) | "Save up to 30 tickers. Your list opens with the terminal." | No add UI, no terminal integration, no 30 cap. |
| Watchlist modal empty state (`accounts.js:552`) | "No pinned tickers yet. **Open a stock and tap Pin**." | Sends the user hunting for a Pin button that is invisible unless (a) logged in AND (b) inside the calculator card. |
| /dashboard prefs (`auth-pages.js:194`) | "**Preferred tickers** (comma-separated)" input | Saves to `User.preferences.preferred_tickers`. **Nothing reads it. Ever.** |

## The 12 questions

1. **Backend code for stickers/widgets?** No. Nearest analog: `/watchlist` (real, tested) and `User.preferences.preferred_tickers` (real storage, zero consumers).
2. **Frontend code for stickers/widgets?** No widget system. Watchlist UI exists (modal + pin).
3. **Visible button?** No. Live probe 2026-07-08: anonymous /terminal, opened NVDA detail panel — `pinPresent:false`. The ☆ Pin renders only for authenticated users (`accounts.js:292`: `user ? '<button class="sa-pin">☆ Pin</button>' : ""`).
4. **Hidden button?** Effectively yes: ☆ Pin exists but is auth-conditional and buried inside the fair-value calculator card on 3 surfaces (terminal detail panel `terminal.html:1472`, `t.html:701`, `/tools/fair-value-calculator.html:574`). Anonymous users never see it and get no locked placeholder for it.
5. **Route/modal/drawer for adding?** The "My watchlist" modal (account menu) can only LIST/unpin/alert — it has **no add-ticker input** (`renderWatchlist`, `accounts.js:550-575`).
6. **Behind auth?** Yes — watchlist is `free` tier (`ds-v2/gates.js:14`), pin button auth-only, API `require_user`.
7. **Behind a flag?** No. `ds-v2/flags.js` is visual-only (ds_v2 skin), not feature gating.
8. **In old code only?** No old sticker code either. The dead `santro_quiz` key on /dashboard is a different orphan (see 10).
9. **In design/prototype only?** The *promises* are in shipped marketing/UI copy (quiz, homepage). No design-lab prototype for widgets exists in the repo.
10. **Referenced in copy but not implemented?** **Yes — this is the core finding.** Four separate copy locations promise an editable watchlist/personalized terminal (table above).
11. **Does it save to database?** Pins do (WatchlistItem, tested). preferred_tickers does (User.preferences). Quiz calibration does NOT (localStorage only).
12. **Does the terminal read saved stickers/widgets/watchlist?** **No.** Live probe: /terminal network calls = `/account/me`, `/auth/methods`, `/auth/refresh`, `/usage/status` only. Zero `/watchlist`, zero `/account/preferences` reads.

## File/function table

| File | Function/component | Role | Implemented? | Called by | Calls | Problem |
|---|---|---|---|---|---|---|
| accounts/accounts.js:292 | calc card template | Renders ☆ Pin (auth-only) | yes | SantroCalc.render | — | Invisible to anon; no locked placeholder; only lives inside calc card |
| accounts/accounts.js:465 | `togglePin` | pin/unpin API call | yes | ☆ Pin click | POST/DELETE /watchlist | works |
| accounts/accounts.js:474 | `reflectPin` | shows pinned state | yes | render | GET /watchlist | works |
| accounts/accounts.js:550 | `renderWatchlist` | watchlist modal rows | yes | openSaved | GET /watchlist + unpin + alerts | **No add-ticker input**; empty state points to hidden Pin |
| accounts/auth-pages.js:194 | prefs form `#ptk` | "Preferred tickers" input | yes (write) | savePrefs | PATCH /account/preferences | **No consumer of preferred_tickers** |
| quiz.html:461-495 | `save()` | "Save calibration" | write only | user click | localStorage | Promises editable watchlist; nothing created |
| terminal.html | — | should read watchlist/prefs | **missing** | — | — | Terminal reads no per-user data at all |
| ~santro-accounts/app/routers/watchlist.py | list/pin/unpin | backend CRUD | yes, tested | api.js | Postgres | healthy — underused by UI |

---

<!-- ══════════ audit/backend-discovery/04-terminal-customization-flow.md ══════════ -->

# 04 — Terminal customization flow

There are **two separate customization UIs**. Both save. **Neither is ever read back into the terminal.** The break is not in the backend — it's the missing read/apply path on `/terminal`.

## UI #1: /dashboard "Customize your terminal" (account-backed)

Copy shown to the user: *"Choose what shows up, your default view and theme. **Saved to your account.**"* — toggles for Stocks/Crypto/ETFs/News/Research/Bubble-risk/Calculator/Watchlist, default terminal view, theme, preferred tickers, preferred sectors (`accounts/auth-pages.js:32-34,185-197`).

| # | Step | File / function | Expected | Actual | Status | Bug risk |
|---|---|---|---|---|---|---|
| 1 | Preference UI | auth-pages.js `renderDashboard` | form renders saved values | ✅ reads `GET /account/preferences` on load | exists and works | — |
| 2 | Frontend state | none (plain DOM read on save) | — | fine for a form | exists and works | — |
| 3 | API request | auth-pages.js:225 `savePrefs` | PATCH on click | ✅ `API.updatePreferences(body)` | exists and works | — |
| 4 | Backend endpoint | account.py:64 `update_preferences` | merge patch | ✅ delta-merge over stored JSON | exists and works | — |
| 5 | Validation | schemas.py:152 `PreferencesIn` | reject junk | ✅ `extra="forbid"`, typed enums, list caps (50/200) | exists and works | — |
| 6 | DB write | models.py:57 `User.preferences` JSON | persist | ✅ **proven: `pytest tests/test_profile_prefs.py tests/test_saved_data.py` → 16/16 pass (run 2026-07-08)** | exists and works | — |
| 7 | DB read | account.py:57 + `merged_preferences` | defaults ⊕ saved | ✅ | exists and works | — |
| 8 | **Terminal fetch** | should be in terminal.html | fetch prefs (or SantroAPI cache) on load | ❌ terminal.html contains **zero** references to SantroAPI/preferences. Live probe: no `/account/preferences` request from /terminal. | **missing** | **This is the break** |
| 9 | **Terminal rendering logic** | should hide/show sections per `show_*`, order per `default_terminal_view`, feature `preferred_tickers` | ❌ layout is hard-coded; every visitor gets the identical page | **missing** | **This is the break** |
| 10 | Cache/revalidation | — | n/a | no cache layer exists; nothing stale — nothing is fetched at all | missing (moot) | — |
| 11 | Auth/session | api.js `_fetch` | cookie + silent refresh | ✅ works (401→refresh→retry); /dashboard redirects anon to /signin?next=/dashboard (live-verified) | exists and works | — |
| 12 | localStorage | nav.js `SantroTheme` | — | ⚠️ theme is ALSO a saved account pref; site only honors `localStorage santro-theme`. Two sources of truth, account one dead. | saves but not read | medium |
| 13 | Feature flags | ds-v2/flags.js | — | visual skin only; does not gate customization | n/a | — |
| 14 | Error handling | savePrefs catch → "Couldn't save your preferences." | ok | ✅ but **misleading success**: "Preferences saved." is true yet implies the terminal will change; it won't | exists but misleading | UX P0 |

## UI #2: /quiz "Exposure Check" calibration (gated, account-adjacent)

Copy: *"the output is a configured terminal snapshot: a preset dashboard and a suggested watchlist you can edit"*; output panel lists "Preset dashboard / Suggested watchlist / Default risk view".

| # | Step | File / function | Expected | Actual | Status |
|---|---|---|---|---|---|
| 1 | Gate for anon | quiz.html `#xc-gate` | zero questions in DOM | ✅ live-verified (0 chips in DOM, gate visible) | exists and works |
| 2 | Auth detect | quiz.html MutationObserver on `#santro-auth-slot` | unlock in place | ✅ | exists and works |
| 3 | 4-step picker + preview | quiz.html `build/preview` | preview from universe.json | ✅ (top-10 by mcap preview) | exists and works |
| 4 | Save | quiz.html:491 `save()` | persist to the ACCOUNT (endpoint exists!) | ❌ writes `localStorage santro_calibration` only; **never calls `PATCH /account/preferences`** | local only |
| 5 | Read-back | anything | terminal/preset applies picks | ❌ repo-wide grep: `santro_calibration` has **zero readers** | saves but not read |
| 6 | Cross-device | — | account-backed | ❌ lost on another browser; also lost forever if localStorage cleared | local only |
| 7 | Suggested watchlist creation | — | create WatchlistItems or show editable list | ❌ nothing is created; "Open your terminal" CTA leads to the un-personalized terminal | missing |

## Root cause statement

The write pipeline (form → PATCH → Postgres → merged read-back into the same form) is **healthy and tested**. The product is broken because **no consumer exists**: `terminal.html` was built as a static, identical-for-everyone page and was never taught to (1) fetch `/account/preferences` (or the quiz calibration), (2) apply `show_*` / `default_terminal_view` / `preferred_tickers` to its sections, or (3) render the watchlist. The quiz additionally saves to the wrong store (localStorage) even though the right endpoint exists.

---

<!-- ══════════ audit/backend-discovery/05-api-endpoint-map.md ══════════ -->

# 05 — API endpoint map (backend `santro-accounts`, served at api.santroai.tech)

Auth column: 🔒 = `require_user` (cookie/bearer), 👤 = optional user, open = none.
Callers = production frontend (`accounts/api.js` route table + call sites). Machine-readable copy: `05-api-endpoint-map.json`.

| Method | Path | File | Purpose | Auth | Callers (frontend) | DB writes | DB reads | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| POST | /auth/register | auth_password.py:55 | create account (+consent, profile fields) | open | signup page, auth modal | User, AuthIdentity, EmailToken | User | **active** | instant-access flow; then auto-login |
| POST | /auth/login | auth_password.py:136 | password login → cookies | open | signup/signin/modal | RefreshToken | User | **active** | |
| POST | /auth/verify-email | auth_password.py:106 | verify token | open | auth-pages (link landing) | User | EmailToken | active | email sending blocked on Brevo key (user-side) |
| POST | /auth/resend-verification | auth_password.py:119 | resend | open | — | EmailToken | User | **unused by web** | no UI button found |
| POST | /auth/request-password-reset | auth_password.py:156 | reset mail | open | signin (only if methods.password_reset) | EmailToken | User | dormant | hidden until email backend live |
| POST | /auth/reset-password | auth_password.py:187 | set new pw | open | reset landing | User | EmailToken | dormant | |
| POST | /auth/magic/request · /verify | auth_magic.py | magic link | open | modal (only if methods.magic_link) | EmailToken/RefreshToken | User | dormant by design | capability-gated off; never rendered broken |
| GET | /auth/google/login · /callback | auth_oauth.py | OAuth | open | only if methods.google | User/AuthIdentity | — | dormant by design | not configured; button never shown |
| POST | /auth/refresh | auth_session.py:24 | rotate session cookie | cookie | api.js silent-retry on 401 | RefreshToken | RefreshToken | **active** | source of anon 401 console noise (probe on every page load) |
| POST | /auth/logout | auth_session.py:49 | kill session | cookie | account menu, dashboard | RefreshToken | — | **active** | |
| POST | /auth/token · /refresh · /revoke | auth_token.py | body-token trio (mobile) | open/token | **none (web)** | RefreshToken | User | **frontend missing (by plan)** | built for iOS app; unused until app ships |
| GET | /account/me | account.py:37 | current user | 🔒 | every page w/ accounts.js | — | User | **active** | anon → 401 (known noise; backend could return 200-anon) |
| PATCH | /account/profile | account.py:42 | onboarding profile | 🔒 | dashboard "Save profile" | User | User | **active** | |
| GET | /account/preferences | account.py:57 | terminal prefs (merged defaults) | 🔒 | dashboard form load ONLY | — | User | **active but orphaned** | ⚠️ never called by /terminal — the whole point of the endpoint |
| PATCH | /account/preferences | account.py:64 | save prefs delta | 🔒 | dashboard "Save preferences" | User.preferences | User | **active** | write-only in practice; no consumer renders the result |
| POST | /account/consent | account.py:81 | ToS/privacy consent | 🔒 | register flow | User | — | active | |
| GET | /account/export | account.py:94 | GDPR export | 🔒 | **none** | — | all user tables | **backend only** | no UI |
| DELETE | /account/ | account.py:117 | delete/anonymize | 🔒 | **none** | all | all | **backend only** | no UI — legal gap to close eventually |
| GET | /usage/status | usage.py:53 | runs remaining | 👤 + X-Santro-Anon | calc render | — | UsageCounter | **active** (live 200 ✓) | |
| POST | /usage/run | usage.py:67 | consume a run (402 gate) | 👤 + X-Santro-Anon | calc "Run" | UsageEvent/Counter | UsageCounter | **active** | 402 → register gate UI |
| GET | /watchlist | watchlist.py:17 | list pins | 🔒 | reflectPin, watchlist modal | — | WatchlistItem | **active** | healthy |
| POST | /watchlist | watchlist.py:30 | pin (idempotent) | 🔒 | ☆ Pin | WatchlistItem | WatchlistItem | **active** | no size cap (homepage says 30) |
| DELETE | /watchlist/{ticker} | watchlist.py:51 | unpin | 🔒 | modal ×, ☆ toggle | WatchlistItem | WatchlistItem | **active** | |
| GET/POST | /valuations | valuations.py:40,53 | history list/save | 🔒 | calc save, history modal | SavedValuation | SavedValuation | **active** | |
| GET/PATCH/DELETE | /valuations/{id} | valuations.py:73-98 | single item | 🔒 | delete only | SavedValuation | SavedValuation | active (PATCH unused) | |
| GET/POST/PATCH/DELETE | /alerts[…] | alerts.py | alert CRUD | 🔒 | watchlist modal bell | Alert | Alert | **active** | |
| GET/POST/DELETE | /devices[…] | devices.py | push device registry | 🔒 | **none (web)** | Device | Device | **frontend missing (by plan)** | iOS app blocked on Apple enrollment |
| GET · POST /read | /notifications | notifications.py | alert inbox | 🔒 | **none (web)** | Notification | Notification | **frontend missing (by plan)** | |
| GET | /auth/methods | (auth) | capability discovery | open | every page w/ accounts.js | — | — | **active** (live 200 ✓) | the reason no broken auth button ever renders |
| POST | **/valuation/run** | **DOES NOT EXIST** | server-side valuation | — | referenced by `api.js:58,276` (`RealValuation.run`) | — | — | **backend missing** | Why prod runs `valuationProvider:"mock"`. Frontend switch exists; endpoint never shipped. |

## Frontend-only "endpoints" (no backend at all)

| Flow | Where it should call the API | What it does instead |
|---|---|---|
| Quiz calibration save | PATCH /account/preferences (exists!) | localStorage `santro_calibration` |
| Analytics events | a collector endpoint | localStorage `santro_events` (capped 200) |
| Stress-test save | (promised on homepage) | nothing — no save exists |

## Danger / duplicate scan

- No dangerous endpoints found (delete is auth-scoped + GDPR-intentional; CORS locked to one origin; anon metering shape-validated `usage.py:38-48`).
- Duplicate risk: `/auth/refresh` exists in both cookie flavor (auth_session) and token flavor (auth_token) — intentional (web vs mobile), not a bug.

---

<!-- ══════════ audit/backend-discovery/06-persistence-map.md ══════════ -->

# 06 — Persistence map

## Storage layers in play

| Layer | Where | Real? |
|---|---|---|
| PostgreSQL (Render) | santro-accounts via SQLAlchemy async + Alembic | ✅ real, migrated, tested (16/16 prefs+saved-data tests pass) |
| Static JSON files (market data) | santro-ai repo root, bot-committed every 1–5 min | ✅ real, but global — identical for all users |
| localStorage | six+ keys, see below | ✅ real but device-local, and one key is orphaned, one is dead |
| In-memory Mock backend | `accounts/api.js` `Mock` object | dev/demo only — **NOT active in production** (`apiMode:"live"`) |
| sessionStorage / IndexedDB / cookies (frontend-set) | — | none (cookies are httpOnly, set by API) |

## Entity table

| Entity | Schema/model file | Fields (key ones) | Used by endpoints | Used by frontend | Persistence real? | Notes |
|---|---|---|---|---|---|---|
| User | models.py:38 (`users`) | email, password_hash (via AuthIdentity), display/first/last name, professional_status, trading_experience, main_market_interest, consent…, **preferences JSON** | /auth/*, /account/* | signup, signin, dashboard | ✅ | `preferences` = the terminal-customization store; write-only in practice |
| TerminalPreference | = `User.preferences` JSON (schemas.py:152 PreferencesIn) | show_stocks/crypto/etfs/news/research/bubble_risk/fair_value_calculator/watchlist, show_all_data, default_terminal_view, theme, preferred_sectors[≤50], preferred_tickers[≤200] | GET/PATCH /account/preferences | dashboard form only | ✅ saved / ❌ **never read by the terminal** | THE broken flow |
| Watchlist | models.py:169 `watchlist_items` | user_id FK cascade, ticker(20), created_at, **unique(user,ticker)** | /watchlist CRUD | ☆ Pin + modal | ✅ wired | no 30-item cap despite homepage copy |
| Alert | models.py:209 `alerts` | ticker, kind(price_above/below, pct_up/down), threshold, active, last_triggered_at | /alerts CRUD | watchlist modal bell | ✅ wired | client eval while page open + server evaluator for future push |
| SavedValuation | models.py:185 `saved_valuations` | ticker, inputs JSON, fair_value, premium_pct, created_at | /valuations CRUD | calc save + history modal | ✅ wired | |
| SavedStressTest | **does not exist** | — | — | promised at `index.html:1086` ("saved stress tests") | ❌ | fake promise — nothing anywhere |
| Sticker / Widget / DashboardLayout | **does not exist** | — | — | — | ❌ | no trace in either repo |
| ShareCard | none (by design) | — | — | client-side canvas export | n/a | no persistence intended |
| Session/Auth | models.py:102 RefreshToken, 82 AuthIdentity, 122 EmailToken | rotating refresh tokens, identity per provider, one-time email tokens | /auth/* | cookie-transparent | ✅ | httpOnly first-party cookies on api.santroai.tech |
| Usage/metering | models.py:139 UsageEvent, 155 UsageCounter | subject (user or X-Santro-Anon id or IP), window counts | /usage/* | calculator | ✅ wired | live-verified 200 |
| Device | models.py:234 `devices` | platform, push_token unique | /devices | none (web) | ✅ backend-only | for iOS app |
| Notification | models.py:251 `notifications` | alert firings, pushed_at | /notifications | none (web) | ✅ backend-only | |
| Subscription/Plan | **does not exist** | — | — | "Santro Pro — coming soon" (honest) | ❌ | Pro tier is copy-only; gates.js has "pro" values but nothing resolves to pro |

## localStorage keys (frontend persistence)

| Key | Written by | Read by | Verdict |
|---|---|---|---|
| `santro-theme` | nav.js SantroTheme, terminal toggle | every page (theme) | ✅ healthy — but conflicts with account `preferences.theme`, which nothing applies |
| `santro_calibration` | quiz.html:491 | **nobody** | ⚠️ orphaned write — flow #2's second half |
| `santro_quiz` | OLD deleted quiz | dashboard profile chip (auth-pages.js:138) | ☠️ dead key — chip can never show a profile again |
| `santro_anon_id` | api.js:25 | api.js → X-Santro-Anon header | ✅ healthy (metering) |
| `santro_events` | ds-v2/events.js | **nobody** (no sink) | ⚠️ analytics go nowhere; capped 200 so no leak |
| `santro_return` | ds-v2/locks.js:34 | locks.js (same page revisit) | partial — see 08 (signup never redirects back) |
| `SANTRO_API_BASE` | dev override only | config.js | ✅ dev convenience |

## The one-sentence summary

Postgres persistence is real and healthy for everything that has an endpoint; the product's gaps are (a) features promised with **no entity at all** (stress-test saves, widgets/stickers), and (b) entities that are **written but never read by the surface they were built for** (User.preferences → terminal, santro_calibration → anything).

---

<!-- ══════════ audit/backend-discovery/07-frontend-state-map.md ══════════ -->

# 07 — Frontend state map

## What state management exists

No framework, no store library, no react-query/swr, no router — this is a static multi-page site. State is:

| Mechanism | Instances |
|---|---|
| Module-scoped variables (IIFE closures) | `accounts/accounts.js`: `user`, `ctx` (selected ticker), `usage`, `_px` price cache (45 s TTL), `_alerts`; `accounts/api.js`: `ANON_ID`; per-page inline scripts (terminal chart state, quiz picks) |
| localStorage | 7 keys — see 06. The only cross-page state that exists. |
| DOM-as-state | auth is detected by *presence of `#sa-acct` in the DOM* (`locks.js:10`, `quiz.html authed()`); lock state = `.ds-blur` class |
| Server state | cookies (httpOnly) + Postgres, fetched ad hoc, no client cache/invalidation layer |
| Full page reloads | every navigation; nothing survives except localStorage and cookies |

## The eight questions

1. **Where does terminal customization state live?**
   In THREE unconnected places: ① `User.preferences` (Postgres, written by /dashboard form), ② `localStorage santro_calibration` (written by /quiz), ③ nowhere at render time — terminal.html consults none of them (its only personal read is `santro-theme`, line 1835).

2. **Does changing preference trigger save?**
   Yes for /dashboard (PATCH /account/preferences on "Save preferences" — verified path + backend tests). Yes-but-wrong-store for /quiz (localStorage only despite the endpoint existing).

3. **Does changing preference trigger terminal rerender?**
   **No.** Not on next visit either. There is no code path from either preference store to the terminal DOM. This is the answer to "I choose things and the terminal doesn't update" — nothing was ever wired to update it.

4. **Is there stale cache?**
   No — worse: there is no fetch at all. Nothing to be stale. (Static market JSON is cache-busted with `?t=Date.now()`, that side is fine. The 45 s `_px` price cache in accounts.js is healthy.)

5. **Is there route refresh?**
   Full page loads everywhere, so every visit is a clean chance to apply prefs — the terminal just never takes it.

6. **Anonymous vs logged-in mismatch?**
   Yes, by construction: the terminal renders identically for both (live-probed). The only authed differences on /terminal are the header account chip and the ☆ Pin inside the calc card. A paying-attention registered user sees their "saved" customization change nothing — trust-destroying.

7. **Is localStorage fighting the database?**
   Twice. ① **Theme**: `preferences.theme` (account, "Match system/Light/Dark") vs `santro-theme` (localStorage, actually honored by nav.js/SantroTheme). Saving "Light" to your account does nothing on any page. ② **Calibration vs preferences**: two customization vocabularies (quiz picks vs show_* toggles) in two stores with no reconciliation and no reader.

8. **Duplicate state?**
   - `santro_quiz` (dead) vs `santro_calibration` (orphaned) — dashboard chip reads the dead one (`auth-pages.js:138`).
   - Auth state = `user` variable in accounts.js closure AND `#sa-acct` DOM sniffing in locks.js/quiz — works, but fragile coupling (documented: locks.js polls 20×500 ms for it).
   - Usage meter mirrored in `usage` var + server counters — server wins on every render, fine.

## Missing pieces a rebuild must add (forward-pointer to REBUILD_PLAN)

- One client module (e.g. `accounts/prefs.js`) that resolves **effective preferences** = DEFAULTS ⊕ account prefs (if authed) ⊕ nothing else, exposes `SantroPrefs.get()`, and is called by terminal.html at boot.
- One decision on calibration: quiz should PATCH the same `/account/preferences` (mapping picks → show_*/default_terminal_view/preferred_tickers), then delete `santro_calibration` entirely.
- Theme unification: account theme (if set) seeds `santro-theme` on login.

---

<!-- ══════════ audit/backend-discovery/09-user-journey-traces.md ══════════ -->

# 09 — User journey traces

## Flow A — open terminal → choose content preference → terminal updates

**Expected**: /terminal → (somewhere obvious) choose what to see → terminal reflects it now and on every future visit.

**Actual code sequence**:
1. /terminal renders 100% from static JSON (universe/data/hot_tickers/news/bubble_index) + `santro-theme`. No customization control exists ON the terminal (zero `[data-lock]`, zero settings UI, no "customize" button).
2. The choose-UI lives two clicks away, only for authed users: account chip → "⚙ Account & settings" → /dashboard → "Customize your terminal" panel.
3. Save → `PATCH /account/preferences` → Postgres ✅ ("Preferences saved.")
4. "← Back to terminal" link → /terminal reloads → **fetches nothing user-specific** (live probe: only /account/me, /auth/methods, /usage/status) → identical page.

**Missing steps**: terminal boot never calls `GET /account/preferences`; no render logic consumes `show_*`/`default_terminal_view`/`preferred_tickers`.
**Broken link**: step 3→4. Data reaches the DB and dies there.
**Files**: terminal.html (missing consumer), accounts/auth-pages.js:185-228 (working producer), app/routers/account.py:57-77 (working API), accounts/api.js:110-111.

## Flow B — add sticker/widget → appears → save → reload → persists

**Expected**: a visible "Add sticker/widget" button on the terminal.

**Actual**: **The feature does not exist** — 0 occurrences of sticker/widget concepts in either repo (03). Nearest real path (watchlist pin):
1. Be logged in. 2. Open a ticker detail (bubble click on /terminal, or /t?sym=X). 3. Inside the fair-value calculator card, click ☆ Pin → `POST /watchlist` ✅. 4. View list: account chip → "★ My watchlist" → modal ✅ persists across reloads/devices.
- Anonymous: Pin is **not rendered** (no locked placeholder) — nothing to click.
- Nothing pinned ever appears **on** the terminal itself.
- No add-by-typing exists anywhere; the modal is list-only.

**Missing steps**: any visible entry point; anon locked state; terminal watchlist module.
**Files**: accounts/accounts.js:292,465-476,550-575; app/routers/watchlist.py (healthy).

## Flow C — anonymous clicks locked customization → signup → returns to same action → saved

**Actual sequence (live + code verified)**:
1. Homepage locked row click → `.ds-gate` modal "Unlock the full table" ✅ (live).
2. locks.js stores `santro_return` = path#elementId ✅.
3. Modal CTA → `/signup` (**no `?next=`**) → account created → auto-login → **hard redirect to /dashboard** (auth-pages.js:89).
4. User is now on /dashboard, NOT back at the locked table. `santro_return` is only consumed if they navigate back to the original page themselves (locks.js:47-58 then scrolls to the element and un-blurs).
5. The /quiz variant: gate CTA → /signup → /dashboard → user must find /quiz again; when they do, MutationObserver unlocks it in place ✅.

**Verdict**: signup works, unlock works, but the **return leg is manual**. `?next=` support exists on /signin only.
**Files**: ds-v2/locks.js:26,34,47-58; accounts/auth-pages.js:80-110.

## Flow D — registered user updates preferences → refreshes → persists

1. /dashboard form seeded from `GET /account/preferences` ✅ (merged defaults).
2. Save → PATCH ✅ → refresh /dashboard → values come back from Postgres ✅ (backend tests prove round-trip; form re-seeds on every render).
3. …and that is the entire universe in which those preferences are visible. Any other page: no effect. Cross-device: values sync (they're server-side) but still render nowhere.

**Verdict**: persistence WORKS; application of the persisted state is the missing product.

## Summary table

| Flow | Write path | Read path | User-visible result |
|---|---|---|---|
| A dashboard prefs → terminal | ✅ tested | ❌ none | "I saved and nothing changed" |
| A' quiz calibration → terminal | ⚠️ localStorage only | ❌ none | same, plus lost on device switch |
| B sticker/widget | — | — | feature absent; pin hidden for anon |
| C lock → signup → return | ✅ | ⚠️ manual return only | user stranded on /dashboard |
| D prefs persistence | ✅ | ✅ (dashboard form only) | works, but pointless until A is built |

---

# Independent verification checklist (run these, don't trust prose)

1. `grep -ri "sticker" <both repos>` → expect 0 hits.
2. `grep -rn "santro_calibration" <frontend>` → expect writes in quiz.html only, zero readers.
3. Search File 6 (terminal script) for `SantroAPI`, `preferences`, `watchlist` → expect only the SantroCalc mount.
4. `grep -rn "valuation/run" santro-accounts/app/` → expect empty; then find it referenced in File 3.
5. Live (no login needed): open santroai.tech/terminal with devtools → Network filtered to api.santroai.tech → expect exactly: /account/me 401, /auth/methods 200, /auth/refresh 401, /usage/status 200.
6. Backend: `pytest tests/test_profile_prefs.py tests/test_saved_data.py` → expect 16 passed.

# Questions for the second reviewer

1. Do you agree the break is a missing frontend read/apply path, not a backend defect?
2. Any risk you see in the REBUILD_PLAN sequence (prefs.js consumer → watchlist strip → quiz storage swap → return-context) that the audit missed?
3. Would you keep or delete the client-side valuation path given /valuation/run never shipped?
4. Anything in Files 2/3 (accounts.js/api.js) that looks unsafe or worth hardening while wiring?
