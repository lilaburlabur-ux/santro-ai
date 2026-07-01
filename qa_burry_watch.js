#!/usr/bin/env node
/* qa_burry_watch.js — guardrails for the Michael Burry AI Short Watch page.
   Source-gating + careful-wording + SEO + sitemap. Run: node qa_burry_watch.js */
const fs = require("fs"), path = require("path"), HERE = __dirname;
let fail = 0, pass = 0;
const check = (n, c, d) => { if (c) { pass++; console.log("  ✓ " + n); } else { fail++; console.log("  ✗ " + n + (d ? " — " + d : "")); } };

const html = fs.readFileSync(path.join(HERE, "stocks", "burry-short-watch.html"), "utf8");
const sitemap = fs.readFileSync(path.join(HERE, "sitemap.xml"), "utf8");
const m = html.match(/window\.BURRY_SHORT_WATCH\s*=\s*(\{[\s\S]*?\n\};)/);
let B = null; try { if (m) B = (new Function("return " + m[1]))(); } catch (e) { console.log("model err", e.message); }

const SAFE = ["confirmed_primary_source", "substack_reported", "sec_filing_verified", "sec_filing_reported", "reputable_media_reported"];
const main = (B ? B.positions : []).filter(p => p.include_in_main_bubble_map);

console.log("\nData model + source-gating");
check("model parses", !!B);
check("full_position_list_verified === false", B && B.full_position_list_verified === false);
check("main map non-empty", main.length > 0);
check("every main item has an allowed source_status", main.every(p => SAFE.includes(p.position_status)));
check("no needs_verification in main map", !main.some(p => p.position_status === "needs_verification"));
check("no context_only in main map", !main.some(p => p.position_status === "context_only"));
check("no exited_or_denied in main map", !main.some(p => p.position_status === "exited_or_denied"));
check("every main item has source_date + last_updated", main.every(p => /^\d{4}-\d{2}-\d{2}$/.test(p.source_date) && /^\d{4}-\d{2}-\d{2}$/.test(p.last_updated)));
check("every main item has a source_url", main.every(p => /^https?:\/\//.test(p.source_url || "")));
check("every item has a ticker_page_url", B.positions.every(p => (p.ticker_page_url || "").startsWith("/")));
const tesla = B.positions.find(p => p.ticker === "TSLA");
check("TSLA is context_only, NOT in main map", tesla && tesla.position_status === "context_only" && !tesla.include_in_main_bubble_map);
check("SOXX/QQQ/AMAT/CAT are needs_verification (not main map)",
  ["SOXX","QQQ","AMAT","CAT"].every(t => { const p = B.positions.find(x => x.ticker === t); return p && p.position_status === "needs_verification" && !p.include_in_main_bubble_map; }));
check("no invented prices on needs-verification (no reported_entry price set)",
  B.positions.filter(p => p.position_status === "needs_verification").every(p => !p.reported_entry_or_reference_price));

console.log("\nCareful wording");
[/full\s+short\s+portfolio/i, /full\s+portfolio/i, /complete\s+portfolio/i, /everything\s+(he|burry)('?s)?\s+(is\s+)?shorting/i]
  .forEach(rx => check("no careless phrase " + rx, !rx.test(html)));
check("distinguishes put vs short (puts ≠ shorting stock)", /not the same as shorting/i.test(html));
check("labels Tesla carefully (not short / context)", /not.*short.*tesla|tesla.*not.*short|context.only/i.test(html.toLowerCase()));
check("notes notional ≠ capital at risk", /notional/i.test(html) && /capital at risk/i.test(html));

console.log("\nPage structure");
check("one <h1>", (html.match(/<h1[\s>]/g) || []).length === 1);
check("hero H1 text", /Michael Burry AI Short Watch/.test(html));
check("source banner w/ last updated + last source reviewed", /Last updated:/.test(html) && /Last source reviewed:/.test(html));
check("bubble map", /id="bmap"/.test(html));
check("time filters", ["1D","1W","1M","YTD","1Y"].every(w => html.includes('data-w="' + w + '"')));
check("positions table", /Positions — reported bearish exposure/.test(html));
check("needs-verification section", />Needs verification<\/h2>/.test(html));
check("historical/context section", /Historical \/ context mentions/.test(html));
check("methodology", /Source methodology/.test(html));
check("disclaimer", /This page is based on public information/.test(html));
check("delayed-data disclaimer", /delayed ~15 min/.test(html));

console.log("\nSEO / links / sitemap");
check("title", /<title>Michael Burry AI Short Watch \| Santro AI<\/title>/.test(html));
check("meta description", /<meta name="description" content="[^"]{60,}/.test(html));
check("canonical", /rel="canonical" href="https:\/\/santroai\.tech\/stocks\/burry-short-watch"/.test(html));
check("og + twitter", /og:title/.test(html) && /name="twitter:card"/.test(html));
check("WebPage + BreadcrumbList + Dataset schema", /"@type":"WebPage"/.test(html) && /"@type":"BreadcrumbList"/.test(html) && /"@type":"Dataset"/.test(html));
check("NO Person schema", !/"@type":"Person"/.test(html));
["/stocks","/bubble","/etfs","/research","/share","/blog"].forEach(l => check("links to " + l, html.includes('href="' + l + '"')));
check("cross-links focused /stocks/burry", html.includes('href="/stocks/burry"'));
check("sitemap includes /stocks/burry-short-watch", /santroai\.tech\/stocks\/burry-short-watch</.test(sitemap));

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
