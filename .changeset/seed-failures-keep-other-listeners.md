---
"pomwright": patch
---

A seed's failure found in a page listener (a refused write, a seed the arriving document skipped, a seed never applied
when the page closes) no longer stops the page's other `console` or `close` listeners: the error is rethrown from a
microtask, which still fails the test at once, with the `seed` line in its stack. Before, it was thrown inside
POMWright's listener, so a listener the test added after the `seed` did not run.
