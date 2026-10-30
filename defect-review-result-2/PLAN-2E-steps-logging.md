# Plan: steps and logging (2E-1; docs: 2E-2, 2E-3)

- **Decisions**: [94, 105, 112 (point 2)](DECISIONS.md) (2026-10-29)
- **Findings**: [2E-1](E-logging-step-fixture/defect-2E-1-locale-hint-names-rejected-tag.md),
  [2E-2](E-logging-step-fixture/defect-2E-2-where-a-step-is-reported.md),
  [2E-3](E-logging-step-fixture/defect-2E-3-step-title-names-the-receivers-class.md) (all Low)
- **Bump**: none new: decision 94 corrects the pending `.changeset/log-locale-check.md`; 105 is docs
- **Stop**: none planned (no CI change)
- **Depends on**: nothing; 2E-4 (the upgrade guide's locale item, decision 101) quotes the message, which stays as it is
  for `en_US`

## Contract

1. **The locale hint (decision 94).** In `checkDateFormat` (`src/helpers/playwrightReportLogger.ts`), a locale that
   `Intl.getCanonicalLocales` rejects and that holds `_` gets a hint built by dropping a POSIX codeset (`.…`) and
   hyphenating, given only when `Intl` accepts it; a value with a modifier (`@…`) gets none: `en_US.UTF-8` → `en-US`,
   `nb_NO.utf8` → `nb-NO`, `zh_Hant_TW` → `zh-Hant-TW`; `sr_RS@latin`, `de_DE@euro` and `C.UTF-8` no hint. The
   message's wording is unchanged.
2. **Where a step is reported (decision 105, point 1).** *Test steps*: a call awaited where it is made is reported at
   its line; otherwise the step is where Playwright places a `test.step` (an unboxed step awaited later has no location;
   in a multi-line `Promise.all`, the `await` line); `api/step.md` and the `step` doc comment say it briefly; the `box`
   option's note: a boxed step under a wrapping decorator is at that decorator's line, its error at the awaiting line.
3. **Whose class a step's title names (decision 105, point 2).** The class of the object the method runs on: an
   inherited method shows the subclass, a `super` call shows two steps with one title; on *Test steps*, `api/step.md`
   and the doc comment.

## Current behavior (re-checked 2026-10-29 at the branch)

- The hint is the value with `_` replaced (`playwrightReportLogger.ts:345-352`); the review's probe, re-run:
  `en_US.UTF-8`
  → `en-US.UTF-8` and `nb_NO.utf8` → `nb-NO.utf8`, each rejected by the same check. Node: `sr-RS` formats January as
  `јануар`, `sr-Latn-RS` as `januar`.
- `api/step.md` lines 64-65 and *Test steps* lines 36, 55, 102 promise the calling line for every call; the `step` doc
  comment says "titled `ClassName.methodName`".

## Implementation (one commit per step)

1. **The locale hint** (decision 94): `checkDateFormat`; *Logging* (a POSIX name such as `en_US.UTF-8`, as `LANG` holds
   it, is not a tag: write `en-US`); `.changeset/log-locale-check.md` gains the POSIX case.
2. **The steps docs** (decision 105): *Test steps*, `api/step.md`, the `step` doc comment; every placement copied from
   the review's probe and print reporter (`$P/E/locations/`), re-run against the build.

## Tests

- Unit, `src/helpers/playwrightReportLogger.test.ts`: the values of the contract, and every hint given accepted by
  `Intl.getCanonicalLocales`.
- Unit, `src/helpers/stepDecorator.test.ts`: an inherited method's step title names the subclass; a `super` call gives
  two steps with one title.
- The review's location probe re-run (an unboxed step awaited later; a multi-line `Promise.all`; a boxed step under a
  wrapping decorator); the step-location suite stays green.
- `test/step-locations/` gains `get`, `clear` and `seed` among the storage methods it checks (decision 112), each
  reported at the line that called it.

## Verification

Per step: `pnpm lint`, `pnpm test:unit`. At the end: `pnpm typecheck`, `pnpm docs:build`, the full `pnpm pack-test
--reporter=line` (its step-location run included), the grep for the external consumer projects' names.

## Decisions checklist

- [x] Decision 94: the codeset dropped, no hint for a modifier; *Logging*; the changeset corrected
- [x] Decision 105: where a step is reported; whose class its title names; a unit test
- [x] Decision 112, point 2: `get`, `clear` and `seed` in the step-location suite

## Execution

Two commits, `fix(logging): …` and `docs: …`, each with `Plan: defect-review-result-2/PLAN-2E-steps-logging.md` and the
`Co-Authored-By:` trailer. The maintainer pushes.

## Execution notes

- 2026-10-30. The commits, one per step: `dad687e` (1, decision 94), `98afe68` (2, decisions 105 and 112, point 2),
  and this record.
- **Verification:**
  - the full `pnpm pack-test --reporter=line`: 1863 passed and 3 skipped on three browsers, and 36 step locations
    (33 before: `get`, `clear` and `seed` added);
  - `pnpm test:constrained`, which `test/AGENTS.md` asks for after a change to steps: the same, in 279 s;
  - 1006 unit tests; `pnpm typecheck`, `pnpm docs:build` and `pnpm lint` pass; no name of the external consumer
    projects on the branch.
- **Step 1:** the unit test of the POSIX names failed on the old code (`"en-US.UTF-8"` was hinted) and passes with
  the change. Every hint it checks is accepted by `Intl.getCanonicalLocales`. `C.UTF-8`, `sr_RS@latin`, `de_DE@euro`
  and `x_!!` get no hint.
- **Step 2:**
  - The review's location probe and its print reporter (`E/locations/`) were re-run against the build, copied into
    `test/` and deleted afterwards. Its step and error lines were identical to the review's `run2.txt`, and every
    placement on *Test steps* is taken from them.
  - The two title tests pin behavior that already held (decision 105 documents it), so they pass on the old code as
    well.
  - *Test steps*' opening sentence now says "called and awaited", with a link to the new section.
- Nothing unexpected.
