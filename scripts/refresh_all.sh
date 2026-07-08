#!/usr/bin/env bash
# Santro external data-refresh runner (B2). Runs data scripts OUTSIDE GitHub
# Actions and pushes JSON to main; native Pages serves the push (0 Actions min).
#
# NEVER prints secrets. Auth uses GIT_ASKPASS (git never echoes it) — the token
# is never in the URL, argv, git config, or logs.
#
# Modes (explicit; unknown mode = hard fail):
#   crypto    fetch_crypto.py only (CoinMarketCap; NO Yahoo). Safe 24/7 */5.
#   frequent  Yahoo/yfinance market refresh (quotes/hot/news/tape/bubble).
#             Yahoo rate-limits — run */15 or */30, NOT */5.
#   daily     heavy: universe/ecosystem/OG/IPOs/research. ~1x/day.
#
# Repo access: SANTRO_REPO_DIR (existing clone, e.g. Mac) OR GITHUB_TOKEN
# (Render self-clone). Optional: REPO_OWNER, REPO_NAME, BRANCH, SANTRO_PY.
# crypto mode also needs CMC_API_KEY (read by fetch_crypto.py itself).
set -uo pipefail

MODE="${1:-frequent}"
case "$MODE" in
  crypto|frequent|daily) ;;
  *) echo "refresh_all: unknown mode '$MODE' — use crypto|frequent|daily" >&2; exit 2 ;;
esac
PY="${SANTRO_PY:-python3}"
BRANCH="${BRANCH:-main}"
echo "$(date -u +'%F %H:%M:%SZ') refresh_all starting — MODE=$MODE BRANCH=$BRANCH"

LOCK="${SANTRO_LOCK:-/tmp/santro_refresh_${MODE}.lock}"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK"; flock -n 9 || { echo "$(date -u +%T) another $MODE run in progress; skip"; exit 0; }
fi

# ── auth: GIT_ASKPASS (no token in URL/argv/config/logs) ────────────────────
# The askpass script holds a VARIABLE REFERENCE, not the token value; git reads
# the token from the environment at exec time and never echoes askpass output.
ASKPASS=""
setup_auth() {
  ASKPASS="$(mktemp)"
  printf '#!/bin/sh\nexec printf %%s "$GITHUB_TOKEN"\n' > "$ASKPASS"
  chmod 700 "$ASKPASS"
  export GIT_ASKPASS="$ASKPASS" GIT_TERMINAL_PROMPT=0
}

if [ -n "${SANTRO_REPO_DIR:-}" ]; then
  cd "$SANTRO_REPO_DIR"                       # existing clone provides its own auth
else
  : "${GITHUB_TOKEN:?set SANTRO_REPO_DIR or GITHUB_TOKEN}"
  OWNER="${REPO_OWNER:-lilaburlabur-ux}"; NAME="${REPO_NAME:-santro-ai}"
  WORK="$(mktemp -d)"; trap 'rm -rf "$WORK" "$ASKPASS" 2>/dev/null || true' EXIT
  setup_auth
  # username-only URL: git asks GIT_ASKPASS for the password (token). No secret in URL.
  if ! git -c credential.helper= clone -q --depth 50 --branch "$BRANCH" \
        "https://x-access-token@github.com/${OWNER}/${NAME}.git" "$WORK/repo"; then
    echo "clone failed (check token repo access / network)" >&2; exit 1
  fi
  cd "$WORK/repo"
fi

git pull -q --rebase --autostash -X theirs origin "$BRANCH" || true

# ── run scripts for the mode, stage outputs ─────────────────────────────────
run() { echo "  · $1"; "$PY" "$@"; }   # prints script name only, never secrets
case "$MODE" in
  crypto)
    run fetch_crypto.py || true
    git add -- crypto.json 2>/dev/null || true
    ;;
  frequent)
    run fetch.py            || true
    run update_quotes.py    || true
    run fetch_tweets.py     || true
    run update_hot.py       || true
    run update_takeaways.py || true
    run fetch_news.py       || true
    run fetch_zerohedge.py  || true
    run fetch_bubble_index.py || true
    # NOTE: fetch_crypto is intentionally NOT here — the crypto mode owns it
    # (avoids double CMC credit spend and keeps the */5 job Yahoo-free).
    git add -- '*.json' takeaways/takeaways.json 2>/dev/null || true
    ;;
  daily)
    run update_universe.py  || true
    run update_ecosystem.py || true
    run make_og.py          || true
    run update_ipos.py      || true
    run research.py         || true
    git add -- '*.json' research/ assets/og-map.png assets/og-crypto.png 2>/dev/null || true
    ;;
esac

# ── safety gate: refuse to push degraded/empty data (rate-limit protection) ──
# Prevents overwriting good data with broken partial data when Yahoo 429s.
if ! "$PY" - "$MODE" <<'PYEOF'
import json, sys
mode = sys.argv[1]
def load(p):
    try:
        with open(p) as f: return json.load(f)
    except Exception: return None
def fail(msg):
    print("  validation FAILED:", msg); sys.exit(1)
if mode == "crypto":
    c = load("crypto.json") or {}
    coins = c.get("coins") or [x for b in (c.get("baskets") or {}).values() for x in (b.get("coins") or [])]
    if len(coins) < 5: fail("crypto.json has <5 coins")
    print(f"  validation ok: {len(coins)} coins")
else:
    u = load("universe.json")
    if not u: fail("universe.json missing/unparseable")
    tk = [t for b in u.get("bubbles", []) for t in b.get("tickers", [])]
    if len(tk) < 70: fail(f"universe has only {len(tk)} tickers (<70)")
    if mode == "frequent":
        priced = sum(1 for t in tk if isinstance(t.get("price"), (int, float)) and t["price"] > 0)
        cov = priced / max(len(tk), 1)
        if cov < 0.6: fail(f"only {cov:.0%} of tickers priced (<60%) — likely mass rate-limit")
        print(f"  validation ok: {len(tk)} tickers, {cov:.0%} priced")
    else:
        print(f"  validation ok: {len(tk)} tickers")
PYEOF
then
  echo "$(date -u +'%F %H:%M UTC') refusing to push degraded data [$MODE] (non-zero exit)" >&2
  git checkout -q -- . 2>/dev/null || true
  exit 1
fi

# ── commit + push (only if changed) ─────────────────────────────────────────
if git diff --cached --quiet; then
  echo "$(date -u +'%F %H:%M UTC') no data changes [$MODE]"; exit 0
fi
git -c user.name=santro-data-bot -c user.email=actions@users.noreply.github.com \
  commit -q -m "data refresh $(date -u +'%F %H:%M UTC') [$MODE]" || exit 0
# discard any unstaged remainder in the DISPOSABLE self-clone only (never in a
# persistent SANTRO_REPO_DIR clone, where it could eat human WIP)
if [ -z "${SANTRO_REPO_DIR:-}" ]; then git checkout -q -- . 2>/dev/null || true; fi
for i in $(seq 1 6); do
  if git pull -q --rebase --autostash -X theirs origin "$BRANCH" && git push -q origin "HEAD:$BRANCH"; then
    echo "$(date -u +'%F %H:%M UTC') pushed on attempt $i [$MODE]"; exit 0
  fi
  git rebase --abort 2>/dev/null || true
  sleep $((RANDOM % 6 + 3))
done
echo "push failed after 6 attempts [$MODE]" >&2; exit 1
