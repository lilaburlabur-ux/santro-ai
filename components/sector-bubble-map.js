/* Santro — sector bubble map mount. v6
   THE sector/theme-page bubble map (/stocks/themes/*). This file no longer
   paints bubbles itself: rendering, packing and the "alive" 50ms drift physics
   come from components/santro-bubble-engine.js — code extracted VERBATIM from
   the /terminal hero map, which is the visual and behavioral source of truth.
   This mount only provides: the terminal-style header (sector label · tabs ·
   gradient legend), the canonical universe.json data flow (shared per-page
   promise + santro:universe broadcast for the members table), the selected-
   ticker detail panel, click/selection wiring and resize re-packing.

   Interaction model (same as terminal): bubble click/Enter selects into the
   detail panel (shared SantroTickerPanel — the rich card, same as the terminal);
   its "Open full ticker page" button navigates to /stocks/<slug> (canonical
   ticker URL). Requires window.echarts + window.SantroBubbleEngine.

   Usage: SantroSectorMap.mount(el, { bubbleId:"powering_ai", label:"Powering AI" });
          SantroSectorMap.mount(el, { tickers:[...], label:"Demo" });
*/
(function () {
  "use strict";
  var MONOF = "var(--font-mono,'IBM Plex Mono',ui-monospace,monospace)";
  var fmtPct = function (p) { return p == null ? "—" : (p >= 0 ? "+" : "") + Number(p).toFixed(2) + "%"; };
  var fmtCap = function (b) { return b == null ? "—" : b >= 1000 ? "$" + (b / 1000).toFixed(2) + "T" : b >= 10 ? "$" + Math.round(b) + "B" : "$" + b.toFixed(1) + "B"; };
  var fmtVol = function (v) { return v == null ? "—" : v >= 1e9 ? (v / 1e9).toFixed(1) + "B" : v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(0) + "K" : "" + v; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };

  var CSS = ".sbm{background:var(--panel,#111822);border:1px solid var(--border,#1d2733);border-radius:16px;overflow:hidden}" +
    ".sbm-hd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 16px;border-bottom:1px solid var(--border-soft,#161e28)}" +
    ".sbm-lab{font-family:" + MONOF + ";font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted,#8895a4)}" +
    ".sbm-lab b{color:var(--accent-2,#22c55e)}" +
    ".sbm-tabs{display:flex;gap:6px;margin-left:auto;align-items:center}" +
    ".sbm-tab{font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:999px;text-decoration:none;color:var(--muted,#8895a4);border:1px solid var(--border,#1d2733)}" +
    ".sbm-tab.on{color:var(--accent-2,#22c55e);background:var(--accent-soft,rgba(34,197,94,.1));border-color:var(--accent-border,rgba(34,197,94,.4))}" +
    ".sbm-tab:hover{color:var(--text,#e7edf3)}" +
    ".sbm-all{font-size:11.5px;font-weight:600;color:var(--faint,#5a6573);text-decoration:none}.sbm-all:hover{color:var(--text,#e7edf3)}" +
    ".sbm-leg{display:flex;align-items:center;gap:6px;font-family:" + MONOF + ";font-size:9.5px;color:var(--faint,#5a6573)}" +
    ".sbm-leg i{display:block;width:120px;height:7px;border-radius:999px;background:linear-gradient(to right,#700f19,#b91c1c,#ef4444,#f77b7b,#d6dce3,#69cd91,#22c55e,#15803d,#0a522d)}" +
    ".sbm-chart{background:radial-gradient(ellipse at 50% 42%,rgba(34,197,94,.045),transparent 65%),var(--bg,#0a0e13);cursor:pointer}" +
    ".sbm-dt{}" +   /* container only; SantroTickerPanel renders the rich .stp card */
    ".sbm-dt .sym{font-family:" + MONOF + ";font-size:17px;font-weight:800;color:var(--text,#e7edf3);text-decoration:none}" +
    ".sbm-dt .sym:hover{color:var(--accent-2,#22c55e)}" +
    ".sbm-dt .co{font-size:12px;color:var(--muted,#8895a4);max-width:240px}" +
    ".sbm-dt .kv{font-family:" + MONOF + ";font-size:11.5px;color:var(--muted,#8895a4)}.sbm-dt .kv b{display:block;font-size:13.5px;color:var(--text,#e7edf3);font-weight:700}" +
    ".sbm-dt .pc.up{color:#22c55e}.sbm-dt .pc.down{color:#f05a6e}" +
    ".sbm-open{margin-left:auto;display:inline-block;padding:7px 14px;border-radius:9px;background:var(--accent-soft,rgba(34,197,94,.1));border:1px solid var(--accent-border,rgba(34,197,94,.4));color:var(--accent-2,#22c55e);font-size:12.5px;font-weight:700;text-decoration:none;white-space:nowrap}" +
    ".sbm-open:hover{background:var(--accent-2,#22c55e);color:#04140b}" +
    "@media(max-width:640px){.sbm-hd{gap:8px;padding:9px 12px}.sbm-leg i{width:70px}.sbm-dt{gap:12px;padding:10px 12px}.sbm-dt .co{display:none}}";

  function ensureCss() {
    if (!document.getElementById("sbm-css")) {
      var st = document.createElement("style"); st.id = "sbm-css"; st.textContent = CSS;
      document.head.appendChild(st);
    }
  }

  function panelHtml(t) {
    return '<a class="sym" href="/stocks/' + encodeURIComponent(String(t.ticker).toLowerCase()) + '" aria-label="Open ' + esc(t.ticker) + ' ticker page">' + esc(t.ticker) + '</a>' +
      '<span class="co">' + esc(t.company || "") + '</span>' +
      '<span class="kv">Price<b>' + (t.price == null ? "—" : "$" + Number(t.price).toFixed(2)) + '</b></span>' +
      '<span class="kv">1D<b class="pc ' + ((t.change_pct || 0) >= 0 ? "up" : "down") + '">' + fmtPct(t.change_pct) + '</b></span>' +
      '<span class="kv">Cap<b>' + fmtCap(t.market_cap_b) + '</b></span>' +
      '<span class="kv">Vol<b>' + fmtVol(t.volume) + '</b></span>' +
      (t.industry ? '<span class="kv">Industry<b style="font-size:11.5px;font-weight:600">' + esc(t.industry) + '</b></span>' : '') +
      '<a class="sbm-open" href="/stocks/' + encodeURIComponent(String(t.ticker).toLowerCase()) + '">Open ' + esc(t.ticker) + ' &#8594;</a>';
  }

  function mount(el, opts) {
    if (!el) return;
    opts = opts || {};
    var SBE = window.SantroBubbleEngine, EC = window.echarts;
    if (!SBE || !EC) { el.innerHTML = '<p style="padding:20px;font-size:12.5px;color:var(--faint,#5a6573)">Map engine failed to load — the same data lives on the <a href="/terminal">terminal</a>.</p>'; return; }
    ensureCss();
    el.setAttribute("data-santro-sectormap", "1");

    var label = esc(opts.label || "Sector");
    el.innerHTML = '<div class="sbm">' +
      '<div class="sbm-hd">' +
        '<span class="sbm-lab"><b>' + label + '</b> · sized by the day&#39;s move · colored by direction</span>' +
        '<div class="sbm-tabs">' +
          '<a class="sbm-tab on" href="/terminal">AI Universe</a>' +
          '<a class="sbm-tab" href="/terminal" title="NVIDIA Ecosystem view lives on the terminal">NVIDIA Ecosystem</a>' +
          '<a class="sbm-all" href="/stocks">&#8592; All sectors</a>' +
          '<span class="sbm-leg">-10%<i></i>+10%</span>' +
        '</div></div>' +
      '<div class="sbm-chart" role="img" aria-label="' + label + ' bubble map — bubbles drift live; click any bubble to open its detail panel"></div>' +
      '<div class="sbm-dt"></div></div>';
    var chartEl = el.querySelector(".sbm-chart"), panelEl = el.querySelector(".sbm-dt");
    function renderPanel(t){ if (window.SantroTickerPanel) SantroTickerPanel.render(panelEl, t); else panelEl.innerHTML = panelHtml(t); }

    var state = { sel: null, nodes: null, bounds: null, chart: null, items: [] };
    var build = function (n) { return SBE.tickerItem(n, state.sel); };

    function layout() {
      var W = Math.max(320, el.clientWidth || 680);
      var H = Math.min(600, Math.max(320, Math.round(W * 0.58)));
      chartEl.style.height = H + "px";
      if (!state.chart) state.chart = EC.init(chartEl, null, { renderer: "canvas" }); else state.chart.resize();
      // TERMINAL SEMANTICS verbatim: size by |day move| + 0.5 (flat names stay visible)
      state.items.forEach(function (o) { o._sz = Math.abs(o.change_pct != null ? o.change_pct : 0) + 0.5; });
      state.nodes = SBE.packBubbles(state.items, "_sz", W, H).map(function (n) {
        return { x: n.x, y: n.y, r: n.r,
          vx: (Math.random() - 0.5) * 0.7, vy: (Math.random() - 0.5) * 0.7,   // terminal drift velocities
          obj: n.it, kind: "uni" };
      });
      state.bounds = { W: W, H: H };
      state.chart.setOption({
        backgroundColor: "transparent",
        grid: { left: 0, right: 0, top: 0, bottom: 0 },
        xAxis: { show: false, min: 0, max: W },
        yAxis: { show: false, min: 0, max: H },
        tooltip: {
          borderColor: "#1d2733", backgroundColor: "#111822", textStyle: { color: "#e7edf3", fontSize: 12 },
          formatter: function (p) {
            if (!p.data || !p.data.uniTicker) return "";
            var t = p.data.uniTicker, c = (t.change_pct || 0) >= 0 ? "#22c55e" : "#f05a6e";
            return "<b>" + esc(t.ticker) + "</b> · " + esc(t.company || "") + "<br/>" +
              '<span style="color:' + c + '">' + fmtPct(t.change_pct) + "</span> &nbsp; " +
              (t.price == null ? "—" : "$" + Number(t.price).toFixed(2)) + "<br/>" +
              "Cap " + fmtCap(t.market_cap_b) + " · Vol " + fmtVol(t.volume) +
              '<br/><span style="opacity:.7">click to inspect below</span>';
          }
        },
        series: [{ type: "scatter", data: state.nodes.map(build), animationDuration: 380,
          emphasis: { itemStyle: { borderColor: "#fff", borderWidth: 3 } } }]
      }, true);
      SBE.motionStart(state.chart, function () { return state.nodes; }, function () { return state.bounds; }, build);
    }

    function start(tickers) {
      var rows = (tickers || []).filter(function (t) { return t && t.ticker; });
      if (!rows.length) {
        chartEl.outerHTML = '<p style="padding:26px 16px;font-family:' + MONOF + ';font-size:12px;color:var(--faint,#5a6573)">Sector data loading — refresh in a moment.</p>';
        return;
      }
      state.items = rows;
      layout();
      // default selection: the day's biggest mover (= biggest bubble — the terminal read)
      var top = rows.slice().sort(function (a, b) { return Math.abs(b.change_pct || 0) - Math.abs(a.change_pct || 0); })[0];
      state.sel = top.ticker; renderPanel(top);
      state.chart.setOption({ series: [{ animation: false, data: state.nodes.map(build) }] });
      state.chart.on("click", function (p) {
        if (p.data && p.data.uniTicker) {
          var t = p.data.uniTicker;
          state.sel = t.ticker; renderPanel(t);
          state.chart.setOption({ series: [{ animation: false, data: state.nodes.map(build) }] });
        }
      });
      el._relayout = layout;
      if (!mount._resize) { mount._resize = true; window.addEventListener("resize", function () {
        document.querySelectorAll('[data-santro-sectormap]').forEach(function (n) {
          if (n._relayout) n._relayout();
        });
      }); }
    }

    if (opts.tickers) { start(opts.tickers); return; }
    // canonical data flow (data-consistency work — DO NOT fork): one shared
    // universe.json request per page, broadcast for the members table.
    window.__santroUniP = window.__santroUniP || fetch("/universe.json?t=" + Date.now()).then(function (r) { return r.json(); });
    window.__santroUniP.then(function (u) {
      var b = (u.bubbles || []).find(function (x) { return x.id === opts.bubbleId; });
      if (b && !opts.label) opts.label = b.label;
      start((b && b.tickers) || []);
      try { document.dispatchEvent(new CustomEvent("santro:universe", { detail: u })); } catch (e) {}
    }).catch(function () { start([]); });
  }

  window.SantroSectorMap = { mount: mount };
})();
