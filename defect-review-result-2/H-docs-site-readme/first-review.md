# Segment 2H: the first review's findings, claims and test gaps at `d850405`

Pass 2. Sources read (in the worktree, `defect-review-result/`): `H-docs-readme-agents/` (brief, summary, H-1 to H-9),
`report.md`'s ledger rows H-1 to H-9 and R-1 to R-4, `DECISIONS.md` #7, #17, #36, #37, #40, #45, #46, #47, #52,
`PLAN-H-6-spelling.md`'s execution notes, `PLAN-release-gates-and-audit.md`'s items for the second review, and
`inventory.md` §8. The first review's probes were copied from
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/H/` to
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/run1/<ID>/` and run against the worktree's packed package
(chromium, one run: `pnpm -C test exec playwright test tests/zz-probe-H-firstarg.spec.ts tests/zz-probe-H-errors.spec.ts tests/zz-probe-H-step-sync.spec.ts tests/zz-probe-H-callsite/zz-probe-H-callsite.spec.ts --project=chromium --reporter=line --workers=1`,
exit 1 by design: the call-site and step probes end in the errors they look at; output in `run1/run.log`).

## Findings

| First review | Kind | Outcome at d850405 | What was run, what it printed |
| --- | --- | --- | --- |
| H-1 *Upgrading* omits `getById` among the empty-first-argument methods | documentation | **fixed** | `run1/H-1/zz-probe-H-firstarg.spec.ts`: `add getById(''): getById requires a non-empty id for "main.a".`, `update getById(''): getById requires a non-empty id for "main.b".` (the seeded line now prints `getById is not a function`, since reuse by path returns `filter`/`nth`/`describe` only, a 3.0.2 change the probe predates). The page's sentence (lines 176–186) names all four methods and shows the `getById` message, which `upgrade/rt3/messages.mjs` reproduces verbatim. |
| H-2 *Error messages* misses two messages | documentation | **fixed** | `run1/H-2/zz-probe-H-errors.spec.ts`: `MSG1<<LoginPage: goto() takes a URL string or options; received a URL object; pass its href.>>`, `MSG2<<reuse requires a role value for "main.button@save".>>`; both on `api/errors.md` (lines 318 and 164). `check-error-messages.mjs` now enforces the page both ways (baseline: 77 thrown and 9 compile-error messages, 0 problems). |
| H-3 *How to upgrade* names 3.0.0; four **Compiles** items without a search | documentation | **fixed incompletely** → **2H-7** | Step 1 says "the latest 3.x"; the four items have a search or say they need none. H-3's count dropped a fifth item, *From JavaScript: `describe` and `nth`* (its `awk` cut the marker line to 16 characters), which still has neither. |
| H-4 the URL sweep's "one known difference" (AGENTS.md §4, *Tests and checks*, *URL matching*) | documentation | **fixed** (site part); the AGENTS.md part is 2I's | `internal/url-matching.md` lines 30–31 and 60–62 name `^` on Node 20 and 22 as `%5E` beside Chromium's pipe (`%7C`); `internal/tests-and-checks.md` line 28 says "the known differences listed"; `test/AGENTS.md` (*The harness*) names both. |
| H-5 AGENTS.md §4's route list | documentation | 2I's; read only: `test/AGENTS.md` lists `/sandboxed` and `/shadowed-navigation` | Not re-run here (contributor guide). |
| H-6 British spellings (21 in 15 files) | documentation | **fixed incompletely** → **2H-2** | The 21, and 3e37c74's further 47, are American now; the page is at `docs/organizing-a-project/` (decided, no redirect: `curl` gives 200 for the old address on the live site, which deploys from `main`, and 404 for the new one until the merge). Five `misspelt` (four pages, one doc comment), all present at 54cdada, were outside H-6's search and plan 38's. |
| H-7 *Principles* "every rule is checked at runtime" vs `@step` | documentation | **fixed differently** (decision 40: a runtime check, and *Principles* names the type-only rules) | `run1/H-7/zz-probe-H-step-sync.spec.ts`: the decorated plain-value method now rejects with `TypeError: @step decorates methods that return a Promise: make the method async` (the probe's test fails on it, as designed). *Principles* now reads "Every rule about a value is checked at runtime … The rules about types themselves are TypeScript's alone". The same broad claim on *Installation* was not touched → **2H-6** (missed by the first review: *Installation* was not in H's reading list). |
| H-8 "Added in" for 3.0.2 exports (design question) | design question | **fixed** (decision 7 adopted) | Six exports are new since 3.0.1 (`AllEntries`, `Decoded`, `SeedOptions`, `SessionStorageOptions`, `ReusableLocatorFactory`, `StepDecorator`); each has `Added in: v3.0.2` directly under its `##` heading, and `api/index.md` links that section. No public member or option is new (3.0.1's published declarations diffed against d850405's). |
| H-9 where a page object's registry error points | documentation | **fixed differently** (decision 37, with D-4: the code points at the `new` line) | `run1/H-9/` (base class with `super(...)` in it, a subclass, a spec): the stack's first frame and the report's code frame are now `zz-probe-H-callsite.spec.ts:6:14`, the `new LoginPage(page)` line; the first review saw `shop.page.ts:6` (the base class's `super`). The pages now agree: "the line that created the page object, the fixture's `new`" (*Page objects in tests*), "the line that constructed the page object" (*Page objects*, *Verifying a registry*), and `new.target` cutting the stack at the code's `new` (*Internal → Page object lifecycle*, *Call sites*). |

