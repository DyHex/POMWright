---
"pomwright": minor
---

# v1.5 Bridge Release

## Summary

POMWright **v1.5** is a bridge release. It ships the legacy v1 API and the redesigned v2 API side-by-side so teams can migrate at their own pace.

For projects continuing to use only v1 patterns, upgrading from **v1.4 → v1.5** should require no behavioral changes by default. Migration starts when you opt into v2 APIs.

## Philosophy and Motivation

The v2 redesign preserves the original POMWright principles from v1 (typed path-based locator modeling and automatic locator chaining), while modernizing the architecture around:

- better composability,
- clearer public API boundaries,
- stronger validation/error handling,
- and **Playwright-native ergonomics**.

The Playwright-native API shape (`getByRole`, `locator`, `filter`, `nth`, etc.) makes adoption easier for teams already fluent in Playwright, reducing cognitive overhead while improving long-term maintainability in larger test suites.

## Migration Documentation

- [v1 to v2 comparison](../docs/v1-to-v2-migration/v1-to-v2-comparison.md)
- [Direct migration guide](../docs/v1-to-v2-migration/direct-migration-guide.md)
- [Bridge migration guide](../docs/v1-to-v2-migration/bridge-migration-guide.md)

## v2 documentation

- [v2 Overview](../docs/v2/overview.md)
- [v2 PageObject](../docs/v2/PageObject.md)
- [v2 Locator Registry](../docs/v2/locator-registry.md)
- [v2 Composing Locator Modules](../docs/v2/composing-locator-modules.md)
- [v2 Session Storage](../docs/v2/session-storage.md)
- [v2 Logging](../docs/v2/logging.md)

---

## What changes when moving from v1 to v2

> Important: These are migration-time changes. They do **not** affect users who remain on v1 usage patterns in v1.5.

### 1) Base class and architecture

- **v1**: `BasePage` is the core abstraction and requires `Page`, `testInfo`, and `PlaywrightReportLogger`.
- **v2**: `PageObject` is slimmer and composes navigation, locator registry accessors, and session storage without hard-coupling `testInfo` or logger.

### 2) Modular adoption (“cherry-pick” usage)

v2 does not force inheritance from `PageObject`.

Adopters can use only what they need:

- `LocatorRegistry` (via `createRegistryWithAccessors`)
- `SessionStorage`
- `step` decorator
- logging fixture/logger
- or `PageObject` as a convenience composition.

### 3) Locator definitions: schema objects → fluent builder DSL

- **v1**: `addSchema(path, { locatorMethod, ... })` + `GetByMethod` enum + `LocatorSchemaWithoutPath`.
- **v2**: `add(path).getByRole(...).filter(...).nth(...).describe(...)`.

This redesign improves readability and aligns locator registration with native Playwright style.

### 4) Retrieval API behavior

- Conceptually preserved: `getLocator` (terminal) vs `getNestedLocator` (full chain).
- **v1** retrieval was async.
- **v2** retrieval is synchronous.

### 5) Step handling (`filter` + `nth`) is significantly more expressive

- **v1**: filters could be chained, but indexing behavior was constrained and applied after filter composition.
- **v2**:
  - `filter` and `nth` are both first-class steps,
  - steps are applied in exact chain order,
  - no practical chain-limit restrictions,
  - `nth` can be set at registration time and query time,
  - `filter has/hasNot` accepts both Playwright locators and registry path references.

### 6) FrameLocator semantics are explicit and safer

- **v1** cast `FrameLocator` to `Locator` for compatibility.
- **v2** handles frame segments explicitly:
  - non-terminal frame segments continue resolution inside frame context,
  - terminal frame segments resolve to frame owner locator.

### 7) Mutation model redesign

- **v1**: `update(...)` + `addFilter(...)` on schema clones.
- **v2** separates concerns:
  - definition ops: `update`, `replace`, `remove`
  - step ops: `filter`, `nth`, `clearSteps`
  - locator annotation: `describe`

This improves intent clarity and reduces accidental side effects.

### 8) Reuse model upgrade

- **v1** reuse centered around shared `LocatorSchemaWithoutPath` objects.
- **v2** introduces:
  - typed reusable seeds (`createReusable`),
  - controlled typed overrides,
  - reuse-by-path cloning.

This reduces duplication while improving type guidance and safety.

### 9) Navigation helper (new in v2)

`PageObject.navigation` is URL-type aware:

- string fullUrl support includes `goto`, `gotoThisPage`, `expectThisPage`, `expectAnotherPage`.
- RegExp fullUrl support narrows to assertion-oriented methods (`expectThisPage`, `expectAnotherPage`).

### 10) SessionStorage evolution

SessionStorage is not removed; it is redesigned and strengthened:

- context-aware operations (`waitForContext`),
- key-targeted clear,
- clearer option signatures.

### 11) Logging decoupling

- v1 tightly coupled logger usage through base class constructor patterns.
- v2 keeps logging available but optional; `PageObject` does not force logger coupling.

### 12) Step decorator (new in v2)

v2 introduces a `@step` decorator for wrapping POM methods in `test.step` with typed arguments and returns.

### 13) Error handling and validation improvements

v2 strengthens diagnostics and safety across registry operations:

- stricter path validation (compile-time + runtime alignment),
- improved sub-path validation,
- better reuse guardrails,
- explicit filter reference constraints,
- filter cycle detection,
- clearer frame/filter misuse errors.

---

## Breaking / Behavioral Notes (migration-scoped)

The following apply when adopting v2 APIs:

- retrieval methods are synchronous,
- v1 nested index-map style is replaced by ordered `nth(...)` steps,
- `addFilter(...)` is replaced by `filter(...)`,
- frame handling semantics are explicit (terminal frame resolves to owner locator),
- built-in `data-cy` selector engine behavior from v1 is removed from framework defaults,
- `BaseApi` is not part of v2.

---

## Additional improvements worth mentioning

- Cleaner public/internal API boundary for registry internals.
- Functional-friendly factory (`createRegistryWithAccessors`) for dependency injection and non-class usage.
- Clone-based query mutation semantics that avoid mutating canonical registry state.
- Better migration support via bridge mechanisms and v1 schema translation helpers.
- Better docs structure for v2 and migration workflows.

## skills

In the repository ./skills folder you can find AI assistant migration skills to help upgrade POMWright page objects from v1 to v2. These skills provide step-by-step guidance for migrating BasePage to the v1.5 bridge (BasePageV1toV2) or directly to v2 PageObject.

> **Important:** Use at your own discretion. These migration skills are an optional aid intended to reduce manual effort when moving POMWright page objects from v1 to v2. They offer practical guidance for common migration paths, but they cannot account for every project-specific variation, custom abstraction, or edge case in existing v1 implementations. Treat them as a helpful starting point—not a guaranteed or complete migration solution. Always review and validate AI-generated changes before using them.

## Bridge Positioning Statement

POMWright v1.5 is intentionally designed to let teams keep shipping on v1 while preparing migration to v2. The release provides both a staged bridge path and a direct migration path, with no forced v1 behavior changes unless v2 APIs are adopted.
