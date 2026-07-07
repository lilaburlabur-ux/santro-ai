/* Santro compliance constants — ONE module (contract rule 4).
   Every data surface renders these; no other copy variants allowed. */
(function () {
  "use strict";
  window.SantroCompliance = {
    DELAYED: "Quotes delayed ~15 min",
    NFA: "Not financial advice",
    HOT: "Hot means attention, not direction",
    chip: function () { return '<span class="ds-comp-chip">' + this.DELAYED + "</span>"; },
    line: function () { return this.HOT + ". " + this.DELAYED + ". " + this.NFA + "."; }
  };
})();
