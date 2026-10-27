# Plan 16: boxed steps with a computed `location`; a page object's check points at `new`

- **Decisions**: [DECISIONS.md](DECISIONS.md) #12, #37
- **Findings**: [E-1](E-logging-step-fixture/defect-E-1-boxed-step-inside-boxed-step-located-in-bundle.md) (Medium; for
  `@step` a regression of `333a928`), [D-4](D-page-objects-urls-navigation/defect-D-4-check-points-at-base-super.md)
  with [H-9](H-docs-readme-agents/defect-H-9-report-points-at-super-not-new.md); test gap #1
- **Bump**: patch (the pending `boxed-step-location.md` amended; one new changeset)
- **Stop**: no
- **Depends on**: plan 14 (the same file, `stepDecorator.ts`); plan 9 (a path-rule mistake is thrown at `add`, which
  the frame-budget test uses)

## Contract

- A boxed `@step`, and every navigation and session storage helper, passes `test.step` an explicit `location`: the
  caller's frame, found by cutting the stack at POMWright's own function (`Error.captureStackTrace(holder, boundary)`,
  a boundary, never a file name), unless the caller passed `options.location`. Playwright then uses it whatever the
  ancestor steps are, so a boxed step inside a boxed step is reported at its calling line, not in the bundle; errors keep
  Playwright's boxed-error rule (the outermost boxed call site). The boxed `@step` wrapper stays `async` (it gives a
  top-level boxed error its stack). A boxed method whose Promise a helper returns without `await` now reports the
  helper's line where Playwright reports none (accepted).
- A page object's labelled check error points its code frame at the `new` expression that created the page object, in
  every layout (a site base class included), through `captureCallSite(new.target)`; the `[cause]:` block is unchanged.
- At most 4 frames of POMWright's bundle sit above the first consumer frame of a chain mistake or a path-rule mistake,
  so V8's 10-frame stack keeps the consumer's lines; a test fails when a change adds internal frames.

## Current behaviour

- `src/helpers/stepDecorator.ts:89-91`: the boxed wrapper relies on Playwright dropping one frame; Playwright's
  `_addStep` drops a step's first frame only when no ancestor step is boxed, so one fixed POMWright frame cannot be right
  both at the top level and inside a boxed step (`…-probes/E/steps/nested.out`). The navigation helpers
  (`src/helpers/navigation.ts:7`, `BOXED` at `:228-286`) and `SessionStorage.step` (`src/helpers/sessionStorage.ts:292`)
  rely on the same rule.
- `src/pageObject.ts:328` `captureCallSite(PageObject)` leaves every subclass constructor's frame on top, so with a site
  base class the code frame is the base class's `super(…)`, the same line for every page object
  (`…-probes/D/zz-probe-D-base/`; the walkthrough's `…-probes/R/walkthrough/d4/report.out`, `report-modules.out`).

## Steps

### Step 1: E-1 (one commit)

1. `src/helpers/callSite.ts`: `callerLocation(boundary)`, from scope E's sketch (`…-probes/E/steps/fix-sketch-E-1.py`):
   the first frame with a file below `boundary`, parsed from `(file:line:column)` or `file:line:column`, a `file://` URL
   converted with `fileURLToPath`, frames without a file skipped; `undefined` when none. Not filtered by file name
   (AGENTS.md §5).
2. `stepDecorator.ts`: the boxed wrapper is a named `async` function that passes `{ ...options, location:
   options.location ?? callerLocation(boxed) }`; the unboxed wrapper unchanged. The comment above `createWrappedMethod`
   rewritten (the location is passed, why the wrapper stays `async`).
3. `navigation.ts` and `sessionStorage.ts`: each public method computes `callerLocation(<the method itself>)` at its
   start (for example `SessionStorage.prototype.set`, as `seed` already captures its site) and passes it to its
   `test.step(…, { box: true, location })`; `BOXED` becomes a function or the options are built per call. The comments
   that explain the one-frame rule (`sessionStorage.ts:285-290`) rewritten.
4. **Tests**:
   - `test/step-locations/stepLocations.spec.ts`: a boxed `@step` calling a boxed `@step`; a boxed `@step` calling
     `navigation.goto()` and `sessionStorage.set()`; both inside a test's own boxed `test.step`; an error in a nested
     boxed step (keeps the outer call site); each marked `// LOCATION <id>`.
   - `test/step-locations/locationReporter.ts`: fails when a `// LOCATION` marker is never checked (today a probe that
     stops reporting stays green).
   - A unit test of `callerLocation` (`src/helpers/callSite.test.ts`): a plain path, a `file://` URL, a frame without a
     file, a boundary not on the stack.
5. **Docs**: *Internal → Call sites*, *Steps at the test's line* (the one-frame rule holds only without a boxed
   ancestor; POMWright passes the location) and *Alternatives weighed* (the "computed location" entry rewritten, its
   premise disproved; the unawaited-return case noted); AGENTS.md §5's `@step` and helper bullet (the location is
   computed; the `async` frame rule no longer carries the location).
