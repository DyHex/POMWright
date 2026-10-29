# Plan: the benchmarks and *Internal → Performance* (2G-4, and the maintainer's review of the benchmarks)

- **Decision**: [107 (point 5)](DECISIONS.md) (2026-10-29)
- **Findings**: [2G-4](G-ci-release-publishing/defect-2G-4-performance-scale-line-not-reproducible.md) (Low); the rest
  comes from this plan's own review
- **Bump**: none (a script, a bench spec, a page)
- **Stop**: **yes**, after phase 1: the review's findings and the proposed fixes go to the maintainer before anything
  changes
- **Depends on**: every code plan built (the measurements are of the code that ships); it replaces the bench rerun
  `test/AGENTS.md` asks after a registry change (decision 88)

## Scope

`scripts/benchmark.mjs` (`pnpm bench`: registering, resolving and verifying, in Node), `test/benchmarks/
pageObjectFixture.spec.ts` with `test/playwright.bench.config.ts` (a page object set up as a fixture), and every number
and claim of `website/src/content/docs/internal/performance.md` (*Basis for testing*, *Results*, *Conclusion*,
*Limitations*).

## Phase 1: review (no change)

Read the three files and the page whole, run `pnpm bench` several times, and check, with each finding written as the
review's findings were (what, evidence, fix):

- **What is measured**: does each timed region hold only the work it names (no setup, no logging, no first-call
  compilation inside it), and is its result used, so the engine cannot drop the work.
- **Method**: warm-up, iteration counts, the timer (`process.hrtime.bigint()` or `performance.now()`), garbage
  collection between samples (`--expose-gc` is passed), the statistic reported (median, spread), how many runs.
- **The fixture benchmark**: what Playwright's runner adds around the fixture, and whether the spec separates it.
- **Comparisons**: whether each comparison on the page (against Playwright's own locators, across sizes) compares like
  with like.
- **The page against the output**: every number traced to a line the script prints; claims of stability ("no column
  moved more than 19%") against several runs; the "for scale" round trip (2G-4: from no script; 194 to 741 µs against
  the page's 370 to 710; 8.6% at the low end against "under 5%").
- **Reproducibility**: the commands, the machine line, what a reader needs to rerun it.

Then **stop**: report the findings and the proposed fixes and improvements to the maintainer.

## Phase 2: fix, rerun, rewrite (after the maintainer's go)

1. Fix what phase 1 found, and make the agreed improvements.
2. Add the `count()` round trip to `scripts/benchmark.mjs` (2G-4), measured as the other rows are.
3. Rerun `pnpm bench` several times on one machine, at rest, and keep every run's output.
4. Rewrite *Internal → Performance* from that output, thoroughly: every number and claim traced to the output; ranges
   and the spread across runs where the machine's noise is larger than a fixed percentage can carry; the machine line;
   the conclusion only as strong as the numbers; *Limitations* updated.
5. `test/AGENTS.md`'s `pnpm bench` bullet, if the commands or what they print change.

## Verification

Each fix to the method shown on the numbers it changes (before and after); `pnpm lint`; `pnpm docs:build`; the page's
numbers checked against the kept output once more before the commit.

## Execution

Phase 1: no commit, a report. Phase 2: one commit for the scripts, one for the page, with `Plan:
defect-review-result-2/PLAN-bench-performance.md` and the `Co-Authored-By:` trailer. The maintainer pushes.
