// Batch C — individual AI-ETF landing pages, generated from etf-data.js.
// Writes etfs/<sym>.html (served at /etfs/<sym>) for the curated, non-closed
// funds + a static "deep dives" section linked from /etfs. Real data only;
// AUM/fee are point-in-time (the issuer page is the source of record).
const fs = require("fs");
global.window = {};
eval(fs.readFileSync("etf-data.js", "utf8"));
const ETFS = window.ETFS, BUCKETS = window.ETF_BUCKETS;
const bmap = Object.fromEntries(BUCKETS.map(b => [b.id, b]));

const TARGET = ETFS.filter(e=>e.risk!=="closed").map(e=>e.t);   // ALL curated non-closed funds
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function issuer(name){
  for(const p of ["VanEck","iShares","Global X","First Trust","Invesco","SPDR","ARK","Roundhill","KraneShares","WisdomTree","Fidelity","TrueShares","Vanguard","ROBO Global"])
    if(name.startsWith(p)) return p;
  return name.split(" ")[0];
}
const AIREL = {
  pure: "AI is the explicit thesis here, not a side effect — this is a deliberately AI-concentrated fund.",
  semis: "Semiconductors are the picks-and-shovels of the AI build-out: an infrastructure-level AI bet rather than a pure software one.",
  robotics: "Applied AI in the physical world — robotics, automation and autonomy, where AI meets hardware.",
  trap: "Read the label carefully — this fund's AI exposure is incidental, not its mandate.",
  humanoid: "The newest, most speculative edge of physical AI.",
  leveraged: "A daily-rebalanced trading instrument, not a buy-and-hold AI position.",
  income: "Built for income, not AI upside — it sells away the gains.",
  adjacent: "AI is one slice of a broader fund, not the whole thesis."
};
const HEADER = `  <header class="pageheader">
    <a class="logo" href="/" title="Santro AI — dashboard">
      <span class="logo-s">S<span class="logo-ai">AI</span></span>
      <span class="logo-rest"><span class="logo-antro">ANTRO</span>
        <span class="logo-tagline">AI&nbsp;RESEARCH&nbsp;·&nbsp;MARKETS</span></span>
    </a>
    <nav class="pagenav">
      <a class="nav-link" href="/">Terminal</a><a class="nav-link" href="/stocks">Stocks</a>
      <a class="nav-link" href="/crypto">Crypto</a><a class="nav-link" href="/bubble">Bubble risk</a>
      <a class="nav-link" href="/research">Research</a><a class="nav-link" href="/about">About</a>
      <details class="nav-more"><summary class="nav-link">More ▾</summary><div class="menu">
        <a href="/ipos">IPOs</a><a href="/etfs">ETFs</a><a href="/news">News</a><a href="/blog">Blog</a><a href="/share">Share cards</a>
      </div></details>
    </nav>
  </header>`;
const FOOTER = `  <footer>
    <nav class="foot-nav" style="margin-bottom:6px"><a href="/">Terminal</a> · <a href="/stocks">Stocks</a> · <a href="/ipos">IPOs</a> · <a href="/etfs">ETFs</a> · <a href="/crypto">Crypto</a> · <a href="/news">News</a> · <a href="/research">Research</a> · <a href="/blog">Blog</a> · <a href="/about">About</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></nav>
    Santro AI — the AI bubble terminal for AI stocks, ETFs, crypto, hot tickers, research and bubble-risk signals. Beta version.<br>
    Quotes delayed ~15 min. Real-time data planned for Pro. <span class="nfa">Not financial advice.</span><br>
    Contact us: <a href="mailto:hello@santroai.tech">hello@santroai.tech</a><br>
    © 2026 Santro AI. All rights reserved. Uses custom models.
  </footer>`;
