# Segment 2F: the first review's findings, claims and test gaps at `d850405`

Pass 2, 2026-10-28 (started 17:32, this table written 17:35:21+01:00), Opus 5.5, second review, segment 2F. Read: the
first review's `F-packaging-types-changesets/` (brief, summary, F-1 to F-5), the ledger rows and sections of
`report.md` for packaging, public types, versioning and changesets (F-1 to F-5, G-4, G-10's changeset note, H-8, R-3,
*Act before the next merge* item 2, *Fixes that touch each other*, test gaps 6 and 14), `DECISIONS.md` #6, #7, #8,
#23, #24, #33, #39, #48, #58, #70, the execution notes of plans F-1, F-2, F-5/H-8, G-4 and T14, the items
`PLAN-release-gates-and-audit.md` leaves for the second review (none in this area but R-3), and the first
`inventory.md`'s §1, §6 [F] and §7.

Re-runs live in `/home/magdys/workspace/dyhex/POMWright-second-review-probes/F/run1/`: a pnpm project with the baseline
tarball (`d850405`), `@playwright/test` 1.64.0, `@types/node` 24.19.2 and TypeScript 6.0.3, the first review's probe
files copied into `F-1/`, `F-2/`, `F-3/`, run with their original command (`npx tsc --strict --target es2022 --module
esnext --moduleResolution bundler --declaration --emitDeclarationOnly --outDir out/<ID> --types node --skipLibCheck
<file>`); logs `<ID>.<file>.log`.

## Findings

