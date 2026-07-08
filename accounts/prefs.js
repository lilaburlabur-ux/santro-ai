/* Santro Prefs — the ONE consumer of terminal/dashboard preferences.
   Anonymous → DEFAULTS. Signed in → GET /account/preferences via SantroAPI.
   Any failure → DEFAULTS + console.warn; never blocks or blanks the page.
   DEFAULTS mirror backend app/schemas.py DEFAULT_PREFERENCES — keep in sync. */
(function () {
  "use strict";

  const DEFAULTS = Object.freeze({
    show_all_data: true, show_stocks: true, show_crypto: true, show_etfs: true,
    show_news: true, show_research: true, show_bubble_risk: true,
    show_fair_value_calculator: true, show_watchlist: true,
    default_terminal_view: "all", theme: "system",
    preferred_sectors: [], preferred_tickers: [],
  });
  const VIEWS = ["all", "stocks", "crypto", "etfs", "news", "research", "bubble", "calculator", "watchlist"];
  const THEMES = ["system", "light", "dark"];
  // data-pref-section value -> preference key
  const SECTION_PREF = {
    stocks: "show_stocks", crypto: "show_crypto", etfs: "show_etfs",
    news: "show_news", research: "show_research", bubble_risk: "show_bubble_risk",
    calculator: "show_fair_value_calculator", watchlist: "show_watchlist",
  };

  let _current = DEFAULTS;      // last loaded (normalized) prefs — sync access
  let _loaded = null;           // in-flight/settled promise (page-lifetime cache)
  let _themeApplied = false;    // apply account theme at most once per page

  const tickerOk = (t) => typeof t === "string" && /^[A-Z0-9.\-]{1,12}$/.test(t);

  function normalize(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const out = {};
    for (const k of Object.keys(DEFAULTS)) {
      const d = DEFAULTS[k], v = src[k];
      if (typeof d === "boolean") out[k] = typeof v === "boolean" ? v : d;
      else if (Array.isArray(d)) out[k] = Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
      else out[k] = typeof v === "string" ? v : d;
    }
    if (!VIEWS.includes(out.default_terminal_view)) out.default_terminal_view = "all";
    if (!THEMES.includes(out.theme)) out.theme = "system";
    out.preferred_tickers = out.preferred_tickers.map((t) => t.trim().toUpperCase()).filter(tickerOk).slice(0, 200);
    out.preferred_sectors = out.preferred_sectors.map((s) => s.trim()).filter(Boolean).slice(0, 50);
    return out;
  }

  async function load(options) {
    const force = options && options.force;
    if (_loaded && !force) return _loaded;
    _loaded = (async () => {
      try {
        if (!window.SantroAPI) return DEFAULTS;
        const raw = await window.SantroAPI.getPreferences(); // 401 (anonymous) rejects
        _current = normalize(raw);
      } catch (e) {
        if (!e || e.status !== 401) console.warn("SantroPrefs: using defaults —", e && (e.detail || e.message) || e);
        _current = DEFAULTS;
      }
      return _current;
    })();
    return _loaded;
  }

  function apply(prefs, root) {
    const p = prefs ? normalize(prefs) : _current;
    const scope = root || document;
    scope.querySelectorAll("[data-pref-section]").forEach((el) => {
      const key = SECTION_PREF[el.getAttribute("data-pref-section")];
      const hide = !!key && p[key] === false;
      el.hidden = hide;
      el.classList.toggle("pref-hidden", hide);
    });
    // Account theme (explicit light/dark only) seeds the site theme once.
    if (!_themeApplied && (p.theme === "light" || p.theme === "dark") && window.SantroTheme) {
      _themeApplied = true;
      try {
        let cur = null; try { cur = localStorage.getItem("santro-theme"); } catch (_) {}
        if (cur !== p.theme) window.SantroTheme.set(p.theme);
      } catch (e) { console.warn("SantroPrefs: theme apply skipped —", e); }
    }
    return p;
  }

  const getPreferredTickers = (prefs) => (normalize(prefs || _current)).preferred_tickers;
  const getVisibleSections = (prefs) => {
    const p = normalize(prefs || _current);
    return Object.keys(SECTION_PREF).filter((s) => p[SECTION_PREF[s]] !== false);
  };

  function reset() { _loaded = null; _current = DEFAULTS; _themeApplied = false; }

  window.SantroPrefs = {
    DEFAULTS, SECTION_PREF, load, apply, normalize, reset,
    getPreferredTickers, getVisibleSections,
    current: () => _current,
  };
})();
