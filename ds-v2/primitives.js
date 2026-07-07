/* Santro ds_v2 — primitive behaviors (Phase 1): modal/drawer open-close,
   focus trap, Esc. No styling here — CSS owns the look; this file only
   toggles state. Inert unless markup opts in via data-ds-modal-open. */
(function () {
  "use strict";
  var openModal = null, lastFocus = null;

  function focusables(el) {
    return el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
  }
  function open(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    lastFocus = document.activeElement;
    var scrim = document.createElement("div");
    scrim.className = "ds-scrim"; scrim.setAttribute("data-ds-scrim", id);
    scrim.addEventListener("click", close);
    modal.parentNode.insertBefore(scrim, modal);
    modal.hidden = false;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    openModal = modal;
    var f = focusables(modal); if (f.length) f[0].focus();
    document.documentElement.style.overflow = "hidden";
  }
  function close() {
    if (!openModal) return;
    var scrim = document.querySelector('[data-ds-scrim="' + openModal.id + '"]');
    if (scrim) scrim.remove();
    openModal.hidden = true;
    openModal = null;
    document.documentElement.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-ds-modal-open]");
    if (t) { e.preventDefault(); open(t.getAttribute("data-ds-modal-open")); return; }
    if (e.target.closest("[data-ds-modal-close]")) { e.preventDefault(); close(); }
  });
  document.addEventListener("keydown", function (e) {
    if (!openModal) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Tab") { // focus trap
      var f = focusables(openModal); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.SantroDS = { openModal: open, closeModal: close };
})();
