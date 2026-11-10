# Reviewing and refactoring

How to review a Playwright project that uses POMWright, and refactor it toward what the other guides describe, in the
shape of page code the project chose, without changing what its tests check.

## Contents

- [The order of a review](#the-order-of-a-review)
- [What good looks like, area by area](#what-good-looks-like-area-by-area)
- [Reporting](#reporting)
- [Refactoring safely](#refactoring-safely)

## The order of a review

1. **The version**: `node_modules/pomwright/package.json`. A 2.x project is an upgrade first
   (`guides/upgrading-from-2x.md`).
2. **The decisions**: the project's `POMWRIGHT.md`. Without one, writing it comes first (`guides/project-decisions.md`):
   the maintainers confirm what the code does for each decision, or choose. The review then measures the code against
   the file, not against this skill's defaults.
3. **The map**: the Playwright config, the env module, each app's base class, the fixtures files and how they merge,
   the locator modules and the page code, the test data, the specs.
4. **Each area** below, against the guide it names and the project's decisions.
5. **The report**, then the refactoring the maintainers choose.

## What good looks like, area by area

| area | good | guide |
| --- | --- | --- |
| structure | each app's origin comes from the environment, in one place; imports flow tests -> fixtures -> page code -> locator modules; no page code imports the fixtures | `guides/project-structure.md` |
| fixtures | one `test` every spec imports, merged from fixture files that extend POMWright's `test`; a fixture body builds what it hands the test and nothing else; no hand-written copy of the `log` fixture | `guides/fixtures-and-test-data.md` |
| test data | one read-only `testData` fixture by app, page and case; page code takes data as arguments | `guides/fixtures-and-test-data.md` |
| page code | constructors take the page (and a logger only when they log); a `PageObject`'s `defineLocators()` registers synchronously and its "loaded" is defined in `pageActionsToPerformAfterNavigation()`; a registry created by hand is checked with `registry.verify()`; locators resolved in getters, methods or functions; actions and checks are report steps named in the user's words, one options object for two or more parameters | `guides/writing-page-objects.md`, `guides/choosing-a-shape.md` |
| locators | the order of preference, accessible names given, a locator that matches several narrowed by its options and `filter()` before a lower one is used; test ids, then ids, where nothing user-facing identifies an element; CSS for the segments the app gives nothing else; no XPath | `guides/choosing-locators-and-paths.md` |
| paths | `kind@which` names, plural for several matches, the segments a user would recognize and no more; shared parts named one way across the project | `guides/choosing-locators-and-paths.md` |
| resolution | `getNestedLocator` for what tests act on; `getLocator` only inside filters or for whole-page counts; no `await` on a resolution | `references/resolving-and-queries.md` |
| variations | one-use variations as queries (a row by its text, a card by its heading), not extra registrations or hand-built chains | `references/resolving-and-queries.md` |
| modules | shared parts as composed modules with the overload; common locators registered by the base class; sharing by reuse of a path | `guides/locator-modules.md` |
| specs | read as steps on the page code; web-first assertions; no sleeps, no `networkidle`; random overlays handled by `page.addLocatorHandler()`, predictable ones by a step or a precondition | `guides/writing-tests.md` |
| session storage | a schema declared once, as a value with its type; `seed` awaited before the navigation, never in a fixture some tests do not use | `references/session-storage.md` |

## Reporting

For each finding: the file and line, what good looks like for it, the rewrite (a short before-and-after), and what the
change would touch. Group findings by area, most valuable first: a structural change (imports, fixtures, test data)
pays off across every test, a locator change across every test of one page. Say what is already sound. Code that
follows a decision in `POMWRIGHT.md` is not a finding; code that departs from one is, and so is a decision the code
shows the project has outgrown, raised as a question.

A rewrite, shown as the right way to do it:

```ts
import type { LocatorRegistry } from "pomwright";

type Paths = "main" | "main.table@orders" | "main.table@orders.rows" | "main.table@orders.rows.button@cancel";
declare const registry: LocatorRegistry<Paths>;

// one row found by its text, then the button inside it, as one query of the button's path
const cancel = registry
  .getLocatorSchema("main.table@orders.rows.button@cancel")
  .filter("main.table@orders.rows", { hasText: "ORD-1042" })
  .getNestedLocator();
```

## Refactoring safely

- **One kind of change per step**, each a commit of its own: move files, then rename paths, then change locators, then
  move logic from specs into the page code. A refactor keeps what every test checks, and the project's shape unless
  the maintainers choose another.
- **Compile and run after each step**: `npx tsc --noEmit`, then the tests the step touches on one browser, then the
  suite. A registry mistake fails where the registry is checked: a page object's fixture, or the `registry.verify()`
  call, naming every path at fault.
- **Paths**: rename with the find-and-replace patterns of `references/paths-and-registry.md`; once the `Paths` union
  changes, every leftover use is a compile error.
- **Locators**: change one registration and every chain through it follows; check the new one finds exactly one element
  where the test acts on one.
- **Logic out of specs**: a sequence several specs repeat becomes a step, a `@step()` method or a function with
  `test.step`; an assertion several specs repeat becomes an `expect…` step; the specs then call them.
