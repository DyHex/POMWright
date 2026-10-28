# 2E-2: The pages say a `@step` step is reported at the line that called the method, boxed or not; where the call is not awaited on its own line, it is not

- **Kind**: documentation
- **Area**: E25 where a step is reported (inventory-blind.md); `api/step.md` *Arguments*, `docs/test-steps.md`
- **Severity**: Low (a statement that does not hold in some call shapes: a step one or two lines off, or with no line,
  in the report; behavior is otherwise right and, unboxed, the same as Playwright's own `test.step`)
- **Semver of the fix**: none (docs only); the alternative that changes placement is a patch at most (see *Fix plan*)
- **Pass**: 1
- **First review**: new since 54cdada (`f8ca42a` wrote "the step is reported at the calling line either way" into
  `api/step.md`, the wording of decision #42 for E-3; `b19de77` made a boxed step's location the synchronous caller,
  decision #12.3). The unboxed half was known to the first review (`steps/native.out`) and left open as its test gap 7,
  which `PLAN-release-gates-and-audit.md` hands to this review
- **Reviewed**: `d850405`, 2026-10-28T16:54:53+01:00, Opus 5.5, second review, segment 2E

## Contract

- `website/src/content/docs/api/step.md:64-65`: "`box` (an error inside the method points at the line that called it,
  not at the line inside the method; the step is reported at the calling line either way)".
- `website/src/content/docs/docs/test-steps.md:36`: "The report shows `LoginPage.submit` as a step, with the click
  inside it, at the line that called `submit()`." Same page, lines 55 and 102 (`@step({ box: true })`): "an error
  inside points at the line that called confirm()", "reported at the line that called confirm()".
- `website/src/content/docs/internal/call-sites.md` *Steps at the test's line* explains the mechanism (Playwright's
  async stack for an unboxed step, a computed `location` for a boxed one), and *Alternatives weighed* accepts that a
  boxed method whose Promise a helper returns is shown at the helper's line. Neither user page says either.

## Reproduction

The probe `E/locations/zz-probe-E-loc.spec.ts` and the reporter `E/locations/printReporter.ts` (prints each
`test.step` with its reported location and each error with its location), both in
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/`. From the worktree root:

```sh
cp /home/magdys/workspace/dyhex/POMWright-second-review-probes/E/locations/zz-probe-E-loc.spec.ts test/tests/
pnpm -C test exec playwright test tests/zz-probe-E-loc.spec.ts --project=chromium --workers=1 \
  --reporter=line,/home/magdys/workspace/dyhex/POMWright-second-review-probes/E/locations/printReporter.ts
