# Plan 18: `@step`'s Promise rule at run time; legacy decorators run for real

- **Decisions**: [DECISIONS.md](DECISIONS.md) #40, #57
- **Findings**: [H-7](H-docs-readme-agents/defect-H-7-principles-every-rule-at-runtime.md); test gap #13's
  legacy-decorator part (`…-probes/E/steps/legacy.spec.ts`, `legacy/`, `legacy.out`)
- **Bump**: patch (the runtime check)
- **Stop**: no
- **Depends on**: plans 14 and 16 (the same file, `stepDecorator.ts`); plan 17 (*Principles* names one exception fewer)

## Contract

- `@step`'s wrapper checks, in the step's body, what the method returned: a value that is not a Promise or a thenable
  throws `TypeError: @step decorates methods that return a Promise: make the method async`, the compile error's text, so
  the rule holds from JavaScript too. With D-5's check (plan 17), *Principles*' "Every rule about a value is checked at
  runtime" holds; the rules about types themselves (a storage schema's type and value agree; `createRegistryWithAccessors`
  takes its paths as a type argument) are TypeScript's alone, since types do not exist at run time, and the page says so.
- The legacy `(target, key, descriptor)` path runs in the harness on real `tsc` output with `experimentalDecorators`:
  bare, called, boxed, titled and boxed, static, detached, a method that throws, and a method that returns a plain value;
  its steps are reported at the calling line.

## Current behaviour

- `src/helpers/stepDecorator.ts:89-96`: the wrapper returns `test.step(…, () => original.apply(…))`, which resolves a
  plain return value, so from JavaScript a decorated method returning a plain value silently returns a Promise
  (`…-probes/H/principles/zz-probe-H-step-sync.spec.ts`). *Principles* (`docs/principles.md:45`) says "Every rule is
  checked at runtime".
- `test/tsconfig.legacyDecorators.json` is `noEmit`; the legacy call is tested only with a hand-made descriptor in
  `src/helpers/stepDecorator.test.ts`.

## Steps

### Step 1: the runtime check (decision 40)

1. `stepDecorator.ts`: the body passed to `test.step` calls the original, and when the result is not an object or
   function with a `then` function, throws the `TypeError` above; both wrappers (boxed and unboxed). The message is one
   constant shared with the type-level `StepRequiresPromise`.
2. `step`'s doc comment `@throws`: the runtime form.
3. **Tests**: a unit test of the wrapper (`src/helpers/stepDecorator.test.ts`, a fake `test.step` as the file already
   uses, or the runner if it cannot be driven outside it: AGENTS.md §3); a harness spec in `test/tests/step/` where a
   decorated method returning a plain value rejects with the message (the decoration carries `@ts-expect-error`,
   standing in for JavaScript).
4. **Docs**: *Principles*, *Check at runtime; types where they cost nothing*: "Every rule about a value is checked at
   runtime …", then one sentence for the rules about types themselves, which TypeScript alone checks; *Test steps*, *Only
   methods that return a Promise*: at compile time and at run time; `api/errors.md`, *`@step*`: the runtime form;
   AGENTS.md §5, the `@step` bullet (checked at run time too). *Principles* names the schema pairing that plan 24 makes a
   compile error; both land in this release.
5. **Changeset** `step-promise-at-runtime.md` (`patch`): "`@step` on a method that returns a plain value now throws at
   run time too (from JavaScript), with the compile error's message; before, the method silently returned a Promise."

### Step 2: legacy decorators at run time (decision 57)

1. `test/tsconfig.legacyDecorators.json` (or a sibling config run by the same `pnpm typecheck` command) also emits
   `test/step-locations/legacy/legacyWidget.ts` (from scope E's `legacy/legacyWidget.ts`: bare, called, boxed, titled and
   boxed, static, a method that throws, a method returning a plain value) with `experimentalDecorators` into a
   gitignored folder (`test/.legacy-decorators/`); the typecheck probe file stays `noEmit` if it shares the config.
   `.gitignore` gets the folder.
2. `test/step-locations/legacyDecorators.spec.ts` requires the emitted module and calls each method with a
   `// LOCATION <id>` marker (bare, called, boxed, titled and boxed, static, detached, the throwing method's error
   location), so the reporter asserts each calling line under plan 16's location rules; the plain-value method rejects
   with step 1's message.
3. `pack-test.sh`: the step-location run comes after `pnpm typecheck`, which emits the module; check that the order holds
   and that a missing emit fails clearly.
4. **Docs**: AGENTS.md §3 (what `pnpm typecheck` emits) and §4 (the spec); *Internal → Tests and checks*.

## Verify

The standard checks (PLANS.md, rule 5) after each step; `pnpm docs:build` after step 1.

