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
