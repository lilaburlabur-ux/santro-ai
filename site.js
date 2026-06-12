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
    const ms=document.getElementById("about-mascot");
    if(ms) ms.src = mode==="light" ? "assets/santro-mascot-day.png" : "assets/santro-mascot-night.png";
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
