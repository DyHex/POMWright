# C-1: A query's sub-path parameters accept nothing when the registry's path type is `string`, and not the query's own path when it matches a template literal member

- **Kind**: defect
- **Area**: Types: sub-path types (`LocatorChainPaths`, `SkippablePaths`) of `LocatorQueryBuilder` and `LocatorUpdateBuilder`
- **Severity**: Medium, raised in the walkthrough (2026-10-26) for a case found there: in a generic base class that adds
  paths (`ShopPage<Paths> extends PageObject<Paths | CommonPaths>`, *Locator modules*), no sub-path compiles in the
  base's methods, the common ones included, a regression since 2.0.0. The original case was Low (a compile error on code
  the runtime accepts and resolves correctly; only for a path type that is not a union of literals:
  `createRegistryWithAccessors(page)` without a type argument, `PageObject<string>`, or a union with a template literal
  member; the recommended literal union is unaffected)
- **Semver of the fix**: patch (a type corrected to what the docs promise and the runtime does, AGENTS.md §7; nothing
  that compiles today stops compiling, see the sketch below)
- **Reviewed**: `54cdada`, 2026-10-23, Claude Opus 5.5 (scope C)
- **Status**: decided: fix (2026-10-26, [DECISIONS.md #20](../DECISIONS.md)): per-member sub-path types,
  `createRegistryWithAccessors` requires `<Paths>` or `<string>`, and sub-paths in a generic base that adds paths

## Contract

- A query's methods take a sub-path, "the query's own path or one of its registered ancestors"
  (`website/src/content/docs/docs/queries.md`, *Sub-paths*; `src/locators/locatorQueryBuilder.ts:31-33`, the class
  comment; every `@param subPath` in that file).
- A wide `string` path type is supported and "not checked by the type; the same rules are checked at run time for every
  path" (`website/src/content/docs/api/types.md`, *LocatorSchemaPathFormat*; `src/locators/types.ts:13-16`).
  `add`, `getLocator`, `getNestedLocator` and `getLocatorSchema` behave that way on a `string` registry.
- `createRegistryWithAccessors(page)` without a type argument is the call form the docs name
  (`website/src/content/docs/docs/locator-paths.md`, *The registry*: "Without a page object,
  `createRegistryWithAccessors(page)` creates a registry"); its `Paths` is then inferred as `string`.
- The skill's question for types: do the public types accept what the runtime accepts? Here they reject every
  sub-path the runtime accepts.

## Reproduction

Type probe `/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p06-types-wide.typecheck.ts`, against the
packed package:

```sh
cp /home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p06-types-wide.typecheck.ts test/tests/zz-probe-C3.typecheck.ts
pnpm exec tsc --noEmit -p test; echo exit=$?
rm test/tests/zz-probe-C3.typecheck.ts
```

The probe, in short:

```ts
const wide = createRegistryWithAccessors(page);            // Paths = string
wide.getNestedLocator("main.list.item");                   // compiles
wide.getLocatorSchema("main.list.item").nth(0);            // compiles
wide.getLocatorSchema("main.list.item").nth("main.list", 0);          // error
wide.getLocatorSchema("main.list.item").skip("main.list");            // error
wide.getLocatorSchema("main.list.item").update("main.list.item");     // error, the query's own path

class AnyPage extends PageObject<string> { /* … */
  item() { return this.getLocatorSchema("main.list.item").filter("main.list", { hasText: "x" }).getNestedLocator(); } // error
}

type Paths = "main" | "main.list" | `main.list.item@${string}`;
const tl = createRegistryWithAccessors<Paths>(page);
tl.getNestedLocator("main.list.item@42");                                // compiles
tl.getLocatorSchema("main.list.item@42").nth("main.list.item@42", 0);    // error, the query's own path
```

The runtime side, `/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p06-runtime-wide.mjs` (the same calls
from JavaScript against `dist/index.mjs`, chromium from the root package):

```sh
node /home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p06-runtime-wide.mjs; echo exit=$?
```

## Observed / expected

`tsc`, exit 2:

```text
test/tests/zz-probe-C3.typecheck.ts(12,45): error TS2345: Argument of type '"main.list"' is not assignable to parameter of type 'never'.
test/tests/zz-probe-C3.typecheck.ts(13,46): error TS2345: Argument of type '"main.list"' is not assignable to parameter of type 'never'.
test/tests/zz-probe-C3.typecheck.ts(14,48): error TS2345: Argument of type '"main.list.item"' is not assignable to parameter of type 'never'.
test/tests/zz-probe-C3.typecheck.ts(25,57): error TS2345: Argument of type '"main.list"' is not assignable to parameter of type 'never'.
test/tests/zz-probe-C3.typecheck.ts(34,46): error TS2345: Argument of type '"main.list.item@42"' is not assignable to parameter of type '"main" | "main.list"'.
```

The runtime accepts every one of these calls (exit 0):

```text
nth(sub): OK locator('main').locator('ul').first().locator('li')
skip: OK locator('main').locator('li')
update(own path): OK locator('main').locator('ul').locator('ol > li')
filter(sub): OK locator('main').locator('ul').filter({ hasText: 'x' }).locator('li')
nth(own template path): OK locator('main').locator('ul').locator('li').filter({ hasText: '42' }).first()
```

Expected: on a `string` registry the sub-path parameters accept the segments of the query's path (or any string, as
the other path parameters do), and the runtime check (`ensureSubPath`) reports a wrong one; with a template literal
member, the query's own path is a valid sub-path, as the docs say.

## Cause

`src/locators/types.ts:67-72`:

```ts
export type LocatorChainPaths<LocatorSchemaPathType extends string, LocatorSubstring extends LocatorSchemaPathType | undefined> =
  LocatorSubstring extends string
    ? Extract<LocatorSchemaPathType, LocatorSubstring | ExtractSubPaths<LocatorSubstring>>
    : never;
```

`Extract<T, U>` keeps the members of `T` assignable to `U`. With `T = string` and `U = "main" | "main.list" |
"main.list.item"`, `string` is not assignable to that union, so the result is `never`; with a template literal member
`` `main.list.item@${string}` ``, that member is not assignable to `"main.list.item@42"`, so the query's own path drops
out. The check runs in the wrong direction for any path type wider than a literal: it should keep the chain's
segments that are assignable to `T`.

## Fix plan

- **Intended contract**: a sub-path parameter accepts every segment of the query's path that the registry's path type
  admits: the registered literal members, as today; every segment on a `string` registry; the query's own path when it
  matches a template literal member. The runtime check stays the authority on what is registered.
- **Options**:
  1. *(recommended)* Filter the chain's segments by the path type instead of extracting the path type's members:

     ```ts
     LocatorSubstring extends string
       ? ExtractSubPaths<LocatorSubstring> extends infer SubPath ? (SubPath extends LocatorSchemaPathType ? SubPath : never) : never
       : never;
     ```

     Sketched in the worktree: the source-level probe
     `/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p08-types-wide-source.typecheck.ts` (wide registry,
     template member, a literal registry with `@ts-expect-error` for a path outside the chain and for skipping the
     terminal) fails before the sketch (`tsc` exit 2, the four errors above) and passes after it (`tsc --noEmit -p test`
     exit 0, every `@ts-expect-error` still used), and `pnpm vitest run src/locators` stays green (501 tests, no type
     errors). For a literal union the result is the same set as today, so nothing that compiles stops compiling.
  2. Special-case `string extends LocatorSchemaPathType` only. Fixes the wide registry, not the template member.
  3. Document the limit (a typed path union is required for sub-paths). Docs-only, semver none; leaves the types
     rejecting what the runtime accepts.
- **Implementation steps**: `src/locators/types.ts` (`LocatorChainPaths`); `SkippablePaths` in
  `src/locators/locatorQueryBuilder.ts` follows from it.
- **Tests**: add the probe's lines to `test/tests/packaging/publicTypes.typecheck.ts` (wide registry and template
  member, positive and `@ts-expect-error` cases) and to `publicTypes.emit.ts` if a declaration shape changes; a vitest
  `expectTypeOf` in `src/locators/locatorQueryBuilder.test.ts`.
- **Docs**: `docs/queries.md` *Sub-paths* may say that a wide `string` registry checks sub-paths at run time only;
  `api/types.md` unchanged.
- **Changeset**: patch. "A query's sub-path arguments compile on a registry typed with `string`, and the query's own
  path compiles as a sub-path when it matches a template literal member of the path union, as they already worked at
  run time."
- **Decisions to tick** (the walkthrough's probes are in `/home/magdys/workspace/dyhex/POMWright-final-review-probes/R/walkthrough/c1/`):
  - [x] Option 1, 2 or 3: none as written. Option 1 would offer a namespace segment that is not a declared path (such
    as `"main.button"`) on a `<string>` registry and breaks no generic code, but the agreed form is **per member of
    `Paths`**: a literal member when it is a segment (as today), a template member's matching segments (the query's own
    path and template ancestors), and any string for a `string` member (no suggestions; the runtime checks it)
    (`variations.ts`, `variations.today.out`, `variations.after.out`, `patch2.diff`).
  - [x] (added) `createRegistryWithAccessors` requires `<Paths>` or `<string>`: a message type as the default, passed
    through by `LocatorSchemaPathArgument`, so the first path argument fails readably; generic wrappers compile.
  - [x] (added) `<string>` stays supported and is advised against in the docs, with its two use cases (paths known only
    at run time, an incremental migration from untyped code); no constraint rejects it, since one breaks generic bases
    that add paths (`constraint.ts`).
  - [x] (added) Generic base classes that add paths: a distributive `RegistryPath` and `Path & RegistryPath<…>` as the
    query's path type, so sub-paths on the base's own paths compile there and wrong ones stay errors (`base.ts`,
    `base.fix.out`, `patch3.diff`); it worked in 1.5.1 (`base.v1.5.1.ts`) and fails since 2.0.0 (`base.v2.1.0.ts`).
  - [x] (added) Tests, docs (*Paths with a dynamic part* with finite template unions and the search trade-off, the
    `<string>` advice, *Queries*, the API page, `api/types.md`, the two prose sentences, a sub-path method in the
    `ShopPage` example) and two patch changesets, as in [DECISIONS.md #20](../DECISIONS.md).
- **Execution order**: independent of the other C findings.
