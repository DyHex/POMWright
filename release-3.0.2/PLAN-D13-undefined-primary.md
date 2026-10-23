# PLAN-D13 — an explicit `undefined` primary (codex-D7)

## Intended contract

`AGENTS.md` section 5: "`undefined` means 'not provided' (it inherits on seeded and update builders)".
`parseUpdateArguments` ([../src/locators/locatorUpdateBuilder.ts#L22-L26](../src/locators/locatorUpdateBuilder.ts#L22-L26)):
"`undefined` means 'not provided' for both, as in any JavaScript call". The `update` builder's primary is optional on
`api/class-locatorupdatebuilder.md`.

## Verified current behaviour

The runtime inherits the registered primary for `undefined`; codex confirmed it in a browser
(`update().getByRole(undefined, { name: "Save" })` keeps `"button"` and selects Save). The types reject it. Probe,
2026-10-22, `tsc` 6.0.3 against the packed build, TS2345 on each of:

```ts
query.update().getByRole(undefined, { name: "Save" });
query.update().getByText(undefined);
query.update().getByRole(role, { name: "Save" }); // role: "button" | undefined
registry.add("b", { reuse: seed }).getByRole(undefined, { name: "Save" });
```

`UpdateArgsWithOptions` and `UpdateArgsWithoutOptions` (`src/locators/locatorUpdateBuilder.ts`) and the seeded
overloads (`src/locators/locatorRegistrationBuilder.ts`) leave `undefined` out of the primary position. The third line
is the case that matters: forwarding an optional value.

## Fix

Add `undefined` to the primary position of the `update` builder's and the seeded registration's argument tuples.
Registration and `replace` keep a required primary.

## Tests

`test/tests/packaging/publicTypes.typecheck.ts`: the four calls compile; `replace().getByRole(undefined)` and
`add(path).getByRole(undefined)` stay errors. A unit test that the runtime inherits for each strategy, if none exists.

## Docs

`api/class-locatorupdatebuilder.md` and `docs/queries.md`: one line that `undefined` keeps the registered value, as an
omitted argument does.

## Changeset

`patch`: "`update()` and a seeded registration accept `undefined` as the first argument in their types, as they already
did at runtime: it keeps the registered value. A variable of type `T | undefined` can now be passed through."

## Bump

Patch: the types are brought in line with the documented runtime contract. One could read it as a new accepted input
(a minor); it is listed here as a patch because the contract already promised it.

## Decisions

- [x] Fix as above, as a patch (2026-10-22)
