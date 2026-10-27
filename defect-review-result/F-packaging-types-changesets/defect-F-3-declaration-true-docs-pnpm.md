# F-3: The `declaration: true` paragraphs do not say that, under pnpm, a module importing only from `pomwright` cannot emit what holds Playwright's types (TS2883)

- **Kind**: documentation
- **Area**: `docs/installation.md` *TypeScript settings*; `docs/typescript.md` *`declaration: true`*; declaration emit (inventory §6, [F])
- **Severity**: Low. Only projects that publish page objects with `declaration: true`. Under pnpm the emit fails; under npm it succeeds but references packages the project does not declare. The workaround is one import.
- **Semver of the fix**: none (docs only).
- **Reviewed**: `54cdada`, 2026-10-23, Claude (Opus 5.5)
- **Status**: decided: option A (2026-10-26, [DECISIONS.md #39](../DECISIONS.md))

## Contract

- `docs/installation.md:67-69`: "When it is on, every exported value's type must be nameable. POMWright's types are, except in one pattern; see Locator modules."
- `docs/typescript.md:86-88`: "With the types above it is, except for a function that returns a registration by accident".
- The docs recommend `import { test as base } from "pomwright"` for fixtures (`docs/page-objects-in-tests.md`, `api/fixtures.md`). Their examples also re-export `expect` from `@playwright/test`, which is what makes them emit.

## Reproduction

Setup: `emit-pnpm/` (pnpm, as in F-1) and `consumer-cjs/emit/` (npm, the same tarball and versions).

```ts
// d/fixturesNoPw.ts: a fixtures module importing only from pomwright
import { test as base } from "pomwright";
export const test = base.extend<{ answer: number }>({
  answer: async ({}, use) => {
    await use(42);
  },
});
```

```ts
// a/seedDefinition.ts (excerpt)
import type { ReusableLocator } from "pomwright";
type Paths = "list" | "list.item";
export const anyDefinition = (seed: ReusableLocator<Paths>) => seed.definition;
export const locatorDefinition = (seed: ReusableLocator<Paths, "locator">) => seed.definition;
```

```sh
cd /home/magdys/workspace/dyhex/POMWright-final-review-probes/F/emit-pnpm
npx tsc --strict --target es2022 --module esnext --moduleResolution bundler --declaration --emitDeclarationOnly --outDir out/d --types node --skipLibCheck d/fixturesNoPw.ts   # exit 1
npx tsc --strict --target es2022 --module esnext --moduleResolution bundler --declaration --emitDeclarationOnly --outDir out/a --types node --skipLibCheck a/seedDefinition.ts  # exit 1
```

What else I ran:
- `--module nodenext --moduleResolution nodenext` gives the same TS2883 for `d/`.
- Controls that emit (exit 0):
  - `d/fixturesWithExpect.ts`: the same module plus `export { expect } from "@playwright/test";`, the docs' pattern;
  - `e/seedDefinitionWithPw.ts`: the seed module plus `import type { Page } from "@playwright/test"`; only its `createReusable` line fails, which is F-2;
  - `b/playwrightOnly.ts`: Playwright alone.
- Under npm (`consumer-cjs/emit`, `../node_modules/.bin/tsc` with the same flags), `a/` and `d/` exit 0 but emit references to packages the project never declared:

```ts
export declare const test: import("playwright/test").TestType<import("playwright/test").PlaywrightTestArgs & … & { log: import("pomwright").PlaywrightReportLogger; } & { answer: number; }, …>;
export declare const anyDefinition: (seed: ReusableLocator<Paths>) => { type: "role"; role: Parameters<import("playwright-core").Page["getByRole"]>[0]; … } | …
```

## Observed / expected

Observed (pnpm):

```text
d/fixturesNoPw.ts(3,14): error TS2883: The inferred type of 'test' cannot be named without a reference to 'PlaywrightTestArgs' from '.pnpm/playwright@1.64.0/node_modules/playwright/test'. This is likely not portable. A type annotation is necessary.
… (the same for PlaywrightTestOptions, PlaywrightWorkerArgs, PlaywrightWorkerOptions, TestType)
a/seedDefinition.ts(4,14): error TS2883: The inferred type of 'anyDefinition' cannot be named without a reference to 'Locator' from '.pnpm/playwright-core@1.64.0/node_modules/playwright-core'. This is likely not portable. A type annotation is necessary.
a/seedDefinition.ts(6,14): error TS2883: The inferred type of 'locatorDefinition' cannot be named without a reference to 'Locator' from '.pnpm/playwright-core@1.64.0/node_modules/playwright-core'. …
```

Expected: the docs name every pattern a reader can meet and say how to fix each. Here that means: a module that exports values holding Playwright's types must import from `@playwright/test` itself, or annotate. Following F-1 and F-2, the docs' "one pattern" is also wrong until those are fixed.

## Cause

- **Why TypeScript fails.** It can name a Playwright type in a consumer's declarations only through a module the file imports that re-exports it, here `@playwright/test`. Without one it falls back to the declaring package (`playwright/test`, `playwright-core`), which pnpm does not expose to the project.
- **Why POMWright exposes this.** Its `test` hands out Playwright's `TestType`, and a `ReusableLocator`'s `definition` is typed by unexported aliases (`LocatorDefinitionByType`, `RoleDefinition`, … in `src/locators/types.ts`). The compiler has to inline those, and they contain `Parameters<Page[…]>` with `Locator` in the `locator` options.
- **What it means for this note.** It is the compiler's portability rule under pnpm's layout rather than a packaging fault. POMWright's part is the documentation, and optionally the inlined definition types.

## Fix plan

- **Intended contract**: the `declaration: true` paragraphs list every case that needs an annotation or an import, with the fix for each.
- **Options**:
  - **A (recommended)**: docs only. Rewrite `docs/typescript.md#declaration-true`, and point the installation page there. Cover:
    - (1) a registration returned by accident, as now;
    - (2) a module that exports what holds Playwright's types (an extended `test`, a seed's `definition`, a locator) must import from `@playwright/test`, as the fixtures examples do with `expect`, or annotate (`ReusableLocator<Paths>["definition"]`). Under npm the emit otherwise names `playwright/test` or `playwright-core`;
    - (3) whatever of F-1 and F-2 is not fixed, with its annotation.
    - In the fixtures examples, say why `export { expect } from "@playwright/test"` is there, beyond convenience.
  - **B**: export the definition types (minor). Removes only the `seed.definition` case; `test.extend` remains. Not recommended.
- **Implementation steps**: `website/src/content/docs/docs/typescript.md`, `docs/installation.md`, optionally `docs/locator-modules.md#what-a-module-may-return` and `docs/page-objects-in-tests.md`.
- **Tests**:
  - A doc snippet with `declaration: true` already runs under pnpm in the snippet check. Add a block that shows the import, so the check keeps it emitting.
  - Optionally a second emit probe in `test/tests/packaging/` that imports only from `pomwright` and annotates, so the advice stays true.
- **Docs**: as above; `internal/packaging.md` may add the reason (the portability rule).
- **Changeset**: none (docs only).
- **Decisions to tick**:
  - [x] Document the import rule (A): with the registration case worded "by design; share a locator by reuse by path or
    reuse by seed instead" ([DECISIONS.md #39](../DECISIONS.md))
  - [x] Whether to export the definition types (B): no
- **Execution order**: after F-1 and F-2 are decided, since the list of exceptions depends on them.

> Saved by the orchestrating session from the agent's final report, with the user's approval: the agent's own write of this file was refused by a harness rule ("Subagents should return findings as text, not write report files").
