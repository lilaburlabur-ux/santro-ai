/* Santro Accounts — frontend config (the "env" for a static site).
 *
 * No secrets here — only public, build-time configuration. To point the UI at a
 * real backend, set apiMode:"live" and apiBase to the API origin. CORS on the
 * backend must allow this site's origin and credentials.
 *
 * Override at deploy time by defining window.SANTRO_CONFIG before this file
 * loads (e.g. an injected <script>), or just edit the defaults below.
 */
// Dev/staging convenience: point at a live backend without editing this file via
//   ?santro_api=https://api.santroai.tech   (or localStorage SANTRO_API_BASE)
// In production you wouldn't pass it, so your deploy config wins.
var _override = {};
try {
  var _u = new URLSearchParams(location.search).get("santro_api") ||
           localStorage.getItem("SANTRO_API_BASE");
  if (_u) { _override.apiMode = "live"; _override.apiBase = _u; }
} catch (e) {}

window.SANTRO_CONFIG = Object.assign(
  {
    // "live"  → talk to the FastAPI backend at apiBase (cookies, credentials:include)
    // "mock"  → in-memory fixture so the full UX works with no backend (local/demo)
    apiMode: "live",

    // Backend origin. Empty = same origin. Example: "https://api.santroai.tech"
    // Same-site subdomain of santroai.tech → session cookies are first-party
    // (no third-party-cookie blocking by Safari/ITP or Chrome's 3p phase-out).
    apiBase: "https://api.santroai.tech",

    // Valuation math runs client-side (scenario outputs on delayed data).
    // There is no server valuation endpoint; metering IS server-side (/usage).

    // Only used by the dev mock so the demo behaves like a real meter.
    // The LIVE app never reads this — it reads remaining runs from /usage/status.
    mockFreeRuns: 4,
  },
  window.SANTRO_CONFIG || {},
  _override
);
