# E-1: Inside a boxed step, a boxed `@step` method and the helpers' steps are reported at a line of POMWright's bundle, not at the line that called them

- **Kind**: defect
- **Area**: `@step` (boxed wrapper) and the step locations of the navigation and session storage helpers (inventory
  §2 *Logging, steps and the fixture*, "Step locations of the navigation and session storage helpers")
- **Severity**: Medium (a documented feature, "a boxed step is reported at the line that called the method", does not
  hold in a common case: any boxed `@step` method that calls `this.navigation.goto()`, `sessionStorage.set()` or another
  boxed `@step` method, or any of them inside the test's own `test.step(..., { box: true })`; the report's step links
  into `node_modules/pomwright/dist/index.js`. Nothing else goes wrong: titles, nesting, results and error locations are
  right)
- **Semver of the fix**: patch (brings the location in line with what the docs, the doc comment and the 3.0.2 changeset
  already promise)
- **Reviewed**: `54cdada`, 2026-10-23, Claude (claude-opus-5-5), scope E
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #12](../DECISIONS.md))

## Contract

- `website/src/content/docs/api/step.md`, *Arguments*: "`box` (report the step at the line that called the method)".
- `website/src/content/docs/docs/test-steps.md` line 54: `@step({ box: true }) async confirm() {} // an error inside
  points at the line that called confirm()`; line 36: the report shows the step "at the line that called `submit()`".
- `.changeset/boxed-step-location.md` (3.0.2, `333a928`): "`@step({ box: true })` reports the step, and an error
  thrown inside it, at the line that called the method, as the docs said. [...] one called from another method was
  reported one frame too far out."
- AGENTS.md §5: "The navigation and session storage helpers pass `{ box: true }` to their steps, so the report shows
  the line that called them."
- `src/helpers/navigation.ts:6`: "A boxed step is reported at the line that called the helper, as a `@step` row is, not
  inside POMWright."; `navigation.ts:46` and `website/src/content/docs/api/class-navigation.md` line 9: each method is
  "a step of the report at the line that called it"; `docs/urls-and-navigation.md` line 99 the same;
  `src/helpers/sessionStorage.ts:287`: "boxed so the report shows it at the line that called the helper".
- `website/src/content/docs/internal/call-sites.md`, *Steps at the test's line*: "a boxed step is shown at the line
  that called the helper exactly when one `async` POMWright frame sits between the caller and `test.step`", and under
  *Alternatives weighed*: "A step `location` computed from the call site. `{ box: true }` gives the same report location
  without parsing a stack".
- Playwright itself, for the same nesting: a boxed `test.step` inside a boxed `test.step` is reported at the line that
  called the inner `test.step` (probe case 4 below).

## Reproduction

Probe files in `/home/magdys/workspace/dyhex/POMWright-final-review-probes/E/steps/`: `nested.spec.ts` (the spec),
`printReporter.ts` (prints each `test.step` with its reported location, and each error with its location),
`steps.config.ts` (a config without a browser or web server, like `test/playwright.steps.config.ts`) and `run.sh`
(copies the three into `test/zz-probe-E/` and `test/zz-probe-E.config.ts`, runs Playwright, removes them).

```sh
bash /home/magdys/workspace/dyhex/POMWright-final-review-probes/E/steps/run.sh nested.spec.ts
# against v3.0.1, in a worktree of its own with its harness installed:
WT=/home/magdys/workspace/dyhex/POMWright-final-review-probes/E/v3.0.1 \
  bash /home/magdys/workspace/dyhex/POMWright-final-review-probes/E/steps/run.sh nested.spec.ts
```

Exit code 0 (the reporter only prints). The relevant part of the spec (line numbers as in the file):

```ts
class Widget {
	@step("inner-boxed", { box: true })
	async innerBoxed() {}
	// ...
	@step("outer-boxed", { box: true })
	async outerBoxed() {
		await this.innerBoxed(); // L outer-boxed->inner-boxed            (line 35)
		await this.innerPlain(); // L outer-boxed->inner-plain            (line 36)
	}
	@step("outer-boxed-goto", { box: true })
	async outerBoxedGoto() {
		await new ProbePage().navigation.goto(); // L outer-boxed->goto   (line 47)
		const storage = new SessionStorage(fakePage(), { label: "S", origin: "https://shop.example" });
		await storage.set("token", "abc"); // L outer-boxed->set          (line 49)
	}
}
test("4 native: boxed test.step in boxed test.step", async () => {
	await test.step("native-outer", async () => {
		await test.step("native-inner", async () => {}, { box: true }); // (line 74)
	}, { box: true });
});
test("5 decorated boxed and helpers in the test's own boxed test.step", async () => {
	await test.step("user-outer", async () => {
		await new Widget().innerBoxed(); // L user-outer->inner-boxed       (line 84)
		await new ProbePage().navigation.goto(); // L user-outer->goto      (line 85)
	}, { box: true });
});
```

