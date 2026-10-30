# Plan: packaging (2F-1, 2F-2)

- **Decision**: [106 (points 1 and 2)](DECISIONS.md) (2026-10-29); its point 3 (2F-4) is built in
  [PLAN-2A-session-storage.md](PLAN-2A-session-storage.md)
- **Findings**: [2F-1](F-packaging-types-changesets/defect-2F-1-skiplibcheck-floor-sentence.md),
  [2F-2](F-packaging-types-changesets/defect-2F-2-emit-check-not-every-member.md) (Low)
- **Bump**: none (docs, a check and the consumer check's list)
- **Stop**: none planned; `scripts/consumer-check.sh` runs only in CI's `consumer` job, so its change is checked on the
  pull request's run
- **Depends on**: nothing

## Contract

1. **The `skipLibCheck` floor (decision 106, point 1).** *Installation* and `scripts/consumer-check.sh`'s header: below
   TypeScript 5.2, `skipLibCheck` is needed for Playwright's declarations and, depending on `@types/node`, Node's; never
   for POMWright's. `TYPESCRIPT_VERSIONS` gains `5.1`, run with `--skipLibCheck` as `5.0` is.
2. **The emit check covers every public member (decision 106, point 2).** `pnpm typecheck` generates the module that the
   declaration-emit check compiles, from the published declarations: every export and every public or protected
   member returned without annotations; the hand-written `publicTypes.emit.ts` keeps what generation cannot express (the
   builders' chains, the seeds), or the generated module replaces it if it covers them. `test/AGENTS.md`, *Internal →
   Packaging* and `test/tsconfig.declarations.json`'s comment say how it is made.

## Current behavior (re-checked 2026-10-29)

- *Installation* lines 55-56 name 5.0 and Playwright's declarations only; `TYPESCRIPT_VERSIONS=(5.0 5 6 latest)`, 5.0
  with `--skipLibCheck` (`consumer-check.sh` lines 29 and 100). The review's probe: 5.1.6 with `@types/node` 24 fails in
  `playwright-core` and `@types/node`; 5.0.4 with `@types/node` 22 in `@types/node`; nothing with `@types/node` 20.
- `test/tsconfig.declarations.json` compiles `tests/packaging/publicTypes.emit.ts` (35 expressions) with `declaration:
  true`; its comment says "every public member".

## Implementation

1. The floor: the two sentences and the list (one commit).
2. The generated emit module: a script beside the other checks (`scripts/`), run by `pnpm typecheck` before the emit
   compile, writing into a git-ignored file under `test/`; started from the review's `$P/F/emit/gen-members.mjs`; the
   docs (one commit).

## Tests

- The review's floor probe (`$P/F/floor/run.sh`) re-run for the sentence; the consumer job on the pull request runs 5.1.
- The generated module emits on the pinned TypeScript; once, also on the six versions the review used (5.0, 5.4, 5.9,
  6.0.3, 7.0.2 with npm, 6.0.3 with pnpm). Shown to catch a break: a public member planted with a type the module
  cannot name fails the emit check, then reverted.

## Verification

`pnpm lint`, `pnpm test:unit`, `pnpm typecheck`, `pnpm docs:build`, `bash scripts/consumer-check.sh <tarball>` locally
with the new version, the full `pnpm pack-test --reporter=line`, the grep for the external consumer projects' names.

## Decisions checklist

- [x] Decision 106, point 1: the floor below 5.2; `5.1` in the consumer check
- [x] Decision 106, point 2: the emit module generated from the declarations

## Execution

Two commits, `docs: …`/`chore(checks): …` and `test: …`, with `Plan: defect-review-result-2/PLAN-2F-packaging.md` and
the `Co-Authored-By:` trailer. The maintainer pushes; the pull request's run checks the consumer job.

## Execution notes

- 2026-10-30. The commits, one per step: `a0102ac` (1), `d672c5b` (2), and this record.
- **Verification:**
  - the full `pnpm pack-test --reporter=line`, with the generator in it: 1863 passed and 3 skipped on three browsers;
  - `pnpm typecheck`, 1006 unit tests, `pnpm docs:build`, `pnpm lint`, `pnpm lint:workflows` and `pnpm lint:guide`;
    no name of the external consumer projects on the branch.
- **Step 1:** the review's floor probe (`F/floor/run.sh`) was re-run against this build's tarball and consumer file,
  with the same results as the review's:

  | `@types/node` | TypeScript 5.0 | TypeScript 5.1 | TypeScript 5.2 |
  | --- | --- | --- | --- |
  | 20 | nothing | nothing | nothing |
  | 22 | Node's declarations fail | nothing | nothing |
  | 24 | Playwright's and Node's fail | Playwright's and Node's fail | nothing |

  POMWright's declarations never fail. *Installation* now gives that, which is more exact than "5.0 needs it".
  `bash scripts/consumer-check.sh pomwright-test-build.tgz` passed locally with 5.1.6 added; CI's `consumer` job runs
  it on the pull request.
- **Step 2:**
  - Exports are covered by a hand-written seeds file (`emitSeeds.ts`, 39 seeds and 11 memberless), members by
    generation, since a generic export cannot be given type arguments automatically. The generator fails until a new
    export has a seed: shown by dropping `UrlMatcher`'s.
  - A planted public member of an unexported type failed the emit with TS4023, and was reverted.
  - The generated module, with its seeds, emitted on TypeScript 5.0.4, 5.4.5, 5.9.3, 6.0.3 and 7.0.2 with npm, and
    6.0.3 with pnpm. Each ran in a scratch project with the tarball and `--emitDeclarationOnly`, so the declaration
    errors are reported on every version.
  - `publicTypes.emit.ts` keeps the chains and call results; its member-by-member list went to the generated module.
  - The generated folder is git-ignored and excluded from Biome, as `test/.doc-snippets/` is.
- Nothing unexpected.
