/* Santro AI bubble check — shared quiz engine.
   Usage: SantroQuiz.mount({mount, fill, step}) with DOM elements (or ids).
   Fully client-side; result persists in localStorage["santro_quiz"]. */
window.SantroQuiz=(function(){
/* Santro AI bubble check — fully client-side. Answers live in memory; only the
   final profile is kept (localStorage) so the terminal/dashboard can greet it.
   TODO(v2): save profile to the account via a backend endpoint once one exists. */
const Q=[
 {q:"What do you mostly track?",o:[
  ["AI stocks",{IM:1,DT:1}],["AI ETFs",{VS:1,IM:1}],["AI crypto",{NH:2}],
  ["Semiconductors",{IM:2}],["Power & data centers",{IM:2}],["Everything AI",{DT:2}]]},
 {q:"What's your usual time horizon?",o:[
  ["Intraday",{NH:2}],["Swing trades (days–weeks)",{NH:1,DT:1}],["1–3 months",{DT:1,VS:1}],
  ["6–12 months",{VS:1,IM:1}],["Long-term investing",{VS:2}]]},
 {q:"What do you care about most?",o:[
  ["Hot movers",{NH:2}],["Valuation",{VS:2}],["News & catalysts",{NH:1,DT:1}],
  ["Bubble risk",{RW:2}],["Watchlist alerts",{DT:2}],["Research context",{IM:1,VS:1}]]},
 {q:"A ticker is up 30% today. You…",o:[
  ["Chase it",{NH:2,sens:-10}],["Check the catalyst first",{NH:1,DT:1,sens:5}],
  ["Check the valuation",{VS:2,sens:10}],["Wait for a pullback",{VS:1,RW:1,sens:5}],
  ["Compare it to its sector",{IM:2,sens:5}],["Avoid crowded trades",{RW:2,sens:15}]]},
 {q:"What scares you most in the AI trade?",o:[
  ["Missing the move",{NH:2,sens:-10}],["Buying the top",{RW:1,VS:1,sens:10}],
  ["Fake catalysts",{NH:1,RW:1,sens:5}],["Overvaluation",{VS:2,sens:10}],
  ["A liquidity reversal",{RW:2,sens:15}],["Not knowing what matters",{DT:2,sens:0}]]},
 {q:"Which AI narrative feels most important right now?",o:[
  ["Compute & GPUs",{IM:2}],["Power & energy",{IM:2}],["Data centers",{IM:2}],
  ["AI software",{VS:1,DT:1}],["AI crypto",{NH:2}],["Robotics",{IM:1,NH:1}],["Cybersecurity",{DT:1,VS:1}]]},
 {q:"How much structure do you want?",o:[
  ["Just show me hot tickers",{NH:2}],["Give me risk context",{RW:2}],
  ["Calculator + saved valuations",{VS:2}],["Alerts on my names",{DT:2}],["The full terminal",{DT:2,IM:1}]]},
 {q:"Want iPhone alerts when the iOS app lands?",o:[
  ["Yes — count me in",{ios:1}],["Maybe later",{}],["No thanks",{}]]}
];
const PROFILES={
 NH:{name:"Narrative Hunter",color:"#e0a73f",
  desc:"You follow attention before the story becomes consensus. Your edge is speed — your risk is chasing a move after the crowd already owns it. Santro's job for you: show the move AND whether it's already crowded.",
  tools:[["Hot tickers","/"],["AI crypto movers","/crypto"],["Share cards","/share"],["Research notes","/research"]],
  first:"Open the terminal and read today's hot list — then check each mover's catalyst before anything else."},
 VS:{name:"Valuation Skeptic",color:"#22c55e",
  desc:"You want to know whether the story is already priced in. Narratives don't move you — the gap between price and assumptions does. Santro's reverse-DCF shows you what growth the price already bakes in.",
  tools:[["Fair-value calculator","/t?sym=NVDA"],["Saved valuations","/dashboard"],["Bubble risk","/bubble"],["AI ETF comparison","/etfs"]],
  first:"Pick any ticker and run the calculator — start from the market-implied growth, not a guess."},
 IM:{name:"Infrastructure Mapper",color:"#5b9df0",
  desc:"You think the AI trade moves through compute, power, data centers and second-order beneficiaries — not just the famous names. Sub-theme structure is your map.",
  tools:[["AI stocks by sub-theme","/stocks"],["AI ETFs","/etfs"],["Research","/research"],["Ticker deep dives","/stocks/nvda"]],
  first:"Open the AI stocks map and walk the sectors: Chips → Equipment → DC Power → Applied AI."},
 RW:{name:"Risk Watcher",color:"#f0596e",
  desc:"You don't just want upside — you want to know when the trade gets crowded. You read froth the way others read momentum. The bubble-risk gauge and the short-watch pages were built for you.",
  tools:[["AI bubble-risk index","/bubble"],["Burry short watch","/stocks/burry-short-watch"],["Aschenbrenner basket","/stocks/aschenbrenner"],["Price alerts","/dashboard"]],
  first:"Check today's bubble-risk score and its top driver — then set an alert on the name you're most worried about."},
 DT:{name:"Daily Terminal User",color:"#7cb0f5",
  desc:"You want one screen to check the AI market every day — what moved, why, and whether it matters. Consistency beats intensity; your loop is the product.",
  tools:[["The terminal","/"],["Watchlist + alerts","/dashboard"],["AI trade in 60 seconds","/"],["iOS app (coming soon)","#ios"]],
  first:"Open the terminal, read 'AI trade in 60 seconds', and pin your first watchlist ticker."}
};
let step=0, score={NH:0,VS:0,IM:0,RW:0,DT:0}, sens=50, ios=false;
let mount,fill,stepEl;
function renderQ(){
  const item=Q[step];
  fill.style.width=Math.round(step/Q.length*100)+"%";
  stepEl.textContent=`Question ${step+1} of ${Q.length}`;
  const opts=item.o.map((o,i)=>`<button class="qopt" data-i="${i}">${o[0]}</button>`).join("");
  mount.innerHTML=`<div class="qcard"><h2>${item.q}</h2>${opts}
    ${step>0?'<button class="qback" id="qback">← Back</button>':""}</div>`;
  mount.querySelectorAll(".qopt").forEach(b=>b.onclick=()=>answer(+b.dataset.i));
  const back=mount.querySelector("#qback"); if(back) back.onclick=()=>{ step--; undo[step]&&undo[step](); renderQ(); };
}
const undo=[];
function answer(i){
  const w=Q[step].o[i][1];
  const before={score:{...score},sens,ios};
  undo[step]=()=>{ score=before.score; sens=before.sens; ios=before.ios; };
  for(const k in w){ if(k==="sens") sens+=w[k]; else if(k==="ios") ios=true; else score[k]+=w[k]; }
  step++;
  if(step<Q.length) renderQ(); else renderResult();
}
function renderResult(){
  fill.style.width="100%"; stepEl.textContent="Your Santro market profile";
  sens=Math.max(5,Math.min(95,sens));
  const order=["RW","VS","IM","DT","NH"];               // tie-break: risk-aware first (honest default)
  const top=Object.keys(score).sort((a,b)=>score[b]-score[a]||order.indexOf(a)-order.indexOf(b))[0];
  const p=PROFILES[top];
  try{ localStorage.setItem("santro_quiz", JSON.stringify({profile:top,name:p.name,sens,ios,at:new Date().toISOString()})); }catch(e){}
  const senCol=sens>=66?"#f0596e":sens>=40?"#e0a73f":"#22c55e";
  const senLbl=sens>=66?"high — you watch for crowding":sens>=40?"balanced":"low — you lean into momentum";
  mount.innerHTML=`<div class="rcard">
    <span class="tag">Santro market profile</span>
    <div class="pname" style="color:${p.color}">${p.name}</div>
    <p class="pdesc">${p.desc}</p>
    <div class="rmeter"><span class="k"><span>Bubble-risk sensitivity</span><span style="color:${senCol}">${sens}/100 · ${senLbl}</span></span>
      <div class="bar"><i style="width:${sens}%;background:${senCol}"></i></div></div>
    <div class="rtools">${p.tools.map(t=>`<a href="${t[1]}">${t[0]}</a>`).join("")}</div>
    <p class="rfirst"><b>First move:</b> ${p.first}</p>
    <div class="rcta">
      <a class="primary" href="/signup">Create a free account</a>
      <a class="ghost" href="/">Open the terminal</a>
    </div>
    <p class="rfirst" style="font-size:12px;color:var(--faint)">A free account saves your watchlist, alerts,
    valuation history and terminal preferences — so your profile becomes a daily loop, not a one-off.</p>
    <div class="rios" id="ios">${ios?"<b>iOS alerts: noted.</b> The iPhone app is coming soon — ":"<b>iOS app coming soon.</b> "}Mobile alerts,
    watchlists, valuation history and a daily AI bubble brief are being prepared for iPhone. Until then you can
    add Santro to your Home Screen from the browser share menu.</div>
    <div class="rbrand"><span>santroai.tech · hot means attention, not direction</span>
      <button class="rshare" id="rshare">Share result ↗</button></div>
  </div>
  <p style="margin-top:10px"><button class="retake" id="retake">Retake the check</button></p>`;
  document.getElementById("retake").onclick=()=>{ step=0; score={NH:0,VS:0,IM:0,RW:0,DT:0}; sens=50; ios=false; renderQ(); };
  document.getElementById("rshare").onclick=async()=>{
    const txt=`My Santro AI market profile: ${p.name} (bubble-risk sensitivity ${sens}/100). Take the 60-second AI bubble check:`;
    const url="https://santroai.tech/quiz";
    if(navigator.share){ try{ await navigator.share({title:"Santro AI bubble check",text:txt,url}); return;}catch(e){} }
    try{ await navigator.clipboard.writeText(txt+" "+url);
      const b=document.getElementById("rshare"); b.textContent="Copied ✓"; setTimeout(()=>b.textContent="Share result ↗",1600); }catch(e){}
  };
}
function mountQuiz(opts){
  opts=opts||{};
  mount=typeof opts.mount==="string"?document.getElementById(opts.mount):(opts.mount||document.getElementById("qmount"));
  fill=typeof opts.fill==="string"?document.getElementById(opts.fill):(opts.fill||document.getElementById("qfill"));
  stepEl=typeof opts.step==="string"?document.getElementById(opts.step):(opts.step||document.getElementById("qstep"));
  step=0; score={NH:0,VS:0,IM:0,RW:0,DT:0}; sens=50; ios=false;
  renderQ();
}
return {mount:mountQuiz};
})();
