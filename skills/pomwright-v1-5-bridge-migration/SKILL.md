---
name: pomwright-v1-5-bridge-migration
description: >
  Migrate POMWright v1 BasePage page objects to the v1.5 bridge (BasePageV1toV2) as an intermediate
  step toward v2 PageObject. Use when asked to migrate, convert, or upgrade POMWright page objects
  from v1 to the bridge, or when working with BasePageV1toV2. Covers: changing class inheritance,
  translating addSchema/initLocatorSchemas to defineLocators with v2 DSL, updating call-site syntax
  (getLocator, getNestedLocator, getLocatorSchema), and updating filter/index/update/mutation patterns.
---

# POMWright v1.5 Bridge Migration (BasePage -> BasePageV1toV2)

Migrate v1 `BasePage` page objects to `BasePageV1toV2` (the bridge), converting locator definitions
and call-site syntax to v2. The bridge is deprecated and will be removed in 2.0.0; it exists only
as a staged migration step.

## Workflow

1. **Inventory** the target POC file: identify `BasePage` extends, `initLocatorSchemas`, all `addSchema` calls, and call-sites using v1 accessors.
2. **Switch inheritance** from `BasePage` to `BasePageV1toV2`. Constructor signature stays the same (`page, testInfo, baseUrl, urlPath, pocName, pwrl`).
3. **Add `defineLocators()`** method stub.
4. **Translate each `addSchema` call** from `initLocatorSchemas` into `this.add(path).method(...)` inside `defineLocators()`. See [references/schema-translation.md](references/schema-translation.md) for the full mapping table and examples.
5. **Remove translated `addSchema` entries** from `initLocatorSchemas`. Once all are moved, keep `initLocatorSchemas()` as an empty method while still extending `BasePageV1toV2`.
6. **Update call-site syntax** in tests/helpers/fixtures that consume the POC. See [references/call-site-migration.md](references/call-site-migration.md).
7. **Verify** by running tests.

## Key rules

- Paths already registered in `defineLocators` are skipped when the bridge translates `initLocatorSchemas` - no duplicates.
- v1 schemas using `Locator` instances or missing selector fields cannot be auto-translated; rewrite those in `defineLocators` immediately.
- `BasePageV1toV2` narrows `this.locators` to `addSchema` only; no other v1 mutations are exposed.
- v2 accessors (`add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`) are exposed on the bridge and should be used from this point forward.
- v2 `getLocator`/`getNestedLocator` are **synchronous** (no `await`). v1 versions were async.
- v2 `getNestedLocator` no longer accepts index maps. Use `getLocatorSchema(path).nth(subPath, index).getNestedLocator()` instead.
- `filter` replaces v1 `addFilter`. `nth` replaces v1 index maps. Both can be chained in any order.

## References

- **Schema translation mapping**: [references/schema-translation.md](references/schema-translation.md) - GetByMethod -> v2 DSL mapping table, filter/options translation, reusable locators, frameLocator changes
- **Call-site migration**: [references/call-site-migration.md](references/call-site-migration.md) - getLocator, getNestedLocator, getLocatorSchema, update, addFilter, index maps, SessionStorage changes
