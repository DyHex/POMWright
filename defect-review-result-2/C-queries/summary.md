<!-- Saved by the orchestrator from the segment agent's final message: the agent's own write of this file was refused by
the harness rule "Subagents should return findings as text, not write report files". The text below is the agent's,
unchanged. -->

# Segment 2C: Queries — summary

The second review's segment 2C, the query area of POMWright at `d850405` (`fix/review-3-0-2`), reviewed as an area,
with the commits since `v3.0.1` as a change set. Reviewer: Opus 5.5, second review, segment 2C; 2026-10-28, 15:26 to
15:55 +01:00. Worktree `/home/magdys/workspace/dyhex/POMWright-second-review`; probes and their outputs in
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/C/` (pass 1 to 4) and `…/C/run1/` (the first review's
reproductions). Log: [log.md](log.md); maps: [inventory-blind.md](inventory-blind.md),
[inventory-reconciled.md](inventory-reconciled.md); the first review: [first-review.md](first-review.md).

## What I read

- The method (`skills/defect-review/SKILL.md`, the worktree's copy), `segments.md`, `baseline.md`, the brief.
- The guide, in full, in the worktree: `AGENTS.md`, `src/AGENTS.md`, `src/locators/AGENTS.md`, `test/AGENTS.md`.
- Source, in full with doc comments: `src/locators/locatorQueryBuilder.ts`, `locatorUpdateBuilder.ts`, `types.ts`,
  `utils.ts`, `locatorRegistry.ts`; the parts of `locatorRegistrationBuilder.ts` a query reaches (`ensureOpen`,
  `frameLocator`), and `src/pageObject.ts`'s facade and define-once guard.
- Unit tests: the test names of `locatorQueryBuilder.test.ts` and `locatorUpdateBuilder.test.ts`. Harness: test names of
  the ten `getLocatorSchema/*.spec.ts`, `add.filter.spec.ts`, `add.describe.spec.ts`, `testFilters.spec.ts`,
  `validation.sub-path.spec.ts`; `add.get.clone.spec.ts` in part; the query lines of `publicTypes.typecheck.ts` (76-186,
  357-435) and of `docsChains.spec.ts`.
- Docs: `docs/queries.md`, `filters-and-indices.md`, `descriptions.md`; `api/class-locatorquerybuilder.md`,
  `class-locatorupdatebuilder.md`, `errors.md` (1-268); `internal/builders.md`, `internal/resolution.md`; the query
  lines of `locator-paths.md`, `frames.md`, `typescript.md`, `upgrading-from-2x.md`, `class-locatorregistry.md` and the
  README.
- The change set: every query commit's message and diff since `v3.0.1` (pathspec `:!defect-review-result` in pass 1),
  and the changesets they add or amend.
- Pass 2 on: the first review's scope C, its report rows, decisions and plans for the area (list in
  [first-review.md](first-review.md)); issue #61's body (pass 1, the 2.x backport of the sub-path fix).

## Coverage

**Reviewed fully** (every line of `inventory-reconciled.md`): `getLocatorSchema` and the query's eleven methods; the
update builder's ten methods in both modes; copies; steps and their order; descriptions, including where Playwright
shows them; the any-frame form in a query; `skip`/`unskip`; kept queries and kept builders; `has` paths in a query;
queries in an `add` chain's arguments; sub-path and patch types; every query message on the pages; the query pages and
the query commits since `v3.0.1` with their changesets.

**Partly**: the odd `nth` values (`1.5`, `NaN`, `null`) read in code and re-run through the first review's p07/p12, not
probed anew (decided as not validated); the guide's query lines read as contracts, their accuracy is 2I's.

**Not run**: firefox and webkit (nothing in the area is browser behaviour: every DOM comparison in P2 and P6 is
POMWright against Playwright's own call in the same browser); Node 20 and 22 (no `new URL` in the area); the latest
Playwright 1.x locally (CI ran it on chromium, baseline); the full `pnpm pack-test` (not needed: every probe ran against
the built package, identical to the baseline tarball); a `v3.0.1` worktree (no regression candidate: each behaviour
change in the change set is the one its changeset announces); the first review's p08 (a source-level sketch probe of a
form decision #20 made a compile error) and p18 (covered by S1).

## Test gaps, most important first

1. **A kept query across later registrations**: the snapshot (a later-registered ancestor stays out of the kept query's
   chain) and the "registered after this query was taken" message are unit-tested only
   (`locatorQueryBuilder.test.ts:211`); no packed spec. P1 and P3 probe both.
2. **A `has`/`hasNot` path in a query resolves from the registry, not from the query's own change to that path**
   (P1: `filter("main.list", { has: "main.list.item" })` after `update("main.list.item")` gives
   `filter({ has: locator('li').first() })`). No unit test or spec pins it; the pages state it only through "a registered
   path, resolved to that path's own locator".
3. **Copies through a query's `filter()` and `replace()`**: a RegExp rewritten with `compile()` after the call, a
   filter object changed after the call, class-instance and non-enumerable filter or `replace` options are covered at
   the `utils` level and, for `update` patches only, by `add.get.clone.spec.ts`. P2 covers the rest on a DOM.
4. **The type forms T1 and T3 add**: a pattern-typed query from a helper (`LocatorQueryBuilder<Paths, `…${string}`>`),
   mid-pattern template members, union and whole-union path variables, a generic function returning
   `LocatorQueryBuilder<Paths, P>`, a named query type in a generic base. None is in `publicTypes.typecheck.ts`; all
   compile today.
5. **Where Playwright shows a description** (`descriptions.md`'s table: the report row's title and subtitle, the call
   log, the strict-mode error): Playwright's behaviour, checked by probes only (S1, the first review's p18); a Playwright
   upgrade that changes it would not fail a test.
6. **RegExp flags through a query's filter** (`i g y m u v s`, a set `lastIndex`): pass-through, compared with
   Playwright's own call in P2 only.
7. **`exactOptionalPropertyTypes` consumers**: no check; T5 shows the patch and filter types reject an explicit
   `undefined` exactly as Playwright's option types do.

## What is sound

Each line names the path probed (probe files in `…/C/`).

- **Independence and copies**: each `getLocatorSchema` is a new copy; the registry never changes; values changed after
  `filter()`, `update()` and `replace()` (objects, RegExps with `compile()`) change nothing (P1, P2 on a DOM, run1 p05).
- **Steps**: `filter`/`nth` append in call order per segment; `clearSteps` clears; frame segments take steps on the
  `<iframe>` element (P1; run1 p07 on a DOM).
- **Filters on a DOM**: RegExp `hasText` with each flag and a set `lastIndex`, class instances with getters,
  non-enumerable own keys, `has`/`hasNot` as path or Locator on the path and on an ancestor, `visible`, `{}`: the same
  count as Playwright's own call (P2, 18 forms).
- **`update`**: same strategy, JSON Merge Patch, `undefined` keeps, `null` deletes, a lone `null` deletes all, a
  `Locator` value under `has` is replaced and `null` deletes it, the strategy-change message (P1, P3, P6; run1 p01, p02,
  p04).
- **`replace`**: any strategy, `null` options equal omission, kept builders across `replace`, `replace` then `update`
  (P1, run1 p02, p17).
- **The any-frame form in a query**: on an ancestor with registered ancestors skipped; rejected on the query's own path,
  with steps, below a registered ancestor (at resolution), and for `filter`/`nth`/`describe` after (P1, P3, P5; run1
  p03, p04); with `strictChains` too (P6).
- **`skip`/`unskip`** and builders kept across them: every changing method rejects a skipped segment; a kept builder
  applies after `unskip` (P1, P3; run1 p16).
- **Descriptions**: default path, query `describe`, `describe("")`, non-string; where Playwright 1.64 shows them
  (toString, `description()`, the assertion's `Locator:` line, the call log, the strict-mode error, the HTML report's
  row as title plus subtitle) (P1, P3, S1).
- **Kept queries**: a later ancestor stays out, with the documented message; a later `has` path resolves; a query
  resolved after its page closed builds, and its action fails with Playwright's closed-target error (P1, P3, P6).
- **Queries in an `add` chain's arguments**: the four messages, exact (P4; run1 p09, p05).
- **A page object's queries**: as the first locator call, and inside `defineLocators()` before `add` (P6).
- **Messages**: 40 query and update-builder messages on the pages, exact, at the documented calls (P3).
- **Types**: sub-paths per member on literal, template (also mid-pattern), pattern-typed, union, `<string>`, generic
  function and generic base forms; `skip` excludes the query's own path; named query types (T1, T3; repository
  `publicTypes.typecheck.ts`); the `exactOptionalPropertyTypes` behaviour mirrors Playwright's (T5).
- **Names**: `__proto__`, `constructor`, `toString`, `hasOwnProperty` as path segments and sub-paths; queries and
  builders are not thenable (P7).
- **The change set**: 9bcf72e, 8bdcd35, b990969, 890dbd8 and 49454c6 each hold on every path probed (P1-P4, T1, T3);
  their changesets describe them, with the one sentence of 2C-1.

## Outside the segment

- **2I (contributor guide)**: `src/locators/AGENTS.md`, *Contracts*, says `replace` takes Playwright's argument lists
  "(the first argument required, …)", the statement 2C-1 corrects on the pages; `frameLocator()`'s selector is optional
  in `replace` mode (P5).
- **2B (registration)**: the first review's p12 calls `add("anyFrame2").frameLocator().describe("x")`, which fails with
  `Cannot read properties of undefined (reading 'describe')` because the any-frame registration returns nothing, as
  `frames.md` and the doc comment say; TypeScript types it `undefined`. Not a defect; noted so 2B can confirm.
- **2H (docs)**: `locator-paths.md`, *What catches a missed spot*, shows the message
  `… parameter of type '"main" | "main.section@order"'`; TypeScript prints that for a `skip` on a query of
  `main.section@order.region@subscription`, and a three-member union for the page's own example query
  (`…region@subscription.button@edit`) (T2). Accurate as an instance; not filed.

## Pass 2: the first review's findings at `d850405`

Fixed 6 (C-2, C-3, C-4, C-5, C-6, C-7); fixed differently 1 (C-1: its untyped-registry case is now a decided compile
error, its `PageObject<string>` and template-member cases are fixed); still present 0; not fixed 0; fixed incompletely
0; regressed 0; cannot re-run 0. Its *what is sound* lines all hold; its test gaps 1 to 4 are closed, 5 and 6 partly
(table in [first-review.md](first-review.md)).

## What passes 3 and 4 changed

- Pass 3 found no disagreement on any outcome, no blind spot among the first review's findings, and that all three of
  this review's findings are misses of the first review (each statement or call existed at `54cdada`; 2C-1 is a near
  miss: the first review's C-4 quoted the sentence for another clause). It named four lines neither review had probed
  deeply.
- Pass 4 probed those four (P6: object values in a patch, `strictChains`, the page object's facade, a closed page) and
  walked the Phase-1 list for what both maps leave out (T5: `exactOptionalPropertyTypes`; P7: prototype names,
  thenability). No new finding; 2C-3 gained the unprobed generic-base risk of its option (a). No source sketch was
  proposed: 2C-1 and 2C-2 change docs only, and 2C-3 is a design question.

## Findings

| ID | Kind | Severity | Semver | Pass | First review | One line |
| --- | --- | --- | --- | --- | --- | --- |
| [2C-1](defect-2C-1-replace-first-argument-required.md) | documentation | Low | none | 1 | missed | Five statements (two on the update builder's page, *Queries*, *Builders*, the type's doc comment) and a changeset say `replace`'s first argument is always required and that every method throws without it; `replace(…).frameLocator()` takes none (the any-frame form) |
| [2C-2](defect-2C-2-errors-page-getlocatorschema.md) | documentation | Low | none | 1 | missed | *Error messages* lists the unregistered-path message under `getNestedLocator`, `getLocator`, a query's resolving methods and `verify()`; `getLocatorSchema` throws it at its own call |
| [2C-3](defect-2C-3-replace-any-frame-terminal-compiles.md) | design question | Low | patch, if adopted | 1 | missed | `replace().frameLocator()` without a selector on the query's own path compiles though it always throws, while `skip()` of that path is a compile error |

Counts: defects 0, documentation 2, suspected 0, design questions 1.
