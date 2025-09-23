---
"pomwright": minor
---

# Highlights

 Updated the README to surface the expanded documentation set, making it easier to discover the new onboarding and reference guides from the project landing page.

## Documentation

### Onboarding & Patterns

- Added a comprehensive “Using POMWright” tutorial that walks through building a page object, defining locator schemas, moving definitions into shared files, wiring custom fixtures, and extracting common logic into abstract base classes for reuse across domains.

### Reference Guides

- Documented the BasePage API, covering its generics, constructor contract, required overrides, helper methods, and recommendations for layering domain-specific base classes.
- Explained LocatorSchemaPath rules, duplication safeguards, readability conventions (including @ suffixes), and how sub-paths power IntelliSense and targeted updates.
- Expanded the LocatorSchema reference with Playwright parity for every selector strategy, POMWright-specific helpers like dataCy and id, the new filter property, and a reusable schema example.
- Clarified how to use getLocator, getNestedLocator, and getLocatorSchema chains, including update/filter patterns, index migration guidance, and reuse techniques.
- Added focused primers for the BaseApi helper, the shared PlaywrightReportLogger, and the sessionStorage wrapper so teams can integrate API utilities, logging, and state management consistently.
- Shared a recommended folder layout for fixtures, page objects, and tests to help teams standardise project structure as they adopt the framework.

## Other improvements

- Fix: Intended LocatorSchemaPath string format now fully enforced.
- Add new tests, updated and fixed some existing tests
- CI/CD improvements