| ID | Kind, severity | What I ran at `d850405` and what it printed | Outcome |
| --- | --- | --- | --- |
| F-1 | defect, Low | `F-1/stepFactory.ts` (`export const boxedStep = step({ box: true })`, a titled factory, a class decorated with it): exit 0, emits `export declare const boxedStep: import("pomwright").StepDecorator;`. Its side probe `F-1/annotate.ts` (`ReturnType<typeof step>`) still fails with TS2322 (`'StepDecorator' is not assignable to type 'undefined'`): TypeScript takes an overloaded function's last overload, and the docs give `StepDecorator` as the annotation (`api/step.md`), which compiles (`publicTypes.typecheck.ts:126`). Also: `step("…", { box: true })`, `step()`, bare `step` and static methods emit in both decorator modes on TS 5.0, 6.0.3 and 7.0.2 (`npmproj/step-emit.ts`). | fixed (`b4fee4a`, decision 23) |
| F-2 | defect, Low | `F-2/patterns.ts` (the factory's whole result, its `add`, `createReusable`, a seed's `definition` and `steps`, a page object's helpers): exit 0. Pass 1's generated emit of 161 members (`emit/`, `npmproj/members.ts`) also exits 0 under npm and pnpm. | fixed (`7f90436`, decision 24); the test it added covers 35 expressions, not every member: 2F-2 |
| F-3 | documentation, Low | `F-3/fixturesNoPw.ts`: exit 1, five TS2883 (`PlaywrightTestArgs` … `TestType`); `F-3/seedDefinition.ts`: exit 1, two TS2883 (`Locator` from `playwright-core`); `F-3/fixturesWithExpect.ts`: exit 0, as before. The behavior is TypeScript's (decision 70); the docs now state it: `docs/typescript.md` *`declaration: true`* (the pnpm bullet, TS2883 quoted, the import or `ReusableLocator<Paths>["definition"]`), `docs/installation.md:68-70` links there, `api/fixtures.md:40-42` and `docs/page-objects-in-tests.md:67-68` say why the `expect` import helps. | fixed (docs, `f8ca42a`, decisions 39, 70) |
| F-4 | documentation, Low | `docs/typescript.md:34-35` lists `SessionStorageOptions`, `SeedOptions`, `Decoded`, `AllEntries` (and `StepDecorator`, `ReusableLocatorFactory`); `internal/packaging.md:66` says "Three compile-only files". The API coverage check now fails on a missing table row (baseline: 40 exports, 0 problems). | fixed (`8eda398`, decision 48) |
| F-5 | design question | Decided: patch, 3.0.2. `pnpm exec changeset status --verbose`: "pomwright -> 3.0.2", 50 changesets under patch, exit 0. `docs/versioning.md` *Bumps* cites the promise and names the four parameter-only types; `.changeset/export-storage-types.md` replaced "as every other public signature already allows" with the promise. | fixed differently (decision 6) |
| G-4 (scope G; the build is 2F's) | defect, Low | `echo stale > dist/old-chunk.js && pnpm build`: exit 0, `dist/` holds the four files only; `npm pack --dry-run --json` lists the 8 files; `dist/` byte-identical to before (`run1/G-4/`). `packageFiles.spec.ts` asserts the list in every harness run (baseline green). | fixed (`ee00af7`, decision 33) |
| H-8 (scope H; the markers follow the bump rules) | design question | `Added in: v3.0.2` under all six new exports (`api/step.md:90`, `api/class-sessionstorage.md:280, 333, 365, 377`, `api/class-reusablelocator.md:165`); the rule is in `website/AGENTS.md:66-69`. | fixed differently (decision 7) |
| R-3 | documentation, Low (the first review's own inventory) | The count was of the first review's notes; there are now 50 pending changesets (`ls .changeset/*.md`, minus `README.md`). | still present, decided (#8: closed, no action; the folder goes before the merge) |
| G-10, its changeset part | (defect of scope G) | `.changeset/trusted-publishing.md`'s claims hold against npm's registry today: `pomwright@3.0.0` and `3.0.1` have `dist.attestations` null; `CHANGELOG.md:93` has the 3.0.0 promise. The workflow is 2G's. | changeset text holds; the rest is 2G's |
| *Act before the next merge* 2, the three changesets that claimed more than the code | (report) | `export-storage-types.md`: amended (above). `boxed-step-location.md` (E-1) and `batch-navigation-message.md` (A-1): both amended in their fix commits (`b19de77`, `56229e2`); the text now describes nested boxed steps and the before-and-after origin check. Their behavior is 2E's and 2A's; not re-probed here. | text fixed; behavior left to 2A and 2E |

## Claims beyond the findings: the first review's *What is sound* (scope F)

| Claim | Checked at `d850405` | Note |
| --- | --- | --- |
| Packed file list: exactly 8 files | `tar -tzvf` of the baseline tarball; `npm pack --dry-run --json` | holds (and is now a spec) |
| One copy across `import`/`require` on Node 20, 22, 24; deep imports closed | `consumer-check.sh --node-floor` on 20.20.2 and 22.18.0; `shared.mjs` and `esm-default.mjs` on 24.22.0 | holds |
| TypeScript `node10`, `node16`, `nodenext`, `bundler` | `consumer-check.sh` (Node 24), exit 0 | holds |
| attw clean | attw 0.18.5 in `consumer-check.sh`: "No problems found" | holds |
| Runner in CommonJS, ESM and `experimentalDecorators` projects | `consumer-check.sh` (CJS, ESM); `run1/runner-legacy/` (the first review's probe, on the new tarball): 1 passed, exit 0 | holds; Playwright's Babel transform uses decorators `2023-05` whatever the tsconfig says (`babelBundle.js:72398`), so the runner never runs the legacy form |
| Peer range at 1.64.1 | not run locally; CI's "Harness (chromium, Playwright latest)" is green on `d850405` (baseline.md) | holds as far as CI ran |
| TypeScript 5.0.4 to 7.0.2; 5.0 needs `skipLibCheck` (Playwright's and @types/node's declarations) | `pt-results.txt`: the three harness type probes on 5.0-5.9 and 7.0.2, exit 0; `floor/run.out` | holds for POMWright's declarations; the `skipLibCheck` part was probed on 5.0, 5.4, 5.6, 5.8, 5.9 (their `ts-versions/`), never 5.1, which needs it too with `@types/node` 24: 2F-1 |
| Declarations need no DOM lib and no Node types beyond Playwright's | `--lib es2022` without DOM: 131 errors, all in `playwright-core/types`, none in `pomwright`; `dist/index.d.ts` has no Node reference | holds |
| Strict flags (`exactOptionalPropertyTypes`, …, `noImplicitOverride`) with `skipLibCheck` false | `npmproj/flags/` | holds |
| Exports match the guide and `api/index.md` (38 then, 40 now) | `index.ts`, `dist/index.d.ts:2877-2878`, both tables | holds |
| Every other public result emits | `emit/` (161 members, npm and pnpm) | holds |
| Every declaration change since 3.0.1 has a changeset | v3.0.1's harness `tsc` and 209 doc snippets against 3.0.2 (exit 0); `before/run.out` (ten type-level changesets' before and after) | holds |
| `storage-string-key-types` accurate | `breaks/breaks.ts` case 3 | holds |
| `exports-default-condition` accurate | manifest; `esmEntry.spec.mts` | holds |
| Changesets: sentences, no changelog-github rewrite, all patch, the §7 format | `changeset status --verbose`; grep of `.changeset/`; `changelog-github@1.0.1/dist/index.mjs:75-138` read | holds for 50 now |
| README examples compile; requirements sentence | the snippet check (baseline, README included); README:158 | holds |
| `installation.md` claims | probed in pass 1 | holds, but for the `skipLibCheck` sentence (2F-1) |
| `typescript.md`'s generic base class | `npmproj/generic-base.ts` | holds |
| `packaging.md` | read against the build and harness | holds, but for "every public member" (2F-2) |
| *Upgrading from 2.x*, *Requirements*: raised from `>=1.57.0` | npm: `pomwright@2.1.0` peer `>=1.57.0 <2.0.0` | holds |
| `pnpm pack:version` | `pack:version 3.0.2-probe.1` in the worktree, exit 0, 8 files, version in the packed manifest only | holds |

## The first review's test gaps (scope F) and report gaps 6 and 14

| Gap | At `d850405` |
| --- | --- |
| 1. No emit probe exports a preconfigured `@step` | closed: `publicTypes.emit.ts:51,59-60` |
| 2. No emit probe for a module importing only `pomwright` under pnpm | open by decision (#70: it would test TypeScript, not POMWright) |
| 3. No check that every public method's return type is exported | partly closed: the emit check returns 35 expressions; pass 1 generated 161 and found no failure; 2F-2 |
| 4. The factory's whole result and `createReusable` emitted nowhere | closed: `publicTypes.emit.ts:48, 104-106` |
| 5. §7 packaging probes manual | closed: the `consumer` job (`scripts/consumer-check.sh`), green on `d850405` and locally |
| 6. Consumers' TypeScript versions unchecked | partly closed: 5.0 (with `skipLibCheck`), latest 5.x, 6.x and latest in CI; 5.1-5.8 not; 2F-1 |
| 7. The packed file list not asserted | closed: `packageFiles.spec.ts` |
| Report gap 14's `EBADENGINE` | open by decision (#58): `engines` unchanged since v3.0.1 |

## Outcome counts

fixed 5 (F-1, F-2, F-3, F-4, G-4); fixed differently 2 (F-5, H-8); still present, decided 1 (R-3); not fixed 0; fixed
incompletely 0 (F-2's own contract holds; the test it added is narrower than its description, filed as 2F-2, a new
documentation finding); regressed 0; cannot re-run 0. The changeset parts of G-10 and of *Act before the next merge*
item 2: text holds, behavior left to 2A, 2E and 2G.
