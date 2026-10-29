# Documentation

How the site, the README and the doc comments in `src/` are written and checked. Claude Code loads this file when it
reads a file under `website/`; with another client, read it before working there. Read it before changing the README or
a doc comment, adding an export or a public member, changing a message, a chain or a rendering a page shows, or changing
`scripts/check-*.mjs` too. Part of the contributor guide that the root [AGENTS.md](../AGENTS.md) indexes; its rules
apply here too.

## Files

The documentation site's content (below): `src/content/docs/docs/`, the Docs section (Getting started, Principles, one
page per concept, *Upgrading from 2.x*); `src/content/docs/api/`, the API reference (one page per class or group,
`errors` and the index); `src/content/docs/internal/`, how POMWright works (`performance` among them); `snippets/`, the
docs' example app (`login.page.ts`, `account.page.ts`, `orders.page.ts`, `checkout.page.ts`, `fixtures.ts`) that every
page's examples import. Around them the Starlight site, a pnpm project of its own (`package.json`, `pnpm-lock.yaml`,
exact versions): `astro.config.mjs` (base `/POMWright`, the link check, Mermaid, the edit links to `main`),
`sidebar.mjs` (the three sections), `plugins/expressive-code-cut.mjs` (hides an example's `// ---cut---` prelude),
`src/components/SiteTitle.astro` (the sections as tabs), `src/styles/custom.css`, `src/content/docs/index.mdx` (the home
page).

## Rules

- The documentation is the Starlight site in `website/`, served at `https://dyhex.github.io/POMWright/`, with its
  content in `website/src/content/docs/`, in three sections: `docs/` to learn, `api/` to look up, `internal/` to
  understand. The 2.x docs are linked at the tag,
  `https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v2`. The README says what POMWright is, shows one example, and
  links the site rather than repeating it; the snippet check compiles its examples as one more page, each block titled
  in its fence meta (`title="orders.page.ts"`), which GitHub and npm do not show.
- The doc comments in `src/` are the API reference in the editor, written from the same facts as the API pages: every
  export and every public or protected member has a summary, `@param` for each parameter (nested options as
  `@param options.label`), `@returns` where the type does not say it, `@throws` with the real message, an `@example`,
  and a `@see` with its API page: on an export the page, on every method, every property of a class and every
  constructor its own heading (`https://dyhex.github.io/POMWright/api/class-sessionstorage/#set`), the methods of what
  `add(path)` and `createReusable` return included; a field of an option or data type needs none. The API entry, not
  the hover, links the Docs section. An overload without a comment shows its method's first one, so the first
  overload carries the full comment; a type a chain hovers (the view after a locator method, `NavigationFor`) carries
  comments on its own members. A decorator at the start of a comment line is read as a JSDoc tag, so `@step`'s comment
  has no example block.
- Principles: mirror Playwright in the docs as in the code (explain each feature as the Playwright feature it builds on
  plus what POMWright adds, use Playwright's names, link playwright.dev for what Playwright owns instead of restating
  it); teach the recommended path first (chains, page objects as fixtures, reuse by path, `update` before `replace`) and
  document a decided contract as decided; one home per fact (a rule is explained on its concept page and linked
  elsewhere; the API page and the doc comment state it briefly and link there); show, then explain (a short example,
  the rule, the edge cases last); say what fails and how (concept pages show the common errors, API pages and doc
  comments every one per member, *Error messages* all of them).
- API pages follow playwright.dev's class pages: a summary with one example, then *Type parameters*, *Constructor*,
  *Methods* (or *Methods to implement*) and *Properties*, the members as `###` headings, alphabetical within their
  group, each with **Usage**, **Arguments** (name, type, *(optional)*, nested options indented), **Returns** and
  **Throws** (the real messages); a type of the page has a `## Name` section; types link to their API page or to
  playwright.dev. Internal pages state what a part is for, how it works and why, including the alternatives that were
  rejected and the reason, with the files involved and no line numbers, and link the contributor guide rather than copy it. The
  reasons behind a design live on the Internal pages; a change of design updates them.
- The code and its tests decide what the docs say. Every chain, description and message a page shows is copied from a
  probe against the build (see [test/AGENTS.md](../test/AGENTS.md#probing)); where a rendered string hides an option, the stored record is read instead.
  `test/tests/docs/docsChains.spec.ts` rebuilds every chain a page or the README shows in a `text` block, a code
  comment or the running text, one test per page, compares it, and checks that the page still shows it: a change to a
  chain, on the page or in the code, fails until the spec and the page change together. A change to a message, a rendering or a mechanism greps `website/` for the old text and updates the pages with it,
  and a consumer-facing change updates the page that describes it.
- Page shapes follow playwright.dev. Getting started pages: *Introduction*, "You will learn", short sections whose
  example grows from the last, *What's next*; one page, one outcome. Concept pages open with the Playwright concept
  beneath them, linked, and say what POMWright adds; then a small fixture (the HTML and the registry or page object the
  page's examples use), sections from the common case to the edge cases, `:::note` asides only for traps, and a closing
  *Reference* list (POMWright's API pages, then Playwright's). Every page is Markdown (`.md`; MDX only where a component
  earns it, as on the home page) with a `title` and a quoted `description`; links within the site are root-absolute
  with the base and anchor (`/POMWright/docs/<page>/#<heading>`), links to Playwright go to playwright.dev's current
  pages. Plain sentences, one idea each, no marketing, no "simply" or "just", American spelling. No "Added in" markers
  on 3.0.0 pages. From the first 3.x addition on, a new export, member or option carries one, as playwright.dev's
  pages do (`Added in: v3.x.y`, a line directly under its heading on its API page; *API reference*'s row links that
  section), whatever its bump. A fix that makes an already-documented form work carries none; the changelog says so.
- Diagrams are Mermaid, where one explains better than prose, each checked against the code: a sentence before it says
  what it shows, at most about a dozen nodes, the theme's colors (the charts of *Internal → Performance* set their two
  series colors, which the light theme would otherwise draw too pale), and text around it that says the same, so a
  reader of the text loses nothing.
- Examples: page objects reach tests as Playwright fixtures (only *Your first page object* creates one in its test);
  the example app in `website/snippets/` is importable from every page (`./login.page`, `./fixtures`, …), and a page
  that needs its own version of an app file defines a block with the same title; code that is not test code (a
  `defineLocators()`, a locator module, a query in a page object's method) is shown as such; TypeScript with two-space
  indentation, `*.example` hosts and descriptive paths; a rendered chain or message goes in a comment or a `text`
  block.
- `scripts/check-doc-snippets.mjs` compiles every `ts` block of the site and the README, one project per page with the
  example app, against the installed package with the harness's options and `declaration: true`, in
  `test/.doc-snippets/`. `title="name.ts"` makes a block a file the page's other blocks import; lines up to
  `// ---cut---` are compiled but hidden on the site and only declare what the visible lines use; `nocheck` skips a
  block and lists it, and fails the check on any page but *Upgrading from 2.x*, whose 2.x code it is for; a deliberate
  error is shown with `// @ts-expect-error`, which the check enforces. A block's language is the fence's first word,
  after any spaces, as CommonMark reads it; a TypeScript block the check would not compile, in a `~~~` fence, labeled
  `tsx`, `mts` or `cts`, or with `ts` written otherwise (a space before it, upper case), fails it with the fix, and so
  does a `tsc` that fails without reporting a type error. It runs in `pnpm typecheck` (so in every harness job) and in
  CI's `site` job.
- `scripts/check-api-coverage.mjs` reads the installed declarations (`.pack/pomwright/dist/index.d.ts`, the extracted
  tarball in CI; a path argument overrides it) and fails on an export without an API page (its `title`) or a `## Name`
  section, a public or protected member without a `### member` heading in its own section (under the `## Name` of the
  export that declares it, or, for the export a page is titled after, under the page's other `##` headings), or an
  export, member or constructor without a summary or a `@param` for each parameter, an export, method, class property
  or constructor without a `@see` (the methods of what `add(path)` and `createReusable` return too), a `@see` that is not
  its own entry's link (an export's page or its `## Name` anchor; a member's or constructor's own `###` anchor, a
  repeated heading's `-1` suffix included), a `https://dyhex.github.io/POMWright/` URL in the declarations whose page or
  heading does not exist in `website/src/content/docs`, and an exported type missing from the type table of
  *TypeScript* or linked there to anything but its API page or section. A union, a conditional type or a tuple has no
  members to check. A Mermaid diagram renders in the browser, so the build does not catch its syntax:
  `scripts/check-diagrams.mjs` (`pnpm docs:diagrams`, and the `site` job) opens every page with a diagram in Chromium,
  light and dark, and fails on a diagram without an SVG, Mermaid's error diagram, or an error the page logs (a semicolon
  in a sequence message, or parentheses in an unquoted edge label, break one). How a diagram looks is still checked by
  eye.
- `scripts/check-error-messages.mjs` compares *Error messages* (`api/errors.md`) with the code in both directions: every
  message `src/` throws (`new Error`, `TypeError`, `RangeError`; tests and `fakePage.ts` aside), read with the compiler
  API (a `${…}` part varies, a ternary inside a message is alternatives, a ternary of whole messages is two, a constant
  or a helper is followed to its text), and every compile-error message its types define (the string literal types of
  `StepRequiresPromise`, `NeedsPaths`, `SchemaNeedsStorageType`, `InvalidReusePath`, `LocatorSchemaPathFormat` and
  `BrokenRules`, the path rules), must match a line of the page's `text` blocks; every
  line there must end as such a message does (a label or a path in front is allowed; an indented line continues the
  one above and is not checked). Errors no user can reach are listed in the script's `INTERNAL`, messages that pass
  another error's message on behind a prefix in `PASS_THROUGH`, each with its reason; a stale entry fails it. It does not
  check the API pages' **Throws** or the doc comments' `@throws`, which list each member's messages by hand.
- Deployment: `pages.yaml` builds `website/` exactly as the `site` job does and deploys `website/dist` to GitHub Pages
  (the `github-pages` environment, which allows `main`; Pages' source is "GitHub Actions"), after `CI` succeeds on a
  push to `main`, from the commit that run tested.

## The site's scripts

- The documentation site, each script after a frozen install of `website/`: `pnpm docs:dev`, a dev server that reloads
  on every edit, at `http://localhost:4391/POMWright/` (the harness keeps 9000), without the link check; `pnpm
  docs:build`, into `website/dist`, failing on a link or an anchor that does not exist; `pnpm docs:diagrams`, that build
  and then `scripts/check-diagrams.mjs`, every Mermaid diagram rendered in Chromium, light and dark (Chromium from the
  root's `@playwright/test`); `pnpm docs:preview`, that build served as it deploys, at
  `http://localhost:4392/POMWright/`, the check to run before a push. Astro 7 needs Node 22.22
  or later; the site builds on Node 24, and the library's Node 20 floor is untouched. The site's dependencies never
  enter the root `package.json`, whose scripts only call into `website/`.
- Considered and not planned: linting Markdown (biome does not process `.md`); a spelling check (the American
  spelling rule above is kept by review).

## Do not

- Write a chain, description or message into the docs without reading it from a probe, or change one in the code
  without updating the pages that show it.
- Add an export or a public member without its doc comment, its `@see` and its heading on an API page.
- Add the site's dependencies to the root `package.json`.
