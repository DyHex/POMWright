# Reviewing and refactoring

How to review a Playwright project that uses POMWright, and refactor it toward the shape the other guides describe,
without changing what its tests check.

## Contents

- [The order of a review](#the-order-of-a-review)
- [What good looks like, area by area](#what-good-looks-like-area-by-area)
- [Reporting](#reporting)
- [Refactoring safely](#refactoring-safely)

## The order of a review

1. **The version**: `node_modules/pomwright/package.json`. A 2.x project is an upgrade first
   (`guides/upgrading-from-2x.md`).
2. **The map**: the Playwright config, the env module, each app's base class, the fixtures files and how they merge,
   the locator modules and page objects, the test data, the specs. Note the project's own conventions (file names,
   aliases, path style): where the docs leave a choice and the project made one consistently, keep it.
3. **Each area** below, against the guide it names.
4. **The report**, then the refactoring the maintainers choose.

## What good looks like, area by area

| area | good | guide |
| --- | --- | --- |
| structure | each app has a base class with its origin from the environment; imports flow tests -> fixtures -> page objects -> locator modules; nothing imports the Playwright config or the fixtures from a page object | `guides/project-structure.md` |
| fixtures | one `test` every spec imports, merged from fixture files that extend POMWright's `test`; a fixture body is one line that builds a page object; no hand-written copy of the `log` fixture | `guides/fixtures-and-test-data.md` |
| test data | one read-only `testData` fixture by app, page and case; page objects take data as arguments | `guides/fixtures-and-test-data.md` |
| page objects | constructors take the page (and a logger only when they log); `defineLocators()` registers synchronously; locators resolved in getters or methods; actions and checks are `@step()` methods named in the user's words, one options object for two or more parameters; "loaded" defined in `pageActionsToPerformAfterNavigation()` | `guides/writing-page-objects.md` |
| locators | Playwright's order of preference, accessible names given; test ids and ids where nothing user-facing identifies an element; CSS for the segments the app gives nothing else | `guides/choosing-locators-and-paths.md` |
| paths | `kind@which` names, plural for several matches, the segments a user would recognize and no more; shared parts named one way across the project | `guides/choosing-locators-and-paths.md` |
| resolution | `getNestedLocator` for what tests act on; `getLocator` only inside filters or for whole-page counts; no `await` on a resolution | `references/resolving-and-queries.md` |
| variations | one-use variations as queries (a row by its text, a card by its heading), not extra registrations or hand-built chains | `references/resolving-and-queries.md` |
| modules | shared parts as composed modules with the overload; common locators registered by the base class; sharing by reuse of a path | `guides/locator-modules.md` |
| specs | read as steps on page objects; web-first assertions; no sleeps, no `networkidle`; random overlays handled by `page.addLocatorHandler()`, predictable ones by a step or a precondition | `guides/writing-tests.md` |
| session storage | a schema declared once, as a value with its type; `seed` awaited before the navigation, never in a fixture some tests do not use | `references/session-storage.md` |

## Reporting

For each finding: the file and line, what good looks like for it, the rewrite (a short before-and-after), and what the
change would touch. Group findings by area, most valuable first: a structural change (imports, fixtures, test data)
pays off across every test, a locator change across every test of one page. Say what is already sound. A choice the
docs leave open and the project made consistently is not a finding.

A rewrite, shown as the right way to do it:

```ts
import type { LocatorRegistry } from "pomwright";

type Paths = "main" | "main.table@orders" | "main.table@orders.row" | "main.table@orders.row.button@cancel";
declare const registry: LocatorRegistry<Paths>;

// one row found by its text, then the button inside it, as one query of the button's path
const cancel = registry
  .getLocatorSchema("main.table@orders.row.button@cancel")
  .filter("main.table@orders.row", { hasText: "ORD-1042" })
  .getNestedLocator();
```

## Refactoring safely

- **One kind of change per step**, each a commit of its own: move files, then rename paths, then change locators, then
  move logic from specs into page objects. A refactor keeps what every test checks.
- **Compile and run after each step**: `npx tsc --noEmit`, then the tests the step touches on one browser, then the
  suite. A registry mistake fails the page object's fixture, naming every path at fault.
- **Paths**: rename with the find-and-replace patterns of `references/paths-and-registry.md`; once the `Paths` union
  changes, every leftover use is a compile error.
- **Locators**: change one registration and every chain through it follows; check the new one finds exactly one element
  where the test acts on one.
- **Logic out of specs**: a sequence several specs repeat becomes a `@step()` method; an assertion several specs repeat
  becomes an `expect…` method; the specs then call them.
