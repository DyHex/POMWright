# Plan 8: reuse by path: the self-reuse check for a single literal only

- **Decisions**: [DECISIONS.md](DECISIONS.md) #21
- **Findings**: [B-4](B-registration-and-resolution/defect-B-4-reuse-path-variable-rejected.md); test gap #5's reuse part
- **Bump**: patch
- **Stop**: no
- **Depends on**: plan 7 (the same files; the walkthrough probed B-4 on top of C-1)

## Contract

`add(path, { reuse })` rejects a self-reuse at compile time only when the registration path is a single string literal
and the reuse path is that literal. A union, `string` or a pattern is checked at run time, where any self-reuse throws
`Locator reuse path cannot be the same as registration path: "a".` A union-typed `reuse` is checked as one argument.
The paired template loop that *Paths with a dynamic part* teaches compiles.

## Current behaviour

- `src/locators/locatorRegistry.ts:65-66` `ReusePathArgument`: `Exclude<ReusePath, Path> extends never` is true whenever
  the registration path's type covers the reuse path's, so a variable of the union, `string` or a pattern is refused as
  "the same as registration path" whatever the values.
- `locatorRegistry.ts:193-197` (`add`'s rest parameter): `Reuse extends undefined` and `Reuse extends
  LocatorSchemaPathType` distribute, splitting a union-typed `reuse` into single-member options it matches none of.
- The walkthrough's rows (`…-probes/R/walkthrough/b4/reuse.ts`, `reuse.today.out`): R4 (the paired loop), R5, R6, R8,
  R10 fail today.

## Steps

1. Apply the B-4 part of `…-probes/R/walkthrough/b4/b4-refined-with-c1.diff` (on top of plan 7, whose part of that diff
   is already in): `UnionToIntersection` and `IsSingleLiteral` (not `string`, not a pattern by `{} extends Record<T,
   unknown>`, not a union), `ReusePathArgument` applying the self-reuse check only when `IsSingleLiteral<Path>`, and
   `add`'s rest parameter made non-distributive (`[Reuse] extends [undefined]`, `[Reuse] extends
   [LocatorSchemaPathType]`). The comment above `IsSingleLiteral` is written without the diff's escaped backticks.
2. `add`'s doc comment: `@throws` gains `Locator reuse path cannot be the same as registration path: "<path>".` (reached
   through a variable); the compile-time rule for a literal in the description.
3. **Tests**:
   - `test/tests/locatorRegistry/validation/validation.locatorSchemaPath.typecheck.ts` and
     `test/tests/packaging/publicTypes.typecheck.ts`: rows R1–R11 of `reuse.ts`, `@ts-expect-error` on R2
     (`add("a", { reuse: "a" })`), R9 (the same on a `<string>` registry) and R11 (a literal matching a template member,
     reusing itself); the others compile.
   - A unit test (`src/locators/locatorRegistry.test.ts`) that a self-reuse through a variable throws the message; the
     paired template loop (R4) registers and resolves at run time (`runtime.mjs`'s case).
4. **Docs**:
   - *Reusing locators*, *Reuse by path*: a literal self-reuse is a compile error; through a variable, `add` throws
     `Locator reuse path cannot be the same as registration path: "a".` (copied from a probe).
   - *Locator paths*, *Paths with a dynamic part* (plan 7's section): the paired reuse loop
     (`` add(`dialog.button@${b}`, { reuse: `main.button@${b}` }) ``), so the snippet check keeps R4 compiling.
   - `api/class-locatorregistry.md`, `add` **Throws**: the message (the API page does not list it today).
   - `api/errors.md` already lists both forms (lines 108 and 116); unchanged.
5. **Changeset** `reuse-path-variables.md` (`patch`): "`add(path, { reuse })` compiles when the paths are variables: of
   the path union, of a template union in a loop, or wide strings. A literal path that reuses itself is still a compile
   error, and any self-reuse still throws at the call."

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
fix: reuse by path compiles with path variables

The self-reuse check refused a reuse whenever the registration path's type
covered the reuse path's, so a variable of the path union, a wide string or
a template pattern failed whatever its value, and a union-typed reuse was
split into options it matched none of. The compile-time check now applies
to a single literal only; every self-reuse still throws at run time.

Plan: defect-review-result/PLAN-B-4-reuse-by-path-types.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
