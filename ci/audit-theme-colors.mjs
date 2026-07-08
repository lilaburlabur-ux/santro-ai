/* Theme-color integrity gate — blue is NOT a Santro UI color (either theme).
   Fails on: known blue/purple hexes, blue-dominant rgb()/rgba(), and blue-ish
   class tokens in production HTML/CSS/JS/PY. Allowed exceptions (documented in
   qa/theme-color-integrity/00-theme-architecture.md):
   - ds-v2/tokens.css + design/tokens.json --gl-* glass tokens (iOS/share-card
     canvas only; sole web consumer is the unused .ds-glassframe primitive).
   Run: npm run audit:theme-colors */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([".git", "node_modules", "qa", "audit", "__pycache__", "logs", "assets", "marketing-research", "docs", "ci"]);
const ALLOW_FILES = new Set(["ds-v2/tokens.css", "design/tokens.json"]); // glass tokens only
const EXT = new Set([".html", ".css", ".js", ".py"]);

const BLUE_HEX = /#(?:5b9df0|7cb0f5|2f6fd0|2059b8|bcd3f1|e7effb|58a6ff|4ea1ff|3b82f6|2563eb|1d4ed8|60a5fa|0ea5e9|38bdf8|6ed2ff|a78bfa|8b5cf6|a855f7|c084fc|9333ea|7c3aed|7cc4ff|2f6dbf|c79bff|7a4bd0|0000ff)\b/i;
const BLUE_CLASS = /\b(?:text-blue|bg-blue|border-blue|ring-blue|accent-blue|primary-blue|link-blue|brand-blue|tkchip blue|fchip blue|chip purple|sky-\d|indigo-\d|cyan-\d)\b/i;
const RGB = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;

const findings = [];
function scan(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const rel = path.relative(ROOT, p);
    const st = statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) scan(p); continue; }
    if (!EXT.has(path.extname(name)) || ALLOW_FILES.has(rel)) continue;
    const lines = readFileSync(p, "utf8").split("\n");
    lines.forEach((ln, i) => {
      let hit = null;
      const h = ln.match(BLUE_HEX); if (h) hit = h[0];
      if (!hit) { const c = ln.match(BLUE_CLASS); if (c) hit = c[0]; }
      if (!hit) for (const m of ln.matchAll(RGB)) {
        const [r, g, b] = [+m[1], +m[2], +m[3]];
        if (b > 140 && b > r + 40 && b > g + 30) { hit = `${m[0]})`; break; }
      }
      if (hit) findings.push(`${rel}:${i + 1}  ${hit}  ${ln.trim().slice(0, 90)}`);
    });
  }
}
scan(ROOT);
if (findings.length) {
  console.error(`✗ theme-color audit: ${findings.length} blue/purple finding(s) — blue is not a Santro UI color:`);
  findings.slice(0, 30).forEach((f) => console.error("  " + f));
  process.exit(1);
}
console.log("audit:theme-colors clean — no blue/purple in production UI source (both themes green).");
