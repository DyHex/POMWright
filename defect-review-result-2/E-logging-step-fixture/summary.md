<!-- Saved by the orchestrator from the segment agent's final message: the agent's own write of this file was refused by
the harness rule "Subagents should return findings as text, not write report files". The text below is the agent's,
unchanged. -->

# Segment 2E: Logging, `@step` and the fixture — summary

- **Scope**: an area review of the logger, `@step` and the `log` fixture at `d850405` (worktree
  `/home/magdys/workspace/dyhex/POMWright-second-review`), with the commits since `v3.0.1` that touch it as a change set
  (after `54cdada`: `b28686b`, `2e15291`, `b19de77`, `b4fee4a`, `ea94410`, `69bc09a`, `f8ca42a`, `8eda398`; before:
  `333a928`, `d807acb`, `4f80b37`, `d91fa33`).
- **Reviewer**: Opus 5.5, second review, segment 2E; 2026-10-28, 16:36 to 17:06 (+01:00), from `log.md`.
- **Probes**: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/E/` (`locations/`, `symbol/`, `locale/`,
  `lifecycle/`, `types/`, `esm/`, `tzfallback/`, `override/`, `upgrade/`, `2E-1/`, `sketch/`, and `run1/` for the first
  review's reproductions). Port 9000 was free at the start; nothing else was listening during the runs.
- **Passes**: 1 done 16:56:37, 2 done 17:02:19, 3 done 17:03:13, 4 done 17:05:58 (`log.md`).

## What I read

`skills/defect-review/SKILL.md` (the worktree's copy), `segments.md`, `baseline.md`, the brief; the guide in the
worktree: `AGENTS.md`, `src/AGENTS.md`, `src/helpers/AGENTS.md`, `test/AGENTS.md`, `docs/versioning.md`. Source in full:
`src/helpers/playwrightReportLogger.ts`, `stepDecorator.ts`, `callSite.ts`, `thenable.ts`, `src/fixture/base.fixtures.ts`,
`index.ts`. Unit tests: `playwrightReportLogger.test.ts`, `stepDecorator.test.ts`, `stepDecorator.test-d.ts`,
`callSite.test.ts`. Harness: `test/tests/logging/logging.spec.ts`, `test/tests/step/step.spec.ts`, `test/step-locations/`
(spec, reporter, legacy spec and module), `stepLegacyDecorators.typecheck.ts`, the two legacy tsconfigs,
`playwright.steps.config.ts`, the step and logger parts of `publicTypes.typecheck.ts`. Docs: `docs/logging.md`,
`docs/test-steps.md`, `api/step.md`, `api/fixtures.md`, `api/class-playwrightreportlogger.md`, `api/errors.md` (*`@step`*,
*Logging*), `internal/call-sites.md`, and in pass 4 `docs/upgrading-from-2x.md` (*Reports*), `docs/principles.md`,
`docs/installation.md`, `docs/organizing-a-project.md`, the README's table. The area's diffs and seven changesets.
Playwright 1.64.0's `_step`, `_addStep`, `attach`, `mergeTests`, the `locale`/`timezoneId` option fixtures and the
Babel decorator setting. Pass 2: the first review's scope E, its rows in `report.md`, `DECISIONS.md` #10, #11, #12, #23,
#40, #41, #42, #57, six plans' execution notes, `PLAN-release-gates-and-audit.md`, `inventory.md`'s `[E]` lines (see
`first-review.md`).

## Inventory coverage

| Lines (inventory-blind.md) | Coverage |
| --- | --- |
| E1–E13 exports and members | full; E3, E4 by reading the declarations |
| E14–E15 `step` options and titles | full (probed: explicit, class, static, private, inherited, `super`, detached by the legacy spec) |
| E16–E21 logger contracts | full: levels and retry through the fixture, names, locale check, lifecycle, outcome fixture; argument kinds through the first review's probe re-run (`run1/E-4`) |
| E22–E26 `@step` contracts, messages | full, both decorator modes, Babel's `2023-05` in the runner and `tsc`'s legacy and standard output |
| E27–E29 lifecycle and concurrency | full (fixtures of both scopes, `beforeAll`, `Promise.all`, recursion, overlapping by reading) |
| E30–E32 inputs | E31 full; E30 by the first review's probe re-run; E32 by reading (from JavaScript only) |
| E33–E35 types | full; E34 under `exactOptionalPropertyTypes` (mirrors Playwright) |
| E36–E38 platform | read and probed where it decides behavior (Node 20, 22, 24 for `Intl`) |
| E39 packaging | partly: declarations read, the stored-decorator emit re-run (`run1/F-1`); the mechanism is 2F's |
| E40 docs | full for the listed pages; built-site anchors of every `@see` and cross-link checked in `website/dist` |
| E41–E43 tests | read; gaps below |
| E44–E46 change set, changesets, guide | full |

**Not run**: the location probes on firefox and webkit (they need no browser; Playwright places steps the same way on
every project); at the latest Playwright 1.x (CI runs `playwright.steps.config.ts` there); runner probes on Node 20 and
22 beyond the baseline's step-location run on both; `pnpm test`/`pack-test` in full (the baseline's run stands).

## Test gaps (most important first)

1. Where a step is reported when the call is not awaited on its own line (a multi-line `Promise.all`, a Promise awaited
   later, a non-async helper or a wrapping decorator above a boxed `@step`): no marked case in `test/step-locations`
   (2E-2).
2. The locale check's hint is tested for `en_US` only; nothing checks that a hinted value is itself accepted (2E-1).
3. The `log` fixture's `debug` level on a retry runs only through `initialLogLevel`'s unit test and a spec branch that
   runs only when CI retries a failure; no harness run reaches retry 1 through the fixture (it works:
   `E/lifecycle/run1.txt`).
4. No harness case for an `afterEach` entry, `log` in `beforeAll`/`afterAll`, or entries after a timeout (all attached:
   `E/lifecycle/run1.txt`).
5. Titles of inherited and `super`-called methods (2E-3).
6. `@step` in a test fixture, a worker fixture and `beforeAll`: locations untested (right: `E/locations/run2.txt`).
7. A second `attachLogsToTest`: documented, untested (decision #41).
8. `tsc`'s standard-decorator output at run time: not in the harness (Babel's and `tsc`'s legacy output are); right in
   the first review's probe, re-run (`run1/sound/standard.d850405.out`).

## What is sound

- Unboxed `@step` from another method, from inside an unboxed step, in a test fixture, a worker fixture and `beforeAll`:
  at the calling line (`E/locations/run2.txt`).
- Boxed `@step` nested in boxed steps, in a test's own boxed step, and the helpers inside them: at the calling line;
  a nested error at the outermost boxed call (`run1/E-1/nested.d850405.out`); a boxed error under an unboxed step at
  the inner call (`E/locations/run2.txt`).
- Unboxed `@step` placement equals Playwright's own `test.step` in every shape probed (`E/locations/pwcontrol.txt`).
- Steps and boxed errors from an ESM `.mts` spec (`file://` frames) at the calling lines (`E/esm/run1.txt`).
- Private `#` methods, recursion and `super` calls run as steps under Playwright's loader (`E/locations/run2.txt`).
- Every refused `@step` form carries the readable message in `tsc`'s output, both modes (`E/types/msg-*.txt`); generic,
  overloaded, `this`-typed, abstract-base, `override`, static generic with a stored `StepDecorator`, and private forms
  compile (`E/types`, `run1/E-5`).
