# Plan 40: AGENTS.md complete; tooling comments current

- **Decisions**: [DECISIONS.md](DECISIONS.md) #47, #51
- **Findings**: [H-5](H-docs-readme-agents/defect-H-5-agents-server-routes-incomplete.md) with
  [A-8](A-session-storage/defect-A-8-agents-teststorage-routes.md), [G-11](G-ci-and-tooling/defect-G-11-stale-tooling-comments.md)
- **Bump**: none
- **Stop**: only if a workflow's comment changes (PLANS.md, rule 4)
- **Depends on**: every earlier plan (it checks what they wrote)

## Contract

AGENTS.md describes the repository as it is at the merge, and every tooling file's header comment describes the tooling
as it is.

## Current behaviour

- AGENTS.md §4 lacks `/teststorage/sandboxed` (a document sandboxed by its Content-Security-Policy: on the origin by URL,
  with an opaque origin) and `/teststorage/shadowed-navigation` (an app whose global `navigation` shadows
  `window.navigation`), both used by `sessionStorage.spec.ts` (`17426a5`, `bfbc00f`).
- Three stale comments: `vitest.config.ts` (says nothing else runs `tsc` over the unit-test files; or drop the
  parenthesis), `scripts/check-api-coverage.mjs`'s header (CI passes no argument and reads the default
  `.pack/pomwright/dist/index.d.ts`, the extracted tarball), `playwright.base.ts` (the shared options of
  `test/playwright.config.ts`, kept at the root as plain data so the root can import its type without loading
  `@playwright/test` twice).

## Steps

1. AGENTS.md §4: the two routes, with a few words each, and every route or fixture page plans 20–28 added (their
   *Execution notes* list them).
2. The three comments rewritten.
3. Re-read the header comment of every tooling file this branch changed or added and correct what no longer holds:
   `.github/workflows/*.yaml`, `.github/dependabot.yml`, `pack-build.sh`, `pack-test.sh`, `scripts/check-api-coverage.mjs`,
   `scripts/check-doc-snippets.mjs`, `scripts/check-error-messages.mjs`, `scripts/check-diagrams.mjs`,
   `scripts/consumer-check.sh`, `test/tsconfig.legacyDecorators.json`, `test/playwright.steps.config.ts`, the new
   packaging and step-location specs, `vitest.config.ts`, `playwright.base.ts`.
4. AGENTS.md completeness pass, against the code: §1 (the export list: `StepDecorator`, `ReusableLocatorFactory`; the
   peer range unchanged); §2 (the map: file counts and line counts of `src/` and `test/`, the new scripts, `.vscode/`, the
   workflows' jobs); §3 (commands: `--clean`, `docs:diagrams`, `consumer-check.sh`, what `pnpm typecheck` runs and
   emits); §4 (spec counts and lines, the new specs, the twins); §5 (every convention a plan changed: the ended
   registration's hint, call sites and step locations, `seed` on an inherited origin, own non-enumerable options); §6
   rule 9 present; §7 (Trusted Publishing, the publish guard, the merge rule after a release, the manual list reduced to
   `EBADENGINE`, the TypeScript floor's three places); §8; §9 (the new checks, the marker rule, the README compiled). The
   header's "Last revised" line: the date and "with the fixes from the 3.0.2 defect review" (no finding IDs).
5. No reference to the working folder, a plan, a finding ID or a decision number anywhere outside it: `grep -rnE
   "defect-review-result|PLAN-|DECISIONS\.md|\b[A-H]-[0-9]+\b|decision [0-9]+"` over the repository (excluding the folder,
   `node_modules`, `dist`, `.pack`, `CHANGELOG.md`) finds nothing new; the same for the external consumer projects'
   names (kept outside the repository); record the commands and their output.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`; actionlint if a workflow's comment changed (then **stop**).

## Commit

```text
docs: AGENTS.md and the tooling comments describe the repository as it is

Plan: defect-review-result/PLAN-H-5-A-8-G-11-agents-and-tooling.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-28.

- Step 1: AGENTS.md §4, `/teststorage/sandboxed` and `/teststorage/shadowed-navigation`; `git log main..HEAD --
  test/server.js` shows no other route added on this branch (plans 20–28 used `page.route` and `page.setContent`).
- Step 2: `vitest.config.ts` (no other `tsc` run covers the unit tests; `pnpm typecheck` compiles `test/`, which no longer
  imports `src/`); `playwright.base.ts` (the shared options of `test/playwright.config.ts`, and why its one import is a
  type import: probed by turning it into a value import, `playwright test --list` then failed with "Requiring
  @playwright/test second time"; restored); `scripts/check-api-coverage.mjs` was already corrected in plan 32.
- Step 3, the headers re-read: the workflows' and `dependabot.yml`'s hold, so no workflow changes and the plan does not
  stop for CI. Corrected: `pack-test.sh` (the README's examples and the error-message check), `test/tsconfig.declarations.json`
  and `tests/packaging/publicTypes.emit.ts` (since plan 13 the emit check returns every public member on its own; TS2742
  is TS2883 under TypeScript 6, and TS4023 is what a registration builder reports). Current already: `pack-build.sh`,
  `check-doc-snippets.mjs` (plan 29), `check-error-messages.mjs` (plan 30), `check-diagrams.mjs`, `consumer-check.sh`,
  `tsconfig.legacyDecorators*.json`, `playwright.steps.config.ts`, `lifecycle-outcomes/playwright.config.ts`, the
  packaging and step-location specs.
- Step 4, AGENTS.md against the code: §1's export list has `StepDecorator`, `ReusableLocatorFactory` and the four
  storage types; §2's `src/` count corrected to "about 7,000 lines" (19 files, 7,002 lines), the unit-test list matches
  the 16 files and the `.test-d.ts`, the pages are 24, 14 and 13; §3 (`--clean`, `docs:diagrams`, `consumer-check.sh`,
  the seven checks `pnpm typecheck` runs), §4 (60 spec files, the new specs), §5, §6 rule 9, §7, §8 and §9 were brought
  up to date by the plans that changed them; the "Last revised" line reads "2026-10-28, with the fixes from the 3.0.2
  defect review".
- Step 5, references outside the folder:

```text
$ grep -rnE "defect-review-result|PLAN-|DECISIONS\.md|\b[A-H]-[0-9]+\b|decision [0-9]+" … (the folder, node_modules,
  dist, .pack and the build outputs excluded)
AGENTS.md:343: …(`git show 08bdcac^:release-3.0.0/DECISIONS.md`, …   (§6, 3.0.0's folder, from before this branch)
AGENTS.md:348: …(`PLAN-<items>-<slug>.md`), `PLANS.md` …, `DECISIONS.md` …   (§6, the process, from before this branch)
$ grep -rnliE "orderform|iceno" … (the same exclusions)
(nothing)
$ git log main..HEAD --format=%B | grep -ciE "orderform|iceno"
0
```

  Nothing new; §6's two lines describe how release work is organized and are plan 41's to revisit with the folder.
- Checks: `pnpm lint` 0; `pnpm test:unit` 904 passed; `pnpm pack-test --reporter=line` exit 0 (1,746 passed, 3 skipped;
  doc snippets 226; api coverage 0 problems; error messages 0 problems; step locations 31). No workflow changed, so no
  actionlint run and no stop.
