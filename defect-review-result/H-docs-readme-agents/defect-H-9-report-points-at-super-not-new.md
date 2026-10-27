# H-9: The pages disagree on where a page object's registry error points: one says the `super(...)` line, four say the line that constructed or created the page object; the report shows the first `super(...)` in the consumer's code, which with a site base class is the base class's line for every page object

- **Kind**: documentation
- **Area**: one body: `docs/page-objects-in-tests.md`, `docs/page-objects.md`, `docs/verifying-registries.md`,
  `api/errors.md`, `internal/page-object-lifecycle.md` (inventory §8; the mechanism is scope D's)
- **Severity**: Low (the stack holds every frame and the message names the page object; but the report's code frame,
  with the base class *Organising a project* recommends, is the same line for every page object, and the Internal page
  says it is the line that created the page object)
- **Semver of the fix**: none for the recommended docs fix; patch for the code option
- **Reviewed**: `54cdada`, 2026-10-23, H reviewer
- **Status**: decided with D-4: the code option (2026-10-26, [DECISIONS.md #37](../DECISIONS.md))
- **Merged with**: D-4 (see report.md)

## Contract

AGENTS.md §5: "a registry mistake still fails the fixture, labelled `<label>: …` with the original as `cause` and the
construction site in the stack". AGENTS.md §9: one home per fact, stated the same everywhere.

What the pages say:

- `docs/page-objects-in-tests.md`, lines 110–112: "with the page object's name, every path that failed, and the line
  of `super(...)` in the stack."
- `docs/page-objects.md`, line 144: "and the line that constructed the page object in the stack".
- `docs/verifying-registries.md`, line 53: "at the line that constructed it."
- `api/errors.md`, lines 253–254: "with the line that constructed the page object in its stack".
- `internal/page-object-lifecycle.md`, lines 57–58: "it throws it with the stack of the construction site, so the
  report points at the line that created the page object, not at the microtask."

What the harness pins: `test/tests/pageObject/callSite/callSite.spec.ts`, test "points at the super() call in the
consumer's pageObject.ts": the first frame is the `super(...)` call.

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/H/callsite/` (`shop.page.ts`, the first base class of
*Organising a project* with the options forwarded; `login.page.ts`, a page object that filters by an unregistered
path; `zz-probe-H-callsite.spec.ts`, which creates it and reads the error). Copied to
`test/tests/zz-probe-H-callsite/` and run from the worktree root:

```sh
pnpm -C test exec playwright test tests/zz-probe-H-callsite/zz-probe-H-callsite.spec.ts --project=chromium --reporter=line
```

Exit 1 (the scheduled check fails the test, as designed). Output (`run.log` beside the probe):

```text
STACK<<Error: LoginPage: Locator registry verification failed for 1 of 2 paths:
  "main.form": No locator schema registered for path "main.form.heading".
    at new ShopPage (…/zz-probe-H-callsite/shop.page.ts:6:5)
    at new LoginPage (…/zz-probe-H-callsite/login.page.ts:6:5)
    at …/zz-probe-H-callsite/zz-probe-H-callsite.spec.ts:6:14>>
…
       at zz-probe-H-callsite/shop.page.ts:6

      4 | export abstract class ShopPage<Paths extends string> extends PageObject<Paths> {
      5 |   protected constructor(page: Page, urlPath: string, options?: PageObjectOptions) {
    > 6 |     super(page, "https://shop.example", urlPath, options); // SUPER-IN-BASE
```

The report's code frame is the base class's `super(...)`; the page object's own constructor and the line that
created it (`new LoginPage(page)`, `spec.ts:6`) are the second and third frames.

Cause in code: `src/pageObject.ts`, line 328, `captureCallSite(PageObject)`: V8 leaves out `PageObject`'s frame and
those above it, so the stack starts at the caller of `PageObject`'s constructor, the outermost `super(...)` in the
consumer's code.

## Observed / expected

Observed: five statements of one fact, in two versions; the report shows the first `super(...)` call in the consumer's
code: the page object's own, or, with a base class, the base class's (the same line for every page object of the
site).

Expected: one statement, the same on every page, that matches the report. Either the `super(...)` wording of *Page
objects in tests*, with the base class case said once on *Page objects* (the label names the page object; the line
that created it is further down the stack), or a stack that does start at the creating line (option below).

## Cause

The pages were written with a page object that extends `PageObject` directly, where "the line that constructed the
page object" can be read as its `super(...)` call; the base-class case and the *Internal* sentence's "the line that
created" were not checked against a probe.

## Fix plan

- **Intended contract**: decide which line the report points at, and say it the same way everywhere.
- **Options**:
  - (recommended) Docs: "the first frame in your code is the `super(...)` call that reached `PageObject`, the base
    class's when there is one; the line that created the page object follows it in the stack" on *Page objects*, *How
    a mistake is reported*, linked from the other four places, each shortened to "the construction site in the
    stack". Semver none.
  - Code: capture the site at `new.target` instead of `PageObject` (`captureCallSite(new.target)`), so V8 leaves out
    every constructor of the page object's class chain and the stack starts at the line with `new`, the fixture's,
    which differs per page object. Probed in plain Node
    (`/home/magdys/workspace/dyhex/POMWright-final-review-probes/H/callsite/newtarget.mjs`, three classes, a function
    that runs `new`): the captured stack starts at that function's `new` line. The callSite spec's expectation
    changes (first frame in the spec or fixture file), and *Internal → Call sites* says why. Patch (a better frame for
    the same error).
- **Implementation steps**: docs: the five pages above. Code option: `src/pageObject.ts` (the `captureCallSite` call),
  `test/tests/pageObject/callSite/callSite.spec.ts`, `website/src/content/docs/internal/call-sites.md`.
- **Tests**: code option: the callSite spec with a base class page object, expecting the `new` line.
- **Docs**: as above.
- **Changeset**: none (docs); patch for the code option ("A page object's registry error now points at the line that
  created the page object, also with a base class").
- **Decisions to tick**:
  - [x] which line the report points at: the `super(...)` (docs) or the `new` (code)
  - [x] one wording on the five pages
- **Execution order**: with scope D's findings on the page object lifecycle, if any touch the call site.

Decided with D-4 in [DECISIONS.md #37](../DECISIONS.md): the report points at the `new` line; every page says so.
