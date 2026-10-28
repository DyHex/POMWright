# 2G-4: Performance's round-trip comparison comes from no script in the repository, so `pnpm bench` cannot refresh it, and a re-measurement by the page's own description does not support "under 5%"

- **Kind**: documentation
- **Area**: The benchmark: `internal/performance.md`'s claims against `scripts/benchmark.mjs`
- **Severity**: Low (an order-of-magnitude comparison in the conclusion; the tables themselves reproduce)
- **Semver of the fix**: none (the page, and the benchmark script, which is not published)
- **Pass**: 1
- **First review**: new since 54cdada (f3a058a, 2026-10-28, added the scale line)
- **Reviewed**: `d850405`, 2026-10-28T18:08:07+01:00, Opus 5.5, second review, segment 2G

## Contract

- `website/src/content/docs/internal/performance.md`, *Basis for testing* (lines 17–18): "`scripts/benchmark.mjs`
  measures the installed package … Run it with `pnpm bench` after `pnpm harness:install`; it prints the tables below."
- The same page, *Conclusion* (lines 162–165): "For scale: on the same machine, one `count()` of a locator on a small
  page, the cheapest round trip to the browser, took between about 370 and 710 µs, the median of 200 calls in each of
  five runs. Resolving the longest chain measured here costs under 5% of that. A page object of about 100 paths defines
  and verifies its locators in the time of one to three such round trips (1.0 ms), and is set up as a fixture in that of
  four to eight (2.8 ms)."
- `test/AGENTS.md`, *Commands* (lines 29–33): `pnpm bench` prints "the tables of *Internal → Performance*"; "rerun it and
  update the page, its machine line included, when a change touches the registry or resolution".
- `AGENTS.md`, *How to work*: "Every runtime or type claim in a plan, a page or a doc comment is backed by a probe or a
  test run".

## Reproduction

The benchmark itself, on the same CPU model as the page's machine line (13th Gen Intel Core i9-13980HX, Linux, Node
24.22.0, Playwright 1.64.0); the code measured on the page (`e571381`) differs from `d850405` only in comments and
`package.json`'s description (`git diff --stat e571381 d850405 -- src index.ts package.json …`):

```sh
pnpm bench   # from the worktree root, after the baseline's install; exit 0, 31 s; output in G/bench/run1.out
```

No file under `scripts/` or `test/benchmarks/` measures `count()` (`grep -rn "count()" scripts test/benchmarks`: no
match). `G/bench/count.mjs` measures it as the page describes: a small page (`setContent` with a `main`, a section and
a button), one locator, 50 warm-up calls, then the median of 200 `count()` calls in each of five runs, with the root's
Playwright as `scripts/benchmark.mjs` loads it:

```sh
node /home/magdys/workspace/dyhex/POMWright-second-review-probes/G/bench/count.mjs   # run 5 times; exit 0 each
```

## Observed / expected

The tables reproduce in shape: every number of this run is within about 10–25% of the page's, nearly all lower (the
Playwright baseline too: 0.390 against 0.504 µs, 1.96 against 2.24 µs), and every ratio the conclusion states holds
(`getNestedLocator` 4.7 to 6.8 times the Playwright chain; the fixture 3.7 to 5.8 times; about 300 bytes per path).
That is what the page's *Limitations* lead a reader to expect.

The round trip does not. Five runs of `count.mjs` (`G/bench/count.out` and above):

```text
median µs per count(), five runs: 602, 505, 396, 395, 344
median µs per count(), five runs: 576, 413, 286, 194, 202
median µs per count(), five runs: 692, 434, 469, 203, 207
median µs per count(), five runs: 741, 666, 553, 362, 379
median µs per count(), five runs: 638, 504, 468, 409, 480
```

194 to 741 µs, against the page's 370 to 710. At the low end the page's longest chain (16.6 µs, its own table) is 8.6%
of a round trip, not "under 5%", and a 100-path page object (1.0 ms) takes five round trips, not "one to three". The
order of magnitude holds; the stated bounds do not, and nothing in the repository can re-measure them: `pnpm bench`
prints no such line, so the instruction to rerun it and update the page leaves this paragraph as it was.

A smaller point on the same page (lines 41–43): "Against the numbers measured before this release's fixes (2026-10-22,
61e266c), no column moved more than the Playwright baseline did between the two days (up to 19%)". The previous tables
(`git show f3a058a^:website/src/content/docs/internal/performance.md`) and the current ones differ by +24% in the
108-path page object cell (0.780 to 0.969 ms) and −49% in the 108-path heap cell (0.049 to 0.025 MB). The page's
previous sentence says the 108-path rows vary by up to 50% between runs, so this is noise, but the sentence as written
says no cell moved more than 19%.

## Cause

The scale line was measured by hand when the page was written (f3a058a); the probe was not added to
`scripts/benchmark.mjs`.

## Fix plan

Intended contract: every figure the page states comes from `pnpm bench`, so a rerun refreshes all of them.

Options:

1. **Recommended**: add the round trip to `scripts/benchmark.mjs` (a `setContent` page, a warm-up, the median of 200
   `count()` calls in each of five runs, printed as a line under the tables, as `G/bench/count.mjs` does), and word the
   comparison from that line ("a few hundred µs; resolving the longest chain costs a few percent of one"). Cost: a few
   seconds per `pnpm bench`.
2. Docs only: drop the bounds and keep the order of magnitude ("a round trip takes a few hundred µs"). Leaves an
   unreproducible figure out of the page rather than in it.

Also: lines 41–43, "no column moved more than … (up to 19%), the 108-path rows aside". Tests: none (the benchmark is not
part of CI, by decision). Docs: `performance.md` *Basis for testing* and *Conclusion*; `test/AGENTS.md` line 32 if the
printed output gains a line. Changeset: none. Decisions to tick: option 1 or 2.