## Commit

```text
fix: @step checks at run time that the method returns a Promise

From JavaScript, a decorated method returning a plain value silently
returned a Promise. It now throws the compile error's message.

Plan: defect-review-result/PLAN-H-7-T13-step-runtime.md (step 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

```text
test: @step's legacy decorators run on real tsc output

Plan: defect-review-result/PLAN-H-7-T13-step-runtime.md (step 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27.

**Step 1 (decision 40).**

- `stepDecorator.ts`: one constant, `STEP_REQUIRES_PROMISE`, whose type is the overloads' `StepRequiresPromise`; the
  wrapper's step body (`run`, shared by the boxed and the unboxed wrapper) calls the original and throws
  `new TypeError(STEP_REQUIRES_PROMISE)` when the result is not thenable. `isThenable` moved from `pageObject.ts` (plan 17)
  to a new `src/helpers/thenable.ts`, used by both; AGENTS.md §2 lists it (19 runtime files, about 6,700 lines). `step`'s
  doc comment `@throws` gives the runtime form.
- Tests: unit (`stepDecorator.test.ts`): a plain value rejects with a `TypeError` and the message, boxed and unboxed,
  after the step opened; a thenable that is not a Promise is accepted (behind a `biome-ignore` for `noThenProperty`);
  the legacy form rejects too. Harness (`test/tests/step/step.spec.ts`, packed): a class whose decorations carry
  `@ts-expect-error` (standing in for JavaScript), unboxed and boxed, rejects with the `TypeError` and the message.
- Docs: *Principles* ("Every rule about a value is checked at runtime"; the two rules about types, TypeScript's
  alone); *Test steps*, *Only methods that return a Promise* (from JavaScript, the same text as a `TypeError` in the
  step); `api/errors.md`, *`@step`*; AGENTS.md §5's `@step` bullet. Changeset `step-promise-at-runtime.md`.
- Checks: `pnpm lint` 0; `pnpm test:unit` 854 passed; `pnpm pack-test --reporter=line` exit 0 (1,560 passed, 3
  skipped; doc snippets 221; api coverage 0 problems; step locations 20); `pnpm docs:build` 0.

**Step 2 (decision 57).**

- A sibling config, `test/tsconfig.legacyDecorators.emit.json`: `experimentalDecorators`, `module`/`moduleResolution`
  `nodenext` (CommonJS output, since `test/` is not `"type": "module"`), `verbatimModuleSyntax: false`, emitting
  `test/step-locations/legacy/legacyWidget.ts` (bare, called, boxed, titled and boxed, static, a method for the detached
  call, a boxed method that throws, a method returning a plain value behind `@ts-expect-error`) into
  `test/.legacy-decorators/`; the typecheck probe's own config stays `noEmit`. `pnpm typecheck` and `pack-test.sh` run it
  after `tsconfig.legacyDecorators.json`, before the step-location run. `.gitignore` and `biome.json` exclude the folder
  (biome lists `test/.doc-snippets` the same way; tsc's default include skips dot folders).
- `test/step-locations/legacyDecorators.spec.ts` requires the emitted module (a missing emit throws: checked, "…/legacyWidget.js
  is missing: pnpm typecheck emits it (tsc -p test/tsconfig.legacyDecorators.emit.json)") and marks each call:
  bare, called, boxed, static and detached steps are titled by class and method (`LegacyWidget.bare`,
  `Anonymous.detached`), so `locationReporter.ts` now also takes a marker equal to a step's title (marker ids may hold
  dots); the plain-value method rejects with step 1's `TypeError` and its step is at the calling line; the throwing
  boxed method's step and error at the calling line. 29 locations checked. One first-draft line put the call and its
  `await` on two lines, and the unboxed step was reported at the `await` (Playwright places an unboxed step where the
  caller waits); the spec keeps them on one line, through a small `rejection()` helper.
- Docs: AGENTS.md §2 (the gitignored folder), §3 (what `pnpm typecheck` emits; `pack-test.sh` runs six commands), §4
  (the legacy spec, title markers, the never-reported rule); *Internal → Tests and checks*, the type checks list (the
  emit as step 4); *Internal → Call sites*, what the step-location check covers.
- Checks: `pnpm lint` 0; `pnpm test:unit` 854 passed; `pnpm pack-test --reporter=line` from an empty
  `test/.legacy-decorators/`, exit 0 (1,560 passed, 3 skipped; 11 step-location probe tests, 29 locations; doc snippets
  221; api coverage 0 problems); `pnpm docs:build` 0.
- **Beyond the plan, reported after it:** the reporter's title markers (bare `@step` titles carry no `LOCATION` id) and,
  in step 1, the new `src/helpers/thenable.ts`.
