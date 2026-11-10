# The log fixture, child loggers and @step

What POMWright adds to Playwright's report: a `log` fixture whose entries are attached to the test, and `@step`, which
turns a method into a report step. Full rules: [Logging](https://dyhex.github.io/POMWright/docs/logging/) and
[Test steps](https://dyhex.github.io/POMWright/docs/test-steps/).

## Contents

- [The log fixture](#the-log-fixture)
- [Child loggers: where an entry came from](#child-loggers-where-an-entry-came-from)
- [A log fixture of your own](#a-log-fixture-of-your-own)
- [@step](#step)

## The log fixture

POMWright's `test` is Playwright's `test` with one more fixture, `log`, so a project's fixtures extend it
(`import { test as base } from "pomwright"`) or merge it with `mergeTests`. Each entry becomes an attachment of the test,
in the order logged, named with the time and date (in Playwright's `locale` and `timezoneId`), the level and the
logger's name.

- Levels `debug`, `info`, `warn`, `error`. The fixture records `warn` and `error` on a test's first run and every level
  on a retry, so a passing test stays quiet and a failing test's retry records everything.
- A message and every string are attached as written; other values as `console.log` prints them, nested data two
  levels deep (pass `JSON.stringify(data, null, 2)` for all of it).
- `locale` must be a BCP 47 tag, `en-US`, not `en_US`: the fixture checks it when the test starts.

## Child loggers: where an entry came from

Logging from page objects is an option, for the cases where a report should show which page object, helper or utility
an entry came from. A page object that logs takes the test's `log` in its constructor and keeps a child named after
itself; it can hand children of its own to the functions it calls, and they to theirs, so even a deeply nested entry
names its whole path. A child shares its parent's entries and level.

```ts
import type { Locator, Page } from "@playwright/test";
import { PageObject, type PlaywrightReportLogger, step } from "pomwright";

async function fillCard(field: Locator, card: string, log: PlaywrightReportLogger) {
  log.debug(`filling the card ending ${card.slice(-4)}`); // named [TestCase -> CheckoutPage -> fillCard]
  await field.fill(card);
}

export class CheckoutPage extends PageObject<"main" | "main.input@cardNumber"> {
  private readonly log: PlaywrightReportLogger;

  constructor(page: Page, log: PlaywrightReportLogger) {
    super(page, "https://shop.example", "/checkout");
    this.log = log.getNewChildLogger(this.label);
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.input@cardNumber").getByLabel("Card number");
  }

  @step()
  async pay(options: { card: string }) {
    this.log.info("paying"); // named [TestCase -> CheckoutPage]
    const field = this.getNestedLocator("main.input@cardNumber");
    await fillCard(field, options.card, this.log.getNewChildLogger("fillCard"));
  }
}
```

Its fixture passes the test's logger: `checkoutPage: async ({ page, log }, use) => { await use(new CheckoutPage(page, log)); }`.
A page object that does not log takes no logger.

## A log fixture of your own

Write a `log` fixture only to use the logger with Playwright's own `test`, or to change which levels are recorded or
attached; extending POMWright's `test` gives the same fixture otherwise. Pass `locale` and `timezoneId` on, as
POMWright's does:

```ts
import { test as base } from "@playwright/test";
import { type LogEntry, type LogLevel, PlaywrightReportLogger } from "pomwright";

export const test = base.extend<{ log: PlaywrightReportLogger }>({
  log: async ({ locale, timezoneId }, use, testInfo) => {
    const level: LogLevel = testInfo.retry === 0 ? "warn" : "debug";
    const entries: LogEntry[] = [];
    const log = new PlaywrightReportLogger({ current: level, initial: level }, entries, "TestCase");
    await use(log);
    log.attachLogsToTest(testInfo, { locale, timeZone: timezoneId });
  },
});
```

## @step

`@step()` wraps a method in Playwright's `test.step`, titled `ClassName.methodName` after the class of the object it
runs on, so an inherited method shows the subclass's name. It takes what `test.step` takes after its body:
`@step("Pay with the test card")`, `@step({ box: true })` (an error points at the line that called the method),
`@step("Wait for the receipt", { timeout: 10_000 })`.

- Only methods that return a Promise: TypeScript rejects `@step` on any other.
- A step is reported at the line that called and awaited the method; await page-object calls where they are made.
- A configuration used in many classes is stored once: `export const boxedStep: StepDecorator = step({ box: true });`,
  then `@boxedStep`.
- Standard decorators and `experimentalDecorators` both work.
