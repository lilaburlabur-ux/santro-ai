/* Guardrail tests for the portfolio stress-test engine (node qa_stress.js). */
const S = require("./stress-test.js");
let pass = 0, fail = 0;
const t = (name, ok) => { ok ? pass++ : (fail++, console.log("  ✗ " + name)); ok && console.log("  ✓ " + name); };

// 1-2 parsing
let p = S.parse("NVDA 20%, SMH 15, TAO 10%, MSFT 20, CASH 35");
t("weighted parse: 5 holdings", p.holdings.length === 5);
t("weighted parse: weights kept", p.holdings[0].weight_pct === 20 && p.holdings[4].weight_pct === 35);
p = S.parse("NVDA, AMD, MSFT, SPY");
t("equal-weight assumed + labeled", p.holdings.every(h => h.weight_pct === 25) && /equal-weight/.test(p.notes[0]));
// 3 weight normalization
p = S.parse("NVDA 60, AMD 60");
let r = S.run("NVDA 60, AMD 60");
t("over-100 weights normalized", Math.abs(r.bucket_weights.ai_semis - 100) < 0.1 && r.assumptions.some(n => /normalized/.test(n)));
// 4 unknown tickers honest
r = S.run("NVDA 50, ZZZZFAKE 50");
t("unknown ticker -> unknown_asset", r.unknown_weight_pct === 50);
t("unknown excluded from scenario math but flagged", r.scenario_results[0].interpretation.includes("unrecognized"));
t("unknown holding needs verification", r.fragility_map.find(f => f.symbol === "ZZZZFAKE").verification_needed.length > 0);
// 5-7 classification
t("NVDA -> ai_semis core", S.classify({symbol:"NVDA",weight_pct:1}).bucket === "ai_semis");
t("TAO -> ai_crypto", S.classify({symbol:"TAO",weight_pct:1}).bucket === "ai_crypto");
t("SMH -> concentrated AI ETF", S.classify({symbol:"SMH",weight_pct:1}).bucket === "ai_etf_concentrated");
t("CASH -> defensive", S.classify({symbol:"CASH",weight_pct:1}).bucket === "defensive_or_cash");
t("SPY -> broad market", S.classify({symbol:"SPY",weight_pct:1}).bucket === "broad_market");
// 8 risk score deterministic + label bands
const all_ai = S.run("NVDA 40, AMD 30, TAO 30");
const defensive = S.run("CASH 60, BND 20, SPY 20");
t("all-AI portfolio scores high/extreme", all_ai.portfolio_risk_score >= 50);
t("defensive portfolio scores low", defensive.portfolio_risk_score < 25 && defensive.risk_label === "low");
t("score is 0-100", all_ai.portfolio_risk_score <= 100);
// 9 scenario math
r = S.run("CASH 100");
const cashScen = r.scenario_results.find(s => /AI-specific/.test(s.scenario_name));
t("100% cash: ai-burst range within [-5,5]", cashScen.estimated_portfolio_drawdown_range[0] >= -5 && cashScen.estimated_portfolio_drawdown_range[1] <= 5);
r = S.run("NVDA 100");
const nv = r.scenario_results.find(s => /AI-specific/.test(s.scenario_name));
t("100% NVDA ai-burst = bucket shock [-35,-60] (milder first)", nv.estimated_portfolio_drawdown_range[0] === -35 && nv.estimated_portfolio_drawdown_range[1] === -60);
// 10 top contributors
r = S.run("NVDA 50, CASH 50");
t("NVDA is top loss contributor", r.scenario_results[0].top_contributors_to_loss[0].symbol === "NVDA");
// 12 large portfolio: fragility capped at 25, compress caps top 10
const many = Array.from({length:40},(_,i)=>"NVDA "+(100/40)).join(", ").replace(/NVDA/g,(m,o)=>m); // 40 x NVDA-weight lines won't parse as distinct — build real list:
const syms=Object.keys(S.EXPOSURE_MAP).slice(0,40);
r = S.run(syms.map(s=>s+" 2.5").join(", "));
t("40 holdings: fragility map capped at 25", r.fragility_map.length <= 25);
const c = S.compressForModel(r);
t("model payload top positions capped at 10", c.portfolio_summary.top_positions.length <= 10);
t("model payload has no raw notes/full map", !JSON.stringify(c).includes("fragility_map"));
// 13/14 safety: no advice words, share-safe fields only
const txt = JSON.stringify(S.run("NVDA 50, TAO 50")).toLowerCase();
t("no buy/sell advice in output", !/\b(you should (buy|sell)|buy now|sell now|go short|rebalance now)\b/.test(txt));
t("disclaimer present", /not financial advice/i.test(txt));
t("no prediction language", !/will crash|guaranteed|will repeat/.test(txt));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
