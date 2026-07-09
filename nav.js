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

  // ── theme: ONE global system (window.SantroTheme) ──────────────────────
  // Root cause of "toggle changes nothing": remap.css pins dark tokens at
  // html.ds-v2, which outranks the legacy light overrides — the attribute
  // changed but pixels didn't until a reload re-evaluated the flag. The fix:
  // every theme change ALSO re-applies design flags in the same tick, so
  // light = legacy-light instantly and dark = ds_v2 instantly, on every page.
  var native = HDR.querySelector('[data-native]');
  var themeBtn = HDR.querySelector(".mn-theme");
  function setTheme(mode, save) {
    document.documentElement.dataset.theme = mode;
    if (save !== false) try { localStorage.setItem("santro-theme", mode); } catch (e) {}
    if (window.SantroFlags) window.SantroFlags.applyDesignFlags();
  }
  window.SantroTheme = { set: setTheme,
    toggle: function () { setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"); } };
  if (!native) {
    var saved = "dark";
    try { saved = localStorage.getItem("santro-theme") || "dark"; } catch (e) {}
    setTheme(saved, false);
    if (themeBtn) themeBtn.addEventListener("click", function () { window.SantroTheme.toggle(); });
  } else {
    // native owners (terminal) run their own handler + chart repaint first;
    // we sync the design flag right after, on the same click
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest('.mn-theme[data-native]'))
        setTimeout(function () { if (window.SantroFlags) window.SantroFlags.applyDesignFlags(); }, 0);
    });
  }

  // ── as-of stamp (terminal overwrites with its own richer clock) ────────
  fetch("/data.json?t=" + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) {
      // class-scoped to the header: pages like /crypto own a separate #asof
      // badge that must not be hijacked by a duplicate id
      var el = HDR.querySelector(".mn-asof");
      if (el && d.as_of_local && !el.textContent) el.textContent = "As of " + d.as_of_local;
    }).catch(function () {});

  var idxPromise = null; // shared ticker-index fetch for all search mounts

  // ── drawer theme proxy: clicks the bar toggle so native owners
  //    (terminal repaints its chart) keep working ──────────────────────────
  var mndTheme = HDR.querySelector(".mnd-theme");
  if (mndTheme) mndTheme.addEventListener("click", function () {
    var t = HDR.querySelector('.mn-theme[data-native]') || themeBtn;
    if (t) t.click();
  });

  // ── ticker search: mounted in the bar AND the drawer (shared index).
  //    Below 1280px the bar instance collapses to an icon and expands
  //    on click. ─────────────────────────────────────────────────────────
  HDR.querySelectorAll(".mn-search").forEach(function (mount) { mountSearch(mount); });
  function mountSearch(mount) {
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
    // (idxPromise is shared below so bar+drawer mounts fetch once)
    var logoUrl = function (s) { return s === "SPCX" ? "/assets/spacex.png"
      : "https://assets.parqet.com/logos/symbol/" + encodeURIComponent(s.split(".")[0]) + "?format=png&size=64"; };
    var fmtPct = function (x) { return (x >= 0 ? "+" : "") + Number(x).toFixed(2) + "%"; };
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
        // feature/research pages — searchable by name and keywords
        [
          { page: 1, nm: "Investor Signal Library", url: "/investor-signals",
            kw: "investor signals signal library verified investor plays smart money conviction disclosed positioning" },
          { page: 1, nm: "Michael Burry — AI Short Watch", url: "/stocks/burry-short-watch",
            kw: "burry michael burry scion ai short watch puts shorts 13f" },
          { page: 1, nm: "Aschenbrenner — AI Infrastructure Basket", url: "/stocks/aschenbrenner",
            kw: "aschenbrenner leopold situational awareness ai infrastructure basket 13f powering" },
          { page: 1, nm: "Powering AI — energy theme", url: "/stocks/themes/powering-ai",
            kw: "powering ai energy nuclear uranium grid turbines power" }
        ].forEach(function (p) { list.push(p); });
        idx = list;
        return list;
      })();
      return idxPromise;
    }
    function score(t, q) {
      if (t.page) {   // feature/research pages — matched on name + keywords
        var pn = t.nm.toLowerCase();
        if (pn.indexOf(q) === 0) return 2; if (pn.indexOf(q) > -1) return 4;
        if (t.kw.indexOf(q) > -1) return 5; return 9;
      }
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
        .sort(function (a, b) { return a[0] - b[0] || (b[1].mc || 0) - (a[1].mc || 0); })
        .slice(0, 8).map(function (x) { return x[1]; });
      if (!rows.length) { drop.style.display = "none"; return; }
      sel = Math.min(sel, rows.length - 1);
      drop.innerHTML = rows.map(function (t, i) {
        if (t.page) {
          return '<div class="sg' + (i === sel ? " active" : "") + '" data-i="' + i + '">' +
            '<img src="/assets/favicon-48.png" alt="">' +
            '<span class="nm" style="grid-column:span 2">' + t.nm + '</span>' +
            '<span class="pc" style="color:var(--faint,#5a6573);font-size:9px;letter-spacing:.08em">PAGE</span></div>';
        }
        return '<div class="sg' + (i === sel ? " active" : "") + '" data-i="' + i + '">' +
          '<img src="' + logoUrl(t.tk) + '" onerror="this.style.visibility=\'hidden\'" alt="">' +
          '<span class="tk">' + t.tk + '</span><span class="nm">' + t.nm + '</span>' +
          '<span class="pc ' + (t.pc >= 0 ? "up" : "down") + '">' + fmtPct(t.pc) + '</span></div>';
      }).join("");
      drop.style.display = "";
      [].forEach.call(drop.querySelectorAll(".sg"), function (el) {
        el.addEventListener("mousedown", function (e) { e.preventDefault(); go(rows[+el.dataset.i]); });
      });
    }
    var go = function (t) {
      if (!t) return;
      location.href = t.page ? t.url : "/t?sym=" + encodeURIComponent(t.tk);
    };
    input.addEventListener("focus", async function () { kbd.textContent = "esc"; await loadIndex(); render(); });
    input.addEventListener("blur", function () { kbd.textContent = "/"; setTimeout(function () { drop.style.display = "none"; }, 150); });
    input.addEventListener("input", async function () { sel = 0; await loadIndex(); render(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { sel = Math.min(sel + 1, rows.length - 1); render(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); render(); e.preventDefault(); }
      else if (e.key === "Enter") { if (rows[sel]) go(rows[sel]); }
      else if (e.key === "Escape") { input.value = ""; drop.style.display = "none"; input.blur(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== input &&
          !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "") &&
          mount.offsetParent !== null) {
        e.preventDefault();
        mount.classList.add("open"); input.focus();
      }
    });
    // icon-mode: clicking the collapsed box expands and focuses
    mount.querySelector(".box").addEventListener("click", function () {
      if (!mount.classList.contains("open")) { mount.classList.add("open"); input.focus(); }
    });
    input.addEventListener("blur", function () {
      setTimeout(function () { mount.classList.remove("open"); }, 200);
    });
  }

  // ── PWA (moved from site.js; static assets only, data stays live) ──────
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }
})();
