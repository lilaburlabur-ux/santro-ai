# BEFORE-STATE FREEZE — frontend debug pass
frozen: now · measured against LIVE https://santroai.tech (local fixes NOT deployed)

1. exact sitemap URLs tested: **175** (theme) / **175** (width) / **175 × 2 viewports = 350 loads** (mobile)
2. theme toggle failures BEFORE: **175** — breakdown: {'VISUAL unchanged': 175}
3. width/shell findings BEFORE: squeezed-inner (main>1300, content<72%): **1** · wrongly-narrow terminal mains: **155** · load errors: 0
   top squeezed inner blocks: [('DIV.lh-copy', 1)]
4. mobile overflow failures BEFORE (390+375 full crawl): **0**
5. artifacts: qa/frontend-debug/theme-toggle-audit.{md,json}, width-shell-audit.json, mobile-audit-before.json, screenshots in qa/audit + qa/screenshots (127 files, prior pass)
