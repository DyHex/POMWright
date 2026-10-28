# Inventory (reconciled), segment 2E

Pass 3. The union of `inventory-blind.md` (this review, `d850405`) and the first review's `inventory.md` lines tagged
`[E]` (at `54cdada`), with the first review's coverage from its `summary.md`. Each line: **both**, **blind only** or
**first only**; then how deeply each review probed it (P = probed through the public API, R = read only, T = relied on
existing tests, — = not covered). IDs E1–E46 are the blind map's.

## Public exports and members

| Item | Mark | This review | First review |
| --- | --- | --- | --- |
| `test` with `log` (E1) | both | P (lifecycle, retry, hooks, timeout, override, `mergeTests` by reading Playwright) | P (`extend`, `mergeTests`, `test.use`) |
| `PlaywrightReportLogger` and every member (E2, E7–E11) | both | P (attach, names, override), T (levels) | P (every member) |
| `LogEntry`, `LogLevel` (E3, E4) | both | R (declarations) | P |
| `step`, its overloads (E5, E14) | both | P (types both modes, run time in the runner) | P |
| `StepDecorator` (E6) | blind only (added after `54cdada`, `b4fee4a`) | P (stored decorator on a static generic, both modes) | — (F-1 led to it; re-run in pass 2: fixed) |
| `checkDateFormat`, `initialLogLevel` (E12, E13; internal) | blind only (added after `54cdada`, `b28686b`) | P (locales and zones on Node 20 and 24; fixture) → 2E-1 | — |

## Contracts and features

| Item | Mark | This review | First review |
| --- | --- | --- | --- |
| Levels; `warn` on the first run, `debug` on a retry (E16) | both | P (retry through the fixture, `E/lifecycle`) | T (unit and the spec's retry branch; no retry run) |
| What is attached: verbatim strings, `console.log` for others, JSON content type (E17) | both | T, R | P (every argument kind: `cause`, symbol, `BigInt`, function, `Map`, class, `%s`, unicode, empty) |
| Names in `locale` and `timezoneId`; time from the test process (E18) | both | P (en-US separator on Node 20/22/24; `test.use({ timezoneId: undefined })`) | P (names, Node 20/22/24) |
| The fixture's locale check at setup, its messages (E19, E26) | blind only (new, `b28686b`) | P (POSIX names, extensions, zones) → 2E-1 | — (E-2 led to it) |
| Lifecycle: late entries, teardown order, `testInfo.status` in an own fixture (E20) | both | P (outcome fixture: `afterEach`, fixtures before and after `log`) | P (late fixture, `afterEach`, a fixture depending on `log`) |
| A second `attachLogsToTest` (E21) | both | R (now documented) | P → E-4 |
| `@step` Promise rule at compile and run time (E22) | both | P (compile messages both modes), T (run time) | P (compile) |
| `@step` forms: generic, static, detached, private, inherited, overridden (E23) | both, partly | P (private `#`, inherited, `super`, static generic with `this`, abstract base) → 2E-3 | P (generic → E-5, static, detached, overloaded, `Promise<this>`) |
| Non-method targets (E24) | both | T | P (getter, setter, field, accessor, class position; getter under legacy, not filed) |
| Where a step and its error are reported (E25) | both | P (from a method, in fixtures of both scopes, `beforeAll`, `Promise.all`, awaited later, non-async helper, wrapping decorator, ESM spec) → 2E-2 | P (every top-level form, nested, `tsc` standard and legacy output) → E-1 |
| Step locations of the navigation and session storage helpers | first only as a line; blind covered it under E25 by reading | R (`callerLocation` boundaries) | P (nested) → E-1 |
| `@step` outside a test: worker fixture, `beforeAll` (E29) | blind only | P (both work: `test.step` has a `TestInfo` there) | — |

## Lifecycle, inputs, types, platform

| Item | Mark | This review | First review |
| --- | --- | --- | --- |
| `log` order of setup and teardown; un-awaited `testInfo.attach` (E27) | blind only | R (Playwright's `attach`), P (timeout) | — |
| Retries and workers (E28) | both | P (retry) | R |
| Logger inputs: arguments, level names (E30) | both | R | P |
| Locale and time zone values (E31) | both | P → 2E-1 | P (→ E-2) |
| `step` arguments from JavaScript (E32) | both | R | T |
| `StepDecorator` and overloads against the run time (E33) | both | P | P |
| `attachLogsToTest`'s `format` under `exactOptionalPropertyTypes` (E34) | blind only | P (fails, as Playwright's own `newContext` does: not filed) | — |
| `@step`'s wrapper's `async`-ness decides the location (first: §4) | both | R, P | P |
| Playwright 1.64 `_step`, `_addStep`, `attach`, Babel `2023-05` (E36, E37) | both | R | R |
| Babel's decorators on a symbol-named method (E37) | blind only | P (fails even for a no-op decorator: Playwright's, not filed) | — |
| Node `Intl` and `util.inspect` across 20, 22, 24 (E38) | both | P (Intl) | P (Intl) |

## Packaging, docs, tests, change set, guide

| Item | Mark | This review | First review |
| --- | --- | --- | --- |
| Entries and declarations of `step`, the logger, `test` (E39) | both | R (`dist/index.d.ts`), P (F-1 re-run) | R (`dist/index.d.ts`) |
| The pages (E40) | both | R, anchors checked in the built site | R |
| *Upgrading from 2.x*, *Reports* | first only | — in pass 1 (not in this brief) | R (against 2.1.0's source) |
| `docs/principles.md` on run-time checks | first only (H-7) | P in pass 2 | P |
| Unit tests (E41) | both | R | R |
| Harness: logging, step, step-locations, legacy (E42) | both | R | R |
| Test gaps (E43) | both | R | R |
| Change set since `v3.0.1` (E44, E45) | both | R, P (each commit after `54cdada`) | P (the four commits before `54cdada`) |
| Guide lines (E46) | both | R | R |

## Findings both ways

- **First-review findings this pass would have met.** E-1 (nested boxed steps): the blind location probe called boxed
  steps inside boxed steps (`recurse`, `boxedOverridden` → `super`), so it would have shown the bundle lines. E-2: the
  blind locale probe calls `attachLogsToTest` with `en_US`. E-5: the blind type probe decorates a static generic. E-3
  and E-4: read on the pages; E-4's double attach was not probed in pass 1 (it is documented now). No blind spot left
  open: every one is fixed, or fixed differently, at `d850405`.
- **Blind findings the first review did not report.**
  - 2E-1: new since `54cdada`, in the message `b28686b` added for E-2.
  - 2E-2: the claim "the step is reported at the calling line either way" is new since `54cdada` (`f8ca42a`, the
    wording of decision #42); the unboxed half of the behavior was known to the first review (`steps/native.out`,
    test gap 7) and left to this review undocumented; the boxed half (step at a non-async caller's line, its error at
    the awaiting line) follows from `b19de77` and decision #12.3.
  - 2E-3: missed by the first review: it probed titles of instance, static and detached calls, not inherited or `super`
    calls.
