# PLAN-8: the main landmark by its role, `getByRole("main")`, across the repository

Written 2026-11-11 at the maintainer's request ("make a plan for it and implement that plan before we go ahead in the
eval"). Runs before PLAN-6B's step 1; PLAN-2D and PLAN-7 wait.

## Why

The maintainer asked whether `locator("main")` and `getByRole("main")` resolve the same element. Probed
(`scratchpad/main-probe/`, not in the repo):

- The maintainer's site, the start page and `/mobilabonnement/`: one match each, the same element,
  `<main class="layout-main" id="main">`, in Chromium. Firefox (`SEC_ERROR_UNKNOWN_ISSUER`) and WebKit ("Unacceptable
  TLS certificate") refuse the site's certificate, so they were not compared there.
- Hand-built pages (`page.setContent`, a stand-in: the real cases are not on a site at hand; it could hide a browser
  difference in how a real page builds its tree), three browsers, the same in all:

  | page | `locator("main")` | `getByRole("main")` |
  | --- | --- | --- |
  | one `<main>` | 1 | 1 |
  | `<div role="main">` | 0 | 1 |
  | a `<main>` and a `<main hidden>` | 2 | 1 |
  | `<main style="display:none">` | 1 | 0 |
  | `<main role="region">` | 1 | 0 |
  | `<main>` in an open shadow root | 1 | 1 |

So on a page with one visible main they are the same element; where they differ, `getByRole("main")` finds what a
user perceives as the main content (a hidden second `<main>`, which HTML allows, makes `locator("main")` a strict-mode
violation). It is the first method of the order and scopes as well as CSS does.

## What changes

Every place where the `main` segment (or a page's main landmark) is registered or rendered as `locator("main")`:

- the site: Docs, API and Internal pages, the example app in `website/snippets/`, the rendered chains
  (`locator('main')` becomes `getByRole('main')`) with `test/tests/docs/docsChains.spec.ts` and `chains.ts`;
- the README; the doc comments in `src/` (`locatorRegistry.ts`, `pageObject.ts`);
- the skills, their templates and `skillsChains.spec.ts`; `references/registering.md`'s "either is right" becomes the
  reason (the role first; the landmark scopes the rest);
- the harness specs and the unit tests that register `main` as a page's landmark, their pinned chains with them;
  `scripts/consumer/consumer.ts`; the packaging probes in `test/tests/packaging/`.

## What stays, and why

- A test whose subject is `locator()` or CSS itself, or a path that is not the main landmark (`"a"`, `"shell"`,
  `"app"`, `"body"` registered with `locator("main")`): the selector string is what it tests. Each kept place is
  listed in the execution notes with its reason.
- `scripts/benchmark.mjs` and *Internal → Performance*: the published numbers were measured with `locator("main")`, and
  the same chain is compared with and without POMWright. Changing it means measuring again: proposed as a follow-up,
  not done here.
- The 2.x code blocks of *Upgrading from 2.x* (2.x code, as it was).
- `CHANGELOG.md` (never edited).

## Steps

1. Read the contributor files of every area touched (`src/`, `test/`, `website/`, `skills/`).
2. Probe the renderings: `String(page.getByRole("main"))` and a chain starting with it, against the packed build.
3. Change the places above; review every remaining `locator("main")` by hand.
4. Checks: `pnpm lint`, `pnpm lint:skills`, `pnpm lint:guide`, `pnpm test:unit`, `node scripts/check-doc-snippets.mjs`,
   `pnpm pack-test --reporter=line` (all three browsers), `pnpm -C website docs:build`.
5. One commit; the maintainer pushes.

## Questions

- **Q1. A changeset?** The doc comments ship in `index.d.ts`, so the hover examples change; no API or behavior does.
  Recommended: none, as for PLAN-2D's Q1; asked, not assumed.
- **Q2. The other CSS locators in the examples** (`locator("ul")`, `locator("li")`, `locator("form")`, `locator("section")`):
  not in this plan. Some have a role that finds the same element (`list`, `listitem`), some only with an accessible name
  (`<form>` is a `form` only when named, `<section>` a `region` only when named), and some examples are there to show
  CSS. Recommended: review them with PLAN-2D, which rewrites the same examples' paths.

## Execution notes

- 2026-11-11: 67 files changed: every `add("main").locator("main")` and every rendering `locator('main')` outside the
  kept places, plus by hand: the table row in `choosing-locators-and-paths.md`, `registering.md`'s paragraph (now the
  role and the scope, no "either is right"), the plain Playwright chains on *Your first page object*, *Frames* (its
  `checkout` path is the main landmark) and *Resolving locators*, the Mermaid label on *Internal*, `chains.ts`'s
  `nested` helper, the comment in `skillsChains.spec.ts` that pins `registering.md`'s claim, and the call list a unit
  test records (`pageObject.test.ts`).
- Kept, each a path that is not the main landmark or a test of CSS itself: `add("a")` in
  `locatorRegistrationBuilder.test.ts` (twice) and `locatorRegistry.test.ts`, `add("app")` in `locatorRegistry.test.ts`
  (the any-frame check), `add("shell")` in `add.frameLocator.spec.ts` (with its plain Playwright renderings) and
  `registry.verify.spec.ts`, `add("body")` in `lifecycle.spec.ts`; `skillsChains.spec.ts`'s DOM check that both find
  the `<main>`; `scripts/benchmark.mjs` and *Internal → Performance* (measured with `locator("main")`; a follow-up).
- Checks: `pnpm lint`, `pnpm lint:skills`, `pnpm lint:guide`, `pnpm test:unit` (1014 of 1014) pass. The first
  `pnpm pack-test` failed *Internal → Resolution*'s chain test in all three browsers: a regex
  (`/^locator\('main'\)\./`) the replacement had not matched; fixed. The second: the harness 1919 passed and 1
  skipped (as before), the step-location check 12, the test server check 29; `pnpm docs:diagrams` (the build with
  its link check, and 17 diagrams light and dark) passes.
- Committed 78130ba, not pushed. Answers 2026-11-11: Q1 no changeset (the doc comments reach users with the next
  release; 3.0.2 is unchanged); Q2 the other CSS locators with PLAN-2D.
