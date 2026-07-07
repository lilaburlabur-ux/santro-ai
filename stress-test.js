/* Santro AI — portfolio_stress_test_skill (deterministic risk engine).
   Reusable: window.SantroStress in browsers, module.exports in node (tests).
   Design: ALL math and classification happen here in code. The optional AI
   layer only ever receives compressForModel() output (see
   skills/portfolio-stress-prompt.md) — never raw portfolios, never big text.
   v1 ships with template-generated explanations (zero model tokens). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SantroStress = factory();
})(typeof self !== "undefined" ? self : this, function () {

  // ── compact exposure map (generated from universe/ecosystem/etf-data/crypto) ──
  // fields: b=primary bucket, e=ai_exposure_level, c=crowding_sensitivity, t=asset type hint
  const EXPOSURE_MAP = {"NVDA":{"b":"ai_semis","e":"core","c":"high"},"TSM":{"b":"ai_semis","e":"core","c":"high"},"AVGO":{"b":"ai_semis","e":"core","c":"high"},"MU":{"b":"ai_semis","e":"core","c":"high"},"AMD":{"b":"ai_semis","e":"core","c":"high"},"INTC":{"b":"ai_semis","e":"core","c":"high"},"ARM":{"b":"ai_semis","e":"core","c":"high"},"MRVL":{"b":"ai_semis","e":"core","c":"high"},"QCOM":{"b":"ai_semis","e":"core","c":"high"},"NXPI":{"b":"ai_semis","e":"core","c":"high"},"LSCC":{"b":"ai_semis","e":"core","c":"high"},"SYNA":{"b":"ai_semis","e":"core","c":"extreme"},"CEVA":{"b":"ai_semis","e":"core","c":"extreme"},"MSFT":{"b":"ai_cloud","e":"core","c":"medium"},"ORCL":{"b":"ai_cloud","e":"core","c":"medium"},"PLTR":{"b":"ai_cloud","e":"core","c":"medium"},"PANW":{"b":"ai_cloud","e":"core","c":"medium"},"CRWD":{"b":"ai_cloud","e":"core","c":"medium"},"FTNT":{"b":"ai_cloud","e":"core","c":"medium"},"NET":{"b":"ai_cloud","e":"core","c":"medium"},"MDB":{"b":"ai_cloud","e":"core","c":"medium"},"OKTA":{"b":"ai_cloud","e":"core","c":"medium"},"ZS":{"b":"ai_cloud","e":"core","c":"medium"},"CHKP":{"b":"ai_cloud","e":"core","c":"medium"},"S":{"b":"ai_cloud","e":"core","c":"extreme"},"PATH":{"b":"ai_cloud","e":"core","c":"extreme"},"AI":{"b":"ai_cloud","e":"core","c":"extreme"},"SAP":{"b":"ai_software","e":"core","c":"high"},"CRM":{"b":"ai_software","e":"core","c":"high"},"NOW":{"b":"ai_software","e":"core","c":"high"},"SNOW":{"b":"ai_software","e":"core","c":"high"},"DDOG":{"b":"ai_software","e":"core","c":"high"},"ADBE":{"b":"ai_software","e":"core","c":"high"},"INTU":{"b":"ai_software","e":"core","c":"high"},"WDAY":{"b":"ai_software","e":"core","c":"high"},"SOUN":{"b":"ai_software","e":"core","c":"extreme"},"CRNC":{"b":"ai_software","e":"core","c":"extreme"},"PUBM":{"b":"ai_software","e":"core","c":"extreme"},"ASML":{"b":"ai_semis_equipment","e":"enabling","c":"medium"},"AMAT":{"b":"ai_semis_equipment","e":"enabling","c":"medium"},"CSCO":{"b":"ai_semis_equipment","e":"enabling","c":"medium"},"LRCX":{"b":"ai_semis_equipment","e":"enabling","c":"medium"},"KLAC":{"b":"ai_semis_equipment","e":"enabling","c":"medium"},"DELL":{"b":"ai_semis_equipment","e":"enabling","c":"medium"},"ANET":{"b":"ai_semis_equipment","e":"enabling","c":"medium"},"TER":{"b":"ai_semis_equipment","e":"enabling","c":"medium"},"HPE":{"b":"ai_semis_equipment","e":"enabling","c":"medium"},"SMCI":{"b":"ai_semis_equipment","e":"enabling","c":"medium"},"ZBRA":{"b":"ai_semis_equipment","e":"enabling","c":"medium"},"AMBA":{"b":"ai_semis_equipment","e":"enabling","c":"extreme"},"AAPL":{"b":"mega_cap_tech","e":"enabling","c":"medium"},"GOOGL":{"b":"mega_cap_tech","e":"enabling","c":"medium"},"AMZN":{"b":"mega_cap_tech","e":"enabling","c":"medium"},"META":{"b":"mega_cap_tech","e":"enabling","c":"medium"},"BABA":{"b":"mega_cap_tech","e":"enabling","c":"medium"},"APP":{"b":"mega_cap_tech","e":"enabling","c":"medium"},"BIDU":{"b":"mega_cap_tech","e":"enabling","c":"medium"},"PINS":{"b":"mega_cap_tech","e":"enabling","c":"medium"},"SNAP":{"b":"mega_cap_tech","e":"enabling","c":"extreme"},"TTD":{"b":"mega_cap_tech","e":"enabling","c":"extreme"},"MGNI":{"b":"mega_cap_tech","e":"enabling","c":"extreme"},"DV":{"b":"mega_cap_tech","e":"enabling","c":"extreme"},"VRT":{"b":"ai_power_energy","e":"second_order","c":"medium"},"PWR":{"b":"ai_power_energy","e":"second_order","c":"medium"},"EQIX":{"b":"ai_power_energy","e":"second_order","c":"medium"},"DLR":{"b":"ai_power_energy","e":"second_order","c":"medium"},"D":{"b":"ai_power_energy","e":"second_order","c":"medium"},"TLN":{"b":"ai_power_energy","e":"second_order","c":"medium"},"AES":{"b":"ai_power_energy","e":"second_order","c":"medium"},"OKLO":{"b":"ai_power_energy","e":"second_order","c":"extreme"},"SPCX":{"b":"ai_robotics","e":"second_order","c":"medium"},"TSLA":{"b":"ai_robotics","e":"second_order","c":"medium"},"IBM":{"b":"ai_robotics","e":"second_order","c":"medium"},"ISRG":{"b":"ai_robotics","e":"second_order","c":"medium"},"HON":{"b":"ai_robotics","e":"second_order","c":"medium"},"ROK":{"b":"ai_robotics","e":"second_order","c":"medium"},"CGNX":{"b":"ai_robotics","e":"second_order","c":"medium"},"AVAV":{"b":"ai_robotics","e":"second_order","c":"extreme"},"SYM":{"b":"ai_robotics","e":"second_order","c":"extreme"},"UPST":{"b":"ai_robotics","e":"second_order","c":"extreme"},"SMR":{"b":"ai_robotics","e":"second_order","c":"extreme"},"RXRX":{"b":"ai_robotics","e":"second_order","c":"extreme"},"INOD":{"b":"ai_robotics","e":"second_order","c":"extreme"},"BBAI":{"b":"ai_robotics","e":"second_order","c":"extreme"},"SNDK":{"b":"ai_semis","e":"enabling","c":"medium"},"WDC":{"b":"ai_semis","e":"enabling","c":"medium"},"ADI":{"b":"ai_semis","e":"enabling","c":"medium"},"GLW":{"b":"ai_semis","e":"enabling","c":"medium"},"ETN":{"b":"ai_semis","e":"enabling","c":"medium"},"ASX":{"b":"ai_semis","e":"enabling","c":"medium"},"NOK":{"b":"ai_semis","e":"enabling","c":"medium"},"MPWR":{"b":"ai_semis","e":"enabling","c":"medium"},"COHR":{"b":"ai_semis","e":"enabling","c":"medium"},"STM":{"b":"ai_semis","e":"enabling","c":"medium"},"LITE":{"b":"ai_semis","e":"enabling","c":"medium"},"KEYS":{"b":"ai_semis","e":"enabling","c":"medium"},"NBIS":{"b":"ai_semis","e":"enabling","c":"medium"},"FLEX":{"b":"ai_semis","e":"enabling","c":"medium"},"CRWV":{"b":"ai_semis","e":"enabling","c":"medium"},"ON":{"b":"ai_semis","e":"enabling","c":"medium"},"JBL":{"b":"ai_semis","e":"enabling","c":"medium"},"FN":{"b":"ai_semis","e":"enabling","c":"medium"},"AMKR":{"b":"ai_semis","e":"enabling","c":"medium"},"CAMT":{"b":"ai_semis","e":"enabling","c":"medium"},"NVTS":{"b":"ai_semis","e":"enabling","c":"medium"},"NEAR":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"TAO":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"DEXE":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"ICP":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"RENDER":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"BDX":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"FIL":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"VVV":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"INJ":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"FET":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"VIRTUAL":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"UB":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"KITE":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"GRT":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"VELVET":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"AKT":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"KAITO":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"THETA":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"TRAC":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"GRASS":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"ALLO":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"ARC":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"CCD":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"BNKR":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"ZEREBRO":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"SERV":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"SIREN":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"RLC":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"FAI":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"AIO":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"PHA":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"IQ":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"AIXBT":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"BLUAI":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"CGPT":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"BAT":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"CLANKER":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"ZENT":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"},"SPX":{"b":"broad_market","e":"low","c":"low"},"SP500":{"b":"broad_market","e":"low","c":"low"},"IVV":{"b":"broad_market","e":"low","c":"low","t":"etf"},"SPLG":{"b":"broad_market","e":"low","c":"low","t":"etf"},"RSP":{"b":"broad_market","e":"low","c":"low","t":"etf"},"VT":{"b":"broad_market","e":"low","c":"low","t":"etf"},"ITOT":{"b":"broad_market","e":"low","c":"low","t":"etf"},"DIA":{"b":"broad_market","e":"low","c":"low","t":"etf"},"NDX":{"b":"mega_cap_tech","e":"enabling","c":"medium"},"QQQM":{"b":"mega_cap_tech","e":"enabling","c":"medium","t":"etf"},"SPY":{"b":"broad_market","e":"low","c":"low"},"VOO":{"b":"broad_market","e":"low","c":"low"},"VTI":{"b":"broad_market","e":"low","c":"low"},"QQQ":{"b":"mega_cap_tech","e":"enabling","c":"medium"},"IWM":{"b":"small_cap_speculative","e":"low","c":"medium"},"GOOG":{"b":"mega_cap_tech","e":"enabling","c":"medium"},"BND":{"b":"defensive_or_cash","e":"low","c":"low"},"TLT":{"b":"defensive_or_cash","e":"low","c":"low"},"GLD":{"b":"defensive_or_cash","e":"low","c":"low"},"CASH":{"b":"defensive_or_cash","e":"low","c":"low"},"USD":{"b":"defensive_or_cash","e":"low","c":"low"},"BRK.B":{"b":"broad_market","e":"low","c":"low"},"JPM":{"b":"broad_market","e":"low","c":"low"},"BTC":{"b":"ai_crypto","e":"low","c":"high"},"ETH":{"b":"ai_crypto","e":"low","c":"high"},"BAI":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"AIQ":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"ARTY":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"CHAT":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"IGPT":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"AGIX":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"IVES":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"WTAI":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"THNQ":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"LRNZ":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"FDTX":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"AIVL":{"b":"broad_market","e":"low","c":"medium","t":"etf"},"AIVI":{"b":"broad_market","e":"low","c":"medium","t":"etf"},"VGT":{"b":"broad_market","e":"low","c":"medium","t":"etf"},"SMH":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"SOXX":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"SOXQ":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"XSD":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"PSI":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"FTXL":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"BOTZ":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"ARKQ":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"ROBT":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"ROBO":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"IRBO":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"HUMN":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"KOID":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"SOXL":{"b":"small_cap_speculative","e":"low","c":"medium","t":"etf"},"SOXS":{"b":"small_cap_speculative","e":"low","c":"medium","t":"etf"},"UBOT":{"b":"small_cap_speculative","e":"low","c":"medium","t":"etf"},"NVDL":{"b":"small_cap_speculative","e":"low","c":"medium","t":"etf"},"AVGX":{"b":"small_cap_speculative","e":"low","c":"medium","t":"etf"},"AIPI":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"FEPI":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"AIYY":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"QQQI":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"QTUM":{"b":"broad_market","e":"low","c":"medium","t":"etf"},"DTCR":{"b":"broad_market","e":"low","c":"medium","t":"etf"},"DTEC":{"b":"broad_market","e":"low","c":"medium","t":"etf"},"KOMP":{"b":"broad_market","e":"low","c":"medium","t":"etf"},"LOUP":{"b":"broad_market","e":"low","c":"medium","t":"etf"},"DRAM":{"b":"ai_etf_concentrated","e":"core","c":"medium","t":"etf"},"ALAB":{"b":"ai_semis","e":"core","c":"high"},"TEM":{"b":"ai_software","e":"core","c":"high"},"RDDT":{"b":"high_duration_growth","e":"narrative","c":"high"},"CRCL":{"b":"high_duration_growth","e":"low","c":"high"},"QNT":{"b":"high_duration_growth","e":"narrative","c":"high"},"STX":{"b":"ai_semis","e":"enabling","c":"medium"},"000660.KS":{"b":"ai_semis","e":"core","c":"medium"},"005930.KS":{"b":"ai_semis","e":"enabling","c":"medium"},"285A.T":{"b":"ai_semis","e":"core","c":"medium"},"2408.TW":{"b":"ai_semis","e":"enabling","c":"high"},"2344.TW":{"b":"ai_semis","e":"enabling","c":"high"},"RNDR":{"b":"ai_crypto","e":"narrative","c":"extreme","t":"crypto"}};

  // ── scenario shock config (EDIT HERE — ranges are simplified, not forecasts) ──
  const SCENARIOS = [
    {id:"dotcom", name:"Dot-com style AI de-rating",
     desc:"High-growth tech and AI narrative names compress sharply while the broad market falls less.",
     shocks:{ai_semis:[-45,-65],ai_semis_equipment:[-35,-55],ai_cloud:[-30,-50],ai_data_centers:[-35,-60],
      ai_power_energy:[-25,-50],ai_software:[-40,-70],ai_cybersecurity:[-25,-45],ai_robotics:[-35,-60],
      ai_etf_concentrated:[-35,-60],ai_crypto:[-65,-90],mega_cap_tech:[-30,-50],broad_market:[-25,-40],
      high_duration_growth:[-50,-75],small_cap_speculative:[-60,-85],defensive_or_cash:[-5,5]}},
    {id:"gfc", name:"2008-style liquidity shock",
     desc:"Correlations rise, leverage unwinds, risky assets fall together.",
     shocks:{ai_semis:[-35,-55],ai_semis_equipment:[-35,-55],ai_cloud:[-30,-50],ai_data_centers:[-30,-50],
      ai_power_energy:[-20,-40],ai_software:[-35,-60],ai_cybersecurity:[-30,-50],ai_robotics:[-35,-55],
      ai_etf_concentrated:[-35,-55],ai_crypto:[-60,-85],mega_cap_tech:[-25,-45],broad_market:[-35,-55],
      high_duration_growth:[-45,-70],small_cap_speculative:[-55,-80],defensive_or_cash:[-10,5]}},
    {id:"rates", name:"2022-style rate shock",
     desc:"Long-duration growth and high-valuation tech compress as discount rates rise.",
     shocks:{ai_semis:[-25,-45],ai_semis_equipment:[-25,-45],ai_cloud:[-30,-55],ai_data_centers:[-25,-45],
      ai_power_energy:[-10,-30],ai_software:[-40,-65],ai_cybersecurity:[-30,-50],ai_robotics:[-30,-55],
      ai_etf_concentrated:[-30,-55],ai_crypto:[-60,-85],mega_cap_tech:[-20,-40],broad_market:[-15,-30],
      high_duration_growth:[-50,-75],small_cap_speculative:[-50,-80],defensive_or_cash:[-5,5]}},
    {id:"ai_burst", name:"AI-specific bubble burst",
     desc:"The AI narrative breaks while the non-AI market is less damaged.",
     shocks:{ai_semis:[-35,-60],ai_semis_equipment:[-30,-50],ai_cloud:[-25,-45],ai_data_centers:[-30,-60],
      ai_power_energy:[-25,-55],ai_software:[-35,-65],ai_cybersecurity:[-20,-40],ai_robotics:[-30,-55],
      ai_etf_concentrated:[-30,-55],ai_crypto:[-70,-95],mega_cap_tech:[-20,-40],broad_market:[-10,-25],
      high_duration_growth:[-35,-65],small_cap_speculative:[-50,-80],defensive_or_cash:[-5,5]}},
    {id:"crypto_riskoff", name:"Crypto risk-off",
     desc:"AI tokens and speculative crypto unwind hard while equities are only mildly damaged.",
     shocks:{ai_semis:[-8,-20],ai_semis_equipment:[-8,-18],ai_cloud:[-6,-15],ai_data_centers:[-8,-18],
      ai_power_energy:[-5,-15],ai_software:[-8,-20],ai_cybersecurity:[-5,-15],ai_robotics:[-10,-25],
      ai_etf_concentrated:[-8,-20],ai_crypto:[-70,-95],mega_cap_tech:[-5,-15],broad_market:[-3,-10],
      high_duration_growth:[-15,-35],small_cap_speculative:[-30,-60],defensive_or_cash:[-2,3]}},
    {id:"depression", name:"Extreme tail stress (depression-style)",
     desc:"Extreme prolonged drawdown, credit contraction and liquidity destruction. A tail scenario, not a base case.",
     shocks:{ai_semis:[-60,-85],ai_semis_equipment:[-60,-85],ai_cloud:[-55,-80],ai_data_centers:[-55,-80],
      ai_power_energy:[-35,-65],ai_software:[-60,-90],ai_cybersecurity:[-50,-75],ai_robotics:[-55,-85],
      ai_etf_concentrated:[-55,-85],ai_crypto:[-85,-99],mega_cap_tech:[-50,-75],broad_market:[-50,-80],
      high_duration_growth:[-70,-95],small_cap_speculative:[-80,-99],defensive_or_cash:[-15,5]}}
  ];
  const AI_BUCKETS=["ai_semis","ai_semis_equipment","ai_cloud","ai_data_centers","ai_power_energy",
    "ai_software","ai_cybersecurity","ai_robotics","ai_etf_concentrated","ai_crypto"];
  const DISCLAIMER="This is a stress test, not a forecast. Historical scenarios are simplified and may not repeat. Not financial advice.";

  // ── parser: "NVDA 20%, SMH 15, TAO 10" | lines | bare tickers ──
  function parse(text){
    const out=[], notes=[];
    // human index spellings -> tickers ("S&P 500 40" used to be silently
    // skipped and the remaining weights renormalized without it)
    text = (text||"")
      .replace(/\bS\s*&\s*P\s*-?\s*500\b/gi, "SPX")
      .replace(/\bSP\s*-?\s*500\b/gi, "SPX")
      .replace(/\bNASDAQ\s*-?\s*100\b/gi, "NDX");
    text.split(/[\n,;]+/).forEach(chunk=>{
      const s=chunk.trim(); if(!s) return;
      const m=s.match(/^((?=[A-Za-z0-9.\-]*[A-Za-z])[A-Za-z0-9][A-Za-z0-9.\-]{0,9})\s*[:\s]?\s*([\d.]+)?\s*%?$/);
      if(!m){ notes.push(`Couldn't read "${s.slice(0,20)}" — skipped.`); return; }
      out.push({symbol:m[1].toUpperCase(), weight_pct:m[2]!=null?parseFloat(m[2]):null});
    });
    const missing=out.filter(h=>h.weight_pct==null).length;
    if(out.length && missing===out.length){
      const w=100/out.length; out.forEach(h=>h.weight_pct=+w.toFixed(2));
      notes.push("No weights given — assumed an equal-weight portfolio.");
    } else if(missing>0){
      const used=out.reduce((a,h)=>a+(h.weight_pct||0),0);
      const rest=Math.max(0,100-used)/missing;
      out.forEach(h=>{ if(h.weight_pct==null) h.weight_pct=+rest.toFixed(2); });
      notes.push(`${missing} holding(s) had no weight — split the remaining ${Math.max(0,100-used).toFixed(0)}% equally (assumption).`);
    }
    const total=out.reduce((a,h)=>a+h.weight_pct,0);
    if(out.length && Math.abs(total-100)>0.6){
      out.forEach(h=>h.weight_pct=+(h.weight_pct*100/total).toFixed(2));
      notes.push(`Weights summed to ${total.toFixed(0)}% — normalized to 100%.`);
    }
    return {holdings:out, notes};
  }

  function classify(h){
    const k=EXPOSURE_MAP[h.symbol];
    if(k) return {symbol:h.symbol, weight_pct:h.weight_pct, bucket:k.b, ai_exposure_level:k.e,
      crowding:k.c, unknown:false};
    return {symbol:h.symbol, weight_pct:h.weight_pct, bucket:"unknown_asset",
      ai_exposure_level:"unknown", crowding:"unknown", unknown:true};
  }

  // ── deterministic engine ──
  function run(text, opts){
    opts=opts||{};
    const parsed=typeof text==="string"?parse(text):{holdings:text,notes:[]};
    if(!parsed.holdings.length) return {error:"No holdings recognized.", notes:parsed.notes};
    let rows=parsed.holdings.map(classify).sort((a,b)=>b.weight_pct-a.weight_pct);
    // cap detail at top 25; tail summarized into its buckets (still counted numerically)
    const buckets={};
    rows.forEach(r=>{ buckets[r.bucket]=(buckets[r.bucket]||0)+r.weight_pct; });
    Object.keys(buckets).forEach(k=>buckets[k]=+buckets[k].toFixed(2));
    const aiPct=+AI_BUCKETS.reduce((a,b)=>a+(buckets[b]||0),0).toFixed(1);
    const unknownPct=+(buckets.unknown_asset||0).toFixed(1);
    const cryptoPct=buckets.ai_crypto||0;
    const hdgPct=(buckets.high_duration_growth||0)+(buckets.small_cap_speculative||0);
    const top5=rows.slice(0,5).reduce((a,r)=>a+r.weight_pct,0);
    // repeated exposures: buckets fed by 2+ symbols
    const byBucket={};
    rows.forEach(r=>{(byBucket[r.bucket]=byBucket[r.bucket]||[]).push(r.symbol);});
    const repeated=Object.entries(byBucket).filter(([b,syms])=>syms.length>=2&&b!=="unknown_asset"&&b!=="defensive_or_cash")
      .map(([b,syms])=>({theme:b,total_weight_pct:buckets[b],symbols:syms.slice(0,8)}))
      .sort((a,b)=>b.total_weight_pct-a.total_weight_pct);
    // ── risk score (deterministic, spec formula) ──
    const sAI=Math.min(30, aiPct*0.30);
    const sConc=Math.min(20, Math.max(0,(top5-20))*0.35);
    const sCrypto=Math.min(15, cryptoPct*0.75);
    const sDur=Math.min(15, hdgPct*0.5);
    const sUnk=Math.min(10, unknownPct*0.5);
    const sRep=Math.min(10, repeated.reduce((a,r)=>a+(r.total_weight_pct>=25?4:r.total_weight_pct>=15?2:1),0));
    const score=Math.round(Math.min(100, sAI+sConc+sCrypto+sDur+sUnk+sRep));
    const label=score<25?"low":score<50?"moderate":score<75?"high":"extreme";
    // ── scenarios ──
    const scen=SCENARIOS.map(sc=>{
      let lo=0,hi=0; const dmg={};
      Object.entries(buckets).forEach(([b,w])=>{
        const shock=sc.shocks[b];
        if(!shock){ return; } // unknown_asset: excluded from math, flagged separately
        lo+=w*shock[0]/100; hi+=w*shock[1]/100;
        dmg[b]=w*Math.abs(shock[1])/100;
      });
      const main=Object.entries(dmg).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
      const contrib=rows.filter(r=>main.includes(r.bucket)).slice(0,5)
        .map(r=>({symbol:r.symbol,weight:r.weight_pct,bucket:r.bucket,
          risk_contribution:r.weight_pct>=15?"high":r.weight_pct>=7?"medium":"low"}));
      const interp=`Under a ${sc.name.toLowerCase()}, the portfolio's modeled drawdown range is `+
        `${hi.toFixed(0)}% to ${lo.toFixed(0)}%. Most of the damage comes from ${main.map(pretty).join(", ")}`+
        `${unknownPct>0?` — plus ${unknownPct}% in unrecognized assets that this model can't shock (verify them separately)`:""}. ${sc.desc}`;
      return {scenario_name:sc.name,
        estimated_portfolio_drawdown_range:[+lo.toFixed(1),+hi.toFixed(1)],
        main_damage_sources:main, top_contributors_to_loss:contrib, interpretation:interp};
    });
    // fragility map
    const frag=rows.slice(0,25).map(r=>({symbol:r.symbol,weight_pct:r.weight_pct,primary_bucket:r.bucket,
      ai_exposure_level:r.ai_exposure_level,
      risk_flag:r.unknown?"unknown_asset":(r.crowding==="extreme"?"crowded_speculative":(AI_BUCKETS.includes(r.bucket)&&r.weight_pct>=15?"crowded_ai_beta":(r.weight_pct>=25?"single_name_concentration":"ok"))),
      verification_needed:r.unknown?["asset type","AI exposure","liquidity"]:[]}));
    const verify=[];
    if(rows.some(r=>r.bucket==="ai_etf_concentrated")) verify.push("ETF holdings overlap with your single names");
    if(cryptoPct>0) verify.push("AI-crypto liquidity (small tokens gap down hard)");
    if(top5>=50) verify.push("single-name concentration (top 5 = "+top5.toFixed(0)+"%)");
    if(unknownPct>0) verify.push(unknownPct+"% of weight is in assets Santro couldn't classify");
    verify.push("your actual weights and time horizon vs. this input");
    const summary=`Your portfolio is ${aiPct}% AI-exposed (${label} stress profile, score ${score}/100). `+
      `The heaviest theme is ${repeated[0]?pretty(repeated[0].theme)+" ("+repeated[0].total_weight_pct+"% across "+repeated[0].symbols.length+" holdings)":pretty(rows[0].bucket)}. `+
      `The scenario that hurts most is "${worst(scen).scenario_name}" with a modeled range of ${worst(scen).estimated_portfolio_drawdown_range[1]}% to ${worst(scen).estimated_portfolio_drawdown_range[0]}%. `+
      `${unknownPct>0?`Note: ${unknownPct}% of weight is unrecognized and excluded from the math. `:""}`+
      `These are simplified what-ifs on today's classification — not predictions, and not advice.`;
    return {portfolio_risk_score:score, risk_label:label, ai_exposure_pct:aiPct,
      concentration_score:+top5.toFixed(1), crowding_score:+sRep.toFixed(1),
      unknown_weight_pct:unknownPct, bucket_weights:buckets, scenario_results:scen,
      fragility_map:frag, repeated_exposures:repeated, what_to_verify:verify,
      plain_english_summary:summary, assumptions:parsed.notes, disclaimer:DISCLAIMER};
  }
  function worst(scen){ return scen.slice().sort((a,b)=>a.estimated_portfolio_drawdown_range[1]-b.estimated_portfolio_drawdown_range[1])[0]; }
  function pretty(b){ return (b||"").replace(/_/g," ").replace("ai ","AI "); }

  // ── compressed payload for the (future) AI-explanation layer — never raw portfolios ──
  function compressForModel(result, opts){
    opts=opts||{};
    return {portfolio_summary:{
        total_positions:result.fragility_map.length,
        top_positions:result.fragility_map.slice(0,10).map(f=>({symbol:f.symbol,weight:f.weight_pct,bucket:f.primary_bucket})),
        bucket_weights:result.bucket_weights, unknown_weight:result.unknown_weight_pct},
      risk_score:result.portfolio_risk_score, risk_label:result.risk_label,
      scenario_results:result.scenario_results.map(s=>({name:s.scenario_name,range:s.estimated_portfolio_drawdown_range,main:s.main_damage_sources})),
      risk_profile:opts.risk_profile||"balanced", time_horizon:opts.time_horizon||"6m"};
  }

  // Merge live site feeds into the map (crypto rotates; universe evolves).
  // Call from pages: SantroStress.enrichFromFeeds(fetch) — safe to skip in node.
  const BUBBLE2BUCKET={ai_chips_and_compute:"ai_semis",chip_equipment_and_ai_hardware:"ai_semis_equipment",
    ai_software_and_cloud_infrastructure:"ai_cloud",ai_applications_and_data_software:"ai_software",
    ai_platforms_internet_and_adtech:"mega_cap_tech",data_center_power_and_energy:"ai_power_energy",
    applied_ai_industrial_defense_and_vertical:"ai_robotics"};
  async function enrichFromFeeds(){
    try{
      const [u,ec,c]=await Promise.all(["/universe.json","/ecosystem.json","/crypto.json"]
        .map(p=>fetch(p+"?t="+Date.now()).then(r=>r.json()).catch(()=>null)));
      if(u&&u.bubbles) u.bubbles.forEach(b=>{const bk=BUBBLE2BUCKET[b.id]||"ai_semis";
        (b.tickers||[]).forEach(t=>{ if(!EXPOSURE_MAP[t.ticker]) EXPOSURE_MAP[t.ticker]={b:bk,e:"core",c:"high"}; });});
      if(ec&&ec.tickers) ec.tickers.forEach(t=>{ if(!EXPOSURE_MAP[t.ticker]) EXPOSURE_MAP[t.ticker]={b:"ai_semis",e:"enabling",c:"medium"}; });
      if(c&&c.baskets) Object.values(c.baskets).forEach(bk=>(bk.coins||[]).forEach(x=>{
        const s=(x.symbol||"").toUpperCase();
        if(s&&!EXPOSURE_MAP[s]) EXPOSURE_MAP[s]={b:"ai_crypto",e:"narrative",c:"extreme",t:"crypto"}; }));
    }catch(e){}
  }

  // ── share-card data: pure, display-ready derivation from a run() result ──
  // Rules (see share card spec): defensive/broad buckets NEVER rank in
  // "what hurts" — cash belongs in cushions. Chips truncate at 6. Scenarios
  // sorted worst-first by midpoint.
  const _DEFENSIVE = { defensive_or_cash: 1, broad_market: 1 };
  function shareCardData(r){
    if(!r || r.error) return null;
    const holds = (r.fragility_map || []).slice().sort((a,b)=>b.weight_pct-a.weight_pct);
    const chips = holds.slice(0,6).map(h=>({symbol:h.symbol,
      weight_pct:Math.round(h.weight_pct), bucket:h.primary_bucket}));
    const worst = (r.scenario_results || []).slice()
      .sort((a,b)=>a.estimated_portfolio_drawdown_range[1]-b.estimated_portfolio_drawdown_range[1])[0] || null;
    const hurts = ((worst && worst.top_contributors_to_loss) || [])
      .filter(c=>!_DEFENSIVE[c.bucket])
      .slice(0,3).map(c=>({symbol:c.symbol, weight:Math.round(c.weight), bucket:c.bucket}));
    const cashW = Math.round(r.bucket_weights.defensive_or_cash || 0);
    const broadW = Math.round(r.bucket_weights.broad_market || 0);
    const cushions = [];
    if(cashW > 0) cushions.push({label:"cash & defensive buffer", weight:cashW});
    if(broadW > 0) cushions.push({label:"broad-market ballast", weight:broadW});
    const risky = holds.filter(h=>!_DEFENSIVE[h.primary_bucket]);
    const scenarios = (r.scenario_results || []).map(s=>({
      name:s.scenario_name, range:s.estimated_portfolio_drawdown_range,
      mid:Math.round((s.estimated_portfolio_drawdown_range[0]+s.estimated_portfolio_drawdown_range[1])/2),
      worst:s===((r.scenario_results||[]).slice().sort((a,b)=>a.estimated_portfolio_drawdown_range[1]-b.estimated_portfolio_drawdown_range[1])[0])
    })).sort((a,b)=>a.mid-b.mid);
    return { chips, more:Math.max(0, holds.length-chips.length), hurts, cushions, worst,
      scenarios, buffer_pct:cashW+broadW,
      top_risk_position: risky[0] ? {symbol:risky[0].symbol, weight_pct:Math.round(risky[0].weight_pct)} : null,
      unknown_pct: r.unknown_weight_pct || 0,
      equal_weight: /equal/i.test((r.assumptions||[]).join(" ")) };
  }

  return {parse, classify, run, compressForModel, enrichFromFeeds, shareCardData, SCENARIOS, EXPOSURE_MAP, DISCLAIMER};
});
