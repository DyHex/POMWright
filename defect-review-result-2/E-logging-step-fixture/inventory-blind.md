# Inventory (blind), segment 2E: logging, `@step` and the fixture

Pass 1 map at `d850405`, written before reading anything of the first review. One line per item: what it is, where it is
implemented, where it is documented, what tests it. Paths are relative to the worktree root.
Docs paths are under `website/src/content/docs/`.

## Public exports in scope (from `index.ts`)

- E1 `test`: Playwright's `test` extended with `log`. `src/fixture/base.fixtures.ts:34-51`. Docs: `api/fixtures.md`,
  `docs/logging.md`, `docs/page-objects-in-tests.md`. Tests: `test/tests/logging/logging.spec.ts` (packed).
- E2 `PlaywrightReportLogger` (class, value export). `src/helpers/playwrightReportLogger.ts:45-327`. Docs:
  `api/class-playwrightreportlogger.md`, `docs/logging.md`. Tests: `src/helpers/playwrightReportLogger.test.ts`,
  `logging.spec.ts`, `test/tests/packaging/publicTypes.typecheck.ts` (`Logging`, `values`).
- E3 `LogEntry` type (`timestamp`, `logLevel`, `prefix`, `message`). `playwrightReportLogger.ts:17-26`. Docs: class page
  *LogEntry*.
- E4 `LogLevel` type (`"debug" | "info" | "warn" | "error"`). `playwrightReportLogger.ts:10`. Docs: class page *LogLevel*.
- E5 `step` (function, overloads: `step()`, `step(title)`, `step(options)`, `step(title, options)`, bare standard
  `(value, context)`, bare legacy `(target, key, descriptor)`, and two message overloads).
  `src/helpers/stepDecorator.ts:185-217`. Docs: `api/step.md`, `docs/test-steps.md`, `api/errors.md` *`@step*.
  Tests: `stepDecorator.test.ts`, `stepDecorator.test-d.ts`, `test/tests/step/step.spec.ts`, `test/step-locations/`,
  `test/tests/packaging/stepLegacyDecorators.typecheck.ts`, `publicTypes.typecheck.ts` (`Steps`), `publicTypes.emit.ts`.
- E6 `StepDecorator` interface (four call signatures: standard, legacy, two message forms). `stepDecorator.ts:52-70`.
  Docs: `api/step.md#stepdecorator` ("Added in: v3.0.2"), `docs/test-steps.md` *Sharing a decorator*. Tests:
  `publicTypes.typecheck.ts:124-126`, `stepLegacyDecorators.typecheck.ts:6`, `publicTypes.emit.ts`.

## Members and options

- E7 `new PlaywrightReportLogger(sharedLogLevel, sharedLogEntry, contextName)`: shares the level object and the entry
  array by reference. Docs: class page *Constructor*.
- E8 `getNewChildLogger(prefix)`: name `<parent> -> <prefix>`, shares level and entries.
- E9 `debug/info/warn/error(message, ...args)`: records when level >= current; message and string args verbatim, others
  through `util.inspect`, joined by `"\n\n"`; timestamp `new Date()`.
- E10 `setLogLevel`, `getCurrentLogLevel`, `getCurrentLogLevelIndex`, `resetLogLevel` (to `initial`),
  `isCurrentLogLevel`, `isLogLevelEnabled`.
- E11 `attachLogsToTest(testInfo, format?)`: checks `format` or `testInfo.project.use` locale/timezone
  (`checkDateFormat`), then one `testInfo.attach` per entry in array order (not awaited), name
  `<time> <date> - <LEVEL> : [<prefix>]`, `application/json` when the whole message parses to a JSON object or array,
  else `text/plain`. Docs: class page, `docs/logging.md` *Your own fixture*.
- E12 `checkDateFormat(locale, timeZone, source)` (internal): `""` as no value; `Intl.getCanonicalLocales` for the
  locale, `new Intl.DateTimeFormat(undefined, { timeZone })` for the zone; underscore hint by `replaceAll("_", "-")`.
  `playwrightReportLogger.ts:338-364`.
