# Static Site Tests

```bash
node --test tests/*.test.mjs
```

The tests cover complete numerical totals, result filtering, CSV export and
the single-reference-write method animation.

`workflow-template.yml` is an optional GitHub Actions template, not an active
workflow. A maintainer with workflow-update permission can place it in
`.github/workflows/static-checks.yml`.
