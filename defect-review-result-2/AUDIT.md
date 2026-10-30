# The closing audit of both review folders (rule 7 of `docs/releases.md`)

2026-10-30, at `e8741e4`, after every plan of the second review was built. `defect-review-result/` was audited by its
plan 41 (part 2, 2026-10-28) and kept as the second review's reference; this audit takes up what that one left to the
second review, audits `defect-review-result-2/`, and searches the repository outside both folders. The folders are
deleted on the maintainer's word, after the moves and the issues below.

## What was read

- **In full**: `DECISIONS.md` decisions 79 to 126, each one's *Decided*, *Rejected* and *Why* checked against the
  Internal pages, the guide, the code comments and the specs; the ledger (`report.md`, every row's status); `report.md`
  section 3's test gaps and section 10's account of the first review's leftovers; every plan's *Execution notes*,
  searched for debt, follow-ups, gaps and remedies, and read where they hold one (2A's follow-up, 2B, 2R-2/2R-3, 2I,
  T17, the benchmarks); `ISSUE-after-merge.md`; plan 41's part 2 in the first folder.
- **Through the ledger, not one by one**: the finding files and the segment folders (summaries, inventories, logs,
  probes); every finding is done or settled by a decision, and the segments' gaps and unfiled items reach the decisions
  through `report.md` sections 3 and 9 (decision 112).

## The first review's leftovers

Settled by the second review (`report.md` section 10, decisions 105, 108 and 112): its *Considered and not filed* items
agreed and not filed (one filed as 2D-2); E's gap 7 by decision 105's pages; the British spellings by decision 108, but
for `normaliseOrigin` (below); R-3 and R-4 still present as decided (#8, #54).

## Already in place

Every finding of the second ledger is done but two, settled by decisions: 2D-4 (91, not adopted) and 2H-3 (108, the
README's line stays). The reasons and rejected options of decisions 79, 80, 81, 83, 84, 87, 89, 90, 114, 118, 119, 120,
121, 122 and 123 are on *Internal → Seed registry*, *Tests and checks*, the guide's folder files or in code comments;
the checks of decisions 95 to 100 and 124 on *Internal → Tests and checks*; the docs decisions 101 to 110 are the
pages themselves; the guide decisions 82, 109 to 111, 113, 116 and 117 are the guide; 115, 125 and 126 are the
benchmarks, the specs and *Internal → Performance*. Decision 112's three additions exist (`get`, `clear` and `seed` in
`test/step-locations/`, `pnpm lint:guide`, `pnpm lint:workflows`).

## To move (proposed)

1. Decision 91, the navigation methods stay unbound: nowhere outside the folder, though a review raised it (2D-4).
   `src/helpers/AGENTS.md`, *Considered and not planned*.
2. Decision 92, no type for `replace().frameLocator()` on the query's own path: the page and the typecheck comment say
   it compiles and throws, not why the type stays. `src/locators/AGENTS.md`, *Considered and not planned*.
3. Decision 86, why a storage call is never repeated (it would hide the test's race, in a loop unlike Playwright's):
   *Internal → Seed registry* states the rule without the reason.
4. Decision 124's rejected options (a unit test, measuring the pauses in a browser, a warning): *Internal → Tests and
   checks*, the retry pauses check.
5. `test/tests/locatorRegistry/registry/registry.verify.spec.ts:203`, "the review's probe": worded without the review.
6. `normaliseOrigin` (`src/helpers/sessionStorage.ts`, 3 occurrences, internal): `normalizeOrigin`, a refactor in a
   commit of its own (decision 108).
7. `skills/defect-review/SKILL.md`, 12 British forms: the maintainer's call (the skill is theirs, and not a page).

## Issues for the maintainer to file

- **`3.0.2 release: after the merge`**: `ISSUE-after-merge.md`, less what the maintainer has already done on GitHub.
- **`Test coverage beyond 3.0.2`** (`backlog`): decision 112's draft, plus one line from PLAN-2R-2-2R-3's notes: a call
  made while the page is mid-navigation names the page the new document reports, which no harness case reproduces
  every time (the `set` test's shape did 34 of 50 without the fix); unit tests cover the logic with a stand-in.

## The reference search

`git grep` outside both folders for the folders' names, `PLAN-`, `DECISIONS`, "decision" or "plan" with a number,
"the plan's", finding IDs and the reviews: only the guide's own description of how release work is kept
(`AGENTS.md` *How to work*, `docs/releases.md`, `docs/repository.md`'s `skills/` row) and item 5 above.