- E13 `initialLogLevel(retry)` (internal): `warn` on retry 0, `debug` after.
- E14 `step` options: `title` (string), `options` (`test.step`'s third parameter: `box`, `location`, `timeout`).
- E15 `@step` title: explicit title, else `<owner>.<method>` where the owner is `this` for a static method,
  `this.constructor` otherwise, `Anonymous` for no receiver, an empty name or `Object`; the method name from the
  standard context's `name` or the legacy key, `String()`-ed.

## Contracts and features

- E16 Levels: an entry is recorded at the current level or above; `log` starts at `warn` on the first run, `debug` on a
  retry (`docs/logging.md` *Levels*; `api/fixtures.md`; guide `src/helpers/AGENTS.md` *Steps and logging*).
- E17 What is attached: strings verbatim, others as `console.log` prints them, blank line between parts; a JSON
  object/array message as `application/json` (`docs/logging.md` *What is attached*).
- E18 Names in the locale: Playwright's `locale` and `timezoneId`; time taken in the test process, not the page's
  clock (`docs/logging.md` *Names in your locale*).
- E19 The fixture checks `locale` and `timezoneId` when the test starts (only when `log` is requested), message
  naming the value; `attachLogsToTest` checks the same before attaching anything (`api/errors.md` *Logging*;
  changeset `log-locale-check.md`).
- E20 Lifecycle: entries logged after the fixture attached are not attached; a fixture depending on `log` is torn down
  first, so its teardown entries are attached (`docs/logging.md` *Child loggers*). `testInfo.status` claim in *Your
  own fixture* (outcome so far: body, hooks, fixtures torn down before `log`).
- E21 Calling `attachLogsToTest` with POMWright's `test` attaches twice (doc comment, class page).
- E22 `@step` decorates methods that return a Promise: compile error otherwise, `TypeError` thrown in the step at run
  time from JavaScript (`docs/test-steps.md` *Only methods that return a Promise*; `api/errors.md`; changeset
  `step-promise-at-runtime.md`). Run-time check accepts any thenable.
- E23 `@step` works on any class, generic methods (keep type parameters), static methods (titled by class), with standard
  decorators and `experimentalDecorators`, "in the editor and in Playwright's runner" (`docs/test-steps.md`
  *Decorator settings*; `api/step.md`). Detached methods run (`step-without-receiver.md`).
- E24 `@step decorator can only be applied to methods.`: thrown at decoration from JavaScript on getter, setter, field,
  accessor (standard) or a descriptor without a function (legacy).
- E25 Where a step is reported: unboxed at the line that called the method (Playwright's async stack, first frame;
  wrapper not `async`); boxed with a computed `location` (`callerLocation(boxed)`), a given `location` wins; a boxed
  error's stack is Playwright's (async stack after the first frame, or the outermost boxed step's)
  (`docs/test-steps.md`; `api/step.md` *Arguments* `options`; `internal/call-sites.md` *Steps at the test's line*;
  guide `src/helpers/AGENTS.md`; changeset `boxed-step-location.md`).
- E26 Errors and messages users meet: `@step decorates methods that return a Promise: make the method async` (compile and
  run time), `@step decorator can only be applied to methods.`, `log fixture: locale … is not a BCP 47 language tag[;
  write it with hyphens, such as …]`, `log fixture: timezoneId … is not a time zone Node's Intl knows`,
  `attachLogsToTest: locale …`, `attachLogsToTest: timeZone …`; Playwright's own `test.step() can only be called from a
  test` when a `@step` method runs outside a test. Documented in `api/errors.md`, `api/step.md` *Throws*, the doc
  comments' `@throws`.

## Lifecycle, ordering, concurrency

- E27 `log` fixture order: check, create, `use`, attach (teardown). Not `auto`, not `box`. Attach calls are not awaited
  (Playwright's `attach` is async: a step per call, `_attach` after a microtask).
- E28 Retries and workers: one logger per test; level by `testInfo.retry`; repeatEach keeps retry 0.
- E29 `@step` in overlapping calls (`Promise.all`), recursion, nested boxed/unboxed steps, calls from fixtures and
  helper modules, a non-`async` caller that returns the Promise.

## Inputs at the boundary

- E30 Logger: any `args`; `message: string` (from JS any value goes through `Array.join`); level from JS outside the list.
- E31 Locale and time zone values: `""`, case, underscore forms, POSIX forms (`en_US.UTF-8`), extensions, unknown zones.
- E32 `@step` arguments from JS: `step(undefined)`, `step(title, undefined)`, non-method targets.

## Types

- E33 `StepDecorator` and `step` overloads against the runtime: standard and legacy forms, generic, overloaded,
  `this`-typed, private `#` methods, symbol-named methods, abstract, inherited/overridden, getters, `PromiseLike`.
- E34 `attachLogsToTest`'s `format` type against the documented call `{ locale, timeZone: timezoneId }` (Playwright's
  `string | undefined`), including under stricter consumer settings.
- E35 `LogEntry`/`LogLevel` shapes against the runtime.

## The platform beneath

- E36 Playwright 1.64 `test.step`: location from `_addStep` after `await _onUserStepBegin`, `box` → `boxedStack` only
  without a boxed ancestor; `location` option → `stack: [location]`.
- E37 Playwright's loader compiles `.ts` with Babel `proposal-decorators` `version: "2023-05"` always, whatever
  `experimentalDecorators` says; `tsc` with `experimentalDecorators` emits legacy calls (`__decorate`).
- E38 Node's `Intl` (full ICU) and `util.inspect` across Node 20, 22, 24.

## Packaging

- E39 `step`, `PlaywrightReportLogger`, `test` in the CJS bundle and the ESM entry; `StepDecorator` type-only;
  declaration emit of a stored decorator (`publicTypes.emit.ts`). (Mechanism is 2F's.)

## Documentation

- E40 `docs/logging.md`, `docs/test-steps.md`, `api/step.md`, `api/fixtures.md`, `api/class-playwrightreportlogger.md`,
  `api/errors.md` (*`@step`*, *Logging*), `internal/call-sites.md` (*Steps at the test's line*, *Alternatives weighed*),
  the doc comments of `step`, `StepDecorator`, `PlaywrightReportLogger` and its members, `test`.

## Tests and tooling

- E41 Unit: `playwrightReportLogger.test.ts` (formatting, content type, order, names, locale checks, levels),
  `stepDecorator.test.ts` (titles, options, box location, detached, bare, runtime check, non-methods, legacy),
  `stepDecorator.test-d.ts` (types), `callSite.test.ts` (frameLocation, callerLocation, siteText),
  `stepLocations.test.ts` (helpers' options).
- E42 Harness: `logging.spec.ts` (attachments through an auto fixture torn down after `log`; locale checks; teardown
  logging), `step.spec.ts` (return values, static, runtime check), `test/step-locations/` (locations: plain, boxed, via
  helper, boxed throws, nested, helpers nested, in a test's boxed step, nested throws; legacy emitted calls),
  `stepLegacyDecorators.typecheck.ts` under both decorator modes.
- E43 What is not tested (to check): `@step` under `tsc`'s standard-decorator emit at run time; an unboxed `@step`
  called from another method; a `@step` in a fixture; private and symbol-named methods; inherited/overridden titles;
  `log` in `beforeAll`/`afterAll`; attachments after a timeout.

## Change set since `v3.0.1` (area)

- E44 Commits after `54cdada`: `b28686b` (log locale check), `2e15291` (runtime Promise check), `b19de77` (boxed
  location), `b4fee4a` (`StepDecorator`), `ea94410` (generic methods), `69bc09a` (legacy emitted calls tested),
  `f8ca42a` (log fixture lifecycle docs, `box` wording), `8eda398` (API coverage check). Before `54cdada`: `333a928`,
  `d807acb`, `4f80b37`, `d91fa33`.
- E45 Changesets: `boxed-step-location.md`, `legacy-bare-step.md`, `log-locale-check.md`, `step-decorator-type.md`,
  `step-generic-methods.md`, `step-promise-at-runtime.md`, `step-without-receiver.md`.

## Guide

- E46 `src/helpers/AGENTS.md` *Steps and logging* and *Do not*; `src/AGENTS.md` (`callSite.ts`, no thenables, public
  types as aliases); `test/AGENTS.md` (*Probing*, the step-location check).
