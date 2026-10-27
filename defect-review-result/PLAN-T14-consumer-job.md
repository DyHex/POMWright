# Plan 5: a `consumer` job: the packaging probes and TypeScript 5.0 to latest

- **Decisions**: [DECISIONS.md](DECISIONS.md) #58
- **Findings**: none (test gap #14's remaining parts; scope F's one-off checks, `…-probes/F/ts-versions/`,
  `consumer-cjs/`, `runner-cjs/`, `runner-esm/`, `attw.log`, `node-shared.log`)
- **Bump**: none (no changeset: the supported range states what already holds)
- **Stop**: **yes**, after the commit: the maintainer pushes, and the `consumer` job must be green on PR #60
- **Depends on**: plans 1 (the file list), 3 (`checks.yaml` without the skip; actionlint)

## Contract

Every CI run checks the packed tarball the way consumers install it: TypeScript under `node10`, `node16`, `nodenext`
and `bundler` resolution; attw reporting no problem; Playwright's runner in a CommonJS and a `"type": "module"`
project; `require` and `import` sharing one `PageObject` on Node 20; and a consumer fixture compiled with TypeScript 5.0
(with `skipLibCheck`), the latest 5.x, the latest 6.x and the latest release, under the standard and the
`experimentalDecorators` modes. The TypeScript floor is stated once in three places that move together: the README
badge, *Installation*'s sentence, and the oldest version in the job's loop.

## Current behaviour

AGENTS.md §7 lists these probes as manual, run before a release in a scratchpad project; no supported TypeScript range
is stated or tested. Scope F found TypeScript 5.0.4 to 7.0.2 compiling a consumer, 5.0 needing `skipLibCheck` for
Playwright's and `@types/node`'s declarations.

## Steps

