# D-5: An `async defineLocators()` compiles, and the page object then verifies a half-finished definition: misleading verification failures, or an unlabelled error that is not kept

- **Kind**: defect
- **Area**: page object lifecycle (`defineLocators()`, the scheduled check, sticky failures)
- **Severity**: Low (an input the types accept but the docs call synchronous; the test fails in every case probed, but
  with a message that names a cause the code does not have, or without the label and without keeping the error)
- **Semver of the fix**: patch (rejects, with a labelled message, an input that never worked as documented)
- **Reviewed**: `54cdada`, 2026-10-23, Claude (scope D)
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #16](../DECISIONS.md))

## Contract

- `src/pageObject.ts:384`: `protected abstract defineLocators(): void;` TypeScript accepts an override that returns a
  Promise for a `void` method, so `protected async defineLocators(): Promise<void>` compiles.
- `website/src/content/docs/internal/registry-records.md` (line 97): "`defineLocators()`, which is synchronous".
- `website/src/content/docs/internal/page-object-lifecycle.md`, *Sticky, labelled failures*: "An error in
  `defineLocators()` or in the check after it is wrapped once … with the original as `cause`, and kept: every later
  locator call throws the same error, and the definition never runs a second time, so a half-registered page object can
  never be used."
- `docs/page-objects.md`, *How a mistake is reported*: "A mistake in `defineLocators()` or found by the registry's check
  is reported with the page object's label, the original error as `cause` …".
- No page says that `defineLocators()` must not be `async`, and nothing checks it: a hole where the contract above
  should reach.

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/asyncdefine/zz-probe-D-asyncdefine.spec.ts`, three
page objects whose `defineLocators()` is `async` and registers part of its paths after an `await`:

```ts
class LateDuplicate extends PageObject<"main" | "main.button"> {
	// …constructor with label "LateDuplicate"
	protected async defineLocators(): Promise<void> {
		this.add("main").locator("main");
		await Promise.resolve();
		this.add("main").locator("body"); // registered twice, after the await
	}
}
class LateAncestor /* strictChains: true */ {
	protected async defineLocators(): Promise<void> {
		this.add("main.button").getByRole("button");
		await Promise.resolve();
		this.add("main").locator("main");
	}
}
class LateHasTarget {
	protected async defineLocators(): Promise<void> {
		this.add("main").locator("body").filter({ has: "main.button" });
		await Promise.resolve();
		this.add("main.button").getByRole("button");
	}
}
```

From the worktree root:

```sh
cp ../POMWright-final-review-probes/D/asyncdefine/zz-probe-D-asyncdefine.spec.ts test/tests/
pnpm exec tsc --noEmit -p test; echo "tsc exit $?"
pnpm -C test exec playwright test tests/zz-probe-D-asyncdefine.spec.ts --project=chromium --reporter=line --workers=1
rm test/tests/zz-probe-D-asyncdefine.spec.ts
```

Full output: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/out/asyncdefine-run.txt`.

## Observed / expected

`tsc exit 0`; the run exits 1, all three tests failing:

```text
case 1: a later locator call throws: none
  1) … › case 1: a duplicate after an await
    Error: A locator schema with the path "main" already exists.
      > 14 | 		this.add("main").locator("body"); // registered twice, after the await

  2) … › case 2: strictChains with an ancestor registered after an await
    Error: LateAncestor: Locator registry verification failed for 1 of 1 paths:
      "main.button": strictChains requires every ancestor to be registered; "main" is not.

  3) … › case 3: a has reference to a path registered after an await
    Error: LateHasTarget: Locator registry verification failed for 1 of 1 paths:
      "main": No locator schema registered for path "main.button".
```

- Case 1: the error after the `await` escapes as an unhandled rejection: no label, no `cause`, not kept. The page object
  is in the `defined` state, so a later `getNestedLocator("main")` resolves (`throws: none`) on a half-registered
  registry, which the lifecycle page says can never happen.
- Cases 2 and 3: `verify()` runs when the synchronous part returns, so it reports as missing a path the definition does
  register, a few microtasks later. The message names a cause the code does not have.

Expected: either the docs and types say `defineLocators()` must be synchronous and the page object rejects a Promise
from it with a labelled, kept error; or (not recommended) the lifecycle awaits it, which would make construction
asynchronous.

## Cause

`src/pageObject.ts:352-355`: `#defineLocatorsOnce` calls `this.defineLocators()`, ignores its result, and runs
`registry.verify()` and sets `defined` at once.

## Fix plan

- **Intended contract**: `defineLocators()` registers synchronously. If it returns a thenable, the page object fails
  as for any other definition error: `LoginPage: defineLocators() must register its locators synchronously; it returned
  a Promise. Read what it needs in the constructor or a fixture.` (wording to decide), labelled, kept, and thrown by the
  scheduled check or the first locator call.
- **Options**:
  1. **Recommended**: in `#defineLocatorsOnce`, check the return value for a `then` function before `verify()`, and
     throw the labelled error (state `failed`). The rejected Promise itself should get a no-op `catch` so its own
     rejection does not surface a second, unlabelled error. Patch: a page object with an `async` definition that
     happened to pass today now fails, with the reason.
  2. Docs only: say on *Page objects* and the `defineLocators()` API entry that it must be synchronous, and why. None,
     but the misleading messages stay.
- **Implementation steps**: `src/pageObject.ts` (`#defineLocatorsOnce`, the doc comment of `defineLocators`).
- **Tests**: `src/pageObject.test.ts` (an `async` definition fails the check with the labelled message and keeps it;
  no unhandled rejection); a harness case in `test/tests/pageObject/lifecycle.spec.ts` built in a fixture.
- **Docs**: `docs/page-objects.md` (*When `defineLocators()` runs*: it is synchronous), `api/class-pageobject.md`
  (*defineLocators()* Throws), `api/errors.md` (*Page objects → Locators*), `internal/page-object-lifecycle.md`.
- **Changeset**: patch. "A page object whose `defineLocators()` returns a Promise fails with a labelled error saying
  that it must register synchronously; before, it was verified before the rest of its definition ran." Migration: move
  the awaited work into the fixture and pass the result to the constructor.
- **Decisions to tick**:
  - [x] Reject a Promise from `defineLocators()` at runtime (option 1), or document only (option 2): **option 1**,
    with a no-op `catch` on the returned Promise. Rejected: a return type of `undefined` (the docs write
    `protected defineLocators(): void {` 45 times, so it would be a major) and awaiting it (an asynchronous lifecycle).
    The cost is only code that marks the method `async` by mistake: no registry method is asynchronous or takes a
    Promise (checked in `src/locators/`; AGENTS.md §5: "Builders are synchronous").
  - [x] The message: as proposed ("`<label>: defineLocators() must register its locators synchronously; it returned a
    Promise. Read what it needs in the constructor or a fixture, and pass it in.`"); final wording after R-4.
  - [x] (added) Tests, docs and a patch changeset with its migration hint, as above.
- **Execution order**: independent of D-1 to D-4; if D-4's option 2 is taken, the same file changes, so do them in one
  pass.
