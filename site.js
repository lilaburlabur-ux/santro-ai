// Santro AI — shared header controls for section pages:
// day/night pill, "as of" timestamp, reload. (The dashboard has its own copies.)
(function(){
  const cur = () => document.documentElement.dataset.theme==="light" ? "light" : "dark";

  function apply(mode, save){
    document.documentElement.dataset.theme = mode;
    const lbl=document.getElementById("tt-label");
    if(lbl) lbl.textContent = mode==="dark" ? "NIGHTMODE" : "DAYMODE";
    const btn=document.getElementById("theme-toggle");
    if(btn) btn.classList.toggle("day", mode==="light");
    if(save) try{ localStorage.setItem("santro-theme", mode); }catch(e){}
  }

  const hdr=document.querySelector(".pageheader");
  if(hdr && !document.getElementById("theme-toggle")){
    const right=document.createElement("div");
    right.className="pageright";
    right.innerHTML=
      '<span class="asof" id="page-asof"></span>'+
      '<button id="theme-toggle" title="Switch day / night mode" aria-label="Toggle day or night mode">'+
        '<span class="tt-label" id="tt-label">NIGHTMODE</span>'+
        '<span class="tt-knob">'+
          '<svg class="ic-moon" viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">'+
            '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>'+
            '<path d="M17.6 4.6l.45 1.3 1.3.45-1.3.45-.45 1.3-.45-1.3-1.3-.45 1.3-.45.45-1.3Z"/></svg>'+
          '<svg class="ic-sun" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'+
            '<circle cx="12" cy="12" r="4.1"/>'+
            '<path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1M5.2 5.2l1.5 1.5M17.3 17.3l1.5 1.5M18.8 5.2l-1.5 1.5M6.7 17.3l-1.5 1.5"/></svg>'+
        '</span>'+
      '</button>'+
      '<button id="reload-btn" title="Reload the page">↻ Reload</button>';
    hdr.appendChild(right);
    document.getElementById("theme-toggle").addEventListener("click",
      ()=>apply(cur()==="dark" ? "light" : "dark", true));
    document.getElementById("reload-btn").addEventListener("click", ()=>location.reload());
  }

  apply(cur(), false);

  fetch("data.json?t="+Date.now()).then(r=>r.json()).then(d=>{
    const el=document.getElementById("page-asof");
    if(el && d.as_of_local) el.textContent="As of "+d.as_of_local;
  }).catch(()=>{});
})();

// ---- ticker search: compact header pill + dropdown -> t?sym=X ----------
// Mounts into .pageheader .pageright (section pages) or #topbar-search (terminal).
// Index = universe + ecosystem, lazy-loaded on first focus. "/" focuses anywhere.
(function(){
  const right = document.querySelector(".pageheader .pageright");
  const mount = right || document.getElementById("topbar-search");
  if(!mount) return;
  const wrap = document.createElement("div");
  wrap.className = "tsearch";
  wrap.innerHTML =
    '<div class="box">'+
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">'+
        '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'+
      '<input placeholder="Search" autocomplete="off" spellcheck="false" aria-label="Search tickers" />'+
      '<span class="kbd">/</span></div>'+
    '<div class="drop" style="display:none"></div>';
  if(right) right.insertBefore(wrap, right.firstChild); else mount.appendChild(wrap);

  const input = wrap.querySelector("input"), drop = wrap.querySelector(".drop"),
        kbd = wrap.querySelector(".kbd");
  let idx = null, sel = 0, rows = [];
  const logoUrl = s => s === "SPCX" ? "assets/spacex.png"
    : "https://assets.parqet.com/logos/symbol/" + encodeURIComponent(s.split(".")[0]) + "?format=png&size=64";
  const fmtPct = x => (x >= 0 ? "+" : "") + Number(x).toFixed(2) + "%";

  let idxPromise = null;
  function loadIndex(){
    // promise singleton: concurrent callers all await the same fetch, and the
    // index is only assigned once it is COMPLETE (an in-flight empty array
    // must never be mistaken for a loaded one)
    if(!idxPromise) idxPromise = (async () => {
      const list = [], seen = {};
      const add = (t) => { if(!seen[t.ticker]){ seen[t.ticker] = 1;
        list.push({tk: t.ticker, nm: t.company || t.ticker, pc: t.change_pct || 0,
                   mc: t.market_cap_b || 0}); } };
      try{
        window.__santroUniP = window.__santroUniP || fetch("universe.json?t=" + Date.now()).then(r => r.json());
        const u = await window.__santroUniP;
        u.bubbles.forEach(b => b.tickers.forEach(add));
      }catch(e){}
      try{
        const e2 = await (await fetch("ecosystem.json?t=" + Date.now())).json();
        e2.tickers.forEach(add);
      }catch(e){}
      idx = list;
      return list;
    })();
    return idxPromise;
  }
  function score(t, q){
    const tk = t.tk.toLowerCase(), nm = t.nm.toLowerCase();
    if(tk === q) return 0; if(tk.startsWith(q)) return 1;
    if(nm.startsWith(q)) return 2; if(tk.includes(q)) return 3;
    if(nm.includes(q)) return 4; return 9;
  }
  function render(){
    const q = input.value.trim().toLowerCase();
    if(!q || !idx){ drop.style.display = "none"; rows = []; return; }
    rows = idx.map(t => [score(t, q), t]).filter(x => x[0] < 9)
      .sort((a, b) => a[0] - b[0] || b[1].mc - a[1].mc)
      .slice(0, 8).map(x => x[1]);
    if(!rows.length){ drop.style.display = "none"; return; }
    sel = Math.min(sel, rows.length - 1);
    drop.innerHTML = rows.map((t, i) =>
      '<div class="sg' + (i === sel ? " active" : "") + '" data-tk="' + t.tk + '">' +
      '<img src="' + logoUrl(t.tk) + '" onerror="this.style.visibility=\'hidden\'" alt="">' +
      '<span class="tk">' + t.tk + '</span><span class="nm">' + t.nm + '</span>' +
      '<span class="pc ' + (t.pc >= 0 ? "up" : "down") + '">' + fmtPct(t.pc) + '</span></div>').join("");
    drop.style.display = "";
    drop.querySelectorAll(".sg").forEach(el =>
      el.addEventListener("mousedown", e => { e.preventDefault(); go(el.dataset.tk); }));
  }
  const go = tk => { location.href = "t?sym=" + encodeURIComponent(tk); };
  input.addEventListener("focus", async () => { kbd.textContent = "esc"; await loadIndex(); render(); });
  input.addEventListener("blur", () => { kbd.textContent = "/"; setTimeout(() => drop.style.display = "none", 150); });
  input.addEventListener("input", async () => { sel = 0; await loadIndex(); render(); });
  input.addEventListener("keydown", e => {
    if(e.key === "ArrowDown"){ sel = Math.min(sel + 1, rows.length - 1); render(); e.preventDefault(); }
    else if(e.key === "ArrowUp"){ sel = Math.max(sel - 1, 0); render(); e.preventDefault(); }
    else if(e.key === "Enter"){ if(rows[sel]) go(rows[sel].tk); }
    else if(e.key === "Escape"){ input.value = ""; drop.style.display = "none"; input.blur(); }
  });
  document.addEventListener("keydown", e => {
    if(e.key === "/" && document.activeElement !== input &&
       !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")){
      e.preventDefault(); input.focus();
    }
  });
})();

// ── PWA: conservative service worker (static assets only; data stays live) ──
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
}
