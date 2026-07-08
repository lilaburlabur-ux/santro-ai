#!/usr/bin/env node
/** Santro hard-audit browser engine.
 * Modes:
 *   node qa/audit_browser.mjs overflow   — every sitemap URL @390+375: scrollWidth, offenders, console errors
 *   node qa/audit_browser.mjs shots      — template representatives @1920/1440/1280/430/390/375
 *   node qa/audit_browser.mjs desktop    — representatives @1440: header/footer/shell/active-green/console
 *   node qa/audit_browser.mjs tools      — stress test + calculator + share-card functional tests
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = "https://santroai.tech";
const urls = readFileSync("qa/audit/sitemap-urls.txt", "utf8").trim().split("\n");
const REPS = ["/", "/terminal", "/stocks", "/stocks/nvda", "/stocks/themes/ai-chips-and-compute",
  "/crypto", "/etfs", "/etfs/smh", "/bubble", "/tools/fair-value-calculator", "/share",
  "/blog", "/blog/ai-bubble-valuation-history", "/research", "/about", "/privacy", "/terms",
  "/stocks/burry-short-watch", "/stocks/aschenbrenner", "/ipos", "/quiz"];
const mode = process.argv[2] || "overflow";
const browser = await chromium.launch();
mkdirSync("qa/screenshots/desktop", { recursive: true });
mkdirSync("qa/screenshots/mobile", { recursive: true });
mkdirSync("qa/screenshots/failures", { recursive: true });
const slug = p => (p === "/" ? "home" : p.slice(1).replace(/\//g, "_"));

async function measure(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth, doc = document.documentElement;
    let offender = null;
    if (doc.scrollWidth > vw + 1) {
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 2 && r.width > 24) {
          offender = { sel: el.tagName + (el.className && el.className.split ? "." + el.className.split(" ")[0] : ""),
                       w: Math.round(r.width), right: Math.round(r.right) };
          break;
        }
      }
    }
    return { scrollW: doc.scrollWidth, vw, over: doc.scrollWidth - vw, offender,
      h1s: document.querySelectorAll("h1").length,
      headers: document.querySelectorAll('header.meganav').length,
      footers: document.querySelectorAll('footer.mega').length,
      ds: doc.classList.contains("ds-v2") };
  });
}

if (mode === "overflow") {
  const out = [];
  for (const vw of [390, 375]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: 800 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => errs.push(String(e).slice(0, 120)));
    page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
    for (const u of urls) {
      errs.length = 0;
      let rec = { url: u, vw, status: 0 };
      try {
        const res = await page.goto(BASE + u, { timeout: 20000, waitUntil: "domcontentloaded" });
        await page.waitForTimeout(600);
        rec.status = res.status();
        Object.assign(rec, await measure(page));
        rec.consoleErrors = [...new Set(errs)];
        if (rec.over > 1) {
          await page.screenshot({ path: `qa/screenshots/failures/${slug(u)}-${vw}.png` });
        }
      } catch (e) { rec.error = String(e).slice(0, 140); }
      out.push(rec);
      if (rec.over > 1 || rec.status !== 200 || rec.error) console.log("FAIL", vw, u, rec.over ?? "", rec.error ?? "");
    }
    await ctx.close();
  }
  writeFileSync("qa/audit/mobile-overflow-report.json", JSON.stringify(out, null, 1));
  const fails = out.filter(r => r.over > 1 || r.status !== 200 || r.error);
  const cerrs = out.filter(r => (r.consoleErrors || []).length);
  writeFileSync("qa/audit/mobile-overflow-report.md",
    `# Mobile overflow audit — ${BASE}\n\n${new Date().toISOString()}\n\n` +
    `Checked **${urls.length} URLs × 2 viewports (390, 375) = ${out.length} loads**.\n\n` +
    `- overflow/status failures: **${fails.length}**\n- pages with console errors: **${cerrs.length}**\n\n` +
    (fails.length ? "## Failures\n|url|vw|over(px)|offender|status|\n|---|---|---|---|---|\n" +
      fails.map(f => `|${f.url}|${f.vw}|${f.over ?? ""}|${f.offender ? f.offender.sel : f.error || ""}|${f.status}|`).join("\n") : "No overflow failures.") +
    (cerrs.length ? "\n\n## Console errors\n" + cerrs.map(c => `- ${c.url} @${c.vw}: ${c.consoleErrors.join(" · ")}`).join("\n") : "\n\nNo console errors."));
  console.log(`overflow: ${out.length} loads, ${fails.length} fails, ${cerrs.length} with console errors`);
}

if (mode === "shots") {
  for (const [vw, dir] of [[1920, "desktop"], [1440, "desktop"], [1280, "desktop"], [430, "mobile"], [390, "mobile"], [375, "mobile"]]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: 950 } });
    const page = await ctx.newPage();
    for (const u of REPS) {
      try {
        await page.goto(BASE + u, { timeout: 20000, waitUntil: "domcontentloaded" });
        await page.waitForTimeout(900);
        await page.screenshot({ path: `qa/screenshots/${dir}/${slug(u)}-${vw}.png` });
      } catch (e) { console.log("shot fail", vw, u); }
    }
    await ctx.close();
    console.log("shots done @", vw);
  }
}

if (mode === "desktop") {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const out = [];
  const errs = [];
  page.on("pageerror", e => errs.push(String(e).slice(0, 120)));
  page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
  for (const u of REPS) {
    errs.length = 0;
    try {
      await page.goto(BASE + u, { timeout: 20000, waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      const d = await page.evaluate(() => {
        const g = (s, p) => { const el = document.querySelector(s); return el ? getComputedStyle(el)[p] : null; };
        const nav = [...document.querySelectorAll(".mn-item")].filter(i => getComputedStyle(i).display !== "none").length;
        return { ds: document.documentElement.classList.contains("ds-v2"),
          shell: document.body.className || "(terminal-default)",
          headerBg: g("header.meganav", "backgroundColor"),
          active: g(".mn-item.on>.mn-top", "borderBottomColor"),
          accentVar: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
          navItems: nav, footer: !!document.querySelector("footer.mega"),
          mainW: document.querySelector("main") ? Math.round(document.querySelector("main").getBoundingClientRect().width) : null };
      });
      out.push({ url: u, ...d, consoleErrors: [...new Set(errs)] });
    } catch (e) { out.push({ url: u, error: String(e).slice(0, 140) }); }
  }
  await ctx.close();
  writeFileSync("qa/audit/desktop-consistency.json", JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out.filter(o => o.error || !o.ds || (o.accentVar && !/3BE08F/i.test(o.accentVar)) || (o.consoleErrors || []).length), null, 1) || "all clean");
  console.log("desktop reps:", out.length);
}

if (mode === "tools") {
  const results = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  // stress test — cash-heavy sample: cash must land in cushions, never hurts
  await page.goto(BASE + "/bubble#stress", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.fill("#stress textarea", "CASH 45\nNVDA 25\nSMH 20\nAMD 10");
  await page.click("text=Run stress test");
  await page.waitForSelector(".st-duo .hurt .row b", { timeout: 15000 });
  const hurt = await page.$$eval(".st-duo .hurt .row b", els => els.map(e => e.textContent));
  const cush = await page.$$eval(".st-duo .cush .row", els => els.map(e => e.textContent.trim()));
  results.push({ test: "stress cash-heavy", hurt, cush,
    pass: !hurt.includes("CASH") && cush.some(c => c.includes("45")) });
  // share card export (all three formats non-blank)
  await page.click("#st-card");
  for (const fmt of ["land", "sq", "story"]) {
    await page.click(`#st-fmt button[data-fmt="${fmt}"]`);
    await page.waitForTimeout(2200);
    const len = await page.$eval("#st-dl", a => (a.href || "").length);
    results.push({ test: "card export " + fmt, dataUrlLen: len, pass: len > 50000 });
  }
  // stress unknown + 12 tickers
  await page.click("#st-again");
  await page.fill("#stress textarea", "ZZFAKE 10, NVDA 10, AMD 10, MSFT 10, GOOGL 10, META 10, TSM 10, MU 10, ARM 5, QCOM 5, SPY 5, CASH 5");
  await page.click("text=Run stress test");
  await page.waitForSelector(".st-stats", { timeout: 15000 });
  const unk = await page.textContent(".st-stats");
  results.push({ test: "stress 12-ticker + unknown", pass: /10%/.test(unk), note: "unknown weight surfaces honestly" });
  // calculator: loads, picker works, invalid input
  await page.goto(BASE + "/tools/fair-value-calculator", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#sa-calc-mount .sa-calc", { timeout: 20000 }).catch(() => {});
  const calcUp = await page.$("#sa-calc-mount .sa-calc") !== null;
  await page.fill("#fv-input", "zzzznotreal");
  await page.waitForTimeout(600);
  const sugg = await page.$eval("#fv-sugg", el => getComputedStyle(el).display).catch(() => "none");
  results.push({ test: "calculator mounts + unknown query no crash", pass: calcUp && sugg === "none" });
  const disclaimer = await page.textContent("body");
  results.push({ test: "calculator disclaimer", pass: /Not financial advice/i.test(disclaimer) && /delayed/i.test(disclaimer) });
  await ctx.close();
  writeFileSync("qa/audit/tools-functionality-report.md",
    `# Tools functionality — live ${BASE}\n\n${new Date().toISOString()}\n\n|test|pass|detail|\n|---|---|---|\n` +
    results.map(r => `|${r.test}|${r.pass ? "✅" : "❌"}|${r.hurt ? "hurt:" + r.hurt.join(",") + " cush:" + r.cush.join(";") : r.dataUrlLen ? r.dataUrlLen + " bytes" : r.note || ""}|`).join("\n") + "\n");
  console.log(results.map(r => `${r.pass ? "PASS" : "FAIL"} ${r.test}`).join("\n"));
}
await browser.close();

// ── appended modes: theme + width (frontend-debug pass) ────────────────────
if (mode === "theme") {
  const browser2 = await chromium.launch();
  const ctx = await browser2.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const out = [];
  for (const u of urls) {
    let rec = { url: u };
    try {
      await page.goto(BASE + u, { timeout: 20000, waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const s0 = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme || "dark",
        bg: getComputedStyle(document.body).backgroundColor, ds: document.documentElement.classList.contains("ds-v2"),
        toggle: !!document.querySelector(".mn-theme") }));
      Object.assign(rec, s0);
      if (s0.toggle) {
        await page.click(".mn-theme", { force: true });
        await page.waitForTimeout(350);
        const s1 = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme,
          bg: getComputedStyle(document.body).backgroundColor }));
        rec.attrChanged = s1.theme !== s0.theme;
        rec.visualChanged = s1.bg !== s0.bg;
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(400);
        const sR = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme || "dark",
          bg: getComputedStyle(document.body).backgroundColor }));
        rec.persisted = sR.theme === s1.theme;
      }
      await page.evaluate(() => { localStorage.setItem("santro-theme", "dark"); localStorage.removeItem("flag:ds_v2"); });
      rec.pass = !!(rec.toggle && rec.attrChanged && rec.visualChanged && rec.persisted);
      if (!rec.pass) console.log("THEME-FAIL", u, JSON.stringify({ a: rec.attrChanged, v: rec.visualChanged, p: rec.persisted, t: rec.toggle }));
    } catch (e) { rec.error = String(e).slice(0, 120); console.log("THEME-ERR", u, rec.error); }
    out.push(rec);
  }
  await ctx.close(); await browser2.close();
  const fails = out.filter(r => !r.pass);
  writeFileSync("qa/frontend-debug/theme-toggle-audit.json", JSON.stringify(out, null, 1));
  writeFileSync("qa/frontend-debug/theme-toggle-audit.md",
    `# Theme toggle audit — ${BASE}\n\n${new Date().toISOString()}\n\nURLs tested: **${out.length}** @1440 (click -> attr + computed bg -> reload persist)\n\n**failures: ${fails.length}**\n\n` +
    (fails.length ? "|url|toggle|attr|visual|persisted|\n|---|---|---|---|---|\n" +
     fails.slice(0, 60).map(f => `|${f.url}|${f.toggle}|${f.attrChanged}|${f.visualChanged}|${f.persisted}|`).join("\n") : "All pass."));
  console.log(`theme: ${out.length} tested, ${fails.length} FAIL`);
}

if (mode === "width") {
  const browser2 = await chromium.launch();
  const ctx = await browser2.newContext({ viewport: { width: 1920, height: 950 } });
  const page = await ctx.newPage();
  const out = [];
  for (const u of urls) {
    try {
      await page.goto(BASE + u, { timeout: 20000, waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const d = await page.evaluate(() => {
        const vw = window.innerWidth;
        const main = document.querySelector("main") || document.querySelector(".land-hero") || document.querySelector(".area-heat") || document.body;
        const r = main.getBoundingClientRect();
        let widest = null, ww = 0;
        for (const el of main.children) {
          const w = el.getBoundingClientRect().width;
          if (w > ww) { ww = w; widest = el.tagName + (el.className && el.className.split ? "." + String(el.className).split(" ")[0] : ""); }
        }
        return { vw, mainW: Math.round(r.width), gutterL: Math.round(r.left), gutterR: Math.round(vw - r.right),
          innerW: Math.round(ww), widest, shell: document.body.className || "(terminal-default)" };
      });
      out.push({ url: u, ...d });
    } catch (e) { out.push({ url: u, error: String(e).slice(0, 120) }); }
  }
  await ctx.close(); await browser2.close();
  writeFileSync("qa/frontend-debug/width-shell-audit.json", JSON.stringify(out, null, 1));
  console.log("width: measured", out.length, "URLs @1920");
}

if (mode === "fonts") {
  const browser3 = await chromium.launch();
  const ctx = await browser3.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const out = [];
  const SEL = { body: "body", h1: "h1", h2: "h2", nav: ".mn-top", button: "button, .hp-btn, .cta",
    link: "main a, article a", number: ".hp-tape, #asof, .mn-asof, .num, .hp-cred, .st-stat .v",
    articleH1: "main.wrap h1, .art h1" };
  for (const u of urls) {
    try {
      await page.goto(BASE + u, { timeout: 20000, waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      const d = await page.evaluate((SEL) => {
        const first = s => { for (const part of s.split(",")) { const el = document.querySelector(part.trim()); if (el) return el; } return null; };
        const fam = s => { const el = first(s); return el ? getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim() : null; };
        const o = {}; for (const k in SEL) o[k] = fam(SEL[k]); return o;
      }, SEL);
      out.push({ url: u, ...d });
    } catch (e) { out.push({ url: u, error: String(e).slice(0, 100) }); }
  }
  await ctx.close(); await browser3.close();
  writeFileSync("qa/full-consistency/02-rendered-font-audit.json", JSON.stringify(out, null, 1));
  // grade: body/h1/h2/nav/button should be IBM Plex Sans; number surfaces IBM Plex Mono;
  // articleH1 Newsreader only on article routes
  const isArt = u => /^\/blog\/|^\/blog$|^\/about$|^\/privacy$|^\/terms$/.test(u);
  let fails = 0; const rows = [];
  for (const r of out) {
    if (r.error) { fails++; rows.push([r.url, "load", r.error]); continue; }
    for (const k of ["body", "h1", "nav", "button"])
      if (r[k] && r[k] !== "IBM Plex Sans") { fails++; rows.push([r.url, k, r[k]]); }
    if (r.number && r.number !== "IBM Plex Mono") { fails++; rows.push([r.url, "number", r.number]); }
    if (r.articleH1 && isArt(r.url) && !/Newsreader/.test(r.articleH1)) { fails++; rows.push([r.url, "articleH1", r.articleH1]); }
  }
  writeFileSync("qa/full-consistency/02-rendered-font-audit.md",
    `# Rendered font audit — ${BASE}\n\n${new Date().toISOString()}\n\nURLs: **${out.length}** · selector checks failing: **${fails}**\n\n` +
    (rows.length ? "|url|selector|computed|\n|---|---|---|\n" + rows.slice(0, 80).map(r => `|${r[0]}|${r[1]}|${r[2]}|`).join("\n") : "All pass."));
  console.log(`fonts: ${out.length} URLs, ${fails} failing selector checks`);
}
