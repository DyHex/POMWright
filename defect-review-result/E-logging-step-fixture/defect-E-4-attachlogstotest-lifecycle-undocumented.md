# E-4: What `attachLogsToTest` does on a second call, and to entries logged after it, is undocumented: a second call attaches every entry again, and a later entry is dropped without notice

- **Kind**: documentation
- **Area**: `PlaywrightReportLogger.attachLogsToTest` and the `log` fixture's teardown (inventory §2 *Logging, steps and
  the fixture*; §4 *Logger: entries collected during the test, attached at teardown by the fixture*)
- **Severity**: Low (two plausible surprises, neither documented: a user who calls `attachLogsToTest` themselves while
  using POMWright's `test` gets every entry twice; an entry logged after the `log` fixture's teardown is lost silently.
  Nothing wrong happens in the documented flow)
- **Semver of the fix**: none (docs only); patch for option 2 below
- **Reviewed**: `54cdada`, 2026-10-23, Claude (claude-opus-5-5), scope E
- **Status**: decided: docs only, with an outcome-based fixture example; the redesign drafted as a breaking issue (2026-10-26, [DECISIONS.md #41](../DECISIONS.md))

## Contract

- `src/helpers/playwrightReportLogger.ts:274-278` (doc comment) and `api/class-playwrightreportlogger.md`,
  `attachLogsToTest()`: "Attaches the recorded entries to the test, one attachment per entry in call order [...]. The
  `log` fixture calls it when the test ends; call it in a fixture of your own."
- `api/class-playwrightreportlogger.md` summary and `docs/logging.md` *Introduction*: entries become attachments "one
  per entry, in the order they were logged".
- `api/fixtures.md`, `log`: "whose entries are attached to the test when it ends".
- Nothing says whether a second call attaches the earlier entries again, or what happens to an entry logged after the
  call (or after the test ends).

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/E/logger/logger.spec.ts`, tests 3 and 4. An auto fixture
`printer`, set up before `log` and so torn down after it, prints every attachment named `... : [TestCase...]`; a
fixture `late` that does not depend on `log` is handed the logger by the test and logs in its teardown; `usesLog`
depends on `log` and logs in its teardown; a `test.afterEach` logs too.

```ts
test("3 attachLogsToTest called in the test too", async ({ log }, testInfo) => {
	log.warn("once");
	log.attachLogsToTest(testInfo);
});

test("4 teardown: late fixture set up before log, a fixture using log, afterEach", async ({ late, usesLog, log }) => {
	void usesLog;
	late.log = log;
	log.warn("in the body");
});
```

```sh
bash /home/magdys/workspace/dyhex/POMWright-final-review-probes/E/logger/run.sh logger.spec.ts --workers=1
```

Exit code 1, from the two `en_US` tests of the same file (finding E-2); tests 3 and 4 pass. Output in `logger.out`.

## Observed / expected

```text
ATTACHMENTS [3 attachLogsToTest called in the test too] 3
  NAME 11:48:02 AM 10/23/2026 - WARN : [TestCase] | text/plain | "once"
  NAME 11:48:02 AM 10/23/2026 - WARN : [TestCase] | text/plain | "once"
  NAME 11:48:02 AM 10/23/2026 - WARN : [TestCase] | text/plain | "logged in afterEach"
ATTACHMENTS [4 teardown: late fixture set up before log, a fixture using log, afterEach] 3
  NAME 11:48:02 AM 10/23/2026 - WARN : [TestCase] | text/plain | "in the body"
  NAME 11:48:02 AM 10/23/2026 - WARN : [TestCase] | text/plain | "logged in afterEach"
  NAME 11:48:02 AM 10/23/2026 - WARN : [TestCase] | text/plain | "logged in the teardown of a fixture that depends on log"
```

- Test 3: "once" is attached twice, once by the test's own call and again by the fixture's.
- Test 4: entries from `test.afterEach` and from the teardown of a fixture that depends on `log` are attached (sound);
  "logged by a fixture torn down after log" is not, and nothing reports it.

Expected: the docs say both, since the API invites a call of one's own ("call it in a fixture of your own") and
Playwright's fixture order decides which teardown logging is kept. For example, on the API entry: "Each call attaches
every entry recorded so far; with POMWright's `log` fixture, which calls it at the end of the test, do not call it
yourself" and, on *Logging to the report*: "Entries logged after the `log` fixture is torn down are not attached: a
fixture that logs in its teardown depends on `log`, which Playwright then tears down after it."

## Cause

`src/helpers/playwrightReportLogger.ts:293-319`: `attachLogsToTest` attaches every element of the shared array and
keeps them; nothing marks an entry as attached or the logger as finished. `src/fixture/base.fixtures.ts:42-45` calls it
once, after `use`.

## Fix plan

Per AGENTS.md §6, to be confirmed before any code changes.

- **Intended contract**: as documented today, plus the two facts above stated.
- **Options**:
  1. *(recommended)* Docs only: the `attachLogsToTest` doc comment and API entry, and a sentence on
     `docs/logging.md` (*Your own fixture*, or a short *When entries are attached* section). `none`.
  2. Make a call attach only the entries not attached before (an index kept on the shared state), so a user's own early
     call and the fixture's do not duplicate. Brings behaviour in line with "one attachment per entry": patch. Needs a
     unit test and the docs of option 1 for the late entries.
  3. Also warn (for example, one `console.warn`) when an entry is logged after the fixture attached the entries. A new
     behaviour: minor; not recommended without a decision.
- **Implementation steps**: option 1, the pages and the doc comment named above; option 2, `attachLogsToTest` in
  `src/helpers/playwrightReportLogger.ts`, the attached count on the shared object (the constructor's
  `sharedLogLevel`/`sharedLogEntry` are public arguments, so a new shared field changes the constructor or lives on the
  entries array: a decision).
- **Tests**: option 2: a unit test (two calls, one attachment per entry) and a harness case in
  `test/tests/logging/logging.spec.ts` (a call in the test plus the fixture's).
- **Docs**: `api/class-playwrightreportlogger.md` `attachLogsToTest()`; `docs/logging.md`; the doc comment at
  `src/helpers/playwrightReportLogger.ts:274`.
- **Changeset**: option 1, none; option 2, patch: "`attachLogsToTest` attaches only the entries it has not attached
  before, so calling it in a test that also uses the `log` fixture no longer attaches every entry twice."
- **Decisions to tick**:
  - [x] Docs only (option 1) or attach-once (option 2): **docs only** (attach-once would excuse a misuse); plus a
    *Your own fixture* example that records every level and attaches by outcome, and an issue draft for making that
    the built-in fixture's behaviour (breaking) ([DECISIONS.md #41](../DECISIONS.md))
- **Execution order**: after E-2 (same function).
