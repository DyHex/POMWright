# Project structure

A layout for a Playwright project with POMWright that works for one app and grows to several without moving files,
the templates that start it, and the direction imports flow. The site's version:
[Organizing a project](https://dyhex.github.io/POMWright/docs/organizing-a-project/#a-folder-layout).

## Contents

- [The layout](#the-layout)
- [Starting a project from the templates](#starting-a-project-from-the-templates)
- [One app, several apps, a monorepo](#one-app-several-apps-a-monorepo)
- [The direction of imports](#the-direction-of-imports)

## The layout

Each app has a folder of its own in `page-objects/` and `tests/`, and a file of its own in `fixtures/` and
`test-data/`, from the start, so a second app is a sibling, not a move:

```text
env.ts                                  the origins, from the environment
POMWRIGHT.md                            the project's decisions (guides/project-decisions.md)
playwright.config.ts                    projects for the browsers; no baseURL unless POMWRIGHT.md opts in
fixtures/
  fixtures.ts                           the test every spec imports: the fixture files, merged
  shop.fixtures.ts                      the shop's page objects, one fixture each
  test-data.fixtures.ts                 the testData fixture
test-data/
  test-data.ts                          testData.<app>.<page>.<case>
  shop.test-data.ts
page-objects/
  shop/
    common/
      shop.page.ts                      the shop's base class: origin, navigation defaults, common locators
      page-components/
        common.locators.ts              what every page of the shop has, composed
        header.locators.ts
        dialog.<name>.locators.ts       one module per dialog
    pages/                              one folder per URL path, a page below another inside it
      home.locators.ts, home.page.ts
      account/
        account.locators.ts, account.page.ts
        orders/
          orders.locators.ts, orders.page.ts
tests/
  shop/                                 the shop's tests, following its pages
    home.spec.ts
    features/                           a feature that spans several pages
```

A page whose path has a parameter (`/account/orders/42`) sits in a folder named after it (`orders/[orderId]/`) and has
a RegExp `urlPath`.

## Starting a project from the templates

The templates in `assets/templates/` are this layout with one app, the shop, and one page; each compiles against
POMWright 3.x. To start a project:

1. Start from a Playwright project (`npm init playwright@latest`), then add POMWright
   (`npm install --save-dev pomwright`).
2. Write `POMWRIGHT.md` from the template, with the user's decisions (`guides/project-decisions.md`). The templates
   follow the defaults; where a decision differs, adapt them to it as you copy them.
3. Copy the templates into the project, keeping their paths, and rename the app: `shop` in folder and file names,
   `ShopPage`, `shopUrl` and `SHOP_URL` in [env.ts](../assets/templates/env.ts) and the base class.
4. Set the origin in the environment, or the fallback in `env.ts`.
5. Replace the home page with the app's own pages, one at a time (`guides/writing-page-objects.md`), and the common
   locators with the app's header, footer and dialogs (`guides/locator-modules.md`).
6. Run `npx tsc --noEmit`, then `npx playwright test`.

The templates import each other by relative paths, which work in any project. A project that prefers path aliases
(`@page-objects/*`, `@fixtures/*`) adds them to its `tsconfig.json` and rewrites the imports.

## One app, several apps, a monorepo

- **One app**: the layout above. The site shows a flatter variant (`page-objects/common/` and `page-objects/pages/`
  without an app folder) for a suite that will only ever test one app.
- **Several apps in one Playwright project**: a folder per app in `page-objects/` and `tests/`, a file per app in
  `fixtures/` and `test-data/`; each app has its own base class with its own origin from `env.ts`, and its own fixtures
  file, merged into `fixtures.ts`. Helpers every app shares go in `page-objects/common/`; tests of a flow that crosses
  apps go in `tests/e2e/`.
- **A monorepo with several Playwright packages**: a shared workspace package holds what they share (fixtures, helpers,
  locator modules of shared widgets, a base Playwright config), with `pomwright` and `@playwright/test` as peer
  dependencies, and each app's package has its own page objects, test data and tests on top of it.

Each app's origin lives in `env.ts`, which the base classes read. A project that opts in to Playwright's `baseURL`
sets it from the same value, for one app (`guides/project-decisions.md`).

The layout holds any shape of page code (`guides/choosing-a-shape.md`): an own class or a function sits where a page
object would, in `<name>.page.ts` beside `<name>.locators.ts`.

## The direction of imports

```text
tests -> fixtures -> page objects -> locator modules
              \-> test data
```

Specs import `test` (and `expect`) from `fixtures/fixtures.ts`. Fixtures import page objects and test data. Page objects
import their locator modules, their base class, and Playwright's `expect` from `@playwright/test`. Nothing imports
upward: a page object that imported the fixtures would import itself, and test data imported by a page object would
make the page object a copy of one test's case.
