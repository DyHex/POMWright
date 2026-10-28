# Plan 37: *Performance*: the call counts, and a fresh benchmark

- **Decisions**: [DECISIONS.md](DECISIONS.md) #50
- **Findings**: [G-6](G-ci-and-tooling/defect-G-6-performance-call-count.md)
- **Bump**: none (docs)
- **Stop**: no
- **Depends on**: plans 9, 12 and 16 (the registry, query and page-object changes the numbers must reflect)

## Contract

*Internal → Performance*, *Basis for testing*, states each column's call count: "each measurement runs its call 20,000
times (registration, which builds a fresh registry for each call, 2,000 times), after a warm-up run of the same size,
…", and its tables, charts and machine line come from a fresh `pnpm bench` on the final code (AGENTS.md §3). A
noticeable change, for example registration after the path check at `add` (estimated at 30–90 ns per path), is said on
the page.

## Current behaviour

The page says every per-call measurement runs 20,000 calls; `scripts/benchmark.mjs` runs registration 2,000 times per
run and the other columns 20,000. The numbers predate this branch.

## Steps

1. `pnpm harness:install`, then `pnpm bench` on an otherwise idle machine; record the raw output in *Execution notes*.
2. *Performance*: the wording above; the tables, the charts' data and the machine line from the run; a sentence for any
   column that moved noticeably against the previous numbers, with the reason (the path check at `add`, the query's
   failure-branch lookup, the page object's call site).
3. The two chart series keep their colours (AGENTS.md §9).

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`; the page's Mermaid charts render (`pnpm docs:diagrams`, plan
6).

## Commit

```text
docs: Performance states each column's call count, with numbers from the final code

Plan: defect-review-result/PLAN-G-6-benchmark.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-28.

- `pnpm harness:install`, then `pnpm bench`, started once the one-minute load average was below 4 on 32 threads (the
  desktop's own processes running; no test run). The raw output, which the page now shows:

```text
Measured 2026-10-28 at e571381 with Node v24.22.0, Playwright 1.64.0,
13th Gen Intel(R) Core(TM) i9-13980HX, linux 7.0.0-38-generic.

| path | Playwright chain | `getNestedLocator` | `getLocator` | query, `getNestedLocator()` | registration, per path |
| --- | --- | --- | --- | --- | --- |
| short, plain (3 segments) | 0.504 µs | 3.07 µs | 1.49 µs | 3.09 µs | 1.29 µs |
| short, a step per segment (3 segments) | 0.781 µs | 3.80 µs | 1.76 µs | 3.89 µs | 1.67 µs |
| long, plain (12 segments) | 2.24 µs | 13.1 µs | 3.69 µs | 13.1 µs | 1.04 µs |
| long, a step per segment (12 segments) | 3.53 µs | 16.3 µs | 4.12 µs | 16.6 µs | 1.81 µs |

| registered paths | registration | `verify()` | page object: `defineLocators()` and `verify()` | heap |
| --- | --- | --- | --- | --- |
| 108 | 0.287 ms | 0.372 ms | 0.969 ms | 0.025 MB |
| 1,008 | 2.01 ms | 3.07 ms | 5.19 ms | 0.263 MB |
| 10,008 | 17.6 ms | 29.0 ms | 48.8 ms | 2.78 MB |
| 100,008 | 193 ms | 247 ms | 427 ms | 31.4 MB |
| 1,000,008 | 2.10 s | 2.57 s | 4.57 s | 308 MB |

| paths | page object written with Playwright: setup | heap | POMWright page object: setup, `defineLocators()` and `verify()` | heap |
| --- | --- | --- | --- | --- |
| 108 | 0.535 ms | 0.034 MB | 2.81 ms | 0.128 MB |
| 1,008 | 1.31 ms | 0.474 MB | 7.71 ms | 0.403 MB |
| 10,008 | 12.0 ms | 4.73 MB | 74.3 ms | 3.22 MB |
| 100,008 | 119 ms | 49.8 MB | 449 ms | 30.4 MB |
```

- A second run, right after, to state the spread: every cell within about 12% of the first but the 108-path rows (up
  to 51%, runs of a fraction of a millisecond) and the shortest chain's registration (23%, about a microsecond). The
  page shows the first run; the second only decides the spread sentence.
- Against the page's previous numbers (2026-10-22, `61e266c`): the Playwright baseline moved by 10 to 19% on this
  machine, `getNestedLocator` by 5 to 7%, registration per path by -4 to +15%, and the scale and fixture columns by 8 to
  12%. No column moved more than the baseline, so no change of the code shows (the path check at `add`, the query's
  failure-branch lookup, the page object's call site); the page says so in one sentence instead of a sentence per
  column.
- *Basis for testing*: the call counts as the contract words them (checked in `scripts/benchmark.mjs`: `perCall(…,
  2_000)` for registration, `20_000` for the others, a warm-up of the same size, the median of 7); the machine line
  and the spread sentence.
- Charts: the four charts' data from the first run (per path: the ms columns divided by the path count; the heap in
  bytes, MB × 1,048,576 ÷ paths), three y-axis bounds raised (10, 30 and 1,400) for the new maxima (8.97, 26 and
  1,243); colours unchanged.
- **Beyond the plan's steps**: the conclusion compares with one `count()` round trip to the browser, which `pnpm bench`
  does not measure (950 µs on the page). Re-measured with a script on the root's Playwright (a chromium page, a small
  list, 20 warm-up calls, the median of 200): 562, 707, 680, 517 and 372 µs in five runs. The page now gives "between
  about 370 and 710 µs" and the comparisons as ranges (the longest chain under 5% of it; a page object of about 100
  paths one to three round trips, as a fixture four to eight). The conclusion's other figures follow the new tables
  (13 µs on 12 segments; five to six times the hand-built chain; about 50 ms for 10,000 paths; 2.8 ms against 0.5 ms,
  0.45 s against 0.12 s; 1.5 to 17 µs).
- `pnpm docs:diagrams`: 17 diagrams on 13 pages, light and dark, 0 problems (the page's four charts among them).
- Checks: `pnpm lint` 0; `pnpm test:unit` 900 passed; `pnpm pack-test --reporter=line` exit 0 (2,427 passed, 3
  skipped; doc snippets 226; api coverage 0 problems; error messages 0 problems; step locations 31);
  `pnpm docs:diagrams` (with the site build) 0.
