# Scope E: Logging, `@step` and the fixture — summary

> Saved by the orchestrating session from the agent's final report, with the user's approval: the agent's own write of this file was refused by a harness rule ("Subagents should return findings as text, not write report files").

- **Scope**: an area review of `src/helpers/playwrightReportLogger.ts`, `src/helpers/stepDecorator.ts` and
  `src/fixture/base.fixtures.ts` at `54cdada` (worktree `/home/magdys/workspace/dyhex/POMWright-final-review`), with the
  four commits since `v3.0.1` that touch it (`333a928`, `d807acb`, `4f80b37`, `d91fa33`) reviewed as a change set, each
  probe of a possible regression also run on `v3.0.1`.
- **Reviewer**: Claude (claude-opus-5-5), 2026-10-23, 11:40 to 11:58 CEST.
- **Probes and notes**: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/E/` (`steps/`, `types/`, `logger/`;
  every `*.out` file is the output a finding quotes). The `v3.0.1` worktree used for comparisons was at
  `E/v3.0.1` and is removed.
- **Note**: the Write tool refused to create this file ("Subagents should return findings as text"); its text was handed
  back in the final message instead. The five finding files were written normally.

## What I read

`scopes.md`, `inventory.md`, `baseline.md`, the brief, the worktree's `AGENTS.md` in full (identical to the one in the
user's checkout except the `skills/` row of §2). The three source files in full with their doc comments; how the
navigation and session storage helpers open their boxed steps (`src/helpers/navigation.ts`,
`src/helpers/sessionStorage.ts` `step()`, their doc comments); the unit tests `playwrightReportLogger.test.ts`,
`stepDecorator.test.ts`, `stepDecorator.test-d.ts`, `stepLocations.test.ts`; the harness `test/tests/logging/`,
`test/tests/step/`, `test/step-locations/` with `test/playwright.steps.config.ts`,
`test/tests/packaging/stepLegacyDecorators.typecheck.ts` with `test/tsconfig.legacyDecorators.json`; the pages
`docs/logging.md`, `docs/test-steps.md`, the `log` part of `docs/page-objects-in-tests.md`,
`api/class-playwrightreportlogger.md`, `api/step.md`, `api/fixtures.md`, the `@step` section of `api/errors.md`,
`internal/call-sites.md`, the *Reports* section of `docs/upgrading-from-2x.md`, and the other pages that mention the
logger or `@step` (`installation.md`, `organising-a-project.md`, `page-objects.md`, `typescript.md`,
`internal/tests-and-checks.md`, the README's table); the four commits' diffs and changesets; 2.1.0's logger and `@step`
for the upgrade claims; Playwright 1.64.0's `test.step` (`_step`), `TestInfoImpl._addStep`, `attach`,
`filterStackFile`, the `locale`/`timezoneId` fixtures and the runner's Babel decorator setting (`version: "2023-05"`).

## Decisions taken without asking

- **E-1 covers the helpers too.** The nested-boxed location is one mechanism (AGENTS.md §5's "exactly one `async`
  POMWright frame"), which the brief assigns to this scope, so the finding names the navigation and session storage
  helpers as affected paths; their files belong to scopes D and A, and the fix plan says to coordinate.
- **No finding for a getter under `experimentalDecorators`.** `@step()` on a getter typed as returning an async function
  (`get handler(): () => Promise<void>`) compiles under `experimentalDecorators` (`types/getterFn.typecheck.ts`, exit 0)
  and throws `@step decorator can only be applied to methods.` when the class is defined. TypeScript gives a legacy
  method decorator and a legacy accessor decorator the same `TypedPropertyDescriptor<T>`, so the types cannot tell them
  apart; the error is immediate and readable. `api/errors.md`'s "From JavaScript" is then slightly narrow; noted here
  only.
- **The lost late entry is part of a documentation finding (E-4), not a defect.** An entry logged after the `log`
  fixture's teardown is dropped silently, but only a logger handed to a fixture that does not depend on `log` can do
  that; entries from `afterEach` and from fixtures that depend on `log` are attached.
- **A `RangeError` for an invalid `timezoneId` is not a finding.** Playwright rejects the same value
  (`browserContext.newPage: Invalid timezone ID`), so the fixture's failure reports the same configuration error. A
  locale is different (E-2): Playwright accepts `en_US` and `""`.
- **Returning a decorated method's Promise without `await` is not a finding.** The step then has no location, exactly
  as Playwright's own `test.step` in the same position (`steps/native.out`). AGENTS.md §5 tells contributors; a user
  page could say it too (test gap, below).

## Inventory lines reviewed

| Inventory line | Coverage |
| --- | --- |
| §1 `test` (fixture `log`) | full: extend, `mergeTests`, `test.use({ locale })`, teardown order, locales Playwright accepts (E-2) |
| §1 `PlaywrightReportLogger`, `LogEntry`, `LogLevel` | full: every member; levels across parent and children; arguments of every kind; names; order; double attach (E-4) |
| §1 `step` | full: every form at runtime (Babel's 2023-05 decorators in the runner, tsc's standard and legacy output), types in both modes (E-5) |
| §2 *Logging, steps and the fixture* (all four bullets) | full; E-1 for the step locations |
| §3 errors, `@step` section | full: both messages match the throw site and the compiler output |
| §4 lifecycles: logger, `@step` | full |
| §5 inputs: logger arguments, level names; `@step` on non-Promise methods, getters, statics, detached calls | full; level names outside `LogLevel` only by reading (types reject them; at runtime an unknown level records everything) |
| §6 types: `@step` under standard and legacy decorators | full (E-5) |
| §9 type probes `stepLegacyDecorators.typecheck.ts`; step-location check | full |
| §10 AGENTS.md lines of this area (§2 rows, §3 pitfalls, §4 harness, §5 logger and `@step` bullets, §8) | full; §5's "exactly one `async` POMWright frame" holds only without a boxed ancestor (E-1) |
| Docs listed in the brief | full; E-3, E-4, and the docs parts of E-1 and E-2 |

## Not run

- The step-location probes run without a browser, so only Node 24 with Playwright 1.64.0; not at the latest 1.x. The
  locations depend on Playwright's internal `_addStep` (which frame a box drops, and that it drops one only without a
  boxed ancestor); CI runs `test/playwright.steps.config.ts` at the latest 1.x, which would catch a change for the
  cases it covers.
- The `en_US` probe ran on chromium, firefox and webkit; the other logger probes on chromium only (the formatting runs
  in Node). Node 20 and 22 only for the `Intl` formatting (`logger/timeFormat.mjs`), not for the runner.
- No retry run of the `log` fixture's `debug` level beyond the unit test and the harness spec's retry branch (the local
  config has no retries; CI has one).

## Test gaps (most important first)

1. **Nested boxed steps.** `test/step-locations/stepLocations.spec.ts` has no step inside a boxed step: no boxed
   `@step` method calling another, no helper (`goto`, `set`) inside a boxed `@step`, nothing inside a test's own
   `test.step(..., { box: true })` (E-1 would have been caught).
2. **Generic methods.** No type test decorates a generic method (`stepDecorator.test-d.ts`,
   `stepLegacyDecorators.typecheck.ts`, `publicTypes.typecheck.ts`) (E-5).
3. **Locales Playwright accepts and Node rejects.** The logging spec covers `nb-NO` and the default only (E-2).
4. **The step-location reporter counts but does not require every marker.** `locationReporter.ts` fails when a reported
   step is on the wrong line or when nothing was checked, not when a marked call produced no step at all; a probe that
   silently stops reporting a step leaves "6 checked" green. Requiring each `// LOCATION` marker to be checked once
   would close it.
