#!/usr/bin/env bash
# Santro external data-refresh runner (B2).
# Runs the data scripts OUTSIDE GitHub Actions and pushes JSON to main; native
# GitHub Pages serves the push (0 Actions minutes). Intended for a Render Cron
# Job (Linux). Reads secrets from env — NEVER prints them.
#
# Env (names only): SANTRO_REPO_DIR (clone with push auth), SANTRO_PY (python
# with yfinance/requests/pillow), CMC_API_KEY (crypto only). Git push auth is
# whatever the runner's clone is configured with.
#
# Usage: scripts/refresh_all.sh [frequent|daily]   (default: frequent)
set -uo pipefail

LOCK="${SANTRO_LOCK:-/tmp/santro_refresh.lock}"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK"; flock -n 9 || { echo "$(date -u +%T) another run in progress; skip"; exit 0; }
fi

cd "${SANTRO_REPO_DIR:?set SANTRO_REPO_DIR to a santro-ai clone with push auth}"
PY="${SANTRO_PY:-python3}"
MODE="${1:-frequent}"

git pull --rebase -X theirs origin main || true

if [ "$MODE" = "daily" ]; then
  "$PY" update_universe.py  || true
  "$PY" update_ecosystem.py || true
  "$PY" make_og.py          || true
  "$PY" update_ipos.py      || true
  "$PY" research.py         || true
  git add -- '*.json' research/ assets/og-map.png assets/og-crypto.png 2>/dev/null || true
else
  "$PY" fetch.py            || true
  "$PY" update_quotes.py    || true
  "$PY" fetch_tweets.py     || true
  "$PY" fetch_crypto.py     || true   # reads CMC_API_KEY from env
  "$PY" update_hot.py       || true
  "$PY" update_takeaways.py || true
  "$PY" fetch_news.py       || true
  "$PY" fetch_zerohedge.py  || true
  "$PY" fetch_bubble_index.py || true
  git add -- '*.json' takeaways/takeaways.json 2>/dev/null || true
fi

if git diff --cached --quiet; then
  echo "$(date -u +'%F %H:%M UTC') no data changes [$MODE]"; exit 0
fi
git -c user.name=santro-data-bot -c user.email=actions@users.noreply.github.com \
  commit -m "data refresh $(date -u +'%F %H:%M UTC') [$MODE]" || exit 0
for i in $(seq 1 6); do
  if git pull --rebase -X theirs origin main && git push; then
    echo "$(date -u +'%F %H:%M UTC') pushed on attempt $i [$MODE]"; exit 0
  fi
  git rebase --abort 2>/dev/null || true
  sleep $((RANDOM % 6 + 3))
done
echo "push failed after 6 attempts [$MODE]" >&2; exit 1
