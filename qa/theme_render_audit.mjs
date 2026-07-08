/* Rendered theme-color audit — computed colors in BOTH themes.
   Modes:
     node qa/theme_render_audit.mjs local   → serve repo on :8000, probe representative pages,
                                              toggle + persistence checks, screenshots
     node qa/theme_render_audit.mjs live    → crawl EVERY sitemap URL on santroai.tech,
                                              dark+light computed scan @1440 & 390
   Blue-ish = hue 185–260° with sat>25% & lum in visible band, on any probed selector. */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const MODE = process.argv[2] || "local";
const OUT = "qa/theme-color-integrity";
mkdirSync(`${OUT}/screenshots/dark`, { recursive: true });
mkdirSync(`${OUT}/screenshots/light`, { recursive: true });
mkdirSync(`${OUT}/screenshots/failures`, { recursive: true });

function isBlueish(cssColor) {
  const m = cssColor && cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return false;
  const [r, g, b] = [+m[1], +m[2], +m[3]]; const a = m[4] === undefined ? 1 : +m[4];
  if (a < 0.08) return false;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === 0 || mx - mn < 24) return false;            // gray-ish
  const sat = (mx - mn) / mx; if (sat < 0.25) return false;
  let h = 0;
  if (mx === r) h = ((g - b) / (mx - mn)) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4;
  h = (h * 60 + 360) % 360;
  return h >= 185 && h <= 260;
}

const SELECTORS = [
  ["body", "background-color"], ["body", "color"],
  [".meganav .mn-a", "color"], [".meganav .mn-logo b, .meganav .mn-lw", "color"],
  ["main a, .hp-sec a, .panel a, article a", "color"],
  [".hp-btn.primary, .sa-btn.primary, .xc-cta, .wl-cta, .ds-gate-cta", "background-color"],
  [".hp-btn.primary, .sa-btn.primary, .xc-cta, .wl-cta, .ds-gate-cta", "color"],
  [".mn-b", "color"], ["input, select", "border-color"],
  [".mn-signup, .a1", "color"], ["#ts-customize", "color"],
  [".wl-chip", "color"], [".rb.income", "color"], [".fchip.alt, .tkchip.alt", "color"],
  ["h1", "color"], [".badge", "color"], ["footer a, .mega a", "color"],
];

async function probe(page) {
  return page.evaluate((sels) => {
    const out = [];
    for (const [sel, prop] of sels) {
      const el = document.querySelector(sel);
      if (!el || !(el.offsetParent !== null || sel === "body")) continue;
      out.push([sel, prop, getComputedStyle(el)[prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] || getComputedStyle(el).getPropertyValue(prop)]);
    }
    // focus ring probe: focus first link
    const a = document.querySelector("main a, .panel a, a");
    if (a) { a.focus({ preventScroll: true }); out.push(["focused-link", "outline-color", getComputedStyle(a).outlineColor]); }
    return out;
  }, SELECTORS);
}

const browser = await chromium.launch();
const rows = []; let blueCount = 0;

async function auditUrl(base, urlPath, theme, viewport, page, shotName) {
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((t) => { try { localStorage.setItem("santro-theme", t); } catch (e) {} }, theme);
  await page.goto(base + urlPath, { waitUntil: "domcontentloaded" }).catch(() => null);
  await page.waitForTimeout(MODE === "live" ? 2600 : 1800);
  const applied = await page.evaluate(() => ({
    dataTheme: document.documentElement.dataset.theme || "dark",
    dsv2: document.documentElement.classList.contains("ds-v2"),
  }));
  const colors = await probe(page);
  let pageBlue = 0;
  for (const [sel, prop, val] of colors) {
    const blue = isBlueish(val);
    if (blue) { pageBlue++; blueCount++; rows.push({ url: urlPath, theme, viewport, sel, prop, val, blue: true }); }
  }
  rows.push({ url: urlPath, theme, viewport, sel: "__page__", prop: "summary", val: `dsv2=${applied.dsv2} theme=${applied.dataTheme} blues=${pageBlue}`, blue: pageBlue > 0 });
  if (shotName) await page.screenshot({ path: `${OUT}/screenshots/${theme}/${shotName}.png`, fullPage: false }).catch(() => null);
  if (pageBlue) await page.screenshot({ path: `${OUT}/screenshots/failures/${theme}-${(shotName || urlPath).replace(/[^a-z0-9]/gi, "_")}.png` }).catch(() => null);
  return pageBlue;
}

