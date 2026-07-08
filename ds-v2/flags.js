/* Santro feature flags — Phase 0.
   ds_v2 is OFF by default everywhere. Production renders pixel-identical
   until this flag is explicitly enabled (per environment or per browser
   via localStorage override for QA).
   ADAPTED from the design-lab handoff: the real repo is a static site with
   no bundler, so this is a classic script exposing window.SantroFlags and
   self-applying at load instead of an ES module. Logic is unchanged. */
(function () {
  "use strict";
  var FLAGS = {
    ds_v2: true // RELEASED 2026-07-08 — production default ON, BOTH themes.
    // Light tokens shipped same day (html.ds-v2[data-theme="light"] in
    // tokens.css). The old "light sessions stay legacy" bail-out that lived
    // here was the ROOT CAUSE of blue light mode — do not reintroduce it.
  };
  function isEnabled(name) {
    try {
      var override = localStorage.getItem("flag:" + name);
      if (override !== null) return override === "1";
    } catch (e) { /* storage blocked — fall through to default */ }
    return !!FLAGS[name];
  }
  /* QA helpers: SantroFlags.flagOn('ds_v2') / .flagOff('ds_v2') in the console */
  function flagOn(name)  { localStorage.setItem("flag:" + name, "1"); location.reload(); }
  function flagOff(name) { localStorage.setItem("flag:" + name, "0"); location.reload(); }
  /* Adds .ds-v2 to <html> only when enabled — tokens.css rules are all
     scoped to that class (variables on :root are inert by definition). */
  function applyDesignFlags(root) {
    var on = isEnabled("ds_v2");
    (root || document.documentElement).classList.toggle("ds-v2", on);
    // fonts load ONLY when ds_v2 is active (handoff: no font cost flag-off)
    if (on && !document.querySelector("link[data-ds-fonts]")) {
      var l = document.createElement("link");
      l.rel = "stylesheet"; l.href = "/ds-v2/fonts.css"; l.setAttribute("data-ds-fonts", "1");
      (document.head || document.documentElement).appendChild(l);
    }
    // Newsreader ONLY on editorial shells (contract: article display headings)
    if (on && document.body && document.body.classList.contains("shell-article") &&
        !document.querySelector("link[data-ds-fonts-ed]")) {
      var e = document.createElement("link");
      e.rel = "stylesheet"; e.href = "/ds-v2/fonts-editorial.css"; e.setAttribute("data-ds-fonts-ed", "1");
      document.head.appendChild(e);
    }
  }
  window.SantroFlags = { isEnabled: isEnabled, flagOn: flagOn, flagOff: flagOff, applyDesignFlags: applyDesignFlags };
  applyDesignFlags();
})();
