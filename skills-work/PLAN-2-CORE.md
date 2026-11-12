# PLAN-2-CORE: the `pomwright` skill

Status: **written 2026-11-10; executing** under the maintainer's standing instruction (continue; stop only for an
issue). Builds `skills/pomwright/` as decided in [DECISIONS.md](DECISIONS.md) S1-S8 and C1-C8, under the checks of
PLAN-1 (K1-K5). No decision below is new; where one would be, it is listed under *Open* and the work stops for it.

## Intended contract

An agent in a user's project that has `pomwright` installed (or should have) uses this skill by itself whenever it
writes, reads, reviews or refactors Playwright code that uses POMWright, and through it:

- knows what POMWright adds to Playwright and leaves everything else to Playwright;
- writes page objects, locator modules, fixtures, test data and tests in the documented, recommended way, with the
  conventions C1-C6 where the docs leave a choice;
- reads exact signatures and messages from the user's installed declarations, and concepts from the site pages it
  links, never from memory;
- reviews and refactors existing code toward the same, showing the right way rather than listing mistakes.

## Sources (verified, in this folder)

[facts/locators.md](facts/locators.md), [facts/docs-practices.md](facts/docs-practices.md),
[facts/docs-pageobjects-storage-reports.md](facts/docs-pageobjects-storage-reports.md),
[practices.md](practices.md) (cross-project themes 1-8), [ecosystem.md](ecosystem.md) (Playwright's locator priority,
fixtures, `addLocatorHandler`). Every rule a file states comes from the site page it links; every example compiles
(K1); every chain shown is rebuilt (K2).

## Layout and budgets

