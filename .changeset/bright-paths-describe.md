---
"pomwright": minor
---

Default Playwright descriptions for locators resolved through `getLocator` and `getNestedLocator` to their terminal
registry paths. Explicit descriptions from registrations, reused schemas, and query-level overrides continue to take
precedence, while terminal frame definitions apply the description to the `Locator` returned by `FrameLocator.owner()`.
This provides meaningful labels in Playwright traces and reports without changing the resolved locator chain.
