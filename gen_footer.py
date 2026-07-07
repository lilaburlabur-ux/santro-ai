#!/usr/bin/env python3
"""Santro AI — footer generator (single source of truth for the mega footer).
Run after adding a route or editing footer links:  python3 gen_footer.py
Replaces every existing <footer>…</footer> with the shared self-contained mega
footer; inserts it before </body> on pages that had none. index.html keeps its
brand-disambiguation line in the bottom row.
Idempotent: marker comment <!-- mega-footer v1 --> is itself a <footer> block,
so re-running just re-replaces it.
"""
import glob, re, sys

CSS = """
footer.mega{display:block;text-align:left;margin-top:48px;padding:0;border-top:1px solid var(--border,#1d2733);background:transparent;font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
.mega .mg-in{max-width:1180px;margin:0 auto;padding:34px 22px 26px;}
.mega .mg-top{display:flex;justify-content:space-between;align-items:flex-start;gap:28px;flex-wrap:wrap;padding-bottom:26px;border-bottom:1px solid var(--border-soft,#161e28);}
.mega .mg-logo{font-size:17px;font-weight:800;letter-spacing:.4px;color:var(--text,#e7edf3);}
.mega .mg-logo span{color:var(--accent,#5b9df0);}
.mega .mg-tag{font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--faint,#5a6573);margin-top:2px;}
.mega .mg-line{margin:10px 0 0;max-width:420px;font-size:13px;line-height:1.55;color:var(--muted,#8895a4);font-weight:400;}
.mega .mg-slogan{margin:8px 0 0;font-size:12.5px;font-style:italic;color:var(--faint,#5a6573);font-weight:400;}
.mega .mg-brief{max-width:360px;}
.mega .mg-btitle{font-size:14px;font-weight:700;color:var(--text,#e7edf3);}
.mega .mg-bsub{margin:6px 0 12px;font-size:12.5px;line-height:1.5;color:var(--muted,#8895a4);font-weight:400;}
.mega .mg-brow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.mega a.mg-cta{display:inline-block;padding:8px 16px;border-radius:9px;background:var(--accent-soft,#12233a);border:1px solid var(--accent-border,#22436a);color:var(--accent-2,#7cb0f5);font-size:13px;font-weight:700;text-decoration:none;}
.mega a.mg-cta:hover{background:var(--accent-border,#22436a);color:var(--text,#e7edf3);}
.mega .mg-soon{font-size:11.5px;font-weight:600;color:var(--faint,#5a6573);border:1px dashed var(--border,#1d2733);border-radius:999px;padding:5px 10px;white-space:nowrap;}
.mega .mg-priv{margin:10px 0 0;font-size:11px;line-height:1.5;color:var(--faint,#5a6573);font-weight:400;}
.mega .mg-priv a{color:var(--muted,#8895a4);font-weight:600;text-decoration:none;}
.mega .mg-priv a:hover{color:var(--text,#e7edf3);}
.mega .mg-cols{display:grid;grid-template-columns:repeat(5,1fr);gap:22px;padding:26px 0;border-bottom:1px solid var(--border-soft,#161e28);}
.mega .mg-col h4{margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--faint,#5a6573);}
.mega .mg-col ul{list-style:none;margin:0;padding:0;}
.mega .mg-col li{margin:0;}
.mega .mg-col a{display:inline-block;padding:4px 0;font-size:13px;font-weight:500;color:var(--muted,#8895a4);text-decoration:none;}
.mega .mg-col a:hover{color:var(--text,#e7edf3);}
.mega .mg-col .mg-off{display:inline-block;padding:4px 0;font-size:13px;color:var(--faint,#5a6573);}
.mega .mg-bottom{display:flex;justify-content:space-between;align-items:center;gap:8px 24px;flex-wrap:wrap;padding-top:18px;font-size:11.5px;color:var(--faint,#5a6573);}
.mega .mg-bottom .mg-nfa{color:var(--muted,#8895a4);font-weight:700;font-style:normal;}
.mega .mg-bottom a{color:var(--muted,#8895a4);font-weight:600;text-decoration:none;padding:2px 0;}
.mega .mg-bottom a:hover{color:var(--text,#e7edf3);}
.mega .mg-note{flex-basis:100%;font-size:10.5px;color:var(--faint,#5a6573);opacity:.75;}
.mega a:focus-visible{outline:2px solid var(--accent,#5b9df0);outline-offset:2px;border-radius:4px;}
@media(max-width:900px){
  .mega .mg-in{padding:28px 16px 22px;}
  .mega .mg-top{flex-direction:column;gap:20px;padding-bottom:22px;}
  .mega .mg-cols{grid-template-columns:repeat(2,1fr);gap:18px 14px;padding:22px 0;}
  .mega .mg-col a{padding:6px 0;}
  .mega .mg-bottom{flex-direction:column;align-items:flex-start;gap:8px;}
}
@media(max-width:640px){
  .mega .mg-cols{grid-template-columns:1fr;gap:0;padding:6px 0;}
  .mega .mg-col{border-bottom:1px solid var(--border-soft,#161e28);}
  .mega .mg-col:last-child{border-bottom:0;}
  .mega .mg-col h4{margin:0;padding:14px 2px;display:flex;justify-content:space-between;align-items:center;}
  .mega .mg-col ul{padding:0 2px 12px;}
  .mega.mg-acc .mg-col h4{cursor:pointer;}
  .mega.mg-acc .mg-col h4::after{content:"+";font-size:15px;line-height:1;color:var(--faint,#5a6573);font-weight:600;}
  .mega.mg-acc .mg-col.open h4::after{content:"\\2212";}
  .mega.mg-acc .mg-col:not(.open) ul{display:none;}
}
""".strip()

