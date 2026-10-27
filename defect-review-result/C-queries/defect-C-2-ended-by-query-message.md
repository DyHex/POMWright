# C-2: A query used inside an `add` chain's filter arguments ends the registration with the old, self-contradicting message that 2accf34 fixed for `getLocator`

- **Kind**: defect
- **Area**: Change set `2accf34` (an ended registration's error names the call that ended it), its query paths;
  `getLocatorSchema` and a query's resolution as the ending call
- **Severity**: Low (a misleading message: the code fails as it should, but the message tells the user to do what the
  line already does)
- **Semver of the fix**: patch (a message brought in line with what the changeset and AGENTS.md §5 promise for this
  mistake)
- **Reviewed**: `54cdada`, 2026-10-23, Claude Opus 5.5 (scope C)
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #25](../DECISIONS.md))
- **Merged with**: B-5 (see report.md)

## Contract

- `2accf34`'s commit message: "a getLocator inside an add chain's filter arguments runs before the filter, so the
  filter threw 'its registration has ended; give a registration all its steps in its add(…) chain', which is what the
  line did. [...] After a getLocator or getNestedLocator of another path, a filter's message also shows the two ways to
  write it."
- `.changeset/ended-registration-message.md`: "When that call was a `getLocator` or `getNestedLocator` before a
  `filter`, the message also shows the two ways to write the filter."
- AGENTS.md §5: "A `getLocator` in an `add` chain's filter arguments runs first and ends that registration; the message
  shows the two ways to write it (a path, or a locator resolved before `add`)."
- `website/src/content/docs/docs/filters-and-indices.md`, *A path, a locator or a chain*: "Inside an `add(…)` chain,
  resolve a locator before the `add`: a `getLocator` in the filter's own arguments runs first, and ends the
  registration."

A query's `getLocator()` and `getNestedLocator()` are the same mistake in the same place: a resolution in the filter's
arguments, which runs before the filter. The promise covers the registry's two resolving methods and misses the query's
two, which are the natural way to write a variation of the referenced locator (`getLocatorSchema("badge").nth(0)`).

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p09-ended-by-query.mjs` (with `lib.mjs` beside it; it
imports the worktree's `dist/index.mjs` and launches chromium from the root package):

```js
const { add, getLocator, getLocatorSchema } = createRegistryWithAccessors(page);
add("badge").locator("b");
add("item@a").locator("li").filter({ has: getLocator("badge") });
add("item@b").locator("li").filter({ has: getLocatorSchema("badge").nth(0).getLocator() });
add("item@c").locator("li").filter({ has: getLocatorSchema("badge").getNestedLocator() });
const badge = getLocatorSchema("badge");
add("item@d").locator("li").filter({ has: badge.getLocator() });
```

```sh
node /home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p09-ended-by-query.mjs; echo exit=$?
```

## Observed / expected

Exit 0; each call throws:

```text
getLocator: THROWS filter() cannot apply to "item@a": its registration was ended by getLocator("badge"). If that call is in this filter's arguments, which run first, resolve the locator before add(…), or pass a path, which resolves to that path's own locator: filter({ has: "badge" }). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.
getLocatorSchema(...).getLocator(): THROWS filter() cannot apply to "item@b": its registration was ended by getLocatorSchema("badge"); give a registration all its steps in its add(…) chain, or query the path for one use.
getLocatorSchema(...).getNestedLocator(): THROWS filter() cannot apply to "item@c": its registration was ended by getLocatorSchema("badge"); give a registration all its steps in its add(…) chain, or query the path for one use.
kept query: THROWS filter() cannot apply to "item@d": its registration was ended by a query's resolution of "badge"; give a registration all its steps in its add(…) chain, or query the path for one use.
```

Expected: the three query forms get the explanation the `getLocator` form gets (the call ran in the filter's
arguments; resolve the locator before `add(…)`). Observed: they get the pre-fix advice, "give a registration all its
steps in its add(…) chain, or query the path for one use", which is exactly what lines `item@b` to `item@d` do: every
step is in the `add(…)` chain, and the path was queried for one use.

## Cause

`src/locators/locatorRegistry.ts:120-133` (`endOpenRegistration`) sets `resolvedPath` only when `resolves` is true,
which only `getLocator` (`:534`) and `getNestedLocator` (`:557`) pass. `getLocatorSchema` (`:454`) passes no
`resolves`, and a query's resolution reaches `endOpenRegistration("resolution", path)` from `buildLocatorChain`
(`:578`) with `resolves` false. `src/locators/locatorRegistrationBuilder.ts:138` shows the hint only when
`by.resolvedPath` is set.

## Fix plan

- **Intended contract**: a registration ended by any call that can sit in a `filter`'s arguments and produce a
  `Locator` (`getLocator`, `getNestedLocator`, `getLocatorSchema(...)` followed by a query resolution, a kept query's
  `getLocator()` or `getNestedLocator()`) gets the explanation; the rule itself is unchanged.
- **Options**:
  1. *(recommended)* Pass `resolves = true` for `getLocatorSchema` and for a query's resolution, so `filter()` shows the
     hint. For a query, the "pass a path" alternative is only equivalent when the query changes nothing, so the message
     may say "resolve the locator before add(…)" first, as it already does.
  2. Give every ended `filter()` the hint ("If that call is in this filter's arguments, which run first, …"), whatever
     ended the registration. Simpler; the hint then also appears after an `add`, where it cannot apply.
  3. Leave the code and document, on *Filters and indices* and in `errors.md`, that a query in the filter's arguments
     ends the registration as `getLocator` does. Semver none; the message stays self-contradicting.
- **Implementation steps**: `src/locators/locatorRegistry.ts` (`getLocatorSchema`, `buildLocatorChain`'s
  `endOpenRegistration` call); `src/locators/locatorRegistrationBuilder.ts` (`ensureOpen`) only if the wording changes
  for queries.
- **Tests**: unit cases beside the existing ones in `src/locators/locatorRegistry.test.ts`; a harness case in
  `test/tests/locatorRegistry/add/add.registrationEnds.spec.ts` (chromium; it imports `pomwright`, so it runs against
  the packed package).
- **Docs**: `api/errors.md` *A registration that has ended*; `docs/filters-and-indices.md` *A path, a locator or a
  chain* (one sentence: a query's resolution in the arguments ends the registration too); the `add` doc comment's
  `@throws`.
- **Changeset**: patch. "A registration ended by a query used in its filter's arguments, such as
  `filter({ has: getLocatorSchema("badge").nth(0).getLocator() })`, gets the same explanation as one ended by
  `getLocator`."
- **Decisions to tick**:
  - [x] Option 1, 2 or 3: **option 1**, with B-5 ([DECISIONS.md #25](../DECISIONS.md)).
  - [x] The wording for a query: "resolve it before add(…)" only; the "pass a path" alternative is left out, since it
    would drop the query's changes.
- **Execution order**: independent; touches the same message as any scope B finding on `2accf34`, so merge with one if
  the consolidation finds one.
