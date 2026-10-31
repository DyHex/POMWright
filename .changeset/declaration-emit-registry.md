---
"pomwright": patch
---

A function that returns `createRegistryWithAccessors()`'s result, its `add`, a page object's `add`, `registry.add` or `registry.createReusable` can be exported from a project built with `declaration: true`; before, the emit failed with TS4023 and TS4094. `createReusable`'s type is exported as `ReusableLocatorFactory`.
