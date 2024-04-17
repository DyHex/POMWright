# pomwright

## 1.0.1

### Patch Changes

- [#23](https://github.com/DyHex/POMWright/pull/23) [`0cfc19f`](https://github.com/DyHex/POMWright/commit/0cfc19f057575365853f9df41bbd661bf45172e2) Thanks [@DyHex](https://github.com/DyHex)! - # Continuous testing & bug fixes

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

## 1.0.0

### Major Changes

- 130784f: BREAKING: The following index.ts exports have been renamed:

  - "POMWright" changed to "BasePage"
  - "POMWrightTestFixture" changed to "test"
  - "POMWrightLogger" changed to "PlaywrightReportLogger"
  - "POMWrightGetLocatorBase" changed to "GetLocatorBase"
  - "POMWrightApi" changed to "BaseApi"

  Documentation updated

  README updated

## 0.0.9

### Patch Changes

- 7e8b7d1: removes an abstract method from POMWright/BasePage which should have been removed previously

## 0.0.8

### Patch Changes

- 0d4924e: adds additional inforamtion to package.json and shields in readme

## 0.0.7

### Patch Changes

- 5b7ed8a: Update README

## 0.0.6

### Patch Changes

- 8c2af7d: fix: ensure base fixture log follows playwright's api

## 0.0.5

### Patch Changes

- 0c96ab7: Add Biome for linting and formatting
- 0c96ab7: Move indices with default value to the end of arguments for buildNestedLocator

## 0.0.4

### Patch Changes

- f2fea3b: add codeowners

## 0.0.3

### Patch Changes

- fa2a954: adds release script to package.json

## 0.0.2

### Patch Changes

- 1e5433a: Adds changeset to repository
