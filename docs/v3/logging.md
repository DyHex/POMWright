# Logging (v2)

## Overview

POMWright v2 provides a `PlaywrightReportLogger` class and a `test` fixture that attaches log entries to the Playwright HTML report. The logger:

- Supports `debug`, `info`, `warn`, and `error` levels.
- Shares log entries and log level across child loggers created from the same root.
- Attaches logs to the Playwright report when a test finishes.

---

## The `test` fixture

POMWright exports a `test` fixture that injects a `log` instance.

```ts
import { test, expect } from "pomwright";

test("logs are attached to the HTML report", async ({ page, log }) => {
  log.info("navigating to login");
  await page.goto("https://example.com/login");
  expect(page.url()).toContain("/login");
});
```

### Fixture behavior

The fixture uses a shared log level and shared log entry list within a single test:

- On the first run, the default level is `warn`.
- On retries, the default level is `debug`.

At the end of each test, it attaches log entries to the HTML report in timestamp order.

---

## `PlaywrightReportLogger` class

### Constructor

```ts
const log = new PlaywrightReportLogger(sharedLogLevel, sharedLogEntry, contextName);
```

In normal usage you do **not** construct this directly; use the `test` fixture and derive child loggers as needed.

### Log methods

```ts
log.debug("debug message");
log.info("info message");
log.warn("warning message");
log.error("error message");
```

Log entries include:

- Timestamp
- Log level
- Prefix (context name)
- Message

The message and any further string arguments are kept exactly as you write them: newlines, indentation and tabs
show in the report as written. Every other argument is printed the way `console.log` prints it (Node's
`util.inspect`), so objects, arrays, errors (with their stack) and Playwright locators are readable. The parts are
separated by a blank line.

```ts
log.warn("checkout failed\n  step: payment\n  retry: 2");   // attached as written, three lines

log.warn("order", { id: 7, total: 42 });
// order
//
// { id: 7, total: 42 }

log.error("submit failed", new Error("timeout"));   // the error's message and stack
log.info("row", page.getByRole("row").nth(2));       // row … getByRole('row').nth(2)
```

As with `console.log`, data nested deeper than two levels prints as `[Object]`. For all of it, or for JSON you can
copy from the report, stringify it yourself; the string is attached as written:

```ts
const order = { id: 7, lines: [{ sku: "A" }] };
log.info("order", JSON.stringify(order, null, 2));
// order
//
// {
//   "id": 7,
//   "lines": [
//     {
//       "sku": "A"
//     }
//   ]
// }
```

A message that is a JSON object or array on its own (`log.info(JSON.stringify(payload))`) is attached as
`application/json`, everything else as `text/plain`; the body is the message as written either way.

### Child loggers

Create a child logger for additional context.

```ts
const pageLog = log.getNewChildLogger("LoginPage");
pageLog.info("starting login flow");
```

Child loggers share:

- The same log level
- The same log entry list

Changing the log level on any child affects all loggers in the tree.

### Log level control

```ts
log.setLogLevel("debug");
log.getCurrentLogLevel();
log.resetLogLevel();
log.isCurrentLogLevel("warn");
log.isLogLevelEnabled("info");
```

---

## Attaching logs to the report

When used with the fixture, logs are attached automatically:

```ts
export const test = base.extend({
  log: async ({ locale, timezoneId }, use, testInfo) => {
    const log = new PlaywrightReportLogger(sharedLogLevel, sharedLogEntry, "TestCase");
    await use(log);
    log.attachLogsToTest(testInfo, { locale, timeZone: timezoneId });
  },
});
```

`attachLogsToTest(testInfo, { locale?, timeZone? })`:

- Attaches each log entry as a separate attachment of the test that logged it, in the order the entries were logged.
- Names each attachment `<time> <date> - <LEVEL> : [<prefix>]`, the time and date in the given locale and time zone.
  The `log` fixture passes Playwright's `locale` and `timezoneId` options, so the names follow your configuration:
  with none, Playwright's default locale `en-US` and the machine's time zone
  (`08:19:55 AM 10/15/2026 - INFO : [TestCase]`); with `use: { locale: "nb-NO" }` the 2.x form
  (`08:19:55 15.10.2026 - INFO : [TestCase]`). Called without the second argument, it uses the machine's locale and
  time zone.
- Attaches the body exactly as logged, as `application/json` when the message is a JSON object or array.

The timestamps are taken in the test process: Playwright's clock API (`page.clock`) changes the page's time, not
theirs. A test that fakes `Date` in Node itself (for example with fake timers) gets fake timestamps.

---

## Using logging inside page objects

`PageObject` does **not** embed a logger in v2. If you want log support, you can pass a child logger into your POM or create a small wrapper.

```ts
class LoginPageWithLogging extends LoginPage {
  constructor(page: Page, private log: PlaywrightReportLogger) {
    super(page);
  }

  async loginAsUser(user: User) {
    this.log.info(`logging in as ${user.username}`);
    await super.loginAsUser(user);
  }
}
```

---

## Custom log fixture with Playwright test

If you want to use `@playwright/test` directly (instead of `pomwright`'s exported `test`), you can still create the log
fixture yourself:

```ts
import { test as base } from "@playwright/test";
import { PlaywrightReportLogger, type LogEntry, type LogLevel } from "pomwright";

type Fixtures = { log: PlaywrightReportLogger };

export const test = base.extend<Fixtures>({
  log: async ({ locale, timezoneId }, use, testInfo) => {
    const sharedLogEntry: LogEntry[] = [];
    const sharedLogLevel: { current: LogLevel; initial: LogLevel } =
      testInfo.retry === 0
        ? { current: "warn", initial: "warn" }
        : { current: "debug", initial: "debug" };

    const log = new PlaywrightReportLogger(sharedLogLevel, sharedLogEntry, "TestCase");
    await use(log);
    log.attachLogsToTest(testInfo, { locale, timeZone: timezoneId });
  },
});
```

---

## v1 to v2 differences

- v1 BasePage embedded a logger automatically; v2 does not.
- v2 provides logging as a Playwright fixture and a standalone logger class.

For migration guidance, see `docs/v1-to-v2-migration`.

---

## Changes in 3.0.0

- Messages and string arguments are attached as written: 2.x appended a blank line to every message and re-formatted
  JSON messages.
- Other arguments print as `console.log` prints them; 2.x printed objects as `[object Object]`.
- Attachment names follow Playwright's `locale` and `timezoneId` instead of a fixed `nb-NO`. Set
  `use: { locale: "nb-NO" }` for the 2.x names, or pass a locale to `attachLogsToTest` in a custom fixture.
- Entries are attached in the order they were logged, without sorting.
