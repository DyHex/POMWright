---
title: Performance
description: "What registering, resolving and verifying locators cost, and what a page object costs as a fixture, in time and memory, beside the same work done with Playwright alone: the basis for testing, the results, the conclusion and the limitations."
---

Every locator a test acts on goes through the registry: it is registered once per page object and resolved at every
use. This page measures what that costs, in time and in memory, beside the same work done with Playwright alone. How
resolution works is on [Resolution](/POMWright/internal/resolution/).

In short: in a real suite the difference is too small to notice. POMWright adds microseconds per locator and about two
milliseconds per page object of a hundred paths, where a single round trip to the browser takes about a millisecond and
a test takes seconds; only page objects with tens of thousands of paths, built for every test, add tens of
milliseconds.

## Basis for testing

`scripts/benchmark.mjs` measures the installed package, the build npm would publish, on a chromium page. Run it with
`pnpm bench` after `pnpm harness:install`; it prints the tables below.

- **Four kinds of path.** A short path has 3 segments and a long one 12, with a `main` landmark, then sections, then a
  button. A plain path has only definitions; the other kind adds one filter step to every segment. Every segment is
  registered, so a chain has one Playwright locator per segment.
- **The Playwright baseline** builds the same chain directly, such as
  `page.locator("main").getByRole("region", { name: "Section 1" }).getByRole("button", { name: "Save" })`.
- **Per call**, each measurement runs its call 20,000 times, after a warm-up run of the same size, and takes the median
  of 7 runs, timed with `process.hrtime`. Registration is measured per chain and divided by its segments.
- **At scale**, a registry holds a mix of the four kinds, from about 100 to about 1,000,000 paths. Registration,
  `verify()`, and a page object's `defineLocators()` with its `verify()` are timed as one run each, the median of 5 runs
  up to 10,000 paths. The heap is read after a garbage collection, before and after registration.
- **As a fixture**, `test/benchmarks/pageObjectFixture.spec.ts` sets up two page objects with the same mix of paths in
  the Playwright runner (`test/playwright.bench.config.ts`, chromium, one worker, each case 5 times): a POMWright page
  object, and one written with Playwright alone, which builds one `Locator` field per path in its constructor, each from
  its parent's field (`this.form = this.main.getByRole(…)`). Each fixture times `new` up to the end of the microtask
  that a fixture's `await use()` gives it, when a POMWright page object has run `defineLocators()` and `verify()`, and
  reads the heap after a garbage collection, before and after.

Measured 2026-10-22 at 61e266c with Node v24.22.0, Playwright 1.64.0, on a 13th Gen Intel Core i9-13980HX under Linux.
On the same machine, two runs of this code agreed within about 10% on every table; an earlier set of runs saw up to
25% between runs of the fixture table at the small sizes, where one run of a few milliseconds is easily disturbed.

## Results

### Resolving one path

<div class="table-and-chart">

| path | Playwright chain | `getNestedLocator` | `getLocator` | query, `getNestedLocator()` | registration, per path |
| --- | --- | --- | --- | --- | --- |
| short, plain (3 segments) | 0.447 µs | 2.88 µs | 1.28 µs | 2.82 µs | 1.12 µs |
| short, a step per segment (3 segments) | 0.708 µs | 3.59 µs | 1.56 µs | 3.64 µs | 1.74 µs |
| long, plain (12 segments) | 1.91 µs | 12.4 µs | 3.31 µs | 12.5 µs | 0.933 µs |
| long, a step per segment (12 segments) | 2.97 µs | 15.5 µs | 3.61 µs | 15.6 µs | 1.84 µs |

```mermaid
%%{init: {"themeVariables": {"xyChart": {"plotColorPalette": "#3b82f6, #f97316"}}}}%%
xychart-beta
  title "One chain, µs per call"
  x-axis ["short", "short, steps", "long", "long, steps"]
  y-axis "µs" 0 --> 18
  bar [2.88, 3.59, 12.4, 15.5]
  line [0.447, 0.708, 1.91, 2.97]
```

</div>

The blue bars are `getNestedLocator`, the orange line the same chain built with Playwright.

### A registry at scale

<div class="table-and-chart">

| registered paths | registration | `verify()` | page object: `defineLocators()` and `verify()` | heap |
| --- | --- | --- | --- | --- |
| 108 | 0.249 ms | 0.347 ms | 0.780 ms | 0.049 MB |
| 1,008 | 1.98 ms | 2.75 ms | 4.84 ms | 0.271 MB |
| 10,008 | 17.0 ms | 28.2 ms | 41.6 ms | 2.73 MB |
| 100,008 | 186 ms | 223 ms | 384 ms | 31.4 MB |
| 1,000,008 | 1.89 s | 2.30 s | 4.18 s | 308 MB |

