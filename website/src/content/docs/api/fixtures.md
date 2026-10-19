---
title: Fixtures
description: "POMWright's test: Playwright's test with a log fixture, extended with page objects or combined with mergeTests."
---

## test

POMWright's `test` is Playwright's [`test`](https://playwright.dev/docs/api/class-test) with one more
[fixture](https://playwright.dev/docs/test-fixtures), [`log`](#log). Extend it to hand page objects to tests, or
combine it with other fixture modules through
[`mergeTests`](https://playwright.dev/docs/test-fixtures#combine-custom-fixtures-from-multiple-modules).

```ts title="fixtures.ts"
import { test as base } from "pomwright";
import { AccountPage } from "./account.page";
import { LoginPage } from "./login.page";
import { OrdersPage } from "./orders.page";

export { expect } from "@playwright/test";

type PageObjects = {
  loginPage: LoginPage;
  accountPage: AccountPage;
  ordersPage: OrdersPage;
};

export const test = base.extend<PageObjects>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
  ordersPage: async ({ page }, use) => {
    await use(new OrdersPage(page));
  },
});
```

`expect` comes from `@playwright/test`; POMWright does not export it. Guide:
[page objects in tests](/POMWright/docs/page-objects-in-tests/).

---

## Fixtures

### log

A [`PlaywrightReportLogger`](/POMWright/api/class-playwrightreportlogger/) named `TestCase`, one per test. It records
`warn` and `error` entries on a test's first run and every level on a retry. When the test ends, its entries are
attached to the test, one attachment per entry in call order, named with the time and date in Playwright's
[`locale`](https://playwright.dev/docs/api/class-testoptions#test-options-locale) and
[`timezoneId`](https://playwright.dev/docs/api/class-testoptions#test-options-timezone-id).

**Usage**

```ts
import { test } from "pomwright";

test("checkout", async ({ log }) => {
  log.warn("the basket was empty; added the test product");
});
```

**Type**

- [PlaywrightReportLogger](/POMWright/api/class-playwrightreportlogger/)

Guide: [logging to the report](/POMWright/docs/logging/).