## Observed / expected

At `54cdada` (`nested.out`):

```text
STEP [1 boxed in boxed (decorators)]   inner-boxed @ index.js:967
STEP [1 boxed in boxed (decorators)]   inner-plain @ nested.spec.ts:36
STEP [1 boxed in boxed (decorators)] outer-boxed @ nested.spec.ts:59
STEP [3 helpers in a boxed @step]   ProbePage: Navigate to this Page @ index.js:2931
STEP [3 helpers in a boxed @step]   S.SessionStorage.set: @ index.js:861
STEP [3 helpers in a boxed @step] outer-boxed-goto @ nested.spec.ts:67
STEP [4 native: boxed test.step in boxed test.step]   native-inner @ nested.spec.ts:74
STEP [5 decorated boxed and helpers in the test's own boxed test.step]   inner-boxed @ index.js:967
STEP [5 decorated boxed and helpers in the test's own boxed test.step]   ProbePage: Navigate to this Page @ index.js:2931
```

`index.js:967` is `return await import_test3.test.step(titleFor(this), ...)` in
`test/node_modules/.pnpm/pomwright@file+..+.pack+pomwright_@playwright+test@1.64.0/node_modules/pomwright/dist/index.js`
(the `@step` wrapper); `index.js:2931` is the navigation helper's `await import_test4.test.step(` and `index.js:861`
the `SessionStorage.set` helper's `await this.step("set", ...)`.

At `v3.0.1` (`nested.v3.0.1.out`), the same spec:

```text
STEP [1 boxed in boxed (decorators)]   inner-boxed @ nested.spec.ts:35
STEP [1 boxed in boxed (decorators)] outer-boxed @ no location
STEP [3 helpers in a boxed @step]   ProbePage: Navigate to this Page @ index.js:2664
STEP [3 helpers in a boxed @step]   S.SessionStorage.set: @ index.js:703
STEP [5 decorated boxed and helpers in the test's own boxed test.step]   inner-boxed @ nested.spec.ts:84
STEP [5 decorated boxed and helpers in the test's own boxed test.step]   ProbePage: Navigate to this Page @ index.js:2664
```

So for `@step`, `333a928` fixed the top-level boxed call (no location before) and in the same change moved the nested
boxed call from the right line (35, 84) into the bundle: a regression of that path. For the navigation and session
storage helpers the nested case was already in the bundle in 3.0.1.

Expected: every one of these steps at the line that called it (35, 47, 49, 84, 85), as Playwright reports its own
nested boxed step (line 74). Error locations are right and unchanged: an error thrown in a boxed step nested in another
boxed step is reported at the outermost boxed call site (`nested.spec.ts:93`), which is Playwright's own rule.

## Cause

Playwright 1.64's `_addStep` (`playwright/lib/worker/workerProcessEntry.js`, `TestInfoImpl._addStep`):

```js
let boxedStack = parentStep?.boxedStack;
let stack = data.stack;
if (!boxedStack && data.box) {
  boxedStack = filteredStackTrace3(captureRawStack()).slice(1);
  stack ??= boxedStack;
}
stack ??= filteredStackTrace3(captureRawStack());
```

The first frame is dropped only when no ancestor step is boxed. Inside a boxed ancestor the step keeps the full async
stack, whose first frame is the `async` wrapper POMWright added so that the top-level case would drop it
(`src/helpers/stepDecorator.ts:88-91`; the helpers' `async` methods in `src/helpers/navigation.ts` and
`src/helpers/sessionStorage.ts`, by the same rule, AGENTS.md §5). One fixed number of POMWright frames cannot be right
in both cases, because whether an ancestor is boxed is Playwright's internal state.

## Fix plan

Per AGENTS.md §6, to be confirmed before any code changes.

- **Intended contract**: a boxed `@step` step and every navigation and session storage step is reported at the line
  that called the method, whether or not an ancestor step is boxed; an error inside keeps Playwright's boxed-error rule
  (the outermost boxed call site).
