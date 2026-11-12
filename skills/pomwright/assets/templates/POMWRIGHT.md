# POMWright in this project

How this project uses POMWright. Read it before writing or reviewing tests here, and change it in the same change as
the code when a decision changes. A decision here replaces the default of the `pomwright` agent skill; what it does not
decide follows the skill's defaults.

## Project

- **Apps and origins**: the shop, `SHOP_URL`, read in `env.ts` by the shop's base class.
- **Environments**: each origin's variable is set per environment, locally and in CI.
- **Playwright's `baseURL`**: not set; page code takes its origins from `env.ts`.
- **Layout**: a folder per app in `page-objects/` and `tests/`, a file per app in `fixtures/` and `test-data/`.
- **File names**: `<name>.locators.ts` beside `<name>.page.ts`.
- **Imports**: relative paths.

## POMWright's parts

The parts of POMWright this project uses. Code here uses these and no other part, and Playwright's own API for the rest.

- **`PageObject`**: the base class of every page object; its registry, navigation helper and session storage helper
  come with it.
- **A `LocatorRegistry` of its own** (`createRegistryWithAccessors`): none; every registry is a page object's.
- **`@step`**: on every action and check of the page code.
- **`SessionStorage`**: a page object's `sessionStorage`; a `SessionStorage` of its own only for another origin.
- **The `log` fixture**: `test` from `pomwright`, which the project's fixtures extend.

## Page code

- **Shape**: `PageObject` subclasses, each extending its app's base class.
- **Locators**: a locator module per page; parts every page has as composed modules, registered by the base class.
- **Registrations**: a blank line between each `add` call and each composed module's call.
- **Steps**: every action and check is a `@step()` method, titled `ClassName.methodName`.
- **Assertions**: web-first; a check of a part of the page other tests are likely to check too (an order's status, a
  total) is an `expect…` method of the page code, also while one test uses it; a check only one test makes stays in its
  spec.
- **Parameters**: two or more go in one options object.
- **Logging**: page code takes a child of the `log` fixture only where it logs.
- **`strictChains`**: off.

## Locators and paths

- **Test id attribute**: Playwright's, `data-testid`.
- **Locator preference**: role, label, placeholder, text, alt text, title, test id, id, then CSS; one that matches
  several is narrowed by its options and `filter()` before the next is tried; `nth` last.
- **XPath**: never.
- **Segment names**: `kind@which`. The kind says what the element does, in a word that fits its like: `input` for any
  field, `dropdown` for a select or combobox, `button`, `link`, `checkbox`, `radio`, `dialog`, `header`, `section`,
  `text`. `@which` names what the locator picks by, in a user's words, what it does or is for (`button@login`, not
  `button@submit`; `table@orders` for the table named "Orders"); none for one found without a name (`main.status`),
  nor for rows and cards picked by their data.
- **Plural and singular**: by what a segment matches in its scope: `main.list@products.cards` for several,
  `main.list@products.card` for one.
- **One of several**: a query where it is used; a path of its own when many tests use it, named by what it matches
  (`main.list@products.card@lamp` for one lamp, `main.list@products.cards@lamp` for several); `nth` last.

## Tests

- **Page code in tests**: as fixtures, from one `test` in `fixtures/fixtures.ts` that every spec imports.
- **Test data**: one `testData` fixture, by `testData.<app>.<page>.<case>`, holding values, data imported from files
  (JSON among them), and generators and builders for data a test must not share or a case changes; page code takes
  data as arguments.
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
