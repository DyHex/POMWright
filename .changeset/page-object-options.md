---
"pomwright": minor
---

### Features

- `PageObjectOptions<Options>`, the type of the `PageObject` constructor's options (`label`, `navOptions`,
  `sessionStorage`, `locators`), and `LocatorRegistryOptions`, the type of `createRegistryWithAccessors`'s second
  parameter and of `locators`, are exported, so a domain base class forwards the options by name instead of restating
  their shape. No migration.
- A seeded override of any strategy may be called with no argument and keeps the seed's definition, as `update()` does
  (`add(path, { reuse: seed }).getByRole()`); only `frameLocator()` compiled before.
