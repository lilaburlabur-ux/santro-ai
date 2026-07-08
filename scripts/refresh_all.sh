#!/usr/bin/env bash
# Santro external data-refresh runner (B2).
# Runs the data scripts OUTSIDE GitHub Actions and pushes JSON to main; native
# GitHub Pages serves the push (0 Actions minutes). NEVER prints secrets.
#
# Two repo modes (pick one via env):
#   SANTRO_REPO_DIR  — existing clone with push auth (Mac/local mode)
#   GITHUB_TOKEN     — Render mode: shallow-clones the repo itself using a git
#                      credential helper. The token is read from env at push
#                      time only — never embedded in the URL, argv, or config.
#     optional: REPO_OWNER (default lilaburlabur-ux), REPO_NAME (default
#     santro-ai), BRANCH (default main)
# Other env: SANTRO_PY (python with -r requirements.txt; default python3),
#            CMC_API_KEY (crypto only, read by fetch_crypto.py itself)
#
# Usage: scripts/refresh_all.sh [frequent|daily]   (default: frequent)
set -uo pipefail

MODE="${1:-frequent}"
PY="${SANTRO_PY:-python3}"
BRANCH="${BRANCH:-main}"

LOCK="${SANTRO_LOCK:-/tmp/santro_refresh_${MODE}.lock}"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK"; flock -n 9 || { echo "$(date -u +%T) another $MODE run in progress; skip"; exit 0; }
fi

# credential helper: reads GITHUB_TOKEN from env when git needs it. The single
# quotes keep the placeholder UNEXPANDED in config/argv — no secret at rest.
CRED='!f(){ echo "username=x-access-token"; echo "password=${GITHUB_TOKEN}"; };f'

if [ -n "${SANTRO_REPO_DIR:-}" ]; then
  cd "$SANTRO_REPO_DIR"
else
  : "${GITHUB_TOKEN:?set SANTRO_REPO_DIR or GITHUB_TOKEN}"
  OWNER="${REPO_OWNER:-lilaburlabur-ux}"; NAME="${REPO_NAME:-santro-ai}"
  WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
  git -c credential.helper="$CRED" clone -q --depth 50 --branch "$BRANCH" \
    "https://github.com/${OWNER}/${NAME}.git" "$WORK/repo" || { echo "clone failed" >&2; exit 1; }
  cd "$WORK/repo"
  git config credential.helper "$CRED"   # placeholder only; value stays in env
fi

git pull -q --rebase --autostash -X theirs origin "$BRANCH" || true

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
  commit -q -m "data refresh $(date -u +'%F %H:%M UTC') [$MODE]" || exit 0
# Unstaged leftovers block rebase ("cannot pull with rebase"). In the DISPOSABLE
# self-clone the tree is ours: discard noise after committing. In a persistent
# SANTRO_REPO_DIR clone never discard (could eat human WIP) — autostash instead.
if [ -z "${SANTRO_REPO_DIR:-}" ]; then git checkout -q -- . 2>/dev/null || true; fi
for i in $(seq 1 6); do
  if git pull -q --rebase --autostash -X theirs origin "$BRANCH" && git push -q origin "HEAD:$BRANCH"; then
    echo "$(date -u +'%F %H:%M UTC') pushed on attempt $i [$MODE]"; exit 0
  fi
  git rebase --abort 2>/dev/null || true
  sleep $((RANDOM % 6 + 3))
done
echo "push failed after 6 attempts [$MODE]" >&2; exit 1
