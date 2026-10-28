# Segment 2B: Registration and resolution: summary

- **Scope**: segment 2B of the second review, reviewed as an area at `d850405` (`fix/review-3-0-2`), with the commits
  since `v3.0.1` that touch registration and resolution as a change set, those after `54cdada` first (`49454c6`,
  `ff6495e`, `2d2c504`, `f46b982`, `890dbd8`, `b990969`, `7f90436`, `445fc71`, `80cb5ea`, the packed-twin and
  docs commits).
- **Worktree**: `/home/magdys/workspace/dyhex/POMWright-second-review`, detached at `d850405`, the baseline's build.
- **Reviewer**: Opus 5.5, second review, segment 2B. Finished 2026-10-28T15:20:53+01:00.
- **Probes**: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/B/` (`pNN` runtime probes against
  `dist/index.mjs` with chromium from the root package; `tNN` type probes, copied into `test/tests/` for one
  `tsc --noEmit -p test` and deleted; `run1/` the first review's reproductions; `sketch/` the proposed fix sketch).
- **Log**: [log.md](log.md); maps: [inventory-blind.md](inventory-blind.md), [inventory-reconciled.md](inventory-reconciled.md);
  pass 2: [first-review.md](first-review.md).

## What was read

- The method (`skills/defect-review/SKILL.md`, the worktree's copy), `segments.md`, `baseline.md`, the brief; the guide:
  `AGENTS.md`, `src/AGENTS.md`, `src/locators/AGENTS.md`, `test/AGENTS.md`, in full; `docs/versioning.md`'s bump rules.
- Source, in full with doc comments: `src/locators/locatorRegistry.ts`, `locatorRegistrationBuilder.ts`,
  `reusableLocatorBuilder.ts`, `utils.ts`, `types.ts`, `index.ts`, `fakePage.ts`, `src/pageObject.ts`; the query and
  update builders as far as resolution and seeded overrides use them; `index.ts`.
- Unit tests: the test names of the four in-scope files, and the cases a finding touches. Harness: the list of
  `test/tests/locatorRegistry/`, `testIds.spec.ts` and `add.getById.spec.ts` (RegExp flags), `docsChains.spec.ts` (which
  chains it rebuilds).
- Docs: the eight *Docs* pages of the brief, `api/class-locatorregistry`, `class-registrationbuilder`,
  `class-reusablelocator`, `errors` (all of it), `api/types` (the registry's types), `api/class-pageobject` (registry
  parts), `docs/descriptions` (reuse), the five *Internal* pages (performance skimmed); the change set's changesets.
- Pass 2: the first review's scope B folder, its ledger rows, decisions #15, #21, #22, #25, #27, #36, #43, the six B plans'
  execution notes, `PLAN-release-gates-and-audit.md`'s items for the second review, `inventory.md`'s `[B]` lines.

## Coverage

Inventory lines (see [inventory-reconciled.md](inventory-reconciled.md)):

- **Reviewed fully**: paths and their types (B-10, B-11, B-05, B-30); registration and its end (B-08, B-12, B-13, B-15,
  B-16); copies (B-14, through the code and pass 2's re-run of the first review's `p04`); the `STRATEGIES` table (B-17);
  `getById` (B-18); reuse and seeds (B-19 to B-21); resolution, `has` paths, frames, the any-frame form (B-22 to B-25,
  B-28); `verify()` and `strictChains` (B-26, B-03); the page object's check after construction (B-09, B-27); the
  messages and `@throws` of the area (B-29); the change set (B-33); every doc-comment `@example` of the area.
- **Reviewed partly**: the docs' chains (spot-checked in `p01`, `p06`, `p06c`; `docsChains.spec.ts` rebuilds them all and
  passed in the baseline); `publicTypes.typecheck.ts` and `publicTypes.emit.ts` (passed in the baseline, not read case by
  case: 2F's); the performance page (skimmed, not measured).
- **Not reviewed**: sub-path types and the query's own behavior (2C's); the upgrade guide's registration parts (2H's).
- **Not run**: the full harness or unit suites (the baseline ran them; no finding depends on them); Node 20 and 22 (no
  URL code here); `pnpm bench`; a base worktree at `v3.0.1` (no regression was suspected: 2B-1's escaper and unit test
  are unchanged since before `54cdada`, `git show 54cdada:src/locators/utils.ts`). Firefox and WebKit ran for every
  browser-behavior probe (`p02`, `p02c`, `p02d`, `p02e`, `p08`, the 2B-1 reproduction).
- **Port 9000**: free at the start and at the end; no harness run used it. No second worktree was added. The worktree is
  as found: `git status --porcelain` empty, `--ignored` as in baseline.md, `dist/` still the baseline's build.
- **Fix sketch**: proposed for 2B-1 only (`sketch/2B-1.diff`, `sketch/2B-1.run.sh`; `git apply --check` passes at
  `d850405`); not applied by this segment.

## Test gaps, most important first

1. No browser test runs a `u`- or `v`-flag RegExp through any strategy, and `utils.test.ts:93-96` pins the escaper's
   unescaped output for one (**2B-1**).
2. No type test pins that a `<string>` registry still rejects a malformed path literal, which five pages and two doc
   comments say it does not (**2B-2**).
3. No test or page covers a template member's value that holds a dot (**2B-3**).
4. Nothing reports an `add(path)` left without its locator method (**2B-4**, design).
5. The doc comments' `@example` blocks are compiled by no check (`scripts/check-doc-snippets.mjs` reads the site and the
   README only); all of this area's compile today (`t04`).
6. No test runs TypeScript's rename to keep the rename groups of *Locator paths* and *Builders* true (the first review's
   gap 7, still open; the claim holds today, `t02`).
7. `verify()`'s cost on a very deep chain (2,000 nested segments: 21.5 s, `t05/runtime.mjs`) is not measured anywhere;
   realistic depths are linear, as *Performance* says.

## What is sound

- Path rules at run time and in the types agree for every case tried, and the TypeScript texts the pages quote are
  tsc's own (`t01`); literals of 20,000 characters and 5,000 segments and a union of 3,000 paths compile in 1.4 s of
  check time, a malformed 20,000-character literal is an error (`t05`).
- Prototype names (`__proto__`, `constructor`, `hasOwnProperty`), emoji, combining marks, quotes, backslashes, `>>`,
  brackets and braces as segments: registration, resolution, `has`/`hasNot`, reuse, query sub-paths, `strictChains`
  and the description all work; `Object.prototype` is untouched (`p07`, `p07b`).
- Every `STRATEGIES` row renders exactly as Playwright's own call, under a locator, inside a frame and from a seed, with
  every option of `getByRole` and `locator` (`p05`, 30 comparisons, 0 differences).
- `getById`: 17 string ids (quotes, backslash, LF, tab, `>>`, CSS-special characters, a literal `#`) and 13 RegExps match
  as *Locating by id* says on chromium, firefox and webkit, in standards and quirks mode, case-sensitively; `y` anchors,
  `g` changes nothing; open shadow roots yes, closed no; inside a frame only through a frame segment (`p02`, `p06b`,
  `p06c`); except 2B-1.
