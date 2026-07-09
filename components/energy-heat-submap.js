/* DEPRECATED — replaced by components/sector-bubble-map.js (the shared premium
   sector renderer). Kept only so cached HTML referencing this file does not 404.
   Do not mount on new pages.

   Santro — Energy heat sub-map (Powering AI section). v3
   Self-contained, no ECharts dependency. Renders the AI-power/energy names as
   SVG bubbles: area ∝ market cap, color ∝ heat (day move), deterministic
   spiral + relaxation packing. ds_v2 tokens only (green/red/amber, never blue).
   Click → /t?sym=SYM.

   Label discipline (premium-terminal rules):
     r >= 34  → ticker + percent (both fit-checked against the circle chord)
     r >= 20  → ticker only
     r <  20  → no inner text; info lives in the hover tooltip / aria-label
   Text is IBM Plex Mono via --font-mono. No line may overflow its bubble.

   Usage:  SantroEnergyMap.mount(document.getElementById("energy-submap"));
           SantroEnergyMap.mount(el, { tickers: [...] });   // explicit data
*/
(function () {
  "use strict";
  var GREEN = "var(--green,#22c55e)", RED = "var(--red,#f05a6e)", AMBER = "var(--amber,#e0a73f)";
  var MONO = "var(--font-mono,'IBM Plex Mono',ui-monospace,monospace)";
  var BUBBLE_ID = "data_center_power_and_energy";
  var CHAR_W = 0.62;               // IBM Plex Mono advance width ≈ 0.6em; 0.62 is safe
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
  function fmtCap(b) { return b == null ? "—" : b >= 1000 ? "$" + (b / 1000).toFixed(1) + "T" : "$" + Math.round(b) + "B"; }

  // ---- label rules ---------------------------------------------------------
  function getBubbleLabelMode(r) { return r >= 34 ? "full" : r >= 20 ? "ticker" : "none"; }
  function shouldShowLabel(r)   { return getBubbleLabelMode(r) !== "none"; }
  function shouldShowPercent(r) { return getBubbleLabelMode(r) === "full"; }
  function shouldShowLogo()     { return false; }   // SVG sub-map stays logo-free by design
  function getTickerFontSize(r) { return Math.max(10, Math.min(20, Math.round(r * 0.36))); }
  function getPercentFontSize(r){ return Math.max(9,  Math.min(14, Math.round(getTickerFontSize(r) * 0.72))); }
  // widest text that fits across the circle at vertical offset dy, minus padding
  function chordFit(r, dy, pad) {
    var h = r * r - dy * dy;
    return h <= 0 ? 0 : 2 * Math.sqrt(h) - (pad || 8);
  }
  // shrink fs until `len` mono chars fit the chord at dy; 0 = cannot fit at min size
  function fitToChord(len, fs, minFs, r, dy) {
    while (fs >= minFs) {
      if (len * CHAR_W * fs <= chordFit(r, Math.abs(dy) + fs * 0.5, 8)) return fs;
      fs--;
    }
    return 0;
  }

  // ---- packing -------------------------------------------------------------
  // 1) spiral seed — biggest cap at center, spiral reach scales with canvas
  // 2) relaxation — push residual overlaps apart, clamp to bounds (guaranteed
  //    zero overlap at every viewport width). Deterministic: sorted input, no
  //    randomness, so the layout is stable between refreshes of the same data.
  function pack(items, W, H) {
    var sumCap = items.reduce(function (s, t) { return s + (t.market_cap_b || 1); }, 0) || 1;
    var scale = (W * H * 0.38) / sumCap;
    var rMax = Math.min(W, H) * 0.34;
    var cx = W / 2, cy = H / 2, placed = [];
    var K = 14000, reach = Math.max(W, H) * 0.72;
    items.forEach(function (t) {
      var r = Math.sqrt(((t.market_cap_b || 1) * scale) / Math.PI);
      r = Math.max(12, Math.min(rMax, r));            // readable min, non-dominating max
      var best = null;
      for (var k = 0; k < K && !best; k++) {
        var ang = k * 0.5, dist = reach * Math.sqrt(k / K);
        var x = cx + Math.cos(ang) * dist, y = cy + Math.sin(ang) * dist * (H / W);
        if (x - r < 3 || x + r > W - 3 || y - r < 3 || y + r > H - 3) continue;
        var hit = placed.some(function (p) { return Math.hypot(p.x - x, p.y - y) < p.r + r + 6; });
        if (!hit) best = { x: x, y: y, r: r, t: t };
      }
      placed.push(best || { x: cx, y: cy, r: r, t: t });
    });
    for (var pass = 0; pass < 260; pass++) {
      var moved = false;
      for (var i = 0; i < placed.length; i++) for (var j = i + 1; j < placed.length; j++) {
        var a = placed[i], b = placed[j];
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
        var need = a.r + b.r + 6 - d;                 // pad covers stroke + hover ring
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

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  function render(el, tickers) {
    el._last = tickers;                                  // for resize re-pack
    var W = Math.max(320, el.clientWidth || 680);
    var H = Math.min(620, Math.max(300, Math.round(W * 0.56)));  // cap on ultra-wide
    var rows = (tickers || []).filter(function (t) { return t && t.ticker; })
      .sort(function (a, b) { return (b.market_cap_b || 0) - (a.market_cap_b || 0); });
    if (!rows.length) { el.innerHTML = '<p style="color:var(--faint,#5a6573);font-size:13px;padding:20px;font-family:' + MONO + '">Powering-AI names loading…</p>'; return; }
    var packed = pack(rows, W, H);
    var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="AI energy heat sub-map" style="display:block">',
      '<style>',
      '.emb{transition:filter .12s ease}',
      'a:hover .emb,a:focus-visible .emb{filter:brightness(1.3)}',
      'a:hover .emb-ring,a:focus-visible .emb-ring{stroke-width:3px}',
      '</style>'];
    packed.forEach(function (p) {
      var t = p.t, r = p.r, col = heatColor(t.change_pct);
      var sw = Math.max(1.25, Math.min(2.75, 1.25 + r * 0.02));   // stroke scales, stays elegant
      var mode = getBubbleLabelMode(r);
      var tkFs = 0, pcFs = 0, tkY = 0, pcY = 0, GAP = 3;
      if (mode !== "none") {
        var len = String(t.ticker).length;
        if (mode === "full") {
          tkFs = fitToChord(len, getTickerFontSize(r), 10, r, -getPercentFontSize(r) * 0.6);
          pcFs = tkFs ? fitToChord(6, getPercentFontSize(r), 9, r, tkFs * 0.7) : 0;
          if (!pcFs) mode = "ticker";                    // percent can't fit → ticker only
          if (!tkFs) mode = "ticker";
        }
        if (mode === "ticker") {
          tkFs = fitToChord(len, getTickerFontSize(r), 10, r, 0);
          if (!tkFs) mode = "none";                      // ticker can't fit → no inner text
          pcFs = 0;
        }
        if (mode === "full") {
          var block = tkFs + GAP + pcFs;                 // consistent two-line rhythm
          tkY = p.y - block / 2 + tkFs * 0.82;
          pcY = p.y - block / 2 + tkFs + GAP + pcFs * 0.82;
        } else if (mode === "ticker") {
          tkY = p.y + tkFs * 0.34;                       // optically centered single line
        }
      }
      var tip = t.ticker + " · " + fmtPct(t.change_pct) + " · " + fmtCap(t.market_cap_b);
      svg.push('<a href="/t?sym=' + encodeURIComponent(t.ticker) + '" role="link" aria-label="' + esc(t.ticker + " " + fmtPct(t.change_pct)) + '">');
      svg.push('<title>' + esc(tip) + '</title>');
      svg.push('<circle class="emb emb-ring" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + col + '" fill-opacity="0.14" stroke="' + col + '" stroke-width="' + sw.toFixed(2) + '"/>');
      if (tkFs) svg.push('<text x="' + p.x.toFixed(1) + '" y="' + tkY.toFixed(1) + '" text-anchor="middle" font-family="' + MONO + '" font-weight="700" font-size="' + tkFs + '" fill="var(--text,#e7edf3)" style="pointer-events:none">' + esc(t.ticker) + '</text>');
      if (pcFs) svg.push('<text x="' + p.x.toFixed(1) + '" y="' + pcY.toFixed(1) + '" text-anchor="middle" font-family="' + MONO + '" font-weight="600" font-size="' + pcFs + '" fill="' + col + '" style="pointer-events:none">' + fmtPct(t.change_pct) + '</text>');
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

  window.SantroEnergyMap = {
    mount: mount, _heatColor: heatColor, SUBTHEME: SUBTHEME,
    // label-rule helpers exported for tests
    getBubbleLabelMode: getBubbleLabelMode, getTickerFontSize: getTickerFontSize,
    getPercentFontSize: getPercentFontSize, shouldShowLogo: shouldShowLogo,
    shouldShowPercent: shouldShowPercent, shouldShowLabel: shouldShowLabel
  };
})();
