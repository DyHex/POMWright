# PlaywrightReportLogger

`PlaywrightReportLogger` records log messages during a test and attaches them to Playwright's HTML report.  All POMWright fixtures and classes share the same log level and entry list for the duration of a test.

## Log levels

`debug`, `info`, `warn`, `error`

Changing the level affects every child logger because they reference the same state.

## Creating and using loggers

The `@fixtures/*` test fixtures expose a `log` instance.  Child loggers add context to messages without losing shared state:

```ts
import { test } from "@fixtures/withoutOptions";

test("logging", async ({ log }) => {
  const pageLog = log.getNewChildLogger("LoginPage");
  pageLog.info("filling form");
});
```

Inside a Page Object the constructor typically receives the root logger and creates a child:

```ts
constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
  super(page, testInfo, baseUrl, urlPath, MyPage.name, pwrl);
  // this.log is already a child logger for MyPage
}
```

## Attaching to the report

At the end of each test the fixture calls `attachLogsToTest(testInfo)`.  Entries are sorted by timestamp and attached to the Playwright report with the prefix and log level:

```text
20:49:52 05.05.2023 - INFO : [TestCase -> LoginPage] navigating to /login
```

You can change verbosity during a test:

```ts
log.setLogLevel("debug");
```

or temporarily:

```ts
const level = log.getCurrentLogLevel();
log.setLogLevel("error");
// ...
log.setLogLevel(level);
```

The logger is lightweight but powerful enough to trace locator chains or custom helper behaviour while keeping the information in the final HTML report.
