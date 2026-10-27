# G-6: *Internal → Performance* says every per-call measurement runs 20,000 calls; registration runs 2,000

- **Kind**: documentation
- **Area**: docs, `website/src/content/docs/internal/performance.md`, "Basis for testing"; `scripts/benchmark.mjs`
- **Severity**: Low (a method detail of the benchmark; the published numbers are what the script prints)
- **Semver of the fix**: none (docs only)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer G
- **Status**: decided (2026-10-27, [DECISIONS.md #50](../DECISIONS.md))

## Contract

`website/src/content/docs/internal/performance.md` lines 25-26: "**Per call**, each measurement runs its call 20,000
times, after a warm-up run of the same size, and takes the median of 7 runs, timed with `process.hrtime`. Registration
is measured per chain and divided by its segments."

## Reproduction

`scripts/benchmark.mjs`:

```js
// line 102-105
const registration = perCall(() => {
	const fresh = createRegistryWithAccessors(page).registry;
	register(fresh, segmentsOf(`r${n++}`, kind));
}, 2_000);
// lines 109-112: the other four columns
playwright: perCall(() => playwrightChain(page, segments), 20_000),
getNestedLocator: perCall(() => registry.getNestedLocator(terminal), 20_000),
getLocator: perCall(() => registry.getLocator(terminal), 20_000),
query: perCall(() => registry.getLocatorSchema(terminal).getNestedLocator(), 20_000),
```

`perCall(fn, calls, runs = 7)` (lines 64-73) runs `calls` calls per run after a warm-up of `calls`.

## Observed / expected

Observed: the "registration, per path" column comes from 2,000 calls per run (2,000 chains, each a fresh registry),
the other four columns from 20,000. Expected: the page states each column's count, for example "each measurement runs
its call 20,000 times (registration, which builds a fresh registry per call, 2,000 times) ...".

Every other method statement on the page matches the script: 7 runs, the warm-up, 5 runs up to 10,000 paths and one
above (`runs = size <= 10_000 ? 5 : 1`), the heap after a garbage collection, the fixture config (chromium, one worker,
`repeatEach: 5`); and the three charts are the tables divided by the path counts (checked by hand, to the printed
precision).

## Cause

The page generalises the four resolution columns to the registration column.

## Fix plan

- **Intended contract**: the page describes the measurement the script makes.
- **Options**:
  - **(recommended)** Say 2,000 for registration on the page.
  - Raise registration to 20,000 calls in the script: changes the table's numbers, so the page would need a new run
    (AGENTS.md §3, `pnpm bench`).
- **Implementation steps**: one sentence of `performance.md`.
- **Tests**: none.
- **Docs**: `website/src/content/docs/internal/performance.md`, "Basis for testing".
- **Changeset**: none.
- **Decisions to tick**:
  - [x] wording, plus a fresh `pnpm bench` run after the registry changes ([DECISIONS.md #50](../DECISIONS.md))
- **Execution order**: independent.