rm test/tests/zz-probe-E-loc.spec.ts
```

Exit 0 (the two failing tests are `test.fail()`); full output in `E/locations/run2.txt`. The relevant parts of the
spec (`Widget` has `@step() async plain()` and `@step("boxed", { box: true }) async boxed()`):

```ts
9:  function timed<T extends (...args: any[]) => any>(value: T, _context: ClassMethodDecoratorContext): T {
10:   return function (this: unknown, ...args: unknown[]) {
11:     return value.apply(this, args);        // a plain wrapping decorator, as a timing or retry decorator is
12:   } as T;
53:   helperSync() {
54:     return this.boxed();                   // a non-async helper that returns the Promise
65:   @timed
66:   @step("boxed-throws-under-plain-decorator", { box: true })
67:   async boxedThrowsUnderDecorator() { throw new Error("boxed-throws-under-plain-decorator"); }
123:  const pending = widget.plain();          // called here
125:  await pending;                           // awaited here
130:  await Promise.all([
131:    widget.plain(),
132:    widget.boxed(),
138:  await widget.helperSync();
148:  await new Widget().boxedThrowsUnderDecorator();
```

The control `E/locations/zz-probe-E-pwcontrol.spec.ts` (same command; output `E/locations/pwcontrol.txt`, exit 0) runs
Playwright's own `test.step` in the first two shapes.

## Observed / expected

```text
STEP [an unboxed step awaited on a later line] test.step "Widget.plain" @ no location
STEP [multi-line Promise.all] test.step "Widget.plain" @ zz-probe-E-loc.spec.ts:130
STEP [multi-line Promise.all] test.step "boxed" @ zz-probe-E-loc.spec.ts:132
STEP [non-async helpers that return the Promise] test.step "boxed" @ zz-probe-E-loc.spec.ts:54
STEP [a plain decorator above a boxed @step that throws] test.step "boxed-throws-under-plain-decorator" @ zz-probe-E-loc.spec.ts:11 ERROR @ zz-probe-E-loc.spec.ts:148
```

Control, Playwright's own `test.step`:

```text
test.step "later" @ no location                    (called on line 7, awaited on line 9)
test.step "in-all" @ zz-probe-E-pwcontrol.spec.ts:10   (called on line 11, inside `await Promise.all([` on line 10)
```

So:

- an **unboxed** step is reported where its caller *awaits* it, exactly as Playwright places a `test.step`: with no
  line when the Promise is awaited later, and at the `await Promise.all([` line (130), not the call (131), in a
  multi-line `Promise.all`;
- a **boxed** step is reported at the *synchronous* caller (`callerLocation`): through a non-async helper or a plain
  wrapping decorator, that function's line (54; 11, inside the decorator), while its **error** is placed by Playwright
  at the awaiting caller (148): the step and its error point at different lines.

The pages state one rule for both ("the step is reported at the calling line either way"). Expected: the pages say
where each is placed, or the behavior matches the statement.

## Cause

Not a code fault: the unboxed wrapper leaves placement to Playwright, which takes the first frame of the async stack
after an internal `await` (`playwright/lib/common/index.js:2406-2411`, `_step` → `_addStep`), and the boxed wrapper
passes `callerLocation(boxed)`, the first frame of the synchronous stack below the wrapper
(`src/helpers/stepDecorator.ts:126`, `src/helpers/callSite.ts:76`), while Playwright still builds a boxed error's stack
from the async stack (`workerProcessEntry.js:996-1000`, `boxedStack`).

## Fix plan

- **Intended contract**: the user pages say where a step and its error are placed, in the shapes a test meets.
- **Options**:
  1. *(recommended)* Docs only. `api/step.md` *Arguments* `options`: "`box`: an error inside the method points at the
     line that called it, not inside the method." Then one paragraph in `docs/test-steps.md` after the first example:
     a step is shown where the method is called and awaited, as Playwright shows a `test.step`; a Promise awaited later
     has no line (as for `test.step`), and in a `Promise.all` an unboxed step is shown at the `await`, a boxed one at
     its own line; a boxed method called through a function that returns its Promise without awaiting it (a helper, a
     wrapping decorator) is shown at that function's line, its error at the line that awaits. Cost: a paragraph.
  2. Give every `@step` a computed `location` (`callerLocation` in the unboxed wrapper too), so a step is always at
     its call. Behavior change to report placement only (patch); one stack capture per unboxed call; departs from
     "mirror Playwright" for unboxed steps. A design question; not recommended without a decision.
- **Implementation**: option 1 touches no code.
- **Tests**: none required for option 1; option 2 would add `// LOCATION` marks for the later-await and multi-line
  `Promise.all` shapes to `test/step-locations/stepLocations.spec.ts`.
- **Docs**: `api/step.md` (*Arguments*), `docs/test-steps.md` (after the first example, and the comments on lines 55
  and 102 may stay); `internal/call-sites.md` *Alternatives weighed* can add that the boxed error stays at the awaiting
  line.
- **Changeset**: none for option 1.
- **Decisions to tick**: whether option 2 is wanted (no).
- **Relation**: the navigation helpers' page (`docs/urls-and-navigation.md:109-110`, "shown at the line that called
  it") makes the same claim for `goto` and the `expect*` methods, which use the same `callerLocation` (2D's area).
