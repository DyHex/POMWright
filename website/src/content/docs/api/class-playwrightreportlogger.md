---
title: PlaywrightReportLogger
description: "A logger whose entries are attached to the test's report, one attachment per entry; levels, child loggers, LogEntry and LogLevel."
---

A `PlaywrightReportLogger` records entries at a level and attaches them to the test's report, one
[attachment](https://playwright.dev/docs/api/class-testinfo#test-info-attach) per entry, in the order they were logged.
The [`log` fixture](/POMWright/api/fixtures/) gives every test one, named `TestCase`, starting at `warn` on the first
run and at `debug` on a retry. A child logger has a name of its own and shares its parent's entries and level.

```ts
import { test } from "pomwright";

test("checkout", async ({ log }) => {
  log.warn("the basket was empty; added the test product");
  // attachment: 11:39:57 PM 10/16/2026 - WARN : [TestCase]
});
```

Guide: [logging to the report](/POMWright/docs/logging/).

---

## Constructor

### new PlaywrightReportLogger()

Creates a root logger, for a fixture of your own; the `log` fixture creates one per test. The level and the entries
are objects that the logger and its children share and change.

**Usage**

```ts
import { type LogEntry, PlaywrightReportLogger } from "pomwright";

const entries: LogEntry[] = [];
const log = new PlaywrightReportLogger({ current: "warn", initial: "warn" }, entries, "TestCase");
```

**Arguments**

- `sharedLogLevel` Object
  - `current` [LogLevel](#loglevel): the level entries are recorded at.
  - `initial` [LogLevel](#loglevel): the level `resetLogLevel()` goes back to.
- `sharedLogEntry` [LogEntry](#logentry)[]

  The array the entries are recorded in, in call order.

- `contextName` string

  The logger's name in attachment names.

---

## Methods

### attachLogsToTest()

Attaches the recorded entries to the test, one attachment per entry in call order, each body exactly as logged:
`application/json` when the message is a JSON object or array, `text/plain` otherwise. Each name is the time, the
date, the level and the logger's name. The `log` fixture calls it when the test ends; call it in a fixture of your
own.

**Usage**

```ts
import { test as base } from "@playwright/test";
import { PlaywrightReportLogger } from "pomwright";

export const test = base.extend<{ log: PlaywrightReportLogger }>({
  log: async ({ locale, timezoneId }, use, testInfo) => {
    const log = new PlaywrightReportLogger({ current: "warn", initial: "warn" }, [], "TestCase");
    await use(log);
    log.attachLogsToTest(testInfo, { locale, timeZone: timezoneId });
  },
});
```

**Arguments**

- `testInfo` [TestInfo](https://playwright.dev/docs/api/class-testinfo)
- `format` Object *(optional)*
  - `locale` string *(optional)*
  - `timeZone` string *(optional)*

  The locale and time zone of the time and date in the names, as `toLocaleTimeString` takes them; the `log` fixture
  passes Playwright's [`locale`](https://playwright.dev/docs/api/class-testoptions#test-options-locale) and
  [`timezoneId`](https://playwright.dev/docs/api/class-testoptions#test-options-timezone-id). Without them, the
  machine's.

**Returns**

- void

### debug()

Records a `debug` entry when the current level is `debug`. See [`warn()`](#warn) for what is recorded.

**Arguments**

- `message` string
- `...args` any[]

### error()

Records an `error` entry; `error` is the highest level, so it is always recorded. See [`warn()`](#warn).

**Arguments**

- `message` string
- `...args` any[]

### getCurrentLogLevel()

**Returns**

- [LogLevel](#loglevel): the level entries are recorded at.

### getCurrentLogLevelIndex()

**Returns**

- number: the current level's position in `["debug", "info", "warn", "error"]`, `0` for `debug`.

### getNewChildLogger()

Creates a child logger named after this one and `prefix`. It shares this logger's entries and level: changing the
level on any logger of the tree changes it for all of them.

**Usage**

```ts
import type { PlaywrightReportLogger } from "pomwright";

declare const log: PlaywrightReportLogger;
// ---cut---
const checkoutLog = log.getNewChildLogger("CheckoutPage");
checkoutLog.warn("paying with the test card"); // named [TestCase -> CheckoutPage]
```

**Arguments**

- `prefix` string

**Returns**

- PlaywrightReportLogger

### info()

Records an `info` entry when the current level is `info` or lower. See [`warn()`](#warn).

**Arguments**

- `message` string
- `...args` any[]

### isCurrentLogLevel()

**Arguments**

- `level` [LogLevel](#loglevel)

**Returns**

- boolean: whether `level` is the current level.

### isLogLevelEnabled()

Returns whether an entry at `level` would be recorded, for code that should only do work when its entry is.

**Usage**

```ts
import type { PlaywrightReportLogger } from "pomwright";

declare const log: PlaywrightReportLogger;
declare const cartText: () => Promise<string | null>;
// ---cut---
if (log.isLogLevelEnabled("debug")) log.debug("cart", await cartText());
```

**Arguments**

- `level` [LogLevel](#loglevel)

**Returns**

- boolean: whether `level` is the current level or above.

### resetLogLevel()

Sets the level back to the one the test started with, `sharedLogLevel.initial`: for the `log` fixture, `warn` on a
first run and `debug` on a retry.

**Returns**

- void

### setLogLevel()

Sets the level entries are recorded at, for this logger and every logger of its tree, until it is set or reset again.

**Usage**

```ts
import type { PlaywrightReportLogger } from "pomwright";

declare const log: PlaywrightReportLogger;
// ---cut---
log.setLogLevel("debug"); // from here on, everything for this test
```

**Arguments**

- `level` [LogLevel](#loglevel)

**Returns**

- void

### warn()

Records a `warn` entry when the current level is `warn` or lower. The message and every further string are attached
exactly as written; any other value as `console.log` prints it (Node's `util.inspect`); the parts are separated by a
blank line. Data nested deeper than two levels prints as `[Object]`; pass `JSON.stringify(data, null, 2)` for all of
it.

**Usage**

```ts
import type { PlaywrightReportLogger } from "pomwright";

declare const log: PlaywrightReportLogger;
// ---cut---
log.warn("order", { id: 7, total: 42 });
// order
//
// { id: 7, total: 42 }
```

**Arguments**

- `message` string
- `...args` any[]

  Further values, attached after the message.

**Returns**

- void

---

## LogEntry

One recorded entry, attached to the test as one attachment.

### logLevel

[LogLevel](#loglevel): the level it was logged at.

### message

string: the message and the further arguments, as attached, separated by a blank line.

### prefix

string: the name of the logger that logged it, `TestCase` or `TestCase -> CheckoutPage`.

### timestamp

Date: when it was logged, in the test process.

## LogLevel

`"debug" | "info" | "warn" | "error"`, lowest first. A logger records an entry at its current level or above.