- The run-time Promise check rejects with the compile error's text (`run1/H-7`, `step.spec.ts`).
- The `log` fixture: `debug` on a retry; entries attached after a timeout; usable in `beforeAll`, `afterAll` and
  `afterEach`; the outcome-based fixture's `testInfo.status` claims hold (`E/lifecycle/run1.txt`); a project's own `log`
  built on the base one attaches each entry once (`E/override/run1.txt`); `test.use({ timezoneId: undefined })` keeps
  the project's zone for names and browser alike (`E/tzfallback/run1.txt`).
- The locale and time zone checks and messages for `en_US`, malformed tags and unknown zones on Node 20 and 24
  (`E/locale/locale-hints.mjs`), apart from 2E-1; en-US names use a plain space on Node 20, 22, 24.
- Two fixture files extending POMWright's `test` share one `log` under `mergeTests` (Playwright drops a fixture object
  it already has; `run1/E-4` case 6).
- `StepDecorator` emits in a consumer's declarations (`run1/F-1`).

## Outside the segment

- 2D: `docs/urls-and-navigation.md:109-110` says each navigation call "is a step of the report [...] shown at the line
  that called it"; `goto` and the `expect*` methods use the same `callerLocation` as a boxed `@step`, so 2E-2's shapes
  would apply (not probed here for the helpers).
