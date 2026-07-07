/* Santro lock behavior — modal per registration-funnel.md.
   Triggered ONLY by user action; title mirrors intent; working auth methods
   only (email+password is live; Google is not configured, so it is absent —
   never shown broken). Return-to-context: element id stored, un-blurred in
   place once auth is detected (accounts.js renders #sa-acct on login). */
(function () {
  "use strict";
  var C = window.SantroLockCopy, E = window.SantroEvents;
  function authed() { return !!document.getElementById("sa-acct"); }
  function unlockAll() {
    document.querySelectorAll(".ds-blur").forEach(function (el) {
      el.classList.add("ds-unblur"); el.classList.remove("ds-blur");
      el.style.transition = "filter .2s"; el.style.filter = "none"; el.style.pointerEvents = "";
    });
    document.querySelectorAll("[data-lock-hide-authed]").forEach(function (el) { el.hidden = true; });
  }
  function openGate(intent, ctxId) {
    if (E) E.track("lock_click", { context: intent, id: ctxId || null });
    var title = (C.modal_titles[intent] || C.modal_titles.table);
    var scrim = document.createElement("div"); scrim.className = "ds-gate-scrim";
    var m = document.createElement("div"); m.className = "ds-gate";
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    m.innerHTML = '<h3><span class="ds-lock"></span>' + title + "</h3>" +
      "<p>" + C.modal_body + "</p>" +
      '<a class="ds-gate-cta" href="/signup">Create free account</a>' +
      '<a class="ds-gate-alt" href="/signin">Sign in</a>' +
      '<p class="ds-gate-foot">' + C.modal_footer + "</p>";
    function close() { scrim.remove(); m.remove(); document.removeEventListener("keydown", esc);
      if (E) E.track("modal_close", { context: intent }); }
    function esc(e) { if (e.key === "Escape") close(); }
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    try { localStorage.setItem("santro_return", location.pathname + (ctxId ? "#" + ctxId : "")); } catch (e) {}
    document.body.appendChild(scrim); document.body.appendChild(m);
    m.querySelector(".ds-gate-cta").focus();
    if (E) E.track("modal_open", { context: intent });
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-lock]");
    if (!t) return;
    e.preventDefault();
    if (authed()) { unlockAll(); return; }
    openGate(t.getAttribute("data-lock"), t.id);
  });
  // return-to-context + in-place unlock once authed (accounts.js is async)
  var tries = 0, iv = setInterval(function () {
    if (authed()) {
      clearInterval(iv); unlockAll();
      try {
        var r = localStorage.getItem("santro_return");
        if (r && r.indexOf("#") > -1 && location.pathname === r.split("#")[0]) {
          var el = document.getElementById(r.split("#")[1]);
          if (el) el.scrollIntoView({ block: "center" });
          localStorage.removeItem("santro_return");
        }
      } catch (e) {}
    } else if (++tries > 20) clearInterval(iv);
  }, 500);
  window.SantroLocks = { open: openGate, unlockAll: unlockAll };
})();
