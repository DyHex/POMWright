# Segment 2E: Logging, `@step` and the fixture

Segment 2E of the second review at `d850405`. Read [../segments.md](../segments.md) first (the four passes, where things
are, probing, what to write), then [../baseline.md](../baseline.md). Probes go to
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/E/`. Review it as an *area* in the skill's terms, with the commits
since `v3.0.1` as a change set.

## The guide, read first

`AGENTS.md`, `src/AGENTS.md`, `src/helpers/AGENTS.md` and `test/AGENTS.md`, in full, in the worktree.

## In scope

- **Source**: `src/helpers/playwrightReportLogger.ts`, `stepDecorator.ts`, `src/fixture/base.fixtures.ts`, and
  `callSite.ts` as steps use it. Read all of it, with its doc comments.
- **Unit tests**: the logger's, the decorator's (`stepDecorator.test.ts`, `stepDecorator.test-d.ts`), the fixture's, and
  the step parts of `callSite.test.ts`.
- **Harness**: `test/tests/logging/logging.spec.ts`, `test/tests/step/step.spec.ts`, `test/step-locations/` (the spec,
  the legacy-decorator module and spec, as far as which locations they check), `test/tests/packaging/stepLegacyDecorators.typecheck.ts`,
  `test/tsconfig.legacyDecorators.json` and `tsconfig.legacyDecorators.emit.json`, and the step and logger parts of
  `test/tests/packaging/publicTypes.typecheck.ts`.
- **Docs** (under `website/src/content/docs/`): `docs/logging.md`, `test-steps.md`; `api/step.md`, `fixtures.md`,
  `class-playwrightreportlogger.md`; the logger and step sections of `api/errors.md`; the steps part of
  `internal/call-sites.md`.

## The change set

`git -C /home/magdys/workspace/dyhex/POMWright-second-review log --format='%h %ad %s' --date=short v3.0.1..HEAD -- src/helpers/playwrightReportLogger.ts src/helpers/stepDecorator.ts src/helpers/stepDecorator.test-d.ts src/helpers/callSite.ts src/fixture test/tests/logging test/tests/step test/step-locations website/src/content/docs .changeset ':!defect-review-result'`,
narrowed to what touches logging, steps and the fixture. Read each diff and its changeset; the commits after `54cdada`
first.

## Questions for pass 1

On top of the skill's checklist; questions, not suspicions.

- **`@step` forms**: under standard and legacy (`experimentalDecorators`) decorators, as `tsc` and as Playwright's
  loader compile them, on every kind of method (async, sync, generic, static, getter, private, inherited, overridden,
  detached), with and without its options.
- **Where a step is reported**: the location of a step and of its error in every form, boxed and not, nested, in a
  page object, a fixture and a helper module.
- **The logger**: levels, the locale, child loggers, when entries are attached and how often, across retries and
  workers, and what happens after the test ends.
- **The fixture**: its lifecycle, and what a test sees when it overrides or extends it.
- **Messages and types**: every message the pages and the `@throws` show, character for character; `StepDecorator`
  and the logger's types against the runtime.

## Pass 2: the first review

Its scope E: `defect-review-result/E-logging-step-fixture/`; the ledger rows of `defect-review-result/report.md` whose
area is logging, steps or the fixture, their `DECISIONS.md` entries and their plans; the items
`PLAN-release-gates-and-audit.md` leaves for the second review in this area; the first `inventory.md`'s lines tagged
`[E]`. Probes: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/E/`.

## Neighbours

The step-location check as a mechanism (its reporter and config) is 2T's, packaging 2F's, page objects 2D's. Report
what you meet there under *outside the segment*.
