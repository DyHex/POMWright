# Plan: the benchmarks and *Internal → Performance* (2G-4, and the maintainer's review of the benchmarks)

- **Decisions**: [107 (point 5), 115](DECISIONS.md) (2026-10-29)
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
*Limitations*); and, by decision 115, a benchmark of the session storage calls, which phase 2 adds.

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

## Phase 1: the findings (2026-10-30, at `a49e6f4`)

Three runs of `pnpm bench`, three under `taskset -c 0-3`, and two runs each of three scratch variants of the per-call
section: the kinds in reverse order; and a "fixed" variant with each kind warmed first, a garbage collection before each
sample, every result kept, and the inputs prepared outside the timer. The variants are copies of the script's section,
not the script fixed, on one machine, two or three runs each. Agreed with the maintainer on 2026-10-30 (decision 126):
all fixes, five processes per run, the affinity and load printed, the storage benchmark kept.

**The page against the output:**

- P1 (2G-4): the `count()` round trip comes from no script: 326 to 862 µs over two runs of the variant, against the
  page's 370 to 710; at the low end the longest chain is 5.1% of one, not "under 5%". Fix: `pnpm bench` prints it.
- P2: the introduction's "a round trip takes about a millisecond" contradicts the conclusion's 370 to 710 µs.
- P3: "no column moved more than 19%" since 2026-10-22: two 108-path cells moved +24% and −49% (2G-4). Fix: drop it.
- P4: "30 to 90 ns per path" for the path check comes from a probe of the first review, not from `pnpm bench`. Fix: drop
  it.
- P5: "five to six times" (resolving against the Playwright chain) is 4.4 to 6.8 in the three runs; "four to six times"
  (the fixture) is 3.6 to 6.0. Fix: ranges from the kept runs.
- P6: "within about 12%" between two runs: the median spread of three runs is 6%, but the 108-path heap (83%), the
  108-path page object (33%) and the 1,008-path Playwright fixture (27%) are outside it, the last not among the page's
  exceptions. Fix: every cell's range from several runs.

**The method:**

- M1: one process per run, and the page shows one run; between processes the median spread is 6% and the largest 83%.
  Fix: five fresh processes, each cell's median and range.
- M2: not pinned on a hybrid CPU (8 cores at 5.4 GHz, 16 at 4.0 GHz). Under `taskset -c 0-3` the median spread fell from
  6.1% to 4.2% and the largest from 83% to 32% (three runs each). The first run started at a load average of 14 and
  the script did not say so. Fix: the machine line prints the CPU affinity and the load average at the start;
  `test/AGENTS.md` names `taskset -c 0-3` as the reference run on the maintainer's machine.
- M3: the kind measured first meets other compiled code: the shortest chain's registration was 0.97 to 1.10 µs measured
  first and 0.77 to 0.81 µs measured last; other cells moved within the noise. Fix: every kind warmed before any is
  measured.
- M4: the timed registration also builds the chain's segments and a fresh registry (0.06 to 0.09 µs). Fix: inputs
  prepared outside the timer; the registry's creation timed on its own.
- M5: no garbage collection between samples, and results unused; no effect beyond the noise. Fix: a collection before
  each sample, every result kept.
- M6: the scaling heap is the last run's, not a median; the 108-path heap varies threefold. Fix: the median of runs.
- M7: in 2G-4's `count()` method the first of five runs is the highest (862, 714 against about 400): 50 warm-up calls
  are too few. Fix: a longer warm-up.
- M8: a failing fixture run says only "Command failed": its output is discarded. Fix: show it on failure.
- The comparisons are like with like; the Playwright chain is built through dynamic calls with spread arguments, a
  little slower than code written out, which the page says.

## Phase 2: fix, rerun, rewrite (after the maintainer's go)

1. Fix what phase 1 found, and make the agreed improvements.
2. Add the `count()` round trip to `scripts/benchmark.mjs` (2G-4), measured as the other rows are.
3. **The storage benchmark (decision 115)**: a bench spec for `set`, `get`, `clear` and `seed` by key count and value
   size on three browsers, each against the fewest plain Playwright calls that do the same storage work, `seed` against
   the two hand-written `addInitScript` baselines (the call and the arrival timed); the quota; decision 114's check
   against a build of the commit before it; at rest and under the harness's parallel workers.
4. Rerun `pnpm bench` several times on one machine, at rest, and keep every run's output.
5. Rewrite *Internal → Performance* from that output, thoroughly: every number and claim traced to the output; ranges
   and the spread across runs where the machine's noise is larger than a fixed percentage can carry; the machine line;
   the conclusion only as strong as the numbers; *Limitations* updated; a section for the storage benchmark, which
   *Session storage*'s *Size and cost* then links.
