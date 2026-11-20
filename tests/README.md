# Static Site Tests

```bash
node --test tests/*.test.mjs
```

The tests cover complete numerical totals, result filtering, CSV export,
the single-reference-write method animation, Refreward token-flow stages,
film sequencing, subtitle placement, paired recordings and the five-model
evaluation-command builder.

The [active GitHub Actions workflow](https://github.com/robodemo-2027/robodemo-2027.github.io/actions/workflows/site-checks.yml)
runs these tests on every push and pull request. `workflow-template.yml` is
the reusable copy. The suite includes versioned release links, checkpoint
download commands and bilingual release announcements.
