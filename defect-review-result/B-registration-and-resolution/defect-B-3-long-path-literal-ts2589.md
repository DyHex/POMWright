# B-3: A well-formed path literal of 999 characters or more does not compile (TS2589), while the runtime accepts it

- **Kind**: defect
- **Area**: Paths: `LocatorSchemaPathFormat` against `validateLocatorSchemaPath` (inventory §2 "Paths", §6 "Path types against the runtime validation")
- **Severity**: Low (real paths are far shorter; the failure is a compile error, not a wrong locator)
- **Semver of the fix**: patch (brings the type in line with the runtime check it must agree with)
- **Reviewed**: `54cdada`, 2026-10-23, scope B reviewer
- **Status**: decided: fix, option 1 extended to report every broken rule (2026-10-26, [DECISIONS.md #22](../DECISIONS.md))

## Contract

- AGENTS.md §5: "The runtime `validateLocatorSchemaPath` and the type-level `LocatorSchemaPathFormat` family in
  `types.ts` must stay in agreement".
- `src/locators/types.ts:13-25`, the doc comment of `LocatorSchemaPathFormat`: "`S` itself when it is a well-formed
  path …, otherwise a tuple naming the rule it breaks".
- `docs/locator-paths.md`, *The rules of a path*: "TypeScript rejects a path literal that breaks a rule" (and so accepts
  one that keeps them). No length limit is stated anywhere.

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/f3-long-path.sh` writes two type probes into the
worktree's `test/tests/`, one with a path of 998 `a`s and one of 999, runs the harness's `tsc`, deletes them, then
registers and verifies a 999-character and a 2,001-character path at run time from the built package.

```ts
const { registry } = createRegistryWithAccessors<"aaaa…a" /* 999 characters */>(page);
registry.add("aaaa…a").locator("x");
```

Command: `bash /home/magdys/workspace/dyhex/POMWright-final-review-probes/B/f3-long-path.sh`. `tsc` exits 2; the script
exits 0 and leaves the worktree clean.

The broader type probe `p03-types.typecheck.ts` (output `p03-types.out`) shows the same TS2589 for a 1,200-character
path and for a 5,001-character path of 2,500 segments passed to `getNestedLocator`, and shows the agreement that does
hold: each of the 26 characters of `LOCATOR_SCHEMA_PATH_WHITESPACE` is rejected by `add` and `getNestedLocator`, and
U+200B, U+180E and U+2060, which the runtime accepts, compile.

**Fix sketch.** With `/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/sketch-B1-B5.diff` (one sketch for B-1 to B-5, applied to the worktree, built with `pnpm harness:install`, then reverted with `git checkout` and rebuilt; with it `pnpm test:unit`, `pnpm typecheck` and the in-scope harness specs on chromium, 349 tests, passed: logs `sketch-unit.log`, `sketch-typecheck.log`, `sketch-harness.log`), where `LocatorSchemaPathFormat` checks the rules with template-literal patterns
(option 1), the 999-character probe compiles (`tsc exit: 0`), every existing `@ts-expect-error` of
`validation.locatorSchemaPath.typecheck.ts` still errors, and the doc snippets compile. The sketch had to change seven
`path as RegistryPath<…>` casts in `locatorRegistry.ts` to `path as unknown as …`, since TypeScript no longer finds the
new conditional type comparable.

## Observed / expected

```text
tsc exit: 2
test/tests/zz-probe-B-len999.typecheck.ts(5,1): error TS2589: Type instantiation is excessively deep and possibly infinite.
runtime: registered and verified paths of 999 and 2001 characters
```

The 998-character path compiles. Expected: a well-formed path compiles whatever its length, as the runtime accepts it;
or, if a limit is kept, it is stated.

## Cause

`src/locators/types.ts:33-52`, `_LocatorSchemaPathFormat`, walks the path one character per recursion
(`` Rest extends `${infer C}${infer Tail}` ``). It is tail-recursive, so TypeScript allows 1,000 levels; a path of 999
characters plus the final empty-rest step exceeds it.

## Fix plan

- **Intended contract**: the type accepts every path the runtime accepts and rejects every path it rejects, with no
  length limit.
- **Options**:
  1. *(recommended)* Check the rules with template-literal patterns instead of a per-character walk:
     `S extends ""` (empty), `` S extends `.${string}` `` (leading dot), `` S extends `${string}.` `` (trailing dot),
     `` S extends `${string}..${string}` `` (consecutive dots), `` S extends `${string}${UnicodeWhitespaceChar}${string}` ``
     (whitespace). No recursion, the same reasons in the tuple, and less type-checking work for every path. A path
     that breaks two rules may then report another of them than the left-to-right walk does today (`"a b..c"` reports
     whitespace now, and would report the consecutive dots if that pattern is checked first); either is a compile error
     naming a broken rule, and the runtime has its own order (`utils.ts:72-97`).
  2. Recurse per segment (split on `.`), which raises the limit to about 1,000 segments.
  3. Keep the walk and state the limit (998 characters) on *The rules of a path* and in the type's doc comment.
- **Implementation steps**: `src/locators/types.ts` `LocatorSchemaPathFormat` and `_LocatorSchemaPathFormat`; the
  `path as …` casts in `src/locators/locatorRegistry.ts` (`add`, `getLocatorSchema`, `getLocator`) go through `unknown`.
- **Tests**: `test/tests/locatorRegistry/validation/validation.locatorSchemaPath.typecheck.ts`: a 2,000-character path
  compiles; every character of `LOCATOR_SCHEMA_PATH_WHITESPACE` is rejected (today only the plain space is in the
  probe); the existing `@ts-expect-error` lines keep their reasons. `src/locators/utils.test.ts` or a vitest
  `expectTypeOf` for the tuple reasons.
- **Docs**: none for options 1 and 2; option 3 adds the limit to `docs/locator-paths.md` and `api/types.md`
  *LocatorSchemaPathFormat*.
- **Changeset**: patch. "A path literal of any length compiles; one of 999 characters or more failed with TS2589."
- **Decisions to tick** (walkthrough probes: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/R/walkthrough/b3/`):
  - [x] Option 1, **extended**: the pattern checks run in the runtime's order (whitespace, leading dot, trailing dot,
    consecutive dots; empty on its own) and **every broken rule is reported**, by the type and by
    `validateLocatorSchemaPath` alike; a single-rule message is unchanged. The walk named the first rule by position
    and disagreed with the runtime on 3 of 6 two-rule paths (`rules.today.table`).
  - [x] (added) An assertion function (`asserts path is … & RegistryPath<…>`, running `validateLocatorSchemaPath`)
    replaces the seven `path as RegistryPath<…>` casts the new type breaks, rather than casts through `unknown`; the
    query's inner check is dropped; `add` then throws a path-rule error at `add` instead of at its locator method
    (`…-probes/R/walkthrough/b3cast/`).
  - [x] (added) Tests: long paths, all 26 whitespace characters at the type level, the three accepted characters, the
    same multi-rule paths asserted by type and by runtime, and `add` throwing at `add`.
  - [x] (added) Docs: *The rules of a path*, `api/errors.md`, `api/types.md` and the doc comment.
  - [x] (added) A new patch changeset, as in [DECISIONS.md #22](../DECISIONS.md).
- **Execution order**: independent; touches `types.ts` only. B-4 changes `ReusePathArgument` in `locatorRegistry.ts`,
  which uses `LocatorSchemaPathArgument`, so run the type probes of both after either.