const CSS = `<style>
  .etfp{max-width:1240px;margin:0 auto;padding:6px 20px 50px;}
  .etfp .crumb{font-size:13px;color:var(--faint,#6b7684);margin:14px 0 4px;} .etfp .crumb a{color:var(--muted,#9aa6b2);text-decoration:none;}
  .etfp h1{font-size:28px;margin:10px 0 4px;} .etfp .sub{color:var(--muted,#9aa6b2);font-size:15px;margin:0 0 18px;}
  .etfp h2{font-size:19px;margin:28px 0 8px;} .etfp p,.etfp li{color:var(--muted,#9aa6b2);font-size:15.5px;line-height:1.65;}
  .etfp b{color:var(--text,#e6edf3);} .etfp a{color:var(--accent,#5b9df0);}
  .kv{width:100%;border-collapse:collapse;margin:8px 0 4px;} .kv td{padding:8px 10px;border-bottom:1px solid var(--border-soft,#1c2230);font-size:14.5px;color:var(--muted);} .kv td:first-child{color:var(--faint,#6b7684);width:38%;}
  .rbx{display:inline-block;font-size:11px;font-weight:700;padding:2px 7px;border-radius:5px;background:rgba(240,90,110,.14);color:#f0596e;margin-left:6px;}
  .relx a{display:inline-block;margin:0 8px 6px 0;padding:5px 11px;border:1px solid var(--border-soft,#1c2230);border-radius:7px;font-size:13.5px;text-decoration:none;}
  .ctaE{margin-top:22px;padding:18px 20px;border:1px solid rgba(91,157,240,.28);border-radius:12px;background:rgba(91,157,240,.06);}
  .ctaE a{display:inline-block;background:var(--accent,#5b9df0);color:#fff;padding:9px 16px;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;margin-top:8px;}
  .nfax{color:var(--faint,#6b7684);font-size:13px;margin-top:18px;}
</style>`;

const has = t => TARGET.includes(t);
function page(e){
  const b = bmap[e.bucket], iss = issuer(e.name);
  const related = ETFS.filter(x=>x.bucket===e.bucket && x.t!==e.t && x.risk!=="closed").slice(0,5);
  const relLinks = related.map(x => has(x.t)
      ? `<a href="/etfs/${x.t.toLowerCase()}">${x.t}</a>`
      : `<a href="/etfs#${e.bucket}">${x.t}</a>`).join("");
  const title = `${e.t} ETF — ${e.name}: holdings, fee & AI exposure`;
  const desc = `${e.t} (${e.name}): ${b.name.toLowerCase()} AI ETF. Expense ratio ${e.er||"n/a"}, AUM ${e.aum||"n/a"}, ${e.holds||"—"} holdings (${e.inside||"—"}). What it is, its AI relevance and the risks — delayed data, not advice.`.slice(0,300);
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)} | Santro AI</title>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"/>
<link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48.png"/>
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png"/>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="https://santroai.tech/etfs/${e.t.toLowerCase()}"/>
<meta property="og:type" content="website"/><meta property="og:site_name" content="Santro AI"/>
<meta property="og:title" content="${esc(e.t+" — "+e.name)}"/>
<meta property="og:description" content="${esc(b.name+" AI ETF · fee "+(e.er||"n/a")+" · AUM "+(e.aum||"n/a"))}"/>
<meta property="og:url" content="https://santroai.tech/etfs/${e.t.toLowerCase()}"/>
<meta property="og:image" content="https://santroai.tech/assets/og-map.png"/>
<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="https://santroai.tech/assets/og-map.png"/>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
 {"@type":"ListItem","position":1,"name":"Home","item":"https://santroai.tech/"},
 {"@type":"ListItem","position":2,"name":"AI ETFs","item":"https://santroai.tech/etfs"},
 {"@type":"ListItem","position":3,"name":"${esc(e.t)}","item":"https://santroai.tech/etfs/${e.t.toLowerCase()}"}]}
