# Plan: a check that POMWright's retry pauses are Playwright's

- **Decision**: [124](DECISIONS.md), agreed 2026-10-30 with the recommendation (the maintainer's request after decision
  121)
- **Findings**: none; it keeps decision 121's "as Playwright's actions do" true over Playwright releases
- **Bump**: none (a check of the repository; no change to the package)
- **Stop**: after the commits, a report. The maintainer pushes
- **Depends on**: [PLAN-2R-5-2R-6-retries-under-load.md](PLAN-2R-5-2R-6-retries-under-load.md) (done)

## Contract

`pnpm typecheck` runs `scripts/check-playwright-retries.mjs`, which compares two things and fails when they differ:

- `RETRY_PAUSES` in `src/helpers/sessionStorageSeed.ts`;
- the pauses Playwright makes before each retry of its own actions, read from the installed `playwright-core` (the one
  `test/` resolves).

It also fails when it cannot find Playwright's method, so a change is never passed over. The fix is then to read
Playwright's source again and update the constant, its unit tests and docs, or the check.

`pack-test.sh` runs the same steps as `pnpm typecheck`, one by one, in every harness job, after `PLAYWRIGHT_VERSION`
has swapped in the version to test, so CI checks both the Playwright pin and the latest 1.x. A
Playwright release that changes the pauses turns the latest row red until POMWright follows, as other differences on
that row do.

## Current behavior (verified 2026-10-30 at `b68eeb8`)

- Playwright 1.64.0 holds the pauses in `retryWithProgressAndBackoff`, as `const backoffScale = [20, 50, 100, 100, 500]`,
  inside `playwright-core/lib/coreBundle.js`.
- `playwright-core`'s `exports` list `.`, `./package.json`, `./lib/bootstrap`, `./lib/coreBundle`, `./lib/utilsBundle`
  and `./lib/tools/cli-client/program`. The constant is local to a method of the server's frame class, so no export,
  public type or option reaches it.
- The getByRole roles are a type of Playwright's public signature (`Parameters<Page["getByRole"]>[0]`,
  [types.ts:84](../src/locators/types.ts#L84)). The pauses have no type.
- Nothing in the repository reads Playwright's source. The unit tests pin POMWright's pauses, so they would still pass
  if Playwright changed its own.
- CI runs `pnpm test:unit` once, at the root's pin, and the harness at the pin and at the latest 1.x
  ([checks.yaml](../.github/workflows/checks.yaml)). The harness is `pack-test.sh`, which runs the steps of
  `pnpm typecheck` itself ([pack-test.sh:39-46](../pack-test.sh#L39-L46)).

## Options

- **A, recommended and agreed: read Playwright's source in a check of `pnpm typecheck`.** It is exact, and runs where a
  new Playwright first appears (the latest row). Because it fails when it cannot find the method, a refactor of
  Playwright's code surfaces as a failure, never as a pass.
- **B, a vitest test:** it runs at the root's pin only, so it would see a change only when the pin moves.
- **C, measuring Playwright's pauses in a browser** (a custom selector engine timing each retry): it does not depend on
  the bundle's text. But it is timing-based, and gaps checked tightly enough to catch a change would be flaky on a
  loaded machine.
- **D, a warning in place of a failure:** it would not block a release on an upstream change, but would leave the docs'
  "as Playwright's actions do" untrue unnoticed. Not chosen.

## Implementation (one commit, then the record)

1. **The check (decision 124).**
   - `scripts/check-playwright-retries.mjs` resolves `playwright-core` from `test/`'s `@playwright/test`, searches its
     `lib/` for `retryWithProgressAndBackoff` and the first array in its body, and reads `RETRY_PAUSES`. It prints one
     line on success, as the other checks do. On a difference it fails with both arrays and what to update; on a
     missing method it fails with the version and what to read.
   - `package.json`: `pnpm typecheck` runs it last; `pack-test.sh`, which runs those steps itself, runs it after
     `check-error-messages.mjs`.
   - The comment of `RETRY_PAUSES` names the check.
   - Docs:
     - `test/AGENTS.md` (*Commands*, the list of what `pnpm typecheck` runs: eight);
     - `docs/repository.md` (the `scripts/` row);
     - *Internal → Tests and checks* (*Type checks*, item 8).
   - The record: decision 124 in DECISIONS.md.
2. **The execution notes.**

## Verification

- The check passes at the pin, and fails as it should in two ways, each made and undone in the working tree:
  - `RETRY_PAUSES` changed;
  - the method's name not found.
- `pnpm lint`, `pnpm typecheck`, `pnpm docs:build`, `pnpm lint:guide`, and the full `pnpm pack-test --reporter=line`,
  which runs the check.

## Decisions checklist

1. [x] A check in `pnpm typecheck` that reads Playwright's pauses from the installed `playwright-core`. Default: yes.
2. [x] It fails, not warns, on a difference or a missing method. Default: yes.

## Execution

Step 1, then step 2, each verified and committed with the trailer. Then a report.

## Execution notes

- 2026-10-30. The plan was committed in `06635aa`, step 1 in `9f5e95b`, and this record is step 2.
- **Unexpected, corrected during the build:** the plan said that `pack-test.sh` runs `pnpm typecheck`. It runs the same
  steps one by one (lines 39-46), so the check was added there too, after `check-error-messages.mjs`. Otherwise the
  harness jobs, and CI's latest row with them, would never have run it. The plan's text was corrected before the
  commit.
- **The check:**
  - It passes at 1.64.0: "Playwright 1.64.0 pauses 20, 50, 100, 100, 500 ms before its actions' retries, as POMWright
    does".
  - It fails, exit 1, with a message saying what to update, in both ways it should:
    - `RETRY_PAUSES` changed to end in 1000, in the working tree and then restored;
    - the method not found, shown with a scratch copy of the script looking for another name. That copy is a stand-in
      for a Playwright release without the method: editing the installed `playwright-core` would change pnpm's shared
      store.
  - npm's latest `playwright-core` is 1.64.1, which CI's latest row will run. Its tarball, extracted in the scratchpad
    and not installed, has `lib/coreBundle.js` defining the same pauses, which the check's pattern finds.
- **Verification:**
  - `pnpm typecheck` and the full `pnpm pack-test --reporter=line` (1845 passed, 3 skipped) both run the check, and it
    passes.
  - `pnpm lint`, `pnpm lint:workflows` (ShellCheck over `pack-test.sh`'s change), `pnpm docs:build` and
    `pnpm lint:guide` pass.
