# Plan 1: every build from an empty `dist/`; the packed file list asserted

- **Decisions**: [DECISIONS.md](DECISIONS.md) #33
- **Findings**: [G-4](G-ci-and-tooling/defect-G-4-build-keeps-stale-dist.md)
- **Bump**: none (no changeset)
- **Stop**: no (the build runs locally in `pack-test`, as in CI)
- **Depends on**: nothing; first, so every later plan is verified on a build from an empty `dist/`

## Contract

`pnpm build` always builds from an empty `dist/`, so a pack holds exactly what the source produces, locally as on CI's
fresh checkout. A harness spec asserts the installed package's file list, so a stray or missing file fails every
harness run.

## Current behaviour

- `package.json`'s `build` is `tsup index.ts --format cjs --dts && node scripts/write-esm-entry.mjs`; tsup's `--clean`
  is off by default, so files an earlier build left stay in `dist/` and are packed (`pack-build.sh:18-20`, and
  `scripts/pack-version.sh`). The finding's probe: a planted `dist/old-chunk.js` is in both packs; with `--dts` removed,
  the local harness passes on old declarations while a build from an empty `dist/` fails.
- No spec reads the installed package's file list; AGENTS.md §7 keeps it among the manual pre-release probes.

## Steps

1. `package.json`: `"build": "tsup index.ts --format cjs --dts --clean && node scripts/write-esm-entry.mjs"`.
2. `test/tests/packaging/packageFiles.spec.ts` (new, beside `esmEntry.spec.mts`): resolve the installed package's
   directory from `require.resolve("pomwright/package.json")`, list every file below it recursively (relative paths,
   `/` separators, sorted), and assert it equals `CHANGELOG.md`, `LICENSE`, `README.md`, `dist/index.d.mts`,
   `dist/index.d.ts`, `dist/index.js`, `dist/index.mjs`, `package.json`. One test, no browser fixture, so it runs in
   each project in a few milliseconds.
3. Run the finding's two probe steps once (planted `dist/old-chunk.js`; a build without `--dts`) and confirm: the
   planted file is gone from `npm pack --dry-run` and `pnpm pack:version` output, and the `--dts`-less build fails the
   type check locally as it does from an empty `dist/`. Restore `package.json` and rebuild after the second step.
4. Docs:
   - AGENTS.md §3, the `pnpm build` line: `tsup index.ts --format cjs --dts --clean` (from an empty `dist/`).
   - AGENTS.md §4, the `packaging/` list: `packageFiles.spec.ts`, the installed package's exact file list.
   - AGENTS.md §7, the pre-release probes: the packed file list leaves the manual list ("the harness asserts it").
   - *Internal → Packaging*, *One build, two entries*: `pnpm build` starts from an empty `dist/`.

## Tests

The new spec; the probe steps of step 3 (recorded under *Execution notes*, not kept).

## Verify

The standard checks (PLANS.md, rule 5), `pnpm docs:build` (the Packaging page changes).

## Commit

```text
build: every build starts from an empty dist, and the packed file list is asserted

tsup's --clean empties dist/ first, so a local pack holds exactly what the
source produces, as CI's fresh checkout does. A packaging spec asserts the
installed package's file list in every harness run.

Plan: defect-review-result/PLAN-G-4-clean-build.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
