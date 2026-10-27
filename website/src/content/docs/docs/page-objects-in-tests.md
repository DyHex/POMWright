---
title: Page objects in tests
description: "Hand page objects to tests as Playwright fixtures, add POMWright's log fixture, and see how a broken page object fails the test."
---

## Introduction

Playwright gives each test what it needs through [fixtures](https://playwright.dev/docs/test-fixtures): `page`,
`context`, and anything you add with `test.extend`. Its fixtures guide turns page objects into fixtures, and so does
POMWright: a test asks for `loginPage` and receives a page object for its own page. Every example on this site that
runs in a test gets its page objects this way.

**You will learn**

- How to make a page object a fixture
- How POMWright's `test` adds a `log` fixture
- How to combine fixtures from several files
- What a test shows when a page object has a mistake in its locators

## A page object as a fixture

Extend Playwright's `test` with one fixture per page object. The fixture creates the page object on the test's `page`
and hands it to the test:

```ts
import { test as base } from "@playwright/test";
import { LoginPage } from "./login.page";

export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

Playwright creates a fixture only for the tests that ask for it, and a new one for every test, so every test has its
own page object on its own page. Creating one is cheap.

## POMWright's `test` and the `log` fixture

POMWright exports `test`: Playwright's `test` with one more fixture, `log`, a logger whose entries are attached to the
test's report (see [Logging](/POMWright/docs/logging/)). Extend it instead of Playwright's to have both:

```ts title="fixtures.ts"
import { test as base } from "pomwright";
import { AccountPage } from "./account.page";
import { LoginPage } from "./login.page";

export { expect } from "@playwright/test";

type PageObjects = {
  loginPage: LoginPage;
  accountPage: AccountPage;
};

export const test = base.extend<PageObjects>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
});
```

Each page object is a fixture of its own. The file also re-exports Playwright's `expect`, so a test that asserts imports
both from one place. A test imports `test` from that file and asks for the fixtures it uses:

```ts title="login.spec.ts"
import { test } from "./fixtures";

test("a registered customer can log in", async ({ loginPage, accountPage, log }) => {
  await loginPage.navigation.goto();
  await loginPage.logIn("ada@shop.example", "correct horse");
  log.info("logged in as ada@shop.example");

  await accountPage.navigation.expectThisPage();
});
```

`loginPage` and `accountPage` are created on the same `page`, the test's, so the test acts on the login page and then
waits on the account page in one browser tab.

The `log` fixture records `warn` and `error` entries on a test's first run, and every level on a retry, so this `info`
entry shows up when the test is retried; see [Logging](/POMWright/docs/logging/#levels).

## Fixtures from several files

When page objects live in their own fixture modules, Playwright's
[`mergeTests`](https://playwright.dev/docs/test-fixtures#combine-custom-fixtures-from-multiple-modules) combines them,
POMWright's `test` included:

```ts
import { mergeTests, test as base } from "@playwright/test";
import { test as pomwright } from "pomwright";
import { LoginPage } from "./login.page";

const pageObjects = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

export const test = mergeTests(pomwright, pageObjects);
```

## When a page object has a mistake

A page object registers its locators and checks them right after it is constructed, so a mistake that TypeScript
cannot see, such as a path in the union that was never registered but is used in a filter, fails in the fixture. The
test fails before its body runs, with the page object's name, every path that failed, and the line that created the
page object, the fixture's `new`, in the stack. Here `LoginPage` finds its form as the one that contains the login heading,
`locator("form").filter({ has: "main.form@login.heading" })`, and the heading's path is in its union, but
`defineLocators()` never registers it:

```text
Error: LoginPage: Locator registry verification failed for 1 of 5 paths:
  "main.form@login": No locator schema registered for path "main.form@login.heading".
```

[Verifying a registry](/POMWright/docs/verifying-registries/) lists what the check finds, and
[Page objects](/POMWright/docs/page-objects/) what a page object built in `beforeEach` or `beforeAll` does instead.

## What's next

- [Organising a project](/POMWright/docs/organising-a-project/): a base class for your page objects, and locator
  modules
- [Principles](/POMWright/docs/principles/): the ideas POMWright is built on
