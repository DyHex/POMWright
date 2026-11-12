# PLAN-2B-CHOICES: the user's choices the skills made for them

Status: **done 2026-11-10 (9fd291d)**, from the maintainer's two corrections after PLANs 1 to 5, before PLAN-6 measures the
skills. Decisions it applies: S1, S2, C1 to C8; it amends PLAN-2 (core), PLAN-3 (map-site) and PLAN-4 (teach).

## The corrections

1. **`baseURL`** (maintainer, 2026-11-10): Playwright's `baseURL` still works with POMWright. With one origin, the
   page objects' base class can use the same value; or the config sets none, and page objects take their origins from
   the environment, for one origin or several. The skills said "no baseURL" (the template config, the structure
   guide), and `SKILL.md`'s table put `baseURL` opposite `SessionStorage`, which says nothing.
2. **The shape** (maintainer, 2026-11-10): the user decides whether to use `PageObject`, or the `LocatorRegistry`
   directly in their own page object classes, or a functional or a fixture approach. They do not have to use
   `PageObject`. The README's *The parts on their own* says the same: "Use as much of it as you need". The skills
   assumed `PageObject` subclasses: rules 5, 6, 8 and 11 of `SKILL.md`, the reviewing guide ("move logic from specs
   into page objects"), map-site's generation step.

## What changes

- `SKILL.md`: the table pairs each Playwright feature with what POMWright adds on it (or nothing); a section, *The
  user's choices*: the shape (`PageObject`, own classes, functions, fixtures; in an existing project follow its shape,
  in a new one ask) and `baseURL` (one origin: the same value; several: each base its own, `baseURL` optional). Rules
  5, 6, 8 and 11 hold for every shape. The complete example stays `PageObject`, named as one shape.
- A guide, `guides/choosing-a-shape.md`: one locator module, then the same page as an own class, as functions and as a
  fixture, each compiled; what each shape writes itself (`registry.verify()`, navigation with `page.goto` and
  `page.waitForURL`, `test.step` in functions).
- `references/navigation.md`, `guides/project-structure.md`, the template `playwright.config.ts`: `baseURL` from
  `env.ts` for the template's one app, with when to leave it out.
- `guides/reviewing.md`: a review keeps the project's shape; the refactoring steps name each shape.
- map-site: generate in the project's shape, or the one the user picks; the locator modules are the same for all.
- teach: a curriculum unit for the other shapes.

## Claims to probe (practice shop, the packed build, three browsers, parallel workers)

- With `use.baseURL` and the base class from the same `env.ts` value: `page.goto("/products")` lands where the page
  object's `expectThisPage()` passes; `expect(page).toHaveURL("/products")` passes after `navigation.goto()`; the
  `request` fixture's `get("/products")` reaches the page object's `fullUrl`. Control: with `baseURL` unset,
  `page.goto("/products")` throws.
- An own class with `createRegistryWithAccessors`, a locator module, `registry.verify()` and `@step()` methods; a
  function over the registry with `test.step`; a fixture that hands tests the accessors: each adds the "Lamp" (not the
  "Desk lamp") to the cart, and the step titles appear in the report.

## Execution notes

- **Probe** (`probes/choices/`; the practice shop on port 4174, the packed build 3.0.2, chromium, firefox and webkit,
  parallel workers, `--repeat-each 3`): 57 of 57 passed. With `use.baseURL` and the page object's origin from one
  `env.ts` value, `page.goto("/products")` lands where `expectThisPage()` passes and `page.url()` is `fullUrl`;
  `toHaveURL("/products")` passes after `navigation.goto()`; `request.get("/products").url()` is `fullUrl`. Control (a
  project whose `use` has no `baseURL`): `page.goto("/products")` throws `Cannot navigate to invalid URL`, and the page
  object's `navigation.goto()` still works. The own class (`createRegistryWithAccessors`, `registry.verify()`,
  `@step()`, titled `ProductsPage.goto`), the functions (`test.step`) and the fixture (accessors handed to the test)
  each add the "Lamp" and not the "Desk lamp", the cart in session storage holding only it.
- Two controls that did not work, and why: `test.use({ baseURL: undefined })` keeps the config's `baseURL`, and so
  does `browser.newContext()` inside a test (Playwright Test applies `use` to it); the control became its own project.
- Template config: loaded by Playwright's runner, `--list` 3 tests; the `baseURL` fixture is `SHOP_URL` when set and
  `env.ts`'s fallback otherwise, on all three projects.
- Checks: lint 0; skills 4 pass; guide 219 links in 39 files; snippets 289 (62 in skills, the guide's 7 new blocks) and
  14 templates; `skillsChains.spec.ts` and `docsChains.spec.ts` 84 passed on three browsers; private-name grep none.
- **Found, not changed (a question for the maintainer)**: the README's orders example and the core skill's copy of it
  name the repeated row segment in the singular (`main.table@orders.row`, and `main.list@products.card` in the card
  pattern), while the site's *Resolving locators* says a path meant to match several elements is named in the plural
  (`main.list@orders.items`), and map-site's starter spec decides by the name whether a path must match one element or
  several. A rename was tried and reverted, since it reaches the README.
