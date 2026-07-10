/* Santro — shared ticker detail panel. v1
   THE canonical rich ticker-detail card for bubble maps. Reproduces the
   /terminal #detail panel's format (.d-head + .d-stats + perf chips + actions)
   so every bubble map shows the SAME rich panel on ticker select — never a
   one-line strip. Self-contained CSS (.stp-*), so it drops into any page.

   Usage:  SantroTickerPanel.render(el, tickerObj, { label:"Powering AI" });
   Ticker obj fields (from universe.json): ticker, company, price, change_pct,
   market_cap_b, pe, volume, sector, industry, perf{1W,1M,1Y}.
   Primary action = "Open full ticker page" -> /stocks/<slug> (canonical,
   indexable). opts.pageUrl overrides. Watch star mounts if window.SantroWatch. */
(function () {
  "use strict";
  var MONO = "var(--font-mono,'IBM Plex Mono',ui-monospace,monospace)";
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var fmtPct = function (p) { return p == null ? "—" : (p >= 0 ? "+" : "") + Number(p).toFixed(2) + "%"; };
  var fmtCap = function (b) { return b == null ? "—" : b >= 1000 ? "$" + (b / 1000).toFixed(2) + "T" : b >= 10 ? "$" + Math.round(b) + "B" : "$" + Number(b).toFixed(1) + "B"; };
  var fmtVol = function (v) { return v == null ? "—" : v >= 1e9 ? (v / 1e9).toFixed(1) + "B" : v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(0) + "K" : "" + v; };
  var cls = function (v) { return (v || 0) >= 0 ? "up" : "down"; };

  var CSS =
    ".stp{background:var(--panel,#111822);border-top:1px solid var(--border-soft,#161e28);padding:16px 18px}" +
    ".stp-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}" +
    ".stp-sym{font-family:" + MONO + ";font-size:22px;font-weight:800;color:var(--text,#e7edf3);letter-spacing:.01em}" +
    ".stp-co{font-size:13px;color:var(--muted,#8895a4);flex:1 1 auto;min-width:0}" +
    ".stp-pct{font-family:" + MONO + ";font-size:16px;font-weight:800}" +
    ".stp-pct.up{color:#22c55e}.stp-pct.down{color:#f05a6e}" +
    ".stp-watch{display:inline-flex}" +
    ".stp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0 4px}" +
    ".stp-stat{border:1px solid var(--border,#1d2733);border-radius:11px;padding:10px 12px;background:var(--bg,#0a0e13)}" +
    ".stp-stat .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint,#5a6573);font-weight:700}" +
    ".stp-stat .v{font-family:" + MONO + ";font-size:15px;font-weight:700;color:var(--text,#e7edf3);margin-top:3px}" +
    ".stp-chips{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0 2px}" +
    ".stp-chip{font-family:" + MONO + ";font-size:11.5px;border:1px solid var(--border,#1d2733);border-radius:999px;padding:5px 10px;color:var(--muted,#8895a4)}" +
    ".stp-chip b{font-weight:700}.stp-chip .up{color:#22c55e}.stp-chip .down{color:#f05a6e}" +
    ".stp-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}" +
    ".stp-actions a{text-decoration:none;font-size:13px;font-weight:700;border-radius:9px;padding:9px 15px;white-space:nowrap}" +
    ".stp-actions a.pri{background:var(--accent-2,#22c55e);color:#04140b}" +
    ".stp-actions a.sec{border:1px solid var(--border-strong,#26323f);color:var(--accent-2,#22c55e)}" +
    ".stp-actions a.sec:hover{border-color:var(--accent-2,#22c55e)}" +
    "@media(max-width:640px){.stp-stats{grid-template-columns:repeat(2,1fr)}.stp-actions a{flex:1 1 auto;text-align:center}}";

  function ensureCss() {
    if (!document.getElementById("stp-css")) {
      var st = document.createElement("style"); st.id = "stp-css"; st.textContent = CSS;
      document.head.appendChild(st);
    }
  }

  function chip(k, v) { return '<span class="stp-chip">' + k + ' <b class="' + cls(v) + '">' + fmtPct(v) + "</b></span>"; }

  function render(el, t, opts) {
    if (!el || !t) return;
    opts = opts || {};
    ensureCss();
    var sym = t.ticker;
    var page = opts.pageUrl || ("/stocks/" + encodeURIComponent(String(sym).toLowerCase()));
    var si = [t.sector, t.industry].filter(Boolean).join(" · ") || "—";
    var perf = t.perf && (t.perf["1W"] != null || t.perf["1M"] != null || t.perf["1Y"] != null)
      ? '<div class="stp-chips">' + chip("1D", t.change_pct) + chip("1W", t.perf["1W"]) + chip("1M", t.perf["1M"]) + chip("1Y", t.perf["1Y"]) + "</div>"
      : "";
    el.innerHTML =
      '<div class="stp">' +
        '<div class="stp-head">' +
          '<span class="stp-sym">' + esc(sym) + "</span>" +
          '<span class="stp-co">' + esc(t.company || "") + "</span>" +
          '<span class="stp-watch" data-stp-watch></span>' +
          '<span class="stp-pct ' + cls(t.change_pct) + '">' + fmtPct(t.change_pct) + " <span style=\"font-size:11px;color:var(--faint,#5a6573)\">today</span></span>" +
        "</div>" +
        '<div class="stp-stats">' +
          '<div class="stp-stat"><div class="k">Price</div><div class="v">' + (t.price == null ? "—" : "$" + Number(t.price).toFixed(2)) + "</div></div>" +
          '<div class="stp-stat"><div class="k">Market cap</div><div class="v">' + fmtCap(t.market_cap_b) + "</div></div>" +
          '<div class="stp-stat"><div class="k">P/E · Vol</div><div class="v">' + (t.pe == null ? "—" : t.pe) + " · " + fmtVol(t.volume) + "</div></div>" +
          '<div class="stp-stat"><div class="k">Sector</div><div class="v" style="font-size:12.5px;font-weight:600">' + esc(si) + "</div></div>" +
        "</div>" +
        perf +
        '<div class="stp-actions">' +
          '<a class="pri" href="' + page + '">Open full ' + esc(sym) + " page →</a>" +
          '<a class="sec" href="/tools/fair-value-calculator">Fair value</a>' +
          '<a class="sec" href="/bubble#stress">Stress test</a>' +
        "</div>" +
      "</div>";
    // watch star (ticker action) if the accounts module is present
    if (window.SantroWatch) {
      var w = el.querySelector("[data-stp-watch]");
      if (w) try { SantroWatch.mount(w, sym, { variant: "icon" }); } catch (e) {}
    }
  }

  window.SantroTickerPanel = { render: render };
})();
