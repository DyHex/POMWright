# 2B-2: the docs say a registry typed `<string>` gives up the compile-time check of a path's format; a literal that breaks the rules is still a compile error

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 103 in [DECISIONS.md](../DECISIONS.md); planned in the locators plan (docs); done 2026-10-30 in `a05f533`
- **Area**: B-11 typed paths (`<string>`), B-05 `LocatorSchemaPathArgument`, B-01 `createRegistryWithAccessors`
- **Severity**: Low (an inconsistency without wrong behavior: TypeScript checks more than the pages say, never less)
- **Semver of the fix**: none (docs and doc comments only)
- **Pass**: 1
- **First review**: new since 54cdada (49454c6, which added the `<string>` wording with `NeedsPaths`)
- **Reviewed**: `d850405`, 2026-10-28T15:03:29+01:00, Opus 5.5, second review, segment 2B

## Contract

Five places say that `<string>` gives up every compile-time check, the format included:

- `website/src/content/docs/docs/locator-paths.md:332-334` (*The registry*): "`<string>` is accepted, and best avoided: it
  gives up every check TypeScript makes on paths (completions, the rules of a path, paths not in the union, sub-paths),
  which POMWright then makes at run time only."
- `src/locators/locatorRegistry.ts:783-785`, the doc comment of `createRegistryWithAccessors`: "it gives up every compile
  time check of the paths (suggestions, the format, undeclared paths, sub-paths), which the runtime still makes."
- `website/src/content/docs/api/class-locatorregistry.md:298`: "`<string>` is accepted, and gives up every compile-time
  check of the paths, which the runtime still makes."
- `website/src/content/docs/api/types.md:196-197`: "A registry typed `<string>` gives up every compile-time check of its
  paths".
- `website/src/content/docs/api/errors.md:48`: "`<string>` takes any path, unchecked at compile time." Also
  `src/locators/locatorRegistry.ts:44` ("`<string>` keeps paths unchecked at compile time") and
  `.changeset/registry-requires-paths.md:13` ("or `<string>` to keep paths unchecked at compile time").

## Reproduction

Type probe `/home/magdys/workspace/dyhex/POMWright-second-review-probes/B/t01/zz-probe-B-t01.typecheck.ts`, copied to
`test/tests/`, then from the worktree root:

```sh
cp /home/magdys/workspace/dyhex/POMWright-second-review-probes/B/t01/zz-probe-B-t01.typecheck.ts test/tests/
pnpm exec tsc --noEmit -p test; echo "exit=$?"
rm test/tests/zz-probe-B-t01.typecheck.ts
```

Exit 2. The lines that matter (full output in `t01/tsc.out`):

```text
test/tests/zz-probe-B-t01.typecheck.ts(9,10): error TS2345: Argument of type 'string' is not assignable to parameter of type 'LocatorSchemaPathError<"main..list", "String can't contain consecutive '.'">'.
test/tests/zz-probe-B-t01.typecheck.ts(10,32): error TS2345: Argument of type 'string' is not assignable to parameter of type 'LocatorSchemaPathError<".main list", "String can't contain whitespace chars; String can't start with '.'">'.
test/tests/zz-probe-B-t01.typecheck.ts(11,17): error TS2345: Argument of type 'string' is not assignable to parameter of type 'LocatorSchemaPathError<"main.", "String can't end with '.'">'.
test/tests/zz-probe-B-t01.typecheck.ts(31,12): error TS2345: Argument of type 'string' is not assignable to parameter of type 'LocatorSchemaPathError<"main..list", "String can't contain consecutive '.'">'.
```

Lines 9-11 are `createRegistryWithAccessors<string>(page)`'s `add("main..list")`, `registry.getNestedLocator(".main list")`
and `getLocator("main.")`; line 31 is `this.add("main..list")` in a `PageObject<string>`. A `string` variable
(`wide.add(runtimePath)`, line 13) compiles, as documented.

## Observed / expected

Observed: on a `<string>` registry, and on a `PageObject<string>`, a path literal that breaks a rule is a compile error,
with the same message as on a typed registry, because `Path` is inferred as the literal and
`LocatorSchemaPathArgument<Path>` checks it. What `<string>` does give up: completions, the check that a path is in the
union, and the sub-path check (`LocatorChainPaths` maps a `string` member to `string`).

Expected, per the pages: no compile-time check of the format. The behavior is the better one; the pages understate it.

## Cause

The pages and doc comments describe `<string>` as a wide path type; the parameter is generic, so a literal argument
keeps its literal type and `LocatorSchemaPathFormat` checks it (`src/locators/locatorRegistry.ts:66-70`,
`src/locators/types.ts:27-34`).

## Fix plan

- **Intended contract**: `<string>` gives up completions, the union check and the sub-path check; a path written as a
  literal is still checked against the rules, and a path in a `string` variable is checked at run time.
- **Options**: (recommended) correct the seven places above to say so, for example in *The registry*: "it gives up the
  checks that need the union (completions, paths not in the union, sub-paths); a literal that breaks the rules of a path
  is still a compile error, and a path held in a `string` is checked at run time". No code change.
- **Tests**: add a `@ts-expect-error` line for a malformed literal on a `<string>` registry to
  `validation.locatorSchemaPath.typecheck.ts`, so the corrected sentence stays true.
- **Docs**: `docs/locator-paths.md` *The registry*; `api/class-locatorregistry.md` *createRegistryWithAccessors*;
  `api/types.md` *LocatorSchemaPathFormat*; `api/errors.md` *Paths*; the doc comments at `locatorRegistry.ts:44` and
  `:783-785`. The changeset `registry-requires-paths.md` is unreleased and can be corrected too.
- **Changeset**: none for the pages alone; the edit to `registry-requires-paths.md` rides along.
