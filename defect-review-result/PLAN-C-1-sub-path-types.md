# Plan 7: sub-path types per member of the path union; the required type argument; generic bases

- **Decisions**: [DECISIONS.md](DECISIONS.md) #20
- **Findings**: [C-1](C-queries/defect-C-1-sub-paths-never-on-wide-paths.md) (Medium for the generic-base regression
  since 2.0.0); test gap #5's sub-path part
- **Bump**: patch (two changesets)
- **Stop**: no
- **Depends on**: plan 1. Plans 8 (B-4) and 9 (B-3) follow on the same files, in the order they were probed together

## Contract

- A query's sub-path arguments (`update`, `replace`, `filter`, `nth`, `clearSteps`, `skip`, `unskip`) are typed per
  member of `Paths`: a literal member is admitted when it is one of the query's segments (as today: a namespace that is
  not a declared path is never accepted or suggested); a template-literal member admits the query's segments that
  match it, the query's own path and template ancestors included; a `string` member admits any string, checked at run
  time. `skip` and `unskip` still exclude the query's own path. Nothing that compiles today stops compiling.
- `createRegistryWithAccessors` requires `<Paths>` (or `<string>`): untyped, its first path argument fails with
  `Argument of type '"main"' is not assignable to parameter of type '"createRegistryWithAccessors needs its paths as a
  type argument: createRegistryWithAccessors<Paths>(page)"'`. Generic wrappers that pass their own type parameter keep
  compiling. `PageObject` already requires its type argument.
- In a generic base that adds paths (`ShopPage<Paths> extends PageObject<Paths | CommonPaths>`), sub-paths on the common
  paths compile in the base's methods (restored from 1.x); a path outside the chain, a namespace, a descendant and
  skipping the query's own path stay errors.
- `<string>` is supported and advised against (it bypasses every compile-time check; the runtime checks them all).

## Current behaviour

- `src/locators/types.ts:60-61` `RegistryPath` is not distributive; `types.ts:67-72` `LocatorChainPaths` is
  `Extract<Paths, segments>`, which keeps a member only when it equals a segment: `never` for `string`, and without the
  query's own path for a template member.
- `src/locators/locatorRegistry.ts:451-459` and `:656-658` type the query's path as `Extract<Path, RegistryPath<…>>`,
  unresolved inside a generic base, so no sub-path compiles there (2.0.0 to `54cdada`; 1.5.1 compiled).
- `locatorRegistry.ts:712` `createRegistryWithAccessors = <Paths extends string>(…)`: untyped, `Paths` is inferred
  `string` and every path compiles unchecked.

## Steps

1. Apply the walkthrough's verified patch, `…-probes/R/walkthrough/c1/patch3.diff` (decisions 1, 2 and 7):
   - `types.ts`: `RegistryPath` distributive; `LocatorChainPaths` through `SubPathsPerMember` (`string` member → `string`;
     a pattern member, `{} extends Record<Member, unknown>` → `Extract<ExtractSubPaths<Path>, Member>`; a literal →
     `Extract<Member, ExtractSubPaths<Path>>`);
   - `locatorRegistry.ts`: `getLocatorSchema` and `GetLocatorSchemaAccessor` return
     `LocatorQueryBuilder<Paths, Path & RegistryPath<Paths>>`; `NeedsPaths` as the default of
     `createRegistryWithAccessors`' type parameter, and `LocatorSchemaPathArgument` passes it through.
   `SkippablePaths` (`locatorQueryBuilder.ts:492-495`) keeps excluding the query's own path. The casts the patch keeps
   (`path as Path & RegistryPath<…>`) are replaced by plan 9's assertion function.
2. Doc comments: `LocatorSchemaPathArgument`, `createRegistryWithAccessors` (the type argument is required, its compile
   error, `<string>` advised against), the query methods' sub-path `@param`s (template members; on `<string>` checked at
   run time).
