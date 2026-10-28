# 2T-8: `playwright.base.ts` says it holds the options of `test/playwright.config.ts`; since 0905892 the test-server config spreads it too, with its `forbidOnly` and retries

- **Kind**: documentation
- **Area**: the harness's mechanics: `playwright.base.ts`'s header comment
- **Severity**: Low (a tooling comment; it hides from a reader which configs share `forbidOnly`, retries and
  `failOnFlakyTests`, which 2T-4 turns on)
- **Semver of the fix**: none (a comment)
- **Pass**: 2
- **First review**: G-11: regressed (fixed by 1b15aff, made stale again by 0905892)
- **Reviewed**: `d850405`, 2026-10-28T18:51+01:00, Opus 5.5, second review, segment 2T

## Contract

Decision 51 (the first review's `DECISIONS.md`): "Tooling comments describe the current tooling", which settled G-11,
among whose three comments was this file's header. `playwright.base.ts:1-3` now reads: "The shared options of
test/playwright.config.ts, as plain data it spreads in."

## Reproduction

```sh
grep -rn "playwright.base" test/*.ts test/lifecycle-outcomes/*.ts
git log --format='%h %ad %s' --date=iso -- playwright.base.ts test/playwright.test-server.config.ts ':!defect-review-result'
```

exit 0:

```text
test/playwright.config.ts:3:import { baseConfig } from "../playwright.base";
test/playwright.test-server.config.ts:2:import { baseConfig } from "../playwright.base";

0905892 2026-10-28 12:54:36 +0100 test: the static test page loads nothing from outside the test server
1b15aff 2026-10-28 02:52:49 +0100 docs: AGENTS.md and the tooling comments describe the repository as it is
```

`test/playwright.test-server.config.ts:7-8` spreads it (`...baseConfig`) and overrides `testDir`, `outputDir`, the
reporters and the web server; `test/playwright.steps.config.ts`, `test/playwright.bench.config.ts` and
`test/lifecycle-outcomes/playwright.config.ts` do not import it.

## Observed / expected

Observed: the header names one config; two spread the file.

Expected: the header names both, and, since the difference now matters (2T-4), says which configs do not take it.

## Cause

0905892 added `test/playwright.test-server.config.ts` with `...baseConfig` ten hours after 1b15aff rewrote the header.

## Fix plan

- **Intended contract**: the header says which configs share these options.
- **Options**: (recommended) "The shared options of `test/playwright.config.ts` and
  `test/playwright.test-server.config.ts`, as plain data they spread in; the steps, outcomes and bench configs keep
  Playwright's defaults." Cost: none.
- **Implementation steps**: `playwright.base.ts`, lines 1-3.
- **Tests**: none.
- **Docs**: none beyond the comment.
- **Changeset**: none.
- **Decisions to tick**: none (decision 51 covers it).
- **Related**: 2T-4 (the steps config lacks the base's `forbidOnly`); fix together.
