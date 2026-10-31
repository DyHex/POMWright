---
"pomwright": patch
---

The `log` fixture checks Playwright's `locale` and `timezoneId` when a test starts and fails with a message naming the value, such as `log fixture: locale "en_US" is not a BCP 47 language tag; write it with hyphens, such as "en-US"`, instead of a `RangeError` at teardown once something was logged. `attachLogsToTest` checks the same before it attaches anything. A test that requests `log`, never logs and runs with `locale: "en_US"` now fails too: write the tag with hyphens, which every browser accepts. A POSIX name such as `en_US.UTF-8`, as `LANG` holds it, gets the hint `"en-US"`; one with a modifier, such as `sr_RS@latin`, gets none, since the modifier can change the script.