- Frames: a frame segment with `nth`, `getById` ancestors with a `has` path inside the frame, the any-frame form before
  `getById`, a query's `skip` and `replace(…).frameLocator()`: the right element on three browsers (`p08`); the frames
  page's equivalence with Playwright's `frameLocator` chain holds (`p06c`).
- The strict-mode errors *Resolving locators* and *Frames* show are Playwright's exact text for a described locator
  (`p06`); `verify()` and resolution work on a closed page (`p06b`).
- Reuse and seed types: a single literal reusing itself (a template member's literal too) is a compile error, variables
  and patterns compile; a seeded registration offers only the seed's method; `frameLocator()` returns `undefined`; a step
  before the method, a second method, a `has` path outside the union and `createReusable.frameLocator()` are compile
  errors (`t03`).
- Every `@example` of `locatorRegistry.ts`, `locatorRegistrationBuilder.ts`, `reusableLocatorBuilder.ts` and `types.ts`
  compiles against the packed package, and a `FilterDefinition<Paths>` value is accepted by `add`'s, a query's and a
  seed's `filter` (`t04`).
- The editor's rename groups are as *Locator paths* and *Builders* describe them, with TypeScript 6.0.3 (`t02`).
- The page object's check: the define failure, the verify failure, `strictChains`, an `async` definition, a non-`Error`
  throw and a `verify()` inside `defineLocators()` give the messages of *Error messages → Page objects*, with `cause` as
  documented, sticky (the same object at every later call), and no uncaught rejection (`p09`). A subclass constructor
  that throws after `super()` still gets the scheduled check (`p03`): decided and documented (*Page objects*, *Internal →
  Page object lifecycle*), not filed.
- The change set's promises hold on every path they apply to: the path check at `add` for both reuse forms and the
  page-object facade; persist-first for every locator method, the seeded override and the any-frame form; the ended
  hints for the seeded `locator()` override; `readFields` in every copy and merge (log, pass 1). The `@throws` texts of the
  area match the thrown messages.
- The first review's *What is sound* lines hold at `d850405` (re-run in `run1/sound/`), except its `getById` line, which
  2B-1 corrects.

## Outside the segment

- `.changeset/registry-requires-paths.md` is a patch for a change that makes `createRegistryWithAccessors(page)` without a
  type argument stop compiling. Checked against `docs/versioning.md` (*Bumps*: a type corrected to what the docs promise,
  "even when code that relied on the wrong type stops compiling"): the 3.0.1 doc comment said "Pass the path union as the
  type argument", so patch fits. For 2F, no finding.
- 2B-2's correction reaches `api/errors.md`, `api/types.md` and an unreleased changeset (2H's and 2F's files); it is filed
  here because the behavior is the registry's.

## Pass 2 outcomes

Seven first-review findings (B-1 to B-7, with the merged C-5, C-2 and B-7's group as far as this area goes): **fixed 7**
(B-2's path half fixed differently: decision 22 moved the check to `add`), still present 0, not fixed 0, fixed
incompletely 0, regressed 0, cannot re-run 0. The first review's test gaps 1 to 6 are closed; gap 7 (rename) is open.
Details in [first-review.md](first-review.md).

## What passes 3 and 4 changed

- **Pass 3** (reconcile): no new finding. It named the blind pass's blind spots: no own non-enumerable input (settled by
  pass 2's re-run of `p04`), no long literal (settled in pass 4, `t05`), no message-by-message comparison with
  `errors.md` (the message-check script and pass 2's `f7`). It showed that the first review missed 2B-1 (its `p16` used a
  RegExp with two quotes, which parse), and that 2B-2 and 2B-3 are new in `49454c6`.
- **Pass 4** (hunt again): **2B-4** (an `add` without a locator method); the doc-comment examples compiled (`t04`); very
  long paths at compile and run time (`t05`); frames, the any-frame form and `getById` mixed in one chain on three browsers
  (`p08`); the page object's check, message by message (`p09`); paths that need escaping in a description (`p07b`).

## Index of finding files

| ID | Kind | Severity | Semver | Pass | First review | File | One line |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2B-1 | defect | Low | patch (`getById`); none (the other strategies: docs, upstream) | 1 | missed | [defect-2B-1-unicode-regexp-quote.md](defect-2B-1-unicode-regexp-quote.md) | A `u`/`v` RegExp with a quote, backtick or `>>` fails at the first action once resolved: `getById` through POMWright's own escaper, every other strategy because POMWright always chains `describe` after Playwright's unescaped RegExp. |
| 2B-2 | documentation | Low | none | 1 | new since 54cdada (`49454c6`) | [defect-2B-2-string-registry-format-check.md](defect-2B-2-string-registry-format-check.md) | The docs say a `<string>` registry gives up the compile-time format check; a malformed literal is still a compile error. |
| 2B-3 | documentation | Low | none | 1 | new since 54cdada (`49454c6`) | [defect-2B-3-template-value-with-dot.md](defect-2B-3-template-value-with-dot.md) | An open template part "accepts any value", but a value with a dot adds segments and chains a registered sibling as an ancestor. |
| 2B-4 | design question | Low | patch or minor by option; docs only none | 4 | missed | [defect-2B-4-add-without-locator-method.md](defect-2B-4-add-without-locator-method.md) | An `add(path)` without its locator method registers nothing and passes `verify()`, so the chains below it silently lose the segment. |