6. **Changeset**: amend `.changeset/boxed-step-location.md` to cover nested boxed steps and the navigation and session
   storage helpers (no new changeset).

### Step 2: D-4 (one commit)

1. `src/pageObject.ts:328`: `captureCallSite(new.target)`; the comment says the boundary is the class the code
   constructed.
2. **Tests**: a harness spec in `test/tests/pageObject/callSite/` against the packed package, with V8's default
   `Error.stackTraceLimit` (asserted to be 10), each error caught synchronously after `new` (AGENTS.md §3), asserting on
   `error.stack` and `error.cause.stack`:
   - an `add` mistake directly in `defineLocators()`: first frame the `new` line; the cause has the `add` line;
   - the same with a site base class: first frame the `new` line, not the base class's `super(…)`;
   - `add` lines in a locator module: the cause has the module's `add` line and the page object's call line;
   - composed modules, two levels: the cause has the `add` line, the composing call and the page object's call line;
   - a path-rule mistake in a module (thrown at `add`, plan 9): the cause has that `add` line;
   - a mistake only `verify()` finds: first frame the `new` line; the message names both paths;
   - a standalone registry: an `add` mistake's first frame is the `add` line; a verify-only mistake's the `verify()` line;
   - the frame budget: at most 4 frames of POMWright's bundle above the first consumer frame, for a chain mistake and a
     path-rule mistake, failing with "a change added internal frames that push consumer lines out of the 10-frame
     stack".
   The existing file-name case keeps its point (the consumer's `new` in a file named `pageObject.ts`).
3. **Docs**: *Page objects in tests*, *When a page object has a mistake*: "the line that created the page object", as
   *Page objects*, *Verifying registries*, `api/errors.md` and *Internal → Page object lifecycle* say; *Internal → Call
   sites*: the page object's boundary is the class the code constructed, and why the frame budget is tested; AGENTS.md §5
   if its call-site sentence names `PageObject` as the boundary.
4. **Changeset** `page-object-check-at-new.md` (`patch`): "A page object's failed locator check points the report at the
   line that created the page object, also when it extends a base class of your own."

## Verify

The standard checks (PLANS.md, rule 5) after each step; the step-location check runs in `pnpm pack-test`
(`playwright.steps.config.ts`); `pnpm docs:build`.

## Commit

```text
fix: boxed steps pass their caller's location, so nesting cannot move them

Playwright drops a step's first frame only when no ancestor step is boxed,
so one fixed frame could not be right both at the top level and inside a
boxed step: a boxed @step or helper inside a boxed step was reported in
POMWright's bundle. Boxed @step methods and the navigation and session
storage helpers now pass test.step the caller's frame as its location. The
step-location reporter fails when a marked call is never checked.

Plan: defect-review-result/PLAN-E-1-D-4-call-sites.md (step 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

```text
fix: a page object's failed check points at the line that created it

Plan: defect-review-result/PLAN-E-1-D-4-call-sites.md (step 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27.

**Step 1 (E-1).**

- Playwright 1.64 read first (`playwright/lib/common/index.js` `_step`, `lib/worker/workerProcessEntry.js` `_addStep`):
  `test.step` awaits once before `_addStep`, so only the async stack is left; a given `location` becomes the step's
  stack whatever the ancestors are; a boxed step's error stack is the raw stack after its first frame at the top level,
  and the outermost boxed ancestor's inside one. So the location is passed, and the one-`async`-frame structure stays
  for the error stacks.
- `src/helpers/callSite.ts`: `frameLocation(frame)` (a named frame read inside its first parenthesis, so a path with
  spaces or parentheses stays whole; a frame without a name; `file://` through `fileURLToPath`; `native`,
  `<anonymous>`, `index 0` and `eval` frames skipped), `siteLocation(site)` (the first frame with a file of a captured
  site) and `callerLocation(boundary)` = `siteLocation(captureCallSite(boundary))`; a boundary not on the stack gives
  `undefined` (V8 then captures no frame, checked).
- `stepDecorator.ts`: the boxed wrapper is a named `async` function passing `{ ...options, location: options.location ??
  callerLocation(boxed) }`; its comment rewritten. `navigation.ts`: `BOXED` became `boxedAt(location)`, each method
  taking `callerLocation(Navigation.prototype.<method>)` at its start. `sessionStorage.ts`: `step(method, location,
  body)`, `set`, `get` and `clear` taking `callerLocation(SessionStorage.prototype.<method>)`, `seed` the location of the
  site it captures already (`siteLocation(site)`); the helper's comment rewritten (the error stack is why it is not
  `async`).
- Tests: `test/step-locations/stepLocations.spec.ts`, a boxed `@step` in a boxed `@step`, a boxed `@step` calling `goto`
  and `set`, the same under a test's own boxed `test.step` (methods of their own, since a step's id is its method's
  title; the test's own step is not marked, Playwright places it), and an error in a nested boxed step at the
  outermost boxed call; 20 locations checked. Against the old helpers the same spec reports 9 wrong, every nested step
  in `index.js` (checked by stashing the three helpers). `locationReporter.ts` fails when a marked line is never
  reported (checked with a stray marker: `"orphan" at stepLocations.spec.ts:132: no step or error with this id was
  reported`). Unit: `callSite.test.ts`, `frameLocation` (named, bare, async, spaces and parentheses, `file://`, four
  frames without a file) and `callerLocation` (the calling line; `undefined` off the stack). Two unit tests that pinned
  the step options as exactly `{ box: true }` (`stepDecorator.test.ts`, `stepLocations.test.ts`) now expect the
  location in the calling test file; a new case keeps a `location` the caller passes.
- Docs: *Internal → Call sites*, *Steps at the test's line* (the one-frame rule holds only without a boxed ancestor;
  the location; what still needs one `async` frame) and *Alternatives weighed* (the `{ box: true }`-alone entry, its
  premise disproved; the unawaited-return case); AGENTS.md §5's step bullet. `.changeset/boxed-step-location.md`
  amended.
