#!/usr/bin/env node
/**
 * Santro ds_v2 — raw color audit (Phase 2a)
 * Scans source files for raw colors outside the token allowlist.
 * Usage:  node audit-colors.mjs <dir> [...dirs]
 *         node audit-colors.mjs --self-test
 * Exit 1 on violations (CI gate). Pair with `npm run lint:styles`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWLIST = [/tokens\.css$/, /fonts(-editorial)?\.css$/, /tokens\.json$/, /audit-colors\.mjs$/, /gallery\.html$/ /* embeds the generated LEGACY shell for QA parity */];
const EXTS = /\.(css|scss|less|js|jsx|ts|tsx|html|vue|svelte)$/;

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FUNCS = /\b(rgba?|hsla?|oklch|oklab|hwb|lab|lch)\s*\(/g;
// named colors only when used as a CSS value (after ':' or '=') to avoid prose false-positives
const NAMED = /(?:[:=]\s*|["'])(aliceblue|blue|blueviolet|crimson|cyan|fuchsia|gold|hotpink|indigo|magenta|orange|orchid|pink|plum|purple|rebeccapurple|red|salmon|tomato|violet|white|black|gray|grey|green|lime|navy|teal|yellow)\b\s*(?:;|["']|!|\))/gi;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.test(name)) out.push(p);
  }
  return out;
}

export function scanText(text, file) {
  const hits = [];
  for (const re of [HEX, FUNCS, NAMED]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const line = text.slice(0, m.index).split('\n').length;
      hits.push({ file, line, match: m[0].trim() });
    }
  }
  return hits;
}

const args = process.argv.slice(2);

if (args.includes('--self-test')) {
  // Verify the failure case actually fails: a raw color MUST be detected.
  const fixture = '.bad { color: #FF0000; background: rgb(255, 0, 255); border-color: pink; }';
  const hits = scanText(fixture, '(fixture)');
  if (hits.length >= 3) {
    console.log('self-test OK — raw colors are detected (' + hits.length + ' hits on fixture). No fixture file written.');
    process.exit(0);
  }
  console.error('self-test FAILED — detector missed raw colors. Do not trust this audit.');
  process.exit(1);
}

const dirs = args.length ? args : ['src'];
let all = [];
for (const d of dirs) {
  for (const f of walk(d)) {
    if (ALLOWLIST.some(re => re.test(f))) continue;
    all = all.concat(scanText(readFileSync(f, 'utf8'), f));
  }
}

if (all.length) {
  console.error('RAW COLOR VIOLATIONS (' + all.length + '):');
  for (const h of all) console.error('  ' + h.file + ':' + h.line + '  ' + h.match);
  console.error('All colors must come from tokens.css variables (--st-* / --gl-* / --sc-*).');
  process.exit(1);
}
console.log('audit:colors clean — no raw colors outside token files.');
