# G-11: Three tooling comments describe the repository as it was: "nothing else in the repo runs tsc", "CI passes the tarball's declarations", "things you currently have in both configs"

- **Kind**: documentation
- **Area**: config and scripts: `vitest.config.ts`, `scripts/check-api-coverage.mjs`, `playwright.base.ts`
- **Severity**: Low (comments a contributor reads when changing the checks; no behaviour depends on them)
- **Semver of the fix**: none (comments only)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer G
- **Status**: decided (2026-10-27, [DECISIONS.md #51](../DECISIONS.md))

## Contract

AGENTS.md §9: the code and its tests decide what the docs say; a change to a mechanism updates the text that describes
it. The comments below are the documentation of these files.

## Reproduction

1. `vitest.config.ts` lines 7-9: "typecheck: the same files are also type-checked with tsc on every run, so
   `expectTypeOf` assertions and `// @ts-expect-error` lines are enforced in CI (nothing else in the repo runs tsc)."
   `pnpm typecheck` (and `pack-test.sh` lines 37-41) runs `tsc` three times over `test/` and once more inside
   `scripts/check-doc-snippets.mjs` (line 98, `node_modules/.bin/tsc`); `tsup --dts` uses the compiler too.
2. `scripts/check-api-coverage.mjs` line 16: "`pnpm typecheck` runs it after `pnpm harness:install` has extracted the
   package; CI passes the tarball's declarations." CI passes no argument: `checks.yaml` line 228 runs
   `node scripts/check-api-coverage.mjs`, which reads the default `.pack/pomwright/dist/index.d.ts`, the tarball as
   `pack-extract.sh` extracted it (line 223). AGENTS.md §9 says it correctly ("the extracted tarball in CI; a path
   argument overrides it").
3. `playwright.base.ts` lines 1-8: "// playwright.base.ts", "this is only a *type* import ...", "// things you currently
   have in both configs:". Three Playwright configs exist under `test/` (`playwright.config.ts`,
   `playwright.steps.config.ts`, `playwright.bench.config.ts`) and only the first spreads `baseConfig`.

## Observed / expected

Observed: as quoted. Expected: (1) "nothing else runs tsc over these unit-test files" or no parenthesis; (2) "CI
extracts the tarball first, so the default path is the tarball's declarations"; (3) a comment that says what the base
config is for: the shared options of `test/playwright.config.ts`, kept at the root as plain data so the root can import
its type without loading `@playwright/test` twice.

## Cause

Comments not updated when the type checks and the extra configs were added.

## Fix plan

- **Intended contract**: the comments describe the current tooling.
- **Options**: **(recommended)** rewrite the three comments.
- **Implementation steps**: the three files.
- **Tests**: none.
- **Docs**: the three comments.
- **Changeset**: none.
- **Decisions to tick**:
  - [x] wording, plus a final pass over the tooling files this branch changes ([DECISIONS.md #51](../DECISIONS.md))
- **Execution order**: independent.
