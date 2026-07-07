/* Santro analytics events — contract deviation documented in
   docs/rebuild-plan.md: no analytics backend exists yet, so events queue to
   localStorage (santro_events, capped 200) + console.debug. Swap the sink
   for a backend endpoint later without touching call sites. */
(function () {
  "use strict";
  function track(name, props) {
    var ev = { t: Date.now(), name: name, props: props || {} };
    try {
      var q = JSON.parse(localStorage.getItem("santro_events") || "[]");
      q.push(ev); if (q.length > 200) q = q.slice(-200);
      localStorage.setItem("santro_events", JSON.stringify(q));
    } catch (e) {}
    if (window.console && console.debug) console.debug("[santro-ev]", name, props || {});
  }
  window.SantroEvents = { track: track };
})();
