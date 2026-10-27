# Scope H: summary

> Saved by the orchestrating session from the agent's final report, with the user's approval: the agent's own write of the final version of this file was refused by a harness rule ("Subagents should return findings as text, not write report files"). It replaces the agent's "in progress" placeholder.

Scope H of the final whole-project review covers the documentation as a whole, README.md and AGENTS.md, at `54cdada` (`fix/review-3-0-2`), in the worktree `/home/magdys/workspace/dyhex/POMWright-final-review`. I reviewed it as an *area* in the skill's terms. Reviewer: H, 2026-10-23, 13:01–13:23 CEST. Probes and notes are in `/home/magdys/workspace/dyhex/POMWright-final-review-probes/H/`; `notes.md` is the running list.

## What I read

- `scopes.md`, `inventory.md` (§8, §10, §11 and the H lines), `baseline.md` and `brief.md`.
- AGENTS.md at `54cdada`, in full. It is identical to the user's checkout except the §2 `skills/` row, which the caller put outside this review.
- README.md and `package.json`.
- Read in full:
  - `index.mdx`, `docs/principles.md`, `docs/organising-a-project.md` and `docs/locator-modules.md`.
  - `docs/upgrading-from-2x.md`, all of it for consistency; its *Introduction* and *How to upgrade* sections are H's.
  - `api/index.md`, `api/errors.md`, `internal/index.md` and `internal/documentation.md`.
  - The example app (`website/snippets/*.ts`).
  - The site files: `astro.config.mjs`, `sidebar.mjs`, `plugins/expressive-code-cut.mjs`, `src/components/SiteTitle.astro`, `src/styles/custom.css`, `src/content.config.ts` and `package.json`.
- Read in part, for facts stated on more than one page:
  - `docs/registering-locators.md`, `docs/page-objects.md`, `docs/page-objects-in-tests.md`, `docs/verifying-registries.md`, `docs/seeding-session-storage.md`, `docs/urls-and-navigation.md`, `docs/locator-paths.md`, `docs/test-steps.md` and `docs/reusing-locators.md`.
  - `api/class-*.md`, for headings and group statements.
  - `internal/url-matching.md`, `internal/tests-and-checks.md`, `internal/page-object-lifecycle.md` and `internal/resolution.md`.
- Every `throw` site in `src/` (88 of them, from `grep -rn 'throw \|Error(' src`), checked against `errors.md`.
- The v2.1.0 source, where the upgrade page states how 2.x behaved (`getById`, `update().getById`).

## Decisions taken while working (nobody to ask)

