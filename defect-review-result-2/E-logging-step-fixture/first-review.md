# The first review in segment 2E, re-checked at `d850405`

Pass 2, written 2026-10-28T17:01:26+01:00 by Opus 5.5, second review, segment 2E. Sources read: the first review's
`E-logging-step-fixture/` (`brief.md`, `summary.md`, the five finding files), `report.md`'s rows for E-1 to E-5, H-7,
F-1 and the *Considered and not filed* note on `@step`, `DECISIONS.md` #10, #11, #12, #23, #40, #41, #42, #57, the plans
`PLAN-E-1-D-4-call-sites.md`, `PLAN-E-2-log-locale.md`, `PLAN-E-5-generic-step.md`, `PLAN-F-1-step-decorator-type.md`,
`PLAN-F-3-E-4-E-3-docs.md`, `PLAN-H-7-T13-step-runtime.md` (their *Execution notes*), `PLAN-release-gates-and-audit.md`
(*Left in the folder for the second review*), and `inventory.md`'s lines tagged `[E]`.

Every reproduction was copied from `/home/magdys/workspace/dyhex/POMWright-final-review-probes/` into
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/E/run1/<ID>/`, pointed at the review worktree
(`WT=/home/magdys/workspace/dyhex/POMWright-second-review`) and run there; the outputs are beside the copies as
`*.d850405.out`. No first-review probe was run in place.

## Findings

| ID | Kind, severity | Outcome at `d850405` | What ran and what it printed |
| --- | --- | --- | --- |
| E-1 | defect, Medium | **fixed** | `run1/E-1`: `bash run.sh nested.spec.ts` (exit 0). Every nested boxed step at its calling line: `inner-boxed @ nested.spec.ts:35`, `ProbePage: Navigate to this Page @ nested.spec.ts:47`, `S.SessionStorage.set: @ nested.spec.ts:49`, in a test's boxed step `inner-boxed @ :84`, `goto @ :85`; the nested error at the outermost boxed call (`:93`), Playwright's rule. Nothing in the bundle (`nested.d850405.out`). |
| E-2 | defect, Medium | **fixed differently** (decision #10, option 4: check at setup, fail with a message, no normalising) | `run1/E-2`: `locale.spec.ts --workers=1 --retries=1` on chromium, firefox and webkit (exit 1 each, by design): the tests that request `log` with `en_US` fail at setup, first run and retry, with `log fixture: locale "en_US" is not a BCP 47 language tag; write it with hyphens, such as "en-US"`; the test that does not request `log` passes. `timezone.spec.ts` (chromium): `locale: ""` passes; `Invalid/Zone` without a page fails with `log fixture: timezoneId "Invalid/Zone" is not a time zone Node's Intl knows` (with a page, Playwright's own `newPage: Invalid timezone ID` comes first). The code keeps the decided contract. One new defect in the new message: **2E-1**. |
| E-3 | documentation, Low | **fixed** (decision #42) | `run1/E-3`: `forms.spec.ts` (exit 0): unboxed and boxed steps at the calling line; `box` moves the error (unboxed at the `throw`, `:24`; boxed at the call, `:74`); `api/step.md:64-65` now says so. Only change from `54cdada`: case 7, a boxed step returned without `await`, now at the helper's line `:50` (decision #12.3's accepted deviation). The decided wording adds "the step is reported at the calling line either way", which does not hold where the call is not awaited on its own line: **2E-2** (with the first review's test gap 7). |
| E-4 | documentation, Low | **fixed** (decision #41: docs only, behavior unchanged) | `run1/E-4`: `logger.spec.ts --workers=1` (exit 1 from its two `en_US` cases, by design): a test's own `attachLogsToTest` plus the fixture's still attaches "once" twice, and an entry logged by a fixture torn down after `log` is still dropped, as decided; `api/class-playwrightreportlogger.md` *attachLogsToTest()* ("don't call it yourself, or every entry is attached twice") and `docs/logging.md` *Child loggers* ("An entry logged after the `log` fixture has attached the entries is not attached…") now state both. All other attachment bodies identical to `54cdada` but for the worktree path. |
| E-5 | defect, Medium | **fixed** | `run1/E-5`: `run-generic.sh` (standard and `experimentalDecorators`): both exit 0, generic, bare generic, boxed constrained generic, overloaded and `Promise<this>` methods compile and keep their types (`generic.d850405.out`). `run-types.sh` and `run-messages.sh`: the same outcomes as at `54cdada`, every refused form with `@step decorates methods that return a Promise: make the method async` in the output. |
| H-7 (the `@step` part) | documentation, Low | **fixed** (decision #40: a run-time check) | `run1/H-7`: `zz-probe-H-step-sync.spec.ts` on chromium (exit 1, by design): the plain-value method now rejects with `TypeError: @step decorates methods that return a Promise: make the method async` (before: `RESULT type=object isPromise=true value=42`, exit 0); *Principles* names the type-only rules (`docs/principles.md:45-47`). |
| F-1 | defect, Low | **fixed** (decision #23) | `run1/F-1`: the first review's `g/stepFactory.ts` in a scratch pnpm project with the `d850405` tarball (`phase0/pomwright-test-build.tgz`), `npx tsc --strict … --declaration --emitDeclarationOnly … g/stepFactory.ts`: exit 0, emitting `export declare const boxedStep: import("pomwright").StepDecorator;` (before: exit 1, TS4023). |

Counts: fixed 6 (E-1, E-3, E-4, E-5, H-7, F-1), fixed differently 1 (E-2), still present 0, not fixed 0, fixed
incompletely 0, regressed 0, cannot re-run 0.

## The first review's other claims

### Considered and not filed

| Claim | At `d850405` | Note |
| --- | --- | --- |
| `@step()` on a getter typed as returning an async function compiles under `experimentalDecorators` and throws `@step decorator can only be applied to methods.` at class definition, so `api/errors.md`'s "From JavaScript" is slightly narrow (left for this review by `PLAN-release-gates-and-audit.md`) | holds: `run1/E-5/types.d850405.out`, the legacy getter probe exits 0; the run-time guard is unchanged (`stepDecorator.ts:145-153`, unit-tested) | **Decided here: not filed.** It needs a getter whose type is a function returning a Promise, under `experimentalDecorators`; the error is thrown when the class is defined, before any test, and names the cause. A docs tweak ("from JavaScript, or on a getter under `experimentalDecorators`") would be harmless but not needed. |
| Returning a decorated method's Promise without `await` leaves an unboxed step without a location, as Playwright's own (test gap 7, left for this review) | holds: `run1/E-3/native.d850405.out` (`native-returned @ no location`), `forms.d850405.out` case 7 (`Forms.called @ no location`) | Filed as part of **2E-2**: no user page says it, and `api/step.md` now claims the opposite. |
| An invalid `timezoneId` is not a finding (Playwright rejects it too) | superseded: the fixture now checks it at setup (decision #10) | `run1/E-2/timezone.d850405.out`. |
| The lost late entry belongs to E-4 | documented now | see E-4. |

### What is sound (first review's lines)

| Line | Re-checked | Note |
| --- | --- | --- |
| Step locations at top level, every form, also for `tsc`'s standard and legacy output in the runner | yes: `run1/E-3/forms.d850405.out`, `run1/sound/legacy.d850405.out`, `run1/sound/standard.d850405.out` (exit 0; identical to `54cdada` but case 7) | holds |
| Unboxed nesting | yes: `run1/E-1` case 2 | holds |
| Errors in nested boxed steps at the outermost boxed call | yes: `run1/E-1` case 6 (`:93`) | holds |
| Run-time guards (getter, setter, field, accessor, class position) | unit tests (baseline `pnpm test:unit` exit 0); `run1/sound/classPosition.d850405.out` (both modes exit 0, every `@ts-expect-error` used) | holds |
| Types of non-generic forms and the messages | yes: `run1/E-5/types.d850405.out`, `messages.d850405.out` | holds; only internal type names in the messages changed (`StepDecoratorFactory` → `StepDecorator`, `AsyncMethod<…, [], unknown>` → `AsyncMethod<…>`) |
| Logger contents, levels across a tree, order, names | yes: `run1/E-4/logger.d850405.out` (cases 1, 2), `run1/sound/timeFormat.d850405.out` (Node 20, 22, 24) | holds |
| Fixture survives `extend` and `mergeTests`; `test.use({ locale })` reaches it | yes: `logger.d850405.out` case 6; the harness's `logging.spec.ts` | holds; `mergeTests` drops a fixture object it already has by identity (`playwright/lib/common/index.js:2455-2466`), so two fixture files extending POMWright's `test` share one `log` |
| Docs: every title, name and message shown matches | partly: they match, but two statements are wrong or missing for shapes the first review did not check: **2E-2** (where a step is reported), **2E-3** (which class names a step) | |

### Test gaps (first review's list)

| Gap | At `d850405` |
| --- | --- |
| 1. Nested boxed steps | **closed**: `test/step-locations/stepLocations.spec.ts` (nested `@step`, helpers inside a boxed `@step`, inside a test's own boxed step, nested error); baseline: 31 locations checked |
| 2. Generic methods | **closed**: `stepDecorator.test-d.ts` (`Generic`), `stepLegacyDecorators.typecheck.ts`, `publicTypes.typecheck.ts`, `scripts/consumer/consumer.ts` |
| 3. Locales Playwright accepts and Node rejects | **closed**: `logging.spec.ts` (`""`, `EN-us` pass; `en_US` fails at setup with the message); not covered: a POSIX name such as `en_US.UTF-8` (2E-1) |
| 4. The reporter does not require every marker | **closed**: `locationReporter.ts:88-94` fails on a marker never reported |
| 5. `attachLogsToTest` twice; teardown order | **partly closed**: a fixture that depends on `log` and logs in its teardown is tested (`logging.spec.ts:156-173`); a second call is documented and not tested (decision #41); an `afterEach` entry is not tested in the harness (attached: `run1/E-4` case 4, and this review's `E/lifecycle/run1.txt`) |
| 6. Legacy decorators at run time | **closed**: `test/step-locations/legacyDecorators.spec.ts` runs `tsc`'s emitted module |
| 7. Returning instead of awaiting | **open**: no user page says it; 2E-2 |
