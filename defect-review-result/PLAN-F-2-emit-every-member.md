# Plan 13: `AddAccessor` as an interface, `ReusableLocatorFactory`; every public member emits

- **Decisions**: [DECISIONS.md](DECISIONS.md) #24
- **Findings**: [F-2](F-packaging-types-changesets/defect-F-2-registry-values-do-not-emit.md); test gap #6
- **Bump**: patch (an export §5's promise and the docs require; decision 6); "Added in: v3.0.2" for
  `ReusableLocatorFactory`, none for `AddAccessor` (its name exists)
- **Stop**: no
- **Depends on**: plans 7, 8, 9 (the interface copies `add`'s final signature)

## Contract

A consumer module built with `declaration: true` can export a function that returns `createRegistryWithAccessors()`'s
result, its `add`, a page object's `add`, or `registry.createReusable`; the declarations name `AddAccessor<Paths>` and
`ReusableLocatorFactory<Paths>` and never spell out the registration builders. A function that returns a registration
stays the one documented exception. Every public member emits, and a new unexported type fails `pnpm typecheck`.

## Current behaviour

- `src/locators/locatorRegistry.ts:648` `AddAccessor<P> = LocatorRegistryInternal<P>["add"]`: an indexed access that
  TypeScript resolves to the method's type, dropping the name, so `add` on its own spells out the unexported
  registration builders (TS4023 and 22 × TS4094).
- `src/locators/reusableLocatorBuilder.ts:84` `export class ReusableLocatorFactory` is not exported from `index.ts`, and
  has a private member (TS4094 for `createReusable`).
- Emitting all 34 public members from a consumer module (`…-probes/R/walkthrough/f2/all.ts`, `all.today.table`): 29
  emit; `registry.add`, the factory result, a page object's `add`, `createReusable` fail here, `step(options)` in plan 15.
- `test/tests/packaging/publicTypes.emit.ts:46` documents "does not emit (as in 2.x)".

## Steps

1. Apply `…-probes/R/walkthrough/f2/f2-on-combined.diff` (made on top of C-1, B-4 and B-3, so it applies on plan 9's
   result):
   - `AddAccessor` an `export interface` with `add`'s call signature (as it stands after plans 7–9);
     `createRegistryWithAccessors` types its `add` with it; `PageObject`'s `add` likewise (check `src/pageObject.ts`);
   - the class renamed `ReusableLocatorFactoryInternal`, and `export type ReusableLocatorFactory<P> =
     ReusableLocatorFactoryInternal<P>` declared under its public name (AGENTS.md §5's `LocatorQueryBuilder` pattern),
     with a doc comment (summary, example, `@see https://dyhex.github.io/POMWright/api/class-reusablelocator/#reusablelocatorfactory`);
   - `src/locators/index.ts` and `index.ts` export the type; `locatorRegistrationBuilder.test.ts:5,286` keep the public
     name (a type import, unchanged) or take the internal one where they need the class.
2. **Tests**:
   - `test/tests/packaging/publicTypes.emit.ts` becomes an emit check of every public member (the walkthrough's 34:
     the registry and its six members, the factory result and each of its accessors, a query and its chain with
     `update()` and `replace()`, seeds with `definition` and `steps`, a page object's members, `SessionStorage`, the
     logger, `json`, `step` and `step(options)`), without the "does not emit (as in 2.x)" exception; `step(options)`
     stays out until plan 15 adds it.
   - `publicTypes.typecheck.ts`: `ReusableLocatorFactory` is importable and is not a value (`@ts-expect-error`).
   - A vitest type test (`src/locators/locatorRegistry.test.ts`): `AddAccessor<P>` and `LocatorRegistryInternal<P>["add"]`
     are each assignable to the other, so the duplicated signature cannot drift.
3. **Docs**:
   - `api/class-reusablelocator.md`: a `## ReusableLocatorFactory` section with `Added in: v3.0.2` under its heading
     (`## createReusable`, which ten doc comments link, stays);
   - `api/class-locatorregistry.md`: the `createReusable` property links the new type; `api/index.md`: its row;
   - AGENTS.md §1's export list gains `ReusableLocatorFactory`;
   - *Internal → Packaging*: a paragraph on why `AddAccessor` is an interface (an alias of an indexed access type
     disappears from declarations).
   The *TypeScript* page's table row comes with plan 32 (decision 48).
4. **Changeset** `declaration-emit-registry.md` (`patch`): "A function that returns `createRegistryWithAccessors()`'s
   result, its `add`, a page object's `add` or `registry.createReusable` can be exported from a project built with
   `declaration: true`; before, the emit failed with TS4023 and TS4094. `createReusable`'s type is exported as
   `ReusableLocatorFactory`."

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`. `pnpm typecheck` runs the emit check and
`check-api-coverage.mjs` (the new export needs its section and `@see`).

## Commit

```text
fix: the registry's add and createReusable emit in consumers' declarations

AddAccessor was an indexed access type, which TypeScript resolves to the
method's type, so add on its own spelled out the unexported registration
builders; createReusable's type was an unexported class. AddAccessor is now
an interface, and createReusable is typed by the exported
ReusableLocatorFactory. A packaging test emits every public member.

Plan: defect-review-result/PLAN-F-2-emit-every-member.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