5. **`attachLogsToTest` twice, and teardown order.** No test of a second call, of an `afterEach` entry, or of an entry
   from a fixture that depends on `log` (all observed in `logger/logger.out`; E-4).
6. **Legacy decorators at runtime.** The legacy decorator call is unit-tested with a hand-made descriptor only;
   nothing runs tsc-compiled `experimentalDecorators` output in the runner (`steps/legacy.spec.ts` did: correct).
7. **Returning instead of awaiting.** No page tells a user that returning a decorated method's Promise from another
   `async` function, without `await`, leaves the step without a location (Playwright's behaviour too).

## What is sound

- **Step locations, top level** (`steps/forms.out`, `steps/legacy.out`, `steps/standard.out`): at the calling line for
  bare `@step`, `@step()`, titled, `{ box: true }`, static (bare and boxed), detached (`Anonymous.<method>`), a method
  that throws synchronously (boxed: error at the call; unboxed: error at the `throw`, as Playwright), a method returning
  a non-native thenable, two calls in one `Promise.all`; the same for tsc-compiled standard and `experimentalDecorators`
  output in the runner. `333a928`'s top-level fix and `d807acb`'s detached call hold on every path probed.
- **Unboxed nesting** (`steps/nested.out` case 2, and the unboxed inner step in case 1): every step at its calling line.
- **Errors in nested boxed steps**: reported at the outermost boxed call site, as Playwright does.
- **`@step`'s runtime guards** (unit tests, plus `types/classPosition.typecheck.ts`): getter, setter, field, accessor and
  class positions rejected by the types in both modes and by the runtime with the documented message.
- **`@step`'s types, non-generic** (`types/types.out`, `types/messages.out`): every non-Promise form (called, bare,
  titled, static) is rejected in both modes with `@step decorates methods that return a Promise: make the method
  async` in the compiler's output; `PromiseLike` and `Promise<T> | T` returns rejected; all options of `test.step`
  1.64.0 accepted (`box`, `timeout`, `subtitle`, `params`); overloaded methods and `Promise<this>` compile.
  `d91fa33`'s implementation signature is not emitted (`dist/index.d.ts:752-759` hold only the overloads).
