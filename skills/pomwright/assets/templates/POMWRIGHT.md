# POMWright in this project

How this project uses POMWright. Read it before writing or reviewing tests here, and change it in the same change as
the code when a decision changes. A decision here replaces the default of the `pomwright` agent skill; what it does not
decide follows the skill's defaults.

## Project

- **Apps and origins**: the shop, `SHOP_URL`, read in `env.ts` by the shop's base class.
- **Environments**: each origin's variable is set per environment, locally and in CI.
- **Playwright's `baseURL`**: not set; page code takes its origins from `env.ts`.
- **Layout**: a folder per app in `page-objects/`, `fixtures/`, `test-data/` and `tests/`.
- **File names**: `<name>.locators.ts` beside `<name>.page.ts`.
- **Imports**: relative paths.

## Page code

- **Shape**: `PageObject` subclasses, each extending its app's base class.
- **Locators**: a locator module per page; parts every page has as composed modules, registered by the base class.
- **Steps**: every action and check is a `@step()` method, titled `ClassName.methodName`.
- **Assertions**: web-first, in specs; a check several specs repeat is an `expect…` method of the page code.
- **Parameters**: two or more go in one options object.
- **Logging**: page code takes a child of the `log` fixture only where it logs.
- **`strictChains`**: off.

## Locators and paths

- **Test id attribute**: Playwright's, `data-testid`.
- **Locator preference**: Playwright's order: role, text, label, placeholder, alt text, title, then test id or id;
  CSS last.
- **Segment names**: `kind@which`, the kind being the element's role (`button@save`, `dialog@consent`).
- **Plural and singular**: by what a segment matches in its scope: `main.list@products.cards` for several,
  `main.list@products.card` for one.
- **One of several**: a query where it is used; a path of its own when many tests use it, named by what it matches
  (`main.list@products.card@lamp` for one lamp, `main.list@products.cards@lamp` for several); `nth` last.

## Tests

- **Page code in tests**: as fixtures, from one `test` in `fixtures/fixtures.ts` that every spec imports.
- **Test data**: one `testData` fixture, by `testData.<app>.<page>.<case>`; page code takes data as arguments.
- **State a test needs and does not test**: set up directly: a login by Playwright's setup project and `storageState`,
  session storage seeded with `seed` before the app loads.
- **Overlays**: a predictable one by a step or a precondition; one that appears at random by
  `page.addLocatorHandler()`.

## Checks

- **While working**: `npx tsc --noEmit`, then the specs the change touches on one browser project, then every project.
- **Lint and format**: none.

## Agents

- **Model and effort**: the agent session's own, for every task.
- **Tasks with another model or effort**: none.
- **Tasks done by a subagent**: none; the session does every task itself.
