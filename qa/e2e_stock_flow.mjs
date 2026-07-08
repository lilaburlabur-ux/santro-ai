/* E2E: stock-detail journey — hero watchlist star, pin flows, valuation
   actions, share-card context. Same fully-local harness as e2e_prefs.mjs
   (repo on :8000 + santro-accounts on :8011, throwaway sqlite, synthetic user).
   Local server can't serve clean URLs → tests use .html paths; production
   uses the clean equivalents. Run: node qa/e2e_stock_flow.mjs */
import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const FE_DIR = process.cwd();
const BE_DIR = path.join(os.homedir(), "santro-accounts");
const FE = "http://127.0.0.1:8000";
const BE = "http://127.0.0.1:8011";
const tmp = mkdtempSync(path.join(os.tmpdir(), "santro-stock-e2e-"));
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

const EMAIL = `stock-e2e-${Date.now()}@example.com`;
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
const TK = "VRT";

// ── 1+2. anonymous: hero star visible near title; click → auth modal + pending ──
{
  const { ctx, p } = await newPage();
  await p.goto(FE + `/t.html?sym=${TK}`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector("#tp-watch .sa-watch", { timeout: 15000 });
  const inHero = await p.evaluate(() => !!document.querySelector(".tp-title h1 #tp-watch .sa-watch"));
  const label = (await p.textContent("#tp-watch .sa-watch")).trim();
  check("anon: star rendered INSIDE the hero title row", inHero, label);
  check("anon: label is 'Add to watchlist' (visible locked action)", /add to watchlist/i.test(label));
  const heroShare = await p.getAttribute(".tp-share a.primary", "href");
  check("hero share link carries ticker context", heroShare === `/share?type=stock&ticker=${TK}`, heroShare);
  check("hero has Create alert action", !!(await p.$("#tp-alert")));
  await p.click("#tp-watch .sa-watch");
  await p.waitForSelector(".sa-backdrop", { timeout: 5000 });
  const pending = await p.evaluate(() => JSON.parse(sessionStorage.getItem("santro_pending_action") || "null"));
  check("anon click → signup/login modal opens", true);
  check("return context stored (action=pin, ticker)", pending && pending.action === "pin" && pending.ticker === TK, JSON.stringify(pending));
  await ctx.close();
}

// ── 3. logged-in pin/unpin from hero + persistence ────────────────────────
{
  const { ctx, p } = await newPage();
  await login(p);
  await p.goto(FE + `/t.html?sym=${TK}`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector("#tp-watch .sa-watch", { timeout: 15000 });
  await p.click("#tp-watch .sa-watch");
  await p.waitForFunction(() => /Pinned/.test(document.querySelector("#tp-watch .sa-watch")?.textContent || ""), null, { timeout: 8000 });
  check("logged-in: hero click → ★ Pinned", true);
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => /Pinned/.test(document.querySelector("#tp-watch .sa-watch")?.textContent || ""), null, { timeout: 15000 });
  check("pinned state persists after refresh", true);
  await p.click("#tp-watch .sa-watch");
  await p.waitForFunction(() => /Add to watchlist/i.test(document.querySelector("#tp-watch .sa-watch")?.textContent || ""), null, { timeout: 8000 });
  check("remove from watchlist works from hero", true);

  // ── 4. valuation actions: Save/Share, star NOT in the calc panel ──
  await p.waitForSelector("#sa-run", { timeout: 15000 });
  await p.click("#sa-run");
  await p.waitForSelector("#sa-share-val", { timeout: 15000 });
  const savedLine = await p.textContent(".sa-valacts");
  check("after run: 'Saved to your valuation history' + Share valuation card", /Saved to your valuation history/.test(savedLine) && /Share valuation card/.test(savedLine), savedLine.trim().slice(0, 80));
  const starInCalc = await p.evaluate(() => !!document.querySelector(".sa-calc .sa-watch, .sa-calc #sa-pin"));
  check("no watchlist star inside the valuation panel", !starInCalc);
  const starStillInHero = await p.evaluate(() => !!document.querySelector(".tp-title #tp-watch .sa-watch"));
  check("star remains in hero after valuation run", starStillInHero);

  // ── 6. valuation share context ──
  await p.click("#sa-share-val");
  await p.waitForURL("**/share**", { timeout: 8000 });
  const url = p.url();
  const payload = await p.evaluate(() => JSON.parse(localStorage.getItem("santro_share_val") || "null"));
  check("Share valuation → /share?type=valuation&ticker + state", url.includes("type=valuation") && url.includes(`ticker=${TK}`) && url.includes("state=santro_share_val"), url);
  check("valuation payload carries ticker/model/fair/premium (no nulls)", payload && payload.tk === TK && payload.model && payload.fair != null && payload.prem != null && payload.eps != null, JSON.stringify(payload || {}).slice(0, 100));
  await ctx.close();
}

// ── 5. stock share-card context on /share ─────────────────────────────────
{
  const { ctx, p } = await newPage();
  await p.goto(FE + `/share.html?type=stock&ticker=${TK}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  const st = await p.evaluate(() => ({ cur: current, tk: CTX.tk, firstThumb: document.querySelector(".thumb span")?.textContent }));
  check("share page preselects the VRT stock card (not hot tickers)", st.cur === "stock" && st.tk === TK, JSON.stringify(st));
  const png = await p.evaluate(() => document.getElementById("card").toDataURL("image/png").length);
  check("stock card canvas renders + PNG export works", png > 20000, `dataURL ${png} bytes`);
  await ctx.close();
}
// valuation card render on /share (payload seeded)
{
  const { ctx, p } = await newPage();
  await p.addInitScript((tk) => localStorage.setItem("santro_share_val", JSON.stringify({
    tk, co: "Vertiv Holdings Co", price: 100, model: "dcf", eps: 3.2, growth: 14, discount: 9,
    years: 10, tgrowth: 2.5, fair: 84.5, prem: 18.3, at: new Date().toISOString() })), TK);
  await p.goto(FE + `/share.html?type=valuation&ticker=${TK}&state=santro_share_val`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  const st = await p.evaluate(() => ({ cur: current, has: !!valPayload(), png: document.getElementById("card").toDataURL("image/png").length }));
  check("valuation card selected + payload resolved + renders", st.cur === "valuation" && st.has && st.png > 20000, JSON.stringify(st));
  await ctx.close();
}

// ── 7. mobile 390: hero star visible, no overflow ─────────────────────────
{
  const { ctx, p } = await newPage({ width: 390, height: 844 });
  await p.goto(FE + `/t.html?sym=${TK}`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector("#tp-watch .sa-watch", { timeout: 15000 });
  const m = await p.evaluate(() => ({
    starVisible: !!document.querySelector("#tp-watch .sa-watch")?.offsetParent,
    starH: document.querySelector("#tp-watch .sa-watch").getBoundingClientRect().height,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
  check("390px: star visible near title", m.starVisible);
  check("390px: star ≥44px tap target", m.starH >= 43.5, `${m.starH}px`);
  check("390px: no horizontal overflow", m.overflow <= 1, `${m.overflow}px`);
  await ctx.close();
}

await browser.close(); kill();
console.log("\n" + results.join("\n"));
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
