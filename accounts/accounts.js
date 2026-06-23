/* Santro Accounts — UI controllers. Reflects backend state; never owns auth or
   metering logic. Exposes window.SantroCalc.render(t) for the detail card. */
(function () {
  "use strict";
  const API = window.SantroAPI;
  if (!API) { console.warn("SantroAPI missing — load api.js first"); return; }

  let user = null;            // current account (from /me) or null
  let ctx = null;            // last selected stock {ticker,company,price,pe}
  let usage = null;          // cached /usage/status
  const cache = {};          // ticker -> {res, a} last interactive result (survives panel re-renders)
  const fmtUSD = (v) => v == null ? "—" : "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (v) => v == null ? "—" : (v >= 0 ? "+" : "") + Number(v).toFixed(1) + "%";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const node = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  // ── header ────────────────────────────────────────────────────────────
  function headerSlot() {
    let slot = document.getElementById("santro-auth-slot");
    if (!slot) {
      const right = document.querySelector(".topbar .right") || document.querySelector(".pageheader .pageright");
      if (!right) return null;
      slot = node('<span id="santro-auth-slot" style="position:relative;display:inline-flex"></span>');
      right.insertBefore(slot, right.firstChild);
    }
    return slot;
  }
  function renderHeader() {
    const slot = headerSlot(); if (!slot) return;
    if (user) {
      const initial = (user.email || "?")[0].toUpperCase();
      slot.innerHTML = `<button class="sa-authbtn" id="sa-acct" aria-haspopup="true" aria-expanded="false">
        <span class="sa-dot"></span>${esc(initial)} · Account ▾</button>`;
      slot.querySelector("#sa-acct").onclick = toggleMenu;
    } else {
      slot.innerHTML = `<button class="sa-authbtn" id="sa-signin">Sign in</button>`;
      slot.querySelector("#sa-signin").onclick = () => openAuth("home");
    }
  }
  function toggleMenu(e) {
    e.stopPropagation();
    const slot = headerSlot(); let m = slot.querySelector(".sa-menu");
    if (m) { m.remove(); return; }
    m = node(`<div class="sa-menu" role="menu">
      <div class="sa-email">${esc(user.email)}</div>
      <button data-a="watchlist">★ My watchlist</button>
      <button data-a="history">🕘 Saved valuations</button>
      <button data-a="logout">Log out</button></div>`);
    slot.appendChild(m);
    m.querySelector('[data-a="watchlist"]').onclick = () => { m.remove(); openSaved("watchlist"); };
    m.querySelector('[data-a="history"]').onclick = () => { m.remove(); openSaved("history"); };
    m.querySelector('[data-a="logout"]').onclick = async () => { m.remove(); await doLogout(); };
    setTimeout(() => document.addEventListener("click", function h() { m.remove(); document.removeEventListener("click", h); }), 0);
  }

  async function refreshUser() { try { user = await API.me(); } catch (_) { user = null; } renderHeader(); }
  async function doLogout() { try { await API.logout(); } catch (_) {} user = null; renderHeader(); if (ctx) SantroCalc.render(ctx); }

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
  function openAuth(view) { openAuthView(view || "home"); }
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
    const w = node(`<div>
      <h2>Sign in to Santro AI</h2>
      <p class="sa-sub">Unlimited valuations, a saved watchlist, and your valuation history. No spam.</p>
      <button class="sa-btn google" id="g">${googleSvg()} Continue with Google</button>
      <button class="sa-btn" id="m">✉️ Email me a sign-in link</button>
      <div class="sa-or">or</div>
      <button class="sa-btn primary" id="e">Continue with email & password</button>
      <p class="sa-nfa">Not financial advice. We use cookies to keep you signed in.</p>
    </div>`);
    w.querySelector("#g").onclick = () => { const u = API.googleLoginUrl(); if (u && u.startsWith("http")) location.href = u; else mockGoogle(); };
    w.querySelector("#m").onclick = () => openAuthView("magicLink");
    w.querySelector("#e").onclick = () => openAuthView("email");
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
    w.querySelector("#go").onclick = async () => {
      const email = w.querySelector("#em").value.trim();
      if (!email) return; toggle(w, true);
      try { await API.magicRequest(email); openAuthView("magicSent", email); }
      catch (e) { w.querySelector("#err").innerHTML = msg(e.detail || "Something went wrong.", "err"); toggle(w, false); }
    };
    return w;
  }
  function authEmail() {
    const w = node(`<div>
      <h2>Sign in</h2>
      <p class="sa-sub">Use your email and password.</p>
      <div id="err"></div>
      <div class="sa-field"><label>Email</label><input class="sa-input" id="em" type="email" autocomplete="email"></div>
      <div class="sa-field"><label>Password</label><input class="sa-input" id="pw" type="password" autocomplete="current-password"></div>
      <button class="sa-btn primary" id="go">Sign in</button>
      <div class="sa-row"><button class="sa-link" id="reg">Create an account</button><button class="sa-link" id="forgot">Forgot password?</button></div>
      <div class="sa-or">or</div>
      <button class="sa-btn" id="back">← all sign-in options</button>
    </div>`);
    w.querySelector("#back").onclick = () => openAuthView("home");
    w.querySelector("#reg").onclick = () => openAuthView("register");
    w.querySelector("#forgot").onclick = () => openAuthView("reset");
    w.querySelector("#go").onclick = async () => {
      const email = w.querySelector("#em").value.trim(), password = w.querySelector("#pw").value;
      if (!email || !password) return; toggle(w, true);
      try { await API.login({ email, password }); closeModal(); await refreshUser(); if (ctx) SantroCalc.render(ctx); }
      catch (e) {
        const txt = e.status === 403 ? "Please verify your email first." : "Invalid email or password.";
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
      <div class="sa-field"><label>Password</label><input class="sa-input" id="pw" type="password" autocomplete="new-password" placeholder="At least 10 characters"></div>
      <label class="sa-consent"><input type="checkbox" id="cons"> I agree to the Terms and Privacy Policy.</label>
      <button class="sa-btn primary" id="go">Create account</button>
      <button class="sa-link" id="back">← I already have an account</button>
    </div>`);
    w.querySelector("#back").onclick = () => openAuthView("email");
    w.querySelector("#go").onclick = async () => {
      const email = w.querySelector("#em").value.trim(), password = w.querySelector("#pw").value, consent = w.querySelector("#cons").checked;
      if (!consent) { w.querySelector("#err").innerHTML = msg("Please accept the terms to continue.", "err"); return; }
      if (password.length < 10) { w.querySelector("#err").innerHTML = msg("Password must be at least 10 characters.", "err"); return; }
      toggle(w, true);
      try {
        await API.register({ email, password, consent });
        if (API.mode === "live") openAuthView("verifyNotice", email);
        else { await API.login({ email, password }); closeModal(); await refreshUser(); if (ctx) SantroCalc.render(ctx); }
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
    render(t) {
      ctx = { ticker: t.ticker, company: t.company, price: t.price, pe: t.pe, change_pct: t.change_pct };
      const host = document.getElementById("detail"); if (!host) return;
      const old = host.querySelector(".sa-calc"); if (old) old.remove();
      const stat = API.staticValuation(t.ticker, { price: t.price, pe: t.pe });
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

  function staticHtml(stat) {
    if (stat.storyStockFlag) {
      return `<div class="sa-lbl">Fair value</div>
        <div class="sa-story"><b>Story stock — no earnings, valuation N/A.</b> No positive EPS to anchor a
        Lynch/PEG fair value, so we won't print a number. Read the bear case: the price is paying for a
        narrative, not current profits.</div>`;
    }
    const over = stat.premiumPct >= 0;
    return `<div class="sa-lbl">Fair value <span class="badge live">Free</span></div>
      <div class="sa-static">
        <span class="fv">${fmtUSD(stat.fairValue)}</span>
        <span class="sa-prem ${over ? "over" : "under"}">${fmtPct(stat.premiumPct)} ${over ? "above" : "below"} fair value</span>
        <span class="sa-basis">Lynch/PEG basis · ~${stat.assumedGrowth}% growth</span>
      </div>`;
  }
  function runRowHtml(stat) {
    const pinBtn = user ? `<button class="sa-pin" id="sa-pin">☆ Pin</button>` : "";
    if (stat && stat.storyStockFlag) {
      // No interactive valuation for a no-earnings name — don't let a click burn a run.
      return pinBtn ? `<div class="sa-runrow"><span class="sa-remaining">Interactive valuation N/A — story stock.</span>${pinBtn}</div>` : "";
    }
    const assume = user ? `<div class="sa-assume" id="sa-assume">
        <div class="f"><label>Growth % / yr</label><input id="sa-g" type="number" step="0.5" value="12"></div>
        <div class="f"><label>Discount rate %</label><input id="sa-r" type="number" step="0.25" value="9"></div>
      </div>` : "";
    return assume + `<div class="sa-runrow">
        <button class="sa-run" id="sa-run">▶ Run valuation</button>
        <span class="sa-remaining" id="sa-rem"></span>${pinBtn}
      </div>`;
  }
  function nfaLine() { return `<div class="sa-nfa">Reverse-DCF &amp; sensitivity are scenarios, not forecasts. Premiums describe price vs. an assumption — a condition, not a recommendation. Not financial advice.</div>`; }

  function wireRunRow(block, stat) {
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
    const growth = num(block.querySelector("#sa-g"), 12), discount = num(block.querySelector("#sa-r"), 9);
    try {
      const res = await API.runValuation(ctx.ticker, { price: ctx.price, pe: ctx.pe, growth, discount });
      out.innerHTML = resultsHtml(res, { growth, discount });
      cache[ctx.ticker] = { res, a: { growth, discount } };   // survive panel re-renders
      wireSensRerun(block, stat);
      await refreshUsage(block);
      if (user && !res.storyStockFlag) {
        API.saveValuation({ ticker: ctx.ticker, inputs: { growth, discount }, fair_value: res.fairValue, premium_pct: res.premiumPct })
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
      return `<div class="sa-story"><b>Story stock — no earnings, valuation N/A.</b> A discounted-earnings model
        needs positive EPS. Treat this name as narrative risk, not a number.</div>`;
    }
    const over = res.premiumPct >= 0;
    return `<div class="sa-res">
      <div class="sa-resgrid">
        <div class="sa-card"><div class="k">Fair value</div><div class="v">${fmtUSD(res.fairValue)}</div></div>
        <div class="sa-card"><div class="k">Premium vs price</div><div class="v ${over ? "over" : "under"}">${fmtPct(res.premiumPct)}</div></div>
      </div>
      <div class="sa-priced">What the market is pricing in: about <b>${res.pricedInGrowth == null ? "—" : res.pricedInGrowth.toFixed(1) + "%"}</b>
        annual earnings growth (reverse-DCF). Your run assumed <b>${a.growth}%</b> growth at a <b>${a.discount}%</b> discount rate.
        If that priced-in pace looks demanding versus history, the premium is the market's optimism — a condition to watch, not advice.</div>
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
        const wl = await API.listWatchlist();
        box.innerHTML = wl.length ? `<div class="sa-list">${wl.map((i) => `<div class="sa-li"><span class="tk" data-tk="${esc(i.ticker)}">${esc(i.ticker)}</span><button class="x" data-un="${esc(i.ticker)}" title="Unpin">×</button></div>`).join("")}</div>`
          : `<div class="sa-empty">No pinned tickers yet. Open a stock and tap <b>Pin</b>.</div>`;
        box.querySelectorAll("[data-un]").forEach((b) => b.onclick = async () => { await API.unpin(b.dataset.un); loadSaved(w, "watchlist"); });
        box.querySelectorAll("[data-tk]").forEach((b) => b.onclick = () => { closeModal(); jumpTo(b.dataset.tk); });
      } else {
        const vs = await API.listValuations();
        box.innerHTML = vs.length ? `<div class="sa-list">${vs.map((v) => {
          const over = (v.premium_pct || 0) >= 0;
          return `<div class="sa-li"><span class="tk" data-tk="${esc(v.ticker)}">${esc(v.ticker)}</span>
            <span class="meta">${fmtUSD(v.fair_value)} · <span class="${over ? "" : ""}">${fmtPct(v.premium_pct)}</span> · g ${esc((v.inputs || {}).growth)}% r ${esc((v.inputs || {}).discount)}%</span>
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

  // ── helpers ───────────────────────────────────────────────────────────
  function num(input, dflt) { if (!input) return dflt; const v = parseFloat(input.value); return isNaN(v) ? dflt : v; }
  function skeletonResults() { return `<div class="sa-res"><div class="sa-resgrid"><div class="sa-skel" style="height:62px"></div><div class="sa-skel" style="height:62px"></div></div><div class="sa-skel" style="height:60px"></div><div class="sa-skel" style="height:120px"></div></div>`; }
  function googleSvg() { return `<svg width="17" height="17" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-4 2.7-6.5z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/></svg>`; }

  // ── boot ──────────────────────────────────────────────────────────────
  window.SantroCalc = SantroCalc;
  API.onUnauthorized(() => { user = null; renderHeader(); openAuth("home"); });
  function boot() { renderHeader(); refreshUser(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
