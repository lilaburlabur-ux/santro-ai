/* E2E: homepage AI Bubble Risk / Hot AI Tickers table — row state model.
   Local stack (repo :8000 + santro-accounts :8011, throwaway sqlite, synthetic
   user). Local server can't serve clean URLs; the homepage is /index.html here.
   Run: node qa/e2e_home_heat.mjs */
import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const FE_DIR = process.cwd();
const BE_DIR = path.join(os.homedir(), "santro-accounts");
const FE = "http://127.0.0.1:8000", BE = "http://127.0.0.1:8011";
const tmp = mkdtempSync(path.join(os.tmpdir(), "santro-home-e2e-"));
const DB = `sqlite+aiosqlite:///${path.join(tmp, "e2e.db")}`;
const ENV = { ...process.env, DATABASE_URL: DB, FRONTEND_ORIGIN: FE,
  COOKIE_SECURE: "false", COOKIE_SAMESITE: "lax", ALERT_EVALUATOR_ENABLED: "false" };
const PY = path.join(BE_DIR, ".venv", "bin", "python");
const results = []; let fails = 0;
const check = (n, ok, x) => { results.push(`${ok ? "PASS" : "FAIL"}  ${n}${x ? " — " + x : ""}`); if (!ok) fails++; };

execSync(`${PY} -c "
import asyncio, os
os.environ['DATABASE_URL']='${DB}'
from sqlalchemy.ext.asyncio import create_async_engine
from app.models import Base
async def m():
    e=create_async_engine('${DB}')
    async with e.begin() as c: await c.run_sync(Base.metadata.create_all)
asyncio.run(m())
"`, { cwd: BE_DIR, env: ENV, stdio: "inherit" });
const be = spawn(path.join(BE_DIR, ".venv", "bin", "uvicorn"), ["app.main:app", "--port", "8011"], { cwd: BE_DIR, env: ENV, stdio: "ignore" });
const fe = spawn("python3", ["-m", "http.server", "8000", "--bind", "127.0.0.1"], { cwd: FE_DIR, stdio: "ignore" });
const kill = () => { try { be.kill(); } catch {} try { fe.kill(); } catch {} };
process.on("exit", kill);
for (let i = 0; i < 50; i++) { try { if ((await fetch(BE + "/healthz")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }

const EMAIL = `home-e2e-${Date.now()}@example.com`;
const PASS = "E2e-test-" + Math.random().toString(36).slice(2, 10) + "1a";
await fetch(BE + "/auth/register", { method: "POST", headers: { "content-type": "application/json", origin: FE },
  body: JSON.stringify({ email: EMAIL, password: PASS, consent: true }) });

const browser = await chromium.launch();
async function newPage(vw) {
  const ctx = await browser.newContext({ viewport: vw || { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript((b) => { try { localStorage.setItem("SANTRO_API_BASE", b); } catch (e) {} }, BE);
  return { ctx, p };
}
async function login(p) {
  await p.goto(FE + "/signin.html", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("#em"); await p.fill("#em", EMAIL); await p.fill("#pw", PASS);
  await p.click("#go"); await p.waitForURL("**/dashboard**", { timeout: 10000 });
}
const rowsReady = (p) => p.waitForFunction(() => document.querySelectorAll("#hh-rows tr.hp-hrow").length >= 6, null, { timeout: 15000 });

// ── 1. anonymous preview ──────────────────────────────────────────────────
{
  const { ctx, p } = await newPage();
  await p.goto(FE + "/index.html", { waitUntil: "domcontentloaded" });
  await rowsReady(p);
  const st = await p.evaluate(() => {
    const rows = [...document.querySelectorAll("#hh-rows tr.hp-hrow")];
    const open = rows.filter((r) => r.hasAttribute("data-href"));
    const locked = rows.filter((r) => r.classList.contains("ds-lockrow"));
    return {
      total: rows.length, open: open.length, locked: locked.length,
      firstFiveLinked: open.slice(0, 5).every((r) => r.querySelector('td.tk a[href^="/t?sym="]')),
      row6Locked: rows[5] && rows[5].classList.contains("ds-lockrow"),
      row6Blur: !!(rows[5] && rows[5].querySelector(".ds-blur")),
      lockBandVisible: !document.getElementById("hh-lock").hidden,
      hrefs: open.map((r) => r.getAttribute("data-href")),
    };
  });
  check("anon: rows 1–5 are clickable links", st.open === 5 && st.firstFiveLinked, `open=${st.open}`);
  check("anon: row 6 is locked + blurred (not a dead plain row)", st.row6Locked && st.row6Blur);
  check("anon: lock band visible", st.lockBandVisible);
  check("anon: no bad hrefs (#, javascript:void, empty)", st.hrefs.every((h) => h && h !== "#" && !/javascript:/.test(h)), st.hrefs.join(","));
  // click a locked row → signup modal + CTA (dispatch: border-collapse table
  // confuses Playwright's hit-test; locks.js listens for the bubbling click)
  await p.evaluate(() => {
    const cell = document.querySelector("#hh-rows tr.ds-lockrow td.tk");
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await p.waitForSelector(".ds-gate", { timeout: 5000 });
  const modal = await p.evaluate(() => {
    const m = document.querySelector(".ds-gate");
    return { title: m.querySelector("h3").textContent, body: m.textContent, cta: [...m.querySelectorAll("a")].map((a) => a.getAttribute("href")) };
  });
  check("anon: locked-row click opens signup modal", /unlock the full table/i.test(modal.title), modal.title.trim());
  check("anon: modal CTA → signup with next", modal.cta.some((h) => /\/signup/.test(h)));
  await ctx.close();
}

// ── 2. logged-in homepage ──────────────────────────────────────────────────
{
  const { ctx, p } = await newPage();
  await login(p);
  await p.goto(FE + "/index.html", { waitUntil: "domcontentloaded" });
  await rowsReady(p);
  await p.waitForFunction(() => document.getElementById("hh-lock") && document.getElementById("hh-lock").hidden, null, { timeout: 12000 });
  const st = await p.evaluate(() => {
    const rows = [...document.querySelectorAll("#hh-rows tr.hp-hrow")];
    return {
      total: rows.length,
      allLinked: rows.every((r) => r.hasAttribute("data-href") && r.querySelector('td.tk a[href^="/t?sym="]')),
      anyLocked: rows.some((r) => r.classList.contains("ds-lockrow")),
      anyBlur: !!document.querySelector("#hh-rows .ds-blur"),
      lockHidden: document.getElementById("hh-lock").hidden,
      lowerHref: rows[7] && rows[7].getAttribute("data-href"),
    };
  });
  check("logged-in: all 10 rows are clickable links", st.total === 10 && st.allLinked, `total=${st.total}`);
  check("logged-in: no locked/blurred rows", !st.anyLocked && !st.anyBlur);
  check("logged-in: lock band hidden", st.lockHidden);
  // click a lower row (row 8) on its rank cell (no inner anchor). border-collapse
  // tables confuse Playwright's hit-test, so dispatch the real bubbling click the
  // delegated #hh-rows handler listens for.
  await p.evaluate(() => {
    const cell = document.querySelector("#hh-rows tr.hp-hrow:nth-child(8) td:first-child");
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await p.waitForFunction(() => /[?&]sym=/.test(location.href), null, { timeout: 8000 }).catch(() => {});
  check("logged-in: lower row click navigates to ticker page", /[?&]sym=/.test(p.url()), p.url());
  await ctx.close();
}

// ── 3. keyboard: unlocked row's inner link is focusable/activatable ────────
{
  const { ctx, p } = await newPage();
  await p.goto(FE + "/index.html", { waitUntil: "domcontentloaded" });
  await rowsReady(p);
  const kb = await p.evaluate(() => {
    const a = document.querySelector("#hh-rows tr.hp-hrow[data-href] td.tk a");
    a.focus(); return { focused: document.activeElement === a, href: a.getAttribute("href") };
  });
  check("keyboard: unlocked row link is focusable", kb.focused && /^\/t\?sym=/.test(kb.href), kb.href);
  await ctx.close();
}

// ── 4. mobile 390: rows tappable ≥44px, no overflow ───────────────────────
{
  const { ctx, p } = await newPage({ width: 390, height: 844 });
  await p.goto(FE + "/index.html", { waitUntil: "domcontentloaded" });
  await rowsReady(p);
  const m = await p.evaluate(() => {
    const r = document.querySelector("#hh-rows tr.hp-hrow");
    return { rowH: r.getBoundingClientRect().height, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check("390px: row ≥44px tap target", m.rowH >= 43.5, `${m.rowH.toFixed(1)}px`);
  check("390px: no horizontal overflow", m.overflow <= 1, `${m.overflow}px`);
  await ctx.close();
}

await browser.close(); kill();
console.log("\n" + results.join("\n"));
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
