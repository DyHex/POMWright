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

(filled in at execution)
