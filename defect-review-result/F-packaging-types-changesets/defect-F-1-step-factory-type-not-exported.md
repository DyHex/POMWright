# F-1: `step()` returns a type `pomwright` does not export, so a preconfigured decorator cannot be exported from a package built with `declaration: true`

- **Kind**: defect
- **Area**: Types: every public method returns an importable type; declaration emit (inventory §6, [F]); `step` (§1)
- **Severity**: Low. Only declaration emit of a module that exports a decorator returned by `step(...)`. Runtime and type checking are unaffected, and the workaround is not to export it.
- **Semver of the fix**: patch. Under AGENTS.md §7 an export that §5's promise requires is a patch ("every public method returns a type a consumer can import from the root").
- **Reviewed**: `54cdada`, 2026-10-23, Claude (Opus 5.5)
- **Status**: decided: fix, option A as `StepDecorator` (2026-10-26, [DECISIONS.md #23](../DECISIONS.md))

## Contract

- AGENTS.md §5 (line 229): "Every public method returns a type a consumer can import from the root, except the registration builders of `add(path)`."
- `docs/installation.md:67-69`: "`declaration: true` … every exported value's type must be nameable. POMWright's types are, except in one pattern; see Locator modules."
- `docs/typescript.md:84-88`: "With the types above it is, except for a function that returns a registration by accident."
- Commit `7447754` applied the §5 rule to the session storage types. `step` was not covered.

## Reproduction

Setup, already present in the probes folder:
- `/home/magdys/workspace/dyhex/POMWright-final-review-probes/F/emit-pnpm/package.json` installs `@playwright/test` 1.64.0, `@types/node` ^24.19.2, `typescript` 6.0.3, and `pomwright` as `file:../tarball/pomwright-54cdada.tgz`.
- That tarball is a copy of the worktree's `pomwright-test-build.tgz`, sha256 `9fef617b…79ee`.
- Run `pnpm install` there.

Probe `g/stepFactory.ts`:

```ts
import type { Page } from "@playwright/test";
import { step } from "pomwright";
export const boxedStep = step({ box: true });
export const titledStep = (title: string) => step(title, { box: true });
export class Cart {
  constructor(readonly page: Page) {}
  @boxedStep
  async open(): Promise<void> {}
}
```

```sh
cd /home/magdys/workspace/dyhex/POMWright-final-review-probes/F/emit-pnpm
npx tsc --strict --target es2022 --module esnext --moduleResolution bundler --declaration --emitDeclarationOnly --outDir out/g --types node --skipLibCheck g/stepFactory.ts
```

Exit code 1. The same probe in the npm project `consumer-cjs/emit` (`../node_modules/.bin/tsc …`) also exits 1 with the same errors. With `--noEmit` it exits 0, so only the emit fails.

The obvious annotation does not help (`g/annotate.ts`):
- `export const boxedStep: ReturnType<typeof step> = step({ box: true });` is rejected with TS2322, "Type 'StepDecoratorFactory' is not assignable to type 'undefined'".
- `ReturnType` of the overloaded `step` is its last overload's result, `undefined`.

Source sketch (`sketch-F-1-step-factory.diff`): `export interface StepDecoratorFactory` in `src/helpers/stepDecorator.ts`, plus `export { type StepDecoratorFactory, step }` in `index.ts`. After build and pack (`tarball/pomwright-sketch-step.tgz`, project `emit-sketch-step/`), the same command exits 0 and emits:

```ts
export declare const boxedStep: import("pomwright").StepDecoratorFactory;
export declare const titledStep: (title: string) => import("pomwright").StepDecoratorFactory;
```

## Observed / expected

Observed:

```text
g/stepFactory.ts(4,14): error TS4023: Exported variable 'boxedStep' has or is using name 'StepDecoratorFactory' from external module ".../pomwright/dist/index" but cannot be named.
g/stepFactory.ts(5,14): error TS4023: Exported variable 'titledStep' has or is using name 'StepDecoratorFactory' from external module ".../pomwright/dist/index" but cannot be named.
```

Expected: `step()`'s result is nameable from the root, so the module emits.

## Cause

- `src/helpers/stepDecorator.ts:27` declares `interface StepDecoratorFactory` without `export`.
- Lines 145-148 (`step()`, `step(title)`, `step(options)`, `step(title, options)`) return it.
- `index.ts:14` exports `step` only.
- An interface cannot be inlined into a consumer's declarations, so the consumer's emit cannot name it.
- `surface.mjs` (a walk of `dist/index.d.ts`) finds no other public function or method whose return type is an unexported interface or class. The registration builders are the documented exception; F-2 covers what the registry hands out.

## Fix plan

- **Intended contract**: the type of the decorator that `step(title?, options?)` returns is importable from `pomwright`. A module may export a preconfigured decorator and still build with `declaration: true`.
- **Options**:
  - **A (recommended)**: export the interface as a type under a public name, `StepDecoratorFactory` or a shorter `StepDecorator`. It is an interface, not a class, so the §5 rule against classes re-exported as types does not apply. Patch. Breaks nothing.
  - **B**: docs only. Add it as a second exception to the `declaration: true` paragraphs (F-3). None, but a module cannot name the type at all, so A is better.
- **Implementation steps**: `src/helpers/stepDecorator.ts` (`export interface …` with a doc comment: summary, `@see https://dyhex.github.io/POMWright/api/step/#stepdecoratorfactory`, an example); `index.ts` (export the type).
- **Tests**:
  - `test/tests/packaging/publicTypes.emit.ts`: add `export const boxedStep = step({ box: true });` and a class decorated with `@boxedStep`.
  - `publicTypes.typecheck.ts`: `const factory: StepDecoratorFactory = step("x")`, plus `// @ts-expect-error` that it is not a value.
  - Optionally `stepLegacyDecorators.typecheck.ts`: the stored decorator under `experimentalDecorators`.
  - `pnpm typecheck` (check-api-coverage will require the heading).
- **Docs**:
  - `api/step.md`: a `## StepDecoratorFactory` section, with the stored-decorator example.
  - `api/index.md` *Reports* row.
  - `docs/typescript.md` table row.
  - `docs/test-steps.md`: optionally, a line on a shared preconfigured decorator.
  - AGENTS.md §1 export list.
  - The sentence "as every other public signature already allows" in `.changeset/export-storage-types.md` then holds for return types.
- **Changeset**: patch. "The decorator that `step()` returns for a title or options has a type exported from `pomwright`, `StepDecoratorFactory`, so a module can export a preconfigured decorator such as `export const boxedStep = step({ box: true })` and still build with `declaration: true`; before, the emit failed with TS4023."
- **Decisions to tick**:
  - [x] Export the type (A), or document it as an exception (B): **A**
  - [x] Its public name (`StepDecoratorFactory` or `StepDecorator`): **`StepDecorator`**, the interface renamed in the
    source (declared under its public name); the value is a decorator, `step` is the factory
  - [x] Patch, as an export §5's promise requires; an "Added in: v3.0.2" marker
  - [x] (added) Tests and docs as listed above, with a short section on a shared preconfigured decorator in
    `docs/test-steps.md`; a new patch changeset naming `StepDecorator` ([DECISIONS.md #23](../DECISIONS.md))
- **Execution order**: independent. Do it before F-3's docs rewrite, so that page lists only the exceptions that remain.

> Saved by the orchestrating session from the agent's final report, with the user's approval: the agent's own write of this file was refused by a harness rule ("Subagents should return findings as text, not write report files").
