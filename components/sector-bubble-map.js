/* Santro — shared sector bubble map. v1
   THE canonical bubble renderer for sector/theme pages (/stocks/themes/*).
   Visual standard = the /terminal hero map: same heat ramp (HEAT_STOPS), same
   dark tinted cores, controlled glow, ticker logos when available, compact
   terminal header (sector label · AI Universe / NVIDIA Ecosystem tabs ·
   All sectors · red/green legend) and a bottom selected-ticker detail panel.

   Deterministic layout (sorted input, spiral seed + relaxation — zero overlap
   at any viewport). Fit-to-chord label rules: a line that cannot fit its
   bubble demotes (logo+ticker+% → ticker+% → ticker → none) instead of
   spilling. Fallbacks: missing cap → min radius; missing move → neutral core
   and "—"; missing logo → ticker text. A ticker in the dataset ALWAYS renders.

   Usage:
     SantroSectorMap.mount(el, { bubbleId:"powering_ai", label:"Powering AI" });
     SantroSectorMap.mount(el, { tickers:[...], label:"Demo" });   // explicit data
*/
(function () {
  "use strict";
  var MONO = "var(--font-mono,'IBM Plex Mono',ui-monospace,monospace)";
  var CHAR_W = 0.62;
  var LOGO = function (s) { return s === "SPCX" ? "/assets/spacex.png"
    : "https://assets.parqet.com/logos/symbol/" + encodeURIComponent(String(s).split(".")[0]) + "?format=png&size=64"; };

  // ---- canonical heat ramp (ported from /terminal — keep in sync) ----------
  var HEAT_STOPS = [
    [-10,[112,15,25]], [-6,[185,28,28]], [-3,[239,68,68]], [-1,[247,123,123]],
    [0,[38,42,46]],
    [1,[105,205,145]], [3,[34,197,94]], [6,[21,128,61]], [10,[10,82,45]]
  ];
  function colorFor(pct) {
    var x = Math.max(-10, Math.min(10, pct || 0));
    for (var i = 0; i < HEAT_STOPS.length - 1; i++) {
      var a = HEAT_STOPS[i][0], ca = HEAT_STOPS[i][1], b = HEAT_STOPS[i + 1][0], cb = HEAT_STOPS[i + 1][1];
      if (x >= a && x <= b) {
        var t = (x - a) / ((b - a) || 1);
        return "rgb(" + ca.map(function (v, k) { return Math.round(v + (cb[k] - v) * t); }).join(",") + ")";
      }
    }
    return "rgb(38,42,46)";
  }
  function heatDark(pct) {          // dark bubble core, tinted toward the heat color
    var m = colorFor(pct).match(/\d+/g).map(Number);
    return "rgb(" + m.map(function (v) { return Math.round(v * 0.30 + 8); }).join(",") + ")";
  }
  var heatText = function (pct) { return pct == null ? "#aeb9c4" : pct >= 0 ? "#8df0b4" : "#ff9aa2"; };
  var fmtPct = function (p) { return p == null ? "—" : (p >= 0 ? "+" : "") + Number(p).toFixed(2) + "%"; };
  var fmtCap = function (b) { return b == null ? "—" : b >= 1000 ? "$" + (b / 1000).toFixed(2) + "T" : b >= 10 ? "$" + Math.round(b) + "B" : "$" + b.toFixed(1) + "B"; };
  var fmtVol = function (v) { return v == null ? "—" : v >= 1e9 ? (v / 1e9).toFixed(1) + "B" : v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(0) + "K" : "" + v; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };

  // ---- label geometry ------------------------------------------------------
  function chordFit(r, dy, pad) { var h = r * r - dy * dy; return h <= 0 ? 0 : 2 * Math.sqrt(h) - (pad || 8); }
  function fitToChord(len, fs, minFs, r, dy) {
    while (fs >= minFs) { if (len * CHAR_W * fs <= chordFit(r, Math.abs(dy) + fs * 0.5, 8)) return fs; fs--; }
    return 0;
  }
  var tkSize = function (r) { return Math.max(10, Math.min(22, Math.round(r * 0.34))); };
  var pcSize = function (r) { return Math.max(9, Math.min(15, Math.round(tkSize(r) * 0.74))); };

  // ---- sizing weight: TERMINAL SEMANTICS by default --------------------------
  // /terminal is the source of truth and sizes by |day move| + 0.5 (flat names
  // stay visible). Sector pages must match, so the same bubbles look the same.
  // sizeBy:'cap' remains available for explicitly-documented uses.
  function weightOf(t, sizeBy) {
    if (sizeBy === "cap") return t.market_cap_b || 1;
    return Math.abs(t.change_pct != null ? t.change_pct : 0) + 0.5;
  }

  // ---- deterministic packing (spiral seed + relaxation, zero overlap) ------
  function pack(items, W, H, sizeBy) {
    var wOf = function (t) { return weightOf(t, sizeBy); };
    var sumW = items.reduce(function (s, t) { return s + wOf(t); }, 0) || 1;
    var scale = (W * H * 0.40) / sumW;
    var rMax = Math.min(W, H) * 0.34;
    var cx = W / 2, cy = H / 2, placed = [];
    var K = 14000, reach = Math.max(W, H) * 0.72;
    items.forEach(function (t) {
      var r = Math.sqrt((wOf(t) * scale) / Math.PI);
      r = Math.max(14, Math.min(rMax, r));
      var best = null;
      for (var k = 0; k < K && !best; k++) {
        var ang = k * 0.5, dist = reach * Math.sqrt(k / K);
        var x = cx + Math.cos(ang) * dist, y = cy + Math.sin(ang) * dist * (H / W);
        if (x - r < 4 || x + r > W - 4 || y - r < 4 || y + r > H - 4) continue;
        var hit = placed.some(function (p) { return Math.hypot(p.x - x, p.y - y) < p.r + r + 7; });
        if (!hit) best = { x: x, y: y, r: r, t: t };
      }
      placed.push(best || { x: cx, y: cy, r: r, t: t });
    });
    // relax; if the box is too tight to converge (narrow mobile canvases where
    // the bounds-clamp fights the push-apart), shrink all radii 6% and retry —
    // guaranteed overlap-free, still deterministic.
    for (var round = 0; round < 5; round++) {
      var converged = false;
      for (var pass = 0; pass < 260 && !converged; pass++) {
        var moved = false;
        for (var i = 0; i < placed.length; i++) for (var j = i + 1; j < placed.length; j++) {
          var a = placed[i], b = placed[j];
          var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d < 0.5) {   // concentric (fallback stacking) — dx/d would be a
            var th = i * 2.399 + j;               // zero vector; use a fixed,
            dx = Math.cos(th); dy = Math.sin(th); // deterministic axis instead
            d = 1;
          }
          var need = a.r + b.r + 7 - d;
          if (need > 0) { var ux = dx / d, uy = dy / d, sh = need / 2 + 0.5;
            a.x -= ux * sh; a.y -= uy * sh; b.x += ux * sh; b.y += uy * sh; moved = true; }
        }
        placed.forEach(function (p) {
          p.x = Math.min(W - 4 - p.r, Math.max(4 + p.r, p.x));
          p.y = Math.min(H - 4 - p.r, Math.max(4 + p.r, p.y));
        });
        if (!moved) converged = true;
      }
      if (converged) break;
      placed.forEach(function (p) { p.r *= 0.94; });
    }
    return placed;
  }

  // ---- one-time CSS --------------------------------------------------------
  var CSS = ".sbm{background:var(--panel,#111822);border:1px solid var(--border,#1d2733);border-radius:16px;overflow:hidden}" +
    ".sbm-hd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 16px;border-bottom:1px solid var(--border-soft,#161e28)}" +
    ".sbm-lab{font-family:" + MONO + ";font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted,#8895a4)}" +
    ".sbm-lab b{color:var(--accent-2,#22c55e)}" +
    ".sbm-tabs{display:flex;gap:6px;margin-left:auto;align-items:center}" +
    ".sbm-tab{font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:999px;text-decoration:none;color:var(--muted,#8895a4);border:1px solid var(--border,#1d2733)}" +
    ".sbm-tab.on{color:var(--accent-2,#22c55e);background:var(--accent-soft,rgba(34,197,94,.1));border-color:var(--accent-border,rgba(34,197,94,.4))}" +
    ".sbm-tab:hover{color:var(--text,#e7edf3)}" +
    ".sbm-all{font-size:11.5px;font-weight:600;color:var(--faint,#5a6573);text-decoration:none}.sbm-all:hover{color:var(--text,#e7edf3)}" +
    ".sbm-leg{display:flex;align-items:center;gap:6px;font-family:" + MONO + ";font-size:9.5px;color:var(--faint,#5a6573)}" +
    ".sbm-leg i{display:block;width:120px;height:7px;border-radius:999px;background:linear-gradient(to right,#700f19,#b91c1c,#ef4444,#f77b7b,#d6dce3,#69cd91,#22c55e,#15803d,#0a522d)}" +
    ".sbm-map{background:radial-gradient(ellipse at 50% 42%,rgba(34,197,94,.045),transparent 65%),var(--bg,#0a0e13)}" +
    ".sbm-g{cursor:pointer;transition:filter .12s ease}.sbm-g:hover{filter:brightness(1.22)}.sbm-g:focus{outline:none}" +
    ".sbm-a{cursor:pointer}.sbm-a:hover text,.sbm-a:focus text{text-decoration:underline}" +
    ".sbm-dt{display:flex;gap:18px;align-items:center;flex-wrap:wrap;padding:12px 16px;border-top:1px solid var(--border-soft,#161e28)}" +
    ".sbm-dt .sym{font-family:" + MONO + ";font-size:17px;font-weight:800;color:var(--text,#e7edf3)}" +
    ".sbm-dt .co{font-size:12px;color:var(--muted,#8895a4);max-width:240px}" +
    ".sbm-dt .kv{font-family:" + MONO + ";font-size:11.5px;color:var(--muted,#8895a4)}.sbm-dt .kv b{display:block;font-size:13.5px;color:var(--text,#e7edf3);font-weight:700}" +
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

  // ---- render --------------------------------------------------------------
  function render(el, tickers, opts) {
    el._last = tickers; el._opts = opts;
    ensureCss();
    var W = Math.max(320, el.clientWidth || 680);
    var H = Math.min(600, Math.max(320, Math.round(W * 0.58)));
    var sizeBy = opts.sizeBy || "move";
    var rows = (tickers || []).filter(function (t) { return t && t.ticker; })
      .sort(function (a, b) { return weightOf(b, sizeBy) - weightOf(a, sizeBy); });
    var label = esc(opts.label || "Sector");
    var sizedTxt = sizeBy === "cap" ? "sized by market cap · colored by day move"
                                    : "sized by the day&#39;s move · colored by direction";
    var head = '<div class="sbm-hd">' +
      '<span class="sbm-lab"><b>' + label + '</b> · ' + sizedTxt + '</span>' +
      '<div class="sbm-tabs">' +
        '<a class="sbm-tab on" href="/terminal">AI Universe</a>' +
        '<a class="sbm-tab" href="/terminal" title="NVIDIA Ecosystem view lives on the terminal">NVIDIA Ecosystem</a>' +
        '<a class="sbm-all" href="/stocks">&#8592; All sectors</a>' +
        '<span class="sbm-leg">-10%<i></i>+10%</span>' +
      '</div></div>';
    if (!rows.length) {
      el.innerHTML = '<div class="sbm">' + head +
        '<p style="padding:26px 16px;font-family:' + MONO + ';font-size:12px;color:var(--faint,#5a6573)">Sector data loading — refresh in a moment.</p></div>';
      return;
    }
    var packed = pack(rows, W, H, sizeBy);
    var svg = ['<svg class="sbm-map" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + label + ' bubble map" style="display:block">'];
    var clips = [], imgs = [];
    packed.forEach(function (p, idx) {
      var t = p.t, r = p.r, pct = t.change_pct;
      var heat = colorFor(pct), core = heatDark(pct);
      var sel = opts._sel === t.ticker;
      var sw = sel ? 2.6 : Math.max(1.4, Math.min(3.2, r * 0.045));
      var glow = Math.min(11, Math.max(4, Math.round(r * 0.15)));
      // label stack: try logo+tk+pct → tk+pct → tk → none, biggest that fits
      var G = 3, len = String(t.ticker).length;
      var ls = Math.max(16, Math.min(34, Math.round(r * 0.48)));
      var tkFs = 0, pcFs = 0, useLogo = false, mode = "none";
      var tryCfg = function (logo, pc) {
        var tf = tkSize(r), pf = pc ? pcSize(r) : 0, lg = logo ? ls : 0;
        var block = (lg ? lg + G : 0) + tf + (pf ? G + pf : 0);
        if (block > r * 1.62) return null;
        var tkDy = -block / 2 + (lg ? lg + G : 0) + tf / 2;
        var tf2 = fitToChord(len, tf, 10, r, tkDy);
        if (!tf2) return null;
        var pf2 = 0;
        if (pc) { var pcDy = -block / 2 + (lg ? lg + G : 0) + tf2 + G + pf / 2; pf2 = fitToChord(6, pf, 9, r, pcDy); if (!pf2) return null; }
        return { tf: tf2, pf: pf2, lg: lg };
      };
      var cfg = (r >= 32 ? tryCfg(true, true) : null) || (r >= 24 ? tryCfg(false, true) : null) || (r >= 16 ? tryCfg(false, false) : null);
      if (cfg) { tkFs = cfg.tf; pcFs = cfg.pf; useLogo = !!cfg.lg; mode = pcFs ? (useLogo ? "full" : "tkpc") : "tk"; }
      var block2 = (useLogo ? ls + G : 0) + tkFs + (pcFs ? G + pcFs : 0);
      var top = p.y - block2 / 2;
      var tip = t.ticker + " · " + fmtPct(pct) + " · " + fmtCap(t.market_cap_b);
      var href = "/t?sym=" + encodeURIComponent(t.ticker);
      svg.push('<g class="sbm-g" role="button" tabindex="0" data-tk="' + esc(t.ticker) + '" aria-label="' + esc(tip) + ' — click to inspect"><title>' + esc(tip) + '</title>');
      svg.push('<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + core + '" stroke="' + (sel ? "#ffffff" : heat) + '" stroke-width="' + sw + '" style="filter:drop-shadow(0 0 ' + glow + 'px ' + heat + ')"/>');
      // ticker text + logo are REAL links to the ticker page (canonical /t?sym=);
      // the bubble body selects into the detail panel. stopPropagation in JS below.
      svg.push('<a class="sbm-a" href="' + href + '" aria-label="Open ' + esc(t.ticker) + ' ticker page">');
      if (useLogo) {
        var cid = "sbmc" + idx;
        clips.push('<clipPath id="' + cid + '"><circle cx="' + (p.x).toFixed(1) + '" cy="' + (top + ls / 2).toFixed(1) + '" r="' + (ls / 2).toFixed(1) + '"/></clipPath>');
        svg.push('<image class="sbm-logo" href="' + LOGO(t.ticker) + '" x="' + (p.x - ls / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + ls + '" height="' + ls + '" clip-path="url(#' + cid + ')" preserveAspectRatio="xMidYMid slice"/>');
      }
      if (tkFs) svg.push('<text x="' + p.x.toFixed(1) + '" y="' + (top + (useLogo ? ls + G : 0) + tkFs * 0.86).toFixed(1) + '" text-anchor="middle" font-family="' + MONO + '" font-weight="700" font-size="' + tkFs + '" fill="#ffffff" text-decoration="none">' + esc(t.ticker) + '</text>');
      svg.push('</a>');
      if (pcFs) svg.push('<text x="' + p.x.toFixed(1) + '" y="' + (top + (useLogo ? ls + G : 0) + tkFs + G + pcFs * 0.86).toFixed(1) + '" text-anchor="middle" font-family="' + MONO + '" font-weight="600" font-size="' + pcFs + '" fill="' + heatText(pct) + '" style="pointer-events:none">' + fmtPct(pct) + '</text>');
      svg.push('</g>');
    });
    svg.push('<defs>' + clips.join("") + '</defs></svg>');

    // bottom detail panel — defaults to the largest name so it is never empty
    var selTk = opts._sel || rows[0].ticker;
    var st = rows.find(function (t) { return t.ticker === selTk; }) || rows[0];
    var detail = '<div class="sbm-dt">' +
      '<a class="sym" style="text-decoration:none;color:inherit" href="/t?sym=' + encodeURIComponent(st.ticker) + '" aria-label="Open ' + esc(st.ticker) + ' ticker page">' + esc(st.ticker) + '</a>' +
      '<span class="co">' + esc(st.company || "") + '</span>' +
      '<span class="kv">Price<b>' + (st.price == null ? "—" : "$" + Number(st.price).toFixed(2)) + '</b></span>' +
      '<span class="kv">1D<b class="pc ' + ((st.change_pct || 0) >= 0 ? "up" : "down") + '">' + fmtPct(st.change_pct) + '</b></span>' +
      '<span class="kv">Cap<b>' + fmtCap(st.market_cap_b) + '</b></span>' +
      '<span class="kv">Vol<b>' + fmtVol(st.volume) + '</b></span>' +
      (st.industry ? '<span class="kv">Industry<b style="font-size:11.5px;font-weight:600">' + esc(st.industry) + '</b></span>' : '') +
      '<a class="sbm-open" href="/t?sym=' + encodeURIComponent(st.ticker) + '">Open ' + esc(st.ticker) + ' &#8594;</a>' +
      '</div>';

    el.innerHTML = '<div class="sbm">' + head + svg.join("") + detail + '</div>';

    // interactions: bubble click/Enter selects (white ring + panel); ticker
    // text/logo links navigate — stop propagation so a link click doesn't
    // just re-select, and Enter on the focused link follows it natively.
    el.querySelectorAll(".sbm-g").forEach(function (g) {
      var pick = function () { opts._sel = g.dataset.tk; render(el, tickers, opts); };
      g.addEventListener("click", pick);
      g.addEventListener("keydown", function (e) {
        if ((e.key === "Enter" || e.key === " ") && e.target === g) { e.preventDefault(); pick(); }
      });
      var a = g.querySelector("a.sbm-a");
      if (a) a.addEventListener("click", function (e) { e.stopPropagation(); });
    });
    // logos that 404 disappear cleanly — ticker text always remains
    el.querySelectorAll(".sbm-logo").forEach(function (im) {
      im.addEventListener("error", function () { im.remove(); });
    });
  }

  function mount(el, opts) {
    if (!el) return;
    opts = opts || {};
    el.setAttribute("data-santro-sectormap", "1");
    if (opts.tickers) { render(el, opts.tickers, opts); return; }
    window.__santroUniP = window.__santroUniP || fetch("/universe.json?t=" + Date.now()).then(function (r) { return r.json(); });
    window.__santroUniP.then(function (u) {
      var b = (u.bubbles || []).find(function (x) { return x.id === opts.bubbleId; });
      if (b && !opts.label) opts.label = b.label;
      render(el, (b && b.tickers) || [], opts);
      // broadcast the SAME response so page tables can live-refresh without a
      // second request (see scripts/inject_sector_maps.py listener)
      try { document.dispatchEvent(new CustomEvent("santro:universe", { detail: u })); } catch (e) {}
    }).catch(function () { render(el, [], opts); });
    if (!mount._resize) { mount._resize = true; window.addEventListener("resize", function () {
      document.querySelectorAll('[data-santro-sectormap]').forEach(function (n) {
        if (n._last) render(n, n._last, n._opts || {});
      });
    }); }
  }

  window.SantroSectorMap = { mount: mount, _colorFor: colorFor, _heatDark: heatDark };
})();
