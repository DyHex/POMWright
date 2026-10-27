# G-4: `pnpm build` never empties `dist/`, so a local pack (`pack-test`, `harness:install`, `pack:version`) ships and tests files the current source no longer produces

- **Kind**: defect
- **Area**: tooling, `package.json` `build`, `pack-build.sh`, `scripts/pack-version.sh`
- **Severity**: Low (local runs only: CI and Publish build on a fresh checkout, so the published package and CI's
  verdict are unaffected; locally the harness can pass on a build CI rejects, and a `pack:version` tarball can differ
  from the release)
- **Semver of the fix**: none (build script only; the published package does not change)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer G
- **Status**: decided: fix, option 1, first in the plan (2026-10-26, [DECISIONS.md #33](../DECISIONS.md))

## Contract

- AGENTS.md §3: "`pnpm pack-test` is the authoritative integration run: `pack-build.sh` (frozen root install, build,
  pack `pomwright-test-build.tgz`, extract into `.pack/pomwright`) ...".
- AGENTS.md §7, the pre-release packaging probes: "the packed file list (`dist/index.js` and `dist/index.d.ts` from
  tsup, `dist/index.mjs` and `dist/index.d.mts` from `scripts/write-esm-entry.mjs`, nothing else in `dist`)".
- `scripts/pack-version.sh` line 32: "Pack as npm would publish"; line 3: "for testing a build in another project
  before it is released". Publishing builds on a fresh checkout (`publish.yaml`: checkout, `pnpm run release`).

## Reproduction

Both from the worktree root; outputs in `/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/stale-dist/`.

1. A stale file survives the build and is packed, by npm and by `pack:version`:

   ```sh
   echo stale > dist/old-chunk.js && pnpm build && npm pack --dry-run --json | jq -r '.[0].files[].path'
   pnpm pack:version 9.9.9-probe && tar -tzf pomwright-9.9.9-probe.tgz
   rm -f dist/old-chunk.js pomwright-9.9.9-probe.tgz
   ```

   Exit 0 each; both lists contain `dist/old-chunk.js` (`npm-pack-dry-run.txt`, `pack-version-tarball.txt`).

2. The harness passes on a build that no longer emits declarations, as long as an earlier build left them (a source
   sketch: `--dts` removed from the `build` script):

   ```sh
   pnpm build                                   # dist/ as any earlier build leaves it
   sed -i 's|"build": "tsup index.ts --format cjs --dts \&\& |"build": "tsup index.ts --format cjs \&\& |' package.json
   bash pack-build.sh probe-nodts.tgz && pnpm -C test install --frozen-lockfile
   tar -tzf probe-nodts.tgz | sort; pnpm exec tsc --noEmit -p test; echo "exit $?"
   # the same from an empty dist/, as CI builds:
   rm -rf dist && bash pack-build.sh probe-nodts.tgz && pnpm -C test install --frozen-lockfile
   tar -tzf probe-nodts.tgz | sort; pnpm exec tsc --noEmit -p test; echo "exit $?"
   # restore
   git checkout -- package.json && rm -f probe-nodts.tgz && rm -rf dist && pnpm harness:install
   ```

## Observed / expected

Observed (`nodts-tarball.txt`, `nodts-tsc.log`; `nodts-fresh-tarball.txt`, `nodts-fresh-tsc.log`):

```text
# dist/ left by the previous build
package/dist/index.d.mts
package/dist/index.d.ts        <- not produced by this build
package/dist/index.js
package/dist/index.mjs
tsc over test/: exit 0

# empty dist/, as in CI
package/dist/index.d.mts
package/dist/index.js
package/dist/index.mjs
tsc over test/: exit 2   (1000 errors, the first: Module '"pomwright"' has no exported member 'PageObject'.)
```

Expected: a local pack contains exactly what the current source builds, as a CI or release build does, so the
"authoritative" local run fails where CI fails, and `pack:version` gives the tarball a release would.

## Cause

`package.json` `build`: `tsup index.ts --format cjs --dts && node scripts/write-esm-entry.mjs`. tsup's `clean` is off
by default (`tsup --help`: "--clean  Clean output directory"), and nothing else empties `dist/`; `pack-build.sh` and
`pack-version.sh` call `pnpm build` and then pack the whole `dist/**` (`files` in `package.json`).

## Fix plan

- **Intended contract**: every build starts from an empty `dist/`.
- **Options**:
  - **(recommended)** `tsup index.ts --format cjs --dts --clean && node scripts/write-esm-entry.mjs`. Probed:
    `pnpm exec tsup index.ts --format cjs --dts --clean` removed a planted `dist/old-chunk.js` (`clean-build.log`);
    `write-esm-entry.mjs` runs after it, so its two files are written again. Breaks nothing that reads `dist/` between
    builds.
  - `rm -rf dist` at the start of `pack-build.sh` and `pack-version.sh`: covers the packs but not a bare `pnpm build`.
- **Implementation steps**: `package.json` `build`.
- **Tests**: step 1 above lists no `dist/old-chunk.js`; step 2's first half fails like its second half.
- **Docs**: none (AGENTS.md §3 describes `pnpm build` as `tsup index.ts --format cjs --dts` then the ESM script: add
  `--clean`).
- **Changeset**: none.
- **Decisions to tick**:
  - [x] `--clean` in `build`
  - [x] (added) A packaging spec asserting the exact packed file list (test gap #14); AGENTS.md §3 and §7 updated
  - [x] (added) Execution order: **first in the plan**, so the local `pack-test` runs that verify every later fix start
    from an empty `dist/` ([DECISIONS.md #33](../DECISIONS.md))
- **Execution order**: first in the plan (decision 33).