- **One finding per wrong fact, not per line.** The brief says each wrong AGENTS.md line is a finding. Where one stale fact appears in AGENTS.md and on site pages (the URL sweep's "one known difference"), I made it one finding (H-4) that lists every place. Two different stale facts in one AGENTS.md section are two findings (H-4 and H-5).
- **The "Added in" rule (H-8) is a design question, not a documentation defect.** Read strictly, §9 names "a new member or option". The four new exports are patch-level exports, so nothing breaks the rule as written.
- **Per-member labels on API pages** (**Usage**, **Arguments**, **Returns**, **Throws**) are missing on several members. In each case either a group statement covers them (*Locator methods*, *Steps*, *Errors of every method*) or nothing applies (a `void` return, no arguments, nothing thrown). I treated this as the deliberate compact form (one home per fact), not a §9 violation; see *What is sound*.
- **The i18n build warning is not a finding** (see *What is sound*).
- **Where a page finding belongs:** a finding in another scope's area that only shows up across pages is an H finding (H-4's *URL matching* sentence, H-9's five statements). A finding confined to one page of another scope goes under *Outside the scope*.

## Coverage of the inventory lines

| Inventory line | Reviewed | How |
| --- | --- | --- |
| §8 README | fully | Compiled the example against the packed build; probed its rendered chain and its verification message against the build; compiled the table snippets; checked the links and the `v2.1.0` paths. |
| §8 home page, *Principles*, *Organising a project*, *Locator modules* | fully | Read every claim against the contracts; probed the *Locator modules* claims about the chain, slots, duplicates and TS4023. |
| §8 *Upgrading from 2.x* | *Introduction* and *How to upgrade* fully; the rest read for consistency | Checked the 2.x claims against `v2.1.0` only for `getById`. The other sections are the scopes'. |
| §8 `api/index.md` | fully | Checked the 38 exports against `index.ts`. |
| §8 `api/errors.md` as a whole | fully for completeness; the exact wording per section is left to the scopes | Matched the throw sites against the page, and compared every page's text-block lines with `errors.md` (`messages/text-lines.mjs`). |
| §8 `internal/index.md` | fully | Checked the module map and the diagram against the code. |
| §8 example app | fully | Compiled by the snippet check (exit 0); read it for recommended usage. |
| §8 site | fully | Build (exit 0, warnings read); preview on port 4392; 17 Mermaid diagrams rendered in light and dark; layout at 390 px and 1280 px; edit links; tabs; no `noindex` or banner. |
| §8 page shapes (§9) | fully for Getting started and concept pages; API pages for order and labels | Scripted heading checks. |
| §10 AGENTS.md | §1–§4, §6 and §9 fully; §5 and §8 sampled where they touch docs and call sites; §7 sampled; the workflows row of §2 left to G | Counted by command; grepped every named file and function; traced every `package.json` script; listed the server routes. |

Not run:
- `pnpm bench` and `pnpm docs:dev`.
- The harness on firefox and webkit. Nothing in this scope depends on a browser's behaviour, and the URL-sweep finding comes from reading the spec.
- Node 20 and 22. H-4 reads the spec's condition, and scope D owns the `^` behaviour.

## Test gaps

1. **Nobody checks that `errors.md` is complete.** `check-api-coverage.mjs` checks API headings and doc comments. No check compares the messages in `src/` with *Error messages*, so the two omissions in H-2 went unnoticed. A script that extracts the literal parts of every `throw` message and looks for them on the page would catch them.
2. **README examples are compiled by hand** (AGENTS.md §9). They compile and their rendered output matches today. The snippet check does not read README.md, so a later API change can break them silently.
3. **No check re-probes the chains and messages that pages show.** The snippet check compiles the code but does not run it. The `text` blocks stay true only through the §9 habit of probing. The ones I probed (README, *Locator modules*) match, but nothing fails when a rendering changes.
4. **Mermaid diagrams are checked by eye only**, as AGENTS.md §9 says. All 17 render today.
5. **The page object error's code frame with a base class (H-9) is untested.** The callSite spec covers a page object that extends `PageObject` directly, not one going through a site base class, which is the pattern *Organising a project* recommends.

## What is sound

- **README:**
  - The example compiles against the packed build (`tsc --noEmit -p test`, exit 0).
  - The chain it shows is exactly what `getLocatorSchema(…).filter(…).describe("").getNestedLocator().toString()` renders.
  - The verification message is exactly what the variant throws (`OrdersPage: Locator registry verification failed for 1 of 5 paths: …`).
  - The table's snippets compile.
  - Every link resolves: the site pages exist, and `v2.1.0` has `docs/v2` and `docs/v1-to-v2-migration`.
  - The peer and Node statements match `package.json`.
  - Probes are in `readme/`.
- **AGENTS.md counts:** 18 runtime files with 6,443 lines (not counting `fakePage.ts`), 16 unit test files, 55 spec files with 8,407 lines, and 24/14/13 pages. All as stated.
- **AGENTS.md §1:** the public API list equals the 38 exports of `index.ts`. The engines and peer floors are as stated; `@playwright/test` 1.64.0 declares `node >=20`.
- **AGENTS.md §2:** every function and type named in the `src/locators/` and `src/helpers/` rows exists, and the files in the website row exist. `pnpm-workspace.yaml`, the tsconfigs and `vitest.config.ts` are as described.
- **AGENTS.md §3:**
  - Every script matches `package.json`.
  - `pack-test.sh` runs the five checks, the harness and the steps config.
  - pnpm 12.14.0 appears in the three manifests, the three lockfiles and every `pnpm/action-setup` step.
  - Astro needs Node 22.22 and vitest needs 22.12, as stated.
- **AGENTS.md §6:** `git show 08bdcac^:release-3.0.0/DECISIONS.md` resolves. `git grep` finds no reference to a plan, finding or decision number outside the git history.
- **AGENTS.md §9 checks:** the snippet check passes (215 checked plus 12 `nocheck` = 227 `ts` blocks; all 12 `nocheck` blocks are on *Upgrading from 2.x*). The API coverage check passes (38 exports, 98 members, 123 site links, 0 problems).
- **Page shapes:**
  - Every Getting started page has *Introduction*, "You will learn" and *What's next*.
  - Every concept page opens with *Introduction* and ends with *Reference*, listing POMWright's pages and then Playwright's.
  - Only *Your first page object* creates a page object in its test.
  - No example is indented with tabs.
- **API pages:** members are alphabetical within every group on every page. Each per-member label is either present or replaced by a group statement or a cross-reference.
- **`api/index.md`** lists all 38 exports, and every anchor works.
- **`internal/index.md`:** the modules and the diagram match the code (`buildLocatorChain`, and a query behind `getNestedLocator`).
- **One body:**
  - These rules are stated the same way on every page that states them: the primary-argument rule (apart from H-1), the `urlPath` rule, when `defineLocators()` runs, and what `seed` cannot do.
  - Message lines in `text` blocks that differ from `errors.md` differ only in their paths, or are locator chains (`messages/not-on-errors.txt`).
- ***Locator modules*:** these all match the page (probes in `modules/`):
  - The rendered chain of the products module.
  - The duplicate-path message.
  - The slot behaviour: verify passes, resolution throws `No locator schema registered for path "main.heading".`, and `strictChains` does not report a slot that has no descendants.
  - TS4023 for an arrow-function module.
- **Site:**
  - The build passes (53 pages).
  - All 17 Mermaid diagrams on 13 pages render as SVG in light and dark, with no console error (`mermaid/render.mjs`).
  - Nine pages have no horizontal overflow at 390 px or 1280 px, and the tabs show on wide screens only (`mermaid/layout.mjs`).
  - Edit links go to `github.com/DyHex/POMWright/edit/main/website/src/content/docs/…`.
  - There is no `noindex` and no banner.
  - The build's warnings are harmless:
    - `The collection "i18n" does not exist or is empty`: Starlight looks for optional UI translations, which the site does not define, so it uses its built-in English strings. Defining an empty `i18n` collection (`i18nLoader`, `i18nSchema`) would silence it, at no gain.
    - `Entry docs → 404 was not found`: Starlight falls back to its built-in 404 page (`dist/404.html`, titled `404 | POMWright`).
    - The chunk-size warning comes from Mermaid's bundle.

## Outside the scope

- **[G] `.vscode/playwright-snippets.code-snippets`, `pw-step`:** it inserts `` await test.step(`${X.pocName}: …`, …) ``. `pocName` exists in neither 3.x nor `v2.1.0`: `git grep pocName` finds only this file, and `git show v2.1.0:src/pageObject.ts | grep pocName` finds nothing. So the snippet produces code that does not compile. Low.
- **[A] `neverAppliedError` grammar:** `src/helpers/sessionStorageSeed.ts`, lines 168–175, joins several origins' seeds with " and " and then writes "was never applied" ("the seed for A (…) and the seed for B (…) was never applied"). I read this from the code and did not probe it. Low.
- **[review] `inventory.md` §7** says there are 31 pending changesets. `.changeset/` has 29 (`ls .changeset/*.md`, minus `README.md`).

## Findings

| ID | Kind | Severity | Semver | Summary | File |
| --- | --- | --- | --- | --- | --- |
| H-1 | documentation | Low | none | *Upgrading from 2.x* lists three methods that reject an empty first argument. `getById` is missing, and so is its `update` case, which 2.x accepted. | [defect-H-1](defect-H-1-upgrade-first-argument-omits-getbyid.md) |
| H-2 | documentation | Low | none | *Error messages* misses `goto()`'s URL-object message and a hand-made seed's `reuse requires …` message. | [defect-H-2](defect-H-2-errors-page-misses-two-messages.md) |
| H-3 | documentation | Low | none | *How to upgrade* says to install 3.0.0 while the page describes 3.0.2. It promises a search for every *compiles* item, and four items lack one. | [defect-H-3](defect-H-3-upgrade-how-to-names-3-0-0.md) |
| H-4 | documentation | Low | none | AGENTS.md §4, *Tests and checks* and *URL matching* say the URL sweep has one known difference. It also has `^` on Node 20 and 22. | [defect-H-4](defect-H-4-agents-urlforms-one-known-difference.md) |
| H-5 | documentation | Low | none | The route list in AGENTS.md §4 misses `/teststorage/sandboxed` and `/teststorage/shadowed-navigation`. | [defect-H-5](defect-H-5-agents-server-routes-incomplete.md) |
| H-6 | documentation | Low | none | 21 British spellings in 15 files, a page title among them, where §9 requires American spelling. | [defect-H-6](defect-H-6-british-spellings.md) |
| H-7 | documentation | Low | none | *Principles* says every rule is checked at runtime, but `@step`'s Promise rule is checked only by TypeScript. | [defect-H-7](defect-H-7-principles-every-rule-at-runtime.md) |
| H-8 | design question | Low | none | Should "Added in" markers cover the four 3.0.2 exports and `update()`'s `undefined` first argument? | [defect-H-8](defect-H-8-no-added-in-markers-for-3-0-2-exports.md) |
| H-9 | documentation | Low | none (docs) / patch (code option) | Five pages give two versions of where a page object's registry error points. With a base class, it points at the base class's `super(...)`. | [defect-H-9](defect-H-9-report-points-at-super-not-new.md) |

Counts: 0 defects, 8 documentation, 0 suspected, 1 design question.

## State at hand-off

- The worktree is clean (`git status --porcelain` prints nothing) and still at `54cdada`. The ignored entries are the ones `baseline.md` lists. `dist/` and `.pack/` were not rebuilt; `website/dist` and `test/.doc-snippets` were regenerated from `54cdada`.
- I stopped the preview server on port 4392. Port 9000 is free.
- I added no worktree or clone.
- The scopes.md row for H is updated: done; 0 defects, 8 docs, 0 suspected, 1 design.
