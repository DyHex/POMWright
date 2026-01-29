# Logging and TestInfo (v2)

POMWright v2 keeps logging and Playwright `TestInfo` **out of `PageObject` by default**. Use the built-in `log` fixture
when you want logs in the Playwright HTML report, and opt into `log` or `testInfo` on your own page objects when you need
that data.

## Using the built-in log fixture

If you import `test` from `pomwright`, the `log` fixture is available automatically:

```ts
import { test, expect } from "pomwright";

test("can log directly", async ({ page, log }) => {
  log.info("navigating to login");
  await page.goto("https://example.com/login");
  expect(page.url()).toContain("/login");
});
```

## Adding logging to a PageObject (opt-in)

Define your own `log` property and pass a `PlaywrightReportLogger` when constructing the page object. Use a `Paths`
union for locator paths and pass a label when you want a custom name in the log prefix.

```ts
import type { Page } from "@playwright/test";
import { PageObject, type PlaywrightReportLogger } from "pomwright";

type Paths = "main.order" | "main.order.submit";

export class OrderPage extends PageObject<Paths> {
  private readonly log: PlaywrightReportLogger;

  constructor(page: Page, log: PlaywrightReportLogger, options?: { label?: string }) {
    super(page, "https://example.com", "/orders", { label: options?.label ?? "ProductOrderPage" });
    this.log = log.getNewChildLogger(this.label);
  }

  protected defineLocators(): void {
    this.add("main.order").locator("main");
    this.add("main.order.submit").getByRole("button", { name: "Submit" });
  }
}
```

If you do not need a custom label, you can omit it and let `PageObject` use the class name:

```ts
super(page, "https://example.com", "/orders");
```

### Custom fixture wiring for the PageObject

Create a fixture that instantiates the page object and threads the `log` instance through:

```ts
import { test as base } from "pomwright";
import type { Page } from "@playwright/test";

type Paths = "main.order" | "main.order.submit";

class OrderPage extends PageObject<Paths> {
  private readonly log: PlaywrightReportLogger;

  constructor(page: Page, log: PlaywrightReportLogger) {
    super(page, "https://example.com", "/orders", { label: "ProductOrderPage" });
    this.log = log.getNewChildLogger(this.label);
  }

  protected defineLocators(): void {
    this.add("main.order").locator("main");
    this.add("main.order.submit").getByRole("button", { name: "Submit" });
  }
}

type Fixtures = { orderPage: OrderPage };

export const test = base.extend<Fixtures>({
  orderPage: async ({ page, log }, use) => {
    await use(new OrderPage(page, log));
  },
});
```

## Adding TestInfo to a PageObject (opt-in)

Store `TestInfo` yourself when you need it, without coupling it to the base class.

```ts
import type { Page, TestInfo } from "@playwright/test";
import { PageObject } from "pomwright";

type Paths = "main.order";

export class OrderStatusPage extends PageObject<Paths> {
  private readonly testInfo: TestInfo;

  constructor(page: Page, testInfo: TestInfo) {
    super(page, "https://example.com", "/orders");
    this.testInfo = testInfo;
  }

  protected defineLocators(): void {
    this.add("main.order").locator("main");
  }

  get retryCount(): number {
    return this.testInfo.retry;
  }
}
```

## Custom log fixture with Playwright test

If you want to use `@playwright/test` directly (instead of `pomwright`'s exported `test`), you can still create the log
fixture yourself:

```ts
import { test as base } from "@playwright/test";
import { PlaywrightReportLogger, type LogEntry, type LogLevel } from "pomwright";

type Fixtures = { log: PlaywrightReportLogger };

export const test = base.extend<Fixtures>({
  log: async ({}, use, testInfo) => {
    const sharedLogEntry: LogEntry[] = [];
    const sharedLogLevel: { current: LogLevel; initial: LogLevel } =
      testInfo.retry === 0
        ? { current: "warn", initial: "warn" }
        : { current: "debug", initial: "debug" };

    const log = new PlaywrightReportLogger(sharedLogLevel, sharedLogEntry, "TestCase");
    await use(log);
    log.attachLogsToTest(testInfo);
  },
});
```