- **Logger contents** (`logger/logger.out`): message and string arguments verbatim; `Error` with `cause`, symbol,
  `BigInt`, `undefined`, function, `Map`, class instance, nested strings exactly as `console.log` prints them; `%s` kept;
  empty message; unicode; JSON object or array messages as `application/json`.
- **Levels across a tree**: `setLogLevel` and `resetLogLevel` on a child or a parent change every logger of the tree;
  `isLogLevelEnabled`, `getCurrentLogLevelIndex` as documented.
- **Order**: one shared array, so entries from several child loggers (and grandchildren) attach in call order.
- **Names**: `11:39:57 PM 10/16/2026 - WARN : [TestCase]` (en-US) and `23:39:57 16.10.2026` (nb-NO, Europe/Oslo) as the
  pages show, with a plain space on Node 20, 22 and 24 (`logger/timeFormat.out`); `[TestCase -> A -> C]` for a
  grandchild.
- **Fixture**: `log` survives `extend` and `mergeTests`; `test.use({ locale: "nb-NO", timezoneId: "UTC" })` in a
  describe reaches it (harness spec); `afterEach` entries and teardown entries of fixtures that depend on `log` are
  attached.
- **Docs**: every step title, attachment name and message shown on the pages of this scope matches the probes, apart
  from E-3; the 2.x claims on *Upgrading from 2.x* (`nb-NO` names, `Function.create`, JSON re-formatting,
  `[object Object]`) match 2.1.0's source.
- **Baseline for the scope**: `pnpm vitest run` of the three unit files, 46 passed, no type errors, exit 0;
  `playwright test tests/logging tests/step --project=chromium`, 16 passed, exit 0;
  `playwright test -c playwright.steps.config.ts`, 4 passed, "7 checked", exit 0 (after the E-1 sketch was reverted
  and the harness reinstalled).

## Outside the scope

- **Scopes D and A, the helpers' step locations**: `navigation.goto()` and `SessionStorage.set()` inside a boxed step
  are reported at `index.js:2931` and `index.js:861` of POMWright's bundle (`steps/nested.out` cases 3 and 5), already
  so at `v3.0.1`. Reported as part of E-1, whose fix plan covers them; listed here so scopes A and D do not count it
  again.

## Findings

| ID | Kind | Severity | Semver | Summary | File |
| --- | --- | --- | --- | --- | --- |
| E-1 | defect | Medium | patch | Inside a boxed step, a boxed `@step` method and the navigation and session storage steps are reported at a line of POMWright's bundle, not where they were called (for `@step` a regression of `333a928`; for the helpers since 3.0.1). | [defect-E-1](defect-E-1-boxed-step-inside-boxed-step-located-in-bundle.md) |
| E-2 | defect | Medium | patch | A `locale` Playwright accepts but Node's `Intl` rejects (`en_US`, `""`) makes the `log` fixture fail the test with `RangeError: Incorrect locale information provided` once an entry is recorded. | [defect-E-2](defect-E-2-locale-playwright-accepts-fails-log-fixture.md) |
| E-3 | documentation | Low | none | The `step` API page says `box` reports the step at the calling line; every `@step` step is reported there, and `box` moves where an error inside points. | [defect-E-3](defect-E-3-step-api-page-misdescribes-box.md) |
| E-4 | documentation | Low | none | `attachLogsToTest` attaches every entry again on a second call, and an entry logged after the `log` fixture's teardown is dropped silently; neither is documented. | [defect-E-4](defect-E-4-attachlogstotest-lifecycle-undocumented.md) |
| E-5 | defect | Medium | patch | `@step` does not compile on a generic `async` method in either decorator mode (since 2.x); under `experimentalDecorators` the error says to make the method `async`. | [defect-E-5](defect-E-5-step-rejects-generic-async-methods.md) |

Counts: 3 defects (Medium 3; patch 3), 2 documentation (Low 2; none 2), 0 suspected, 0 design questions.
