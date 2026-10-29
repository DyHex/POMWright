---
"pomwright": patch
---

When the page closes while `seed` is still registering (an un-awaited `seed` at the end of a test, or a page closed
right after it), `seed` fails with its label, the origin and the keys, and the stack starts at the `seed` line:
`Shop.SessionStorage.seed: the page closed while seed() was registering the seed for https://pay.example (keys: "orderId"); await seed() before the test ends`.
Before, it failed with Playwright's raw `page.evaluate: Target page, context or browser has been closed` and no frame of
the test. Any other error from the page while a seed registers also gets the label and the call site.