1. **A driver runnable locally and in CI**: `scripts/consumer-check.sh <tarball>` with its fixtures in
   `scripts/consumer/` (a consumer `.ts` file that imports values and types from `pomwright`, a page object, a registry,
   a decorated class with `@step()` and a stored `step({ box: true })`, and a `// @ts-expect-error` on a wrong path, so
   real types are proven; a `tsconfig` per resolution; a CommonJS and a `"type": "module"` runner project, each with
   one spec that needs no browser; the consumer compiles with `noEmit`, since declaration emit is
   `publicTypes.emit.ts`'s job and `step({ box: true })` is exportable only from plan 15 on). For each case it copies
   the fixture into a fresh temporary directory, installs the
   tarball and the pinned `@playwright/test` (1.64.0, the peer floor) with npm, and runs the check:
   - `tsc --noEmit` under `node10`, `node16` (CommonJS and ESM), `nodenext` and `bundler`;
   - attw, `npx --yes @arethetypeswrong/cli@<pinned version> <tarball>` (scope F used 0.18.5), never a dependency;
   - `npx playwright test` in the two runner projects;
   - the TypeScript loop: `typescript@5.0` (`skipLibCheck: true`), the latest 5.x, the latest 6.x and `latest`, each
     compiling the consumer under both decorator modes;
   - with `--node-floor`, only the loading probe: `require` and `import` from the installed package give one
     `PageObject` (`node-shared.log`'s check).
   It prints one line per case and exits non-zero on the first failure, naming the case. Shellcheck-clean.
2. **`checks.yaml`, a `consumer` job**, `needs: package`: checkout, setup-node 24, download the `pomwright-package`
   artifact, `bash scripts/consumer-check.sh "$TARBALL"`; then `actions/setup-node` with Node 20 and `bash
   scripts/consumer-check.sh --node-floor "$TARBALL"`. The gate job `build` of `pr.yaml` and `main.yaml` already needs
   `checks`, which includes the new job; check that a failing `consumer` fails `build`. Header comment: what the job
   checks and why (consumers' installs, not the harness's).
3. **Run it locally** against `pomwright-test-build.tgz` before the commit (registry access needed), and record the
   resolved TypeScript versions and the time it took in *Execution notes*.
4. **Docs**:
   - *Installation*, *TypeScript settings*: "POMWright's declarations compile with TypeScript 5.0 and later; 5.0 needs
     `skipLibCheck` for Playwright's own declarations."
   - README: the badge beside the Playwright and Node ones:
     `[![TypeScript](https://img.shields.io/badge/TypeScript-%E2%89%A55.0-3178c6)](https://dyhex.github.io/POMWright/docs/installation/#typescript-settings)`.
   - AGENTS.md §2: the `consumer` job in the `.github/workflows/` row, and `consumer-check.sh` and `scripts/consumer/`
     in the `scripts/` row. AGENTS.md §3 or §7: the TypeScript floor lives in the badge, *Installation*'s sentence and
     the oldest version of the job's loop, and moves in all three together, as the Playwright peer floor and its pins
     do. AGENTS.md §7: the manual pre-release list shrinks to `EBADENGINE` (when `engines` changes); the rest runs in
     the `consumer` job and the file-list spec.
   - *Internal → Tests and checks*, *CI*: a **consumer** bullet.

## Tests

The job itself; a deliberate break checked once locally (a wrong `types` path in a copy of the tarball's manifest
fails the `node16` case and attw), recorded in *Execution notes*.

## Verify

The standard checks (PLANS.md, rule 5), the driver locally, actionlint, `pnpm docs:build`. Then **stop**: the
maintainer pushes; the `consumer` job must be green on PR #60, with its timing noted.

## Commit

```text
ci: a consumer job checks the package as consumers install it

The packaging probes that were run by hand before a release now run on every
CI run against the packed tarball: TypeScript resolutions, attw, Playwright's
runner in CommonJS and ESM projects, one shared copy on Node 20, and a
consumer compiled with TypeScript 5.0 to the latest release in both
decorator modes. The README and the Installation page state the floor.

Plan: defect-review-result/PLAN-T14-consumer-job.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27.

- `scripts/consumer-check.sh` and its fixtures in `scripts/consumer/` (`consumer.ts`, copied to `.ts`, `.mts` and `.cts`;
  `runner/consumer.spec.ts` and `runner/playwright.config.ts`, which need no browser; `shared.mjs`). One npm project for
  the TypeScript cases (the tarball, `@playwright/test` 1.64.0 and `@types/node` from the root's devDependencies, the
  root's TypeScript `^6.0.3`, and the loop's versions as aliases `ts-5.0`, `ts-5`, `ts-6`, `ts-latest`); one project per
  runner; one for `--node-floor`. Each compile uses `--noEmit --strict --target es2022 --types node --listFiles`, and
  checks the declarations it read (`index.d.ts` from CommonJS and node10, `index.d.mts` from ESM and bundler).
- Resolved locally: TypeScript 6.0.3 for the resolutions; the loop 5.0.4 (with `skipLibCheck`), 5.9.3, 6.0.3 and 7.0.2;
  attw 0.18.5 (still the latest release; "No problems found", node10, node16 from CJS and ESM, bundler). node10 needs
  `--ignoreDeprecations 6.0` on TypeScript 6 (a comment in the script says so).
- Local run: every case `ok` in about 22 s; `nvm exec 20 … --node-floor`: "node v20.20.2: import and require share one
  copy". A copy of the tarball whose `types` and `require.types` point at `dist/missing.d.ts` fails the first case
  (TS7016, and the members unknown), exit 1.
- `checks.yaml`: a `consumer` job (`needs: package`; Node 24 for the checks, then `setup-node` 20 for `--node-floor`; both
  steps `shell: bash`). The gate `build` needs `checks`, which includes it, so `pr.yaml` and `main.yaml` are unchanged.
- Docs: *Installation*, *TypeScript settings* (TypeScript 5.0 and later; 5.0 with `skipLibCheck`); the README's
  TypeScript badge; AGENTS.md §2 (the job, the script), §7 (the probes run in CI, only `EBADENGINE` manual; the
  TypeScript floor's three places); *Internal → Tests and checks* (a **consumer** bullet).
- Checks: `pnpm lint` 0 (164 files); actionlint 0; shellcheck 0 on the script; `pnpm test:unit` 782 passed; `pnpm
  pack-test --reporter=line` exit 0 (1,509 passed, 3 skipped; doc snippets 215; api coverage 0 problems; step locations
  7); `pnpm docs:build` 0.
