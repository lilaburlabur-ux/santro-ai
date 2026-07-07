# Mobile overflow audit — https://santroai.tech

2026-07-07T21:45:10.359Z

Checked **175 URLs × 2 viewports (390, 375) = 350 loads**.

- overflow/status failures: **1**
- pages with console errors: **6**

## Failures
|url|vw|over(px)|offender|status|
|---|---|---|---|---|
|/stocks/qcom|375|225|DIV.container|503|

## Console errors
- / @390: ReferenceError: loadData is not defined · Failed to load resource: the server responded with a status of 401 ()
- /terminal @390: Failed to load resource: the server responded with a status of 401 ()
- / @375: ReferenceError: loadData is not defined · Failed to load resource: the server responded with a status of 401 ()
- /terminal @375: Failed to load resource: the server responded with a status of 401 ()
- /stocks/qcom @375: Failed to load resource: the server responded with a status of 503 ()
- /tools/fair-value-calculator @375: Failed to load resource: the server responded with a status of 401 ()