FOOTER = """<!-- mega-footer v1 -->
<footer class="mega">
<style>
""" + CSS + """
</style>
<div class="mg-in">
  <div class="mg-top">
    <div class="mg-brand">
      <div class="mg-logo">Santro <span>AI</span></div>
      <div class="mg-tag">The AI Bubble Terminal</div>
      <p class="mg-line">The AI bubble terminal for stocks, ETFs, crypto, hot tickers, valuation tools, and bubble-risk signals.</p>
      <p class="mg-slogan">Hot means attention, not direction.</p>
    </div>
    <div class="mg-brief">
      <div class="mg-btitle">Get the AI market brief</div>
      <p class="mg-bsub">Hot tickers, bubble-risk changes, valuation notes, and AI market research.</p>
      <div class="mg-brow">
        <a class="mg-cta" href="/signup">Create a free account</a>
        <span class="mg-soon">Email brief — coming soon</span>
      </div>
      <p class="mg-priv">The brief will be opt-in when it launches, and you can unsubscribe anytime. <a href="/privacy">Privacy</a></p>
    </div>
  </div>
  <div class="mg-cols">
    <div class="mg-col">
      <h4>Terminal</h4>
      <ul>
        <li><a href="/terminal">AI Terminal</a></li>
        <li><a href="/stocks">AI Stocks</a></li>
        <li><a href="/crypto">AI Crypto</a></li>
        <li><a href="/etfs">AI ETFs</a></li>
        <li><a href="/bubble">AI Bubble Risk</a></li>
        <li><a href="/news">Market News</a></li>
      </ul>
    </div>
    <div class="mg-col">
      <h4>Tools</h4>
      <ul>
        <li><a href="/bubble#stress">Portfolio Stress Test</a></li>
        <li><a href="/quiz">60-Second Bubble Check</a></li>
        <li><a href="/share">Share Cards</a></li>
        <li><a href="/evaluate-prompt">Prompt Quality Check</a></li>
        <li><a href="/signup">Watchlists &amp; Alerts — free account</a></li>
      </ul>
    </div>
    <div class="mg-col">
      <h4>Research</h4>
      <ul>
        <li><a href="/research">Research Feed</a></li>
        <li><a href="/blog">Blog</a></li>
        <li><a href="/blog/ai-bubble-vs-dotcom">AI Bubble vs Dot-com</a></li>
        <li><a href="/ipos">IPO Watch</a></li>
        <li><a href="/stocks/aschenbrenner">Aschenbrenner Basket</a></li>
        <li><a href="/stocks/burry-short-watch">Burry Short Watch</a></li>
      </ul>
    </div>
    <div class="mg-col">
      <h4>AI Themes</h4>
      <ul>
        <li><a href="/stocks/themes/ai-chips-and-compute">AI Chips &amp; Compute</a></li>
        <li><a href="/stocks/themes/ai-software-and-cloud-infrastructure">AI Software &amp; Cloud</a></li>
        <li><a href="/stocks/themes/data-center-power-and-energy">Data-Center Power &amp; Energy</a></li>
        <li><a href="/stocks/themes/chip-equipment-and-ai-hardware">Chip Equipment &amp; AI Hardware</a></li>
        <li><a href="/stocks/themes/ai-platforms-internet-and-adtech">AI Platforms &amp; Adtech</a></li>
        <li><a href="/stocks/themes/ai-applications-and-data-software">AI Apps &amp; Data Software</a></li>
      </ul>
    </div>
    <div class="mg-col">
      <h4>Company</h4>
      <ul>
        <li><a href="/about">About Santro AI</a></li>
        <li><a href="mailto:hello@santroai.tech">Contact</a></li>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/terms">Terms of Use</a></li>
        <li><a href="https://x.com/SantroAI" target="_blank" rel="noopener">@SantroAI on X</a></li>
        <li><span class="mg-off">iOS app — coming soon</span></li>
      </ul>
    </div>
  </div>
  <div class="mg-bottom">
    <span>© 2026 Santro AI. All rights reserved. Uses custom models.</span>
    <span>Quotes delayed ~15 min. Real-time data planned for Pro. <b class="mg-nfa">Not financial advice.</b></span>
    <span><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="mailto:hello@santroai.tech">Contact</a></span>
    <!--MG_EXTRA-->
  </div>
</div>
<script>(function(){var mq=window.matchMedia("(max-width:640px)");var mega=document.querySelector("footer.mega");if(!mega)return;
function arm(){if(!mq.matches||mega.classList.contains("mg-acc"))return;mega.classList.add("mg-acc");
mega.querySelectorAll(".mg-col h4").forEach(function(h){h.setAttribute("role","button");h.setAttribute("tabindex","0");h.setAttribute("aria-expanded","false");
function t(){if(!mq.matches)return;var c=h.parentElement;c.classList.toggle("open");h.setAttribute("aria-expanded",String(c.classList.contains("open")));}
h.addEventListener("click",t);h.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();t();}});});}
arm();mq.addEventListener?mq.addEventListener("change",arm):mq.addListener(arm);})();</script>
</footer>"""

