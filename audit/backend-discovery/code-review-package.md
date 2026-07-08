# Code review package (for external second opinion)

No secrets in any listed file — the frontend "env" (`accounts/config.js`) is public config by design; backend env values live only on Render and are NOT included.

## Tier 1 — the broken flows live here (share full files)

| File | Why it matters | Key functions | Suspected issue | Share full? |
|---|---|---|---|---|
| `accounts/auth-pages.js` (frontend) | The "Customize your terminal" panel; signup/signin redirects; dead `santro_quiz` chip | `renderDashboard`, `savePrefs` (l.218-228), `renderSignup` (l.60-95), `renderSignin` (l.99-…) | Writes prefs nobody reads; signup ignores return-context; dead localStorage key | **YES** (~240 lines) |
| `accounts/accounts.js` (frontend) | Account chip/menu, auth modals, calculator card, ☆ Pin, watchlist/alerts/valuations modals | `renderHeader`, `toggleMenu`, `SantroCalc.render` (l.~280-360), `togglePin` (l.465), `renderWatchlist` (l.550), `openSaved` | Pin invisible for anon; watchlist modal has no add-input; nothing renders on terminal | **YES** (~650 lines; the core UI file) |
| `accounts/api.js` (frontend) | Full REST client; Mock backend; valuation provider switch; anon metering | route table (l.40-59), `_fetch` (l.70-100), `Mock` (l.137-194), `RealValuation` (l.275-278) | References nonexistent `/valuation/run`; Mock is dev-only (verify my claim) | **YES** (~320 lines) |
| `quiz.html` script block only (l.437-505) | Second customization UI; the biggest phantom promise | `build`, `preview`, `save`, `authed` | Saves to localStorage instead of PATCH /account/preferences; promises preset dashboard + editable watchlist | YES (script block) |
| `terminal.html` — boot/data section (l.~1280-1900) | The page that should consume preferences and doesn't | data loaders, `openTicker`, theme handling (l.1294, 1835) | No SantroAPI usage at all; hard-coded layout | Script portion only (file is ~2000 lines incl. CSS/nav) |
| `~/santro-accounts/app/routers/account.py` (backend) | Preferences + profile endpoints | `get_preferences`, `update_preferences`, `merged_preferences` usage | None found — healthy; include as proof backend is fine | **YES** (140 lines) |
| `~/santro-accounts/app/schemas.py` — preferences section (l.130-190) | The full preference vocabulary + defaults | `PreferencesIn/Out`, `DEFAULT_PREFERENCES`, `merged_preferences` | None — this is the contract the terminal should render from | YES (section) |

## Tier 2 — context (share on request)

| File | Why |
|---|---|
| `accounts/config.js` | Public runtime config; proves apiMode:"live", valuationProvider:"mock" |
| `ds-v2/gates.js`, `ds-v2/locks.js`, `ds-v2/lock-copy.js` | Gating single-source; lock modal; unused save_view copy |
| `ds-v2/events.js` | Analytics queue with no sink |
| `~/santro-accounts/app/routers/watchlist.py`, `valuations.py`, `alerts.py`, `usage.py` | Healthy CRUD — reviewer can confirm backend quality quickly |
| `~/santro-accounts/app/models.py` | All entities; note absent SavedStressTest/Widget |
| `~/santro-accounts/app/main.py` | Router wiring + CORS |
| `~/santro-accounts/tests/test_profile_prefs.py`, `tests/test_saved_data.py` | The 16 passing tests proving persistence |
| `gen_nav.py` | Header generator: static auth slot, mobile hide rules (l.198-215), drawer auth links (l.318-336) |
| `index.html` sections: watchlist card (l.1046-1090) + `[data-lock]` rows | The homepage promises vs gates |
| `dashboard.html` | Thin shell that mounts auth-pages.js |

## Tier 3 — do NOT bother sharing

- The 155 generated SEO pages (stocks/, etfs/, hot-tickers/, ipos/) — no account features.
- ds-v2 CSS files, qa/ harness, fetch*.py data bots — irrelevant to the flows.
- `accounts/accounts.css` — styling only.

## Claims for the second reviewer to independently verify

1. `grep -ri sticker` → 0 hits in both repos.
2. `grep -rn "santro_calibration"` → writes in quiz.html only, zero readers.
3. terminal.html contains no `SantroAPI`/preference/watchlist reads (only `santro-theme`).
4. `grep -rn "valuation/run" santro-accounts/app/` → empty (endpoint missing).
5. Live: anonymous /terminal makes exactly 4 API calls (me 401, methods 200, refresh 401, usage/status 200).
6. `pytest tests/test_profile_prefs.py tests/test_saved_data.py` → 16 passed.
