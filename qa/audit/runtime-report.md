# Runtime/console audit

350 page loads (175 URLs × 390/375) + 21 desktop representative loads.

|url|console errors|verdict|
|---|---|---|
|/|Failed to load resource: the server responded with a status of 401 () · ReferenceError: loadData is not defined|loadData ReferenceError — FIXED this audit (orphan interval removed)|
|/stocks/qcom|Failed to load resource: the server responded with a status of 503 ()|transient 503 on third-party resource; embed containment added|
|/terminal|Failed to load resource: the server responded with a status of 401 ()|401 = anonymous auth probe (accounts backend /me) — known-benign|
|/tools/fair-value-calculator|Failed to load resource: the server responded with a status of 401 ()|401 = anonymous auth probe — known-benign|

All other pages: zero console errors. No hydration (static site). Fonts load only under ds_v2 flag (verified).
