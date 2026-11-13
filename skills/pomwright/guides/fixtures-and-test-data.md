# Fixtures and test data

How page objects, test data and helpers reach tests: as Playwright [fixtures](https://playwright.dev/docs/test-fixtures),
from one `test` every spec imports. The templates in `assets/templates/fixtures/` and `assets/templates/test-data/`
show all of it.

## Contents

- [Page objects as fixtures](#page-objects-as-fixtures)
- [Several fixture files, one test](#several-fixture-files-one-test)
- [Test data through one fixture](#test-data-through-one-fixture)
- [Page objects that log](#page-objects-that-log)
- [Setup that only some tests need](#setup-that-only-some-tests-need)

## Page objects as fixtures

One fixture per page object, extending POMWright's `test`, which brings the `log` fixture. Playwright creates a fixture
only for the tests that ask for it, a new one for each test, on that test's `page`, so the page objects a test uses act
in one browser tab:

```ts title="shop.fixtures.ts"
import type { Page } from "@playwright/test";
import { PageObject, test as base } from "pomwright";

class HomePage extends PageObject<"main"> {
  constructor(page: Page) {
    super(page, "https://shop.example", "");
  }
  protected defineLocators(): void {
    this.add("main").getByRole("main");
  }
}

export const test = base.extend<{ homePage: HomePage }>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
});
```

A page object built in a fixture that has a registry mistake fails the test before its body runs, naming every path at
fault.

## Several fixture files, one test

Each app has a fixtures file; `fixtures.ts` merges them with Playwright's `mergeTests`, and custom matchers with
`mergeExpects`, and re-exports `expect`, so a spec imports both from one place. See the templates'
[fixtures.ts](../assets/templates/fixtures/fixtures.ts).

## Test data through one fixture

The recommended approach, and the user's choice: a project's `POMWRIGHT.md` may decide otherwise (data modules each
spec imports, values in the specs, a fixture per kind of data). All test data reaches tests through one `testData`
fixture, organized by dot paths, `testData.<app>.<page>.<case>`, page specific data included: one place to find, change
and review it, instead of imports spread over page objects and specs. Page objects take data as arguments and import
none.

What sits at a path is whatever the case needs:

- **a value**, read-only through `as const`, so no test changes what another reads;
- **values from a file**: another module, or a JSON file the test-data module imports (`resolveJsonModule` in the
  TypeScript config; in a project with `"type": "module"` the import takes `with { type: "json" }`, which a CommonJS
  project's `tsc` rejects);
- **a generator**, a function that returns fresh data each call, for data a test must not share with another (a new
  customer each run), called in the test;
- **a builder**, a function that returns the default with what a case changes, so a case states only its difference;
- **a helper** the data uses, such as a date some days ahead, formatted as the app shows it.

```ts title="test-data.ts"
import { randomUUID } from "node:crypto";

type Delivery = { postcode: string; email: string };

const happyForm: Readonly<Delivery> = { postcode: "0150", email: "ada@shop.example" };

export const testData = {
  shop: {
    checkout: {
      happyForm,
      // a builder: the happy form, with what a case changes
      form: (changes: Partial<Delivery> = {}): Delivery => ({ ...happyForm, ...changes }),
      // a generator: a new customer each call, so no two tests share one
      newCustomer: () => ({ email: `customer-${randomUUID()}@shop.example` }),
    },
  },
} as const;
```

```ts title="test-data.fixtures.ts"
import { test as base } from "pomwright";
import { testData } from "./test-data";

export const test = base.extend<{ testData: typeof testData }>({
  // a value, not a function: the same read-only data for every test
  testData,
});
```

A test asks for `testData` and passes what it needs to a page object's method:
`await checkoutPage.fillDelivery(testData.shop.checkout.happyForm)`, or a case's difference,
`await checkoutPage.fillDelivery(testData.shop.checkout.form({ postcode: "9990" }))`.

- Data the app must hold before a test (an order to cancel) is created by a fixture of its own, through the app's API
  with Playwright's [`request`](https://playwright.dev/docs/api-testing), and handed to the test; the test data holds
  what the fixture sends.
- `test.use({ testData })` replaces the whole fixture for a file. Data that differs per environment is chosen in the
  test-data module from the same environment `env.ts` reads, or per project with a Playwright
  [option fixture](https://playwright.dev/docs/test-parameterize#parameterized-projects).

## Page objects that log

A page object that logs takes the test's `log` in its constructor and keeps a child logger
(`references/reports.md`); its fixture passes it:
`checkoutPage: async ({ page, log }, use) => { await use(new CheckoutPage(page, log)); }`. A page object that does not
log takes only the page.

## Setup that only some tests need

A fixture runs for every test that asks for it, so setup some tests do not want belongs elsewhere: in the test, or in
a page object's method it calls. A session storage `seed` especially: one still waiting when a test ends fails that
test, so seed where the test navigates (`references/session-storage.md`). Authentication follows Playwright's
[setup project and storageState](https://playwright.dev/docs/auth); values the app keeps in session storage, which
`storageState` does not hold, are seeded per test.
