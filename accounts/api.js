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

  // Backend routes in one place — adjust here if the backend differs.
  const R = {
    me: "/account/me",
    register: "/auth/register",
    login: "/auth/login",
    magicRequest: "/auth/magic/request",
    magicVerify: "/auth/magic/verify",
    verifyEmail: "/auth/verify-email",
    requestReset: "/auth/request-password-reset",
    resetPassword: "/auth/reset-password",
    googleLogin: "/auth/google/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    usageStatus: "/usage/status",
    usageRun: "/usage/run",
    watchlist: "/watchlist",
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
          headers: body ? { "content-type": "application/json" } : undefined,
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
        throw new ApiError(401, "Authentication required.");
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
    const vals = [];                 // saved valuations
    const id = () => "m_" + Math.random().toString(36).slice(2, 10);
    const ensureUser = (email) => ({ id: id(), email: email.toLowerCase(), email_verified: true,
      display_name: null, consented_at: new Date().toISOString(), created_at: new Date().toISOString() });
    const requireUser = () => { if (!user) { _onUnauthorized(); throw new ApiError(401, "Authentication required."); } };
    const nextMidnight = () => { const d = new Date(); d.setUTCHours(24, 0, 0, 0); return d.toISOString(); };
    return {
      async me() { return user; },
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
  function impliedGrowth(eps, price, r, years, tg) {
    // bisection: find g such that dcf == price
    let lo = -0.05, hi = 0.6;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      (dcf(eps, mid, r, years, tg) > price ? (hi = mid) : (lo = mid));
    }
    return (lo + hi) / 2;
  }
  const MockValuation = {
    _eps(price, pe) { return pe && pe > 0 ? price / pe : null; },
    static_(ticker, { price, pe }) {
      const eps = this._eps(price, pe);
      if (eps == null) return { ticker, basis: "Lynch/PEG", storyStockFlag: true, fairValue: null, premiumPct: null };
      // Lynch fair P/E ≈ growth rate; illustrative ~12% assumption for the free read.
      const fair = eps * 12;
      return { ticker, basis: "Lynch/PEG", storyStockFlag: false, fairValue: fair,
        premiumPct: (price / fair - 1) * 100, assumedGrowth: 12 };
    },
    run(ticker, { price, pe, growth, discount }) {
      const eps = this._eps(price, pe);
      if (eps == null) return { ticker, storyStockFlag: true, fairValue: null, premiumPct: null, pricedInGrowth: null, sensitivityGrid: null };
      const years = 10, tg = 0.025;
      const g = growth / 100, r = discount / 100;
      const fair = dcf(eps, g, r, years, tg);
      const grid = { growth: [], discount: [], cells: [] };
      const gs = [growth - 4, growth - 2, growth, growth + 2, growth + 4];
      const rs = [discount - 1.5, discount - 0.75, discount, discount + 0.75, discount + 1.5];
      grid.growth = gs; grid.discount = rs;
      gs.forEach((gg) => grid.cells.push(rs.map((rr) => dcf(eps, gg / 100, rr / 100, years, tg))));
      return {
        ticker, storyStockFlag: false, fairValue: fair, premiumPct: (price / fair - 1) * 100,
        pricedInGrowth: impliedGrowth(eps, price, r, years, tg) * 100, sensitivityGrid: grid,
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
    listValuations: () => backend.listValuations(),
    saveValuation: (rec) => backend.saveValuation(rec),
    removeValuation: (id) => backend.removeValuation(id),
  };
})();
