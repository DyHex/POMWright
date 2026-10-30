# 2C-3: `replace().frameLocator()` without a selector on the query's own path compiles, though it throws every time; `skip()` of the same path is a compile error

- **Kind**: design question
- **Status**: decided 2026-10-29, decision 92 in [DECISIONS.md](../DECISIONS.md): no type change; a docs clause in item 24's batch and a comment in the type probe; done 2026-10-30 in `a05f533`
- **Area**: `LocatorUpdateBuilder` types in `replace` mode; the any-frame form in a query
- **Severity**: Low (a mistake that always throws at the call, with a message that says what to do; the types could
  catch it, as they catch the analogous `skip`)
- **Semver of the fix**: patch, if adopted (it rejects at compile time a call that never worked: the runtime throws at
  the call on every path, by `docs/versioning.md` a type corrected to what the docs promise and the runtime does)
- **Pass**: 1
- **First review**: missed by the first review. The compiling call was in `publicTypes.typecheck.ts:89` at `54cdada`;
  `DECISIONS.md` has no entry on typing it (searched for the any-frame `replace` on the query's own path, "own path"
  and "types and runtime"), and the first review's type probes covered `replace`'s argument lists, not this case.
- **Reviewed**: `d850405`, 2026-10-28 15:43 +0100, Opus 5.5, second review, segment 2C

## Contract

The decided runtime rule: `src/locators/AGENTS.md`, *Contracts*: "`replace(sub).frameLocator()` throws at the call on
the query's own path and on a segment with steps in the query". The pages: `docs/queries.md`, *The any-frame form in a
query* ("the query's own path cannot take it"), `api/class-locatorupdatebuilder.md`, *frameLocator()*, *Throws*. Nothing
in the guide or the docs says whether the types should reject it; for `skip` the guide says "The terminal path cannot be
skipped (types and runtime)", and `docs/queries.md` says "The query's own path cannot be skipped: TypeScript does not
offer it, and from JavaScript it throws."

## Reproduction

Runtime: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/C/p5-broad-claims.mjs`, part (3),
`node …/p5-broad-claims.mjs`, exit 0:

```text
(3) replace().frameLocator() on the query's own path:
  list: throws: replace() cannot apply to "list": it is the path this query resolves, and frameLocator() without a selector has no element to resolve to; replace an ancestor instead.
  main.list.item: throws: replace() cannot apply to "main.list.item": it is the path this query resolves, …
  main.list.item (by name): throws: replace() cannot apply to "main.list.item": it is the path this query resolves, …
```

Types: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/C/t4-replace-anyframe-terminal.typecheck.ts`,
copied to `test/tests/zz-probe-C-t4.typecheck.ts`, then from the worktree root
`pnpm exec tsc --noEmit -p test --pretty false`, then deleted. Exit 0: the three calls compile, and the
`// @ts-expect-error` on `skip("main.list.item")` is used (that call does not compile). The repository's own compile-only
probe asserts the same: `test/tests/packaging/publicTypes.typecheck.ts:91`,
`getLocatorSchema("list").replace().frameLocator();`, which would throw if it ran.

## Argument

A call that cannot succeed on any input is the kind of mistake the path types already turn into compile errors
(`skip` of the terminal, a sub-path outside the chain). `replace()` with no sub-path always targets the query's own path,
and so does `replace(path)` with the query's path written out, so for those two forms the types know the target. The
public type `LocatorUpdateBuilder<Paths, Path, SubPath, Mode>` carries both `Path` and `SubPath`; but `replace()` without
a sub-path types `SubPath` as the whole chain (`locatorQueryBuilder.ts:319-324`), not as `Path`, so it cannot tell today.

Cost: a conditional parameter list for `frameLocator` (`[selector: string]` when `Mode` is `"replace"` and `SubPath` is
exactly `Path`, `[selector?: string]` otherwise), `replace()`'s no-argument overload typed with `SubPath = Path`, one
more line in each type probe, and `publicTypes.typecheck.ts:91` turned into a `@ts-expect-error`. A template or union
path stays as today (the types cannot tell the terminal from an ancestor), so the runtime check stays. Benefit: small;
the runtime error is immediate, at the call, and names the fix.

A risk to check before adopting (a), not probed here: in a generic base class that adds paths, the query's path type is
`Path & RegistryPath<PagePaths | CommonPaths>`, partly unresolved, so a conditional on `SubPath` and that type may stay
deferred, and a deferred rest-parameter type can make `replace(ancestor).frameLocator()` stop compiling there, which
compiles today (decision #20 restored sub-paths in such bases). Any sketch would need the generic-base rows of
`publicTypes.typecheck.ts:411-434` with a `replace(…).frameLocator()` added.

## Fix plan

If adopted:

- **Intended contract**: "The query's own path cannot take the any-frame form: TypeScript does not offer
  `frameLocator()` without a selector there, and from JavaScript it throws", mirroring `skip`.
- **Options**: (a) the conditional parameter list above; (b) leave the types and say in `docs/queries.md` that only the
  runtime checks it (docs only, semver none). (b) is the cheap option, and (a) only pays if consumers meet it.
- **Steps for (a)**: `src/locators/locatorQueryBuilder.ts` (`replace()`'s first overload returns
  `LocatorUpdateBuilder<…, LocatorSubstring, LocatorSubstring, "replace">`; check that the same change to `update()`'s
  first overload is harmless, since `update` mode keeps `frameLocator()` optional); `src/locators/locatorUpdateBuilder.ts`
  (`frameLocator`'s rest parameter through a type like `ArgsFor`); `publicTypes.typecheck.ts` (line 91 to a
  `@ts-expect-error`, plus an ancestor case that compiles); `publicTypes.emit.ts` if the public type's shape changes.
- **Docs**: `docs/queries.md` (*The any-frame form in a query*), `api/class-locatorupdatebuilder.md` (*frameLocator()*,
  *Arguments*), the doc comment of `frameLocator`.
- **Changeset**: patch, "`replace().frameLocator()` without a selector on the query's own path is a compile error, as it
  always threw".
- **Decisions to tick**: whether compile-time rejection of always-throwing calls is wanted beyond `skip`.
- **Related**: 2C-1 (the same exception in the prose).
