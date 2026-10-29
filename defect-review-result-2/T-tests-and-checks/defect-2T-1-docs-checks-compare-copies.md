# 2T-1: The documentation-chain spec and the lifecycle-outcomes spec compare the code with copies of the pages, so a page edited on its own goes stale without failing either

- **Kind**: defect
- **Status**: decided 2026-10-29, decision 95 in [DECISIONS.md](../DECISIONS.md) (both specs read their pages; the inverted demonstration must fail); planned in the checks plan
- **Area**: run-level checks: `test/tests/docs/docsChains.spec.ts`, `test/tests/pageObject/lifecycle.outcomes.spec.ts`
- **Severity**: Low (no stale chain or row on the site today; the checks miss one of the two directions they are
  documented to cover, so a docs-only edit can ship a wrong chain or outcome)
- **Semver of the fix**: none (test-only, or docs-only for the narrower fix)
- **Pass**: 1
- **First review**: new since 54cdada (6c53973, 3be8ca9 for the chains; ce6291d for the outcomes)
- **Reviewed**: `d850405`, 2026-10-28T18:31+01:00, Opus 5.5, second review, segment 2T

## Contract

- `website/src/content/docs/internal/tests-and-checks.md`, *The harness*: "`docs/docsChains.spec.ts` rebuilds every
  locator chain the documentation and the README show ... and compares it with what the packed package resolves: one
  test per page, so a chain that a change to the code **or to the page** made stale names its page." And:
  "`pageObject/lifecycle.outcomes.spec.ts` starts `test/lifecycle-outcomes/` ... and compares that run's JSON report
  with the table in [Page objects](/POMWright/docs/page-objects/#how-a-mistake-is-reported)."
- `test/tests/docs/docsChains.spec.ts:8-9` (its header): "A changed chain fails here until the page and this spec
  change together."
- `internal/documentation.md:17-19`, *What keeps it true*: "`test/tests/docs/docsChains.spec.ts` keeps the chains so:
  ... so a chain that changes fails the harness until the page changes with it." (A chain changed in the code fails
  until the spec changes; the page can stay as it was.)
- `test/AGENTS.md`, *The harness*: `lifecycle.outcomes.spec.ts` "compares the JSON report with the docs' table of where
  a broken page object is built".

## Reproduction

1. Neither spec reads a page. Their imports, from the worktree root:

   ```sh
   grep -nE "node:fs|readFile|import " test/tests/docs/docsChains.spec.ts test/tests/pageObject/lifecycle.outcomes.spec.ts
   ```

   prints only `@playwright/test`, `pomwright`, `node:child_process` and `node:path` (exit 0). Every expected chain is a
   string literal in the spec (`docsChains.spec.ts`, 118 `expect.soft(...)` calls), and the outcomes table is an object
   literal (`lifecycle.outcomes.spec.ts:80-91`). Nothing the spec compares comes from `website/`, so the outcome of
   either spec cannot depend on what a page says.
