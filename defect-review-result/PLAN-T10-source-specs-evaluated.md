# Plan 39: the source-level specs evaluated against their twins

- **Decisions**: [DECISIONS.md](DECISIONS.md) #55 (phase 2)
- **Findings**: none (test gap #10)
- **Bump**: none
- **Stop**: **yes**, before anything is removed: each removal is a decision of the maintainer
- **Depends on**: plan 27 (every twin in place), plan 31 (the same spec style)

## Contract

Each of the 26 source-level specs is compared with its packed twin. One whose twin covers the same scenarios and
assertions with equal or greater value may be removed; one that adds value (for example precision on what is stored)
stays. Nothing is removed before full packed coverage exists, and each removal is a recorded decision.

## Steps

1. For each source spec, a row in *Execution notes*: its scenarios; which the twin covers and how (DOM, chain, error);
   the source-only assertions from plan 27's table and what they add; a recommendation (remove, keep, or keep part).
2. **Stop and report** the table to the maintainer; no file is removed in this step.
3. After the maintainer's decisions (recorded in DECISIONS.md as new entries), remove the agreed specs (or parts), and
   update AGENTS.md §4 ("Know what each spec exercises") to say which source specs stay and why.

## Verify

The standard checks (PLANS.md, rule 5) after the removals.

## Commit

Only after the decisions:

```text
test: source-level locator specs whose packed twins cover them are removed

Plan: defect-review-result/PLAN-T10-source-specs-evaluated.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution, with the evaluation table)
