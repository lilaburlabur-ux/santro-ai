/* Santro AI — header behavior for the generated mega nav (see gen_nav.py).
   Owns: menu open/close, mobile drawer, theme (except pages that own it
   natively, e.g. the terminal's pill — data-native), ticker search (absolute
   paths so it works on nested pages), the as-of stamp, "/" hotkey, SW. */
(function () {
  "use strict";
  var HDR = document.getElementById("meganav");
  if (!HDR) return;

  // ── mega menus ──────────────────────────────────────────────────────────
  var items = [].slice.call(HDR.querySelectorAll(".mn-item"));
  function closeAll(except) {
    items.forEach(function (it) {
      if (it !== except) {
        it.classList.remove("open");
        it.querySelector(".mn-top").setAttribute("aria-expanded", "false");
      }
    });
  }
  items.forEach(function (it) {
    var btn = it.querySelector(".mn-top");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = it.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      closeAll(open ? it : null);
    });
  });
  document.addEventListener("click", function (e) {
    if (!HDR.contains(e.target)) closeAll(null);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeAll(null); closeDrawer(); }
  });

  // ── mobile drawer ───────────────────────────────────────────────────────
  var drawer = HDR.querySelector(".mn-drawer");
  var burger = HDR.querySelector(".mn-burger");
  function openDrawer() {
    drawer.classList.add("open");
    burger.setAttribute("aria-expanded", "true");
    document.documentElement.style.overflow = "hidden";
  }
  function closeDrawer() {
    if (!drawer.classList.contains("open")) return;
    drawer.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
    document.documentElement.style.overflow = "";
  }
  burger.addEventListener("click", openDrawer);
  drawer.querySelector(".mnd-close").addEventListener("click", closeDrawer);
  drawer.addEventListener("click", function (e) {
    if (e.target.closest("a")) closeDrawer(); // navigating away
  });

  // ── theme (skipped where the page owns its own toggle, e.g. terminal) ──
  var native = HDR.querySelector('[data-native]');
  var themeBtn = HDR.querySelector(".mn-theme");
  function applyTheme(mode, save) {
    document.documentElement.dataset.theme = mode;
    if (save) try { localStorage.setItem("santro-theme", mode); } catch (e) {}
  }
  if (!native) {
    var saved = "dark";
    try { saved = localStorage.getItem("santro-theme") || "dark"; } catch (e) {}
    applyTheme(saved, false);
    if (themeBtn) themeBtn.addEventListener("click", function () {
      applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light", true);
    });
  }

  // ── as-of stamp (terminal overwrites with its own richer clock) ────────
  fetch("/data.json?t=" + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) {
      var el = document.getElementById("asof");
      if (el && d.as_of_local && !el.textContent) el.textContent = "As of " + d.as_of_local;
    }).catch(function () {});

  // ── ticker search (from site.js, with absolute paths) ──────────────────
  var mount = HDR.querySelector(".mn-search");
  if (mount) (function () {
    mount.innerHTML =
      '<div class="box">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">' +
        '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
        '<input placeholder="Search" autocomplete="off" spellcheck="false" aria-label="Search tickers" />' +
        '<span class="kbd">/</span></div>' +
      '<div class="drop" style="display:none"></div>';
    var input = mount.querySelector("input"), drop = mount.querySelector(".drop"),
        kbd = mount.querySelector(".kbd");
    var idx = null, sel = 0, rows = [];
    var logoUrl = function (s) { return s === "SPCX" ? "/assets/spacex.png"
      : "https://assets.parqet.com/logos/symbol/" + encodeURIComponent(s.split(".")[0]) + "?format=png&size=64"; };
    var fmtPct = function (x) { return (x >= 0 ? "+" : "") + Number(x).toFixed(2) + "%"; };
    var idxPromise = null;
    function loadIndex() {
      if (!idxPromise) idxPromise = (async function () {
        var list = [], seen = {};
        var add = function (t) { if (!seen[t.ticker]) { seen[t.ticker] = 1;
          list.push({ tk: t.ticker, nm: t.company || t.ticker, pc: t.change_pct || 0,
                      mc: t.market_cap_b || 0 }); } };
        try {
          var u = await (await fetch("/universe.json?t=" + Date.now())).json();
          u.bubbles.forEach(function (b) { b.tickers.forEach(add); });
        } catch (e) {}
        try {
          var e2 = await (await fetch("/ecosystem.json?t=" + Date.now())).json();
          e2.tickers.forEach(add);
        } catch (e) {}
        idx = list;
        return list;
      })();
      return idxPromise;
    }
    function score(t, q) {
      var tk = t.tk.toLowerCase(), nm = t.nm.toLowerCase();
      if (tk === q) return 0; if (tk.indexOf(q) === 0) return 1;
      if (nm.indexOf(q) === 0) return 2; if (tk.indexOf(q) > -1) return 3;
      if (nm.indexOf(q) > -1) return 4; return 9;
    }
    function render() {
      var q = input.value.trim().toLowerCase();
      if (!q || !idx) { drop.style.display = "none"; rows = []; return; }
      rows = idx.map(function (t) { return [score(t, q), t]; })
        .filter(function (x) { return x[0] < 9; })
        .sort(function (a, b) { return a[0] - b[0] || b[1].mc - a[1].mc; })
        .slice(0, 8).map(function (x) { return x[1]; });
      if (!rows.length) { drop.style.display = "none"; return; }
      sel = Math.min(sel, rows.length - 1);
      drop.innerHTML = rows.map(function (t, i) {
        return '<div class="sg' + (i === sel ? " active" : "") + '" data-tk="' + t.tk + '">' +
          '<img src="' + logoUrl(t.tk) + '" onerror="this.style.visibility=\'hidden\'" alt="">' +
          '<span class="tk">' + t.tk + '</span><span class="nm">' + t.nm + '</span>' +
          '<span class="pc ' + (t.pc >= 0 ? "up" : "down") + '">' + fmtPct(t.pc) + '</span></div>';
      }).join("");
      drop.style.display = "";
      [].forEach.call(drop.querySelectorAll(".sg"), function (el) {
        el.addEventListener("mousedown", function (e) { e.preventDefault(); go(el.dataset.tk); });
      });
    }
    var go = function (tk) { location.href = "/t?sym=" + encodeURIComponent(tk); };
    input.addEventListener("focus", async function () { kbd.textContent = "esc"; await loadIndex(); render(); });
    input.addEventListener("blur", function () { kbd.textContent = "/"; setTimeout(function () { drop.style.display = "none"; }, 150); });
    input.addEventListener("input", async function () { sel = 0; await loadIndex(); render(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { sel = Math.min(sel + 1, rows.length - 1); render(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); render(); e.preventDefault(); }
      else if (e.key === "Enter") { if (rows[sel]) go(rows[sel].tk); }
      else if (e.key === "Escape") { input.value = ""; drop.style.display = "none"; input.blur(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== input &&
          !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) {
        e.preventDefault(); input.focus();
      }
    });
  })();

  // ── PWA (moved from site.js; static assets only, data stays live) ──────
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }
})();
