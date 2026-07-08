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
  // Same-site path (query allowed — ticker pages are /t?sym=X). Must start with
  // a single "/" — a leading "//" would be a protocol-relative external
  // redirect, so it is rejected explicitly. No scheme, no host, no backslash.
  const safeNext = (n) => (n && /^\/(?!\/)[A-Za-z0-9/_.\-?=&%]*$/.test(n) ? n : null);

  // ── controlled vocabularies (must mirror the backend Literal enums) ───────
  const PROF = [["individual_trader", "Individual trader"], ["investor", "Investor"],
    ["finance_professional", "Finance professional"], ["founder_operator", "Founder / operator"],
    ["student_researcher", "Student / researcher"], ["developer_data", "Developer / data"],
    ["curious_observer", "Curious observer"], ["other", "Other"]];
  const EXP = [["beginner", "Beginner"], ["intermediate", "Intermediate"],
    ["advanced", "Advanced"], ["professional", "Professional"]];
  const INTEREST = [["ai_stocks", "AI stocks"], ["ai_crypto", "AI crypto"], ["ai_etfs", "AI ETFs"],
    ["all", "All markets"], ["valuation_tools", "Valuation tools"], ["research_articles", "Research & articles"]];
  // Only views the terminal actually honors today (crypto/etfs have no terminal
  // section yet — offering them here would be a dead control).
  const VIEW = [["all", "Everything"], ["stocks", "Bubble map"], ["news", "News"],
    ["research", "Key takeaways"], ["bubble", "Bubble-risk brief"], ["watchlist", "Watchlist"]];
  const THEME = [["system", "Match system"], ["light", "Light"], ["dark", "Dark"]];
  // Toggles that hide/show real /terminal sections (labels = the section names).
  const TOGGLES = [["show_stocks", "Bubble map (stocks)"], ["show_news", "News"],
    ["show_research", "Key takeaways"], ["show_bubble_risk", "Bubble-risk brief"],
    ["show_fair_value_calculator", "Fair-value calculator"], ["show_watchlist", "Watchlist strip"]];
  // Saved to the account but with no terminal section yet — labeled honestly.
  const TOGGLES_SOON = [["show_crypto", "Crypto"], ["show_etfs", "ETFs"]];
  const PREF_DEFAULTS = { show_all_data: true, show_stocks: true, show_crypto: true, show_etfs: true,
    show_news: true, show_research: true, show_bubble_risk: true, show_fair_value_calculator: true,
    show_watchlist: true, default_terminal_view: "all", theme: "system",
    preferred_sectors: [], preferred_tickers: [] };

  const options = (pairs, sel, placeholder) =>
    (placeholder ? `<option value="">${esc(placeholder)}</option>` : "") +
    pairs.map(([v, l]) => `<option value="${v}"${v === sel ? " selected" : ""}>${esc(l)}</option>`).join("");
  const select = (id, pairs, sel, placeholder) =>
    `<select class="sa-input" id="${id}">${options(pairs, sel, placeholder)}</select>`;
  const busy = (form, on) => form.querySelectorAll("input,button,select").forEach((el) => { el.disabled = on; });

  // ── /signup ───────────────────────────────────────────────────────────────
  function renderSignup() {
    // Honor ?next= like /signin does, so locked actions return the user to
    // where they were instead of stranding them on /dashboard.
    const next = safeNext(qs("next"));
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
      <p class="auth-alt">Already have an account? <a href="/signin${next ? "?next=" + encodeURIComponent(next) : ""}">Sign in</a></p>
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
        location.href = next || "/dashboard";
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
      <p class="auth-alt">New to Santro AI? <a href="/signup${next ? "?next=" + encodeURIComponent(next) : ""}">Create an account</a></p>
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
    if (!user) { location.href = "/signin?next=/dashboard"; return; }
    // Where "view on terminal" style links should land (?next=/terminal etc.)
    const backTo = safeNext(qs("next")) || "/terminal";
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
          <p style="margin:4px 0 0;font-size:13px;color:var(--muted,#9aa6b2)"><a href="/quiz" style="color:var(--accent-2,#7ce8b1)">Run the Exposure Check</a> — four steps that save straight into the preferences below.</p>
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

      <section class="dash-card" id="customize">
        <h2>Customize your terminal</h2>
        <p class="auth-sub">Choose what appears on your terminal, your default view and theme. Saved to your account and applied on <a href="/terminal" style="color:var(--accent-2,#7ce8b1)">/terminal</a>.</p>
        <div id="prerr"></div>
        <div class="dash-toggles">${TOGGLES.map(toggleRow).join("")}</div>
        <p class="auth-sub" style="margin:10px 0 4px;font-size:11.5px">Saved for later — these don't have a terminal section yet:</p>
        <div class="dash-toggles">${TOGGLES_SOON.map(toggleRow).join("")}</div>
        <div class="auth-grid2" style="margin-top:14px">
          <div class="sa-field"><label>Default terminal view (opens first)</label>${select("dview", VIEW, prefs.default_terminal_view || "all")}</div>
          <div class="sa-field"><label>Theme</label>${select("theme", THEME, prefs.theme || "system")}</div>
        </div>
        <div class="sa-field"><label>Preferred tickers (comma-separated — shown in your terminal watchlist strip)</label><input class="sa-input" id="ptk" value="${esc((prefs.preferred_tickers || []).join(", "))}" placeholder="NVDA, MU, ASML"></div>
        <div class="sa-field"><label>Preferred sectors (comma-separated — used by the Exposure Check; terminal highlighting coming soon)</label><input class="sa-input" id="psec" value="${esc((prefs.preferred_sectors || []).join(", "))}" placeholder="semis, cloud, robotics"></div>
        <div class="sa-row" style="gap:10px;flex-wrap:wrap">
          <button class="sa-btn primary" id="savePrefs" style="width:auto">Save preferences</button>
          <button class="sa-btn" id="resetPrefs" style="width:auto" title="Back to the default terminal">Reset to defaults</button>
        </div>
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
      try {
        await API.updatePreferences(body);
        prerr.innerHTML = `<div class="sa-msg ok">Saved — your terminal now uses these settings. <a href="${esc(backTo)}" style="font-weight:700">View on terminal →</a></div>`;
      }
      catch (e) { prerr.innerHTML = msg(e.detail || "Couldn't save your preferences.", "err"); }
    };
    w.querySelector("#resetPrefs").onclick = async () => {
      const prerr = w.querySelector("#prerr");
      try {
        await API.updatePreferences(PREF_DEFAULTS);
        prerr.innerHTML = `<div class="sa-msg ok">Back to defaults. <a href="${esc(backTo)}" style="font-weight:700">View on terminal →</a></div>`;
        setTimeout(() => location.reload(), 900);
      } catch (e) { prerr.innerHTML = msg(e.detail || "Couldn't reset right now.", "err"); }
    };

    root.appendChild(w);
  }

  if (page === "signup") renderSignup();
  else if (page === "signin") renderSignin();
  else if (page === "dashboard") renderDashboard();
})();