6. `test/AGENTS.md`'s `pnpm bench` bullet, if the commands or what they print change.

## Verification

Each fix to the method shown on the numbers it changes (before and after); `pnpm lint`; `pnpm docs:build`; the page's
numbers checked against the kept output once more before the commit.

## Execution

Phase 1: no commit, a report. Phase 2: one commit for the scripts, one for the page, with `Plan:
defect-review-result-2/PLAN-bench-performance.md` and the `Co-Authored-By:` trailer. The maintainer pushes.

## Execution notes

Built 2026-10-30: phase 1's findings and decision 126 in `cd7b61f`, the scripts in `649d903`, the page in `026cba4`;
this record follows. The runs' output is kept in [bench-runs/](bench-runs/).

1. **The method, as agreed.** `pnpm bench` runs each section five times in fresh processes and prints each cell's
   median and range; the machine line prints the CPUs the process may use and the load average at the start. The
   registry section warms every kind first, prepares inputs outside the timer, times a registry's creation on its own
   (0.059 µs), collects before each sample, keeps every result, takes the heap's median, and measures the round trip
   after 500 calls to warm up. A failing Playwright run shows its output. Sections can be named, and
   `POMWRIGHT_BENCH_RUNS=1` runs once.
2. **The storage benchmark (decision 115)**, `test/benchmarks/sessionStorage.spec.ts`, through
   `playwright.bench.config.ts`, which now has a `fixture` project and three `storage-*` projects and starts the test
   server only for the storage section (`POMWRIGHT_BENCH_SERVER`). Under the harness's parallel workers means half the
   CPUs the process may use, as the harness's "50%", so 2 workers when pinned to CPUs 0 to 3, as on CI's runner, and 16
   unpinned. Decision 114's comparison runs against a build of `c7d998c` (`0764cda^`), exported with `git archive`,
   built and packed in the scratchpad, and loaded through `POMWRIGHT_BENCH_BASELINE`, with `NODE_PATH` pointing its
   `require` of `@playwright/test` at the harness's copy.
3. **Unexpected, corrected during the build: one long test made Playwright's own calls look slow.** In the first
   version, one test held every case, and Playwright's plain calls at 100 keys took 68 to 127 ms against POMWright's
   60. Probes, each a temporary spec deleted after its run: the same calls in a short test took 35 to 43 ms; within one
   test, 100 calls grew from about 33 to 43 ms over 9,000 steps; a call in the test body cost more than one inside a
   step (pinned, chromium and webkit, 10 rounds: 35 to 52 against 27 to 44 ms per 100). So each case is now a test of
   its own on a shared page, and Playwright's calls come out at about 0.3 ms per key; the page says why, and that
   Playwright's calls are measured as a test writes them, in its body.
4. **Pinning, measured.** Unpinned, 100 plain `setItem` calls took a median of 46 to 54 ms with ranges of 23 to 86;
   pinned to CPUs 0 to 3, 28 to 40 ms with ranges of 24 to 60 (one run per browser). Across the kept runs, the median
   range of a cell: pinned to 0 to 3, locator tables 13%, storage at rest 9%; unpinned, 5% and 54%. Pinned, the
   locator tables' widest cells are the registries of 10,000 paths and more; why the unpinned run spread less there is
   not known. A fourth run, pinned to all eight performance cores (`taskset -c 0-15`), spread 13% and 24%, so CPUs 0 to
   3 stay the reference; a docs build ran during part of that fourth run, so its figures are weaker than the others.
5. **The kept runs**: `run1-pinned.out` (the page's), `run2-pinned.out`, both `taskset -c 0-3` at `649d903`, with the
   baseline build; `run3-unpinned.out`; `run4-pinned-0-15.out`; `runs.log` with each run's time (about 11.5 minutes
   pinned). Run 2 differs from run 1 by 1.8% in the median cell of the locator tables (12% at most) and by 3.0% in the
   storage tables' (82% at most, WebKit's arrival under load).
6. **The page against the output**: every one of its 231 cells with a range is in `run1-pinned.out` verbatim (checked
   by a script); the ratios and per-path figures were computed from the output (the chart values to two decimals). The
   claims across runs (the ratios' ranges, WebKit's arrival at 10 keys 0 to 15 ms above the scripts', the arrival's 8 to
   10 ms for 100 entries) are from runs 1 to 3.
7. **Verification**: `pnpm lint`, `pnpm lint:guide`, `tsc -p test`, `pnpm docs:build`, `pnpm docs:diagrams` (17
   diagrams, light and dark, no problems), `docsChains.spec.ts` (19 passed).
8. **Stand-ins**: the baseline build is a real build of an older commit, not a stand-in; the probes behind note 3 ran in
   the real runner on the test server. The two init scripts are what a test would write by hand, the comparison the
   page draws, and the page lists what they leave out.
