# D-4: A page object's failed check points the report at the first `super(...)` of its class chain, which with the documented site base class is the same base-class line for every page object, not "the line that created the page object"

- **Kind**: documentation
- **Area**: page object lifecycle, the scheduled check's call site (`src/pageObject.ts`, `src/helpers/callSite.ts`)
- **Severity**: Low (the label still names the page object and the construction site is further down the stack; the
  report's code frame, the part a reader sees first, shows a line that identifies neither)
- **Semver of the fix**: none for the docs; patch if the boundary changes (option 2), since only the stack's first
  frames change
- **Reviewed**: `54cdada`, 2026-10-23, Claude (scope D)
- **Status**: decided: fix, option 2 (2026-10-26, [DECISIONS.md #37](../DECISIONS.md))
- **Merged with**: H-9 (see report.md)

## Contract

- `website/src/content/docs/internal/page-object-lifecycle.md`, *Sticky, labelled failures*: "When the scheduled check
  finds the error, it throws it with the stack of the construction site, so the report points at the line that created
  the page object, not at the microtask."
- `docs/page-objects.md`, *How a mistake is reported*, and `api/errors.md`, *Page objects → Locators*: "the line that
  constructed the page object in the stack" (holds: it is a later frame).
- `docs/page-objects-in-tests.md`, *When a page object has a mistake*: "the line of `super(...)` in the stack" (holds,
  but with a base class it is the base class's `super(...)`).
- `docs/organising-a-project.md`, *A base class for your site*, teaches the layout in which this matters: every page
  object extends `ShopPage`, whose constructor calls `super(page, …, urlPath, …)`.
- AGENTS.md §5: "the construction site in the stack".

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/zz-probe-D-base/` (three files: `shop.base.ts`, a
base class as `organising-a-project.md` writes it; `orders.page.ts`, a page object with a misspelt `has` path;
`base.spec.ts`, a fixture that builds it with `await use(new OrdersPage(page));` on line 7):

```sh
cp -r ../POMWright-final-review-probes/D/zz-probe-D-base test/tests/zz-probe-D-base
pnpm -C test exec playwright test tests/zz-probe-D-base/base.spec.ts --project=chromium --reporter=line; echo "exit $?"
rm -r test/tests/zz-probe-D-base
```

## Observed / expected

Exit 1 (the test fails, as it should). The report:

```text
    Error: OrdersPage: Locator registry verification failed for 1 of 2 paths:
      "body.heading": No locator schema registered for path "body.headng".

       at zz-probe-D-base/shop.base.ts:7

       5 | export abstract class ShopPage<Paths extends string> extends PageObject<Paths> {
       6 | 	protected constructor(page: Page, urlPath: string, options?: PageObjectOptions) {
    >  7 | 		super(page, "http://localhost:9000", urlPath, options);
         | 		^
       8 | 	}
        at ShopPage (…/test/tests/zz-probe-D-base/shop.base.ts:7:3)
        at OrdersPage (…/test/tests/zz-probe-D-base/orders.page.ts:6:3)
        at Object.ordersPage (…/test/tests/zz-probe-D-base/base.spec.ts:7:13)
```

The report's code frame is `shop.base.ts:7`, the base class's `super(...)`, which every page object of the site shares;
the line that created the page object, `base.spec.ts:7`, is the third frame. Without a base class the code frame is the
page object's own `super(...)` (`test/tests/pageObject/callSite/callSite.spec.ts` asserts exactly that, "points at the
super() call in the consumer's pageObject.ts"). So the internal page's "the report points at the line that created the
page object" holds for neither layout. Expected: the docs say where the report points, or the report points where the
docs say.

A source sketch (`captureCallSite(new.target)` in place of `captureCallSite(PageObject)` at `src/pageObject.ts:328`,
then `pnpm harness:install`, then restored) makes the same probe's code frame the construction site:

```text
       5 | const test = base.extend<{ ordersPage: OrdersPage }>({
       6 | 	ordersPage: async ({ page }, use) => {
    >  7 | 		await use(new OrdersPage(page)); // the line that created the page object
         | 		          ^
        at Object.ordersPage (…/test/tests/zz-probe-D-base/base.spec.ts:7:13)
```

With the sketch, `src/pageObject.test.ts` passed (48 tests) and the harness's `callSite.spec.ts` "points at the super()
call in the consumer's pageObject.ts" failed, as expected for a changed design (its first frame became
`callSite.spec.ts:22`).

## Cause

`src/pageObject.ts:328`: `captureCallSite(PageObject)` cuts the stack at `PageObject`'s own frame, so the frames of
every subclass constructor between `PageObject` and the `new` expression stay on top.

## Fix plan

- **Intended contract**: one of: (a) the docs say the report points at the first `super(...)` of the class chain (the
  page object's own, or its base class's), with the construction site below it; or (b) the report points at the
  construction site, the `new` expression, as the internal page says.
- **Options**:
  1. **Recommended if the current design stays**: docs only. `internal/page-object-lifecycle.md` and
     `docs/page-objects-in-tests.md` say "the first `super(...)` of the class chain, and the line that created the page
     object below it". None.
  2. `captureCallSite(new.target)`: the code frame is the `new` expression in every layout, which is where a fixture
     or test chooses the page object; the class's own `super(...)` frames leave the stack (the label still names the
     class). Patch. It changes `callSite.spec.ts` (move the consumer's `new` into the file named `pageObject.ts`, so the
     file-name guard keeps its point), `internal/call-sites.md` (the boundary for the page object is the class the
     code constructed), AGENTS.md §5's sentence on call sites if it names `PageObject`, and the unit test's
     `firstFrame` assertion if it relied on the subclass frame (it did not: 48 passed).
- **Implementation steps**: option 1, the two pages; option 2, `src/pageObject.ts:328`, the spec and the pages above.
- **Tests**: option 2: in `test/tests/pageObject/callSite/`, a page object that extends a consumer base class, asserting
  the first frame is the `new` line; keep the file-name case.
- **Docs**: `internal/page-object-lifecycle.md` (*Sticky, labelled failures*), `docs/page-objects-in-tests.md`
  (*When a page object has a mistake*), `internal/call-sites.md` (option 2).
- **Changeset**: option 2 only, patch: "A page object's failed locator check points the report at the line that
  created the page object, also when it extends a base class of your own."
- **Decisions to tick**:
  - [x] Keep the `super(...)` site and correct the docs (option 1), or move the site to the `new` expression (option 2):
    **option 2**, with harness tests of every kind of mistake and a frame-budget test ([DECISIONS.md #37](../DECISIONS.md))
- **Execution order**: independent; touches the same pages as none of the other D findings.