- **Options**:
  1. *(recommended)* Keep the `async` wrapper (it is what gives a top-level boxed step's error its stack) and also pass
     `test.step` a `location`: the first frame with a file below the wrapper on the synchronous stack at the call,
     captured with `Error.captureStackTrace(holder, wrapper)` (the way `src/helpers/callSite.ts` already cuts a stack at
     a boundary), unless the caller gave `options.location`. With a `location`, Playwright uses it as the step's stack
     whatever the ancestors are, and still computes `boxedStack` for errors. Shown to work for `@step` by a source
     sketch (`steps/fix-sketch-E-1.py`, applied, `pnpm harness:install`, probes re-run, then restored): `nested.sketch.out`
     reports `inner-boxed` at 35 and 84 and `inner-boxed-throws` at 54, the error still at 93, `forms.sketch.out` every
     top-level form at its line, and `test/playwright.steps.config.ts` passes (7 checked). Cost: a stack capture and a
     parse of its frame lines per boxed call; the parse must accept `file://` URLs (ESM) and skip frames without a file
     (`Array.map (<anonymous>)`, `async Promise.all (index 0)`). Side effect seen in `forms.sketch.out`: a boxed method
     whose Promise a helper returns without awaiting it now reports the helper's line where Playwright reports none
     (case 7); arguably better, and a deviation from Playwright's own behaviour to note in the docs. The helpers in
     `navigation.ts` and `sessionStorage.ts` need the same `location` (scopes D and A own those files; the mechanism is
     shared, so one helper in `callSite.ts` serves all three).
  2. Document the limitation instead (docs only, `none`): inside a boxed step, a boxed `@step` and the helpers' steps
     are reported in POMWright's bundle. Leaves the regression of 3.0.1's nested `@step` case in place.
- **Implementation steps**: a `callerLocation(boundary)` in `src/helpers/callSite.ts` returning
  `{ file, line, column } | undefined`; `createWrappedMethod`'s boxed branch names its wrapper and passes
  `{ ...options, location: options.location ?? callerLocation(wrapper) }`; the navigation helper's three methods and
  `SessionStorage`'s step helper pass their own method as the boundary.
- **Tests**: `test/step-locations/stepLocations.spec.ts` gains: a boxed `@step` method calling another boxed `@step`
  method, a boxed `@step` method calling `navigation.goto()` and `storage.set()`, and both inside a test's own
  `test.step(..., { box: true })`, each marked `// LOCATION <id>`; an error thrown in a nested boxed step keeps its
  current location (the outer call site). Unit test of `callerLocation` (file URL, frames without a file).
- **Docs**: `internal/call-sites.md` *Steps at the test's line* (the rule holds only without a boxed ancestor; the
  `location`) and *Alternatives weighed* (the "computed location" alternative was rejected on a premise this finding
  disproves); `api/step.md` and `docs/test-steps.md` unchanged in substance; AGENTS.md §5 (the `@step` bullet's
  description of the mechanism).
- **Changeset**: patch. "A boxed `@step` method and the navigation and session storage steps are reported at the line
  that called them inside another boxed step too; before, they pointed into POMWright's bundle."
- **Decisions to tick**:
  - [x] Pass a computed `location` (option 1), reversing the *Alternatives weighed* entry, or document the limitation
        (option 2): **option 1**; the entry on *Internal → Call sites* is rewritten with the reason (the rule "one
        `async` POMWright frame" holds only without a boxed ancestor).
  - [x] Apply the same to the navigation and session storage helpers in the same change (coordinate with scopes A and D):
        yes, through one `callerLocation(boundary)` in `src/helpers/callSite.ts`, done together with D-4's code option if
        it is chosen.
  - [x] Accept the deviation for a boxed method whose Promise is returned without `await` (a location where Playwright
        has none): yes, noted on *Internal → Call sites*.
  - [x] (added) Test gap #1: the nested cases above in `test/step-locations/stepLocations.spec.ts`, and the location
        reporter fails when a `// LOCATION` marker is never checked; a unit test of `callerLocation`.
  - [x] (added) The pending `.changeset/boxed-step-location.md` is amended to cover nested boxed steps and the two
        helpers, instead of a new changeset.
  - [x] (added) Docs: *Internal → Call sites* (the mechanism and *Alternatives weighed*), AGENTS.md §5's `@step` bullet.
- **Execution order**: independent of the logger findings; touches the same files as any scope A or D finding on step
  titles, so after those.
