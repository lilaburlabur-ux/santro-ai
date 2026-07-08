/* E2E: preferences → terminal wiring, watchlist strip, locked actions, fallbacks.
   Runs FULLY LOCALLY: static frontend (this repo) on :8000 + santro-accounts on
   :8011 with a throwaway sqlite DB and a synthetic user. No production data.
   Usage: node qa/e2e_prefs.mjs   (expects ../santro-accounts checkout w/ .venv) */
import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const FE_DIR = process.cwd();
const BE_DIR = path.join(os.homedir(), "santro-accounts");
const FE = "http://127.0.0.1:8000";
const BE = "http://127.0.0.1:8011";
const tmp = mkdtempSync(path.join(os.tmpdir(), "santro-e2e-"));
const DB = `sqlite+aiosqlite:///${path.join(tmp, "e2e.db")}`;
const ENV = { ...process.env, DATABASE_URL: DB, FRONTEND_ORIGIN: FE,
  COOKIE_SECURE: "false", COOKIE_SAMESITE: "lax", ALERT_EVALUATOR_ENABLED: "false" };
const PY = path.join(BE_DIR, ".venv", "bin", "python");
const results = []; let fails = 0;
const check = (name, ok, extra) => { results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`); if (!ok) fails++; };

// ── boot local stack ───────────────────────────────────────────────────────
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
for (let i = 0; i < 50; i++) { try { const r = await fetch(BE + "/healthz"); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }

// synthetic user (local sqlite only)
const EMAIL = `e2e-${Date.now()}@example.com`;
const PASS = "E2e-test-" + Math.random().toString(36).slice(2, 10) + "1a";
const reg = await fetch(BE + "/auth/register", { method: "POST", headers: { "content-type": "application/json", origin: FE },
  body: JSON.stringify({ email: EMAIL, password: PASS, consent: true, first_name: "E2E" }) });
check("backend register (local sqlite)", reg.status === 201, `status ${reg.status}`);

const browser = await chromium.launch();
async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript((base) => { try { localStorage.setItem("SANTRO_API_BASE", base); } catch (e) {} }, BE);
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e).slice(0, 140)));
  return { ctx, p, errors };
}
async function login(p) {
  await p.goto(FE + "/signin.html", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("#em", { timeout: 8000 });
  await p.fill("#em", EMAIL); await p.fill("#pw", PASS);
  await p.click("#go"); await p.waitForURL("**/dashboard**", { timeout: 10000 });
  // python http.server can't serve the clean /dashboard URL (GH Pages can);
  // the session cookie is already set, so load the .html path explicitly.
  await p.goto(FE + "/dashboard.html", { waitUntil: "domcontentloaded" });
}

// ── 1. logged-in preferences affect terminal (+ refresh persistence) ──────
{
  const { ctx, p, errors } = await newPage();
  await login(p);
  await p.waitForSelector('[data-pref="show_news"]', { timeout: 8000 });
  await p.setChecked('[data-pref="show_news"]', false);
  await p.fill("#ptk", "NVDA, MSFT");
  await p.click("#savePrefs");
  await p.waitForSelector("#prerr .ok", { timeout: 8000 });
  const savedMsg = await p.textContent("#prerr");
  check("dashboard save message honest", /your terminal now uses these settings/i.test(savedMsg));
  check("dashboard has View on terminal link", !!(await p.$('#prerr a[href*="terminal"]')));
  check("dashboard has Reset to defaults", !!(await p.$("#resetPrefs")));

  for (const round of ["first load", "after refresh"]) {
    await p.goto(FE + "/terminal.html", { waitUntil: "domcontentloaded" });
    await p.waitForFunction(() => document.querySelector('[data-pref-section="news"]')?.hidden === true, null, { timeout: 15000 });
    const newsHidden = await p.$eval('[data-pref-section="news"]', (el) => el.hidden);
    const stocksVisible = await p.$eval('[data-pref-section="stocks"]', (el) => !el.hidden);
    await p.waitForSelector(".wl-chip", { timeout: 10000 });
    const chips = await p.$$eval(".wl-chip", (els) => els.map((e) => e.textContent));
    check(`terminal ${round}: news hidden, stocks visible`, newsHidden && stocksVisible);
    check(`terminal ${round}: preferred NVDA+MSFT in strip`, chips.some((c) => c.includes("NVDA")) && chips.some((c) => c.includes("MSFT")), chips.join("|").slice(0, 80));
  }
  check("terminal (authed) no page errors", errors.length === 0, errors.join(";"));
  await ctx.close();
}

// ── 2. watchlist add / persist / remove from the terminal strip ───────────
{
  const { ctx, p } = await newPage();
  await login(p);
  await p.goto(FE + "/terminal.html", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("#wl-add-input", { timeout: 15000 });
  await p.fill("#wl-add-input", "nvda");           // lowercase → must normalize
  await p.click('#wl-add-form button[type="submit"]');
  await p.waitForSelector('.wl-chip:not(.sug) [data-open="NVDA"]', { timeout: 10000 });
  check("add ticker: NVDA pinned from strip (uppercased)", true);
  await p.fill("#wl-add-input", "NVDA");           // duplicate → idempotent, no error
  await p.click('#wl-add-form button[type="submit"]');
  await p.waitForTimeout(1200);
  const dupErr = await p.$eval("#wl-err", (el) => el && !el.hidden ? el.textContent : "").catch(() => "");
  check("duplicate add handled gracefully", !dupErr, dupErr);
  await p.fill("#wl-add-input", "not a ticker!!");
  await p.click('#wl-add-form button[type="submit"]');
  await p.waitForTimeout(400);
  const badErr = await p.$eval("#wl-err", (el) => (el.hidden ? "" : el.textContent));
  check("invalid ticker shows clean error", /1–12/.test(badErr), badErr);
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForSelector('.wl-chip:not(.sug) [data-open="NVDA"]', { timeout: 15000 });
  check("pinned NVDA persists after refresh", true);
  await p.click('[data-un="NVDA"]');
  await p.waitForFunction(() => !document.querySelector('.wl-chip:not(.sug) [data-open="NVDA"]'), null, { timeout: 10000 });
  check("remove from watchlist works", true);
  await ctx.close();
}

// ── 3. anonymous locked actions: strip CTA + Customize → modal with next ──
{
  const { ctx, p, errors } = await newPage();
  await p.goto(FE + "/terminal.html", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("#wl-signup", { timeout: 15000 });
  check("anon: watchlist strip shows locked state (not nothing)", true);
  await p.click("#wl-signup");
  await p.waitForSelector(".ds-gate", { timeout: 5000 });
  let hrefs = await p.$$eval(".ds-gate a", (as) => as.map((a) => a.getAttribute("href")));
  check("anon strip CTA → modal carries next=", hrefs.some((h) => h && h.includes("next=")), hrefs.join(","));
  await p.keyboard.press("Escape");
  await p.click("#ts-customize");
  await p.waitForSelector(".ds-gate", { timeout: 5000 });
  const title = await p.textContent(".ds-gate h3");
  hrefs = await p.$$eval(".ds-gate a", (as) => as.map((a) => a.getAttribute("href")));
  check("anon Customize → 'Save your terminal setup' modal", /save your terminal setup/i.test(title), title.trim());
  check("anon Customize modal carries next=", hrefs.some((h) => h && h.includes("next=")));
  check("anon terminal no page errors", errors.length === 0, errors.join(";"));
  await ctx.close();
}

// ── 3b. signup honors next= (return context) ──────────────────────────────
{
  const { ctx, p } = await newPage();
  const EMAIL2 = `e2e-b-${Date.now()}@example.com`;
  await p.goto(FE + "/signup.html?next=/terminal.html", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("#em", { timeout: 8000 });
  await p.fill("#em", EMAIL2); await p.fill("#pw", PASS);
  await p.check("#cons"); await p.click("#go");
  await p.waitForURL("**/terminal.html**", { timeout: 12000 });
  check("signup with ?next returns to terminal (not /dashboard)", true);
  await ctx.close();
}

// ── 4+5. anonymous default terminal + preference-API failure fallback ─────
{
  const { ctx, p, errors } = await newPage();
  await p.goto(FE + "/terminal.html", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(4000);
  const allVisible = await p.$$eval("[data-pref-section]", (els) => els.filter((e) => e.id !== "wl-strip").every((e) => !e.hidden));
  check("anon: all default sections visible", allVisible);
  check("anon: no page errors", errors.length === 0, errors.join(";"));
  await ctx.close();

  const c2 = await newPage();
  await c2.p.route("**/account/preferences**", (r) => r.abort());
  await login(c2.p);
  await c2.p.goto(FE + "/terminal.html", { waitUntil: "domcontentloaded" });
  await c2.p.waitForTimeout(5000);
  const heatVisible = await c2.p.$eval('[data-pref-section="stocks"]', (el) => !el.hidden);
  check("prefs API failure: terminal still renders defaults", heatVisible);
  check("prefs API failure: no page errors (warn only)", c2.errors.length === 0, c2.errors.join(";"));
  await c2.ctx.close();
}

// ── 6. valuation runs never touch the missing /valuation/run ──────────────
{
  const { ctx, p } = await newPage();
  const valuationCalls = [];
  p.on("request", (r) => { if (r.url().includes("/valuation/run")) valuationCalls.push(r.url()); });
  await login(p);
  await p.goto(FE + "/terminal.html", { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => typeof window.openTicker === "function", null, { timeout: 15000 });
  await p.evaluate(() => window.openTicker("NVDA"));
  await p.waitForSelector("#sa-run", { timeout: 15000 });
  await p.click("#sa-run");
  await p.waitForTimeout(2500);
  check("valuation run issues NO /valuation/run request", valuationCalls.length === 0, valuationCalls.join(","));
  check("SantroAPI.valuationMode reports 'local'", (await p.evaluate(() => window.SantroAPI.valuationMode)) === "local");
  await ctx.close();
}

// ── 7. mobile smoke @390: no overflow, locked strip visible, 44px targets ─
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.addInitScript((base) => { try { localStorage.setItem("SANTRO_API_BASE", base); } catch (e) {} }, BE);
  await p.goto(FE + "/terminal.html", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("#wl-signup", { timeout: 15000 });
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const btnH = await p.$eval("#wl-signup", (el) => el.getBoundingClientRect().height);
  const custH = await p.$eval("#ts-customize", (el) => el.getBoundingClientRect().height);
  check("390px: no horizontal overflow", over <= 1, `overflow ${over}px`);
  check("390px: strip CTA ≥44px tap target", btnH >= 43.5, `${btnH}px`);
  check("390px: Customize ≥44px tap target", custH >= 43.5, `${custH}px`);
  await ctx.close();
}

await browser.close(); kill();
console.log("\n" + results.join("\n"));
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
