#!/usr/bin/env node
/* qa_aschenbrenner.js — guardrail checks for the Aschenbrenner Public AI
   Infrastructure Basket page. Source-integrity + SEO + safe-wording checks.
   Run:  node qa_aschenbrenner.js   (exit 0 = all pass, 1 = failure) */
const fs = require("fs");
const path = require("path");
const HERE = __dirname;

let fail = 0, pass = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
};

const html = fs.readFileSync(path.join(HERE, "stocks", "aschenbrenner.html"), "utf8");
const sitemap = fs.readFileSync(path.join(HERE, "sitemap.xml"), "utf8");

// ── extract + eval the source-gated data model ────────────────────────────
const m = html.match(/window\.ASCHENBRENNER_BASKET\s*=\s*(\{[\s\S]*?\n\};)/);
let B = null;
try { if (m) B = (new Function("return " + m[1]))(); } catch (e) { console.log("model eval error:", e.message); }

console.log("\nData model");
check("data model parses", !!B);
check("full_portfolio_verified === false", B && B.full_portfolio_verified === false);
check("has all required top-level fields",
  B && ["basket_id","basket_name","page_route","last_reviewed","full_portfolio_verified",
        "disclaimer","holdings","needs_verification","excluded_or_hedge_mentions",
        "hypothesis_watchlist"].every(k => k in B));

const SAFE = ["verified_filing","reputable_media_reported","santro_verified_manual"];
const mapH = (B ? B.holdings : []).filter(h => h.include_in_main_bubble_map);
console.log("\nSource-gating rules");
check("main holdings list non-empty", mapH.length > 0);
check("every main holding has a SAFE source_status", mapH.every(h => SAFE.includes(h.source_status)));
check("no needs_verification in map", !mapH.some(h => h.source_status === "needs_verification"));
check("no hypothesis_watchlist in map", !mapH.some(h => h.source_status === "hypothesis_watchlist"));
check("no excluded_short_or_hedge in map", !mapH.some(h => h.source_status === "excluded_short_or_hedge"));
check("no low-confidence in map", !mapH.some(h => h.confidence_level === "low"));
check("every map holding has a source_url", mapH.every(h => h.source_url && /^https?:\/\//.test(h.source_url)));
const excluded = (B ? B.excluded_or_hedge_mentions : []).map(e => e.ticker);
check("excluded tickers NOT in holdings", !(B && B.holdings.some(h => excluded.includes(h.ticker))));
check("Q1 put names all excluded (NVDA/AVGO/ORCL/SMH/ASML)",
  ["NVDA","AVGO","ORCL","SMH","ASML"].every(t => excluded.includes(t)));
check("energy/power names in map (BE/VST/CEG)",
  ["BE","VST","CEG"].every(t => B.holdings.some(h => h.ticker===t && h.include_in_main_bubble_map && SAFE.includes(h.source_status))));
check("hypothesis_watchlist populated + visually separated section",
  B.hypothesis_watchlist.length > 0 && /Hypothesis watchlist/.test(html) && /class="hyp"/.test(html));
check("hypothesis themes are NOT presented as held tickers",
  B.hypothesis_watchlist.every(x => !x.ticker));

console.log("\nSafe wording (full_portfolio_verified=false)");
[/full\s+portfolio/i, /complete\s+portfolio/i, /all\s+holdings/i, /everything\s+he\s+owns/i]
  .forEach(rx => check("no banned phrase " + rx, !rx.test(html)));

console.log("\nPage structure (crawlable)");
check("exactly one <h1>", (html.match(/<h1[\s>]/g) || []).length === 1);
check("hero copy present", /source-gated Santro basket/i.test(html));
check("data-integrity banner present", /separates/i.test(html) && /delayed and incomplete/i.test(html));
check("bubble map REMOVED (no #bmap, no estimated positions)", !/id="bmap"/.test(html));
check("disclosure-basis section present", />Disclosure basis/.test(html));
check("date-of-disclosure column present", /Date disclosed/.test(html));
check("every main holding shows a disclosure date", mapH.every(h => /^\d{4}-\d{2}-\d{2}$/.test(h.source_date)));
check("holdings table", /class="btbl"/.test(html));
check("needs-verification section", />Needs verification<\/h2>/.test(html));
check("excluded/hedge section", /Excluded \/ hedge mentions/.test(html));
check("basket read section", />Basket read<\/h2>/.test(html));
check("source methodology section", />Source methodology<\/h2>/.test(html));
check("disclaimer", /This page is based on public disclosures/.test(html));
check("delayed-data disclaimer", /delayed ~15 min/.test(html));
check("does not invent position sizes", /does not estimate position sizes/i.test(html));

console.log("\nSEO / metadata");
check("title", /<title>Aschenbrenner Public AI Infrastructure Basket \| Santro AI<\/title>/.test(html));
check("meta description", /<meta name="description" content="[^"]{60,}/.test(html));
check("canonical", /rel="canonical" href="https:\/\/santroai\.tech\/stocks\/aschenbrenner"/.test(html));
check("og:title + og:description + og:url", /og:title/.test(html) && /og:description/.test(html) && /og:url/.test(html));
check("twitter card", /name="twitter:card"/.test(html));
check("WebPage schema", /"@type":"WebPage"/.test(html));
check("BreadcrumbList schema", /"@type":"BreadcrumbList"/.test(html));
check("Dataset schema (table is source-linked)", /"@type":"Dataset"/.test(html));
check("NO Person schema", !/"@type":"Person"/.test(html));
check("breadcrumb nav Home > Stocks > Basket", /sa-crumb[\s\S]*Home<\/a>[\s\S]*AI Stocks<\/a>[\s\S]*Aschenbrenner/.test(html));

console.log("\nInternal links + sitemap");
["/stocks","/bubble","/etfs","/research","/share"].forEach(l =>
  check("links to " + l,
    html.includes('href="' + l + '"') || html.includes('href="' + l + '?') || html.includes('href="' + l + '/')));
check("sitemap.xml includes /stocks/aschenbrenner", /santroai\.tech\/stocks\/aschenbrenner</.test(sitemap));

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
