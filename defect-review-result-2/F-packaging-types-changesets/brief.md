# Segment 2F: Packaging, public types and changesets

Segment 2F of the second review at `d850405`. Read [../segments.md](../segments.md) first (the four passes, where things
are, probing, what to write), then [../baseline.md](../baseline.md). Probes go to
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/F/`. Review it as an *area* in the skill's terms, with the commits
since `v3.0.1` as a change set; the pending changesets are this release's notes.

## The guide, read first

`AGENTS.md`, `src/AGENTS.md`, `test/AGENTS.md`, `docs/repository.md` and `docs/versioning.md`, in full, in the worktree.

## In scope

- **The package**: `index.ts`, `package.json` (`exports`, `files`, `engines`, the peer range, dependencies),
  the build (`tsup`, `scripts/write-esm-entry.mjs`), `pack-build.sh`, `pack-extract.sh`, `scripts/pack-version.sh`,
  `tsconfig.json`, and the tarball the baseline built (`/home/magdys/workspace/dyhex/POMWright-second-review-probes/phase0/pomwright-test-build.tgz`).
- **The consumer check**: `scripts/consumer-check.sh` and `scripts/consumer/` (CI ran it green on `d850405`; run it
  locally where a finding depends on it; it installs from npm).
- **Harness**: `test/tests/packaging/` (`packageFiles.spec.ts`, `esmEntry.spec.mts`, `publicTypes.typecheck.ts`,
  `publicTypes.emit.ts`), `test/tsconfig.declarations.json`.
- **Changesets**: every file in `.changeset/` and `config.json`, each against its change; `CHANGELOG.md` only as far as
  the format the next release will add to it (it is written by a tool).
- **Docs** (under `website/src/content/docs/`): `docs/installation.md`, `typescript.md`; `api/index.md`, `api/types.md`;
  `internal/packaging.md`; the README's installation and compatibility parts.

## The change set

`git -C /home/magdys/workspace/dyhex/POMWright-second-review log --format='%h %ad %s' --date=short v3.0.1..HEAD -- index.ts package.json pack-build.sh pack-extract.sh scripts/write-esm-entry.mjs scripts/pack-version.sh scripts/consumer-check.sh scripts/consumer tsconfig.json test/tests/packaging .changeset ':!defect-review-result'`.
Read each diff; the commits after `54cdada` first. For the changesets, also `git diff v3.0.1..HEAD --stat` over `src/`
and `index.ts`, so you can see which consumer-facing changes have a changeset and which do not.

## Questions for pass 1

On top of the skill's checklist; questions, not suspicions.

- **Files**: what the tarball holds against what is needed and what is promised, as a consumer installs it.
- **Entry points**: every entry under each module system and resolution the package claims (`node10`, `node16` and
  `nodenext` from CommonJS and ESM, `bundler`), `import` and `require` in one process, on Node 20, 22 and 24.
- **Declarations**: every public signature names a type a consumer can import; a consumer's own declaration emit
  through the public types; the TypeScript floor and both decorator modes.
- **Ranges**: the peer range and `engines` against what the code uses and what the docs say.
- **Changesets**: each pending changeset against its change (bump, text, a migration hint where code stops working, a
  sentence on the first line); every consumer-facing change since `v3.0.1` covered; the version they produce, and
  whether it is the one the guide and the docs expect.

## Pass 2: the first review

Its scope F: `defect-review-result/F-packaging-types-changesets/`; the ledger rows of `defect-review-result/report.md`
whose area is packaging, public types, versioning or changesets, their `DECISIONS.md` entries and their plans; the items
`PLAN-release-gates-and-audit.md` leaves for the second review in this area; the first `inventory.md`'s lines tagged
`[F]`. Probes: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/F/`.

## Neighbours

The workflows that build and publish are 2G's, the type checks' scripts 2T's, the area types' behaviour the area
segments'. Report what you meet there under *outside the segment*.
