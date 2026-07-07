#!/usr/bin/env node
/**
 * Santro qa:routes — all-sitemap design-consistency audit (HTTP level).
 * Usage: node qa/qa_routes.mjs [--base https://santroai.tech]
 * Checks every sitemap URL for: 200 · ds_v2 root includes (tokens/remap/
 * flags) · no canary/debug strings · no stale-versioned css · exactly one
 * generated header/footer. Writes qa/design-consistency-report.{md,json}.
 * Rendered-DOM checks (overflow/console) are done in the browser QA pass —
 * this script is the crawlable-output gate.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const base = (process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "https://santroai.tech").replace(/\/$/, "");

const FORBIDDEN = [/DS_V2 CANARY/i, /PRODUCTION UNCHANGED/i, /Tweaks panel/i,
  /showCanaryBanner/i, /design-lab controls/i, /forced ON for this page/i];
const REQUIRED = ["ds-v2/tokens.css", "ds-v2/remap.css", "ds-v2/flags.js"];
const STALE = [/site\.css\?v=(?:[0-9]|1[01])\b/, /nav\.js\?v=[12]\b/];

const locs = [...readFileSync("sitemap.xml", "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(m => m[1].replace("https://santroai.tech", ""));

const results = [];
for (const path of locs) {
  const url = base + path;
  let status = 0, body = "";
  try {
    const res = await fetch(url + (url.includes("?") ? "&" : "?") + "cb=" + Date.now(), { redirect: "manual" });
    status = res.status; body = await res.text();
  } catch (e) { status = -1; }
  const problems = [];
  if (status !== 200) problems.push(`status ${status}`);
  else {
    for (const rx of FORBIDDEN) if (rx.test(body)) problems.push(`forbidden: ${rx}`);
    for (const req of REQUIRED) if (!body.includes(req)) problems.push(`missing ${req}`);
    for (const rx of STALE) if (rx.test(body)) problems.push(`stale asset: ${rx}`);
    const headers = (body.match(/class="meganav"/g) || []).length;
    if (headers !== 1) problems.push(`headers=${headers}`);
    const footers = (body.match(/<footer class="mega"/g) || []).length;
    if (footers !== 1) problems.push(`footers=${footers}`);
  }
  results.push({ path, status, ok: problems.length === 0, problems });
  process.stdout.write(problems.length ? `FAIL ${path} ${problems.join("; ")}\n` : "");
}

const fails = results.filter(r => !r.ok);
mkdirSync("qa", { recursive: true });
writeFileSync("qa/design-consistency-report.json", JSON.stringify({ base,
  checked: results.length, passed: results.length - fails.length,
  failed: fails.length, at: new Date().toISOString(), fails }, null, 2));
writeFileSync("qa/design-consistency-report.md",
  `# Design consistency — ${base}\n\n${new Date().toISOString()}\n\n` +
  `**${results.length - fails.length}/${results.length} URLs pass.**\n\n` +
  (fails.length ? "## Failures\n" + fails.map(f =>
    `- \`${f.path}\` — ${f.problems.join("; ")}`).join("\n") : "No failures.") + "\n");
console.log(`\n${results.length - fails.length}/${results.length} sitemap URLs pass (${base})`);
process.exit(fails.length ? 1 : 0);
