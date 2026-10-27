# B-2: A locator method that throws at registration keeps its definition, so the next call reports a locator that was never registered

- **Kind**: defect
- **Area**: Registration: `add(path)` and its locator methods; "a throwing DSL call changes nothing" (AGENTS.md §5); errors *Two locator methods on one registration*
- **Severity**: Low (only a second call on a registration whose first locator method threw; the message is wrong, nothing is registered)
- **Semver of the fix**: patch (enforces the stated rule that a throwing call changes nothing)
- **Reviewed**: `54cdada`, 2026-10-23, scope B reviewer
- **Status**: decided: fix, option 3 (2026-10-26, [DECISIONS.md #27](../DECISIONS.md))

## Contract

- AGENTS.md §5: "A throwing DSL call changes nothing." and "Validate DSL input at the boundary, before anything is
  registered".
- `src/locators/locatorRegistrationBuilder.ts:810-813`, the comment of `ensureDefinitionAllowed`: "A failed call leaves
  the registry as it was".
- `website/src/content/docs/api/errors.md`, *Two locator methods on one registration*: the message `A locator definition
  for "main" has already been provided; only one locator type can be set for a registration.` is "Thrown by a second
  locator method on the same `add(path)`", meaning a second locator after one that was set.
- `docs/registering-locators.md`, *One registration per path*: "A call that throws registers nothing and changes
  nothing that is registered." (The registry is indeed unchanged; the registration object is not.)

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/f2-failed-persist.mjs` (with `lib.mjs` beside it):

```js
registry.add("main").locator("main");
const again = registry.add("main");               // a second registration of a registered path
again.getByRole("main");                          // throws: already exists
again.getByRole("main");                          // throws: "has already been provided"

const bad = registry.add(["main", "", "list"].join(".")); // a path built at run time: "main..list"
bad.locator("ul");                                // throws: consecutive dots
bad.locator("ul");                                // throws: "has already been provided"
```

Command, from the worktree root: `node ../POMWright-final-review-probes/B/f2-failed-persist.mjs`. Exit code 0.

**Fix sketch.** With `/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/sketch-B1-B5.diff` (one sketch for B-1 to B-5, applied to the worktree, built with `pnpm harness:install`, then reverted with `git checkout` and rebuilt; with it `pnpm test:unit`, `pnpm typecheck` and the in-scope harness specs on chromium, 349 tests, passed: logs `sketch-unit.log`, `sketch-typecheck.log`, `sketch-harness.log`), where `commit` persists the next definition before assigning it (option 3), both
second calls throw what the first threw (`A locator schema with the path "main" already exists.`, `LocatorSchemaPath
string cannot contain consecutive dots: main..list`; `sketch-probes.out`).

## Observed / expected

```text
1st call: A locator schema with the path "main" already exists.
2nd call: A locator definition for "main" has already been provided; only one locator type can be set for a registration.
1st call: LocatorSchemaPath string cannot contain consecutive dots: main..list
2nd call: A locator definition for "main..list" has already been provided; only one locator type can be set for a registration.
registered: LocatorSchemaPath string cannot contain consecutive dots: main..list
```

Expected: the second call throws what the first threw (the path exists; the path breaks a rule), since the first call
changed nothing. The second message says a locator was provided for the registration, which was never registered, and
hides the real cause. After a failed call, a step on the same registration (from JavaScript, the class's own `filter`)
also gets past `ensureDefinition`, pushes its step and then throws the path error from `persist`.

## Cause

`src/locators/locatorRegistrationBuilder.ts:770-784`, `commit`: it sets `this.definition` (line 778) and, for a seeded
registration, `this.overrideApplied` (line 780), and only then calls `this.persist()` (line 782), whose
`registry.register` (`locatorRegistry.ts:292-305`) checks the path rules and the duplicate and throws. The state set
before the throw stays, and `ensureDefinitionAllowed` (line 831) then reports the definition as already provided. The
any-frame branch of `frameLocator()` (lines 652-655) has the same order.

The path is not checked at `add(path)` (`locatorRegistry.ts:211-229`), only when the record is written, so the failing
call is the first point at which the path rules are applied.

## Fix plan

- **Intended contract**: a locator method that throws leaves the registration as it was before the call: the same call
  again throws the same error.
- **Options**:
  1. *(recommended)* Check before changing anything: in `commit` (and the any-frame branch), before line 778, validate
     the path and, while the registration is not yet registered, check that the registry has no record for it (a new
     internal `registry.has(path)` or a `canRegister(path)` that throws the same messages as `register`). Then set the
     state and persist. This is validation at the boundary, not a rollback, so it does not reintroduce the removed
     "rollback of a failed seeded override" (AGENTS.md §8).
  2. Validate the path in `add(path)` itself, so a path that breaks the rules throws at `add`, and keep option 1's
     duplicate check. Earlier error for paths built at run time, but it moves the documented throw site
     ("at the locator method", `api/class-locatorregistry.md` *add* and the `add` doc comment) and is a visible change.
  3. Compute the next definition into a local, persist it, and assign only after `persist` returns. Needs `persist` to
     take the record as an argument.
- **Implementation steps**: `src/locators/locatorRegistrationBuilder.ts` (`commit`, the any-frame branch of
  `frameLocator`), `src/locators/locatorRegistry.ts` (a check that throws `register`'s messages without writing).
- **Tests**: `src/locators/locatorRegistrationBuilder.test.ts`: a locator method on a duplicate path, twice, throws the
  duplicate message both times; the same for a run-time path that breaks a rule; a seeded registration whose override
  fails keeps accepting one override. A harness case in `test/tests/locatorRegistry/add/add.validation.spec.ts` against
  the packed package.
- **Docs**: none needed for option 1 or 3; for option 2, `api/class-locatorregistry.md` *add* (Throws), the `add` doc
  comment, `docs/registering-locators.md` and `api/errors.md` *Paths* ("Thrown by a locator method of `add(path)`").
- **Changeset**: patch. "A locator method that throws because its path is registered already or breaks the path rules
  now leaves the registration as it was, so calling it again reports the same error."
- **Decisions to tick** (walkthrough probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/R/walkthrough/b2/`):
  - [x] Check before changing (option 1), check at `add` (option 2) or assign after persisting (option 3): **option 3**
    for the duplicate; the path-rule half is settled by decision 22 (`add` checks the path rules); the duplicate check
    stays at the locator method, whose message shows the attempted locator.
  - [x] (added) Tests, no docs, a new patch changeset, and one sentence in decision 22's changeset on `add` throwing for
    a bad path ([DECISIONS.md #27](../DECISIONS.md)).
- **Execution order**: independent of B-1; before any change to the ended-registration messages (B-5), which touch the
  same file.
