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

The performance regression tests also check the visible nine-group comparison,
all five aggregation levels, the disclosed radial scales, and unchanged task
coverage. To check actual browser visibility and interactions with an installed
Playwright runtime and a running preview server:

```bash
SITE_URL=http://127.0.0.1:4193/ node tests/performance.browser.mjs
```

`PLAYWRIGHT_MODULE` and `CHROME_PATH` optionally select an existing Playwright
module and Chrome executable. `QA_OUTPUT` selects the screenshot/report directory
(default: `/tmp/robodemo-performance-qa`). The browser check covers desktop,
tablet, and mobile widths, all ten level/scale combinations, group inspection,
language switching, removal of the requested appendix panels, and both six-pair
video galleries. `publication.browser.mjs` additionally checks the public author
list and the new video, including seeking and English captions.
