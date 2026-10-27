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

(filled in at execution)
