# E-3: The `step` API page says `box` makes the report show the step at the line that called the method; every `@step` step is shown there, and `box` moves where an error inside points

- **Kind**: documentation
- **Area**: `step` API page (inventory §2 *Logging, steps and the fixture*, `@step` title and options)
- **Severity**: Low (a misleading description of an option; the behaviour is right and the guide page states it
  correctly)
- **Semver of the fix**: none (docs only)
- **Reviewed**: `54cdada`, 2026-10-23, Claude (claude-opus-5-5), scope E
- **Status**: decided (2026-10-26, [DECISIONS.md #42](../DECISIONS.md))

## Contract

- Playwright's `test.step` documentation (`playwright/types/test.d.ts` of 1.64.0, *Boxing*): "If you would like the
  error to highlight the "login" step instead of its internals, use the `box` option. An error inside a boxed step
  points to the step call site."
- POMWright's own guide agrees: `website/src/content/docs/docs/test-steps.md` line 36, an unboxed `@step()`: "The
  report shows `LoginPage.submit` as a step [...] at the line that called `submit()`"; line 54, `@step({ box: true })`:
  "an error inside points at the line that called confirm()".
- AGENTS.md §9: mirror Playwright in the docs; "explain each feature as the Playwright feature it builds on".

## Reproduction

The page: `website/src/content/docs/api/step.md`, *Arguments*, line 64:

```text
- `options` Object *(optional)*

  `test.step()`'s options, such as `box` (report the step at the line that called the method) and `timeout`.
```

The behaviour (`/home/magdys/workspace/dyhex/POMWright-final-review-probes/E/steps/forms.spec.ts`, run with
`bash /home/magdys/workspace/dyhex/POMWright-final-review-probes/E/steps/run.sh forms.spec.ts`, exit 0, output in
`forms.out`):

```text
STEP [1 bare, called, boxed untitled, static] Forms.called @ forms.spec.ts:55
STEP [1 bare, called, boxed untitled, static] Forms.boxedUntitled @ forms.spec.ts:56
STEP [3 plain throws sync] plain-throws-sync @ forms.spec.ts:69 ERROR @ forms.spec.ts:24
STEP [4 boxed throws sync] boxed-throws-sync @ forms.spec.ts:74 ERROR @ forms.spec.ts:74
```

Unboxed (`called`, line 55) and boxed (`boxedUntitled`, line 56) steps are both reported at the calling line. What `box`
changes is the error: unboxed, at the `throw` inside the method (line 24); boxed, at the calling line (74).

## Observed / expected

Observed: the API page names the step's location as `box`'s effect, which reads as if an unboxed `@step` step were not
reported at the calling line, and does not say what `box` does to errors.

Expected: "`box` (an error inside the method points at the line that called it, not at the line inside the method)",
in line with Playwright's description and with `docs/test-steps.md` line 54.

## Cause

Wording of `website/src/content/docs/api/step.md` line 64.

## Fix plan

Per AGENTS.md §6, to be confirmed before any code changes.

- **Intended contract**: unchanged; the page describes `box` as Playwright does.
- **Options**: reword line 64 *(recommended)*; nothing else on the site describes `box` this way (grep for `box` over
  `website/src/content/docs`).
- **Implementation steps**: edit `website/src/content/docs/api/step.md` line 64.
- **Tests**: none; `pnpm docs:build`.
- **Docs**: the page above. The doc comment of `step` (`src/helpers/stepDecorator.ts:133`, "`test.step`'s options,
  such as `box` and `timeout`") is neutral and can stay.
- **Changeset**: none (docs only).
- **Decisions to tick**:
  - [x] The wording: as in [DECISIONS.md #42](../DECISIONS.md)
- **Execution order**: with E-1, whose docs touch the same pages.
