# POMWright

[![CI on main](https://img.shields.io/github/actions/workflow/status/DyHex/POMWright/main.yaml?branch=main&label=CI%20on%20main)](https://github.com/DyHex/POMWright/actions/workflows/main.yaml)
[![Docs](https://img.shields.io/badge/docs-dyhex.github.io%2FPOMWright-2ea44f)](https://dyhex.github.io/POMWright/)
[![npm version](https://img.shields.io/npm/v/pomwright)](https://www.npmjs.com/package/pomwright)
[![npm downloads](https://img.shields.io/npm/d18m/pomwright)](https://www.npmjs.com/package/pomwright)
[![Playwright peer dependency](https://img.shields.io/npm/dependency-version/pomwright/peer/%40playwright%2Ftest)](https://www.npmjs.com/package/@playwright/test)
[![Node version](https://img.shields.io/node/v/pomwright)](https://nodejs.org/)
[![License](https://img.shields.io/github/license/DyHex/POMWright)](https://github.com/DyHex/POMWright/blob/main/LICENSE)
[![Created at ICE](https://img.shields.io/badge/created%40-ICE-ffcd00)](https://www.ice.no/)

POMWright is a TypeScript library for [Playwright Test](https://playwright.dev/) that organises a suite's locators
and page objects. You register one locator per dot-delimited path, such as `main.form@login.button@login`, with
Playwright's own methods, and POMWright builds the Playwright locator chain from the locators of the path's segments.
A page object registers its locators and checks them as it is created, so a mistake in a locator fails the fixture
before the test body runs.

**Documentation: https://dyhex.github.io/POMWright/**

## What it adds to Playwright

- **Locator chains from paths.** Playwright recommends chaining locators, so that each element is found inside the one
  it belongs to. POMWright builds those chains: `getNestedLocator("main.form@login.button@login")` resolves to
  `locator('main').getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })`, and the trace viewer
  and the report show the path. Paths are checked at compile time and at run time.
- **Page objects that check themselves.** `PageObject` registers its locators once and checks every path right after it
  is created: a filter that names a path that does not exist, a cycle, a frame segment in the wrong place. From its URL
  it gets `goto`, `expectThisPage` and `expectAnotherPage`, each one Playwright call with Playwright's waits.
- **Changes for one use.** `getLocatorSchema(path)` returns a copy of a path's chain to filter, index, patch or replace
  for one test; the registered locator never changes.
- **Session storage.** Playwright's `page.sessionStorage` with codecs, report steps and `seed`, which stores entries
  before the app's first script reads them.
- **Reports.** A `log` fixture whose entries are attached to the test's report, and `@step`, which turns a method into
  a report step.

Each part can be used on its own. POMWright does not replace Playwright's API, runner or assertions: locators are
Playwright `Locator`s, and `@playwright/test` is a peer dependency.

## Installation

```bash
npm install --save-dev pomwright
```

POMWright 3 needs `@playwright/test` 1.64 or later (below 2) and Node 20 or later.

## Example

A page object names its paths, passes its URL, and registers a locator per path:

```ts
// login.page.ts
import type { Page } from "@playwright/test";
import { PageObject, step } from "pomwright";

type Paths =
  | "main"
  | "main.form@login"
  | "main.form@login.input@email"
  | "main.form@login.input@password"
  | "main.form@login.button@login";

export class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/login");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.form@login").getByRole("form", { name: "Log in" });
    this.add("main.form@login.input@email").getByLabel("Email");
    this.add("main.form@login.input@password").getByLabel("Password");
    this.add("main.form@login.button@login").getByRole("button", { name: "Log in" });
  }

  @step()
  async logIn(email: string, password: string) {
    await this.getNestedLocator("main.form@login.input@email").fill(email);
    await this.getNestedLocator("main.form@login.input@password").fill(password);
    await this.getNestedLocator("main.form@login.button@login").click();
  }
}
```

Tests receive it as a Playwright fixture:

```ts
// login.spec.ts
import { test as base } from "pomwright";
import { LoginPage } from "./login.page";

const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

test("a registered customer can log in", async ({ loginPage }) => {
  await loginPage.navigation.goto();
  await loginPage.logIn("ada@shop.example", "correct horse");
  await loginPage.navigation.expectAnotherPage(); // the login page sends the customer on
});
```

[Getting started](https://dyhex.github.io/POMWright/docs/installation/) walks through this example step by step.

## Documentation

- [Getting started](https://dyhex.github.io/POMWright/docs/installation/): installation, a first page object, page
  objects as fixtures, organising a project
- [API reference](https://dyhex.github.io/POMWright/api/): every export and member, and every error message
- [Upgrading from 2.x](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/): every change in 3.0.0 a 2.x project
  meets, and what to write instead
- [Internal](https://dyhex.github.io/POMWright/internal/): how POMWright works

Using POMWright 2.x? Its documentation is in this repository at the
[`v2.1.0` tag](https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v2).

## Support

If you run into issues or have questions, please use the
[GitHub issues page](https://github.com/DyHex/POMWright/issues).

## Contributing

Pull requests are welcome. [AGENTS.md](./AGENTS.md) is the contributor guide: the repository, the commands, the
conventions, and how the tests and the documentation are checked.

## License

POMWright is open-source software licensed under [Apache-2.0](./LICENSE).
