/* Santro — shared bubble engine. v1
   EXTRACTED VERBATIM from terminal.html (the /terminal hero map is the visual
   and behavioral source of truth). This file is a mechanical slice, not a
   rewrite: heat ramp, dark cores, logo handling, width-aware label fit,
   spiral packing, and the 50ms floating-bubble physics ("alive" drift with
   wall bounce + collision resolve) are the terminal's own code.
   Consumers: terminal.html (via aliases) and components/sector-bubble-map.js.
   Keep changes here ONLY — never re-fork the renderer. */
(function () {
"use strict";
const MONO="'IBM Plex Mono', ui-monospace, monospace";
const fmtPct = x => (x>=0?"+":"") + x.toFixed(2) + "%";
const HEAT_STOPS=[
  [-10,[112,15,25]], [-6,[185,28,28]], [-3,[239,68,68]], [-1,[247,123,123]],
  [0,[38,42,46]],
  [1,[105,205,145]], [3,[34,197,94]], [6,[21,128,61]], [10,[10,82,45]],
];
function colorFor(pct){
  const x=Math.max(-10, Math.min(10, pct||0));
  for(let i=0;i<HEAT_STOPS.length-1;i++){
    const [a,ca]=HEAT_STOPS[i], [b,cb]=HEAT_STOPS[i+1];
    if(x>=a && x<=b){
      const t=(x-a)/((b-a)||1);
      return `rgb(${ca.map((v,k)=>Math.round(v+(cb[k]-v)*t)).join(",")})`;
    }
  }
  return "rgb(38,42,46)";
}
const logoUrl = sym => sym==="SPCX" ? "/assets/spacex.png"
  : `https://assets.parqet.com/logos/symbol/${encodeURIComponent(sym.split(".")[0])}?format=png&size=64`;
function heatDark(pct){            // dark bubble core, tinted toward the heat color
  const m=colorFor(pct).match(/\d+/g).map(Number);
  return `rgb(${m.map(v=>Math.round(v*0.30+8)).join(",")})`;
}
const heatText = pct => (pct>=0 ? "#8df0b4" : "#ff9aa2");
function fitFs(len, r, cap){
  return Math.max(7, Math.min(cap, Math.floor((r*1.62)/(0.62*Math.max(len,3)))));
}
function packBubbles(items, key, W, H){
  const maxV = Math.max(...items.map(x=>x[key]));
  const maxR = Math.min(W,H)*0.22;
  const minR = Math.max(22, Math.min(W,H)*0.06);
  const nodes = items.map(x=>({it:x, r:Math.max(minR, maxR*Math.sqrt(x[key]/maxV))}))
                     .sort((a,b)=>b.r-a.r);
  const placed=[];
  for(const n of nodes){
    if(!placed.length){ n.x=0; n.y=0; placed.push(n); continue; }
    for(let t=0.1;; t+=0.07){
      const x=2.1*t*Math.cos(t), y=2.1*t*Math.sin(t)*0.8;
      const free=placed.every(p=>{const dx=p.x-x, dy=p.y-y;
        return dx*dx+dy*dy >= (p.r+n.r+4)*(p.r+n.r+4);});
      if(free || t>2500){ n.x=x; n.y=y; break; }
    }
    placed.push(n);
  }
  // scale + center the cluster to fill the panel
  const minX=Math.min(...placed.map(p=>p.x-p.r)), maxX=Math.max(...placed.map(p=>p.x+p.r));
  const minY=Math.min(...placed.map(p=>p.y-p.r)), maxY=Math.max(...placed.map(p=>p.y+p.r));
  const pad=10, s=Math.min((W-2*pad)/(maxX-minX), (H-2*pad)/(maxY-minY), 1.2);
  const ox=(W-(maxX-minX)*s)/2 - minX*s, oy=(H-(maxY-minY)*s)/2 - minY*s;
  placed.forEach(p=>{ p.x=p.x*s+ox; p.y=p.y*s+oy; p.r*=s; });
  return placed;
}

function tickerItem(n, selectedSymbol){
  const x=n.obj, sym=x.ticker;   // post-sector path is always a universe/eco ticker
  const pct=x.change_pct||0, heat=colorFor(pct);
  const txt=sym;
  // font fits BOTH the radius and the text's width across the circle
  const fs=Math.min(Math.max(9, Math.round(n.r*0.30)), fitFs(txt.length, n.r, 22));
  const pcFs=Math.max(8, Math.round(fs*0.82));
  const showLabel = n.r>=13 && fs>=9;
  // the percent line renders only when it FITS the circle chord at its offset —
  // canvas text is not clipped, so an unchecked line spills onto neighbours
  const pcTxt=fmtPct(pct);
  const showPct = showLabel && n.r>=17 &&
    pcTxt.length*0.62*pcFs <= 2*Math.sqrt(Math.max(0, n.r*n.r - Math.pow(fs*0.7+pcFs*0.65, 2))) - 6;
  const ls=Math.round(n.r*0.5);
  const showLogo = n.r>30 && !sym.includes(".")
    && (ls + fs*1.35 + pcFs*1.2) < n.r*1.7;   // whole stack must fit vertically
  const sel=sym===selectedSymbol;
  const rich={
    tk:{color:"#fff",fontWeight:700,fontSize:fs,lineHeight:Math.round(fs*1.35),align:"center",fontFamily:MONO},
    pc:{color:heatText(pct),fontWeight:600,fontSize:pcFs,lineHeight:Math.round(pcFs*1.3),align:"center",fontFamily:MONO}};
  let fmt="";
  if(showLogo){
    rich.lg={backgroundColor:{image:logoUrl(sym)},width:ls,height:ls,borderRadius:ls/2,align:"center"};
    fmt+="{lg|}\n";
  }
  fmt+=showPct ? `{tk|${txt}}\n{pc|${pcTxt}}` : `{tk|${txt}}`;
  return {value:[n.x,n.y], symbolSize:n.r*2, uniTicker:x,
    itemStyle:{color:heatDark(pct),
      borderColor:sel?"#ffffff":heat,
      borderWidth:sel?3:Math.max(1.5,Math.min(3.5,n.r*0.05)),
      shadowColor:heat, shadowBlur:Math.min(12,Math.max(5,Math.round(n.r*0.16)))},
    label:{show:showLabel, position:"inside", align:"center", verticalAlign:"middle",
      formatter:fmt, rich}};
}

// ---- floating-bubble physics (terminal's startMotion, parameterized) --------
let motionTimer=null;
function motionStop(){ if(motionTimer){ clearInterval(motionTimer); motionTimer=null; } }
function motionStart(chart, getNodes, getBounds, build){

  motionStop();
  motionTimer=setInterval(()=>{
    var simNodes=getNodes(), simBounds=getBounds();
    if(!simNodes || document.hidden) return;
    const {W,H}=simBounds;
    for(const n of simNodes){
      n.x+=n.vx; n.y+=n.vy;
      if(n.x-n.r<2){n.x=n.r+2; n.vx=Math.abs(n.vx);}  if(n.x+n.r>W-2){n.x=W-2-n.r; n.vx=-Math.abs(n.vx);}
      if(n.y-n.r<2){n.y=n.r+2; n.vy=Math.abs(n.vy);}  if(n.y+n.r>H-2){n.y=H-2-n.r; n.vy=-Math.abs(n.vy);}
    }
    for(let i=0;i<simNodes.length;i++) for(let j=i+1;j<simNodes.length;j++){
      const a=simNodes[i], b=simNodes[j];
      const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||1, min=a.r+b.r+2;
      if(d<min){
        const ux=dx/d, uy=dy/d, ov=(min-d)/2;
        a.x-=ux*ov; a.y-=uy*ov; b.x+=ux*ov; b.y+=uy*ov;
        let t=a.vx; a.vx=b.vx; b.vx=t; t=a.vy; a.vy=b.vy; b.vy=t;
      }
    }
    chart.setOption({series:[{animation:false, data:simNodes.map(build)}]});
  }, 50);

}

window.SantroBubbleEngine = { MONO, HEAT_STOPS, colorFor, heatDark, heatText,
  fitFs, logoUrl, packBubbles, tickerItem, motionStart, motionStop, fmtPct };
})();