</script>
<link rel="stylesheet" href="/site.css?v=13"/>
${CSS}
</head><body>
${HEADER}
  <main class="etfp">
    <nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/etfs">AI ETFs</a> › ${esc(e.t)}</nav>
    <h1>${esc(e.t)} — ${esc(e.name)}${e.risk?`<span class="rbx">${esc(e.risk)}</span>`:""}</h1>
    <p class="sub">${esc(b.name)} · ${esc(b.blurb)}</p>

    <p>${esc(e.note || (e.t+" is a "+b.name.toLowerCase()+" ETF from "+iss+"."))} ${AIREL[e.bucket]||""}</p>

    <h2>Key facts</h2>
    <table class="kv">
      <tr><td>Ticker</td><td><b>${esc(e.t)}</b></td></tr>
      <tr><td>Fund</td><td>${esc(e.name)}</td></tr>
      <tr><td>Issuer</td><td>${esc(iss)}</td></tr>
      <tr><td>Theme</td><td>${esc(b.name)}</td></tr>
      <tr><td>Expense ratio</td><td>${esc(e.er||"—")}</td></tr>
      <tr><td>AUM</td><td>${esc(e.aum||"—")}</td></tr>
      <tr><td>Holdings</td><td>${esc(e.holds||"—")}</td></tr>
      <tr><td>What's inside</td><td>${esc(e.inside||"—")}</td></tr>
    </table>
    <p class="nfax">AUM and expense ratio are point-in-time (curated June 2026) and move with the fund — the issuer's own page is the source of record.</p>

    <h2>What's inside &amp; AI relevance</h2>
    <p>${esc(e.inside?("Top exposure: "+e.inside+". "):"")}${AIREL[e.bucket]||""}</p>

    <h2>Chart</h2>
    <div class="tradingview-widget-container"><div id="tv_${esc(e.t)}"></div></div>
    <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js" async>
    {"symbols":[["${esc(e.t)}"]],"chartOnly":false,"width":"100%","height":300,"colorTheme":"dark","isTransparent":true,"autosize":false}
    </script>

    <h2>Related AI ETFs</h2>
    <p class="relx">${relLinks || `<a href="/etfs">Back to the AI ETF list</a>`}</p>
    <p>See all funds, sorted into 8 buckets, on the <a href="/etfs">AI ETF universe</a> page, or gauge the wider market with the <a href="/bubble">AI bubble-risk index</a>.</p>

    <div class="ctaE">
      <b>Track AI ETFs &amp; run fair-value on their top holdings.</b>
      <p>Create a free Santro AI account to save a watchlist and run unlimited valuations on the names inside these funds.</p>
      <a href="/?auth=register">Create a free account →</a>
    </div>
    <p class="nfax">Market data is delayed ~15 minutes and provided for education, not as financial advice. ETFs carry risk; read the fund's prospectus.</p>
  </main>
${FOOTER}
<script src="/site.js?v=9"></script>
</body></html>`;
}

if(!fs.existsSync("etfs")) fs.mkdirSync("etfs");
const built = [];
for(const e of ETFS){
  if(!has(e.t)) continue;
  fs.writeFileSync(`etfs/${e.t.toLowerCase()}.html`, page(e));
  built.push(e); console.log(`  wrote etfs/${e.t.toLowerCase()}.html`);
}
// deep-dives section for /etfs
const cards = built.map(e=>`<li><a href="/etfs/${e.t.toLowerCase()}"><b>${e.t}</b> — ${esc(e.name)}</a> <span style="color:var(--faint,#6b7684);font-size:13px">${esc(bmap[e.bucket].name)} · fee ${esc(e.er||"—")}</span></li>`).join("\n        ");
const sec = `<section class="sa-deepdives" style="max-width:920px;margin:24px auto 0;padding:24px 20px 6px;border-top:1px solid var(--border-soft,#1c2230);">
      <h2 style="font-size:20px;margin:0 0 4px;">AI ETF deep dives</h2>
      <p style="color:var(--muted,#9aa6b2);font-size:14.5px;margin:0 0 10px;">Individual breakdowns — holdings, fee, AUM, AI relevance and risk:</p>
      <ul style="margin:0;padding-left:18px;line-height:1.9;">
        ${cards}
      </ul>
    </section>
`;
let etfs = fs.readFileSync("etfs.html","utf8");
if(!etfs.includes("sa-deepdives"))
  etfs = etfs.replace(/(\n[ \t]*<footer)/, "\n    "+sec+"$1");
fs.writeFileSync("etfs.html", etfs);
console.log(`  injected deep-dives section into etfs.html (${built.length} funds)`);
console.log("done");
