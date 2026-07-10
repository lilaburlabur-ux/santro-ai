#!/usr/bin/env node
/* qa/ai_universe_consistency.mjs — FAILS if theme pages diverge from the
   canonical AI Universe dataset (universe.json — what /terminal reads).

   Checks per /stocks/themes/<slug>.html:
     - injected shared-renderer block present, bubbleId matches slug
     - table ticker set == universe bubble ticker set (no missing, no extra)
     - all ticker links use the canonical /t?sym= pattern (works for EVERY
       ticker; /stocks/<sym> static pages don't exist for newer names)
     - table has live-refresh hooks (data-move-for/data-cap-for) so values
       track the same fetch the map makes
   Global:
     - no duplicate tickers within a bubble
     - every universe ticker resolvable via t.html (canonical ticker page)
     - sector pages non-empty whenever the bubble has tickers

   Run: npm run qa:ai-universe        (exit 0 = consistent) */
import { readFileSync, existsSync, readdirSync } from "node:fs";

let fail = 0, pass = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
};

const u = JSON.parse(readFileSync("universe.json", "utf8"));
check("t.html exists (canonical /t?sym= ticker page)", existsSync("t.html"));

for (const b of u.bubbles) {
  const seen = new Set(), dupes = [];
  for (const t of b.tickers) { if (seen.has(t.ticker)) dupes.push(t.ticker); seen.add(t.ticker); }
  check(`no duplicate tickers in ${b.id}`, dupes.length === 0, dupes.join(","));
}

const files = readdirSync("stocks/themes").filter(f => f.endsWith(".html"));
for (const f of files) {
  const slug = f.slice(0, -5), bid = slug.replace(/-/g, "_");
  const b = u.bubbles.find(x => x.id === bid);
  if (!b) { check(`bubble exists for ${slug}`, false, `no universe bubble ${bid}`); continue; }
  const s = readFileSync("stocks/themes/" + f, "utf8");

  check(`${slug}: shared renderer block`, s.includes(`data-bubble="${bid}"`) && s.includes("sector-bubble-map.js"));
  check(`${slug}: bubble non-empty renders map`, b.tickers.length === 0 || s.includes("SantroSectorMap.mount"));

  const tbl = (s.match(/<table class="tt">[\s\S]*?<\/table>/) || [""])[0];
  const canon = new Set(b.tickers.map(t => t.ticker));
  const inTable = new Set([...tbl.matchAll(/href="\/t\?sym=([A-Z.]+)"/g)].map(m => m[1]));
  const missing = [...canon].filter(t => !inTable.has(t));
  const extra = [...inTable].filter(t => !canon.has(t));
  check(`${slug}: table set == universe set (${canon.size})`, !missing.length && !extra.length,
        `missing=[${missing}] extra=[${extra}]`);
  const stockLinks = (tbl.match(/href="?\/stocks\/[a-z.]+"?/g) || []).length;
  check(`${slug}: canonical /t?sym= links only`, stockLinks === 0, `${stockLinks} legacy /stocks/ links`);
  check(`${slug}: live-refresh hooks`, tbl.includes("data-move-for") && tbl.includes("data-cap-for"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