```text
skills/pomwright/
  SKILL.md                         ≤ 250 lines: the router
  references/                      ≤ 300 lines each, a contents list over 100
    paths-and-registry.md          paths and their rules, the union, LocatorRegistry, createRegistryWithAccessors,
                                   verify, strictChains, segments without a locator, when the page changes
    registering.md                 add(path), the ten methods, steps (filter, nth, describe), getById, frames,
                                   registrations that end, order in defineLocators()
    resolving-and-queries.md       getNestedLocator vs getLocator, how much to chain, several matches,
                                   getLocatorSchema and its methods, update before replace, keeping a query
    reusing.md                     reuse by path (sharing), createReusable seeds (variants), seeds in modules
    page-objects.md                PageObject, options, when defineLocators() runs, getters not fields,
                                   actions after navigation, how a mistake is reported
    navigation.md                  baseUrl, urlPath, fullUrl, the navigation helper, options, pages whose URL varies
    session-storage.md             SessionStorage, codecs, through a page object or a fixture, seed and its rules
    reports.md                     the log fixture, levels, child loggers (C5), a log fixture of your own, @step
    typescript.md                  the exported types, generic base classes (LocatorSchemaPathArgument),
                                   declaration: true
  guides/                          ≤ 300 lines each
    choosing-locators-and-paths.md Playwright's locator priority with getById beside getByTestId, kind@which naming
                                   (C1), how much to chain, plural paths, full paths vs composed
    writing-page-objects.md        from a page to a page object and its locator module, step by step (C2, C3)
    locator-modules.md             a module, composing, common locators in a base class, slots, passing state
    fixtures-and-test-data.md      page objects as fixtures, merging fixture files, the test-data fixture (C6),
                                   storage helpers as fixtures
    project-structure.md           one app, several apps, a monorepo package; an env module; the base class per app
    writing-tests.md               a spec as steps on page objects, assertions, data-driven cases, overlays
    reviewing.md                   review and refactor checklist, each item with the right-way rewrite
    upgrading-from-2x.md           short: the site's upgrade page is the procedure; how to run it with the agent
  assets/templates/                compiled (K1); relative imports only (the harness's tsconfig maps `@fixtures/*` and
                                   `@test-data/*` to its own folders, so an alias in a template would compile against
                                   the harness)
    env.ts                         the origins from the environment, checked
    app.page.ts                    the base class of one app (origin, navOptions, strictChains, common locators)
    common.locators.ts             a composed module (header, a dialog) with the overload signature
    home.locators.ts, home.page.ts one page and its module
    test-data.ts                   the typed test data, by dot paths
    fixtures.ts                    POMWright's test extended: page objects, testData; expect re-exported
    home.spec.ts                   a spec as steps
    playwright.config.ts           projects for the three browsers, no baseURL
```

## `SKILL.md` (the router)

Frontmatter: `name: pomwright`; `description` (≤ 1,024, third person, what + when: writing, reading, reviewing or
refactoring Playwright tests, page objects, locator modules, fixtures or test data that use POMWright, `PageObject`,
`createRegistryWithAccessors`, `getNestedLocator`, `getLocatorSchema`, `SessionStorage`, `@step`, the `log` fixture, or
setting up a Playwright project with page objects); `license: Apache-2.0`; `compatibility` (S6).

Body, in this order:

1. **First, check the version**: read `pomwright`'s version from `node_modules/pomwright/package.json`; 3.x follows this
   skill; 2.x or 1.x: say so and use `guides/upgrading-from-2x.md`; not installed: install it as *Installation* says.
2. **What POMWright adds, and what stays Playwright**: a table (Playwright owns: the runner, fixtures, `expect`,
   locators and their auto-waiting, actions, `baseURL`, `storageState`, tracing; POMWright adds: paths and the registry,
   chains built from paths, `PageObject` with its URL and navigation helper, typed session storage with `seed`, the `log`
   fixture, `@step`). Rule: use Playwright for everything not in the second column.
3. **Where facts come from** (S3): the installed declarations for signatures and messages (search them, they are large),
   the linked site page for concepts, playwright.dev for Playwright.
4. **The rules that hold for every task**: the ten or so that recur across every guide (resolve with
   `getNestedLocator`; one locator per path, registered once; page objects reach tests as fixtures; actions and checks
   as `@step()` methods; locator priority; `kind@which`; test data through the test-data fixture; never `await` a
   resolution; `defineLocators()` is synchronous; a query for one-use variations, `update` before `replace`).
5. **One complete canonical example**: a page object with its locator module, its fixture and a spec, the README's
   row-filter pattern included (compiled; its chain rebuilt).
6. **Which file to read for which task**: a table from task to guide and references.
7. **When something fails**: search the message in the declarations or the site's *Error messages* page; the page
   object's label and path in every message.

## Execution order (one commit per step)

1. `SKILL.md` and the first reference it needs most, `references/registering.md`, with their chain tests; the
   `biome-ignore` on `skillTest` goes.
2. The other references, a few per step, each with its chain tests and probes.
3. The guides, `choosing-locators-and-paths.md` first (every other guide applies it).
4. The templates and `guides/project-structure.md` with `guides/fixtures-and-test-data.md`, which copy them.
5. `guides/reviewing.md` last: it points into everything else.
6. Full run as in PLAN-1 step 6, and the private-name grep over `skills/`.

Each step: write; `pnpm lint:skills`, `pnpm lint:guide`, `pnpm typecheck` (examples and templates),
`skillsChains.spec.ts` on Chromium; a probe for any claim no check covers (recorded below); commit.

## Claims that need a probe beyond the checks

- The card/row pattern for a whole element found by a child's text: a query's `getLocator()` (a title updated with its
  name) used as `has` in another query's `filter(ancestor, { has })` resolves to the intended chain and matches one
  card (rendering via the spec; matching via a spec on the test server's `/testfilters` page or a `setContent` stand-in
  disclosed as such).
- `page.addLocatorHandler()` with a path's `getNestedLocator()` as the trigger dismisses an overlay before an action
  (Playwright 1.64; on the test server or disclosed stand-in), before `writing-tests.md` recommends it.

## Open

- None now.

## Execution notes
### Step 1 (done 2026-11-10, 039e33d): `SKILL.md` and `references/registering.md`

- `SKILL.md` (204 lines): version first, the Playwright/POMWright table, sources of facts, 11 rules, the complete
  example (module, page object, test data, fixtures, test; the README's row-filter pattern), the task table (site
  pages for the references not yet written), failures. Rule 3 lists Playwright's locators in Playwright's own order
  (text before label), with its advice per method; my first draft had swapped two.
- `references/registering.md` (159 lines, contents under `## Contents`).
- `skillsChains.spec.ts`: tests for both files; the `biome-ignore` on `skillTest` removed. The first run failed and
  showed my test shared one registry across the file's examples (`locator('main')` appeared where the file's own
  example registers no `main`); the test now builds one registry per example, as the file does. The claim that
  `getByRole("main")` finds `<main>` is checked in the test with `setContent` (disclosed: a role depends on markup
  alone). 3 passed on Chromium.
- `check-skills.mjs`: the contents rule accepts a list under a first `## Contents` heading (my step-4 rule only took a
  list before the first heading); re-proved both forms with a scratch skill (a list under `## Contents` missing `#two`
  fails; a list before the first heading passes).
- Snippets: 236 checked (9 in skills), exit 0; `tsc -p test` 0; `pnpm lint` 0; `lint:skills` 0; `lint:guide` 0.

### Step 2a (done 2026-11-10): `paths-and-registry.md`, `resolving-and-queries.md`

- A cross-link between two references in my draft (paths -> queries) broke the one-level rule; it became a plain
  mention. Both linked from `SKILL.md`'s table.
- The card pattern probed (the first claim of *Claims that need a probe*): the rendering
  `getByRole('list', { name: 'Products' }).getByRole('listitem').filter({ has: getByRole('heading', { name: 'Lamp', exact: true }) }).getByRole('button', { name: 'Add to cart' })`,
  and on a DOM of "Desk lamp" and "Lamp" cards (`setContent`, disclosed: matching depends on the DOM alone)
  `hasText: "Lamp"` matches 2 and the heading filter 1, the right card. Chromium; CI on `main` runs all three.
- `skillsChains.spec.ts` 5 passed; snippets 244 checked (17 in skills); `tsc -p test` 0; lint 0; skills 0; guide 0
  (112 links in 16 files).

### Step 2b (done 2026-11-10): `reusing.md`, `page-objects.md`

- `skillsChains.spec.ts` 7 passed (the page-objects test builds the broken page object the file describes and compares
  its message: `LoginPage: Locator registry verification failed for 1 of 5 paths: …`); snippets 251 checked (24 in
  skills); `tsc -p test` 0; lint, skills, guide (122 links in 18 files) 0.

### Step 2c (done 2026-11-10): `navigation.md`, `session-storage.md`, `reports.md`, `typescript.md`

- The child-logger naming confirmed in the source (`playwrightReportLogger.ts` L88: `${contextName} -> ${prefix}`) and
  probed in `skillsChains.spec.ts` (entries prefixed `TestCase -> CheckoutPage` and `TestCase -> CheckoutPage ->
  fillCard`). The logging example passes a resolved `Locator` to its helper rather than building one from `page`, so it
  follows the skill's own rules. No message is quoted verbatim in these four files: each says what fails and links the
  page, so no unprobed message text sits in a skill.
- All nine references exist and are linked from `SKILL.md` (205 lines; references 56-171 lines). Spec 8 passed; snippets
  259 checked (32 in skills); tsc, lint, skills, guide (140 links in 22 files) 0.

### Step 3 (done 2026-11-10): the first four guides

- `choosing-locators-and-paths.md`, `writing-page-objects.md`, `locator-modules.md`, `writing-tests.md`, linked from
  `SKILL.md` (209 lines). `networkidle` advice quoted from Playwright 1.64's own declarations
  (`playwright-core/types/types.d.ts` L3457-3458: "**DISCOURAGED** … rely on web assertions to assess readiness").
- My draft of `writing-tests.md` titled two blocks `fixtures.ts` (the snippet check refuses that), counted table rows
  with a `+1` for the header row, and needed `?? ""` for an array element; rewritten (counts the open orders' cancel
  buttons; named test-data keys; `home.fixtures.ts`).
- The second probe of *Claims that need a probe*: `page.addLocatorHandler(getNestedLocator("dialog@survey"), …)`
  dismisses an overlay that blocks a click, on chromium, firefox and webkit (`setContent`, disclosed), with a control:
  without the handler the click fails. Spec 27 passed on three browsers; snippets 274 checked (47 in skills); tsc,
  lint, skills, guide (165 links in 26 files) 0.

### Step 4 (done 2026-11-10): templates, `project-structure.md`, `fixtures-and-test-data.md`

- 13 templates under `assets/templates/` (per-app layout), relative imports, biome-clean (tabs, as the repository's
  code), compiled by the snippet check (13 files). `override` on `pageActionsToPerformAfterNavigation()` so the
  template compiles with `noImplicitOverride` on or off.
- Two probes on the real runner (throwaway specs under `test/tests/`, removed): a plain-value fixture reaches the test
  and `test.use()` replaces it (Playwright 1.64's `TestFixtureValue<R> = Exclude<R, Function> | TestFixture<R>` allows
  it); the templates copied into the harness: the merged `test` builds `homePage`, its registry passes the check, the
  chains render as intended (the common header included), `testData` and `log` reach the test. So the test-data fixture
  is a value (`testData,`), which avoids the empty `{}` pattern ESLint's and biome's recommended rules flag; `SKILL.md`
  and `writing-tests.md` switched to it, test data `as const`.
- My drafts: a filler annotation in a spec example (removed), and a claim that the templates' fixtures "have been
  run" (a one-time probe; now only what CI enforces, that they compile). Spec 9 passed; snippets 277 (50 in skills);
  tsc, lint, skills, guide (178 links in 28 files) 0.

### Step 6 (done 2026-11-10): full run at 9244119

All exit 0: lint, guide, skills (2 skills), workflows; `pnpm test`: unit 1,014; typecheck `doc snippets: 278 checked (51
in skills) … skill templates: 13 files`, api coverage 0 problems; harness on three browsers 1,919 passed (the 1,895 of
PLAN-1 plus 8 skill tests x 3), 1 skipped (the same browser-conditional skip); step locations 12; test-server 29;
`pnpm docs:build` 53 pages. Private-name grep over `skills/`: none.

**PLAN-2 done** (039e33d, 212a2b7, 77f1a24, bf88dde, 12a4f94, 2855f8c, 9244119).
