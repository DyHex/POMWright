# F-2: `createRegistryWithAccessors()`'s result, its `add`, and `registry.createReusable` cannot be emitted with `declaration: true`, though the docs name only a returned registration

- **Kind**: defect
- **Area**: Types: declaration emit without annotations (inventory §6, [F]); `createRegistryWithAccessors`, `AddAccessor`, `LocatorRegistry.createReusable` (§1)
- **Severity**: Low. Only declaration emit of a module that returns these values unannotated. Annotations with exported names work (`emit-pnpm/j/annotated.ts`).
- **Semver of the fix**: patch.
  - Making `AddAccessor` an interface is type-identical for callers.
  - A public name for the seed factory is an export the docs' "POMWright's types are [nameable]" promise requires, the same reasoning `7447754` used.
  - If that promise is not taken as requiring it, the factory alias is a minor; the `AddAccessor` part stays a patch.
- **Reviewed**: `54cdada`, 2026-10-23, Claude (Opus 5.5)
- **Status**: decided: fix, option A with `ReusableLocatorFactory` (2026-10-26, [DECISIONS.md #24](../DECISIONS.md))

## Contract

- `docs/installation.md:67-69`: "every exported value's type must be nameable. POMWright's types are, except in one pattern".
- `docs/typescript.md:86-88`: "With the types above it is, except for a function that returns a registration by accident".
- AGENTS.md §5 (line 229): every public method returns an importable type, except the registration builders of `add(path)`.
- The harness knows about the factory result (`test/tests/packaging/publicTypes.emit.ts:44-46`): "the factory's whole result also holds add, whose registration views are unexported, so it does not emit (as in 2.x)". No page says so.

## Reproduction

Setup as in F-1: the project `/home/magdys/workspace/dyhex/POMWright-final-review-probes/F/emit-pnpm` (pnpm). The npm equivalent is `consumer-cjs/emit`.

Probe `f/patterns.ts` (excerpt; the file is in the probes folder):

```ts
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors, type LocatorRegistry } from "pomwright";
type Paths = "list" | "list.item";
export const listRegistry = (page: Page) => {            // line 8
  const accessors = createRegistryWithAccessors<Paths>(page);
  accessors.registry.add("list").locator("ul");
  accessors.registry.add("list.item").getByRole("listitem");
  accessors.registry.verify();
  return accessors;
};
export const addOf = (page: Page) => createRegistryWithAccessors<Paths>(page).add;   // line 16
export const seedsOf = (registry: LocatorRegistry<Paths>) => registry.createReusable; // line 18
```

```sh
cd /home/magdys/workspace/dyhex/POMWright-final-review-probes/F/emit-pnpm
npx tsc --strict --target es2022 --module esnext --moduleResolution bundler --declaration --emitDeclarationOnly --outDir out/f --types node --skipLibCheck f/patterns.ts
```

Exit code 1 under pnpm and under npm. The same file's page-object helpers (`navigation`, `goto`, `sessionStorage`, `set`, `fullUrl`, a standalone `SessionStorage`) emit.

**Sketch 1, an annotation alone.** An explicit return type on `createRegistryWithAccessors` naming `AddAccessor<Paths>` (`tarball/pomwright-sketch-registry.tgz`) does not help. `AddAccessor` is `LocatorRegistryInternal<P>["add"]`, an indexed access the compiler resolves to the method's type and does not keep as a name: the same TS4023 and TS4094.

**Sketch 2** (`sketch-F-2-registry-types.diff`, `tarball/pomwright-sketch-factory.tgz`, project `emit-sketch/`):
- `AddAccessor` declared as an interface with `add`'s call signature, and `const add: AddAccessor<Paths>`;
- `createReusable` typed by an exported alias over the class, named `SeedFactory` in the sketch; the alias pattern is what `LocatorQueryBuilder` already does.
- Results:
  - the command above exits 0;
  - it emits `import("pomwright").SeedFactory<Paths>` for `seedsOf`, and the result of `createRegistryWithAccessors` with `add: AddAccessor<Paths>`;
  - `test/tests/packaging/publicTypes.typecheck.ts` passes against the sketch (exit 0), and so does `publicTypes.emit.ts`, including the whole factory result appended.

## Observed / expected

Observed (pnpm; npm prints the same with the hoisted path):

```text
f/patterns.ts(8,14): error TS4023: Exported variable 'listRegistry' has or is using name 'LocatorRegistrationPostDefinitionBuilder' from external module ".../pomwright/dist/index" but cannot be named.
f/patterns.ts(8,14): error TS4094: Property 'applyDescription' of exported anonymous class type may not be private or protected.
… (21 more TS4094 for the registration builder's private members, at line 8 and again at line 16 for addOf)
f/patterns.ts(18,14): error TS4094: Property 'create' of exported anonymous class type may not be private or protected.
```

Expected, by the docs' claim: only a function that returns a registration fails. A standalone registry's result, its `add` (which has an exported name, `AddAccessor`) and the seed factory emit.

## Cause

- `src/locators/locatorRegistry.ts:648`: `export type AddAccessor<…> = LocatorRegistryInternal<…>["add"]`. It is an indexed access, so the alias disappears.
- `createRegistryWithAccessors` (lines 711-719) has no return annotation, and `add` is typed with the same indexed access (line 713). Its declared result therefore spells out `add`'s signature with the unexported registration builders (`dist/index.d.ts:1922-1930`).
- `locatorRegistry.ts:108`: `readonly createReusable: ReusableLocatorFactory<…>`. That is a class, unexported, with a private `create` (`src/locators/reusableLocatorBuilder.ts:84`), so no consumer's declarations can contain it.

## Fix plan

- **Intended contract**: everything the registry and `createRegistryWithAccessors` hand out, except a registration, emits without an annotation.
- **Options**:
  - **A (recommended)**:
    - Declare `AddAccessor` as an interface with `add`'s call signature, then type `add` with it in `createRegistryWithAccessors` and on `PageObject`. Type-identical, patch.
    - Give `createReusable` a public type alias over the factory class, exported, with an API heading. A name such as `ReusableLocatorFactory` needs the class renamed to `ReusableLocatorFactoryInternal`, as the query builder is. Patch, or minor (see above).
    - Cost: the add signature is written twice (method and interface), or the method is typed from the interface. The harness typecheck catches any drift.
  - **B**: `AddAccessor` only (patch), and document `createReusable` as an exception, with the annotation `LocatorRegistry<Paths>["createReusable"]`.
  - **C**: docs only (none). List both as exceptions, with the annotations that work: `AddAccessor<Paths>`, `GetNestedLocatorAccessor<Paths>`, …, and `LocatorRegistry<Paths>["createReusable"]`.
- **Implementation steps**: `src/locators/locatorRegistry.ts` (`AddAccessor`, `createRegistryWithAccessors`, `createReusable`'s type); `src/locators/reusableLocatorBuilder.ts` (rename, if A); `src/locators/index.ts`; `index.ts`; `src/pageObject.ts` (the `add` property's type, if it does not already use `AddAccessor`).
- **Tests**:
  - `publicTypes.emit.ts`: remove the "(as in 2.x)" exception; add `export const factory = (page: Page) => createRegistryWithAccessors<Paths>(page)` and `export const seeds = (r: LocatorRegistry<Paths>) => r.createReusable`.
  - `publicTypes.typecheck.ts`: the factory alias, and that it is not a value.
  - `pnpm typecheck` and the harness.
- **Docs**:
  - `api/class-locatorregistry.md`: `## AddAccessor` says what it is; the `createReusable` property links the new type.
  - `api/class-reusablelocator.md` or `api/index.md`: the factory type.
  - `docs/typescript.md` table.
  - The `declaration: true` paragraphs (F-3).
  - `internal/packaging.md`: optionally, the interface-over-indexed-access reason.
  - AGENTS.md §1 export list, if a type is added.
- **Changeset**: patch. "A standalone registry's result from `createRegistryWithAccessors()`, its `add`, and `registry.createReusable` can be returned from an exported function in a project built with `declaration: true`; before, the emit failed with TS4023 and TS4094. `createReusable`'s type is exported as `<name>`."
- **Decisions to tick** (walkthrough probes: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/R/walkthrough/f2/`):
  - [x] A, B or C: **A**; also covers a page object's `add`, which fails the same way (found in the walkthrough)
  - [x] The factory type's public name, and whether its export is a patch or a minor: **`ReusableLocatorFactory`**
    (alias over `ReusableLocatorFactoryInternal`), a **patch** under decision 6, with an "Added in: v3.0.2" marker
  - [x] (added) Tests: `publicTypes.emit.ts` checks every public member (34), closing test gap #6; a mutual-assignability
    type test for `AddAccessor` and the method
  - [x] (added) Docs and a new patch changeset, as in [DECISIONS.md #24](../DECISIONS.md)
- **Execution order**: before F-3, whose text depends on which exceptions remain. Independent of F-1.

> Saved by the orchestrating session from the agent's final report, with the user's approval: the agent's own write of this file was refused by a harness rule ("Subagents should return findings as text, not write report files").
