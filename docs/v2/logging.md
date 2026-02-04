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
  log: async ({}, use, testInfo) => {
    const log = new PlaywrightReportLogger(sharedLogLevel, sharedLogEntry, "TestCase");
    await use(log);
    log.attachLogsToTest(testInfo);
  },
});
```

`attachLogsToTest`:

- Sorts entries by timestamp.
- Tries to parse JSON messages for structured display.
- Attaches each log entry as a separate report attachment.

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

## v1 to v2 differences

- v1 BasePage embedded a logger automatically; v2 does not.
- v2 provides logging as a Playwright fixture and a standalone logger class.

For migration guidance, see `docs/v1-to-v2-migration`.
