# B-6: The editor's rename of a path does not reach a `has` or `hasNot` path, although the docs say a rename from a use reaches every use

- **Kind**: documentation
- **Area**: Paths: `docs/locator-paths.md` *One path gets a new name*; `internal/builders.md` *Path parameters are generic* (commits `bb03471`, `13017b7`)
- **Severity**: Low (the left-over `has` path becomes a compile error once the `Paths` member is renamed, so nothing is missed in the end; the page tells the reader the rename does more than it does)
- **Semver of the fix**: none (docs only)
- **Reviewed**: `54cdada`, 2026-10-23, scope B reviewer
- **Status**: decided: docs, led by a find and replace (2026-10-27, [DECISIONS.md #43](../DECISIONS.md))

## Contract

`website/src/content/docs/docs/locator-paths.md:152-156`:

> Your editor's rename (F2 in VS Code) works on a single path, in two steps. Started from any use, it renames every use
> of that exact path across the project, sub-path arguments included, but not its member of `Paths`; started from the
> member, it renames only the member. Rename from a use, then the member: in between, TypeScript flags every use, so
> nothing is missed.

`website/src/content/docs/internal/builders.md:63-70`: "a rename from the member reaches only the member, and one from
a use reaches every use, sub-path arguments included … Probed against the TypeScript 6.0.3 language service".

The *What catches a missed spot* section of the same page lists "a `has`" among the uses TypeScript checks, and
*An element moves, or its locator changes* says "every `has` that names it, follows", so a reader takes a `has` path to
be one of the "uses".

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/p11-rename.cjs` runs TypeScript 6.0.3's language service
(`findRenameLocations`) with the harness's `test/tsconfig.json` against the packed package. It writes this file to
`test/tests/zz-probe-B4.ts` for the run and deletes it:

```ts
type Paths = "main" | "main.list" | "main.list.item";
const { registry } = createRegistryWithAccessors<Paths>(page);                                    // line 5
registry.add("main.list").locator("ul");                                                          // line 6
registry.add("main.list.item").getByRole("listitem").filter({ has: "main.list" });                // line 7
registry.getNestedLocator("main.list");                                                           // line 8
registry.getLocatorSchema("main.list.item").skip("main.list").getNestedLocator();                 // line 9
registry.getLocatorSchema("main.list.item").update("main.list").locator("ol");                    // line 10
registry.getLocator("main.list");                                                                 // line 11
registry.getLocatorSchema("main.list.item").filter("main.list", { hasText: "x" }).getNestedLocator(); // line 12
registry.add("main", { reuse: "main.list" });                                                     // line 13
registry.createReusable.locator("li").filter({ hasNot: "main.list" });                            // line 14
registry.getLocatorSchema("main.list.item").filter({ has: "main.list" }).getNestedLocator();       // line 15
```

Command: `node /home/magdys/workspace/dyhex/POMWright-final-review-probes/B/p11-rename.cjs`. Exit code 0; no semantic
diagnostics; the worktree is left clean. Output (`p11-rename.out`):

```text
diagnostics: []
the Paths member (line 4)                -> 4
add (line 6)                             -> 6, 8, 9, 10, 11, 12, 13
the has value (line 7)                   -> 7, 14, 15
getNestedLocator (line 8)                -> 6, 8, 9, 10, 11, 12, 13
skip (line 9)                            -> 6, 8, 9, 10, 11, 12, 13
update (line 10)                         -> 6, 8, 9, 10, 11, 12, 13
getLocator (line 11)                     -> 6, 8, 9, 10, 11, 12, 13
query filter (line 12)                   -> 6, 8, 9, 10, 11, 12, 13
reuse (line 13)                          -> 6, 8, 9, 10, 11, 12, 13
seed hasNot (line 14)                    -> 7, 14, 15
query has (line 15)                      -> 7, 14, 15
```

## Observed / expected

A rename started from any resolving call, sub-path argument or reuse reaches all of those, but none of the `has` and
`hasNot` paths (lines 7, 14, 15: an `add` chain's filter, a seed's filter, a query's filter); a rename started from a
`has` path reaches only the `has` and `hasNot` paths. The member claim holds (line 4 alone). In the two-step
procedure, the `has` path keeps the old name; it is not flagged between the steps (the old name is still in `Paths`),
and becomes a compile error after the member is renamed. So the end state is caught, but "renames every use" is not
what happens: a `has` or `hasNot` path, in an `add` chain's filter, a seed's filter, a query's filter or a
`FilterDefinition` constant, is renamed by a second rename started from one of them, or by hand.

The cause is the one `internal/builders.md` gives for the member: the rename links string literals with the same text
and the same contextual type. A `has` value's contextual type is `FilterLocatorReference<…>` (`Locator | RegistryPath<…>`,
`src/locators/types.ts:260-263, 276-287`), neither the path's own literal type nor the union.

## Fix plan

- **Intended contract**: the page describes what the rename does.
- **Options**:
  1. *(recommended)* Docs: in *One path gets a new name*, "it renames every use … sub-path arguments and reuse paths
     included, but not its `has` and `hasNot` paths, which a rename started from one of them renames together, nor its
     member of `Paths`": three steps (a use, a `has` path, the member), and after the member TypeScript flags anything
     still on the old name. The same correction in `internal/builders.md`.
  2. Make the `has` contextual type the path's own literal (a generic `filter<HasPath extends Paths>(filter:
     FilterDefinition<…, HasPath>)`), so the rename links it. A type change on every `filter` (registration, seed,
     query), to probe against the language service and the declaration emit first; not needed for correctness.
- **Implementation steps**: `website/src/content/docs/docs/locator-paths.md` *One path gets a new name*;
  `website/src/content/docs/internal/builders.md` *Path parameters are generic*.
- **Tests**: none for option 1; for option 2, keep `p11-rename.cjs` as a check.
- **Docs**: the two pages above.
- **Changeset**: none for option 1 (docs only); option 2 would be a patch or minor, decided with its probe.
- **Decisions to tick**:
  - [x] Correct the two pages (option 1), or change the `has` type (option 2): **option 1**, revised: the page leads with
    a find and replace for the path and every path below it, F2 stays with its limits; option 2 probed and rejected
    (it does not merge the rename groups) ([DECISIONS.md #43](../DECISIONS.md))
- **Execution order**: independent.
