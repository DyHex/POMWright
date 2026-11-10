# POMWright in this project

How this project uses POMWright. Read it before writing or reviewing tests here, and change it in the same change as
the code when a decision changes. A decision here replaces the default of the `pomwright` agent skill.

## Project

- **Apps and origins**: the shop, `SHOP_URL`, read in `env.ts` by the shop's base class.
- **Playwright's `baseURL`**: not set; page code takes its origins from `env.ts`.
- **Layout**: a folder per app in `page-objects/`, `fixtures/`, `test-data/` and `tests/`.
- **File names**: `<name>.locators.ts` beside `<name>.page.ts`.
- **Imports**: relative paths.

## Page code

- **Shape**: `PageObject` subclasses, each extending its app's base class.
- **Locators**: a locator module per page; parts every page has as composed modules, registered by the base class.
- **Steps**: every action and check is a `@step()` method.
- **Parameters**: two or more go in one options object.
- **Logging**: page code takes a child of the `log` fixture only where it logs.
- **`strictChains`**: off.

## Locators and paths

- **Locator preference**: Playwright's order: role, text, label, placeholder, alt text, title, then test id or id;
  CSS last.
- **Segment names**: `kind@which`, the kind being the element's role (`button@save`, `dialog@consent`).
- **Plural and singular**: by what a segment matches in its scope: `main.list@products.cards` for several,
  `main.list@products.card` for one.
- **One of several**: a query where it is used; a path of its own when many tests use it, singular
  (`main.list@products.card@lamp`); `nth` last.

## Tests

- **Page code in tests**: as fixtures, from one `test` in `fixtures/fixtures.ts` that every spec imports.
- **Test data**: one `testData` fixture, by `testData.<app>.<page>.<case>`; page code takes data as arguments.
