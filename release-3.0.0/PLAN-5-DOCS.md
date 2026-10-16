# Plans 11 to 13: the documentation, redone, and its site (analysis section 5)

Working document, kept in `release-3.0.0/` beside the analysis it answers. It covers what [PLANS.md](PLANS.md) row 11
gave `PLAN-5-DOCS.md` (the open bullets of [analysis section 5](POMWRIGHT-2.1.0-ANALYSIS.md#5-documentation-errors), the
README fixes, the AGENTS.md bullet, and plan 10's documentation items D1 and D3) and the scope set on 2026-10-16: a
complete redo of the documentation in three sections, **Docs | API | Internal**, modelled on playwright.dev, published as
a Starlight site whose setup is the last step. File links are relative to this folder.

Written 2026-10-16. **Reviewed 2026-10-16: every decision in section 7 is taken.** The review kept the recommendations of
7.1 to 7.9 and 7.11 to 7.15, changed 7.10 (the site deploys after every green `CI` on `main`, and from this branch while
it is tested, instead of at publish), clarified 7.16 (the code and its tests decide; a doc comment or an API page that
disagrees is corrected), turned F1 into a fix (7.17), and added 7.19 to 7.27: page objects as fixtures in examples with a
shared example app, the order of sources, an *Upgrading from 2.x* page that holds every migration step, a `major`
changeset that puts the docs first in the 3.0.0 changelog, Mermaid diagrams, doc comments complete enough to read the API
from the editor's hovers, the new `getLocator` framing, a pre-release banner and `noindex` while the site is deployed
from this branch, and a pre-merge step that moves `release-3.0.0/` out of the repository. The agreed decisions replace
[DECISIONS.md](DECISIONS.md)'s 2026-10-06 rows on `docs/v3` as the working copy and on the site as release work, and
[AGENTS.md](../AGENTS.md) section 6 rule 7.

The plan runs as three executions (7.1): **plan 11 = Part A** (the F1 fix, the snippet check, the Docs section), **plan
12 = Part B** (the API and Internal sections, the doc comments, the API coverage check), **plan 13 = Part C** (the site,
CI, deployment, the README), and a pre-merge step, C8, run when you say the branch is ready for `main`.

**Part A (plan 11) executed 2026-10-16** on `chore/bugfixes-quality-improvements-and-docs`, one commit per execution
step: 801e4ac (A1, F1: the boxed navigation and session storage steps, `src/helpers/stepLocations.test.ts`, changeset
`helper-step-locations`), 981ea54 (A2, the snippet check and the example app), 40bec94 (A3, Getting started and
*Principles*), 4e80ad6 (A4, the Locators group), 0a035d0 (A5, page objects, URLs and navigation, session storage,
seeding, logging, test steps, TypeScript), 449ea50 (A6, *Upgrading from 2.x*, the release notes slimmed), A7 (the full
run found nothing to fix, so it has no commit), and the ledger commit for A8 that carries this note. Final run: `pnpm
format` and `pnpm lint` clean, 670 unit tests with no type errors, `pnpm build`, `pnpm pack-test` 1317 passed (439 per
browser) with both type checks and the snippet check (104 blocks compiled; the 12 blocks of 2.x code on *Upgrading from
2.x* are `nocheck`); the 24 pages rendered and link-checked in the scratchpad preview, and every external link and
anchor resolved. The Docs pages link to these API pages and anchors, which plan 12 provides: `/api/` (the index),
`class-pageobject` (`#new-pageobject`), `class-locatorregistry` (`#add`, `#createregistrywithaccessors`, `#getlocator`,
`#getnestedlocator`, `#locatorregistryoptions`, `#verify`), `class-registrationbuilder` (`#describe`, `#filter`,
`#framelocator`, `#getbyid`, `#nth`), `class-locatorquerybuilder` (`#describe`), `class-locatorupdatebuilder`,
`class-reusablelocator` (`#describe`), `class-navigation`, `class-sessionstorage` (`#codec`, `#seed`),
`class-playwrightreportlogger`, `fixtures`, `step`, `types` (`#filterdefinition`, `#locatorschemapathformat`,
`#pageobjectoptions`, `#pageobjecttypeoptions`). The execution-time decisions are in [DECISIONS.md](DECISIONS.md)
(plans 11 to 13).

**Part B (plan 12) executed 2026-10-17** on the same branch, one commit per execution step: f17d184 (B1, doc comments
and API pages for `PageObject`, the registry and its accessors, the registration, the query and update builders, seeds),
17f566d (B2, doc comments and API pages for navigation, session storage, the logger, `test`, `step` and the types;
*Error messages*; the API index; `scripts/check-api-coverage.mjs` in `pnpm typecheck` and `pack-test.sh`; changeset
`doc-comments`), 5ab09ea (B3, the twelve Internal pages and four diagrams), 3118c0d (B4, `docs/v3` removed, AGENTS.md,
the release notes' *Documentation* section and a test comment updated), B5 (the full run found nothing to fix, so it has
no commit), and the ledger commit for B6 that carries this note. Final run: `pnpm format` and `pnpm lint` clean, 670
unit tests with no type errors, `pnpm build`, `pnpm pack-test` 1317 passed (439 per browser) with both type checks, the
snippet check (191 blocks compiled, 12 `nocheck`) and the coverage check (34 exports, 94 members, 0 problems); the 50
pages built and link-checked in the scratchpad preview with no stub left, every Mermaid diagram rendered there, every
external link and anchor resolved, every `@see` link found its page and anchor in the preview, and the hovers read back
through the TypeScript language service from a consumer file. Plan 13 checks `internal/documentation.md`, which
describes the site as plan 13 delivers it. The execution-time decisions are in [DECISIONS.md](DECISIONS.md) (plans 11 to
13).

The sample pages (section 3) are in [PLAN-5-DOCS-samples/](PLAN-5-DOCS-samples/README.md), written in full as they would
ship, beside the TypeDoc output they are compared with.

Every claim below was verified on 2026-10-16 against HEAD d1365f0 (level with `origin`), never in the working tree, in
scratchpad clones: `base` (`pnpm install --frozen-lockfile`, `pnpm build`, `pnpm harness:install`) for runtime and
runner probes; `repo`, a copy of `base` with a prototype of the proposed files (a Starlight project in `website/` with
the three sections and `starlight-typedoc`, `scripts/check-doc-snippets.mjs`, `scripts/check-api-coverage.mjs`);
`repo2`, the same with the recommended site configuration (no TypeDoc) and the shared example app; `tdoc`, a copy of
`base` with TypeDoc tags added to three aliases (S6); `f1`, a copy of `base` with F1's fix (S15); `diag`, copies of
`repo2`'s site with Mermaid, D2 and the pre-release banner (S17, S20); `cs`, a copy of `base` for the changelog (S19).
Runtime probes are Node scripts against `base`'s `dist/index.js` with chromium from its root `@playwright/test` 1.64.0;
runner probes are temporary specs with their own config in a clone's `test/`; Node 24.19.0, pnpm 9.12.0, TypeScript
5.9.3. Usage facts come from one 2.1.0 consumer project (124 TypeScript files, copied read-only without `node_modules` or
`.env`), counts only. Examples use `*.example` hosts and descriptive paths.

Probes cited below:

- **S1** baseline on `base`: `pnpm lint` clean, 664 unit tests with no type errors, both passes of `pnpm typecheck`, the
  chromium harness 439 passed.
- **S2** npm on 2026-10-16: `astro` 7.4.0 (`engines.node >=22.22.0`), `@astrojs/starlight` 0.42.6 (peer `astro ^7.2.10`),
  `starlight-sidebar-topics` 0.9.0 (`node >=22.12.0`), `starlight-links-validator` 0.27.0, `starlight-typedoc` 0.23.1,
  `typedoc` 0.28.20 (TypeScript up to 6.0), `typedoc-plugin-markdown` 4.14.0, `starlight-versions` 0.10.1. The versions
  the handover recorded are current. Installed with pnpm 9.12.0 without an engine or peer warning.
- **S3** the prototype site on Astro 7 with `site: "https://dyhex.github.io"`, `base: "/POMWright"`: the three sections
  through `starlight-sidebar-topics`, a header tab list through Starlight's `SiteTitle` override (its links carry the
  base), Pagefind search, edit links to `main/website/`. With TypeDoc 58 pages in 2.2 s; the recommended configuration
  (`repo2`) 35 pages in 1.3 s. At 1280 px the header shows Docs | API | Internal and the sidebar its section; at 390 px
  the header tabs are hidden and the menu lists the three sections.
- **S4** link validation with `starlight-links-validator` 0.27.0: relative links (`../first-page-object/`,
  `./first-page-object.md`) and root links without the base (`/docs/...`) are reported as errors; root links with the
  base (`/POMWright/docs/first-page-object/`) and their `#anchors` are validated; every planted broken link was found.
- **S5** TypeDoc through `starlight-typedoc` over `index.ts` (34 exports): `LocatorQueryBuilder`,
  `LocatorUpdateBuilder`, `LocatorRegistry` and `AddAccessor` each render as one line naming an unexported internal type
  with no members; `PageObject` lists 12 properties, no constructor and neither hook, 11 of them without a description;
  `createRegistryWithAccessors`' `add` is a conditional type over internal names; inside a topic the generated sidebar
  group's label renders as `Symbol(StarlightTypeDocSidebarGroupLabel)`.
- **S6** TypeDoc with the `@interface` tag on three aliases (`tdoc`): the members appear, but the update builder's
  `getByRole` parameter prints Playwright's whole role union twice inside `ArgsFor<Mode, …>`, `add()` returns a
  conditional type over internal names, and TypeDoc warns 104 times (36 internal types "referenced but not included", 66
  members without a description).
- **S7** the snippet check (appendix A.1): the sample blocks compile against the packed package with the harness's
  options and `declaration: true` in 0.4 s; a misspelt path is reported at its page line (`resolving-locators.md:65:42`,
  TS2345); `tsc -p test` does not pick up the generated `test/.doc-snippets/` (0 files listed). Over `docs/v3`: 144 blocks,
  4 do not parse, 97 do not compile as written (W9).
- **S8** the API coverage check (appendix A.2): the TypeScript compiler API over `dist/index.d.ts` lists the 34 exports
  and the public and protected members behind each alias; against the prototype, `PageObject` and `LocatorQueryBuilder`
  are complete and the stub pages' 57 gaps are listed.
- **S9** the samples at runtime, chromium, `base`'s build: every chain, description, element count and message the four
  sample pages print, read back (the first page's chain equals the hand-written Playwright chain and finds the same
  element; the ten query-builder methods and their messages). The HTML report of a runner probe shows
  `Expect "toHaveValue" main.form@login.input@email`, a `@step` row `LoginPage.logIn`, and the navigation rows
  `LoginPage: Navigate to this Page` and `LoginPage: Expect this Page`.
- **S10** biome 2.5.6 over the site: Astro's generated `website/.astro/*.d.ts` (6 findings) must be excluded; in `.astro`
  files biome reads the frontmatter only, so an import or variable used by the template is reported unused (2 findings).
- **S11** GitHub, through the public API (`gh` is not authenticated in this session): the releases v2.1.0, v2.0.0 and
  v1.5.1 were created by `github-actions[bot]`; GitHub's documentation (*Triggering a workflow from a workflow*): "events
  triggered by the `GITHUB_TOKEN` will not create a new workflow run", except `workflow_dispatch`, `repository_dispatch`
  and pull request events; current releases `actions/upload-pages-artifact` v5.0.0 (fc324d35…), `actions/deploy-pages`
  v5.0.1 (368f8252…), `withastro/action` v6.1.3 (3eafd002…).
- **S12** Astro 7's default Markdown processor (Sätteri) does not run `markdown.remarkPlugins` without the separate
  `@astrojs/markdown-remark`; an Expressive Code plugin, which Starlight already carries, hides a block's compile-only
  prelude with no dependency (appendix A.3).
- **S13** claims of `docs/v3` checked: an unfilled shared slot passes `verify()`, also under `strictChains`, and throws
  only when resolved; the log fixture's levels match `initialLogLevel`; attachments are in call order; a query builder's
  methods change that query and return it (`query.nth("last") === query`).
- **S14** the consumer project: 1 domain base class with 24 page objects on it, 39 locator modules (8 with the
  `ExternalPaths` overload), 23 page objects calling `defineLocators(this.locatorRegistry)`; 552 registrations
  (`getByRole` 267, `locator` 165, `getById` 21, `getByTestId` 3, `frameLocator` 1); `getNestedLocator` 617 and
  `getLocator` 6; `getLocatorSchema` 100 (`update` 75, `nth` 55, `describe` 6); `createReusable` 13, seed reuse 57, path
  reuse 1; `expectThisPage` 160, `gotoThisPage` 31, `goto(…)` 29, `expectAnotherPage` 3; session storage 30 calls (21
  `setOnNextNavigation`); `@step` 60; `log.` 8, child loggers 5; `test.extend` 9.
- **S15** F1, a runner probe with a step-locations reporter: the navigation steps report their location in POMWright's
  bundle (`dist/index.js:2320`, `:2332`), the session storage steps have no location, a `@step` row reports the test's
  line; a failing navigation's error is reported at the test's line already. In `f1`, `{ box: true }` on the navigation
  step, or a `location` taken from the call site, moves the step's location to the test's line (`location.spec.ts:19`,
  `:26`), and the step keeps its inner `Navigate` step.
- **S16** Pages, through the public API after you enabled it: `has_pages: true`; GitHub created the `github-pages`
  environment with a custom branch policy allowing `main`; you added `chore/bugfixes-quality-improvements-and-docs` to it
  on 2026-10-16. GitHub's documentation: with "GitHub Actions" as the source there is no branch setting, the environment
  enforces which branches deploy, and Pages sites are public.
- **S17** diagrams in `diag`: `astro-mermaid` 2.1.0 with `mermaid` 11.17.2 (its peer range is `^10 || ^11`; 12.2.0 is
  current) builds with Astro 7's processor, renders a flowchart and a sequence diagram with crisp text in the light and the
  dark theme, in the browser, from about 3.7 MB of JavaScript assets fetched only on a page with a diagram; the same
  Markdown renders on GitHub and in Obsidian. `astro-d2` 0.14.0 needs the D2 binary or its experimental JavaScript
  renderer, which builds static SVGs with no browser JavaScript but spaces text badly ("Regis try", "loca tor"), writes the
  files into `public/d2/`, and is not rendered by GitHub or Obsidian.
- **S18** the hovers, from `dist/index.d.ts` with the compiler API: 13 of 34 exports and 38 of 115 public members have no
  doc comment (all of `PageObject`'s properties, every accessor, `NavigationFor`'s three methods, every option of
  `NavigationOptions`, `PageObjectOptions` and `PageObjectTypeOptions`); 59 members take parameters and 10 have any
  `@param`; no member has `@returns` or `@throws`; 25 have `@example`. Hovering `loginPage.navigation.goto(` or
  `this.getNestedLocator(` shows no description.
- **S19** the changelog, `pnpm changeset version` in `cs` with the default generator: the 3.0.0 entry is about 400 lines,
  grouped Major (lines 5 to 353), Minor, Patch, each group in the alphabetical order of the changeset files; a `patch`
  docs changeset lands at line 376; a `major` one named `documentation-…` would be the first item.
- **S20** the pre-release measures in `diag`: a `Banner` component override shows one notice on every page (the home
  page, the Docs and the API pages checked), and a `head` entry puts `<meta name="robots" content="noindex">` in every
  page.
- **S21** Playwright's own guidance: its [Page object models](https://playwright.dev/docs/pom) guide creates the page
  object inside the test (`new PlaywrightDevPage(page)`); its [Fixtures](https://playwright.dev/docs/test-fixtures) guide
  provides page objects as fixtures (`todoPage`, `settingsPage`).
- **S22** the shared example app in `repo2`: with `website/snippets/login.page.ts` and `fixtures.ts`, a page's
  `import { expect, test } from "./fixtures"` and `async ({ loginPage, page, log }) => …` compile; a page's own block
  titled `login.page.ts` takes precedence.
- **S23** the revised concept sample: `page.getByRole("dialog", { name: "Session expired" }).locator(registry.getLocator(path))`
  renders `getByRole('dialog', { name: 'Session expired' }).locator(getByRole('button', { name: 'Log in' }))`, finds 1
  element and clicks it; `filter({ has })` with the same locator finds 1; the locator alone matches 3 and its strict mode
  message is the one the page shows.

---

## Part 1. Where the documentation stands

### 1.1 What exists

| file | lines | what it is |
| --- | --- | --- |
| [docs/v3/overview.md](../docs/v3/overview.md) | 578 | v2's overview patched by every plan: requirements, a tour of the public API, public against internal, a glossary |
| [docs/v3/locator-registry.md](../docs/v3/locator-registry.md) | 1349 | the registry in depth: paths, `add`, `getById`, `filter`, resolution, frames, `verify`, queries, `update`/`replace`, `skip`, reuse, `describe`, an error reference, tested guarantees, two migration sections, best practices |
| [docs/v3/PageObject.md](../docs/v3/PageObject.md) | 634 | the constructor and its types, URL rules, the lifecycle, navigation, a 2.x migration, v1 differences |
| [docs/v3/session-storage.md](../docs/v3/session-storage.md) | 366 | the helper, codecs, methods, `seed` and its limits, service workers, errors, a 2.x migration |
| [docs/v3/logging.md](../docs/v3/logging.md) | 223 | the fixture, the logger, attachments, "Changes in 3.0.0" |
| [docs/v3/composing-locator-modules.md](../docs/v3/composing-locator-modules.md) | 428 | locator modules, the `ExternalPaths` overload, state as an argument, sharing, slots |
| [README.md](../README.md) | 349 | 2.x pitch, a vanilla-against-POMWright example, install, links to `docs/v2` and `docs/v1*` |
| `docs/v2/`, `docs/v1/`, `docs/v1-to-v2-migration/` | | frozen 2.x reference and archives |

`docs/v3` is v2's documentation patched by every plan since: much of it is accurate and gives context, some of it is
v2 that no plan touched, and its shape is v2's (six long reference files, no path from installation to a working test,
the 3.0.0 migration spread over six sections in four files, internals mixed into the overview, no per-member reference).
It is context, not a source of truth (7.20).

### 1.2 What is wrong (verified)

| # | where | what |
| --- | --- | --- |
| W1 | [overview.md:1-5](../docs/v3/overview.md#L1-L5), [PageObject.md:1](../docs/v3/PageObject.md#L1), [locator-registry.md:1](../docs/v3/locator-registry.md#L1), [logging.md:1-5](../docs/v3/logging.md#L1-L5), [composing-locator-modules.md:1-5](../docs/v3/composing-locator-modules.md#L1-L5) | the files call themselves v2 (plan 10's D1) |
| W2 | [PageObject.md:538-541](../docs/v3/PageObject.md#L538-L541) | the migration misses that a consumer type testing `fullUrl` against `RegExp` must test `UrlMatcher` (plan 10's D3; the only break outside the checklist in the consumer project) |
| W3 | [overview.md](../docs/v3/overview.md) | `testData` is a fixture no example defines (L104); the import list lacks a comma and does not parse (L119-127); `class LoginPage<Paths>` shadows the union (L138); `expect` is imported from `pomwright`, which does not export it (L432) |
| W4 | [logging.md](../docs/v3/logging.md) | `expect` imported from `pomwright` (L18); `sharedLogLevel` and `sharedLogEntry` used undeclared (L43, L137); "attaches log entries … in timestamp order" (L34) where the code attaches in call order, as L146 says (S13) |
| W5 | [locator-registry.md:526](../docs/v3/locator-registry.md#L526) | "a query builder `registry.getNestedLocator(path)...getNestedLocator()`" should be `getLocatorSchema(path)…` |
| W6 | [composing-locator-modules.md](../docs/v3/composing-locator-modules.md) | an unfilled slot "will throw a descriptive error at runtime" (L381): only when the path is resolved; `verify()` passes, under `strictChains` too (S13); snippets without their imports (L256-277); "diviate" (L428) |
| W7 | [session-storage.md](../docs/v3/session-storage.md) | `number()` used before it is defined (L70, L232); `Codec` used without its import (L335-343) |
| W8 | all six files | v1 material (*Migration notes from v1*, *Key differences vs v1*, links to `docs/v1-to-v2-migration`) beside the 3.0.0 migration |
| W9 | all six files | no snippet was written to compile: of 144 `ts` blocks, 4 do not parse ([overview.md:117](../docs/v3/overview.md#L117), [:321](../docs/v3/overview.md#L321), [PageObject.md:289](../docs/v3/PageObject.md#L289), [:305](../docs/v3/PageObject.md#L305)) and 97 fail as written: 73 only because they use names they never declare (`registry`, `page`, modules that do not exist), the rest with W3, W4 and W7 and untyped fixtures (S7) |

None of these is a code defect; the code was checked first in each case. The redo fixes them by construction (every
example compiles, section 2.5). The one finding about the code itself is F1 (section 2.11).

### 1.3 Analysis section 5: the open bullets

| bullet | resolved by |
| --- | --- |
| README L12, L163, L168/L190, L257, L286; the `@step` decorator flavour and the minimum Node version | the 3.0.0 README (Part C, 7.15); the Node version and both decorator flavours also on *Installation* |
| overview L1, L70/L99, L111-112, L124, L302, L327-330, L386, L429-433, L509-513 | `overview.md` is replaced by *Getting started*, *Principles* and the API index (Parts A, B); no page repeats them (the snippet check enforces the code ones) |
| locator-registry L26, L283, L287-291, L320-322, L727; "Missing: 1.10" | the Locators group (Part A); L320-322 is W5 |
| logging L18, L98-104 | *Logging to the report* (Part A); W4 |
| composing L317 | *Locator modules* (Part A); W6 |
| AGENTS L14 "thenable query builders" | fixed on 2026-10-06; ticked in Part A's ledger step |
| plan 10 D1, D3 | W1 (no page names a version in its title), W2 (*Upgrading from 2.x* and *URLs and navigation*) |

### 1.4 What real use emphasises

From S14: page objects are built on one domain base class (1 base, 24 page objects), their locators live in modules (39
modules, 23 page objects call one), `getNestedLocator` is the norm (617 against 6), queries are common (100, mostly
`update` and `nth`), seeds are used far more than path reuse (57 against 1), `expectThisPage` is the most used navigation
call (160), page objects reach tests through fixtures, and session storage, `@step` and logging are used throughout. So
*Getting started* ends with fixtures, a domain base class and locator modules, the Locators group puts resolution and
queries early, and *Reusing locators* teaches path reuse first (the 3.0.0 recommendation, decided in plan 9) while
showing seeds, which most 2.x code uses.

---

## Part 2. Design

### 2.1 Intended result

- A site at `https://dyhex.github.io/POMWright/` with three sections in the header, as playwright.dev has Docs and API:
  **Docs** to learn (getting started, principles, one page per concept, the upgrade from 2.x), **API** to look things up
  (one page per class or type group, every member with its signature, arguments, return value, the errors it throws and
  an example), **Internal** to understand how POMWright works (for contributors; conceptual, so it ages well).
- Every concept page starts from the Playwright concept underneath it and links to it (locators, `filter`, `nth`,
  `describe`, `contentFrame()`, `page.goto`, `waitForURL`, `baseURL`, fixtures, `test.step`, `page.sessionStorage`,
  routes), and ends with links to the API pages and Playwright's. About eight Mermaid diagrams show how the parts work
  (2.12).
- The editor's hovers carry the API: every export and public member has a doc comment with its summary, parameters,
  return value, the errors it throws and an example, as Playwright's declarations do (2.13).
- Every TypeScript example compiles against the packed package in CI; every API page and every doc comment covers every
  member of what it documents (checked); every link and anchor resolves (checked); every chain, description and message
  shown was read from a probe when it was written.
- Version 3 only. 2.x users are pointed at the frozen 2.x docs at the `v2.1.0` tag. The release notes and the 3.0.0
  changelog entry point at the docs and at *Upgrading from 2.x*, which holds every migration step in one page.
- Deployed after every green `CI` on `main`, so the docs can improve between releases; while this branch is tested, from
  the branch, with a pre-release banner and `noindex`.

### 2.2 Principles for the docs

- **Mirror Playwright, in the docs as in the code.** Explain each feature as the Playwright feature it builds on plus
  what POMWright adds; use Playwright's names (locator, chain, filter, strictness, fixture, step); link to playwright.dev
  for everything Playwright owns instead of restating it.
- **Teach the recommended path first.** Chains by default, page objects as fixtures, reuse by path, `update` before
  `replace`; mention the rest where it applies. A decided contract is documented as decided; the docs do not reopen it.
- **The code is the truth.** Every statement is checked against the implementation and its tests, and runtime behaviour
  against a probe; the `release-3.0.0` documents explain why; `docs/v3` gives context only (7.20).
- **One home per fact.** A rule is explained once, on its concept page, and linked elsewhere; the API page and the doc
  comment state the contract briefly and link the concept.
- **Show, then explain.** A short example first, the rule after it, the edge cases last.
- **Say what fails and how.** Errors are part of the contract: the concept pages show the common ones, the API pages and
  the doc comments list every one per member, and *Error messages* collects them all.

### 2.3 The page map

Flat URLs under each section, as playwright.dev has them (`/docs/resolving-locators/`, `/api/class-pageobject/`); the
grouping is the sidebar's (`website/sidebar.mjs`, appendix A.4). The sources are listed in the order of trust of 7.20: the
implementation and its tests first, then the `release-3.0.0` documents and the changesets, then `docs/v3` for context;
"probe" means the page's chains and messages are read from a probe at writing time.

**Docs** (24 pages, `website/src/content/docs/docs/`)

| group | page | purpose | sources |
| --- | --- | --- | --- |
| Getting started | `installation` | install beside `@playwright/test`; Node 20, Playwright `>=1.64.0 <2.0.0`; TypeScript settings that matter (both decorator flavours for `@step`); import from the root only; CommonJS and ESM | [package.json](../package.json), [stepDecorator.test-d.ts](../src/helpers/stepDecorator.test-d.ts), [esmEntry.spec.mts](../test/tests/packaging/esmEntry.spec.mts), [package-exports-and-engines](../.changeset/package-exports-and-engines.md), [overview.md §Requirements](../docs/v3/overview.md#requirements) |
| | `first-page-object` | paths, a page object, what a path resolves to, a first test that creates the page object itself and points to fixtures (**sample**) | [pageObject.ts](../src/pageObject.ts), probes S9, S22 |
| | `page-objects-in-tests` | page objects as Playwright fixtures (the convention of every later example), POMWright's `test` and its `log`, `mergeTests`, a broken page object failing the fixture | [base.fixtures.ts](../src/fixture/base.fixtures.ts), [lifecycle.spec.ts](../test/tests/pageObject/lifecycle.spec.ts), [DECISIONS.md, plan 1.7](DECISIONS.md), Playwright fixtures |
| | `organising-a-project` | a domain base class with `PageObjectOptions`, a base URL from the environment, locator modules per page, a common module, `@step` actions, folder layout | [publicTypes.typecheck.ts](../test/tests/packaging/publicTypes.typecheck.ts), [composing-locator-modules.md](../docs/v3/composing-locator-modules.md), S14 |
| | `principles` | mirror Playwright and add only what it lacks; one locator per path, chains by default; registered locators and seeds never change; fail fast at fixture setup; validate at runtime, types where they cost nothing; no hidden state | [AGENTS.md §5](../AGENTS.md), [DECISIONS.md](DECISIONS.md) (plans 1.3-1.4, 1.6-1.8, 1.7, 9) |
| Locators | `locator-paths` | path rules (types and runtime, the 26 whitespace characters), naming segments, the registry per page object, `createRegistryWithAccessors`, unregistered segments as names | [types.ts](../src/locators/types.ts), [utils.ts](../src/locators/utils.ts), [the registry specs](../test/tests/locatorRegistry/), [locator-registry.md §Path types](../docs/v3/locator-registry.md#path-types-and-validation) |
| | `registering-locators` | `add(path)` and the ten methods side by side with Playwright's; the first argument and empty strings; one strategy per path; duplicates; registered locators never change | [locatorRegistrationBuilder.ts](../src/locators/locatorRegistrationBuilder.ts), its unit tests, [registration-guards-and-frames](../.changeset/registration-guards-and-frames.md) |
| | `locating-by-id` | `getById`, which Playwright lacks: verbatim strings as `[id="…"]`, RegExps through the attribute engine, flags, why not `#id` | [utils.ts](../src/locators/utils.ts), [testIds.spec.ts](../test/tests/testApp/testIds.spec.ts), [getbyid changeset](../.changeset/getbyid-verbatim-ids-and-regex.md) |
| | `resolving-locators` | `getNestedLocator` for every element you act on; `getLocator` for chains you build yourself and for filters; unregistered segments; what the report shows (**sample**) | [locatorRegistry.ts](../src/locators/locatorRegistry.ts), probes S9, S23 |
| | `filters-and-indices` | `filter` (Playwright's options; `has`/`hasNot` with paths, resolved terminal-only; cycles), `nth`, `first`, `last`, step order | locatorRegistry.ts, the `filter` specs, probe |
| | `descriptions` | the path as the default description, `describe` on `add`, seeds and queries, `describe("")`, where Playwright shows it | locatorRegistry.ts, plan 9 P6, S9 |
| | `queries` | `getLocatorSchema`: sub-paths, `filter`, `nth`, `clearSteps`, `describe`, `update` (JSON Merge Patch) against `replace`, `skip`/`unskip`; a query is a private copy | [locatorQueryBuilder.ts](../src/locators/locatorQueryBuilder.ts), [locatorUpdateBuilder.ts](../src/locators/locatorUpdateBuilder.ts), probes S9 |
| | `reusing-locators` | reuse by path with `filter`, `nth`, `describe`; seeds from `createReusable` as values; the seeded override; typing seeds | [reusableLocatorBuilder.ts](../src/locators/reusableLocatorBuilder.ts), [seeds-and-path-reuse](../.changeset/seeds-and-path-reuse.md) |
| | `frames` | `frameLocator(selector)` as the `<iframe>` element plus `contentFrame()`, steps on frames, telling frames apart, the any-frame `frameLocator()`, frames in filters | locatorRegistry.ts, [the testApp specs](../test/tests/testApp/), Playwright *Frames* |
| | `verifying-registries` | fail fast: what `verify()` checks and does not, the automatic check of page objects, `strictChains` | locatorRegistry.ts, [strict-chains](../.changeset/strict-chains.md), S13 |
| | `locator-modules` | the module pattern and its overload, composing, state as an argument, sharing by path, shared slots (exactly when an unfilled one fails), what a module may return under `declaration: true` | [publicTypes.emit.ts](../test/tests/packaging/publicTypes.emit.ts), [composing-locator-modules.md](../docs/v3/composing-locator-modules.md), S13 |
| Page objects | `page-objects` | anatomy, constructor and options, when `defineLocators()` runs and what it can read, how a mistake is reported (fixture, `beforeEach`, `beforeAll`), post-navigation actions, `PageObjectTypeOptions` | pageObject.ts, [pageObject.test.ts](../src/pageObject.test.ts), [pageobject-lifecycle](../.changeset/pageobject-lifecycle.md), Playwright *Page object models* |
| | `urls-and-navigation` | `baseUrl`, `urlPath`, `fullUrl` as the browser reports it, RegExp parts and `UrlMatcher`, `goto`, `expectThisPage`, `expectAnotherPage`, options and timeouts, failure messages | [url.ts](../src/helpers/url.ts), [navigation.ts](../src/helpers/navigation.ts), [url-composition-and-navigation](../.changeset/url-composition-and-navigation.md), Playwright `baseURL`, `goto`, `waitForURL`, `toHaveURL` |
| Session storage | `session-storage` | the helper over `page.sessionStorage`: strings and codecs, `set`, `get`, `clear`, origin checks, through a page object, as a fixture | [sessionStorage.ts](../src/helpers/sessionStorage.ts), [the testApp specs](../test/tests/testApp/) |
| | `seeding-session-storage` | `seed`: the two patterns, what a seeded hop looks like, what it cannot do, service workers, several origins, frames | [sessionStorageSeed.ts](../src/helpers/sessionStorageSeed.ts), its tests, plan 1.5 and 10 decisions, Playwright routes and service workers |
| Reports | `logging` | the `log` fixture, levels and retries, child loggers, what is attached and how it is named, a custom fixture, logging from page objects | [playwrightReportLogger.ts](../src/helpers/playwrightReportLogger.ts), [the logging specs](../test/tests/logging/), Playwright attachments |
| | `test-steps` | `@step` over `test.step`: titles, options, `async` only, both decorator flavours, static methods | [stepDecorator.ts](../src/helpers/stepDecorator.ts), its tests |
| | `typescript` | the types to import and when, forwarding a path in a generic base class, `declaration: true` | [publicTypes.typecheck.ts](../test/tests/packaging/publicTypes.typecheck.ts), [publicTypes.emit.ts](../test/tests/packaging/publicTypes.emit.ts) |
| | `upgrading-from-2x` | every change a 2.x project meets, each self-contained: what changed and why, how to find the affected code (the grep), before and after, the concept page; grouped by area; D3; links to the 2.x docs (7.21) | [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md), the changesets' migration hints, the migration sections of `docs/v3`, Q15 of plan 10 |

**API** (14 pages, `website/src/content/docs/api/`), in Playwright's form (section 2.4); the doc comments of the same
members say the same in the editor (2.13)

| page | documents | sources |
| --- | --- | --- |
| `index` | every export of [index.ts](../index.ts), grouped, one line each | index.ts, S8 |
| `class-pageobject` | `PageObject`: type parameters, constructor, the two hooks, properties (**sample**) | [pageObject.ts](../src/pageObject.ts), probes |
| `class-locatorregistry` | `LocatorRegistry`, `createRegistryWithAccessors`, the four accessor types, `LocatorRegistryOptions` | [locatorRegistry.ts](../src/locators/locatorRegistry.ts) |
| `class-registrationbuilder` | what `add(path)` returns: the ten methods with Playwright's arguments, `filter`, `nth`, `describe`, the seeded and path-reuse forms (not exported, by design) | [locatorRegistrationBuilder.ts](../src/locators/locatorRegistrationBuilder.ts) |
| `class-locatorquerybuilder` | `LocatorQueryBuilder` (written for the comparison, section 3) | [locatorQueryBuilder.ts](../src/locators/locatorQueryBuilder.ts), probes |
| `class-locatorupdatebuilder` | `LocatorUpdateBuilder` in `update` and `replace` mode | [locatorUpdateBuilder.ts](../src/locators/locatorUpdateBuilder.ts) |
| `class-reusablelocator` | `createReusable` and `ReusableLocator` | [reusableLocatorBuilder.ts](../src/locators/reusableLocatorBuilder.ts), [types.ts](../src/locators/types.ts) |
| `class-navigation` | `NavigationFor`, `NavigationOptions`, `ThisPageOptions`, `UrlMatcher` | [navigation.ts](../src/helpers/navigation.ts), [url.ts](../src/helpers/url.ts) |
| `class-sessionstorage` | `SessionStorage`, `json`, `Codec`, `SessionStorageSchema` | [sessionStorage.ts](../src/helpers/sessionStorage.ts) |
| `class-playwrightreportlogger` | `PlaywrightReportLogger`, `LogEntry`, `LogLevel` | [playwrightReportLogger.ts](../src/helpers/playwrightReportLogger.ts) |
| `fixtures` | `test` and its `log` fixture | [base.fixtures.ts](../src/fixture/base.fixtures.ts) |
| `step` | `@step` and its forms | [stepDecorator.ts](../src/helpers/stepDecorator.ts) |
| `types` | `PageObjectTypeOptions` and the four `*TypeFromOptions`, `PageObjectOptions`, `FilterDefinition`, `IndexSelector`, `LocatorSchemaPathFormat`, `LocatorSchemaPathArgument` | [types.ts](../src/locators/types.ts), [pageObject.ts](../src/pageObject.ts) |
| `errors` | every message, by the call that throws it, with what it means and the fix | the source's `throw` sites, the unit and harness expectations, probes; [locator-registry.md §Error reference](../docs/v3/locator-registry.md#error-reference-and-troubleshooting) for context |

**Internal** (12 pages, `website/src/content/docs/internal/`), conceptual: what each part is for, how it fits, and the
reasons, stated on the page itself (the `release-3.0.0` documents leave the repository in C8, so the pages do not link to
them); file names but no line numbers; [AGENTS.md](../AGENTS.md) stays the contributor rulebook and is linked, not copied.

| page | purpose | sources |
| --- | --- | --- |
| `index` | architecture: the module map, what is public, the flow from `add` to a `Locator` | AGENTS.md §1-2, [index.ts](../index.ts) |
| `registry-records` | records, copies at the boundary and on every read, immutability, duplicates | locatorRegistry.ts, DECISIONS plan 1.10-2 |
| `resolution` | the chain pipeline: segments, steps, terminal-only `has` paths, the cycle set, frames as `locator` plus `contentFrame()`, the any-frame first segment, `verify()` sharing it | locatorRegistry.ts, plans 1.6-1.8 and 9 |
| `strategies-table` | `STRATEGIES`, `assertStrategyPrimary`, how creation, clone, patch, `update` and `replace` read it, adding a strategy | [utils.ts](../src/locators/utils.ts), plan 9 |
| `builders` | the registration views, the seeded builder, the query copy and its skip flags, the update builder's `Mode`, public aliases over `*Internal` classes and why | the builder sources, plan 1.9 |
| `page-object-lifecycle` | the facade, the scheduled check, the sticky failure, the construction site | pageObject.ts, plan 1.7 |
| `url-matching` | `composeFullUrl` and `UrlMatcher`: origin against the rest, strings in their parsed form | url.ts, plans 1.3-1.4 and 10 |
| `seed-registry` | one registry per page, the route and listeners only while pending, writer and redirect documents, the proxy window, the continue marker, bypass and never-applied failures | [sessionStorageSeed.ts](../src/helpers/sessionStorageSeed.ts), plans 1.5 and 10 |
| `call-sites` | `captureCallSite` and `atCallSite`, why never file names; boxed steps (F1) | [callSite.ts](../src/helpers/callSite.ts), plan 1.10-2, S15 |
| `packaging` | one CommonJS build, the generated ESM entry, the `exports` map, the declarations | plan 4, [write-esm-entry.mjs](../scripts/write-esm-entry.mjs) |
| `tests-and-checks` | unit tests (typecheck mode), the harness against the packed tarball, the type probes, the snippet and API checks, the CI jobs | AGENTS.md §3-4, `.github/workflows/` |
| `documentation` | how the site is built, checked and deployed; the writing rules in short, linking AGENTS.md | this plan |

Not pages: release notes and the changelog (the sidebar links GitHub's releases and `CHANGELOG.md`), v1 (the 2.x docs at
the tag link the v1 archives).

### 2.4 Page shapes and writing rules

**Getting started pages** follow playwright.dev's: an *Introduction*, a "You will learn" list, short sections each
with one example that grows from the last, *What's next* links. One page, one outcome.

**Concept pages**: an *Introduction* naming the Playwright concept with a link and saying what POMWright adds; a small
fixture (the HTML and the registry or page object used by every example on the page); sections from the common case to
the edge cases; a diagram where one explains better than prose (2.12); `:::note` asides only for traps; a closing
*Reference* list (POMWright API pages, then Playwright's).

**API pages** follow playwright.dev's class pages: a summary with one example, then *Type parameters*, *Constructor*,
*Methods* (or *Methods to implement*) and *Properties*, each member a `###` heading, alphabetical within its group, with
a description, **Usage**, **Arguments** (name, type, *(optional)*, nested options indented), **Returns**, **Throws** (the
real messages), and links to the concept page. Types link to their API page or to playwright.dev. No "Added in" markers
in 3.0.0 (7.9).

**Internal pages**: what the part is for, how it works in prose and a diagram, the reasons stated on the page, the files
involved.

**Examples** (7.19):

- Page objects reach tests as Playwright fixtures. *Your first page object* creates one inside its test, as Playwright's
  POM guide does, and says so; *Page objects in tests* turns it into a fixture, as Playwright's fixtures guide does; every
  later example that runs in a test receives its page objects as fixtures (`async ({ loginPage }) => …`).
- The docs share one small example app on `shop.example` in `website/snippets/` (`login.page.ts`, `fixtures.ts`, and what
  later pages need), which the snippet check makes importable from every page, so an example shows
  `import { expect, test } from "./fixtures";` and compiles against those fixtures (S22). A page that needs its own
  version defines a block with the same title.
- Code that is not test code (registrations in `defineLocators()`, a locator module, a query in a page object's method)
  is shown as such; a hidden prelude above `// ---cut---` only declares what the visible lines use and is never the
  pattern a reader copies.
- TypeScript, two-space indentation, `*.example` hosts, descriptive paths; a rendered chain or a message is shown in a
  comment or a `text` block and copied from a probe.

**Every page**: Markdown (`.md`); MDX only where a component earns it (the home page's cards). Frontmatter `title` and a
quoted `description`. Links within the site are root-absolute with the base (`/POMWright/docs/...`, 7.8); links to
Playwright go to playwright.dev's current pages. Plain sentences, one idea each, no marketing, no "simply" or "just";
American spelling as the code has it. The rules go into AGENTS.md (7.14).

### 2.5 Keeping the docs true

- **The snippet check** ([appendix A.1](#a1-scriptscheck-doc-snippetsmjs), S7, S22) extracts every `ts` block of
  `website/src/content/docs`, one small project per page with the example app of `website/snippets/`, into
  `test/.doc-snippets/` (gitignored, excluded from biome), and compiles it with the harness's `tsconfig.json` plus
  `declaration: true`, against the packed package. Conventions: `title="name.ts"` makes a block that file, importable by
  the page's other blocks (`./name`); an untitled block is a module of its own; lines up to `// ---cut---` are compiled
  but hidden on the site (appendix A.3); a block whose meta says `nocheck` is skipped and listed (none in the samples); a
  deliberate compile error is shown with `// @ts-expect-error`, which the check enforces. It runs in `pnpm typecheck` (so
  in `pack-test` and in every harness job, at the Playwright pin and at the latest 1.x) and in the site job (2.8). No
  dependency: Node and the root's TypeScript.
- **The API coverage check** ([appendix A.2](#a2-scriptscheck-api-coveragemjs), S8) lists every export of the
  declarations and every public or protected member behind it, and fails when an API page or a `### member` heading is
  missing, and, from Part B, when a doc comment lacks its summary or a `@param` for a parameter (2.13). It runs in
  `pnpm typecheck` and the site job.
- **Link validation**: `starlight-links-validator` fails the site build on a broken internal link or anchor (S4).
- **Chains, messages and diagrams**: read from a probe or the code when written (section 5). A plan that changes a
  message, a rendering or a mechanism greps `website/` and the doc comments for the old text (an AGENTS.md rule).
- **The source of truth** is the code and its tests (7.16, 7.20): a doc comment or an API page that disagrees with them is
  corrected; neither is corrected to match the other.

### 2.6 The API reference: hand-written (decided, 7.5)

Both forms were prototyped on `PageObject` and `LocatorQueryBuilder`; the output is in
[PLAN-5-DOCS-samples/](PLAN-5-DOCS-samples/README.md).

| | generated (`starlight-typedoc`) | hand-written, Playwright's form |
| --- | --- | --- |
| `LocatorQueryBuilder` | one line, `= LocatorQueryBuilderInternal<…>`, no members ([typedoc/LocatorQueryBuilder.md](PLAN-5-DOCS-samples/typedoc/LocatorQueryBuilder.md)); with an `@interface` tag in the source the ten methods appear, each signature in internal types (S6) | ten methods, each with usage, arguments, return, throws and the chain it builds ([api/class-locatorquerybuilder.md](PLAN-5-DOCS-samples/api/class-locatorquerybuilder.md)) |
| `PageObject` | 12 properties, 11 undescribed; no constructor, no `defineLocators`, no actions hook ([typedoc/PageObject.md](PLAN-5-DOCS-samples/typedoc/PageObject.md)) | type parameters, the constructor with every option and its messages, both hooks, 12 properties ([api/class-pageobject.md](PLAN-5-DOCS-samples/api/class-pageobject.md)) |
| `LocatorRegistry`, `AddAccessor`, `LocatorUpdateBuilder` | `Pick<LocatorRegistryInternal, …>`, `LocatorRegistryInternal["add"]`, `= LocatorUpdateBuilderInternal<…>`; with the tag, `getByRole(...args: ArgsFor<Mode, [role: "log" \| …], …>)` and an `add()` returning a conditional type ([typedoc/*-with-interface-tag.md](PLAN-5-DOCS-samples/typedoc/)) | written as Playwright documents `page.getByRole(role, options?)` |
| the registration builder (`add(path).getByRole(…)`) | absent: it is not exported | a page of its own |
| errors thrown | none (no `@throws`) | every message, from probes |
| completeness | automatic | the coverage check (S8) |

Generation fails here because POMWright's public types are aliases over internal classes (plan 1.9, so that tsup does not
emit a class as a value), `LocatorRegistry` is a `Pick`, and the registration views are unexported; TypeDoc documents
declarations, so it shows the internal names that design hides. The coverage check computes the surface from the
declarations; the pages explain it. TypeDoc adds nothing the coverage check does not already list.

### 2.7 The site

- **Project**: `website/`, a pnpm project of its own like `test/` (`package.json`, `pnpm-lock.yaml`,
  `"packageManager": "pnpm@9.12.0"`, `"private": true`, `"type": "module"`), so Astro and Starlight stay out of the
  library's dependencies and of every library CI job. Content in `website/src/content/docs/{docs,api,internal}/`, the
  example app in `website/snippets/`, the home page `index.mdx` (a splash page with four cards: locators, page objects,
  session storage, reports).
- **Configuration** (appendix A.4): `site: "https://dyhex.github.io"`, `base: "/POMWright"` (confirmed on the first
  deploy), `editLink` to `main/website/`, the GitHub link, Pagefind search (built in), the cut plugin, Mermaid, the sidebar
  file, the links validator.
- **The three sections** (S3): `starlight-sidebar-topics` holds one sidebar per section; a `SiteTitle` override renders
  the sections as tabs beside the title at 50rem and wider, and a short stylesheet hides the plugin's own list there; on
  a phone the tabs are hidden and the menu shows the list.
- **Diagrams**: `astro-mermaid` with `mermaid` 11.x (2.12).
- **While deployed from this branch** (7.26, S20): a `Banner` override shows "These pages document POMWright 3.0.0, which
  is not released yet. For the current release (2.1.0), see the 2.x documentation." on every page, and a `head` entry adds
  `<meta name="robots" content="noindex">`, so search engines do not list docs for a version npm does not serve yet.
  Both are removed in C8, before the merge.
- **Dependencies** (S2, S17): `astro` 7.4.0, `@astrojs/starlight` 0.42.6, `starlight-sidebar-topics` 0.9.0,
  `starlight-links-validator` 0.27.0, `astro-mermaid` 2.1.0, `mermaid` 11.17.2, exact versions as with `vitest`, updated by
  a monthly grouped Dependabot entry for `/website`. Each gets a DECISIONS.md line. Astro 7 needs Node 22.22 or later, so
  the site builds on Node 24, the contributors' and CI's version; the library's Node 20 floor is untouched.
- **Tooling**: biome covers `website/` (config, sidebar, plugin, components, the example app) with `website/.astro`,
  `website/dist` and `test/.doc-snippets` excluded and an override for `*.astro` that turns off `noUnusedImports` and
  `noUnusedVariables` (S10). Markdown is not linted, as decided in plan 4. `.gitignore` gains `test/.doc-snippets/` and
  `website/.astro/`.
- **Commands**: `pnpm -C website install --frozen-lockfile`, `pnpm -C website build` (with the link check),
  `pnpm -C website dev` on port 4391 (the harness keeps 9000).

### 2.8 CI and deployment (7.10 to 7.12)

- **Pull requests and `main`** (Part C): `ci-changes.sh` reports two outputs, `code` (a change outside `website/` that is
  not `*.md`) and `site` (a change under `website/`, or `code`); `package` runs on either, `harness` on `code`, a new
  `site` job on `site`: it downloads the tarball (no second build, AGENTS.md section 8), extracts it, installs `test/`,
  runs the snippet and coverage checks, installs and builds `website/` on Node 24, which validates every link. A docs-only
  change runs lint, package and site, and skips every harness job. The gate `build` is unchanged. Until Part C, Part A
  makes `website/**` count as code, so content changes run the harness, whose type check runs the snippet check.
- **Deployment** (`pages.yaml`, appendix A.8): a build job (checkout, pnpm 9.12.0, Node 24, frozen install of
  `website/`, build, `actions/upload-pages-artifact`) and a deploy job (`environment: github-pages`,
  `actions/deploy-pages`), `permissions: contents: read, pages: write, id-token: write`, every action pinned to a commit
  with its version in a comment (S11) and kept current by the existing Dependabot entry; the same build steps as the PR's
  site job, so what deploys is what CI built.
  - **While this branch is tested** (from C3): it runs on every push to `chore/bugfixes-quality-improvements-and-docs`
    and by `workflow_dispatch`. You allowed the branch in the `github-pages` environment (S16).
  - **From the merge on** (C8): it runs after `CI` succeeds on a push to `main` (`workflow_run`, with Publish's guard:
    success, a push, `main`, this repository), so every merge updates the site once its checks, the snippet and link
    checks included, have passed; and by `workflow_dispatch`. Docs improve between releases. Since nothing is merged to
    `main` before it is ready to release, the site is ahead of npm only until the Version Packages pull request is merged.
  - Rejected: deploying at publish only (docs improvements would wait for a release); a release or tag trigger (S11:
    the changesets action creates releases with `GITHUB_TOKEN`, so no workflow would start).
- **Yours**: Pages is enabled with "GitHub Actions" as the source, and the branch is allowed in the environment (done,
  S16). After the merge, remove the branch from the `github-pages` environment's deployment branches.

### 2.9 README, release notes, changesets and the frozen docs

- **README** (7.15): rewritten last in Part C, after the site exists: what POMWright is, the idea behind it (one locator
  per path, chains built by the registry, page objects that verify themselves at fixture setup) and what it solves,
  stated objectively, without over- or under-selling; installation and one short example; then links to the site's
  Getting started, the API and *Upgrading from 2.x*, and one line for 2.x users linking the 2.x docs at the tag
  (`https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v2`). It links to the docs rather than restating them. This fixes
  the analysis's README bullets by replacement.
- **Release notes** (7.21): [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md) keeps a short description of each change and
  loses every *Migration* paragraph and the *Upgrade checklist* section, which become a link to *Upgrading from 2.x*. Done
  in Part A when the page exists.
- **Changesets**: the existing ones stay as they are. Three new ones: `helper-step-locations` (`patch`, F1, Part A),
  `doc-comments` (`patch`, the hovers, Part B), and `documentation-site-and-upgrade-guide` (`major`, Part C, 7.22): where
  the documentation lives now, links to Getting started and *Upgrading from 2.x*, and that the 2.x docs stay in the
  repository at the tag. Its file name sorts before every other changeset, so it is the first item of the 3.0.0 changelog
  entry and of the GitHub release (S19); its bump type does not change the version, which is a major anyway.
- **CHANGELOG.md** stays generated and untouched.
- **`docs/v2`, `docs/v1`, `docs/v1-to-v2-migration`** stay frozen in the repository; the site and the README link them at
  the tag.
- **`docs/v3`** is context for Parts A and B and is deleted at the end of Part B.
- **AGENTS.md** gains a *Documentation* section (where pages live, the writing and example rules of 2.4, the snippet
  conventions, the checks, the doc comment rule, deployment, the pre-merge checklist).
- **`release-3.0.0/`** (7.27): in C8 every Markdown file of it except the `handover-plan-*` folders and
  `PLAN-5-DOCS-samples/` is copied to `/home/magdys/jottacloud/knowledgeVault/POMWright/release-3.0.0/`, and the folder is
  deleted from the repository. Links between the copied files keep working; links to `../src` and other repository paths
  do not.

### 2.10 Size and split (7.1)

About 50 pages (24 Docs, 14 API, 12 Internal), about eight diagrams, doc comments for every public member, two check
scripts, the site project, CI and deployment: three executions of this one plan.

| # | part | what | ends with |
| --- | --- | --- | --- |
| 11 | A | F1, the snippet check and example app, the Docs section (24 pages), *Upgrading from 2.x*, the release notes slimmed | every Docs page compiled and probed; ledgers |
| 12 | B | the doc comments, the API section (14 pages), the coverage check, the Internal section (12 pages), `docs/v3` deleted | the reference and the hovers complete; ledgers |
| 13 | C | the site project with Mermaid, banner and `noindex`, CI's site job, `pages.yaml` from this branch, the docs changeset, the README | the site built on every pull request and deployed from this branch; ledgers |
| | C8 | run when you say the branch is ready to merge: the trigger switched to `main`, banner and `noindex` removed, `release-3.0.0/` moved to the vault | the branch ready for `main` |

The decisions are taken once, here; each part is executed after the previous one, with its own commits and ledger step.
The site stays last; until Part C the pages and diagrams are previewed in a scratchpad copy of the prototype.

### 2.11 F1: the helpers' steps point at the test (7.17)

The navigation steps (`LoginPage: Navigate to this Page`, `… Expect this Page`, …) and the session storage steps
(`Auth.SessionStorage.set:`, …) are `test.step` calls inside POMWright. The report and the trace show a navigation step's
location in POMWright's bundle (`…/pomwright/dist/index.js:2320`) and a session storage step's as none, while a `@step` row
shows the test's line. A failure inside them is already reported at the test's line (S15); only the step's own location is
wrong. Fix: pass `{ box: true }` to these `test.step` calls, which reports a step at its caller and keeps its inner steps
(S15, verified for navigation; session storage verified in A1). Unit tests assert the option with `test.step` mocked, as
`stepDecorator.test.ts` does; a runner probe on the final build reads the locations. A `patch` changeset,
`helper-step-locations`. Rejected: a `location` built from the call site (same result, a stack parse more).

### 2.12 Diagrams (7.23)

Mermaid through `astro-mermaid` (S17): readable text, both themes, and the same source renders on GitHub and in Obsidian.
The cost is about 3.7 MB of JavaScript, fetched only on a page with a diagram, and rendering in the browser. `mermaid` is
pinned to 11.x, the range `astro-mermaid` 2.1.0 supports. The diagrams, each checked against the code like the text:

| diagram | kind | page |
| --- | --- | --- |
| a path and the chain it resolves to | flowchart | `resolving-locators` (and the first page) |
| from `add` to a `Locator`: the record, the copies, resolution | flowchart | `locator-paths`, `internal/resolution` |
| a page object's first moments: construction, the scheduled definition and verification, the first use | sequence | `page-objects`, `internal/page-object-lifecycle` |
| a query: the private copy, `update`/`replace`/`skip`, the untouched registry | flowchart | `queries` |
| a frame segment: the `<iframe>` element, `contentFrame()`, the descendants | flowchart | `frames` |
| a URL against `baseUrl` and `urlPath`: origin and the rest | flowchart | `urls-and-navigation`, `internal/url-matching` |
| a seeded navigation: the route, the writer document, the app's first script | sequence | `seeding-session-storage`, `internal/seed-registry` |
| the modules and what is public | flowchart | `internal/index` |

A diagram has a sentence before it saying what it shows, at most about a dozen nodes, the theme's colours only, and text
that says the same (a reader of the text loses nothing).

### 2.13 Hovers: doc comments as the reference in the editor (7.24)

Playwright's declarations carry, per member, a description, every parameter, the return value and an example, so its API
can be read from the editor. POMWright's do not yet (S18). In Part B every export and every public or protected member
gets a doc comment written with its API page from the same verified facts: a summary, `@param` for each parameter (nested
options described), `@returns` where the type does not say it, `@throws` with the message for each error, and an
`@example`. The gaps that S18 names close: `PageObject`'s properties and accessors, `NavigationFor`'s methods (documented on
the type a consumer hovers, not only on the internal class), the option types. The coverage check fails on a missing
summary or `@param`. Comment-only, but what a user sees in the editor changes: a `patch` changeset, `doc-comments`. A
contradiction found on the way is settled by the code and its tests (7.16).

---

## 3. Samples

In [PLAN-5-DOCS-samples/](PLAN-5-DOCS-samples/README.md), each as it would ship, revised after the review:

- [docs/first-page-object.md](PLAN-5-DOCS-samples/docs/first-page-object.md), Getting started: a login page, its paths, the
  page object, what a path resolves to (beside the hand-written Playwright chain), a first test that creates the page
  object itself, with a note that the next page makes it a fixture, as every later example uses it.
- [docs/resolving-locators.md](PLAN-5-DOCS-samples/docs/resolving-locators.md), concept: `getNestedLocator` for every
  element you act on; `getLocator` as the path's own locator for a chain you build yourself (a dialog outside the path) or
  a filter, with the strict mode error it meets on its own; unregistered segments; what the report shows.
- [api/class-pageobject.md](PLAN-5-DOCS-samples/api/class-pageobject.md), API: `PageObject` in Playwright's form.
- [api/class-locatorquerybuilder.md](PLAN-5-DOCS-samples/api/class-locatorquerybuilder.md), API: the second class of the
  comparison, beside TypeDoc's output in [typedoc/](PLAN-5-DOCS-samples/typedoc/).

Verified: the 26 `ts` blocks compile against the packed package with `declaration: true` (S7); every chain, description
and message they print was read back in chromium (S9, S23); the four pages build in the prototype with every link and
anchor valid (S3, S4). Screenshots of the prototypes, in the session scratchpad
`/tmp/claude-1000/-home-magdys-workspace-dyhex-POMWright/df718f57-6b50-4737-8b59-954c1e1f3ebb/scratchpad/shots/`:
`13-final-desktop.png` and `14-final-phone-menu.png` (the layout), `01`, `02`, `03` and `05` (the first versions of the
samples), `04`, `06`, `07` and `12` (TypeDoc's pages), `15-d2-*` and `16-mermaid-*` (S17), `17-prerelease-banner.png`
(S20).

---

## 4. Implementation steps

### Part A (plan 11): F1, the snippet check, the Docs section

1. F1 (2.11): `{ box: true }` on the navigation and session storage steps; unit tests first (red); the runner probe on the
   final build; changeset `helper-step-locations` (`patch`).
2. `scripts/check-doc-snippets.mjs` (appendix A.1) and the example app in `website/snippets/`; `pnpm typecheck` and
   `pack-test.sh` run it after the two `tsc` passes; `.gitignore` `test/.doc-snippets/`; biome excludes it and covers
   `website/snippets/`; `ci-changes.sh` counts `website/**` as code.
3. Getting started (four pages, from the sample) and *Principles*.
4. The Locators group (eleven pages), with their diagrams.
5. Page objects, session storage, reports, TypeScript (seven pages), with their diagrams.
6. *Upgrading from 2.x* (7.21); RELEASE-NOTES-3.0.0.md loses its *Migration* paragraphs and its checklist, which become a
   link to the page.
7. Verification (section 5).
8. Ledgers (section 6).

### Part B (plan 12): doc comments, the API and Internal sections

1. API pages and the doc comments of the same members: `PageObject`, the registry and its accessors, the registration
   builder, the query and update builders, seeds (from the samples).
2. API pages and doc comments: navigation, session storage, the logger, fixtures, `step`, types; *Error messages*; the API
   index; `scripts/check-api-coverage.mjs` (appendix A.2, extended to doc comments, reading the extracted tarball's
   declarations in CI) in `pnpm typecheck`; changeset `doc-comments` (`patch`).
3. Internal pages (twelve), with their diagrams.
4. `docs/v3` deleted; references to it in AGENTS.md and the release notes updated.
5. Verification.
6. Ledgers.

### Part C (plan 13): the site

1. `website/` (appendix A.3 to A.7), its lockfile, the home page, the stylesheet, Mermaid, the banner and `noindex`; biome's
   excludes and `.astro` override; `.gitignore`. The site builds with every link valid and the diagrams render.
2. CI: `ci-changes.sh` outputs `code` and `site`; `checks.yaml` runs `package` on either and the new `site` job;
   Dependabot's `npm` entry for `/website`.
3. `pages.yaml` (appendix A.8) triggered from this branch; the first deploy; the site checked at
   `https://dyhex.github.io/POMWright/` (base, links, search, diagrams, banner, `noindex`).
4. Changeset `documentation-site-and-upgrade-guide` (`major`).
5. README (2.9).
6. Verification, plus `actionlint` from the scratchpad (not a dependency) over the workflows.
7. Ledgers, with AGENTS.md's *Documentation* section and the pre-merge checklist of C8.
8. **Pre-merge, when you say the branch is ready for `main`** (7.27): `pages.yaml` switched to `workflow_run` on `CI`
   for `main` plus `workflow_dispatch`; the banner and `noindex` removed; the site rebuilt and checked without them;
   `release-3.0.0/`'s Markdown copied to the vault (2.9) and the folder deleted; AGENTS.md rewritten without it (the 3.0.0
   workflow section, the repository map, the rules that cite it); memory notes updated. Yours afterwards: remove the branch
   from the `github-pages` environment.

## 5. Verification

Each part, before its ledger step: `pnpm format`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `pnpm pack-test
--reporter=line` (three browsers, with the snippet check, and from Part B the coverage check, in its type check); from
Part C, `pnpm -C website build`. Per page, while writing: every chain, description and message is read from a Node probe
against a scratchpad clone's `dist/index.js` or, for runner behaviour (report rows, fixtures, steps, navigation, `seed`),
from a temporary spec with its own config in the clone; every diagram is compared with the code it shows; every page is
rendered and link-checked in a scratchpad copy of the prototype site (Parts A and B); every example that exports
something passes `declaration: true` (the check's default); every doc comment of Part B is read back as a hover through
the TypeScript language service in a consumer-shaped clone. For Part C: a pull request shows the `site` job building the
site; a docs-only push skips the harness and runs the site job; a push to the branch deploys, and the deployed pages
carry the banner and `noindex`; in C8, the switched trigger is checked with `actionlint` and the built site without the
banner and `noindex`.

## 6. Versioning and ledgers

- Changesets: `helper-step-locations` (`patch`, Part A), `doc-comments` (`patch`, Part B),
  `documentation-site-and-upgrade-guide` (`major`, Part C). The pages themselves need none.
- Recorded now, with the agreed decisions (2026-10-16): DECISIONS.md's *Plans 11 to 13* section, replacing the 2026-10-06
  rows on `docs/v3` and on the site as release work; RELEASE-NOTES-3.0.0.md's documentation items as *[planned]*; PLANS.md
  rows 11 to 13, "written 2026-10-16, decisions taken, awaiting implementation"; AGENTS.md section 6 rule 7 replaced and
  its plan row updated.
- Each part's ledger step: PLANS.md row, this plan's execution note, DECISIONS.md execution-time rows, AGENTS.md.
- Part A: the analysis's section 5 bullets of `overview.md`, `locator-registry.md`, `logging.md`,
  `composing-locator-modules.md` and AGENTS.md ticked *Fix* with the page that replaces them (1.3); D1 and D3 noted;
  AGENTS.md's *Documentation* section begins and section 6 rule 4 points at `website/src/content/docs`; the release notes'
  F1 item done.
- Part B: the release notes' *Documentation* section rewritten from the `docs/v3` entries to the new sections; the hover
  item done.
- Part C: the README bullets ticked; the release notes' site items done; AGENTS.md sections 2, 3, 7 and 8 and the
  pre-merge checklist.
- C8: the ledgers leave the repository with `release-3.0.0/`; AGENTS.md carries what stays true without them.

## 7. Decisions

Taken on 2026-10-16.

- [x] 7.1 **Split**: one plan file, three executions: 11 = Part A, 12 = Part B, 13 = Part C, and the pre-merge step C8.
  Rejected: one execution; two (content, site).
- [x] 7.2 **Information architecture**: the page map of 2.3 (24 + 14 + 12 pages), flat URLs, the grouping in the
  sidebar. Rejected: URLs by group.
- [x] 7.3 **Where it lives**: `website/`, its own pnpm project; pages in `website/src/content/docs/` from Part A on;
  `docs/v3` deleted at the end of Part B; `docs/v2` and `docs/v1*` frozen, linked at the `v2.1.0` tag. Rejected: `site/`
  or `docs-site/`; restructuring `docs/v3` first and moving it in Part C.
- [x] 7.4 **Three sections**: `starlight-sidebar-topics` with the header tab list through the `SiteTitle` override and
  the plugin's list hidden at 50rem and wider (S3). Rejected: the plugin's list only; plain sidebar groups.
- [x] 7.5 **API reference**: hand-written in Playwright's form, completeness checked by `check-api-coverage.mjs` (2.6).
  Rejected: `starlight-typedoc`; generated pages as an appendix; TypeDoc tags in the source.
- [x] 7.6 **Examples**: `check-doc-snippets.mjs` with the conventions of 2.5, in `pnpm typecheck` and the site job (S7).
  Rejected: Twoslash (not prototyped: it type-checks while the site builds, so the site would depend on the packed package
  and check only at the Playwright version the site pins, and its hovers show the editor's quick info, which names the
  internal builder types S6 met); by hand.
- [x] 7.7 **Printed chains and messages**: read from probes when written; an AGENTS.md rule to grep `website/` and the
  doc comments when a message, rendering or mechanism changes; no automated runtime check for 3.0.0.
- [x] 7.8 **Links**: root-absolute with the base, validated with anchors by `starlight-links-validator` (S4). Rejected:
  relative links with the validator's relative-link check off.
- [x] 7.9 **Versions**: version 3 only; no `starlight-versions`; no "Added in" markers in 3.0.0, markers from the first
  3.x addition on. Rejected: markers back to 2.0.0.
- [x] 7.10 **Deployment trigger**: `pages.yaml` deploys from this branch on every push and by `workflow_dispatch` while
  the branch is tested; from C8 on, after every green `CI` on `main` (`workflow_run` with Publish's guard) and by
  `workflow_dispatch`, so docs improve without a release. Replaces the recommendation to deploy at publish. Rejected:
  publish only; a release or tag trigger (S11).
- [x] 7.11 **Deploy steps**: own pinned steps shared with the PR's site job, `actions/upload-pages-artifact` v5.0.0 and
  `actions/deploy-pages` v5.0.1 by commit. Rejected: `withastro/action` v6.1.3.
- [x] 7.12 **CI**: `code` and `site` outputs; `package` on either, `harness` on `code`, `site` on `site`; Node 24 for the
  site; Part A counts `website/**` as code until Part C.
- [x] 7.13 **Tooling and dependencies**: biome over `website/` with its excludes and the `.astro` override; Markdown not
  linted (plan 4); the site's six dependencies at exact versions (2.7) with a DECISIONS.md line each; a monthly grouped
  Dependabot `npm` entry for `/website`; nothing added to the library or the root project. Rejected: caret ranges; no
  Dependabot entry.
- [x] 7.14 **Writing rules**: section 2.4, recorded in AGENTS.md.
- [x] 7.15 **README**: rewritten last in Part C (2.9): objective, what POMWright is, the idea and what it solves, links to
  the docs instead of restating them, the 2.x docs at the tag. Rejected: typo fixes only; the rewrite in Part A.
- [x] 7.16 **Source of truth**: the code and its tests decide; a doc comment or an API page that disagrees with them is
  corrected (a comment in `src/`, a page in `website/`), never one to match the other. Replaces the wording "corrects the
  ones that contradict their API page".
- [x] 7.17 **F1 fixed** (2.11): `{ box: true }` on the navigation and session storage steps, Part A's first step, with unit
  tests and a `patch` changeset. Rejected: a `location` from the call site; leaving it for later.
- [x] 7.18 **Ledgers**: as in section 6.
- [x] 7.19 **Examples use fixtures** (2.4, S21, S22): the first page creates its page object in the test once and says
  so; from *Page objects in tests* on, every example in a test receives page objects as fixtures; a shared example app in
  `website/snippets/` makes `./fixtures` and `./login.page` importable from every page in the snippet check. Rejected:
  hidden `declare const loginPage` preludes for test code.
- [x] 7.20 **Order of sources**: the implementation and its tests, then the `release-3.0.0` documents and the changesets,
  then `docs/v3` for context only.
- [x] 7.21 **Upgrading from 2.x**: one Docs page holds every migration step, each self-contained (what changed and why,
  the grep, before and after, the concept page); RELEASE-NOTES-3.0.0.md keeps short descriptions and links to the page
  instead of its *Migration* paragraphs and checklist; the existing changesets stay as they are.
- [x] 7.22 **Docs changeset**: `documentation-site-and-upgrade-guide` (`major`), the first item of the 3.0.0 changelog
  entry and GitHub release (S19), written in Part C. Rejected: `patch` (line 376 of about 400).
- [x] 7.23 **Diagrams**: Mermaid through `astro-mermaid` 2.1.0 with `mermaid` 11.17.2, about eight diagrams (2.12).
  Rejected: D2 through `astro-d2` (S17); hand-drawn SVG.
- [x] 7.24 **Hovers** (2.13): doc comments for every export and public or protected member with summary, `@param`,
  `@returns`, `@throws` and `@example`, written with the API pages in Part B; the coverage check enforces summary and
  `@param`; a `patch` changeset, `doc-comments`.
- [x] 7.25 **`getLocator`**: documented as the path's own locator for chains built by hand and for filters, with
  `getNestedLocator` for every element acted on or asserted; no "unique on the page" advice (sample, S23).
- [x] 7.26 **Pre-release measures**: while deployed from this branch, a banner on every page pointing 2.x users at the 2.x
  docs, and `noindex`; removed in C8 (S20).
- [x] 7.27 **Pre-merge step C8**: the trigger switched to `main`, the banner and `noindex` removed, `release-3.0.0/`'s
  Markdown (without the handovers and the samples) copied to `/home/magdys/jottacloud/knowledgeVault/POMWright/release-3.0.0/`
  and the folder deleted from the repository, AGENTS.md rewritten without it; run when you say the branch is ready.

## 8. Execution order

One commit per step, the message style of `git log`, the body ending with "Plan: release-3.0.0/PLAN-5-DOCS.md,
execution step A1." (A1 to A8, B1 to B6, C1 to C8) and the `Co-Authored-By` trailer. Each content step runs
`pnpm lint`, `pnpm harness:install` and `pnpm typecheck` (which includes the snippet check) before its commit, and its
pages are rendered and link-checked in the scratchpad prototype. Part A: A1 to A8. Part B: B1 to B6. Part C: C1 to C7;
C8 when you say so. Nothing is pushed.

---

## Appendix A. The prototype files

Verified in the scratchpad (S3, S7, S8, S10, S12, S17, S20, S22); quoted here with spaces, committed biome-formatted
(tabs). The versions to commit may differ in comments and naming.

### A.1 `scripts/check-doc-snippets.mjs`

```js
// Type-checks every TypeScript code block of the documentation against the packed package, as a consumer compiles
// it: the harness's compiler options (strict, noUncheckedIndexedAccess, verbatimModuleSyntax) plus declaration: true.
//
//   node scripts/check-doc-snippets.mjs            # after `pnpm harness:install`
//
// Each page is one small project: a block with title="name.ts" is that file and can be imported by the page's other
// blocks ("./name"); an untitled block is a module of its own. Lines up to and including `// ---cut---` are compiled
// but not shown on the site. A block whose meta says `nocheck` is skipped and listed. Errors are reported at the page
// line they come from. The files of website/snippets/ (the docs' example app: page objects and fixtures) are part of
// every page's project unless the page has a block with the same title, so an example can import "./fixtures".

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const contentDir = path.join(root, "website/src/content/docs");
const outDir = path.join(root, "test/.doc-snippets");
const sharedDir = path.join(root, "website/snippets");
const shared = fs.existsSync(sharedDir) ? fs.readdirSync(sharedDir).filter((name) => name.endsWith(".ts")) : [];
const fence = /^(\s*)(`{3,})(\w*)(.*)$/;

function pages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pages(full);
    return /\.mdx?$/.test(entry.name) ? [full] : [];
  });
}

function blocks(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const open = fence.exec(lines[i]);
    if (!open) continue;
    const [, indent, ticks, lang, meta] = open;
    const body = [];
    let j = i + 1;
    while (j < lines.length && !(lines[j].startsWith(indent + ticks) && lines[j].trim() === ticks)) {
      body.push(lines[j].startsWith(indent) ? lines[j].slice(indent.length) : lines[j]);
      j++;
    }
    if (lang === "ts" || lang === "typescript") {
      found.push({ line: i + 2, meta, body: body.join("\n") });
    }
    i = j;
  }
  return found;
}

fs.rmSync(outDir, { recursive: true, force: true });
const origin = new Map(); // snippet file -> { page, line }
let checked = 0;
const skipped = [];

for (const page of pages(contentDir)) {
  const rel = path.relative(contentDir, page).replace(/\.mdx?$/, "");
  const titles = new Set();
  for (const block of blocks(page)) {
    const where = `${path.relative(root, page)}:${block.line - 1}`;
    if (/\bnocheck\b/.test(block.meta)) {
      skipped.push(where);
      continue;
    }
    const title = /title="([^"]+\.ts)"/.exec(block.meta)?.[1];
    if (title && titles.has(title)) throw new Error(`${where}: a second block titled ${title} on one page`);
    if (title) titles.add(title);
    const name = title ?? `snippet-${block.line}.ts`;
    const target = path.join(outDir, rel, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${block.body}\n`);
    origin.set(path.relative(root, target), { page: path.relative(root, page), line: block.line });
    checked++;
  }
  for (const name of shared) {
    if (titles.has(name)) continue;
    const target = path.join(outDir, rel, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(sharedDir, name), target);
  }
}

fs.writeFileSync(
  path.join(outDir, "tsconfig.json"),
  JSON.stringify(
    { extends: "../tsconfig.json", compilerOptions: { declaration: true, noEmit: true }, include: ["**/*.ts"] },
    null,
    "\t",
  ),
);

try {
  execFileSync(path.join(root, "node_modules/.bin/tsc"), ["-p", path.relative(root, outDir), "--pretty", "false"], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  console.log(`doc snippets: ${checked} checked, ${skipped.length} skipped (nocheck)`);
  for (const where of skipped) console.log(`  nocheck: ${where}`);
} catch (error) {
  const report = String(error.stdout).replace(
    /^(test\/\.doc-snippets\/[^(]+)\((\d+),(\d+)\)/gm,
    (all, file, line, col) => {
      const from = origin.get(file);
      return from ? `${from.page}:${from.line + Number(line) - 1}:${col} (${file})` : all;
    },
  );
  console.error(report);
  console.error(`doc snippets: type errors in ${checked} checked blocks`);
  process.exit(1);
}
```

Known at execution: `tsc` reports only syntax errors when there are any, so a block that does not parse hides the type
errors of the others until it is fixed (S7 met this over `docs/v3`); the output says so.

The example app, as prototyped (S22), `website/snippets/fixtures.ts`:

```ts
import { test as base } from "pomwright";
import { LoginPage } from "./login.page";

export { expect } from "@playwright/test";

export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

and `website/snippets/login.page.ts`, the first page's `LoginPage` with `@step` on `logIn`.

### A.2 `scripts/check-api-coverage.mjs`

```js
// Checks that the hand-written API reference covers the public surface: every export of the published declarations
// (dist/index.d.ts) has an API page or a section (`title:` or a `## Name` heading), and every public or protected
// member of an exported class, interface or object type has a `### member` heading on that page.
//
//   node scripts/check-api-coverage.mjs            # after `pnpm build`

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const declarations = path.join(root, "dist/index.d.ts");
const apiDir = path.join(root, "website/src/content/docs/api");

const program = ts.createProgram([declarations], { strict: true, skipLibCheck: true, noEmit: true });
const checker = program.getTypeChecker();
const module = checker.getSymbolAtLocation(program.getSourceFile(declarations));

const surface = new Map(); // export -> members
for (const exported of checker.getExportsOfModule(module)) {
  const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
  const declaration = symbol.declarations?.[0];
  let type;
  if (symbol.flags & ts.SymbolFlags.Class) type = checker.getDeclaredTypeOfSymbol(symbol);
  else if (symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias))
    type = checker.getDeclaredTypeOfSymbol(symbol);
  const members = [];
  const callable = type && checker.getSignaturesOfType(type, ts.SignatureKind.Call).length > 0;
  if (type && !callable && !(type.flags & ts.TypeFlags.Union)) {
    for (const property of checker.getPropertiesOfType(type)) {
      const modifiers = ts.getCombinedModifierFlags(
        property.valueDeclaration ?? property.declarations?.[0] ?? declaration,
      );
      if (modifiers & ts.ModifierFlags.Private || property.name.startsWith("#") || property.name.startsWith("__"))
        continue;
      members.push(property.name);
    }
  }
  surface.set(exported.name, members);
}

const pages = fs.readdirSync(apiDir, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".md"));
const owner = new Map(); // export -> page headings
for (const entry of pages) {
  const text = fs.readFileSync(path.join(apiDir, entry.name), "utf8");
  const title = /^title: "?([^"\n]+)"?$/m.exec(text)?.[1];
  const h3 = new Set([...text.matchAll(/^### ([\w.#$]+)(?:\(\))?\s*$/gm)].map((match) => match[1]));
  const names = [title, ...[...text.matchAll(/^## ([\w$]+)\s*$/gm)].map((match) => match[1])];
  for (const name of names) if (name) owner.set(name, { page: entry.name, h3 });
}

let missing = 0;
for (const [name, members] of [...surface].sort()) {
  const found = owner.get(name);
  if (!found) {
    console.log(`missing export: ${name}`);
    missing++;
    continue;
  }
  for (const member of members) {
    if (!found.h3.has(member)) {
      console.log(`missing member: ${name}.${member} (${found.page})`);
      missing++;
    }
  }
}
console.log(`api coverage: ${surface.size} exports, ${missing} missing`);
process.exit(missing ? 1 : 0);
```

Known at execution: an interface with a call signature and properties (`UrlMatcher`) has its properties skipped by the
`callable` rule; Part B checks properties whenever there are any, takes the declarations path as an argument for CI
(`.pack/pomwright/dist/index.d.ts`), and adds the doc comment rule of 2.13 with `getDocumentationComment` and
`getJsDocTags`, as S18's probe read them.

### A.3 `website/plugins/expressive-code-cut.mjs`

```js
// Expressive Code plugin: hides the compile-only prelude of a TypeScript block, everything up to and including a
// `// ---cut---` line, which scripts/check-doc-snippets.mjs compiles with the rest of the block.
export default function pluginCut() {
  return {
    name: "pomwright-cut",
    hooks: {
      preprocessCode({ codeBlock }) {
        if (codeBlock.language !== "ts" && codeBlock.language !== "typescript") return;
        const cut = codeBlock.getLines().findIndex((line) => line.text.trim() === "// ---cut---");
        if (cut >= 0) codeBlock.deleteLines([...Array(cut + 1).keys()]);
      },
    },
  };
}
```

### A.4 `website/astro.config.mjs` and `website/sidebar.mjs`

```js
// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import mermaid from "astro-mermaid";
import starlightLinksValidator from "starlight-links-validator";
import starlightSidebarTopics from "starlight-sidebar-topics";
import pluginCut from "./plugins/expressive-code-cut.mjs";
import { topics } from "./sidebar.mjs";

export default defineConfig({
  site: "https://dyhex.github.io",
  base: "/POMWright",
  integrations: [
    mermaid({ autoTheme: true }),
    starlight({
      title: "POMWright",
      description: "Page objects and locator chains for Playwright.",
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/DyHex/POMWright" }],
      editLink: { baseUrl: "https://github.com/DyHex/POMWright/edit/main/website/" },
      components: {
        SiteTitle: "./src/components/SiteTitle.astro",
        Banner: "./src/components/Banner.astro", // removed in C8
      },
      head: [{ tag: "meta", attrs: { name: "robots", content: "noindex" } }], // removed in C8
      customCss: ["./src/styles/custom.css"],
      expressiveCode: { plugins: [pluginCut()] },
      plugins: [starlightSidebarTopics(topics), starlightLinksValidator()],
    }),
  ],
});
```

```js
// The three sections and their sidebars, in reading order.
export const topics = [
  {
    label: "Docs",
    link: "/docs/installation/",
    icon: "open-book",
    items: [
      {
        label: "Getting started",
        items: ["docs/installation", "docs/first-page-object", "docs/page-objects-in-tests", "docs/organising-a-project"],
      },
      "docs/principles",
      {
        label: "Locators",
        items: [
          "docs/locator-paths",
          "docs/registering-locators",
          "docs/locating-by-id",
          "docs/resolving-locators",
          "docs/filters-and-indices",
          "docs/descriptions",
          "docs/queries",
          "docs/reusing-locators",
          "docs/frames",
          "docs/verifying-registries",
          "docs/locator-modules",
        ],
      },
      { label: "Page objects", items: ["docs/page-objects", "docs/urls-and-navigation"] },
      { label: "Session storage", items: ["docs/session-storage", "docs/seeding-session-storage"] },
      { label: "Reports", items: ["docs/logging", "docs/test-steps"] },
      "docs/typescript",
      "docs/upgrading-from-2x",
    ],
  },
  { label: "API", link: "/api/", icon: "document", items: ["api", "api/class-pageobject", "…the API pages of 2.3"] },
  { label: "Internal", link: "/internal/", icon: "setting", items: ["internal", "…the Internal pages of 2.3"] },
];
```

### A.5 `website/src/components/SiteTitle.astro` and `website/src/styles/custom.css`

```astro
---
import Default from "@astrojs/starlight/components/SiteTitle.astro";

const { topics } = Astro.locals.starlightSidebarTopics;
---
<div class="title-and-tabs">
  <Default><slot /></Default>
  <nav class="topic-tabs" aria-label="Sections">
    {topics.map((topic) => (
      <a href={topic.link} aria-current={topic.isCurrent ? "page" : false}>{topic.label}</a>
    ))}
  </nav>
</div>
<style>
  .title-and-tabs { display: flex; align-items: center; gap: 1.5rem; }
  .topic-tabs { display: none; gap: 1.25rem; }
  .topic-tabs a { color: var(--sl-color-gray-2); text-decoration: none; font-weight: 600; }
  .topic-tabs a[aria-current="page"] { color: var(--sl-color-white); border-bottom: 2px solid var(--sl-color-accent); }
  @media (min-width: 50rem) { .topic-tabs { display: flex; } }
</style>
```

```css
/* The header shows the three sections on wide screens; the sidebar's topic list stays for the phone menu. */
@media (min-width: 50rem) {
  .starlight-sidebar-topics {
    display: none;
  }
}
```

### A.6 `website/package.json` and `website/src/content.config.ts`

```json
{
  "name": "pomwright-website",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev --port 4391",
    "build": "astro build",
    "preview": "astro preview --port 4392"
  },
  "devDependencies": {
    "@astrojs/starlight": "0.42.6",
    "astro": "7.4.0",
    "astro-mermaid": "2.1.0",
    "mermaid": "11.17.2",
    "starlight-links-validator": "0.27.0",
    "starlight-sidebar-topics": "0.9.0"
  },
  "packageManager": "pnpm@9.12.0"
}
```

```ts
import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
```

### A.7 `website/src/components/Banner.astro` (removed in C8)

```astro
---
// While the site is deployed from the 3.0.0 branch: every page says so. Removed before the merge to main.
---
<div class="prerelease">
  These pages document POMWright 3.0.0, which is not released yet. For the current release (2.1.0), see the
  <a href="https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v2">2.x documentation</a>.
</div>
<style>
  .prerelease { padding: 0.5rem 1rem; background: var(--sl-color-orange-low); color: var(--sl-color-orange-high); text-align: center; }
  .prerelease a { color: inherit; font-weight: 600; }
</style>
```

The prototype rendered "the2.x" (the line break before the link collapses); the committed version keeps the space.

### A.8 `.github/workflows/pages.yaml`, the design

Not run yet (Part C runs it); the steps are those of the PR's site job, and the actions those of S11.

```yaml
name: Pages

on:
  # until C8: this branch while it is tested
  push:
    branches: [chore/bugfixes-quality-improvements-and-docs]
  # from C8: after CI succeeds on a push to main
  # workflow_run:
  #   workflows: [CI]
  #   branches: [main]
  #   types: [completed]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    # from C8, as Publish guards itself: success, a push, main, this repository
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha> # v4.4.0, the version checks.yaml pins
      - uses: pnpm/action-setup@<sha> # v4.3.0
        with:
          version: 9.12.0
      - uses: actions/setup-node@<sha> # v4.4.0
        with:
          node-version: 24.x
          cache: pnpm
          cache-dependency-path: website/pnpm-lock.yaml
      - run: pnpm -C website install --frozen-lockfile
      - run: pnpm -C website build
      - uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0
        with:
          path: website/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5.0.1
```
