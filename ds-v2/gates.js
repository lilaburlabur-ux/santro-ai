/* Santro gating config — ONE source (locked-data-strategy.md is law).
   feature -> "anon" | "free" | "pro". Components read this; no inline
   gating decisions anywhere. Pro renders no upsell until Pro launches. */
(function () {
  "use strict";
  window.SantroGates = {
    bubble_index_today: "anon", bubble_index_components: "free", bubble_index_history_90d: "free",
    hot_tickers_top5: "anon", hot_tickers_full: "free",
    heat_map: "anon", map_save_view: "free",
    etf_top10: "anon", etf_full_table: "free",
    crypto_top5: "anon", crypto_full: "free",
    why_moving_first_line: "anon", why_moving_full: "free", why_moving_daily_sample: "anon",
    stress_sample_scenario1: "anon", stress_custom_full: "free",
    watchlist: "free", alerts: "free",
    calc_run: "anon", calc_save: "free",
    share_preview: "anon", share_export: "free",
    research_read: "anon", research_bookmark: "free",
    tracker_pages: "anon", tracker_alerts: "free",
    heat_history_30d: "anon", heat_history_12m: "free",
    quiz_calibration: "free",
    tier: function (feature) { return this[feature] || "free"; }
  };
})();