Counts: fixed 4 (H-1, H-2, H-4 site part, H-8); fixed differently 2 (H-7, H-9); fixed incompletely 2 (H-3 → 2H-7,
H-6 → 2H-2); not fixed 0; regressed 0; still present 0; 2I's 1 (H-5, and H-4's AGENTS.md part); cannot re-run 0.

## The first review's other claims

### What is sound (scope H)

| Claim | At d850405 |
| --- | --- |
| README example compiles, its chain and its verification message match the build, the table's snippets compile, links resolve, peer and Node statements match | Holds for the README as it is now (a49709d rewrote the example): run end to end (`readme/`), chain and message identical; `check-doc-snippets.mjs` compiles the README (ff8a2ac). One new problem in the new example: **2H-3**. |
| AGENTS.md counts, §1–§3, §6, §9 checks | 2I's (contributor guide). |
| Page shapes (Getting started and concept pages) | Holds for the pages read in this segment; front matter checked on all 52 pages. |
| API pages: members alphabetical, labels present or covered by a group statement | Area segments' pages; not re-checked here. |
| `api/index.md` lists every export | Holds: 40 exports now (38 then), every one in a row. |
| `internal/index.md`: modules and diagram match the code | Holds (the table summarizes; `storageTurns.ts`, `thenable.ts` and `fakePage.ts` are not named, which a summary allows). |
| One body: the first-argument rule, the `urlPath` rule, when `defineLocators()` runs, what `seed` cannot do, stated alike | Holds for the first-argument rule (now four methods everywhere) and `defineLocators()` timing (README, *Principles*, *Page objects*, *Page objects in tests*, *Upgrading*); `urlPath` and `seed` are area pages, not re-checked. |
| *Locator modules*: chain, duplicate message, slot behavior, TS4023 | Holds: `run1/H-sound-modules/` re-run, exit 0, the same seven outputs as the first review's `run.log` (order differs: parallel workers). TS4023 not re-run (2F's). |
| Site: build, 17 diagrams render, no overflow at 390/1280 on nine pages, edit links, no `noindex`, warnings harmless | Holds and widened: all 52 pages × light/dark × 390/1440 px without overflow or console errors (`render/render.mjs`); diagrams now checked by `check-diagrams.mjs` (baseline: 17 on 13 pages, 0 problems); the two build warnings are as the first review explained. |

### Test gaps (scope H)

| Gap | At d850405 |
| --- | --- |
| 1. Nobody checks that `errors.md` is complete | **Closed**: `scripts/check-error-messages.mjs` (429f2c2), in `pnpm typecheck` and `pack-test.sh` (not in CI's site job; see 2H-1). |
| 2. README examples compiled by hand | **Closed**: `check-doc-snippets.mjs` compiles the README as a page (ff8a2ac). |
| 3. No check re-probes the chains and messages pages show | **Partly closed**: chains by `test/tests/docs/docsChains.spec.ts` (6c53973, 3be8ca9); messages only on *Error messages*. A message or compiler output on any other page is unchecked, which is how 2H-4 went stale. |
| 4. Mermaid diagrams checked by eye only | **Closed for rendering** (`check-diagrams.mjs`, 54cf090); looks still by eye, as decided. |
| 5. The page object error's code frame with a base class untested | **Closed**: `callSite.spec.ts` covers a base class (test/AGENTS.md, *The harness*); H-9's probe shows the `new` line. |

### Outside the scope (scope H)

| Item | At d850405 |
| --- | --- |
| `.vscode/playwright-snippets.code-snippets` inserts `pocName` | Fixed: R-1, decision 35, the file deleted (`1717edb`); `ls .vscode` in the worktree shows no snippets file. |
| `neverAppliedError` grammar for several origins | Fixed: R-2, decision 30 (`c35eae4`): *Seeding session storage* shows `2 seeds were never applied: …` with one line per seed. 2A's to probe. |
| `inventory.md` §7's changeset count | Review notes only (R-3, decision 8). |

### Left for the second review (`PLAN-release-gates-and-audit.md`)

- **British spellings in specs and unit tests written before this branch, and `normaliseOrigin`.** Decided here: not a
  finding. The rule (`website/AGENTS.md`, *Rules*) is a rule for pages, the README and doc comments; test titles,
  comments in tests and an internal identifier are outside it. The ones still there: `src/pageObject.test.ts`
  (`labelled`), `src/locators/utils.test.ts` (`recognised`), `src/helpers/url.test.ts` (`recognises`, `normalises`),
  `src/helpers/navigation.test.ts` (`behaviour`), `normaliseOrigin` in `src/helpers/sessionStorage.ts`. If the
  maintainer wants the rule to reach them, it is a guide change (2I's), not a docs fix.
- E's test gap 7 (an unboxed step without a location): 2E's page (*Test steps*).
- report.md §9's *Considered and not filed*: area segments' (2A, 2D, 2E).