```mermaid
%%{init: {"themeVariables": {"xyChart": {"plotColorPalette": "#3b82f6, #f97316"}}}}%%
xychart-beta
  title "Per path, µs"
  x-axis ["108", "1,008", "10,008", "100,008", "1,000,008"]
  y-axis "µs" 0 --> 9
  bar [7.22, 4.8, 4.16, 3.84, 4.18]
  line [3.21, 2.73, 2.82, 2.23, 2.3]
```

</div>

The blue bars are a page object's `defineLocators()` and `verify()`, the orange line `verify()` alone, each divided by the number
of paths: the cost per path stays flat from 1,000 paths to 1,000,000.

### A page object as a fixture

<div class="table-and-chart">

| paths | written with Playwright: setup | heap | POMWright: setup, `defineLocators()` and `verify()` | heap |
| --- | --- | --- | --- | --- |
| 108 | 0.530 ms | 0.031 MB | 2.55 ms | 0.117 MB |
| 1,008 | 1.27 ms | 0.477 MB | 7.29 ms | 0.397 MB |
| 10,008 | 11.0 ms | 4.74 MB | 63.0 ms | 3.20 MB |
| 100,008 | 106 ms | 49.8 MB | 417 ms | 30.4 MB |

<div class="chart-pair">

```mermaid
%%{init: {"themeVariables": {"xyChart": {"plotColorPalette": "#3b82f6, #f97316"}}}}%%
xychart-beta
  title "Setup per path, µs"
  x-axis ["108", "1,008", "10,008", "100,008"]
  y-axis "µs" 0 --> 25
  bar [23.6, 7.23, 6.29, 4.17]
  line [4.91, 1.26, 1.1, 1.06]
```

```mermaid
%%{init: {"themeVariables": {"xyChart": {"plotColorPalette": "#3b82f6, #f97316"}}}}%%
xychart-beta
  title "Heap per path, bytes"
  x-axis ["108", "1,008", "10,008", "100,008"]
  y-axis "bytes" 0 --> 1200
  bar [1136, 413, 335, 319]
  line [301, 496, 497, 522]
```

</div>

</div>

The blue bars are the POMWright page object, the orange line the one written with Playwright, each divided by the number of paths.
At 108 paths the heap is a fraction of a megabyte and within the noise.

## Conclusion

In practice, a suite written with POMWright runs as fast as one written with Playwright alone. Every difference
measured here is in microseconds per locator, or milliseconds per page object, while a test spends its time in the
browser: navigations, page loads, the application's scripts and Playwright's waits. The details:

- **Resolving costs about 1 µs per segment.** `getNestedLocator` on a 3-segment path takes about 3 µs, on 12 segments
  about 12 µs, five to seven times what building the same chain by hand takes. The difference is the work of the
  registry: checking the path, copying the records of the chain, and describing the result.
- **`getLocator` builds one locator,** the path's own, so its cost hardly grows with the path's length.
- **A query costs the same as `getNestedLocator`,** which starts a query itself.
- **A page object is ready in about a millisecond.** Registration takes 1 to 2 µs per path, and `verify()` about
  3 µs. A page object of 100 paths defines and verifies its locators in under 1 ms; 10,000 paths take about 40 ms.
- **Everything grows linearly** with the number of paths, and a registered path takes about 300 bytes of heap.
- **As a fixture, a POMWright page object takes four to six times as long to set up** as one written with Playwright:
  2.6 ms against 0.5 ms for about 100 paths, 0.4 s against 0.1 s for 100,000. The page object written by hand has built
  every locator by then; a POMWright page object builds a locator at each use instead, for the 1.3 to 16 µs of the
  first table.
- **It takes less memory from 1,000 paths up:** about 30 MB against 50 MB for 100,000 paths. A record holds a path, a
  definition and its steps, where a Playwright `Locator` holds its whole selector chain.

For scale: on the same machine, one `count()` of a locator on a small page, the cheapest round trip to the browser,
took about 950 µs, the median of 200 calls. Resolving the longest chain measured here costs under 2% of that, and a page
object of a few hundred paths is ready in less time than one such round trip takes.

## Limitations

A benchmark measures what it isolates, under the conditions it was run in, so read the numbers as an order of
magnitude rather than as what a suite will see:

- **Only the work in Node is measured.** Building a locator talks to no browser; finding the element is the browser's
  work, at the first action, and is the same for a chain POMWright built and one written by hand.
- **Real tests spend their time elsewhere.** Navigations, page loads, the application's own scripts, network requests,
  animations and Playwright's waiting for an element to be ready take milliseconds to seconds per step, and they decide
  how long a test takes.
- **The paths are made up.** Real paths vary in length and in what they register; a mix of real page objects will not
  match these four kinds exactly.
- **The machine matters.** Another CPU, another Node version or other load on the machine gives other numbers, and the
  just-in-time compiler and the garbage collector make single measurements vary; the medians smooth that, but do not
  remove it.

To compare a change, run `pnpm bench` before and after it on the same machine.
