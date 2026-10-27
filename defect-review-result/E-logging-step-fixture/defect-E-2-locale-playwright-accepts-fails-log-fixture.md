# E-2: A `locale` that Playwright accepts but Node's `Intl` rejects (`"en_US"`, `""`) makes the `log` fixture fail the test with a `RangeError` once anything is logged

- **Kind**: defect
- **Area**: the `log` fixture and `attachLogsToTest` (inventory §2 *Logging, steps and the fixture*, "named in
  Playwright's `locale` and `timezoneId`")
- **Severity**: Medium (a passing test fails, on every browser, for a configuration Playwright runs without complaint;
  `en_US`, the POSIX spelling, is a plausible way to write a locale. The message, `RangeError: Incorrect locale
  information provided` at `attachLogsToTest`, does not say which value or option is wrong. A test that records nothing
  passes, so the failure can appear only on a retry, when `debug` and `info` entries start to be recorded)
- **Semver of the fix**: patch (the fixture's documented job is to name the attachments in Playwright's locale; failing
  the test instead is a hole in that contract, and no documented behaviour changes)
- **Reviewed**: `54cdada`, 2026-10-23, Claude (claude-opus-5-5), scope E
- **Status**: decided: fix, option 4 (2026-10-26, [DECISIONS.md #10](../DECISIONS.md)): validate `locale` and
  `timezoneId` with Node's `Intl` at the fixture's setup and fail with a clear message; no normalising

## Contract

- `src/fixture/base.fixtures.ts:13-17` (doc comment of `test`): "`log`: a `PlaywrightReportLogger` named `TestCase`,
  whose entries are attached to the test's report when it ends, named in Playwright's `locale` and `timezoneId`."
- `website/src/content/docs/docs/logging.md`, *Names in your locale*: "The time and date in an attachment's name use
  Playwright's `locale` and `timezoneId` options, so they follow your configuration."
- `website/src/content/docs/api/class-playwrightreportlogger.md`, `attachLogsToTest()`: "The locale and time zone of the
  time and date in the names, as `toLocaleTimeString` takes them; the `log` fixture passes Playwright's `locale` and
  `timezoneId`."
- No page says that the `log` fixture can fail a test, or that `locale` must be a tag Node's `Intl` accepts.

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/E/logger/locale.spec.ts`, run by `logger/run.sh` (copies it
to `test/tests/zz-probe-E-locale.spec.ts`, runs it with the harness config, removes it); the browser is set in
`run.sh`'s `--project=`:

```ts
import { test as playwright } from "@playwright/test";
import { test } from "pomwright";

for (const [name, t] of [["playwright", playwright], ["pomwright", test]] as const) {
	t.describe(`${name}, use locale en_US`, () => {
		t.use({ locale: "en_US" });
		t("opens a page", async ({ page }) => {
			await page.goto("http://localhost:9000/");
			console.log(`${name}: navigator.language = ${await page.evaluate(() => navigator.language)}`);
		});
	});
}

test.describe("pomwright, use locale en_US, a warn entry", () => {
	test.use({ locale: "en_US" });
	test("opens a page and logs a warning", async ({ page, log }) => {
		await page.goto("http://localhost:9000/");
		log.warn("the page is open");
	});
	test("logs only at info: recorded on a retry only", async ({ page, log }) => {
		await page.goto("http://localhost:9000/");
		log.info("the page is open");
	});
});
```

```sh
# from /home/magdys/workspace/dyhex/POMWright-final-review-probes/E/logger, once per browser
# (run.sh's --project= edited to chromium, firefox, webkit in turn)
bash run.sh locale.spec.ts --workers=1 --retries=1
```

Exit code 1 on each browser. The same failure with `locale: ""` (`logger/timezone.spec.ts`, chromium, exit 1).

Node itself (`logger/timeFormat.mjs`, run with Node 20.20.2, 22.18.0 and 24.22.0, output in `timeFormat.out`):

```text
v20.20.2 "en_US": RangeError: Incorrect locale information provided
v20.20.2 "": RangeError: Incorrect locale information provided
v20.20.2 "nb_NO": RangeError: Incorrect locale information provided
```

(the same on 22 and 24).

## Observed / expected

Chromium (firefox the same; webkit reports `navigator.language = en_US`):

```text
playwright: navigator.language = en-US
  ✓  1 [chromium] › ... › playwright, use locale en_US › opens a page (743ms)
pomwright: navigator.language = en-US
  ✓  2 [chromium] › ... › pomwright, use locale en_US › opens a page (670ms)
  ✘  3 [chromium] › ... › pomwright, use locale en_US, a warn entry › opens a page and logs a warning (893ms)
  ✘  4 [chromium] › ... › opens a page and logs a warning (retry #1) (864ms)
  ✓  5 [chromium] › ... › logs only at info: recorded on a retry only (783ms)
    RangeError: Incorrect locale information provided
        at _PlaywrightReportLogger.attachLogsToTest (.../node_modules/pomwright/dist/index.js:273:39)
        at Object.log (.../node_modules/pomwright/dist/index.js:312:9)
```

Playwright runs the page in that locale on all three browsers (Chromium and Firefox read it as `en-US`), and the test
body passes; POMWright's `log` fixture then fails the test in its teardown. Expected: the test passes and the
attachments are named in that locale (as `en-US` here), or, where the value cannot be used at all, in a fallback, never
a failed test.

An invalid `timezoneId` is not in this class: Playwright rejects it itself (`browserContext.newPage: Invalid timezone
ID: Invalid/Zone`), and the fixture's `RangeError: Invalid time zone specified` for a test without a page reports the
same configuration error.

## Cause

`src/helpers/playwrightReportLogger.ts:294-309`: `attachLogsToTest` passes the `locale` straight to
`Date.prototype.toLocaleTimeString` and `toLocaleDateString`, which throw `RangeError` for a tag that is not well-formed
BCP 47 (`en_US`, `""`). Browsers are more lenient, so Playwright's `locale` option accepts values that Node's `Intl`
rejects. The fixture (`src/fixture/base.fixtures.ts:45`) calls it unguarded in its teardown. Unchanged since 3.0.0
(`git diff v3.0.1 54cdada -- src/helpers/playwrightReportLogger.ts src/fixture/base.fixtures.ts` is empty); 2.x
hard-coded `nb-NO` and could not fail this way, so a 2.x project with `locale: "en_US"` starts failing on upgrade.

## Fix plan

Per AGENTS.md §6, to be confirmed before any code changes.

- **Intended contract**: the `log` fixture never fails a test because of the `locale` value: a locale `Intl` accepts
  names the attachments; one written with underscores is read as the same tag with hyphens; any other the runtime
  rejects falls back to the machine's locale. A `timeZone` keeps failing as it does now, since Playwright rejects an
  invalid one too (or falls back as well: a decision).
- **Options**:
  1. *(recommended)* Resolve the locale once per `attachLogsToTest` call: try `Intl.DateTimeFormat(locale)`; on
     `RangeError` try `locale.replaceAll("_", "-")`; on a second `RangeError` use `undefined`. Build the two formatters
     once instead of calling `toLocale*String` per entry (also cheaper). Patch.
  2. Catch the `RangeError` and fall back straight to `undefined`: simpler, but `en_US` would then be named in the
     machine's locale, not in US English as the browser used.
  3. Docs only (`none`): say on *Names in your locale* that `locale` must be a tag Node accepts. Leaves the failing test.
- **Implementation steps**: a `resolveLocale(locale)` beside `attachLogsToTest` in
  `src/helpers/playwrightReportLogger.ts`; `attachLogsToTest` formats with `Intl.DateTimeFormat` instances made from it.
- **Tests**: unit tests in `src/helpers/playwrightReportLogger.test.ts` for `"en_US"` (named as `en-US`), `""` and a
  malformed tag (named in the default locale, no throw); a harness spec in `test/tests/logging/logging.spec.ts` with
  `test.use({ locale: "en_US" })` and a `page`, chromium is enough (the formatting runs in Node).
- **Docs**: `docs/logging.md` *Names in your locale* (one sentence on the fallback); the `attachLogsToTest` doc comment
  and its API entry (`format.locale`).
- **Changeset**: patch. "The `log` fixture no longer fails a test whose `locale` Playwright accepts but Node's `Intl`
  rejects, such as `en_US`: such a locale is read with hyphens, or the attachment names fall back to the machine's
  locale."
- **Decisions to tick**:
  - [x] Normalise underscores before falling back (option 1) or fall back at once (option 2): neither. **Option 4**
    (added in the walkthrough): Playwright neither validates nor normalises `locale` (it passes the string to the
    browser, `playwright/lib/index.js:321-322`); underscore forms work in Chromium only (its ICU), Firefox formats
    `en_US` and `nb_NO` as en-GB and WebKit `nb_NO` as en-US, and Chromium fails `newPage` on `"en US"`, `"enUS"` and
    `"garbage!!"` (`/home/magdys/workspace/dyhex/POMWright-final-review-probes/R/walkthrough/locale/locales.out`). Node's
    `Intl` accepts exactly the well-formed BCP 47 tags, the ones that work in every browser, so it is the validator; no
    list is kept. The `log` fixture checks `locale` and `timezoneId` at **setup** (`""` and `undefined` mean no locale,
    as for Playwright) and fails at once with a message naming the option and the value (with a hyphen hint when the
    value contains `_`); `attachLogsToTest` called directly gives the same message instead of the raw `RangeError`.
  - [x] Whether an invalid `timeZone` falls back too, or keeps failing as Playwright does: it fails, at setup, with a
    clear message.
  - [x] (added) Tests: unit tests for well-formed, `""`, underscore, malformed and invalid time zone values; a harness
    spec where `en_US` with `log` fails at setup with the message, and `""` and `EN-us` pass (closing test gap #4).
  - [x] (added) Docs: *Names in your locale* (a BCP 47 tag), the two messages on `errors.md`, `attachLogsToTest`'s doc
    comment and API **Throws**. A new patch changeset.
- **Execution order**: independent of E-1 and of the other logger findings.
