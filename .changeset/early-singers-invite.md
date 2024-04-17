---
"pomwright": patch
---

# Change

buildNestedLocator will no longer attempt to auto-scroll to the final nested locator

Was done previously in an attempt to improve test recordings, but it sometimes causes tearing in screenshots and isn't ideal when using nested locators for visual regression tests.

## Playwright/test compatibility

Tested with the following Playwright/test versions:

- 1.43.1
- 1.43.0
- 1.42.1
- 1.42.0 (not recommended)
- 1.41.2
- 1.41.1
- 1.41.0
- 1.40.1
- 1.40.0
- 1.39.0
