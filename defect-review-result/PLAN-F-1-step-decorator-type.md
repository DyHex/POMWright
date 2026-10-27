# Plan 15: `StepDecorator` exported

- **Decisions**: [DECISIONS.md](DECISIONS.md) #23
- **Findings**: [F-1](F-packaging-types-changesets/defect-F-1-step-factory-type-not-exported.md); test gap #6's `@step`
  part
- **Bump**: patch (an export §5's promise requires; decision 6); "Added in: v3.0.2" under its heading (decision 7)
- **Stop**: no
- **Depends on**: plan 14 (this interface's overloads are final there); plan 13 (the emit check it extends)

## Contract

`step()` with a title or options returns a decorator whose type is exported from `pomwright` as `StepDecorator`, so a
module can export a preconfigured decorator (`export const boxedStep = step({ box: true })`) and still build with
`declaration: true`.

## Current behaviour

`src/helpers/stepDecorator.ts:27` `interface StepDecoratorFactory` has no `export`, and a consumer's declaration emit
cannot inline an interface: exporting `step({ box: true })` fails with TS4023; `ReturnType<typeof step>` gives the last
overload's `undefined`, so no annotation helps (`…-probes/F/sketch-F-1-step-factory.diff`, `emit-sketch-step/`).

## Steps

1. `src/helpers/stepDecorator.ts`: `export interface StepDecorator` (renamed: the value is a decorator, `step` is the
   factory), declared under its public name, with a doc comment (summary, an example storing a decorator, `@see
   https://dyhex.github.io/POMWright/api/step/#stepdecorator`); its call signatures carry comments of their own where
   the hover shows them (AGENTS.md §9); `index.ts` exports it as a type.
2. **Tests**:
   - `test/tests/packaging/publicTypes.emit.ts`: `export const boxedStep = step({ box: true })` and a class decorated with
     it, and `step(options)` added to plan 13's every-member list;
   - `publicTypes.typecheck.ts`: `const decorator: StepDecorator = step("x")`, and `@ts-expect-error` that it is not a
     value;
   - `stepLegacyDecorators.typecheck.ts`: the stored decorator under `experimentalDecorators`.
3. **Docs**:
   - `api/step.md`: a `## StepDecorator` section, `Added in: v3.0.2` under its heading, with the stored-decorator
     example;
   - `api/index.md`: its row;
   - *Test steps*: a short section on sharing a preconfigured decorator from one module;
   - AGENTS.md §1's export list gains `StepDecorator`.
   The *TypeScript* page's table row comes with plan 32 (decision 48).
4. **Changeset** `step-decorator-type.md` (`patch`): "`step()` with a title or options returns a decorator whose type is
   exported from `pomwright`, `StepDecorator`. A module can export a preconfigured decorator, such as `export const
   boxedStep = step({ box: true })`, and still build with `declaration: true`; before, the emit failed with TS4023."

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
fix: step()'s decorator type is exported as StepDecorator

The interface step() returns had no export, so a module exporting a
preconfigured decorator failed declaration emit with TS4023.

Plan: defect-review-result/PLAN-F-1-step-decorator-type.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
