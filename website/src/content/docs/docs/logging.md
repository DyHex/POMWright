---
title: Logging to the report
description: "The log fixture and PlaywrightReportLogger: levels that rise on a retry, child loggers for page objects, and one report attachment per entry."
---

## Introduction

Playwright's report shows a test's steps, errors and [attachments](https://playwright.dev/docs/api/class-testinfo#test-info-attach).
POMWright's `log` fixture adds a logger whose entries become attachments of the test that logged them, one per entry,
in the order they were logged. It is part of POMWright's `test` (see
[Page objects in tests](/POMWright/docs/page-objects-in-tests/#pomwrights-test-and-the-log-fixture)).

```ts
import { test } from "pomwright";

test("checkout", async ({ log, page }) => {
  await page.goto("https://shop.example/checkout");
  log.warn("the basket was empty; added the test product");
});
```

The attachment is named with the time, the date, the level and the logger's name, and holds the message:

```text
11:39:57 PM 10/16/2026 - WARN : [TestCase]
```

## Levels

The levels are `debug`, `info`, `warn` and `error`. A logger records an entry at its current level or above. The `log`
fixture starts at `warn` on a test's first run and at `debug` on a retry, so a test that passes stays quiet, and a
failing test's retry records everything:

```ts
import { test } from "pomwright";

test("levels", async ({ log }) => {
  log.debug("recorded on a retry");
  log.info("recorded on a retry");
  log.warn("always recorded");

  log.setLogLevel("debug"); // from here on, everything for this test
  log.resetLogLevel(); // back to where the test started
});
```

`getCurrentLogLevel()`, `isCurrentLogLevel(level)` and `isLogLevelEnabled(level)` read the level, for code that should
only do work when its entry would be recorded.

## What is attached

The message and every further string are attached exactly as written; any other value is printed the way
`console.log` prints it (Node's `util.inspect`). The parts are separated by a blank line:

```ts
import { test } from "pomwright";

test("what is attached", async ({ log }) => {
  log.warn("checkout failed\n  step: payment"); // as written, two lines
  log.warn("order", { id: 7, total: 42 });
  // order
  //
  // { id: 7, total: 42 }
  log.error("submit failed", new Error("timeout")); // the error's message and stack
});
```

As with `console.log`, data nested more than two levels deep prints as `[Object]`; for all of it, pass
`JSON.stringify(data, null, 2)`, which is attached as written. A message that is a JSON object or array on its own
(`log.warn(JSON.stringify(payload))`) is attached as `application/json`, everything else as `text/plain`.

## Names in your locale

The time and date in an attachment's name use Playwright's [`locale`](https://playwright.dev/docs/api/class-testoptions#test-options-locale)
and [`timezoneId`](https://playwright.dev/docs/api/class-testoptions#test-options-timezone-id) options, so they follow
your configuration. With `use: { locale: "nb-NO", timezoneId: "Europe/Oslo" }`:

```text
23:39:57 16.10.2026 - WARN : [TestCase]
```

The time is taken in the test process: Playwright's [clock](https://playwright.dev/docs/clock) changes the page's time,
not the logger's.

## Child loggers

A child logger has a name of its own and shares its parent's entries and level, so a page object can log under its own
name into the test's log:

```ts
import type { Page } from "@playwright/test";
import { PageObject, type PlaywrightReportLogger } from "pomwright";

export class CheckoutPage extends PageObject<"main"> {
  private readonly log: PlaywrightReportLogger;

  constructor(page: Page, log: PlaywrightReportLogger) {
    super(page, "https://shop.example", "/checkout", { label: "CheckoutPage" });
    this.log = log.getNewChildLogger("CheckoutPage");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
  }

  async pay() {
    this.log.warn("paying with the test card"); // named [TestCase -> CheckoutPage]
  }
}
```

Its fixture passes the test's `log`: `checkoutPage: async ({ page, log }, use) => use(new CheckoutPage(page, log))`.
Changing the level on any logger of the tree changes it for all of them.

## Your own fixture

To use the logger with Playwright's own `test`, create the fixture yourself:

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

`attachLogsToTest(testInfo, { locale, timeZone })` attaches the entries; without the second argument it uses the
machine's locale and time zone.

## Reference

- [`PlaywrightReportLogger`](/POMWright/api/class-playwrightreportlogger/), [the `log` fixture](/POMWright/api/fixtures/)
- Playwright: [`testInfo.attach()`](https://playwright.dev/docs/api/class-testinfo#test-info-attach),
  [Fixtures](https://playwright.dev/docs/test-fixtures)
