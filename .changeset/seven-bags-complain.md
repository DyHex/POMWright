---
"pomwright": patch
---

# Continuous testing & bug fixes

## Bug fixes

- getLocatorBase.applyUpdate() now correctly updates the LocatorSchemaWithMethod and maintains a circular ref. for the entry representing itself in schemasMap
- getLocatorBase.applyUpdates() now correctly updates the LocatorSchemaWithMethod and maintains a circular ref. for the entry representing itself in schemasMap while updating other LocatorSchema in SchemasMap directly.
- getLocatorBase.deepMerge() now correctly validates valid nested properties of LocatorSchema

## Continuous testing

- Build workflow now runs unit tests (vitest)
- New shell script enabling testing new packages before release
- New test workflow for POMWright integration tests (Playwright/test)
- 52 new unit tests, more to come..
- 4 new integration tests, more to come..

New release has also been tested with a seperate Playwright/test project leveraging POMWright (~100 E2E tests)

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