INDEX_EXTRA = ('<span class="mg-note">Santro AI is available at santroai.tech. '
               'Santro AI is an AI market research terminal and is not affiliated with '
               'Hyundai Santro, Santara Tech, or santro-tech.com.</span>')

FOOT_RE = re.compile(r"<footer[^>]*>.*?</footer>", re.S)

files = sorted(set(glob.glob("*.html") + glob.glob("*/*.html") + glob.glob("*/*/*.html")))
replaced = inserted = skipped = 0
for f in files:
    s = open(f, encoding="utf-8").read()
    foot = FOOTER
    if f == "index.html":
        foot = foot.replace("<!--MG_EXTRA-->", INDEX_EXTRA)
    if FOOT_RE.search(s):
        n = len(FOOT_RE.findall(s))
        assert n == 1, f"{f}: {n} footer blocks"
        s2 = FOOT_RE.sub(lambda m: foot, s, count=1)
        replaced += 1
    elif "</body>" in s:
        s2 = s.replace("</body>", foot + "\n</body>", 1)
        inserted += 1
    else:
        print("SKIP (no footer, no </body>):", f); skipped += 1; continue
    open(f, "w", encoding="utf-8").write(s2)

print(f"replaced={replaced} inserted={inserted} skipped={skipped} total={len(files)}")

# ---- validate every footer href resolves to a real file/route ----
import os
hrefs = sorted(set(re.findall(r'href="([^"]+)"', FOOTER)))
bad = []
for h in hrefs:
    if h.startswith(("mailto:", "https://")):
        continue
    path = h.split("#")[0].lstrip("/")
    target = "index.html" if path == "" else path + ".html"
    if not os.path.exists(target):
        bad.append(h)
print("footer hrefs:", len(hrefs), "| broken:", bad if bad else "none")
assert not bad
# anchor check
assert 'id="stress"' in open("bubble.html").read(), "#stress anchor missing"
print("OK: all footer routes valid, #stress anchor present")