3. **Tests**:
   - `test/tests/packaging/publicTypes.typecheck.ts`: every row of the walkthrough's variation table
     (`…-probes/R/walkthrough/c1/variations.ts`, `variations2.ts`), `@ts-expect-error` on the error rows: a namespace
     rejected; template members admitted (own path, template ancestors); finite template unions in a loop; `<string>`
     sub-paths compiling; an untyped `createRegistryWithAccessors` failing at its first path; a generic wrapper
     compiling.
   - The generic-base cases (`…/c1/base.ts`): in a base method, `filter`, `nth`, `skip`, `clearSteps` on a common
     ancestor and the query's own path named compile; a path outside the chain, a namespace, a descendant, and skipping
     the query's own path stay errors; the page's own paths unknown in the base.
   - A vitest `expectTypeOf` for `SubPathsPerMember` (literal, pattern, `string` members) in
     `src/locators/locatorQueryBuilder.test.ts`.
   - Runtime: on a `<string>` registry, a sub-path outside the chain throws the existing sub-path error (unit test).
   - `test/tests/packaging/publicTypes.emit.ts` still emits (no new annotation needed).
   - At implementation: type-check the two external consumer projects against the packed build in scratch copies (the
     projects themselves untouched); their error counts must not rise (one had 5 unrelated errors on 2026-10-26).
4. **Docs**:
   - *Locator paths*: a new section *Paths with a dynamic part* (after *The rules of a path*): paths listed in full first,
     as the recommendation; finite template unions (`` `main.button@${Button}` `` with `Button` from a `const` array, the
     loop in `defineLocators()`, a method over the union); a `:::note` on the trade-off (a full path, as an error message
     or the report shows it, is not found by text search or rename where it is composed; a search for the prefix still
     works; changing an id in the array updates every composed use; listing paths in full is recommended unless the use
     case is good and the pros and cons are weighed); one sentence on `${string}` members (the same search cost, only
     the prefix suggested, any id compiles, an unregistered id fails at run time). The paired reuse loop is added by
     plan 8.
   - *Locator paths*, *The registry*: the path type advice (a union of literal paths; `<string>` advised against, what it
     bypasses, what the runtime still checks, its two use cases: paths known only at run time and an incremental
     migration from untyped code); `PageObject` and `createRegistryWithAccessors` require `<Paths>` or `<string>`; the
     example at line 208 gets `<Paths>`.
   - *Locator modules* line 328: `createRegistryWithAccessors<Paths>(page)`; *Locators every page shares, in a base
     class*: the `ShopPage` example gains a method that uses a query with a sub-path on the common locators, so the
     snippet check keeps it compiling.
   - *Queries*, *Sub-paths*: template members, and `<string>` sub-paths checked at run time.
   - `api/class-locatorregistry.md`, *createRegistryWithAccessors*: the type argument is required, with its compile error.
   - `api/types.md` line 189, the wide-string sentence aligned with the advice.
5. **Changesets** (`patch`):
   - `sub-path-template-members.md`: "A query's sub-path arguments accept template-literal members of the path union
     (the query's own path and template ancestors), compile on a registry typed `<string>`, where the runtime checks
     them, and compile again in a generic base class on the paths it adds: this worked in 1.x and broke in 2.0.0, and is
     now restored."
   - `registry-requires-paths.md`: "`createRegistryWithAccessors` requires its paths as a type argument." With the
     migration: pass `<Paths>`, or `<string>` to keep paths unchecked.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`. `pnpm typecheck` covers the declaration emit and the
snippet check (the new docs examples).

## Commit

```text
fix: sub-path types per member of the path union, also in generic base classes

A query's sub-path arguments took Extract<Paths, segments>, which is never
for a string member and drops the query's own path for a template member;
in a generic base class that adds paths no sub-path compiled, a regression
since 2.0.0. They are now typed per member, and the query's path keeps its
type in a generic base. createRegistryWithAccessors requires its paths as a
type argument.

Plan: defect-review-result/PLAN-C-1-sub-path-types.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
