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
    ds_v2: false // master switch for the v2 design system
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
    (root || document.documentElement).classList.toggle("ds-v2", isEnabled("ds_v2"));
  }
  window.SantroFlags = { isEnabled: isEnabled, flagOn: flagOn, flagOff: flagOff, applyDesignFlags: applyDesignFlags };
  applyDesignFlags();
})();
