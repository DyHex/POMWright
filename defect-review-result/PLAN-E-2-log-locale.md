# Plan 19: the `log` fixture validates `locale` and `timezoneId`

- **Decisions**: [DECISIONS.md](DECISIONS.md) #10
- **Findings**: [E-2](E-logging-step-fixture/defect-E-2-locale-playwright-accepts-fails-log-fixture.md) (Medium); test
  gap #4
- **Bump**: patch
- **Stop**: no
- **Depends on**: nothing in order; before plan 34 (E-4's docs edit the same doc comment)

## Contract

The `log` fixture checks Playwright's `locale` and `timezoneId` when it is set up, with Node's `Intl` (`new
Intl.DateTimeFormat(locale, { timeZone })`); `""` and `undefined` mean no value, as for Playwright, and use the default.
An invalid value fails the test at once with a message naming the option and the value, and a hint to write it with
hyphens when it contains `_`, for example `log fixture: locale "en_US" is not a BCP 47 language tag; write it with
hyphens, such as "en-US"` and `log fixture: timezoneId "Invalid/Zone" is not a time zone Node's Intl knows` (final
wording from a probe). `attachLogsToTest` called directly checks the same and gives the same message instead of a raw
`RangeError`. No list of locales is kept.

## Current behaviour

`src/fixture/base.fixtures.ts:33-45` passes `locale` and `timezoneId` to `attachLogsToTest` at teardown;
`src/helpers/playwrightReportLogger.ts:293-310` formats with `toLocaleTimeString(locale, { timeZone })`, which throws a
`RangeError` for `en_US` or an unknown zone, at teardown and only when something was logged (sometimes only on a
retry). Playwright passes the string to the browser unchecked; underscore forms work in Chromium only
(`…-probes/R/walkthrough/locale/locales.out`).

## Steps

1. `playwrightReportLogger.ts`: an internal `checkDateFormat(locale, timeZone, source)` that treats `""` as `undefined`,
   constructs `Intl.DateTimeFormat`, and maps its `RangeError` to the messages above (`source` names the caller: `log
   fixture` or `attachLogsToTest`); `attachLogsToTest` calls it first and uses the checked values (`""` → `undefined`).
2. `base.fixtures.ts`: the fixture calls the check before `use(log)`, so a bad value fails at setup.
3. `attachLogsToTest`'s doc comment `@throws` and the fixture's comment.
4. **Tests**: unit (`src/helpers/playwrightReportLogger.test.ts`): well-formed (`en-US`, `nb-NO`), `""`, `EN-us`, an
   underscore form (with the hint), a malformed tag, an invalid time zone, through the check and through
   `attachLogsToTest`; a harness spec in `test/tests/logging/` where `test.use({ locale: "en_US" })` with `log` fails at
   setup with the message (`test.fail()`, the message asserted through the AGENTS.md §3 file hand-over if needed), and
   `""` and `EN-us` pass.
5. **Docs**: *Logging to the report*, *Names in your locale*: the value is a BCP 47 tag, checked when the fixture starts;
   `api/errors.md`: the two messages; `api/class-playwrightreportlogger.md`, `attachLogsToTest` **Throws**; AGENTS.md §5,
   the logger sentence (`locale` and `timezoneId` checked at the fixture's setup).
6. **Changeset** `log-locale-check.md` (`patch`): "The `log` fixture checks Playwright's `locale` and `timezoneId` when a
   test starts and fails with a message naming the value, instead of a `RangeError` at teardown once something was
   logged." With the trade-off: a test that requests `log`, never logs and has `locale: "en_US"` now fails; write the
   tag with hyphens.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
fix: the log fixture checks locale and timezoneId when a test starts

Playwright passes locale to the browser unchecked, so "en_US" works in
Chromium only, and the log fixture failed with a RangeError at teardown,
only once something was logged. It now checks both with Node's Intl at
setup and names the value, with a hint for underscore tags.

Plan: defect-review-result/PLAN-E-2-log-locale.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
