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
    // Pin renders for EVERYONE — anonymous clicks open the signup/sign-in modal
    // (togglePin handles it), never a silently missing button.
    const pinBtn = `<button class="sa-pin" id="sa-pin" title="${user ? "Pin to watchlist" : "Create a free account to pin tickers to your watchlist"}">☆ Pin</button>`;
    if (stat && stat.storyStockFlag) {
      // No interactive valuation without an earnings base — don't let a click burn a run.
      return `<div class="sa-runrow"><span class="sa-remaining">Interactive valuation N/A — no earnings to value on yet.</span>${pinBtn}</div>`;
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