2. Today the copies agree with the pages. Probe
   `/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/docs-chains/spec-vs-pages.mjs` parses the spec with
   the compiler API and looks for each literal on the page its test is named after:

   ```sh
   node /home/magdys/workspace/dyhex/POMWright-second-review-probes/T/docs-chains/spec-vs-pages.mjs /home/magdys/workspace/dyhex/POMWright-second-review
   ```

   exit 0: `found 114, missing 1, non-literal 7`. The one missing literal is Firefox's `"    ..."` line, which the page
   leaves out on purpose; the 7 non-literals are rendered through `page.locator(...)`. The reverse probe
   (`pages-vs-spec.mjs`, same folder) finds 178 rendered chains on the pages and 31 the spec does not hold, all of them
   error messages (the error-message check's), Mermaid labels, a shell command or a chain cut short with `…`.
3. A sketch for the orchestrator shows the stale page passing: `sketch/2T-1.diff` changes the Queries page's comment
   `// locator('main').locator('li').first()` to `.last()` and the outcomes table's `beforeEach` row to "the test fails
   before its body runs"; `sketch/2T-1.run.sh` runs both specs on chromium and exits 0 only when both fail. Expected at
   `d850405`: both specs pass and the script exits 1.

## Observed / expected

Observed: the specs check the code against their own copies of the pages. A change to the code fails them (the
code-to-copy direction holds); a change to a page alone, a stale chain in a comment or a changed row of the table, passes
both, and nothing else in `pnpm pack-test`, `pnpm typecheck` or CI compares those strings with the pages
(`check-doc-snippets.mjs` compiles the examples without comparing comments; the error-message check reads `text` blocks
only for messages).

Expected, by the docs: a chain "that a change ... to the page made stale names its page", and the outcomes compared
"with the table in Page objects".

## Cause

`docsChains.spec.ts` and `lifecycle.outcomes.spec.ts` hold the expected strings and the table themselves; the process
rule in `website/AGENTS.md` ("a change to a chain, on the page or in the code, changes the spec with it") keeps the
copies in step by hand, which the docs then describe as a check.

## Fix plan

- **Intended contract**: a chain or an outcome row that differs between a page and the code fails the harness,
  whichever side changed.
- **Options**:
  1. (recommended) Make the specs read the pages: in `docsChains.spec.ts`, read the page named by the test's title once
     and, for each literal compared, also assert that the page contains it (the probe above shows all 114 literals are
     found today, with the comment-line join it uses); in `lifecycle.outcomes.spec.ts`, parse the three rows of the
     table under *How a mistake is reported* and derive the expected outcomes from them, or at least assert the rows'
     text equals the text the spec encodes. Cost: a few lines per spec; a page reformatted (a chain broken over lines
     differently) needs the same join the probe uses. Breaks nothing in the package.
  2. Narrower, docs only: say that the specs hold copies and that the page and the spec are changed together by hand
     (`internal/tests-and-checks.md`, the spec header, `test/AGENTS.md`). Cost: the drift stays possible.
- **Implementation steps**: option 1 in the two specs; no source change.
- **Tests**: the sketch above, inverted, is the regression check: with the diff applied, both specs fail.
- **Docs**: none for option 1; for option 2, the three places quoted under *Contract*.
- **Changeset**: none (test and docs only, not consumer-facing).
- **Decisions to tick**: whether the docs checks must catch page-side drift (option 1) or document the hand step
  (option 2).
- **Related**: 2T-2 (the snippet check's fences) is the same question for the examples' code.

## Pass 2: the first review's decision and plan

Decision 59, point 3 (the first review's `DECISIONS.md`) chose "a docs-chains harness spec: the rendered chains the pages
show are its data ... so a change to a chain fails until the spec and the page are updated together", and plan 31
(`PLAN-T15-docs-chains.md`, *Contract*) repeats it. The shape (the chains as the spec's data) is decided; the promise
that a page must be updated before the run goes green is the part that does not hold. Plan 31's execution notes verify
the spec with "a planted wrong chain (`locator('li').nth(0)` for `.first()`)" in the spec, and decision 60's outcomes
spec (plan 28) likewise holds the table; neither planted a change on a page. So the finding stands against the decided
contract's own wording; option 2 (say that the copies are kept by hand) is the narrow fix within the decision, option 1
fulfils the decision's sentence.

## Fix sketch

Gate run by the orchestrator on 2026-10-28 in the review worktree at `d850405` (script: the orchestrator's `gate-sketches.sh`, without a rebuild: the sketch changes no packaged file). This sketch is a demonstration, not a fix: it breaks what the check guards, and its run script exits 0 only when the check catches the break. The finding stands when the script still exits 1 with the break applied. Then `git checkout -- .` and the worktree clean. Log: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/sketch/2T-1.gate.out`.

- At `d850405`, without the break: `docsChains.spec.ts` (Queries) 1 passed, `lifecycle.outcomes.spec.ts` 1 passed; the script exits 1, as expected.
- With the break applied (`queries.md`: `.first()` written `.last()` in a shown chain; `page-objects.md`: the `beforeEach` row of the outcomes table changed): `docsChains.spec.ts` (Queries) still 1 passed, `lifecycle.outcomes.spec.ts` still 1 passed; the script exits 1: **both stale pages went unnoticed.**
- **Verdict: the finding is confirmed.**
