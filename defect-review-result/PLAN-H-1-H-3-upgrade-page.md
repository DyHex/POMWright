# Plan 36: docs: *Upgrading from 2.x*

- **Decisions**: [DECISIONS.md](DECISIONS.md) #45, #46
- **Findings**: [H-1](H-docs-readme-agents/defect-H-1-upgrade-first-argument-omits-getbyid.md),
  [H-3](H-docs-readme-agents/defect-H-3-upgrade-how-to-names-3-0-0.md)
- **Bump**: none (docs)
- **Stop**: no
- **Depends on**: plan 25 (the page's `waitForPage` example), plan 30 (the messages it quotes)

## Contract

- *Every strategy method needs its first argument*: "…an empty string for `locator`, `frameLocator`, `getByRole` and
  `getById`, which Playwright cannot use…", with the `getById` message in the example block (from a probe), so the one
  sentence covers `add`, `update` and a seeded `add` for all four.
- The page describes 3.x throughout: step 1 "`pomwright` to the latest 3.x"; the 13 example titles `title="3.0.0"` become
  `title="3.x"`; comments `// 3.0.0: …` become `// 3.x: …`; prose that describes how 3 behaves says 3.x; the
  introduction "POMWright 3 is a major release"; the page's `description`; the README's link text ("every change in 3.x
  a 2.x project meets"). The Internal pages' mentions of 3.0.0 (*Seed registry*, *Packaging*) record when something was
  introduced and stay.
- Step 3: "Each item that needs a change gives the search, run from the project's root; the others say they need none."
  The four items without one: *`defineLocators()` runs after the constructor* gains `grep -rn "expect(() => new"
  --include=*.ts --exclude-dir=node_modules .`; *`pageActionsToPerformAfterNavigation()` is optional* gains `grep -rn
  "pageActionsToPerformAfterNavigation" --include=*.ts --exclude-dir=node_modules .`; *`get` returns `null` for a missing
  key* gains a search for the `get` calls whose checks to review; *Waits end at the navigation timeout* says it needs no
  change.

## Current behaviour

- The sentence names three methods; `update().getById("")`, which 2.x accepted (resolved to `#`), throws at the call in
  3.x and is in no section (`…-probes/H/firstarg/`).
- Step 1 names 3.0.0 while the page states rules added in 3.0.1 and 3.0.2; step 3 promises a search for every
  **Compiles** item where four have none (`…-probes/H/upgrade-searches.txt`).

## Steps

1. The edits above in `docs/upgrading-from-2x.md` and the README's link text.
2. Each search run against a scratch project that contains each pattern once (and against a scratch copy of a real 2.x
   project if one is at hand), so it finds what it claims; output in *Execution notes*.
3. The `getById` message copied from a probe.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`; the README's blocks compile (plan 29).

## Commit

```text
docs: Upgrading from 2.x describes 3.x, and every item that needs a change gives its search

Plan: defect-review-result/PLAN-H-1-H-3-upgrade-page.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
