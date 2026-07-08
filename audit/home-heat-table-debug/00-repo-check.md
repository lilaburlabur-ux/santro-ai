# 00 — Repo check (home heat-table debug)

2026-07-08 · `/tmp/lk` fresh clone of `lilaburlabur-ux/santro-ai` @ main `b49336f` (synced to origin HEAD; only bot-churned qa report files dirty, restored). package.json = dev tooling. Production repo confirmed.

Homepage hot table lives in `index.html` (Concept A hero card, inline `<script>`). Auth trio (config/api/accounts.js v17) already loaded. Gating via `ds-v2/locks.js` (`[data-lock]` delegation) + `ds-v2/lock.css` (`.ds-blur`, `.ds-lockrow`).
