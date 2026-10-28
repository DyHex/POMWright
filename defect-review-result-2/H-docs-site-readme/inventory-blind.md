# Segment 2H: inventory (blind pass)

Written in pass 1 at `d850405`, before reading anything of the first review. Not edited after pass 1. One line per
item: what it is, where it lives, how it was checked in pass 1 (probe paths are under
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/`).

## The README (`README.md`)

- R1. Badges (CI, docs, npm version, downloads, peer, Node, TypeScript ≥5.0, license, ICE): every badge URL fetched,
  200 (`check-links.mjs`).
- R2. Opening paragraph: one place for locators, chain built from the path, a plain `Locator`, parts work alone: read
  against the site.
- R3. *Example*: `orders.page.ts` (schema with `json<Order[]>()`, five paths, `cancel` and `expectStatus` as `@step`
  methods narrowing a query by `filter(subPath, …)`): run verbatim end to end against a routed app (`readme/`), passes.
- R4. *Example*: `orders.spec.ts` (fixture, `seed`, `log.info`, `goto`, assertions): run verbatim; the `log.info` entry is
  not attached on a first run → **2H-3**.
- R5. The chain text block for the Cancel button and "the report and the trace viewer show by its path": rebuilt
  (`describe("")`) and `toString()` read in the probe; matches.
- R6. The paragraph on `getNestedLocator` and `getLocatorSchema`: consistent with *Resolving locators* and *Queries*.
- R7. The verification error for the broken variant (`OrdersPage: Locator registry verification failed for 1 of 5
  paths: …`) and "fails the fixture before the test body runs": run (`readme/`), message identical, body never ran.
- R8. *The parts on their own* table: each row against its page and API (registry, page objects, session storage,
  logging, steps).
- R9. *Installation*: the npm command, "@playwright/test 1.64 or later (below 2) and Node 20 or later" against
  `package.json` (`peerDependencies`, `engines`).
- R10. *Documentation* links (Getting started, API, Upgrading, Internal) and their one-line summaries: links 200;
  "every change in 3.x a 2.x project meets" → **2H-5**.
- R11. 2.x and 1.x links at the `v2.1.0` tag: 200.
- R12. *Contributing*: the guide and its files; compared with the root `AGENTS.md` (six folders; the README names four,
  `src/` covering its two sub-folders; same commit 6d1de0e wrote both): no finding.
- R13. American spelling in the README: one data string (`"Cancelled"`) noted in 2H-2.

## The pages no area owns

- P1. `index.mdx`: hero, tagline, actions, four cards: links resolve (build) and pages exist; text matches the concept
  pages.
- P2. `docs/installation.md`: requirements, install, import from the root, TypeScript settings (5.0 floor,
  `skipLibCheck`, TS 6 `types`, decorators, `noImplicitOverride`, `declaration: true` with two exceptions, `strict` and
  `noUncheckedIndexedAccess`): the JavaScript runtime-check claim probed (`install/`) → **2H-6**; the rest read against
  `tsconfig.json`, `package.json` and the other pages.
- P3. `docs/principles.md`: the six principles against the concept pages (copies, fail early, runtime checks vs type
  rules, no hidden state); "misspelt" → **2H-2**.
- P4. `docs/organizing-a-project.md`: both base classes, the locator module, `@step` title, folder layouts: run end to
  end against a routed shop (`organizing/`): step title `LoginPage.submit`, malformed `SHOP_URL` message, RegExp-path
  subclass; sound.
- P5. `docs/upgrading-from-2x.md`: every item's 2.x statement against v2.1.0 (a second worktree, built; source read for
  navigation, URLs, lifecycle, storage, logger; a runtime spec for locators, steps and logger, `upgrade/rt2/`); every
  3.x message and chain against the build (`upgrade/rt3/messages.mjs`); completeness by compiling a 2.x consumer
  against 2.x, 3.0.1 and d850405 (`upgrade/consumer.ts`) → **2H-4**, **2H-5**.
- P6. `docs/typescript.md` (with 2F): the type table against the declarations (type parameters) and `index.ts` (every
  exported type present); "misspelt" → 2H-2. TS2883 and TS4023 texts not re-run (2F's).
- P7. `api/index.md`: every one of the 40 exports in a row, links resolve.
- P8. `internal/index.md`: terms, the module table against `src/`, the flowchart (rendered, looked at in dark and
  light).
- P9. `internal/documentation.md`: what keeps the docs true, building and publishing, against `package.json`,
  `pack-test.sh`, `checks.yaml`, `pages.yaml`, `website/package.json` → **2H-1**.

## Every page, across pages

- X1. One contract stated twice: the `log` fixture's levels (README vs *Logging*, *Page objects in tests*, the doc
  comment) → 2H-3; where a broken page object fails (README, *Principles*, *Page objects*, *Page objects in tests*,
  *Upgrading*): consistent; runtime checks for JavaScript (*Installation* vs *Session storage*, *Principles*) → 2H-6;
  `createRegistryWithAccessors<string>` for 2.x code (*Paths and the registry* vs *Upgrading*) → 2H-5.
- X2. Broad claims ("always", "never", "every", "exactly", "identical"): swept over every Docs page and the README;
  checked the ones that cross areas.
- X3. Language conventions (`website/AGENTS.md`): American spelling → 2H-2; no "simply"/"just" or marketing words
  (none); a `title` and a quoted `description` on every page (all 52); root-absolute links with the base and a trailing
  slash (all); `*.example` hosts in examples.
- X4. "Added in" markers: the six exports new since 3.0.1 each have `Added in: v3.0.2` under their heading, and the API
  index links that section; no new public member or option since 3.0.1 (declarations of 3.0.1 from npm diffed against
  d850405).
- X5. Links: internal links and anchors (the build); every external link and every playwright.dev anchor
  (`check-links.mjs`): all resolve except `blob/main/website/AGENTS.md`, which exists on this branch only (resolves at
  the merge), and npmjs.com, which refuses scripted requests.
- X6. The order a reader meets things: sidebar order against each page's *What's next* and the README's
  *Documentation* line; consistent.
- X7. What a new user needs that no page says: looked for while reading the Getting started pages; nothing beyond the
  findings.

## The site itself

- S1. `astro.config.mjs` (base, site, link validator, Mermaid, edit link, components, CSS, plugin), `sidebar.mjs`,
  `content.config.ts`, `website/package.json` (exact versions, ports 4391 and 4392): read; match `website/AGENTS.md`
  and *Internal → Documentation*.
- S2. `plugins/expressive-code-cut.mjs`: hides up to `// ---cut---` in `ts`/`typescript` blocks; the snippet check
  compiles both labels, so nothing hidden goes uncompiled.
- S3. `components/SiteTitle.astro`, `styles/custom.css`: rendered (`render/render.mjs`): 52 pages × light/dark ×
  390/1440 px: no horizontal page overflow, no console error, no broken image, the current section's tab marked on every
  page.
- S4. `snippets/` (the example app): matches what *Internal → Documentation* and `website/AGENTS.md` say of it.
- S5. The built site (`website/dist`): 52 pages and a 404 page, canonical URLs, sitemap; the moved page
  (`organising-a-project` → `organizing-a-project`) has no redirect, as 3e37c74 decided.
- S6. Diagrams: sampled by eye in dark and light (sequence diagram on *Page objects*, flowchart on *Internal*, a chart
  on *Performance*): legible.

## Examples run end to end

- E1. README example (R3, R4, R7).
- E2. *Your first page object*: the page object and test against a routed login page (`firstpo/`), and the trace viewer
  opened on its trace (show-trace on 127.0.0.1:9323): action title, Call tab and Log tab as the page says.
- E3. *Organizing a project* (P4).
- E4. The upgrade guide's 3.x messages and chains (P5).

## The change set (`v3.0.1..d850405`, README and `website/`)

- C1. 92 commits touch README or `website/` (`git log v3.0.1..HEAD -- README.md website`); read the diffs of the unowned pages, the README and the site config since
  v3.0.1; the commits after 54cdada first. New since 54cdada and reviewed here: a49709d (README example) → 2H-3;
  3e37c74 (spelling) → 2H-2; 429f2c2, f866325 (checks, CI) → 2H-1; f422b77 (storage types) → 2H-4; 49454c6, e571381
  (registry type argument, upgrade guide rewrite) → 2H-5; ff8a2ac, 2449c6a, 6d1de0e, 9923a9f: no finding.
