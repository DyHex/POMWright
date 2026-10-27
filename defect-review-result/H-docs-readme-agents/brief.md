# Scope H: The documentation as a whole, README and AGENTS.md

Segment H of the final whole-project review at `54cdada`. First read [../scopes.md](../scopes.md) (where things are,
probing, the finding format, finishing), [../inventory.md](../inventory.md) (sections 8, 10 and 11, and the lines
tagged H) and [../baseline.md](../baseline.md). Probes go to
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/H/`.

Scopes A to G each checked the pages of their own area. This scope covers the pages no other scope owns, the
documentation as one body (do the pages agree with each other?), the README, and whether AGENTS.md still describes
the repository. Review it as an *area* in the skill's terms. Where a page shows behaviour, the probe decides, as in
every other scope (AGENTS.md §9: every chain, description and message a page shows is copied from a probe against the
build).

## What is in scope

- **Pages no other scope owns**: `website/src/content/docs/index.mdx`, `docs/principles.md`,
  `docs/organising-a-project.md`, `docs/locator-modules.md`, the *Introduction* and *How to upgrade* sections of
  `docs/upgrading-from-2x.md` (the other sections are the scopes' own; read the whole page for consistency),
  `api/index.md`, `api/errors.md` as a whole (each scope checked its own sections), `internal/index.md`.
- **The example app**: `website/snippets/` (`login.page.ts`, `account.page.ts`, `orders.page.ts`, `checkout.page.ts`,
  `fixtures.ts`).
- **The site**: `website/astro.config.mjs` (base, link check, Mermaid, edit links), `website/sidebar.mjs`,
  `website/plugins/expressive-code-cut.mjs`, `website/src/components/SiteTitle.astro`, `website/src/styles/custom.css`.
  The build's `The collection "i18n" does not exist or is empty` warning (baseline).
- **README.md**: its example and its claims. AGENTS.md §9 says README examples are compiled by hand when they change,
  so compile them.
- **AGENTS.md**, all of it, against the repository at `54cdada`.

## Changes since v3.0.1 in this scope

```
f7e3776 docs: AGENTS.md after the 3.0.2 session storage fixes, and the defect-review skill
c7db10b docs: list the encoding errors seed throws
9b4fe5f docs: check EBADENGINE only when engines changes
18634ce docs: Upgrading from 2.x states the full urlPath rule
bd9b115 chore: drop the "Thanks @user!" from changelog entries
1436d8c docs: say more precisely where the registry pays off
bb03471 docs: when the page changes, following it in the paths
0a98954 docs: a README that shows what POMWright adds
e852e85 docs: AGENTS.md and Tests and checks for 3.0.2
ffcc23f docs: correct six statements found by the 3.0.1 reviews
```

`errors.md` and `upgrading-from-2x.md` also changed with most of the fixes. List them with
`git log --format='%h %s' v3.0.1..54cdada -- website/src/content/docs/api/errors.md website/src/content/docs/docs/upgrading-from-2x.md`.

## Known and decided

- Decided, not planned (AGENTS.md §7): linting Markdown.
- AGENTS.md §9 is the documentation's own contract: page shapes, "one home per fact", no "simply" or "just", American
  spelling, root-absolute links with the base, Mermaid rules, the `nocheck` rule, no "Added in" markers on 3.0.0 pages
  but one on every later addition. §8: no pre-release banner or `noindex` on the released site.
- `docs/v1*`, `docs/v2/` and `CHANGELOG.md` are frozen. They are not in scope.

## Questions to answer

- **AGENTS.md.** Does every statement still hold at `54cdada`? Count with commands, never by eye:
  - the counts: 18 runtime files and about 6,400 lines, 16 unit test files, 55 spec files and about 8,400 lines, and
    the 24/14/13 pages;
  - every path and file list in §2;
  - every command in §3, run or traced;
  - every rule in §5 against the code, sampled where the scopes cover it;
  - the `skills/` row.

  Each wrong line is a documentation finding.
- **One body.** Does a fact stated on two pages agree on both (§9: one home per fact, linked elsewhere)? Look for the
  same rule restated differently: the primary-argument rules, the URL rules, `seed`'s limits, when `defineLocators()`
  runs. Is every link and anchor right? The build checks existence, not that the target says what the link claims.
- **`errors.md` as a whole.** Is every message the code can throw listed, and is no listed message gone from the code?
  Match the throw sites of `src/` (`grep -n 'throw '`) against the page.
- **Rule 9 of the page shapes.** Check the Getting started pages (*Introduction*, "You will learn", *What's next*), the
  concept pages (the Playwright concept first, a fixture, *Reference* last), the API pages (playwright.dev's order,
  members alphabetical, **Usage**, **Arguments**, **Returns**, **Throws**), "Added in" markers on members added since
  3.0.0, and `nocheck` only on *Upgrading from 2.x*.
- **Principles and the home page.** Does each broad claim hold against the narrower contracts? Examples: "nothing
  changes behind your back", "fail early, at fixture setup", "check at runtime".
- **The example app.** Does it compile? The snippet check does that. Does it use the API the way the pages recommend?
- **The site.** Do the Mermaid diagrams render? Run `pnpm docs:preview` on port 4392, look at each page with a diagram
  through a temporary Playwright script with screenshots kept in your probes folder, and stop the server after. Do the
  edit links point at `main`? Does the i18n warning matter?
- **README.** Does its example compile against the build? Does every claim hold, and every link resolve?

## Neighbours

Each feature's own pages are scopes A to F. The CI and docs-check scripts are scope G. Report a page finding that
belongs to another scope's area under *outside the scope* in `summary.md`, unless it only shows up across pages.
