# B-4: `add(path, { reuse })` does not compile when the path is a variable of the union type or a wide `string`, and the error says the reuse path is the registration path

- **Kind**: defect
- **Area**: Reuse by path: the `add` overload's `ReusePathArgument` (inventory §2 "Reuse", §6 "Path types")
- **Severity**: Low (literal paths, the common case, compile; a table-driven or run-time registration hits it, and the error names a cause that is not the case)
- **Semver of the fix**: patch (a type corrected to what the docs promise and the runtime does, AGENTS.md §7)
- **Reviewed**: `54cdada`, 2026-10-23, scope B reviewer
- **Status**: decided: fix, option 1 refined (2026-10-26, [DECISIONS.md #21](../DECISIONS.md))

## Contract

- `api/class-locatorregistry.md`, *add*, Arguments: `reuse` is "A registered path other than `path`, or a seed".
- `docs/reusing-locators.md`, *Reuse by path*: "A path cannot reuse itself (a compile error)." The compile error is
  meant for a path that names itself.
- `api/types.md`, *LocatorSchemaPathFormat*: "A wide `string` is not checked by the type; the same rules are checked
  at run time for every path." `add`, `getLocator`, `getNestedLocator` and `getLocatorSchema` accept a `Paths`-typed or
  wide `string` variable; only the reuse form does not.
- The runtime checks self-reuse itself: `Locator reuse path cannot be the same as registration path: "…".`
  (`locatorRegistry.ts:233-235`).

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/f4-reuse-union.sh` copies
`f4-reuse-union.typecheck.ts` into the worktree's `test/tests/`, runs the harness's `tsc`, deletes it, and runs the same
registrations at run time with `p09-reuse-union-runtime.mjs` (needs `lib.mjs`).

```ts
type Paths = "shared.button" | "main.button" | "dialog.button";
const { registry } = createRegistryWithAccessors<Paths>(page);
registry.add("shared.button").getByRole("button");
const copies: ReadonlyArray<{ target: Paths; source: Paths }> = [
  { target: "main.button", source: "shared.button" },
  { target: "dialog.button", source: "shared.button" },
];
for (const { target, source } of copies) {
  registry.add(target, { reuse: source }); // does not compile
}
const wide = createRegistryWithAccessors<string>(page);
const target: string = "main.button";
const source: string = "shared.button";
wide.registry.add(target, { reuse: source }); // does not compile
```

Command: `bash /home/magdys/workspace/dyhex/POMWright-final-review-probes/B/f4-reuse-union.sh`. `tsc` exits 2; the
runtime part registers, verifies and resolves both copies; the worktree is left clean.

**Fix sketch.** With `/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/sketch-B1-B5.diff` (one sketch for B-1 to B-5, applied to the worktree, built with `pnpm harness:install`, then reverted with `git checkout` and rebuilt; with it `pnpm test:unit`, `pnpm typecheck` and the in-scope harness specs on chromium, 349 tests, passed: logs `sketch-unit.log`, `sketch-typecheck.log`, `sketch-harness.log`), the probe compiles (`tsc exit: 0`) and the literal self-reuse in
`validation.locatorSchemaPath.typecheck.ts` still errors. Two changes were needed: `ReusePathArgument` rejects only a
single literal, and `add`'s rest-parameter conditional no longer distributes over `Reuse` (`[Reuse] extends
[undefined]`, `[Reuse] extends [LocatorSchemaPathType]`); without the second, the union loop still fails, with
`'[options: { reuse: "shared.button"; }] | [options: { reuse: "main.button"; }] | …'`.

## Observed / expected

```text
tsc exit: 2
…(13,24): error TS2345: Argument of type '[{ reuse: Paths; }]' is not assignable to parameter of type '[options: { reuse: InvalidReusePath<Paths>; }] | …'.
  …
          Type 'string' is not assignable to type '["Invalid reuse path, reuse path cannot be the same as registration path: shared.button" | "Invalid reuse path, reuse path cannot be the same as registration path: main.button" | "Invalid reuse path, reuse path cannot be the same as registration path: dialog.button"]'.
…(19,29): error TS2322: Type 'string' is not assignable to type 'InvalidReusePath<string>'.
```

At run time the same calls register `main.button` and `dialog.button` as copies of `shared.button`
(`getByRole('button')`, each described by its own path).

Expected: both compile, since nothing says the two variables hold the same path; the runtime check rejects a real
self-reuse. A literal self-reuse, `add("a", { reuse: "a" })`, stays a compile error.

## Cause

`src/locators/locatorRegistry.ts:61-66`:

```ts
type ReusePathArgument<Paths extends string, Path extends Paths, ReusePath extends Paths> =
	Exclude<ReusePath, Path> extends never ? InvalidReusePath<Path> : LocatorSchemaPathArgument<ReusePath>;
```

When `Path` is the whole union (or `string`), every possible `ReusePath` is in it, so `Exclude<ReusePath, Path>` is
`never` and the argument becomes `InvalidReusePath`, whatever the values are.

## Fix plan

- **Intended contract**: the reuse argument is rejected at compile time only when the registration path is a single
  literal and the reuse path is that same literal; a union-typed or wide path compiles, and the runtime rejects a real
  self-reuse.
- **Options**:
  1. *(recommended)* Reject only for a single literal: `string extends Path` or a union `Path` gives
     `LocatorSchemaPathArgument<ReusePath>`; otherwise keep today's `Exclude` test. A small `IsSingleLiteral<T>` helper
     (`[T] extends [UnionToIntersection<T>]`) is enough.
  2. Keep the type and document that a reuse path must be a literal; the error message stays misleading.
- **Implementation steps**: `src/locators/locatorRegistry.ts`: `ReusePathArgument`, and the `add` signature's rest
  parameter, made non-distributive over `Reuse` (`[Reuse] extends [undefined]`, `[Reuse] extends [LocatorSchemaPathType]`)
  so a union-typed path is checked as one argument; `InvalidReusePath` unchanged.
- **Tests**: `test/tests/locatorRegistry/validation/validation.locatorSchemaPath.typecheck.ts`: the union loop and the
  wide `string` compile, `add("validReuse", { reuse: "validReuse" })` still has its `@ts-expect-error`;
  `test/tests/packaging/publicTypes.typecheck.ts` beside the reuse cases, against the published declarations. A
  runtime case for a union-typed self-reuse that throws `Locator reuse path cannot be the same as registration path`.
- **Docs**: `docs/reusing-locators.md` *Reuse by path* may add "(a compile error for a literal; from a variable, at the
  call)"; `api/errors.md` *Reusing* already lists the runtime message.
- **Changeset**: patch. "`add(path, { reuse: other })` compiles when the paths are variables of the path union or wide
  strings; a literal path that reuses itself is still a compile error, and any self-reuse still throws at the call."
- **Decisions to tick** (walkthrough probes: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/R/walkthrough/b4/`):
  - [x] Option 1, **refined**: a pattern path (`` `list.item@${string}` ``, from a runtime id) counts as non-literal too,
    so it is checked at run time (the sketch rejected it, row R10); with the non-distributive rest parameter.
  - [x] (added) Tests: rows R1–R11 of the walkthrough probe, `@ts-expect-error` on the literal self-reuses; a runtime
    self-reuse through a variable; the paired template loop at run time.
  - [x] (added) Docs: *Reuse by path*; the runtime message in `add`'s `@throws` and the API page's **Throws**; a paired
    reuse loop in C-1's *Paths with a dynamic part*.
  - [x] (added) A new patch changeset, as in [DECISIONS.md #21](../DECISIONS.md).
- **Execution order**: independent; after B-3 if both are done, run the path type probes once for both.
