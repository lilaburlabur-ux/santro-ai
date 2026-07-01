#!/usr/bin/env node
/* qa_burry.js — guardrails for the Michael Burry reported-AI-shorts tracker.
   Source-integrity + honest-wording + SEO + sitemap checks.
   Run:  node qa_burry.js   (exit 0 = all pass, 1 = failure) */
const fs = require("fs");
const path = require("path");
const HERE = __dirname;

let fail = 0, pass = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
};

const html = fs.readFileSync(path.join(HERE, "stocks", "burry.html"), "utf8");
const sitemap = fs.readFileSync(path.join(HERE, "sitemap.xml"), "utf8");

const m = html.match(/window\.BURRY_AI_SHORTS\s*=\s*(\{[\s\S]*?\n\};)/);
let B = null;
try { if (m) B = (new Function("return " + m[1]))(); } catch (e) { console.log("model eval error:", e.message); }

const SAFE = ["verified_filing","reputable_media_reported","santro_verified_manual"];
const main = (B ? B.positions : []).filter(p => p.include_in_main);

console.log("\nData model + source-gating");
check("data model parses", !!B);
check("full_portfolio_verified === false", B && B.full_portfolio_verified === false);
check("positions non-empty", main.length > 0);
check("every position has a SAFE source_status", main.every(p => SAFE.includes(p.source_status)));
check("every position has a source_url", main.every(p => p.source_url && /^https?:\/\//.test(p.source_url)));
check("every position has a disclosure date", main.every(p => /^\d{4}-\d{2}-\d{2}$/.test(p.source_date)));
check("NVDA + PLTR present", ["NVDA","PLTR"].every(t => main.some(p => p.ticker === t)));
check("no low-confidence position", !main.some(p => p.confidence_level === "low"));
check("notional_caveat recorded in model", B && /notional/i.test(B.notional_caveat || ""));

console.log("\nHonest wording (a short tracker, not a portfolio / not a prediction)");
[/full\s+portfolio/i, /complete\s+portfolio/i, /all\s+holdings/i, /everything\s+he\s+owns/i]
  .forEach(rx => check("no banned phrase " + rx, !rx.test(html)));
check("states 'not a prediction'", /not a prediction/i.test(html));
check("surfaces the notional-vs-capital caveat", /notional/i.test(html) && /capital at risk/i.test(html));
check("notes puts can be hedges", /hedge/i.test(html));
check("notes 13F is a snapshot", /snapshot/i.test(html));
check("no overstated crash claim", !/will crash|guaranteed|is going to (crash|collapse)/i.test(html));

console.log("\nPage structure (crawlable)");
check("exactly one <h1>", (html.match(/<h1[\s>]/g) || []).length === 1);
check("hero copy present", /Big Short/i.test(html) && /Scion/i.test(html));
check("data-integrity banner present", /notional value/i.test(html));
check("positions table", /class="btbl"/.test(html));
check("'how to read these numbers' section", /How to read these numbers/i.test(html));
check("'why this sits in bubble-risk' section", /bubble-risk tracking/i.test(html));
check("source methodology section", /Source methodology/i.test(html));
check("disclaimer", /This page is based on public disclosures/i.test(html));

console.log("\nSEO / metadata");
check("title", /<title>Michael Burry's Reported AI Short Positions \| Santro AI<\/title>/.test(html));
check("meta description", /<meta name="description" content="[^"]{60,}/.test(html));
check("canonical", /rel="canonical" href="https:\/\/santroai\.tech\/stocks\/burry"/.test(html));
check("og + twitter", /og:title/.test(html) && /name="twitter:card"/.test(html));
check("WebPage schema", /"@type":"WebPage"/.test(html));
check("BreadcrumbList schema", /"@type":"BreadcrumbList"/.test(html));
check("Dataset schema", /"@type":"Dataset"/.test(html));
check("NO Person schema (market-data page, not a biography)", !/"@type":"Person"/.test(html));
check("breadcrumb Home > Stocks > Burry", /sa-crumb[\s\S]*Home<\/a>[\s\S]*AI Stocks<\/a>[\s\S]*Burry/.test(html));

console.log("\nInternal links + bubble-risk wiring + sitemap");
check("links to /bubble (bubble-risk tracking)", html.includes('href="/bubble"'));
check("cross-links to the bull side /stocks/aschenbrenner", html.includes('href="/stocks/aschenbrenner"'));
["/stocks","/etfs","/research","/share"].forEach(l =>
  check("links to " + l, html.includes('href="' + l + '"') || html.includes('href="' + l + '?')));
check("sitemap.xml includes /stocks/burry", /santroai\.tech\/stocks\/burry</.test(sitemap));

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
