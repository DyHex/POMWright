# Plan 34: docs: `declaration: true`, the `log` fixture, `box`

- **Decisions**: [DECISIONS.md](DECISIONS.md) #39, #41, #42
- **Findings**: [F-3](F-packaging-types-changesets/defect-F-3-declaration-true-docs-pnpm.md),
  [E-4](E-logging-step-fixture/defect-E-4-attachlogstotest-lifecycle-undocumented.md),
  [E-3](E-logging-step-fixture/defect-E-3-step-api-page-misdescribes-box.md); the `log` fixture's redesign is GitHub
  issue #62 (breaking, not in this release)
- **Bump**: none (docs, one harness case)
- **Stop**: no
- **Depends on**: plans 13 and 15 (only two `declaration: true` exceptions remain), 16 (where steps are reported), 19
  (the logger's doc comment)

## Contract

- *TypeScript*, `declaration: true`, lists the two exceptions that remain, each with its fix:
  - **a registration**: "`add(path)`'s registration isn't exported, by design: it ends at the next registry call. Don't
    return one: give a function that registers a block body or `: void` (*Locator modules*), and share a locator by reuse
    by path or reuse by seed instead (*Reusing locators*)." Both ways are valid; the paragraph does not rank them.
  - **under pnpm, a module that imports only from `pomwright`** and exports a value holding Playwright's types (an
    extended `test`, a seed's `definition`): TS2883; import from `@playwright/test` in that module, as the fixture
    examples do with `expect`, or annotate (`ReusableLocator<Paths>["definition"]`); under npm the emit otherwise names
    `playwright/test` and `playwright-core`.
  *Installation*'s bullet links there ("except in one pattern" goes); the fixture examples (*Page objects in tests*,
  `api/fixtures.md`) say in one sentence that the `expect` re-export also lets the module's declarations name
  Playwright's types; *Internal → Packaging* explains TypeScript's portability rule (a type is named through a module the
  file imports; pnpm does not expose Playwright's internal packages).
- `attachLogsToTest`'s API entry and doc comment: "Attaches every recorded entry, a child logger's included, one
  attachment per entry in call order. Call it once, at the end of the test, in your own `log` fixture, which replaces
  POMWright's. With POMWright's `test`, the `log` fixture calls it; don't call it yourself, or every entry is attached
  twice." *Logging to the report*, *Your own fixture*: why to write one (Playwright's own `test`, or to decide which
  levels are recorded and attached), two examples (the retry-based fixture, as POMWright's does, and the outcome-based
  one: record every level; when `testInfo.status === testInfo.expectedStatus` keep `warn` and `error`, otherwise attach
  every level), one sentence that such a fixture is the only caller; the teardown rule ("An entry logged after the `log`
  fixture has attached the entries is not attached: a fixture that logs in its teardown depends on `log`, so Playwright
  tears it down first."); *Child loggers*: its entries are attached with the test's. Behaviour unchanged.
- `api/step.md`'s `options` line: "`test.step()`'s options, such as `box` (an error inside the method points at the line
  that called it, not at the line inside the method; the step is reported at the calling line either way) and
  `timeout`."

## Current behaviour

- `docs/typescript.md:84-89` and `docs/installation.md:67-68` say POMWright's types are nameable "except in one pattern",
  while under pnpm a module importing only `pomwright` fails with TS2883 for an extended `test` and a seed's `definition`
  (`…-probes/F/emit-pnpm/`).
- `attachLogsToTest`'s API sentence "call it in a fixture of your own" invites a second call beside POMWright's `log`
  fixture (every entry attached twice); an entry logged after the fixture's teardown is dropped, undocumented
  (`…-probes/E/logger/logger.out`).
- `api/step.md:64` gives `box` the effect "report the step at the line that called the method", which every `@step` step
  has; `box` moves where an error inside points (`…-probes/E/steps/forms.out`).

## Steps

1. The pages and doc comments above. Every example compiled by the snippet check: the import-pattern module (an `import
   type { … } from "@playwright/test"` beside a value holding Playwright's types, under pnpm with `declaration: true`)
   and both fixture examples (`…-probes/R/walkthrough/e4/own-fixture.spec.ts` as the source of the outcome-based one).
2. **Tests**: a harness case in `test/tests/logging/logging.spec.ts`: a fixture that depends on `log` logs in its
   teardown, and that entry is attached (the teardown rule's positive side); read through the existing auto-fixture
   pattern of that folder.
3. `step`'s doc comment stays ("`test.step`'s options, such as `box` and `timeout`").

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
docs: declaration: true's two exceptions, the log fixture's lifecycle, and box

Plan: defect-review-result/PLAN-F-3-E-4-E-3-docs.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