if (MODE === "local") {
  const fe = spawn("python3", ["-m", "http.server", "8000", "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  process.on("exit", () => { try { fe.kill(); } catch {} });
  await new Promise((r) => setTimeout(r, 1200));
  const base = "http://127.0.0.1:8000";
  const PAGES = [["/index.html","homepage"],["/terminal.html","terminal"],["/stocks.html","stocks"],["/t.html?sym=NVDA","stock-detail"],
    ["/crypto.html","crypto"],["/etfs.html","etfs"],["/e.html?sym=BAI","etf-detail"],["/bubble.html","bubble-stress"],
    ["/tools/fair-value-calculator.html","calculator"],["/share.html","share"],["/blog/ai-bubble-valuation-history.html","article"],
    ["/about.html","about"],["/signin.html","signin"],["/signup.html","signup"],["/quiz.html","quiz"]];
  for (const [u, name] of PAGES) {
    for (const theme of ["dark", "light"]) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const p = await ctx.newPage();
      await auditUrl(base, u, theme, 1440, p, name);
      await ctx.close();
    }
  }
  // toggle + persistence + same-tick check on terminal
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(base + "/terminal.html", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(2000);
    const before = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await p.evaluate(() => window.SantroTheme.set("light"));
    await p.waitForTimeout(400);
    const after = await p.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor,
      link: getComputedStyle(document.querySelector(".panel a, main a, a")).color,
      dsv2: document.documentElement.classList.contains("ds-v2") }));
    await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(2000);
    const persisted = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme,
      bg: getComputedStyle(document.body).backgroundColor,
      dsv2: document.documentElement.classList.contains("ds-v2") }));
    rows.push({ url: "/terminal.html", theme: "toggle", viewport: 1440, sel: "__toggle__", prop: "flow",
      val: JSON.stringify({ before, after, persisted }), blue: isBlueish(after.link) });
    if (isBlueish(after.link)) blueCount++;
    await ctx.close();
  }
  // mobile drawer both themes
  for (const theme of ["dark", "light"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.addInitScript((t) => localStorage.setItem("santro-theme", t), theme);
    await p.goto(base + "/terminal.html", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1800);
    await p.click(".mn-burger").catch(() => null); await p.waitForTimeout(500);
    const d = await p.evaluate(() => { const a = document.querySelector("#mn-drawer a.a1, #mn-drawer a");
      return a ? getComputedStyle(a).color : null; });
    if (isBlueish(d)) { blueCount++; rows.push({ url: "/terminal.html#drawer", theme, viewport: 390, sel: "drawer a", prop: "color", val: d, blue: true }); }
    await p.screenshot({ path: `${OUT}/screenshots/${theme}/mobile-drawer.png` }).catch(() => null);
    await ctx.close();
  }
} else {
  // LIVE: every sitemap URL, both themes, 1440 + 390
  const xml = readFileSync("sitemap.xml", "utf8");
  const urls = [...xml.matchAll(/<loc>https:\/\/santroai\.tech([^<]*)<\/loc>/g)].map((m) => m[1] || "/");
  console.log("sitemap URLs:", urls.length);
  const base = "https://santroai.tech";
  for (const theme of ["dark", "light"]) {
    for (const vw of [1440, 390]) {
      const ctx = await browser.newContext({ viewport: { width: vw, height: vw === 390 ? 844 : 900 } });
      const p = await ctx.newPage();
      await p.addInitScript((t) => { try { localStorage.setItem("santro-theme", t); } catch (e) {} }, theme);
      for (const u of urls) await auditUrl(base, u, theme, vw, p, null);
      await ctx.close();
      console.log(`live pass done: ${theme} @${vw} — running blue total: ${blueCount}`);
    }
  }
}

await browser.close();
const blues = rows.filter((r) => r.blue && r.sel !== "__page__");
const summary = { mode: MODE, at: new Date().toISOString(), totalChecks: rows.length, blueFindings: blues.length, blues };
writeFileSync(`${OUT}/02-rendered-color-audit${MODE === "live" ? "-live" : ""}.json`, JSON.stringify(summary, null, 1));
console.log(`\n${MODE} rendered audit: ${blues.length} blue finding(s) across ${rows.length} checks`);
blues.slice(0, 20).forEach((b) => console.log(`  BLUE ${b.url} [${b.theme}@${b.viewport}] ${b.sel} ${b.prop} = ${b.val}`));
process.exit(blues.length ? 1 : 0);
