# Segment 2C: the first review's scope C at `d850405`

Pass 2, 2026-10-28 15:49 +0100, Opus 5.5, second review, segment 2C. Read: `defect-review-result/C-queries/` (brief,
summary, C-1 to C-7), the ledger and test-gap rows of `report.md` for C (and B-1, B-5, B-7, which absorbed C-5, C-2,
C-4), `DECISIONS.md` #15, #20, #25, #28, #29, #36, #44, #55, #60, #71, the plans' execution notes (PLAN-C-1,
PLAN-C-6-C-7, PLAN-B-6-C-3; PLANS.md rows 7, 10, 11, 12, 27, 35, 39), `PLAN-release-gates-and-audit.md` (*for the second
review*: none of its left-over items is in the query area) and `inventory.md`'s `[C]` lines.

Every reproduction was copied from `/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/` into
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/C/run1/<ID>/` and run against this worktree with
`POMWRIGHT_ROOT=/home/magdys/workspace/dyhex/POMWright-second-review` (the probes' `lib.mjs` reads it); each output is the
`.out` file beside its probe. Type probes were copied into `test/tests/` under the first review's names, compiled with
`pnpm exec tsc --noEmit -p test --pretty false` from the worktree root, and deleted.

## Findings

| ID | First review | Outcome | What was run, and what it printed |
| --- | --- | --- | --- |
| C-1 | defect, Medium: sub-paths `never` on a `string` registry; the query's own path rejected for a template member; no sub-path in a generic base that adds paths | **fixed** for (b) `PageObject<string>` and (c) the template member; **fixed differently** for (a) `createRegistryWithAccessors(page)` without a type argument (decision #20: it now requires `<Paths>` or `<string>`) | `run1/C-1/p06-types-wide.typecheck.ts`, tsc exit 2 with errors only on (a): every path argument of the untyped registry fails with `… parameter of type '"createRegistryWithAccessors needs its paths as a type argument: createRegistryWithAccessors<Paths>(page)"'` (lines 10-14, and the sub-paths of those failed calls are `never`). Lines 25 (`PageObject<string>` sub-path) and 34 (template member's own path) no longer error. Runtime `p06-runtime-wide.mjs` and `p06-runtime-wide-errors.mjs` exit 0, the same results as filed. The generic base and `<string>` rows are in `test/tests/packaging/publicTypes.typecheck.ts:357-435`; my T1 and T3 (pass 1) add template, pattern-typed, union, generic-function and generic-base forms, all as decided. `p08-types-wide-source.typecheck.ts` (the sketch probe, against `src`) not re-run: it repeats (a), now a decided compile error |
| C-2 | defect, Low (merged into B-5): a query in an `add` chain's filter arguments got the pre-2accf34 message | **fixed** | `run1/C-2/p09-ended-by-query.mjs`, exit 0: the three query forms now end with `… If that query is in this filter's arguments, which run first, resolve it before add(…). Otherwise, …` (the `getLocator` form unchanged). Matches decision #25's wording; also my P4 (errors.md 96-97) |
| C-3 | documentation, Low: *Queries* never mentions frames | **fixed** | `run1/C-3/grep.out`: `docs/queries.md:151` *The any-frame form in a query* with the example, chain and four messages; *Frames* (`frames.md:131`) and the update builder page (`:82`) link the anchor. `run1/C-6/p03-anyframe.mjs` (exit 0) reproduces each message the section shows. The section says `describe` "is not affected" on an ancestor rather than listing it among the rejecting methods (decision #44 listed it); plan 35 recorded the more precise wording, and it is right: `describe` takes no sub-path |
| C-4 | documentation, Low (merged into B-7): the query's `describe()` had no Throws; the update builder's page and ten `@throws` missed the skipped-segment error | **fixed** | `run1/C-4/docs.out`: the *describe()* section has a **Throws** (count 1); the page has the skipped-builder sentence (`class-locatorupdatebuilder.md:74`) and all ten `@throws` have it (`locatorUpdateBuilder.ts:166 … 432`); `frameLocator`'s `@throws` now names the strategy error (`:374-375`). `p11-thrown-by-builder.mjs` exit 0, messages as filed |
| C-5 | defect, Low (merged into B-1): an own non-enumerable option, patch or filter key dropped | **fixed** | `run1/C-5/p13-readfields.mjs` exit 0: `query replace own non-enumerable: OK getByRole('listitem', { name: 'Hidden' })` and `add …: OK getByRole('listitem', { name: 'Hidden' })`, as Playwright's. Unit probe `p14-readfields-unit.test.ts` as `src/zz-probe-C5.test.ts`, `pnpm vitest run`, exit 0, 4 passed (was 2 failed). My P2 adds the filter path on a DOM |
| C-6 | defect, Low: a query's `describe()` on an any-frame terminal accepted at the call | **fixed** | `run1/C-6/p12-misc.mjs` and `p03-anyframe.mjs`, exit 0: `query describe on any-frame terminal: THROWS describe() cannot apply to "anyFrame": …`; `describe then replace` now throws at `describe` too. (`p12`'s line "registration describe on any-frame" prints `Cannot read properties of undefined (reading 'describe')`: the registration's `frameLocator()` returns nothing for the any-frame form, as documented, so the probe's chained call fails in JavaScript; segment 2B's area, not a change) |
| C-7 | defect, Low: a kept query said a later-registered ancestor had "no locator schema" | **fixed** | `run1/C-7/p15-kept-query-message.mjs` exit 0: `… It is a segment of that path, and it was registered after this query was taken; take a new query with getLocatorSchema("shell.list.item") to use it.` |

Counts: fixed 6 (C-2 to C-7), fixed and fixed differently 1 (C-1), still present 0, not fixed 0, fixed incompletely 0,
regressed 0, cannot re-run 0.

## The first review's other claims

*What is sound* (summary.md, lines 82-125), re-run with its probes in `run1/sound/` (every one exit 0):

| Claim | Outcome at `d850405` |
| --- | --- |
| Independence, copies (p05, p10) | holds; p05 now also shows C-7's and C-2's new messages |
| Steps, `clearSteps`, `nth` values given to Playwright (p01, p07) | holds; DOM texts as filed (`nth 1.5 count 1`, `NaN` and `undefined` count 0, as Playwright's own) |
| `describe`, `describe("")` (p01, p10) | holds |
| Where Playwright shows a description (p18) | holds; checked independently by my S1 (step title `Click` + subtitle, `Locator:` line, call log and strict-mode chains, read from the HTML report's data), so p18 was not re-run |
| `update`: the *Queries* table, merge patch per strategy, empty strings, strategy change, `undefined` first argument (p01, p02, p04, p16) | holds |
| `replace`: argument lists, `null` options, `replace` then `update`, `frameLocator(selector)` with steps (p02, p17, and `publicTypes.typecheck.ts`) | holds |
| The any-frame form in a query (p03, p04) | holds, with C-6's added check |
| `skip`/`unskip` (p01, p16) | holds |
| Types on a literal union (type probe C2, now `publicTypes.typecheck.ts`) | holds (baseline `pnpm typecheck` exit 0; my T1, T3, T4) |
| Public declarations return the alias, never `this` | holds (`dist/index.d.ts` unchanged from the baseline tarball; T1 names the returned types) |
| Change set against v3.0.1 (p16) | p16 at `d850405` prints only intended behaviour; the later commits are covered by the pass-1 change-set review |
| Docs: every chain and message on the query pages | holds (my P3: 40 messages; `docsChains.spec.ts` rebuilds the chains, baseline green) |
| errors.md against the throw sites; two unreachable `locatorUpdateBuilder.ts` sites | holds; the unreachable sites are now listed as internal in `scripts/check-error-messages.mjs`'s sense (baseline: "9 internal") |

*Outside the scope* note (upgrade page and `getById("")`): fixed by decision #45; `docs/upgrading-from-2x.md` now names
`locator`, `frameLocator`, `getByRole` and `getById`.

## The first review's test gaps for the area

| # | Gap | At `d850405` |
| --- | --- | --- |
| 1 | Sub-path types on non-literal path types | **closed**: `publicTypes.typecheck.ts:357-435` (literal, template, finite union, `<string>`, untyped, generic wrapper, generic base) and the `expectTypeOf` in `locatorQueryBuilder.test.ts` |
| 2 | The registration-end message when a query ends it | **closed**: `add.registrationEnds.spec.ts:137` (packed), unit cases in `locatorRegistrationBuilder.test.ts` |
| 3 | `update`'s merge patch and the query's `describe` tested against source only | **closed**: every spec under `test/tests/locatorRegistry/` imports `pomwright` or uses the `pomwright` fixtures (decisions #55, #71; `getLocatorSchema.update.spec.ts:366-370`, `getLocatorSchema.describe.spec.ts:83`) |
| 4 | The any-frame form in a query tested against source only | **closed**: `add.frameLocator.spec.ts:186-216`, `getLocatorSchema.replace.spec.ts:53` (packed) |
| 5 | `readFields` through a query | **partly closed**: a query's `update` patch as a class instance and with a non-enumerable key, on a DOM (`add.get.clone.spec.ts:110-142`); `replace` options and `filter` objects as class instances or with non-enumerable keys stay unit-level only (my P2 probes them) |
| 6 | A query kept across later registrations | **partly closed**: the message is unit-tested (`locatorQueryBuilder.test.ts:211`); no packed spec pins the snapshot (a later ancestor stays out of the kept query's chain) or the message |