- Checks: `pnpm lint` 0; `pnpm test:unit` 842 passed; `pnpm pack-test --reporter=line` exit 0 (1,524 passed, 3
  skipped; doc snippets 221; api coverage 0 problems; step locations 20, 8 probe tests); `pnpm docs:build` 0.

**Step 2 (D-4).**

- `src/pageObject.ts`: `captureCallSite(new.target)`, with a comment that the site starts at the `new` line, not at a
  base class's `super(…)`.
- **Deviation: V8's 10-frame default does not hold inside Playwright's runner.** The plan's spec asserted
  `Error.stackTraceLimit` to be 10; in the harness it is 200: Playwright sets it when it installs source-map support
  (`playwright/lib/common/index.js` and `lib/transform/esmLoader.js`, `installSourceMapSupport`), so in a consumer's
  Playwright run no consumer line is pushed out of an error's stack. Plain Node keeps 10 (`node -p
  Error.stackTraceLimit`). The budget tests stay, measured with the limit set to 10 for the measurement (the case of a
  Node script or another runner), and the assertion of 10 is gone; *Internal → Call sites* gives that reason instead of
  the decision's. Decision 37's premise ("V8 keeps 10 frames") holds only outside the runner.
- Tests: `test/tests/pageObject/callSite/checkSite.spec.ts` (packed package) with `checkSite.pages.ts` and
  `checkSite.locators.ts`, each line looked for marked `// SITE <id>`; a page object's scheduled check is captured
  around `new` (a stand-in `queueMicrotask`, as `src/pageObject.test.ts` does) and run at once, so its error is caught
  synchronously after `new`. Cases as planned: an `add` mistake in `defineLocators()` (first frame the `new` line, the
  `add` line in the cause); a project base class (the `new` line, the base class's `super(…)` nowhere in the stack); a
  locator module (the module's `add` line, then the page object's call); composed modules (the `add` line, the
  composing call, the page object's call; the module uses the documented `ExternalPaths` overload); a path-rule mistake
  in a module (the message, that `add` line); a verify-only mistake (the `new` line; the message names `"main.list"`
  and `"mian"`); a standalone registry (the `add` line; the `verify()` line); the frame budget, at most 4 bundle frames
  above the first consumer frame for a chain and a path-rule mistake. With the old boundary (`captureCallSite(PageObject)`)
  the 6 page-object cases fail (checked, then restored). `callSite.spec.ts`'s file-name case keeps its point: the
  consumer's `new` is now in `callSite/pageObject.ts` (`openBrokenPage`), and the test is titled "points at the new in
  the consumer's pageObject.ts".
- Docs: *Page objects in tests*, *When a page object has a mistake* ("the line that created the page object, the
  fixture's `new`"); *Internal → Page object lifecycle* (cut at `new.target`, not a shared base class's `super(…)`);
  *Internal → Call sites* (the boundary is the class the code constructed and why; the `cause`'s lines; the frame
  budget and the runner's limit). *Page objects*, *Verifying registries* and `api/errors.md` already said the line that
  created the page object. AGENTS.md: §2's `callSite.ts` entry (`new.target`; `callerLocation`), §4's `callSite/` entry
  and the spec count (57 files, about 8,700 lines; it had stayed at 55 since before plan 1), §5's page-object bullet
  (the `new` line). Changeset `page-object-check-at-new.md`.
- Checks: `pnpm lint` 0; `pnpm test:unit` 842 passed; `pnpm pack-test --reporter=line` exit 0 (1,554 passed, 3
  skipped: the 10 new tests on three browsers; doc snippets 221; api coverage 0 problems; step locations 20);
  `pnpm docs:build` 0.

**After the stop (2026-10-27).** At the maintainer's decision, the two frame-budget tests and the stack-limit setup
are removed (decision 37 revised): inside Playwright's runner the limit is 200 whenever a config or test file loads
(`installSourceMapSupport`, through `requireOrImport`), so internal frames cannot push a consumer's line out; the count
of 4 would fail on harmless refactors; the spec's assertions on the `cause`'s lines already fail if consumer lines go
missing. Asserting 200 instead was considered and not adopted (it tests Playwright's choice). Every other assertion of
`checkSite.spec.ts` stays. *Internal → Call sites*: the budget paragraph replaced by one sentence on what the spec checks,
and the budget listed under *Alternatives weighed*; AGENTS.md §4's `callSite/` entry. Checks: `pnpm lint` 0; `pnpm pack-test --reporter=line` exit 0
(1,548 passed, 3 skipped: the two budget tests gone on three browsers; step locations 20); `pnpm docs:build` 0.