- Not POMWright's: Playwright's Babel `2023-05` decorators fail on any decorated symbol-named method ("Cannot convert a
  Symbol value to a string", even for a no-op decorator: `E/symbol/`); the documented own-fixture call fails under
  `exactOptionalPropertyTypes`, as Playwright's own `browser.newContext({ locale, timezoneId })` does
  (`E/types/exact.txt`); a static method with a polymorphic `this` parameter on an abstract class is refused under
  standard decorators by any typed method decorator (`E/types/zz-probe-E-thisparam.typecheck.ts`).

## Pass 2 outcomes

Fixed 6 (E-1, E-3, E-4, E-5, H-7, F-1), fixed differently 1 (E-2, decision #10), still present 0, not fixed 0, fixed
incompletely 0, regressed 0, cannot re-run 0. The first review's *considered and not filed* getter case: still not filed
(decided here, `first-review.md`). Its test gaps: 1, 2, 3, 4, 6 closed; 5 partly; 7 open (2E-2).

## What passes 3 and 4 changed

- Pass 3: 2E-2's and 2E-3's *First review* fields (2E-2 ties to E-3's decided wording and the first review's test
  gap 7; 2E-3 confirmed missed); `inventory-reconciled.md`.
- Pass 4: 2E-4, from the first-only line *Upgrading from 2.x*, *Reports*, probed against `pomwright@2.1.0` from npm.
- Considered and not filed: the `log` fixture failing a test that never logs under `en_US` (decided, #10's trade-off);
  `exactOptionalPropertyTypes` and symbol-named methods (Playwright's); the changeset `step-promise-at-runtime.md`'s
  "throws at run time" for a call that rejects (the docs say "rejects"; wording only).

## Proposed sketch

- `E/sketch/2E-1.diff`, `E/sketch/2E-1.run.sh`: the locale hint names a POSIX name's tag (`en_US.UTF-8` → `en-US`) and
  only a value the check accepts; the run exits 1 at `d850405` (`check-hint.mjs`), 0 with the sketch, then the
  logger's unit tests and `logging.spec.ts` on chromium.

## Findings

| ID | Kind | Severity | Semver | Pass | First review | Summary | File |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2E-1 | defect | Low | patch | 1 | new since 54cdada (`b28686b`) | For a POSIX locale name (`en_US.UTF-8`, `nb_NO.utf8`, `de_DE@euro`), the locale check's hint names a value the same check rejects. | [defect-2E-1](defect-2E-1-locale-hint-names-rejected-tag.md) |
| 2E-2 | documentation | Low | none | 1 | new since 54cdada (`f8ca42a`); first review's test gap 7 | The pages say a step is reported at the line that called the method, boxed or not; an unboxed step is placed where it is awaited (none when awaited later), a boxed one called through a non-async function at that function's line, its error at the awaiting line. | [defect-2E-2](defect-2E-2-where-a-step-is-reported.md) |
| 2E-3 | documentation | Low | none | 1 | missed by the first review | No page says the title's class is the receiver's: an inherited method is titled by the subclass, and an override that calls `super` shows two steps with one title. | [defect-2E-3](defect-2E-3-step-title-names-the-receivers-class.md) |
| 2E-4 | documentation | Low | none | 4 | new since 54cdada (`b28686b`) | *Upgrading from 2.x* does not list that a project whose `locale` is not a BCP 47 tag (`en_US`) now fails every test that uses `log`. | [defect-2E-4](defect-2E-4-upgrade-page-omits-locale-check.md) |

Counts: 1 defect (Low; patch), 3 documentation (Low; none), 0 suspected, 0 design questions.
