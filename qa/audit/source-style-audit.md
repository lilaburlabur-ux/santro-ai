# Source-level style audit

## Architecture note (the explicit exception list)
This is a static two-layer site: the **legacy layer** (all page inline CSS +
site.css) is the flag-off rollback path and inherently contains raw values —
it is variable-driven and re-pointed at approved tokens by ds-v2/remap.css
when ds_v2 is on. Enforcement (stylelint + ci/audit-colors.mjs, both in CI)
applies to the **ds_v2 layer**, where raw colors are banned outside tokens.

| layer | raw hex occurrences | color functions | enforcement |
|---|---|---|---|
| legacy (rollback path) | 19373 | 2140 | exempt by design — values ARE the legacy system |
| ds_v2 (production design) | 119 | 14 | tokens-only, CI-enforced (tokens.css itself holds the raw values) |

- 100vw usages found: 177 (audited: none cause overflow — see mobile report)
- stylelint: PASS · audit:colors: PASS (see CI)
