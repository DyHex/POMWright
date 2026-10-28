# Segment 2F inventory, reconciled

Pass 3, 2026-10-28T17:36:35+01:00. The union of `inventory-blind.md` and the first review's lines for this area
(`defect-review-result/inventory.md` §1 as far as packaging and the export surface go, §6's [F] line, §7 [F]; plus what
its scope F brief and summary list as read). Each line: *both*, *blind only* or *first only*; then how deeply each
review probed it (first: at `54cdada`; second: at `d850405`).

## The package

| Item | Mark | First review | Second review |
| --- | --- | --- | --- |
| Export surface: `index.ts` against the guide's list and `api/index.md` | both | full: 38 exports, every type-only export an alias or interface (`surface.mjs`) | full: 40 exports; both tables; the six new ones marked |
| Every public method returns an importable type; no class re-exported as a type; no builder returns `this` | both | full: a walk of `dist/index.d.ts` | full: the 74 unexported reachable names listed (`emit/unexported-refs.out`); the four parameter-only types appear only in parameters; an emit of every member |
| Declaration emit without annotations | both | full: 34 members (walkthrough), npm and pnpm; F-1, F-2 found | full: 161 generated members, npm (TS 5.0, 5.4, 5.9, 6.0.3, 7.0.2) and pnpm; the `@step` forms in both modes; 2F-2 (the harness check's coverage) |
| The pnpm TS2883 case | both | full: F-3 | re-run (pass 2): as documented |
| `package.json`: `main`, `types`, `exports` (with `default`), `files`, peer range, `engines`, `packageManager` | both | full | full: the packed manifest against the source |
| The build (`tsup --clean`, `write-esm-entry.mjs`) and `dist/` | both | full; G-4 (no `--clean`) under scope G | full: G-4 re-run (fixed); the bundle's runtime APIs and Playwright internals (none) |
| `pack-build.sh`, `pack-extract.sh` | both | read | read; exercised by the baseline |
| `scripts/pack-version.sh` | both | run in a throwaway clone | run in the worktree (`3.0.2-probe.1`), `dist/` unchanged |
| `tsconfig.json` (root) | both | read | read |
| `LICENSE` | first only | read (start) | read in pass 3: Apache License 2.0, 201 lines, matches `license` |
| The published README | both | full: examples compiled | read; the snippet check compiles it (baseline) |
| The baseline tarball | blind only (new this review) | — | file list, identical to the worktree's |

## Consumers

| Item | Mark | First review | Second review |
| --- | --- | --- | --- |
| Module resolutions (node10, node16, nodenext, CJS and ESM; bundler) and attw | both | full, by hand (§7 probes) | full: `consumer-check.sh`, now CI's job |
| `import` and `require` in one process on Node 20, 22, 24 | both | full | full |
| Playwright's runner in CJS, ESM and `experimentalDecorators` projects | both | full | full (the legacy probe re-run in pass 2); the runner's Babel always uses 2023-05 decorators |
| The consumer check itself (`scripts/consumer-check.sh`, `scripts/consumer/`) | blind only | — (did not exist; decision 58) | full: run on Node 24, `--node-floor` on 20 and 22 |
| TypeScript floor (5.0) and the `skipLibCheck` sentence | both | partial: 5.0, 5.4, 5.6, 5.8, 5.9, 6.0, 7.0 | full: 5.0 to 5.9 and 7.0.2, by `@types/node` 20, 22, 24; 2F-1 |
| Decorator modes | both | full | full |
| Consumer compiler settings (`noImplicitOverride`, strict flags, no DOM lib) | both | full | full |
| Generic base class path forwarding (`LocatorSchemaPathArgument`) | both | full | full |
| `EBADENGINE` | first only | not run (`engines` unchanged) | not run (unchanged since v3.0.1; decision 58 keeps it manual) |

## Harness

| Item | Mark | First review | Second review |
| --- | --- | --- | --- |
| `esmEntry.spec.mts` | both | read | read; its claims re-probed in a consumer project |
| `packageFiles.spec.ts` | blind only | — (did not exist; decision 33) | read; G-4's probe re-run |
| `publicTypes.typecheck.ts`, `publicTypes.emit.ts`, `stepLegacyDecorators.typecheck.ts` | both | read; the emit file's gaps were test gaps 1, 4 | compiled outside the harness on TS 5.0-5.9 and 7.0.2; 2F-2 |
| What `check-api-coverage.mjs` checks of the exports | first only | read (opening) | read in pass 3 (opening): every export has a page or section, every type is in *TypeScript*'s table; the script is 2T's |

## Ranges

| Item | Mark | First review | Second review |
| --- | --- | --- | --- |
| Peer range at the top (latest 1.x) | both | full: harness at 1.64.1 on chromium, locally | CI's latest-1.x job on `d850405` (green); not run locally |
| `engines` against the code and Playwright | both | read | full: the bundle's APIs; Playwright 1.64.0 and 1.64.1 declare `>=20` |
| *Upgrading from 2.x*, *Requirements* | first only | full | checked in pass 2 against npm's 2.1.0 manifest |

## Changesets

| Item | Mark | First review | Second review |
| --- | --- | --- | --- |
| Bump of each changeset; the release version | both | full (29 then); F-5 | full (50): `changeset status`; the four compile breaks against 3.0.1 and their docs basis |
| First line a sentence; no changelog-github rewrite | both | full | full |
| Text against the code | both | partial: registry and URL messages at runtime, storage and `@step` by source | partial: the type-level claims of ten changesets at 3.0.1 and 3.0.2 (`before/`); runtime texts left to the area segments |
| Every consumer-facing change covered | both | full (declarations diffed against 3.0.1) | full: every `src`/`index.ts` commit mapped; v3.0.1's docs and harness compiled against 3.0.2 |
| Migration hints where code stops working | both | partial (the then-pending breaks) | full for compile breaks: 2F-3 (the rule), 2F-4 (`schema-type-and-value`) |
| The CHANGELOG format (dry `changeset version`) | both | full: a dry run in a clone with a stubbed GitHub lookup | read in pass 1 (`changelog-github`, `apply-release-plan`); rendered in pass 4 without `changeset version` |
| `.changeset/config.json` | both | full | full |
| The trusted-publishing changeset's claims | blind only (new) | — | full: npm registry |

## Docs

| Item | Mark | First review | Second review |
| --- | --- | --- | --- |
| `docs/installation.md` | both | full; F-3 | full; 2F-1 |
| `docs/typescript.md` | both | full; F-3, F-4 | full |
| `api/index.md`, `api/types.md` | both | read | read |
| `internal/packaging.md` | both | full; F-4 | full; 2F-2 |
| The guide's packaging and versioning rules (then AGENTS.md §1, §5, §7; now `AGENTS.md`, `src/AGENTS.md`, `docs/repository.md`, `docs/versioning.md`) | both | read | read in full; 2F-3 |

## Findings, both ways

- First-review findings the blind pass would have met: F-1 and F-2 (the emit probe of every member covers them), F-4
  (the table), F-3 (the pnpm emit, reproduced in pass 1 as documented). All four are fixed at `d850405`, so the blind
  pass met their fixed state; no blind spot. F-5 is decided; the blind pass met its outcome (the `Bumps` rule) and
  found the four compile breaks patches by it.
- Blind findings the first review did not report:
  - 2F-1: new since `54cdada` (the sentence, 612a62a); its root, 5.1 never compiled, was a gap of the first review's
    `ts-versions/` probe.
  - 2F-2: new since `54cdada` (7f90436, the member list and its description).
  - 2F-3: missed by the first review: `AGENTS.md:344` at `54cdada` already said "a 2.x user wrote stops working", and
    the first review read §7.
  - 2F-4: new since `54cdada` (e05b84d).

## What both maps leave out (for pass 4)

From the skill's Phase 1 list, item by item, for this area: the rendered CHANGELOG section (format only, without
`changeset version`); a consumer installing with Yarn (named on *Installation*); the packed `README.md` as npm renders
it (relative links); the `pack:version` tarball installed by a consumer; changesets that mention a member or option
added in 3.0.2 without an `Added in` marker on its page (members and options, not only exports); the `exports` map's
`default` condition exercised by a resolver that matches neither `import` nor `require`.
