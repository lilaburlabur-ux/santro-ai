/* Santro — Energy heat sub-map (Powering AI section).
   Self-contained, no ECharts dependency. Renders the AI-power/energy names as
   SVG bubbles: area ∝ market cap, color ∝ heat (day move), greedy-packed.
   ds_v2 tokens only (green/red/amber, never blue). Reads the energy bubble
   from universe.json OR an injected dataset. Click → /t?sym=SYM.

   Usage:  SantroEnergyMap.mount(document.getElementById("energy-submap"));
           SantroEnergyMap.mount(el, { tickers: [...] });   // explicit data
*/
(function () {
  "use strict";
  var GREEN = "var(--green,#22c55e)", RED = "var(--red,#f05a6e)", AMBER = "var(--amber,#e0a73f)";
  var BUBBLE_ID = "data_center_power_and_energy";
  // sub-theme tags so the same map doubles as a legend for the Powering AI story
  var SUBTHEME = {
    generation: "Generation", nuclear: "Nuclear & IPP", uranium: "Fuel · Uranium",
    electrical: "Electrical & Turbines", grid: "Grid · Utilities", infra: "Data-center infra"
  };

  function heatColor(pct) {
    if (pct == null) return "var(--st-ink-dim,#7E8C84)";
    if (pct >= 2) return GREEN; if (pct > 0) return "color-mix(in srgb," + GREEN + " 70%, transparent)";
    if (pct <= -2) return RED; if (pct < 0) return "color-mix(in srgb," + RED + " 70%, transparent)";
    return AMBER;
  }
  function fmtPct(p) { return p == null ? "—" : (p >= 0 ? "+" : "") + p.toFixed(1) + "%"; }
  function fmtCap(b) { return b == null ? "" : b >= 1000 ? "$" + (b / 1000).toFixed(1) + "T" : "$" + Math.round(b) + "B"; }

  // Circle packing in two phases:
  //  1) spiral seed — biggest cap at center, each next name spirals outward to
  //     the first free spot; the spiral reach scales with the canvas (the old
  //     fixed-pixel reach ran out of room on wide screens and stacked bubbles).
  //  2) relaxation — push any residual overlaps apart and clamp to bounds, so
  //     zero overlap is guaranteed at every viewport width.
  function pack(items, W, H) {
    // Area-based sizing: area ∝ cap, scaled so the circles fill ~38% of the
    // canvas — guarantees they physically fit, which makes packing solvable.
    var sumCap = items.reduce(function (s, t) { return s + (t.market_cap_b || 1); }, 0) || 1;
    var scale = (W * H * 0.38) / sumCap;
    var cx = W / 2, cy = H / 2, placed = [];
    var K = 14000, reach = Math.max(W, H) * 0.72;      // spiral covers the whole canvas
    items.forEach(function (t) {
      var r = Math.max(18, Math.sqrt(((t.market_cap_b || 1) * scale) / Math.PI));
      var best = null;
      for (var k = 0; k < K && !best; k++) {
        var ang = k * 0.5, dist = reach * Math.sqrt(k / K);
        var x = cx + Math.cos(ang) * dist, y = cy + Math.sin(ang) * dist * (H / W);
        if (x - r < 3 || x + r > W - 3 || y - r < 3 || y + r > H - 3) continue;
        var hit = placed.some(function (p) { return Math.hypot(p.x - x, p.y - y) < p.r + r + 4; });
        if (!hit) best = { x: x, y: y, r: r, t: t };
      }
      placed.push(best || { x: cx, y: cy, r: r, t: t });
    });
    // relaxation: resolve any residual overlaps (fallback placements included)
    for (var pass = 0; pass < 260; pass++) {
      var moved = false;
      for (var i = 0; i < placed.length; i++) for (var j = i + 1; j < placed.length; j++) {
        var a = placed[i], b = placed[j];
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
        var need = a.r + b.r + 4 - d;
        if (need > 0) {
          var ux = dx / d, uy = dy / d, sh = need / 2 + 0.5;
          a.x -= ux * sh; a.y -= uy * sh; b.x += ux * sh; b.y += uy * sh; moved = true;
        }
      }
      placed.forEach(function (p) {
        p.x = Math.min(W - 3 - p.r, Math.max(3 + p.r, p.x));
        p.y = Math.min(H - 3 - p.r, Math.max(3 + p.r, p.y));
      });
      if (!moved) break;
    }
    return placed;
  }

  function render(el, tickers) {
    el._last = tickers;                                  // for resize re-pack
    var W = Math.max(320, el.clientWidth || 680);
    var H = Math.min(620, Math.max(300, Math.round(W * 0.56)));  // cap on ultra-wide
    var rows = (tickers || []).filter(function (t) { return t && t.ticker; })
      .sort(function (a, b) { return (b.market_cap_b || 0) - (a.market_cap_b || 0); });
    if (!rows.length) { el.innerHTML = '<p style="color:var(--faint,#5a6573);font-size:13px;padding:20px">Powering-AI names loading…</p>'; return; }
    var packed = pack(rows, W, H);
    var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="AI energy heat sub-map" style="display:block">'];
    packed.forEach(function (p) {
      var t = p.t, col = heatColor(t.change_pct), fs = Math.max(11, Math.min(20, p.r * 0.42));
      svg.push('<a href="/t?sym=' + encodeURIComponent(t.ticker) + '" role="link" aria-label="' + t.ticker + ' ' + fmtPct(t.change_pct) + '">');
      svg.push('<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + p.r.toFixed(1) + '" fill="' + col + '" fill-opacity="0.16" stroke="' + col + '" stroke-width="1.5"/>');
      svg.push('<text x="' + p.x.toFixed(1) + '" y="' + (p.y - p.r * 0.06).toFixed(1) + '" text-anchor="middle" font-family="var(--font-mono,monospace)" font-weight="700" font-size="' + fs.toFixed(0) + '" fill="var(--text,#e7edf3)">' + t.ticker + '</text>');
      svg.push('<text x="' + p.x.toFixed(1) + '" y="' + (p.y + p.r * 0.34).toFixed(1) + '" text-anchor="middle" font-family="var(--font-mono,monospace)" font-weight="600" font-size="' + (fs * 0.72).toFixed(0) + '" fill="' + col + '">' + fmtPct(t.change_pct) + '</text>');
      svg.push('</a>');
    });
    svg.push('</svg>');
    el.innerHTML = svg.join("");
  }

  function mount(el, opts) {
    if (!el) return;
    opts = opts || {};
    el.setAttribute("data-santro-energymap", "1");
    if (opts.tickers) { render(el, opts.tickers); return; }
    fetch("/universe.json?t=" + Date.now()).then(function (r) { return r.json(); }).then(function (u) {
      var b = (u.bubbles || []).find(function (x) { return x.id === (opts.bubbleId || BUBBLE_ID); });
      render(el, (b && b.tickers) || []);
    }).catch(function () { render(el, []); });
    if (!mount._resize) { mount._resize = true; window.addEventListener("resize", function () {
      document.querySelectorAll('[data-santro-energymap]').forEach(function (n) {
        if (n._last) render(n, n._last);
      });
    }); }
  }

  window.SantroEnergyMap = { mount: mount, _heatColor: heatColor, SUBTHEME: SUBTHEME };
})();
