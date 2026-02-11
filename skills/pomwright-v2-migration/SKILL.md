---
name: pomwright-v2-migration
description: >
  Migrate POMWright page objects to v2 PageObject from either v1 BasePage or the v1.5 bridge
  (BasePageV1toV2). Use when asked to migrate, convert, or upgrade POMWright page objects to v2,
  or when working with PageObject. Covers: changing class inheritance and constructor signature,
  translating addSchema/initLocatorSchemas to defineLocators with v2 DSL, adding
  pageActionsToPerformAfterNavigation, updating call-site syntax (getLocator, getNestedLocator,
  getLocatorSchema), updating filter/index/update/mutation patterns, migrating fixtures, navigation,
  sessionStorage, logging, and adopting the @step decorator.
---

# POMWright v2 Migration (BasePage / BasePageV1toV2 -> PageObject)

Migrate page objects to `PageObject` from either v1 `BasePage` or the v1.5 bridge `BasePageV1toV2`.
This is the final migration target; `PageObject` is the stable v2 API.

## Determine source version

Before starting, identify which base class the POC currently extends:

| Current base class | Source version | Key differences from v2 |
|---|---|---|
| `BasePage` | v1 | Constructor requires `testInfo`, `pocName`, `PlaywrightReportLogger`; uses `initLocatorSchemas` with `addSchema`; async locator accessors; `addFilter` + index maps |
| `BasePageV1toV2` | v1.5 bridge | Same constructor as v1; may have both `initLocatorSchemas` and `defineLocators`; v2 accessors already available but async removed only partially |

If the source is v1 `BasePage` and has not yet been migrated through the bridge, this skill handles
the direct migration. All schema translation and call-site changes still apply.

## Workflow

1. **Inventory** the target POC file and its consumers (tests, fixtures, helpers that import it).
2. **Migrate the class declaration and constructor.** See [references/class-migration.md](references/class-migration.md).
3. **Migrate locator definitions** into `defineLocators()` using the v2 `add()` DSL. See [references/locator-registration.md](references/locator-registration.md).
4. **Remove `initLocatorSchemas()`** once all schemas are moved to `defineLocators()`.
5. **Add `pageActionsToPerformAfterNavigation()`** (required abstract method). See [references/class-migration.md](references/class-migration.md).
6. **Update call-site syntax** in tests, fixtures, and helpers. See [references/call-site-migration.md](references/call-site-migration.md).
7. **Migrate fixtures and helpers** (navigation, sessionStorage, logging, @step). See [references/fixture-and-helpers.md](references/fixture-and-helpers.md).
8. **Remove v1 imports** (`GetByMethod`, `BasePage`, `BasePageV1toV2`, `BasePageOptions`, `ExtractUrlPathType`, `ExtractBaseUrlType`, `ExtractFullUrlType`, `GetLocatorBase`, `LocatorSchemaWithoutPath`).
9. **Verify** by running tests.

## Key rules

- v2 `PageObject` constructor takes `(page, baseUrl, urlPath, options?)` - no `testInfo`, no `pocName`, no `PlaywrightReportLogger`.
- `pocName` is replaced by `options.label` (defaults to class name, so often omittable).
- `testInfo` and `PlaywrightReportLogger` are no longer injected into PageObject. Use the `log` fixture from `pomwright` instead if logging is needed.
- `defineLocators()` is required; `initLocatorSchemas()` does not exist in v2.
- `pageActionsToPerformAfterNavigation()` is a required abstract method; return `null` or an array of async callbacks.
- v2 `getLocator`/`getNestedLocator`/`getLocatorSchema` are **synchronous** (no `await`).
- v2 `getNestedLocator` does not accept index maps. Use `getLocatorSchema(path).nth(subPath, index).getNestedLocator()` instead.
- `filter` replaces v1 `addFilter`. `nth` replaces v1 index maps. Both can be chained in any order.
- v2 `filter.has`/`filter.hasNot` accept **registry path strings** in addition to Locator instances.
- `navigation` helper is exposed on PageObject: `this.navigation.gotoThisPage()`, `this.navigation.expectThisPage()`, etc.
- `sessionStorage` API changed: boolean parameters replaced by options objects.
- `@step` decorator is available for wrapping methods in Playwright test steps.
- v1 URL type helpers renamed: `ExtractBaseUrlType` -> `BaseUrlTypeFromOptions`, `ExtractUrlPathType` -> `UrlPathTypeFromOptions`, `ExtractFullUrlType` -> `FullUrlTypeFromOptions`. The options shape flattened from `{ urlOptions: { ... } }` to `{ baseUrlType, urlPathType }`.

## References

- **Class migration**: [references/class-migration.md](references/class-migration.md) - Inheritance, constructor, generics, abstract methods, base class hierarchy
- **Locator registration**: [references/locator-registration.md](references/locator-registration.md) - defineLocators, add() DSL mapping, reusable locators, filter/nth at registration, frameLocator changes
- **Call-site migration**: [references/call-site-migration.md](references/call-site-migration.md) - getLocator, getNestedLocator, getLocatorSchema, filter, nth, update, replace, remove, describe
- **Fixtures and helpers**: [references/fixture-and-helpers.md](references/fixture-and-helpers.md) - Fixture setup, navigation helper, sessionStorage, @step decorator, logging
