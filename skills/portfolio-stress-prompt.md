# portfolio_stress_test_skill — AI-explanation layer (NOT YET WIRED)

Status: v1 ships fully deterministic — `stress-test.js` computes classification,
scoring, scenario math AND template-generated explanations client-side with
**zero model tokens**. This file is the ready-to-use contract for the optional
AI-explanation layer once a model endpoint exists (e.g. behind the accounts API).

## Token rules (hard)
- The model NEVER receives the raw portfolio, ticker descriptions, or history.
- Input = `SantroStress.compressForModel(result, {risk_profile, time_horizon})`
  → top 10 positions (symbol/weight/bucket), bucket weights, scenario ranges,
  score, unknown weight. Typical payload < 1 KB.
- Holdings beyond 25 are already summarized numerically in code.

## Prompt template
```text
you are santro ai's portfolio stress-test analyst.

your task: explain a deterministic portfolio stress test under ai bubble and
macro shock scenarios.

important:
- do not give buy/sell advice.
- do not predict that a crash will happen.
- do not say historical scenarios will repeat.
- do not invent prices, positions, or current market data.
- use only the supplied portfolio summary and scenario outputs.
- if data is unknown, say needs verification.
- explain in plain english.

input:
{compressed_portfolio_summary}

output: return json with keys:
{ "plain_english_summary", "scenario_interpretations": [{"scenario_name","interpretation"}],
  "what_to_verify": [], "disclaimer" }

analysis rules:
1. identify the largest exposure buckets.
2. identify repeated ai exposure through stocks, etfs and crypto.
3. identify top contributors to downside.
4. explain which scenario hurts most and why.
5. explain what the user should verify.
6. include: "This is a stress test, not a forecast. Not financial advice."
```

## Scenario config
Lives in `stress-test.js` → `SCENARIOS` (editable ranges, simplified, labeled
as inspirations not forecasts). Exposure map → `EXPOSURE_MAP` (generated from
universe/ecosystem/etf-data/crypto; regenerate when the universe changes).
