# B-5: A `getLocator` in a locator method's `has` option ends the registration with advice that does not fit: the 2accf34 message covers `filter()` only

- **Kind**: defect
- **Area**: Ended registrations: the message of an ended registration (`ensureOpen`), commit `2accf34` as a change set (inventory §2 "A registration ends at the next call on its registry")
- **Severity**: Low (a misleading message; the registration fails loudly at the call)
- **Semver of the fix**: patch (message only)
- **Reviewed**: `54cdada`, 2026-10-23, scope B reviewer
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #25](../DECISIONS.md))
- **Merged with**: C-2 (see report.md)

## Contract

- AGENTS.md §5: "A `getLocator` in an `add` chain's filter arguments runs first and ends that registration; the message
  shows the two ways to write it (a path, or a locator resolved before `add`)."
- Commit `2accf34` and `.changeset/ended-registration-message.md`: the message names the ending call, and "After a
  getLocator or getNestedLocator of another path, a filter's message also shows the two ways to write it".
- `docs/registering-locators.md`, *Registered locators do not change*: "A registry call in a step's own arguments counts
  too, since JavaScript runs a call's arguments before the call."
- AGENTS.md §5 on messages: "Error messages name the registry path … and the DSL method the user called"; the skill's
  bar for a message is that it names the actual cause and fix.

The same mechanism applies to the arguments of the locator method itself: `locator(selector, { has, hasNot })` takes a
`Locator` in its options, the direct transliteration of Playwright's `page.locator("section", { has: … })`.

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/f5-has-option.mjs` (with `lib.mjs`):

```js
registry.add("heading").getByRole("heading");
registry.add("section@orders").locator("section", { has: registry.getLocator("heading") });
registry.add("section@other").locator("section", { hasNot: registry.getNestedLocator("heading") });
registry.add("section@seeded", { reuse: registry.createReusable.locator("section") })
  .locator({ has: registry.getLocator("heading") });
registry.add("section@filtered").locator("section").filter({ has: registry.getLocator("heading") }); // for comparison
```

Command, from the worktree root: `node ../POMWright-final-review-probes/B/f5-has-option.mjs`. Exit code 0; output in
`f5-has-option.out`.

**Fix sketch.** With `/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/sketch-B1-B5.diff` (one sketch for B-1 to B-5, applied to the worktree, built with `pnpm harness:install`, then reverted with `git checkout` and rebuilt; with it `pnpm test:unit`, `pnpm typecheck` and the in-scope harness specs on chromium, 349 tests, passed: logs `sketch-unit.log`, `sketch-typecheck.log`, `sketch-harness.log`), where `ensureOpen` gives `locator` its own hint, the three `locator()` cases print
`… its registration was ended by getLocator("heading"). If that call is in this locator's options, which run first,
resolve the locator before add(…), or filter by a path in a step: .filter({ has: "heading" }). Otherwise, …` and the
`filter()` message is unchanged (`sketch-probes.out`).

## Observed / expected

```text
locator option has: { error: 'locator() cannot apply to "section@orders": its registration was ended by getLocator("heading"); give a registration all its steps in its add(…) chain, or query the path for one use.' }
locator option hasNot (nested): { error: 'locator() cannot apply to "section@other": its registration was ended by getNestedLocator("heading"); give a registration all its steps in its add(…) chain, or query the path for one use.' }
seeded locator override has: { error: 'locator() cannot apply to "section@seeded": its registration was ended by getLocator("heading"); give a registration all its steps in its add(…) chain, or query the path for one use.' }
filter has: { error: `filter() cannot apply to "section@filtered": its registration was ended by getLocator("heading"). If that call is in this filter's arguments, which run first, resolve the locator before add(…), or pass a path, which resolves to that path's own locator: filter({ has: "heading" }). Otherwise, …` }
resolved before add: 1
```

The three `locator()` messages tell the user to give the registration all its steps in its `add(…)` chain, which the
line does; the cause (the `getLocator` in the call's own arguments) and the fix (resolve the locator before `add(…)`,
which works: "resolved before add: 1", or move the condition to `filter({ has: "heading" })`) are not named. Expected:
the message for a locator method ended by a `getLocator`/`getNestedLocator` of another path gives the same hint as
`filter()`'s, adapted: resolve the locator before `add(…)`, or use `.filter({ has: "<path>" })`.

## Cause

`src/locators/locatorRegistrationBuilder.ts:133-146`, `ensureOpen`: the hint is given only when
`method === "filter"` (line 138). The locator methods call `ensureOpen` with their own name (`"locator"`, line 598;
the seeded override goes through the same method) and get the generic message.

## Fix plan

- **Intended contract**: a registration method that throws because a `getLocator` or `getNestedLocator` of another path
  ended it names the call and, where a `Locator` could have been passed in that method's arguments (`filter`, and the
  `has`/`hasNot` options of `locator`), shows the ways to write it.
- **Options**:
  1. *(recommended)* Extend the hint to `locator` (`method === "filter" || method === "locator"`), with a
     method-specific suggestion: for `locator`, "resolve the locator before add(…), or pass a path to a filter step:
     .filter({ has: "<path>" })". Keep the generic message for the other locator methods, whose options take no
     `Locator`.
  2. Give every method the conditional hint ("If that call is in this method's arguments, …"). Simpler, but the hint
     would appear where it cannot apply (`getByRole`, `nth`).
- **Implementation steps**: `src/locators/locatorRegistrationBuilder.ts` `ensureOpen`.
- **Tests**: `src/locators/locatorRegistry.test.ts` beside the 2accf34 cases; a case in
  `test/tests/locatorRegistry/add/add.registrationEnds.spec.ts` against the packed package (`locator(…, { has:
  registry.getLocator(…) })` and the seeded `locator({ has: … })`).
- **Docs**: `docs/registering-locators.md` (the paragraph "A registry call in a step's own arguments counts too" names
  the locator method's options too), `api/errors.md` *A registration that has ended* (the new text),
  `api/class-registrationbuilder.md` *Locator methods*, AGENTS.md §5 ("in an `add` chain's filter arguments" becomes
  "in an `add` chain's arguments").
- **Changeset**: patch. "A `getLocator` or `getNestedLocator` in the `has` or `hasNot` option of `locator(…)` in an
  `add` chain now gets the same hint as one in `filter(…)`: resolve the locator before `add(…)`, or filter by path."
- **Decisions to tick**:
  - [x] Hint for `filter` and `locator` (option 1) or for every method (option 2): **option 1**, also after a query
    (C-2), with the wording, tests, docs and the extended pending changeset of [DECISIONS.md #25](../DECISIONS.md).
- **Execution order**: after B-2 if both are done (same file).
