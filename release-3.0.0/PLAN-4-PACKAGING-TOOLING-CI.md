# Plan: packaging, tooling and CI (analysis section 4, and the `retries`, `.npmignore` and `src/dist` bullets of section 2)

Working document, kept in `release-3.0.0/` beside the analysis it answers: every bullet of section 4 (the SPDX
licence id; `exports`, `engines` and `sideEffects`; declaring `@playwright/test` and a floor matrix; the harness
install, its sudo requirement and its browsers; the publish gate; the `tsc` step and the typecheck probe file; the
lint scope; the `CHANGELOG.md` note; the unit-test layer) and three bullets of section 2 (`retries` in
`playwright.base.ts`, `.npmignore`, the stray `src/dist`). File links are relative to this folder. Written and
reviewed 2026-10-14: the review confirmed the single `CI` workflow and why `test.yaml` merges into it (3.6), widened
the latest-Playwright job to all three browsers and settled how a rendering difference between Playwright versions is
handled (3.3), and dropped a Playwright release watcher as out of scope. A second review the same day replaced the
single `CI` workflow by a pull-request workflow and a `main` workflow sharing one reusable workflow, added a guard to
`publish.yaml`, gave `pack-test.sh` a `PLAYWRIGHT_VERSION` switch for the latest-Playwright jobs, and re-verified the
package shape with the exact ESM entry the build writes (P17). A third review the same day made the jobs skip the
unit tests, the build and the harness for changes to `.md` files only (lint always runs), made every harness job test
the one tarball the build job packed, and kept the required status check `build` through a gate job (P19). Every
decision in section 7 was taken with the user on 2026-10-14 and is mirrored in [DECISIONS.md](DECISIONS.md) and
[RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md).

Every claim below was verified on 2026-10-14 against HEAD ff57895. Packaging and install behaviour was probed in two
fresh clones of the repository in the session scratchpad, never in the working tree (which stayed clean): `pnpm pack`
and `npm publish --dry-run` (npm 11.17.0); five tarball variants of the package installed into temporary consumer
projects with pnpm 9.12.0; module resolution under Node 18.20.8, 20.20.2 (official binaries, checksums verified) and
24.19.0, and TypeScript 5.9.3 under `node10`, `node16`, `nodenext` and `bundler`, with a consumed `@ts-expect-error`
in every probe file to prove the real declarations were loaded; `@arethetypeswrong/cli` (latest, run with `npx` in
the scratchpad, not added to the repository); Playwright 1.64.0's own runner in CommonJS and `"type": "module"`
consumer projects on Node 20 and 24; the full harness on chromium, firefox and webkit against the packed HEAD
tarball; `tsc` and biome over the clone; the published workflow history through GitHub's public API and the npm
registry; `actionlint` 1.7.12 (release binary, checksum verified, scratchpad only). API usage facts come from one 2.1.0
consumer project and the other `package.json` files found beside it, counts only. Example hosts are generic
(`*.example`).

Probes cited below: **P1** how the workflows chain: triggers, the run history, publish times on npm, step timings,
and GitHub's documented `workflow_run` semantics; **P2** the packed file list with and without `.npmignore`, the
stray `src/dist`, the licence string and `npm publish --dry-run`; **P3** module resolution of five package shapes
(v0 today, v1 dual builds, v2 CommonJS-only `exports`, v3 a CommonJS build with an `export *` ESM entry, v4 the same
with a named ESM entry and an `index.d.mts`): (a) Node `require` and `import` on 18, 20 and 24, deep imports and
`pomwright/package.json`, (b) TypeScript per resolution mode, (c) attw, (d) the build step that writes the ESM entry;
**P4** the Node floor: the source's language level, Playwright 1.64's `engines` and runtime check, the dev
toolchain's `engines`, an install on Node 18; **P5** the Playwright runner as a consumer: (a) CommonJS and ESM
projects per package shape on Node 20 and 24, which file it loads, (b) one process that reaches pomwright through
both `import` and `require`, (c) a `.mts` spec inside a CommonJS project; **P6** the full harness: (a) each browser
with `--retries=0`, (b) `--repeat-each=3`, (c) two workers, (d) chromium on Node 20; **P7** `tsc --noEmit -p test`,
including the typecheck probe file and a deliberately unused `@ts-expect-error`; **P8** biome over a wider scope;
**P9** the harness install: (a) a frozen install with the `file:` tarball missing, identical, and changed, with and
without an existing `node_modules`, and whether `pnpm pack` is deterministic, (b) a `file:` directory instead, (c)
what `playwright install --with-deps` and `install-deps` run, and sudo; **P10** `sideEffects` under esbuild; **P11**
`retries`, `failOnFlakyTests` and the deprecated `retry-with-video`; **P12** the history behind the `CHANGELOG.md`
note; **P13** the consumer survey; **P14** `@playwright/test` declared as a root dev dependency; **P15** `actionlint`
on today's workflows; **P16** (review) the v2.1.0 tag's own harness against the published 2.1.0 tarball on
Playwright 1.64.0, per browser, as a model of what a newer Playwright does to string assertions; **P17** (second
review) v4 rebuilt exactly as the build will make it (`tsup --format cjs --dts`, then the entry generator of P3d) and
re-run through P3a, P3b, P3c and P5 on Node 20 and 24, including every assertion of the planned `esmEntry.spec.mts`
in a `.mts` spec of a CommonJS project; `tsc -p test` on a `.mts` spec; `pnpm add` of another Playwright version over
the directory dependency of P9b; what `npm view` returns for a version range; **P18** (second review) GitHub facts for
the workflow layout: the run history of the Version Packages branch and of draft PR #46, and GitHub's documentation
on `GITHUB_TOKEN`-created events and reusable workflows; **P19** (third review) the branch protection of `main`
(public API), GitHub's documentation on path filters and on skipped jobs as required checks, and what biome does
with `.md` files; **P20** (final review) `tsc -p test` with `test/` and the root on different Playwright versions
(1.63.0 and 1.64.0), and with both on 1.63.0.

Out of scope, left to the plans listed in [PLANS.md](PLANS.md): `stripInternal` and every other question about which
types are exported (1.9b, plan 7; the section 4 bullet that names it is ticked by plan 7); the README's Node version
and install section (plan 10); the Starlight site, Pages workflows and README repointing (release work); npm
provenance or trusted publishing (not in the analysis; mentioned in 3.6 as not done). Decided in review to leave for
after 3.0.0: a scheduled workflow that tests the latest pomwright release against each new Playwright release
(GitHub offers no event for releases in another repository, so it would poll daily); converting the harness's
existing rendered-string assertions to DOM assertions (at least 70 in 18 spec files, P16, with fixture-page changes);
publishing the tarball that CI tested instead of a rebuild (decided in the third review): `publish.yaml` runs
`pnpm run release`, which is `pnpm run build && changeset publish` ([package.json:28](../package.json#L28)), so the
published package is built again from the tested commit, not taken from the CI artifact. The risk is small, since
two packs of one commit were byte-identical (P9a) and two builds gave byte-identical `dist` files (P3d), but the
published bytes are not the tested bytes; closing it means changing how changesets publishes. Linting the Markdown
itself (biome does not process `.md`, P19; it would need a new dev dependency) is not planned either.

---

## 1. Intended contract

### 1.1 In short, for consumers and contributors

**Consumers.** Nothing in a test, page object or locator file changes. What changes is the package manifest:

```jsonc
// 2.1.0, as published (abridged)
{
  "license": "Apache 2.0",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "peerDependencies": { "@playwright/test": ">=1.57.0 <2.0.0" }
}

// 3.0.0 (decisions of section 7)
{
  "license": "Apache-2.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" },
      "require": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
    },
    "./package.json": "./package.json"
  },
  "engines": { "node": ">=20" },
  "peerDependencies": { "@playwright/test": ">=1.64.0 <2.0.0" }
}
```

What a consumer can notice:

| where | 2.1.0 | 3.0.0 |
| --- | --- | --- |
| `import { PageObject, test } from "pomwright"` in a CommonJS project (no `"type"`, Playwright's default) | loads `dist/index.js` | the same file (P5a) |
| the same in a `"type": "module"` project | Node ignores `module` and loads `dist/index.js` through its CommonJS interop (P3a, P5a) | loads `dist/index.mjs`, which re-exports the same `dist/index.js` by name: one implementation, one `PageObject` class per process even when a CommonJS helper `require`s it too (P3a, P5b) |
| `import … from "pomwright/dist/index.js"` or any other deep path | works | `ERR_PACKAGE_PATH_NOT_EXPORTED` (P3a); none of the 141 importing files surveyed uses one (P13) |
| `require("pomwright/package.json")` | works | works (an explicit subpath) |
| TypeScript, any `moduleResolution` | `index.d.ts` everywhere | `index.d.ts` for `require` and `node10`, `index.d.mts` for `import`, which re-exports `index.d.ts`; type-checks in all four modes, attw finds no problem (P3b, P3c) |
| install on Node 18 | no warning from pomwright; Playwright 1.64 exits at import: "Playwright requires Node.js 20 or higher" (P4) | `npm warn EBADENGINE` for pomwright as well; the install still succeeds and Playwright still exits at import (P4) |
| install on Node 20 or later | works | works; the runner, a page object, navigation and session storage pass on 20.20.2 and 24.19.0 (P5a, P6d) |
| licence shown by npm and scanners | `Apache 2.0`, not an SPDX expression (P2) | `Apache-2.0` |

**Contributors.** The harness installs the package the way a consumer does, with a frozen lockfile, no sudo, and no
stale build:

```sh
# 2.1 and HEAD
pnpm pack-test        # needs sudo (install-deps), runs chromium only, can test a stale build locally
# the non-interactive workaround in AGENTS.md section 3
./pack-build.sh
cd test
pnpm add -D "pomwright@file:../pomwright-test-build.tgz" --ignore-scripts   # rewrites test/pnpm-lock.yaml
pnpm exec playwright test --project=chromium --reporter=line

# 3.0.0
pnpm pack-test                                            # build, pack, frozen install, typecheck, three browsers
pnpm pack-test --project=chromium tests/testApp/testIds.spec.ts --reporter=line
pnpm lint                                                 # the whole repository, not ./src
pnpm format
pnpm typecheck                                            # tsc over test/, after pnpm harness:install
```

| what | 2.1 and HEAD | 3.0.0 |
| --- | --- | --- |
| how `test/` gets pomwright | `file:../pomwright-test-build.tgz`; the lockfile pins the tarball's hash, so CI installs with `--no-frozen-lockfile` and a local install can keep an older build (P9a) | `file:../.pack/pomwright`, the packed tarball extracted; a frozen install refreshes the installed copy every time, and `test/pnpm-lock.yaml` never changes when the package changes (P9b) |
| sudo | `playwright install --with-deps` and the harness postinstall `install-deps` both call `apt-get` through sudo, every time (P9c) | never locally; CI passes `--with-deps` |
| browsers | chromium | chromium, firefox, webkit (all 370 tests pass on each, P6) |
| `tsc` | none outside the vitest typecheck of `src` | `pnpm typecheck` over `test/`, including the typecheck probe file, in `pack-test` and CI |
| lint | `./src` | the repository, minus the third-party W3 template page |
| `retries` | 1 locally and in CI | 0 locally; 1 in CI with `failOnFlakyTests` |
| CI | `CI` (lint, unit, build) on every push; a separate test workflow on pull requests and `main`; publish waits for `CI` only | one reusable workflow, run by `pr.yaml` for every pull request, draft or not, and by `main.yaml` (`CI`) for every push to `main`: lint always; unit tests, one build and pack, then the harness on three browsers at the floor and at the latest Playwright 1.x against that one tarball, unless only `.md` files changed; the required check `build` is a gate over all of it; publish waits for `CI`; a branch without a pull request gets no CI |
| `@playwright/test` at the root | an auto-installed peer, under `dependencies` in the lockfile | a dev dependency pinned to the floor, 1.64.0 |

### 1.2 Principles for this plan

- **Mirror Playwright's packaging.** `@playwright/test` ships one CommonJS implementation, an ESM entry that
  re-exports it, an `exports` map with `import` and `require` conditions, and `engines: { node: ">=20" }` (P3c, P4).
  POMWright does the same, so one Playwright process never holds two copies of POMWright.
- **The public API is the root entry.** AGENTS.md section 1 already says everything outside `index.ts` is internal;
  the `exports` map makes it so.
- **Test what consumers install.** The harness installs the packed package with a package manager and a frozen
  lockfile, on every browser the config defines, and type-checks the specs against the published declarations.
- **No sudo, no network surprises in local runs.** System libraries are a machine prerequisite; the scripts download
  browsers only.
- **Publish only what CI proved.** The publish workflow starts only after every check, including the browser suite,
  passed on `main`.
- **No new runtime dependency; dev dependencies only with a decision.** The one new dev dependency is
  `@playwright/test` at the floor (7.5). attw and actionlint were probes, not dependencies.

### 1.3 Edge cases, with the decided answer

| case | today (verified) | 3.0.0 |
| --- | --- | --- |
| a consumer's `"type": "module"` spec plus a CommonJS helper that `require`s pomwright, one process | one copy (both load `index.js`) (P5b) | one copy: the ESM entry re-exports `index.js` (P5b, v4); a dual build would give two `PageObject` classes and two `test` objects (P5b, v1), rejected (3.1) |
| a bundler (esbuild) importing `{ json }` | resolves `main`, 104,696 bytes (P10) | resolves the ESM entry, which imports the CommonJS build: 105,556 bytes (P10) |
| `sideEffects: false` | absent | absent: no effect on a one-file bundle (P10) |
| TypeScript `node10` (older consumer configs) | `index.d.ts` | `index.d.ts`, through the top-level `types` that stays |
| a new export added to `index.ts` | n/a | the build writes it into `index.mjs` from the CommonJS build's own keys (P3d); the harness ESM spec fails if the two ever differ |
| the harness after `pnpm build` without a pack | tests the previous tarball if `node_modules` exists (P9a) | tests the previous extraction until `pnpm pack-test` or `pnpm harness:install` runs again; both always repack |
| `pnpm install` in `test/` before any pack | `ENOENT` for the tarball (P9a) | `ENOENT` for `.pack/pomwright` (P9b); `pnpm pack-test` packs first |
| a peer range or version bump in the packed `package.json` | the lockfile hash changes | frozen install passes and installs the new manifest (P9b) |
| a file removed from the package | n/a | removed from the installed copy (P9b) |
| a machine without Playwright's system libraries | `pack-test` stops at the sudo prompt | the browser launch fails with Playwright's message listing the missing libraries; `pnpm -C test exec playwright install-deps` once, with sudo, fixes it; `install-deps --dry-run` lists them without sudo (P9c) |
| Playwright 1.65 released | not tested until the harness pin moves | the latest jobs install it on the next CI run and test all three browsers; a failure fails CI and so blocks publishing until POMWright or the spec is adapted (7.6) |
| latest 1.x equal to the pin (today: 1.64.0) | n/a | the latest jobs see that and end green without running the suite twice (7.6) |
| a newer Playwright renders a locator string differently (1.64's `.visible()`, P16) | the string assertion fails on every browser alike | the failing spec is fixed then, preferably by asserting against the DOM; existing string assertions are not converted ahead of time (7.6) |
| a real behaviour difference between browsers on one Playwright version | handled with the `browserName` fixture, as [sessionStorage.spec.ts:506-521](../test/tests/testApp/sessionStorage.spec.ts#L506-L521) does for WebKit's iframe storage | the same |
| a flaky test in CI | retried once and reported green as "flaky" | retried once for a trace and a video, then fails the job (`failOnFlakyTests`) |
| a pull request from a fork whose branch is named `main` | runs the test workflow only; `CI` does not run on pull requests | runs `pr.yaml`; it can never be a `CI` run, so it cannot start Publish, and `publish.yaml`'s guard checks `event == 'push'`, the `main` branch and this repository as well (7.10) |
| the changesets bot opens or updates the Version Packages pull request | its push starts nothing; the `pull_request` run waits for approval (P18) | the same: approve the `pr.yaml` run to get the full suite; publishing still waits for `CI` on `main` after the merge |
| a branch without a pull request | `CI` (lint, unit, build) on every push | no CI; open a pull request or a draft to get it (draft pull requests trigger `pull_request`, P18) |
| a pull request or a push to `main` that changes only `.md` files (docs, README, the analysis, a changeset) | the full workflows | lint runs; unit tests, build and harness are skipped, which GitHub reports as success; the gate `build` passes, so the pull request can merge, and on `main` `CI` succeeds and starts Publish, which keeps the Version Packages pull request current for a changeset-only merge (P19) |
| a change to `.md` files plus any other file | the full workflows | everything runs |
| a job inside the gate fails or is cancelled | n/a (no gate) | the gate `build` fails, and with it the required check (P19) |
| the required status check of `main` | `build`, satisfied by `main.yaml`'s `build` job on every branch push (P19) | `build`, satisfied by the gate job of `pr.yaml` on pull requests and of `main.yaml` on `main`; no change to the branch protection settings |
| the published tarball | built by `publish.yaml` | still built by `publish.yaml` from the tested commit, not taken from CI; left for after 3.0.0 (out of scope above) |

### 1.4 2.1.0 and 3.0.0 side by side

| aspect | 2.1.0 (and HEAD) | 3.0.0 |
| --- | --- | --- |
| licence | `"Apache 2.0"`, [package.json:16](../package.json#L16) | `"Apache-2.0"` (7.1) |
| `repository.url` | `https://github.com/DyHex/POMWright`; npm 11 auto-corrects it on publish and warns (P2) | `git+https://github.com/DyHex/POMWright.git` (7.1) |
| entry points | `main`, `module`, `types`, [L17-19](../package.json#L17-L19); dual tsup build, `index.mjs` and `index.d.mts` never selected by Node or TypeScript (P3a, P3b) | `exports` with `import` and `require`, each with `types`; one CommonJS build; `index.mjs` and `index.d.mts` are re-export entries written by the build (7.2) |
| deep imports | allowed | blocked, except `pomwright/package.json` (7.2) |
| `engines` | none | `node: ">=20"` (7.3) |
| `sideEffects` | none | none (7.4) |
| `@playwright/test` at the root | auto-installed peer, [pnpm-lock.yaml:10-13](../pnpm-lock.yaml#L10-L13) | `devDependencies: "1.64.0"` (7.5) |
| floor and latest in CI | the harness pin (1.64.0) only, chromium only | the pin and the latest 1.x, each on all three browsers, both gating (7.6) |
| harness install | `file:` tarball, `--no-frozen-lockfile`, [pack-test.sh:18](../pack-test.sh#L18) | `file:` directory, frozen (7.7) |
| sudo | [pack-test.sh:19](../pack-test.sh#L19), [test/package.json:8](../test/package.json#L8) | none locally (7.8) |
| browsers | [pack-test.sh:20](../pack-test.sh#L20) chromium | three projects (7.9) |
| workflows | [main.yaml](../.github/workflows/main.yaml) (`CI`) on every push, [test.yaml](../.github/workflows/test.yaml) on pull requests and `main` | `checks.yaml` (reusable), `pr.yaml` (pull requests), `main.yaml` (`CI`, `main` only); `test.yaml` deleted (7.10) |
| builds per run | one in `CI`, one more in the test workflow | one: every harness job tests the tarball the `package` job packed (7.10) |
| `.md`-only changes | the full workflows | lint only (7.10) |
| publish gate | `workflow_run` on `CI` (lint, unit, build), [publish.yaml:3-6](../.github/workflows/publish.yaml#L3-L6), `conclusion == 'success'` ([L16](../.github/workflows/publish.yaml#L16)) | the same trigger, with the harness inside `CI`; the job condition also requires a `push` run on `main` in this repository (7.10) |
| `tsc` | none for `test/` | `tsc --noEmit -p test` (7.11) |
| lint scope | `./src`, [package.json:29-30](../package.json#L29-L30) | the repository (7.12) |
| `retries` | `process.env.CI ? 1 : 1`, [playwright.base.ts:16](../playwright.base.ts#L16) | `process.env.CI ? 1 : 0` with `failOnFlakyTests` in CI (7.13) |
| `.npmignore` | present, no effect (P2) | deleted (7.14) |
| `src/dist` | stray local folder | deleted locally; the `exclude` that names it goes (7.15) |

---

## 2. How it works today (verified)

### 2.1 What is packed

`pnpm pack` and `npm pack --dry-run` list the same eight files with and without [.npmignore](../.npmignore): `package.json`,
`README.md`, `LICENSE`, `CHANGELOG.md` and `dist/index.{js,mjs,d.ts,d.mts}`. The `files` allowlist
([package.json:20-25](../package.json#L20-L25)) decides alone; `.npmignore` is dead (P2). A dry run in the working
tree, where the stray `src/dist` exists, packs the same eight files (P2). The published 2.1.0 manifest has the same
fields as HEAD apart from the peer range (`>=1.57.0`); no `exports`, `engines` or `sideEffects` (P2, npm registry).

`"Apache 2.0"` is rejected by the SPDX expression parser npm bundles (`spdx-expression-parse`: "Unexpected `A` at
offset 0"); `"Apache-2.0"` parses. Correction to the analysis for the record: npm 11.17.0's `npm publish --dry-run`
does not warn about the licence. It does warn about `repository.url`: "npm auto-corrected some errors in your
package.json when publishing … "repository.url" was normalized to "git+https://github.com/DyHex/POMWright.git"". And
`npm pkg fix --dry-run` rewrote `package.json` in the clone despite the flag (P2).

### 2.2 How the package resolves

P3a, each tarball installed with pnpm into a consumer project, `require.resolve`, `import.meta.resolve`, a real load
of four named exports, and identity of `PageObject` between `import` and `createRequire`:

| shape | `require` | `import` | named exports load | `import` and `require` share `PageObject` | deep import |
| --- | --- | --- | --- | --- | --- |
| v0, today | `dist/index.js` | `dist/index.js` | yes, on 20 and 24 | yes | works |
| v1, dual builds behind `exports` | `dist/index.js` | `dist/index.mjs` | yes | **no** | `ERR_PACKAGE_PATH_NOT_EXPORTED` |
| v2, `exports` to the CommonJS build only | `dist/index.js` | `dist/index.js` | yes | yes | blocked |
| v3, CommonJS build plus `export * from "./index.js"` as `index.mjs` | `dist/index.js` | `dist/index.mjs` | yes | yes | blocked |
| v4, CommonJS build plus a re-export `index.mjs` and an `index.d.mts` | `dist/index.js` | `dist/index.mjs` | yes | yes | blocked |

The first v4 tarball's `index.mjs` was `export * from "./index.js"`; the named entry that the build writes (P3d) was
first checked on its own (keys and identity on Node 20 and 24) and then, in P17, packed as the real v4 and run
through every probe of this section and of 2.3, with the same results: attw "No problems found", all four TypeScript
modes clean, the runner passing in CommonJS and ESM projects on Node 20 and 24.

On Node 18 every load of v0 to v2 ended in Playwright's "Please update your version of Node.js" before POMWright ran
(P4; the Node 18 output of v3 and v4 was not inspected, and Playwright's check runs before any POMWright code).
`pomwright/package.json` resolves in every shape (an explicit `./package.json` subpath in v1 to v4). The ESM
namespace of v3 contains an extra `module.exports` key on Node 24 (Node exposes it for CommonJS modules; absent on
20); v4's named entry exports exactly the seven runtime names of the CommonJS build on both (P3a).

P3b, TypeScript 5.9.3, `strict`, a `.cts` and an `.mts` file (or one `.ts` for `node10` and `bundler`), each with a
consumed `@ts-expect-error` on an unregistered path:

| shape | `node10` | `node16`/`nodenext` from CommonJS | from ESM | `bundler` | errors |
| --- | --- | --- | --- | --- | --- |
| v0 | `index.d.ts` | `index.d.ts` | `index.d.ts` | `index.d.ts` | none |
| v1 | `index.d.ts` | `index.d.ts` | `index.d.mts` | `index.d.mts` | none |
| v2, v3 | `index.d.ts` | `index.d.ts` | `index.d.ts` | `index.d.ts` | none |
| v4 | `index.d.ts` | `index.d.ts` | `index.d.mts` (re-exports `index.d.ts`) | `index.d.mts` | none |

P3c, attw: v0, v1, v2 and v4 "No problems found"; v3 "Masquerading as CJS" from ESM (CommonJS types for an ESM
entry). `@playwright/test` 1.64.0 itself reports "Masquerading as CJS" from ESM and "Incorrect default export" under
`node10` and `node16` from CommonJS: its entry is `export * from 'playwright/test'` in `index.mjs` over
`module.exports = require('playwright/test')`, and `playwright/test.mjs` re-exports the CommonJS build by name
(`import playwright from './test.js'; export const test = playwright.test; …`), with one `types` for both.

So today's package is consistent: Node loads the CommonJS build for both `require` and `import`, TypeScript reads
CommonJS types for both, and attw finds nothing. The analysis's "`index.d.mts` is emitted but never selected" is
true; the cost is dead weight (the `.mjs` and `.d.mts`, 158 KB unpacked), not a wrong resolution. What an `exports`
map adds is the closed public surface and an entry per condition.

P3d, the build step of v4: `tsup index.ts --format cjs --dts` followed by a script that loads the built
`dist/index.js` with `createRequire`, sorts its keys and writes

```js
// dist/index.mjs
import pomwright from "./index.js";

export const { PageObject, PlaywrightReportLogger, SessionStorage, createRegistryWithAccessors, json, step, test } = pomwright;
```

and `export * from "./index.js";` as `dist/index.d.mts`. Two runs wrote byte-identical files, and `dist/index.js` and
`dist/index.d.ts` from the CommonJS-only build are byte-identical to today's dual build's (P3d).

### 2.3 The runner as a consumer

P5a, a spec with a `PageObject` subclass (a constructor argument in `defineLocators()`), `navigation.goto()` against
a routed `http://app.example`, session storage `set`/`get`, `getNestedLocator` against DOM, `instanceof
PageObject`, and the `log` fixture, run by Playwright 1.64.0's CLI:

| project | shape | Node 24.19.0 | Node 20.20.2 | file loaded (marker in the installed copy) |
| --- | --- | --- | --- | --- |
| CommonJS | v0 | passed | passed | `index.js` |
| `"type": "module"` | v0 | passed | passed | `index.js` |
| CommonJS | v1 | passed | passed | `index.js` |
| `"type": "module"` | v1 | passed | passed | `index.mjs` |
| CommonJS | v4 | passed | passed | `index.js` |
| `"type": "module"` | v4 | passed | passed | `index.mjs`, which loads `index.js` |

P5b, one ESM spec that imports pomwright and also `createRequire(import.meta.url)("pomwright")`: v0 and v4 give the
same `PageObject` and the same `test`; v1 gives two of each. A second copy means a second `PageObject` class
(`instanceof` fails across them) and a second module-level state, such as the per-page seed registry of
[sessionStorageSeed.ts](../src/helpers/sessionStorageSeed.ts).

P5c, a `.mts` spec in a CommonJS project (Playwright's default `testMatch` includes `.mts`): the runner loads it as
ESM and its `import` resolves the `import` condition (v4: the namespace of the re-export entry; v0: the CommonJS
namespace, with `default`), while `createRequire` in the same spec returns the same `PageObject`. The harness can
therefore test the ESM entry without becoming an ESM project.

P17, the named entry as the build writes it, in CommonJS and `"type": "module"` runner projects on Node 20.20.2 and
24.19.0: the P5a spec passes, the runner loads `index.mjs` and then `index.js`, and a `.mts` spec passes each
assertion planned for `esmEntry.spec.mts` (5.2): the ESM namespace has exactly the CommonJS build's keys, `PageObject`
and `test` are the same objects through `import` and `createRequire`, resolving `pomwright/dist/index.js` throws
`ERR_PACKAGE_PATH_NOT_EXPORTED`, and `pomwright/package.json` has `engines.node` `>=20` and `license` `Apache-2.0`.
`tsc -p test` includes a `.mts` spec and reports a type error in it (P17).

### 2.4 The Node floor

The runtime source uses nothing newer than ES2022: ECMAScript `#private` members and `Error` `cause`
([pageObject.ts:85](../src/pageObject.ts#L85), [L184](../src/pageObject.ts#L184)), `Object.hasOwn`
([sessionStorage.ts:91](../src/helpers/sessionStorage.ts#L91)), plus `queueMicrotask`
([pageObject.ts:152](../src/pageObject.ts#L152)) and `Buffer`
([playwrightReportLogger.ts:192](../src/helpers/playwrightReportLogger.ts#L192)); no `node:` imports, no ES2023+
array or `Promise` statics, no `URL.canParse` (P4, a grep over `src` without tests). The build targets `es2022`
([tsconfig.json:6](../tsconfig.json#L6)).

Playwright 1.64.0 declares `engines: { node: ">=20" }` in `@playwright/test`, `playwright` and `playwright-core`, and
enforces it: `playwright-core/lib/bootstrap.js:24-34` prints "Playwright requires Node.js 20 or higher" and exits on
a lower major, at import (P4). The floor for a POMWright consumer is therefore Playwright's: Node 20. Verified on
20.20.2: P3a, P5a, and the whole harness on chromium (P6d, 370 passed).

The dev toolchain needs more: `vitest` 5.0.3 declares `^22.12.0 || ^24.0.0 || >=26.0.0`, `vite` 8.3.3 and
`rolldown` `^20.19.0 || >=22.12.0`, `tsup` and `esbuild` `>=18` ([pnpm-lock.yaml](../pnpm-lock.yaml)). Contributors
and CI use Node 24 (AGENTS.md section 3, [main.yaml:17](../.github/workflows/main.yaml#L17)); `engines` describes
consumers, not contributors.

npm 10.8.2 on Node 18 installing v4 and `@playwright/test` 1.64.0: `npm warn EBADENGINE` for pomwright,
`@playwright/test`, `playwright` and `playwright-core`; the install succeeds (exit 0) (P4).

### 2.5 `@playwright/test` at the root

The root lockfile lists `@playwright/test` 1.64.0 under the importer's `dependencies`, with the peer range as its
specifier ([pnpm-lock.yaml:10-13](../pnpm-lock.yaml#L10-L13)): pnpm's `autoInstallPeers`. The build, the
declarations and the unit tests compile against whatever that resolves to; a lockfile regeneration takes the latest
1.x. Plan 1.6-1.8 met the risk at execution: Playwright 1.64 made `page.frameLocator`'s selector optional and a type
derived from it broke the build on the floor bump alone ([DECISIONS.md](DECISIONS.md), 2026-10-13). P14: `pnpm add -D
-E @playwright/test@1.64.0` moves the entry from `dependencies` to `devDependencies` (3 insertions and 4 deletions in the
lockfile, one line in `package.json`), a frozen install passes, `pnpm build` passes and the 262 unit tests pass with no
type errors.

The harness pins 1.64.0 ([test/package.json:12](../test/package.json#L12)), which is the floor and, on 2026-10-14,
npm's `latest` (`next` is a 1.65.0 alpha) (P1, npm registry). A floor job and a latest job would run the same
version today.

### 2.6 The harness install

[pack-build.sh](../pack-build.sh) installs the root, builds and packs into `pomwright-test-build.tgz`.
[pack-test.sh](../pack-test.sh) then runs `pnpm install --no-frozen-lockfile` in `test/` (L18),
`pnpm playwright install --with-deps` (L19) and the chromium project (L20). `test/package.json` depends on
`file:../pomwright-test-build.tgz` (L16) and has the postinstall `npx -y only-allow pnpm && npx playwright
install-deps` (L8). [test/pnpm-lock.yaml:263-267](../test/pnpm-lock.yaml#L263-L267) records the tarball's `sha512`.

P9a, in a fresh clone:

| step | result |
| --- | --- |
| `pnpm pack` twice, same content | byte-identical tarballs; HEAD's tarball hash equals the one committed in `test/pnpm-lock.yaml` |
| frozen install of `test/`, no tarball | `ENOENT … pomwright-test-build.tgz`, exit 254 |
| frozen install, tarball identical to the locked one | passes |
| frozen install, content changed (one byte in README), `node_modules` present | exit 0, "Already up to date"; the installed README is the old one: silently stale |
| the same with an empty `node_modules`, with and without `--force` | `ERR_PNPM_TARBALL_INTEGRITY … Wanted "sha512-umLN…" Got "sha512-05jZ…"`, exit 1 |

Correction to the analysis for the record: the hash does not change with "every fresh pack"; `pnpm pack` is
deterministic, and the hash changes whenever the packed content does (any change to `dist`, the README, the
CHANGELOG or `package.json`, so in practice every source change). The consequences are as the analysis says: CI
cannot use a frozen install, locally a plain install tests a stale build, and every harness commit carries a
lockfile hash change (six commits on this branch touched `test/pnpm-lock.yaml`).

P9b, `test/package.json` depending on `file:../.pack/pomwright`, a directory holding the extracted tarball. The
lockfile records `resolution: {directory: ../.pack/pomwright, type: directory}`, no hash. pnpm installs a copy (not a
symlink) under `test/node_modules/.pnpm/pomwright@file+..+.pack+pomwright_@playwright+test@1.64.0/`, whose
`@playwright/test` resolves to the harness's own copy, so the "Requiring @playwright/test second time" trap of a
symlinked package cannot occur.

| step | result |
| --- | --- |
| frozen install, empty `node_modules` | passes |
| content changed, `node_modules` present, frozen | the installed copy is refreshed |
| changed back | refreshed again |
| `version: "3.0.0"` and a peer range `>=1.65.0` in the extracted `package.json`, frozen, with and without `node_modules` | passes; the installed copy reports 3.0.0 |
| a file added to `dist/`, installed, then removed | removed from the installed copy |
| `.pack/pomwright` missing | `ENOENT … scandir '…/.pack/pomwright'`, exit 254 |

P9c: `sudo -n true` reports "a password is required" on this machine. `playwright install-deps` (1.64.0,
`coreBundle.js`) always runs `apt-get update` and `apt-get install` through sudo unless the user is root, even when
nothing is missing; `--dry-run` runs `apt-get install -s` without sudo, prints "All system dependencies are
installed." or the missing list, and exits 1 when something is missing. `playwright install --dry-run` lists the
browser directories and needs no sudo; the 1.64 builds (chromium 1248, firefox 1555, webkit 2370) are installed here.

### 2.7 Browsers

P6, the packed HEAD tarball in a clone, the harness on Playwright 1.64.0, 32 cores (16 workers) unless stated:

| run | chromium | firefox | webkit |
| --- | --- | --- | --- |
| (a) `--retries=0` | 370 passed, 7.3 s | 370 passed, 21.7 s | 370 passed, 53.1 s |
| (b) `--retries=0 --repeat-each=3` | 1110 passed, 18.5 s | 1110 passed, 1.2 min | 1110 passed, 2.6 min |
| (c) `--retries=0 --workers=2`, `CI=1` | 370 passed, 24.4 s | 370 passed, 1.1 min | 370 passed, 1.4 min |
| (d) Node 20.20.2, `--retries=0` | 370 passed, 7.9 s | | |

No test is flaky or browser-specific today. GitHub's runner speed was not measured; the current chromium job's
"Run test script" step takes 110 s, which includes the root install, the build, the `test/` install and the
download of all three browsers with their system packages (P1).

P16, added in review: the v2.1.0 tag's own harness, with the published `pomwright@2.1.0` tarball (`npm pack`) and
`@playwright/test` 1.64.0 added with `--ignore-scripts`, `--retries=0`. Chromium and firefox: 220 passed, 3 failed;
webkit: 219 passed, 4 failed. The three common failures are the `filter({ visible: true })` string assertions in
`add.filter`, `createReusable.filter` and `getLocatorSchema.filter` (expected `…filter({ visible: true })…`, received
`….visible()…`), identical on all three browsers: `locator.toString()` is synchronous and rendered by Playwright's
Node side, so it depends on the Playwright version, not the browser. The fourth, webkit only, is 2.1's
`sessionStorage set with waitForContext` spec, an API 3.0.0 removes (plan 1.5). The current harness has at least 70
rendered-string assertions (`${locator.describe("")}` and similar) in 18 spec files; it already handles one real
browser difference with the `browserName` fixture
([sessionStorage.spec.ts:506-521](../test/tests/testApp/sessionStorage.spec.ts#L506-L521)).

### 2.8 Workflows

- [main.yaml](../.github/workflows/main.yaml) (`name: CI`): every push; frozen install, lint, unit tests, build.
- [test.yaml](../.github/workflows/test.yaml): push to `main` and pull requests; `pnpm pack-test` with
  `continue-on-error`, a report upload on failure, then a step that fails the job.
- [publish.yaml](../.github/workflows/publish.yaml): `workflow_run` of `CI` on `main`, `completed`, runs when its
  conclusion is `success`; changesets' action opens the "Version Packages" PR or publishes.

P1: on 2026-02-26 the "Version Packages" merge b5cf085 ran CI (success, 13:22:34 to 13:22:58) and the test workflow
(failure, 13:22:34 to 13:22:57); Publish started at 13:23:00 and npm records `pomwright@1.5.1` at 13:23:22. A release
went out with a red suite on `main`. On 2026-06-18 the tests for d549295 were cancelled and Publish ran.

GitHub's documentation for `workflow_run` (P1): "If you specify multiple `workflows` for the `workflow_run` event,
only one of the workflows needs to run"; chains are limited to three levels; the triggered workflow must exist on
the default branch; `branches` filters the branch the triggering workflow ran on. Listing both workflows in
`publish.yaml` would therefore publish after whichever finishes first, not after both.

P15: actionlint reports one finding: [test.yaml:37](../.github/workflows/test.yaml#L37) interpolates
`github.head_ref` (a branch name chosen by whoever opens the pull request) directly into a shell script, a script
injection pattern.

P18, for the workflow layout of 3.6:

- The Version Packages branch `changeset-release/main` has one workflow run in its history: a `pull_request` run of
  the test workflow on 2026-08-03 whose actor is `github-actions[bot]` and whose triggering actor is the maintainer.
  The bot's pushes started no run. GitHub's `GITHUB_TOKEN` documentation: "events triggered by the `GITHUB_TOKEN` will
  not create a new workflow run", except that `pull_request` events with the `opened`, `synchronize` or `reopened`
  types "create workflow runs in an approval-required state".
- This branch's pull request, #46, has been a draft since it was opened, and the test workflow has run on its
  `pull_request` events since 2026-10-06: draft pull requests trigger the default `pull_request` types (`opened`,
  `synchronize`, `reopened`).
- A `pull_request` run's `head_branch` is the pull request's head branch (this branch's runs show
  `chore/bugfixes-quality-improvements-and-docs`), and `workflow_run`'s `branches` filter matches the branch the
  triggering workflow ran on. A workflow that `publish.yaml` listens to must therefore never run on pull requests, or a
  fork's branch named `main` could start Publish. The run objects carry `event`, `head_branch` and `head_repository`.
- Reusable workflows (GitHub's documentation): called with `uses:` at job level, files in `.github/workflows` without
  subdirectories, a matrix job can call one, at most ten levels, and "the `github` context is always associated with
  the caller workflow". The documentation does not state that a failing job of a called workflow fails the caller's
  run; the plan verifies it on the first push (3.6).

P19, for skipping work on `.md`-only changes:

- `main` is protected; its required status check is `build` from GitHub Actions, enforced for non-admins
  (`GET /repos/DyHex/POMWright/branches/main`). It is the `build` job of [main.yaml](../.github/workflows/main.yaml),
  which today also runs on every branch push and so reports `build` on pull-request commits. A layout in which
  `main.yaml` runs only on `main` must report `build` from the pull-request workflow, or every pull request is blocked
  for non-admins.
- Path filters on a trigger (`paths`, `paths-ignore`): when a workflow is skipped by them, its checks "will remain in
  a "Pending" state", and "A pull request that requires those checks to be successful will be blocked from merging".
  A skipped `main` workflow would also not start Publish, so a merge that only adds a changeset (a `.changeset/*.md`
  file) would not refresh the Version Packages pull request.
- Job conditions: "A job that is skipped will report its status as "Success". It will not prevent a pull request
  from merging, even if it is a required check."
- Biome 2.5.6 does not process Markdown: `biome check README.md docs/v3/overview.md` reports "No files were processed
  … These paths were provided but ignored". Lint on an `.md`-only change checks the unchanged code, not the
  Markdown.
- Each harness job of the first draft would have built its own package: `pack-test.sh` calls `pack-build.sh`, which
  installs, builds and packs ([pack-build.sh:17-20](../pack-build.sh#L17-L20)), so one run would have built seven
  times and tested six builds, none of them the one the checks job built.

### 2.9 Type checking

There is no `tsc` run outside vitest's typecheck mode, which covers `src` ([vitest.config.ts](../vitest.config.ts),
[tsconfig.vitest.json](../tsconfig.vitest.json)); `pnpm build` type-checks `index.ts` and what it imports through
the declaration build. P7, `tsc --noEmit -p test` (TypeScript 5.9.3) in a clone with the harness installed:

- 1.4 s; it covers the 47 specs, the page objects, the fixtures, `playwright.config.ts`, the root
  `playwright.base.ts`, the eight `src/locators` files the source-level specs import, the typecheck probe file, and
  the installed `pomwright/dist/index.d.ts`.
- 4 errors, all `TS7006` (implicit `any`) in `test/server.js` (L328 `escapeHtml`'s `value`, L334 `renderStoragePage`'s
  `req` and `res`, L440 `isFixtureUrl`'s `value`). The file is checked because `test/tsconfig.json` extends the root,
  which sets `allowJs` and `checkJs` ([tsconfig.json:8-9](../tsconfig.json#L8-L9)).
- No error in [validation.locatorSchemaPath.typecheck.ts](../test/tests/locatorRegistry/validation/validation.locatorSchemaPath.typecheck.ts):
  all 31 of its `@ts-expect-error` directives are consumed. A directive appended above a valid call is reported as
  `TS2578: Unused '@ts-expect-error' directive`, so the step enforces the file.

### 2.10 Lint

Biome resolves to 2.5.6 under `"^2.2.4"` ([package.json:56](../package.json#L56)). P8:

| scope | result |
| --- | --- |
| `./src` (today's `pnpm lint`) | 24 files, clean |
| `index.ts`, `playwright.base.ts`, `vitest.config.ts` | clean |
| `./test` | 49 errors, 6 warnings: 36 in `test/test-data/staticPage/index.html` (the third-party W3 template; 13 `useValidAnchor`, 7 `useAltText`, 7 `useButtonType` and other a11y rules); 19 in code: 14 formatting (13 specs and page objects, `server.js`), 1 import order (`testApp.fixtures.ts`), 1 unused import (`getLocatorSchema.nth.spec.ts`), 1 `useOptionalChain` (`add.get.clone.spec.ts`), 2 unused parameters (`server.js`) |
| `.` | the above, plus formatting of `tsconfig.json` and `.vscode/playwright-snippets.code-snippets`, plus two infos on [biome.json](../biome.json): the schema version 2.2.4 does not match the CLI, and `"recommended": true` is deprecated in favour of `"preset"`; `biome migrate --write` changes exactly those two lines |

### 2.11 `playwright.base.ts`

[L16](../playwright.base.ts#L16) `retries: process.env.CI ? 1 : 1`; [L33](../playwright.base.ts#L33) `video:
"retry-with-video"`, a deprecated alias that Playwright 1.64 maps to `"on-first-retry"`
(`playwright/lib/index.js:492-493`; the type lists it as `/** deprecated */`); [L39](../playwright.base.ts#L39)
`trace: "on-all-retries"`. With one retry, traces and videos exist only for retried tests; with no retry, none.
Playwright 1.64's `TestConfig.failOnFlakyTests` ("Whether to exit with an error if any tests are marked as flaky.
Useful on CI.") exists (P11).

### 2.12 The `CHANGELOG.md` note

[CHANGELOG.md:26](../CHANGELOG.md#L26), in the 2.0.0 entry, says the v1 scripts `pack-test.sh` and `vitest` were
removed. P12: 795e948 (PR #42, whose changeset this is) deleted v1's `pack-test.sh` and `vitest.config.ts`; 8a9a1f7,
in the same release, renamed `pack-test-v2.sh` to `pack-test.sh`; both commits are in `v2.0.0`. The line is accurate
for its commit and misleading for the release; `vitest.config.ts` came back with plan 1.1-1.2 (e709d0c).

### 2.13 Survey

P13: one 2.1.0 consumer project and four more `package.json` files found beside it that depend on pomwright 2.1.0:
141 files import `"pomwright"`, none a deep path and none with `require`; three of the five are `"type": "module"`;
the two that declare `engines` require Node 24; the `tsconfig` files that set them use `module: ESNext` with
`moduleResolution: Bundler`. Nothing there breaks under the decided `exports` map or `engines`; the three ESM
packages would load `index.mjs`, which re-exports the same build.

### 2.14 What is sound

The pack-then-install harness (analysis section 7); the `files` allowlist; the frozen root install in every
workflow; the changesets flow; vitest's typecheck mode for `src`; the declaration build as a type check of the
entry; the shared `playwright.base.ts`; the three browser projects already defined in
[test/playwright.config.ts](../test/playwright.config.ts).

---

## 3. Design

### 3.1 The package shape

| option | Node `import` | `import`/`require` share state | deep imports | attw | cost |
| --- | --- | --- | --- | --- | --- |
| A. no `exports` (today) | the CommonJS build | yes | open | clean | the `.mjs` and `.d.mts` are dead weight; the public surface is only a convention |
| B. `exports` to the CommonJS build only (v2) | the CommonJS build, through Node's interop | yes | closed | clean | an ESM importer depends on Node's CommonJS export detection (works today, P3a) |
| C. `exports` over the two tsup builds (v1) | `index.mjs`, a second copy | **no** (P5b) | closed | clean | two copies of every class and every module-level state in a process that reaches both |
| **D. one CommonJS build, plus a named ESM entry and an `index.d.mts` that re-export it (v4)** (chosen, 7.2) | `index.mjs`, which imports `index.js` | yes (P5b) | closed | clean (P3c) | a short build script; Playwright's own layout |

Chosen: D. It is what `@playwright/test` does (2.2), it keeps one implementation per process, an ESM
importer gets an ESM entry and ESM types, and the CommonJS file and its declarations are byte-identical to today's
(P3d). The entry is generated from the built CommonJS module's keys, so it cannot drift from `index.ts`, and the
harness asserts the parity (5.2). B was the fallback had the build step been unwanted: clean and simpler, it leaves
ESM importers on Node's CommonJS interop as today.

The manifest of 1.1: `main` and `types` stay for `node10` resolution and older tools; `module` goes (there is no
second build); `"./package.json"` is exported because tools read it; no `"type"` field (the package stays
CommonJS); `files` unchanged.

### 3.2 `engines` and `sideEffects`

`engines: { node: ">=20" }`, Playwright 1.64's own value and runtime check (2.4). A narrower `>=20.19` or `>=22`
would claim a need the build does not have. Whenever the peer floor moves, the Node floor is re-read from the new
Playwright's `engines` (a line in AGENTS.md).

`sideEffects` stays absent: the build is one file, and esbuild's result was identical with and without the flag
(P10); nothing in a Playwright project bundles POMWright for a browser. Adding it would be a claim nothing tests.

### 3.3 `@playwright/test` at the root and the version matrix

Declared as `devDependencies: { "@playwright/test": "1.64.0" }`, exact, equal to the peer floor and the harness pin.
The build, the declarations, vitest and `tsc` then compile against the floor, and a lockfile regeneration cannot move
it. One rule in AGENTS.md: the peer floor, the root dev pin and the harness pin move together, and moving them is a
decision. Rejected: `^1.64.0` (the declarations would be built against whatever is newest); leaving it to
`autoInstallPeers` (today).

The matrix:

| job | Playwright | browsers | role |
| --- | --- | --- | --- |
| harness at the pin | 1.64.0, from `test/pnpm-lock.yaml` | chromium, firefox, webkit | the floor; gating |
| harness at the latest 1.x (decided, 7.6) | the newest version in `>=1.64.0 <2.0.0`, passed to `pack-test.sh` as `PLAYWRIGHT_VERSION`, which adds it to `test/` after the frozen install: a deliberate unfrozen install of one package (3.4) | chromium, firefox, webkit | the ceiling the peer range promises; gating |

Each latest job first resolves the newest version in the range with `npm view "@playwright/test@>=1.64.0 <2.0.0"
version --json`, which returns a string for one match and an array (ascending) for several, so the step takes the
last element of an array (P17); when it equals the pin (today: 1.64.0, 2.5) the job ends green without running the
suite a second time. From the first 1.x after the pin on, it runs the full suite on
its browser, and a failure fails `CI` and so blocks publishing until POMWright or the spec is adapted, before a
consumer on a fresh install finds out. Accepted cost: a Playwright release alone can turn every run red, including
for differences a consumer never sees. P16 shows the kind: three string assertions that 1.64 renders as `.visible()`.
Rejected: no latest job (a break surfaces only when someone bumps the pin); a latest job that does not gate; latest
on chromium only.

How a difference is handled when the latest jobs find one: a rendered-string difference depends on the Playwright
version, not the browser (P16), so the failing spec is fixed then, preferably with an assertion against the DOM, and
otherwise with an updated or version-aware expectation; a real behaviour difference between browsers on one version
uses the `browserName` fixture, as the session-storage spec does. The existing string assertions are not converted
ahead of time (out of scope above); new specs prefer DOM assertions (AGENTS.md section 4, 4.7).

### 3.4 The harness

`pack-build.sh` packs as today and extracts the tarball into `.pack/pomwright` (removed first, gitignored).
`test/package.json` depends on `"pomwright": "file:../.pack/pomwright"`; `test/pnpm-lock.yaml` is regenerated once and
then changes only when the fixture's own dependencies do. The postinstall goes (7.8).

```sh
# pack-test.sh (shape; names settled at execution)
if [[ -n "${POMWRIGHT_TARBALL:-}" ]]; then                    # CI's harness jobs: the tarball the package job packed
  pnpm -C "$SCRIPT_DIR" install --frozen-lockfile             # root install, for tsc only; no build
  extract "$POMWRIGHT_TARBALL" into .pack/pomwright
else
  "$SCRIPT_DIR/pack-build.sh"                                 # install root (frozen), build, pack, extract
fi
pnpm -C "$TEST_DIR" install --frozen-lockfile                 # the fixture plus the extracted package
if [[ -n "${PLAYWRIGHT_VERSION:-}" ]]; then                   # CI's latest jobs only: one version everywhere
  pnpm -C "$SCRIPT_DIR" add -D -E "@playwright/test@$PLAYWRIGHT_VERSION"   # root: src and playwright.base.ts types
  pnpm -C "$TEST_DIR" add -D -E "@playwright/test@$PLAYWRIGHT_VERSION"     # test/: the runner, specs, pomwright's peer
fi
pnpm -C "$SCRIPT_DIR" exec tsc --noEmit -p test               # the specs against the published declarations
pnpm -C "$TEST_DIR" exec playwright install ${PLAYWRIGHT_INSTALL_ARGS:-}   # browsers; CI adds --with-deps <browser>
pnpm -C "$TEST_DIR" exec playwright test "$@"                 # every project unless --project is passed
```

The version switch comes before the type check and the browser download, because each Playwright version brings its
own declarations and browser builds. P17: `pnpm add -D @playwright/test@1.63.0` over the frozen install moved both the
harness's Playwright and the peer that the installed pomwright resolves to 1.63.0. It swaps the root as well, because
`tsc -p test` also compiles files that resolve Playwright from the root: the eight `src/locators` files the
source-level specs import, and `playwright.base.ts`. P20: with `test/` on 1.63.0 and the root on 1.64.0, `tsc -p
test` reported 40 errors, every one the two versions' types meeting (`…playwright-core@1.63.0…Page` is not assignable
to `…playwright-core@1.64.0…Page`, the config's `defineConfig` overloads); with both on 1.63.0 it reported none. With
both swapped, the latest row also shows that `src` compiles against the new Playwright's types. The tarball under test
is unaffected: the `package` job built it at the pin. The switch rewrites both `package.json` files and both
lockfiles, which is why it is for CI, where the checkout is discarded; locally it leaves all four modified. The rule
that the peer floor, the root dev pin and the harness pin move together holds for what is committed; the latest row
moves the two pins only inside its own checkout.

`POMWRIGHT_TARBALL` lets every CI harness job test the one tarball the `package` job built (3.6): the script installs
the root dependencies (frozen; `tsc` lives there), extracts the tarball and goes on as usual, so a harness job is
"download the artifact, run `pack-test.sh`". Without it, as locally, the script builds and packs itself.

Root scripts: `pack-test` (the above, arguments passed through), `harness:install` (`pack-build.sh` plus the frozen
install, for `typecheck` or a single spec run without the browser step), `typecheck` (`tsc --noEmit -p test`).
`test` stays `pnpm test:unit && pnpm pack-test`. Rejected harness designs:

| design | why not |
| --- | --- |
| keep the `file:` tarball and `pnpm add` | the lockfile changes with every content change, CI cannot be frozen, a plain install is stale (P9a) |
| no pomwright in `test/package.json`, `pnpm add` at run time | rewrites `test/package.json` and the lockfile on every run; the tree is dirty after each local run |
| extract into `test/node_modules/pomwright` by hand | bypasses the package manager, so peer resolution and `exports` are not tested the way a consumer installs |
| `link:` to the extracted directory | a symlink: the package resolves `@playwright/test` from its real path, outside `test/`, the double-load trap of AGENTS.md section 3 |
| a temporary consumer project per run | a copy of `test/` with its aliases per run, slower, harder to debug, and the same result as the directory dependency |

### 3.5 Sudo and the postinstall

The harness postinstall `npx -y only-allow pnpm && npx playwright install-deps` goes entirely: `install-deps` always
asks for sudo (P9c), and `only-allow` downloads a package on every install and, as a postinstall, runs after npm has
already installed. The root `packageManager` field names pnpm and the scripts are the entry point. Locally, system
libraries are a once-per-machine step (`pnpm -C test exec playwright install-deps`, with sudo, or the distribution's
packages); AGENTS.md says so, with `install-deps --dry-run` as the no-sudo check. Alternative: keep `only-allow` as a
`preinstall` (the hook that runs before installing), at the price of a network call per install.

### 3.6 CI

Three workflows share the jobs, and `publish.yaml` keeps its trigger:

| file | `name:` | trigger | what it runs |
| --- | --- | --- | --- |
| `checks.yaml` (new) | `Checks` | `workflow_call` only | the jobs below; never triggered on its own |
| `pr.yaml` (new) | `PR` | `pull_request` with the default types (`opened`, `synchronize`, `reopened`): every pull request, draft or not, from this repository or a fork | `uses: ./.github/workflows/checks.yaml`, then the gate job `build` |
| [main.yaml](../.github/workflows/main.yaml) | `CI` (unchanged) | `push` to `main` only | the same: `checks.yaml`, then the gate job `build` |
| [publish.yaml](../.github/workflows/publish.yaml) | `Publish` | `workflow_run` of `CI` on `main`, `completed` (unchanged) | changesets' action, when the guard below holds |
| [test.yaml](../.github/workflows/test.yaml) | | | deleted |

```yaml
# checks.yaml (shape; names settled at execution)
on:
  workflow_call:
jobs:
  changes:                            # did anything other than *.md change? (the pull request's base, or the push's
                                      # previous commit); output: code = true | false
  lint:                               # always: frozen install, biome check . (biome skips .md, P19)
  package:
    needs: changes
    if: needs.changes.outputs.code == 'true'
    # frozen install, unit tests, pack-build.sh (build, pack); uploads pomwright-test-build.tgz as a run artifact
  harness:
    needs: [changes, package]
    if: needs.changes.outputs.code == 'true'
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
        playwright: [pin, latest]
    # downloads the package job's tarball; pack-test with POMWRIGHT_TARBALL=<it> (no build of its own, 3.4);
    # pin: as committed; latest: resolve the newest ">=1.64.0 <2.0.0" (3.3), end green if it equals the pin,
    # otherwise PLAYWRIGHT_VERSION=<that version> (3.4);
    # PLAYWRIGHT_INSTALL_ARGS="--with-deps ${{ matrix.browser }}" and --project=${{ matrix.browser }};
    # the report uploaded on failure as playwright-report-${{ matrix.browser }}-${{ matrix.playwright }}-<run id>
```

```yaml
# pr.yaml (name: PR) and main.yaml (name: CI): the same two jobs, different triggers
jobs:
  checks:
    uses: ./.github/workflows/checks.yaml
  build:                              # the gate; its name is main's required status check (P19)
    needs: checks
    if: always()
    # fails unless needs.checks.result is 'success'
```

```yaml
# publish.yaml, the job condition
if: >-
  github.event.workflow_run.conclusion == 'success' &&
  github.event.workflow_run.event == 'push' &&
  github.event.workflow_run.head_branch == 'main' &&
  github.event.workflow_run.head_repository.full_name == github.repository
```

Why this layout:

- `publish.yaml` can only wait for workflows through `workflow_run`, and with several workflows listed it fires when
  any one of them completes (2.8): the gap that published 1.5.1 with a red suite, 3 s after `CI` succeeded (P1). So
  the harness has to be inside the one workflow Publish listens to.
- That workflow must never run on pull requests: a `workflow_run` filter on `main` matches a pull request's head
  branch, so a fork's branch named `main` could start Publish (P18). `CI` therefore runs only for pushes to `main`,
  and pull requests get the same jobs through `PR`, which Publish does not listen to.
- The guard repeats those conditions in `publish.yaml` itself, so a later change to `CI`'s triggers cannot open the
  hole again.
- The jobs live once, in `checks.yaml`; both callers stay a few lines. A pull request runs `PR`, the merge commit on
  `main` runs `CI`, and each run builds once: the `package` job builds, unit-tests and packs, and all six harness jobs
  test that tarball, downloaded as a run artifact (`actions/upload-artifact`, `actions/download-artifact`). The first
  draft would have built seven times per run and tested six builds that were not the checked one (P19).
- Lint runs on every run. When only `.md` files changed (docs, README, the analysis, a changeset), the `package` and
  `harness` jobs are skipped by their `if:`, which GitHub reports as success, so the run passes in seconds; a path
  filter on the trigger was rejected because it leaves a required check pending and blocks the merge, and on `main`
  it would also stop Publish from refreshing the Version Packages pull request after a changeset-only merge (P19).
- The required status check of `main` stays `build`: each caller has a top-level gate job of that name that needs the
  reusable workflow and fails unless it succeeded. Branch protection needs no change, and a matrix job's name never
  has to be listed in it. Rejected: a new gate name such as `ci-result` (a settings change, and pull requests blocked
  for non-admins between the merge and the change).
- A branch without a pull request gets no CI; a pull request or a draft is how CI is requested (decided in review).
  The Version Packages pull request, opened by the changesets bot, gets a `PR` run that waits for approval (P18), as
  today.
- `setup-node`'s pnpm cache gets both lockfiles as `cache-dependency-path`. Report artefacts are named by browser,
  Playwright row and run id, so no branch name reaches a script (P15).

Rejected: one `CI` workflow on every push and on pull requests (needs a rule against building pull-request branches
twice, which would also skip the Version Packages pull request, and a guard as the only protection of Publish);
chaining `CI` → tests → Publish through `workflow_run` (such a run gets `GITHUB_SHA` "Last commit on default branch"
and `GITHUB_REF` "Default branch", so branches and pull requests would not get a harness run of their own); the jobs
written out in both callers (two copies to keep identical); a publish job inside `CI` (it would put `contents: write`
and the npm token next to the test jobs). Not in this plan: npm provenance or trusted publishing.

Verification is partly external. Locally: actionlint on the four files (a scratchpad binary, as in P15) and every
job's commands, including the `changes` decision for an `.md`-only and a mixed diff, `POMWRIGHT_TARBALL`, and the
latest row's resolve-and-skip step. On GitHub, on the first push of the branch, which the user makes: `PR` runs on
this branch's pull request and reports `build`. The documentation does not state how a called workflow's failing or
skipped jobs reach the caller's `needs.checks.result` (P18), so two scratch pull requests show it: one with a
deliberately failing commit (the gate `build` must fail), one changing only an `.md` file (lint runs, `package` and
`harness` are skipped, `build` passes). If the result does not propagate, the jobs are written out in both callers
instead of `checks.yaml`. `CI` and Publish first run on the merge to `main`.

### 3.7 `tsc`

`pnpm typecheck` runs `tsc --noEmit -p test` against the installed package, so the specs and the typecheck probe file
are checked against the published declarations, `index.d.mts` included (the harness's `moduleResolution: Bundler`
selects it for `import`, P3b). The four `TS7006` in `server.js` are fixed with JSDoc parameter types
(`/** @param {unknown} value */`, `/** @param {import("express").Request} req … */`). Alternative: `checkJs: false`
in `test/tsconfig.json`, which stops checking the server.

### 3.8 Lint scope

`"lint": "biome check ."` and `"format": "biome format --write ."`. `biome.json` excludes `**/test/test-data` (a
third-party template, not ours to fix) and `**/.pack`; `biome migrate --write` updates the schema and `preset`, and the
specifier becomes `^2.5.6`, the version the lockfile already resolves. The 19 code findings in `test/` and the two
formatting findings at the root are fixed in the same step (14 by the formatter, the rest by hand: one import order,
one unused import, one optional chain, two unused parameters). AGENTS.md's note that the script covers `./src` only
goes.

### 3.9 `playwright.base.ts`

```ts
retries: process.env.CI ? 1 : 0,
failOnFlakyTests: !!process.env.CI,
video: "on-first-retry",              // was the deprecated alias "retry-with-video", same behaviour
trace: "on-all-retries",              // unchanged
```

Locally a failure fails at once (rerun with `--trace on` when a trace is needed); in CI a failure is retried once to
record a trace and a video and then fails the job, flaky or not. Alternatives: `retries: 0` everywhere (no CI
artefacts for a failure); `process.env.CI ? 2 : 0`, Playwright's scaffold default (more time on a real failure, and
without `failOnFlakyTests` a flaky test passes).

### 3.10 Smaller items

- `.npmignore` deleted (P2).
- `src/dist` deleted locally (gitignored, never committed); [tsconfig.vitest.json:11](../tsconfig.vitest.json#L11)
  loses its `exclude`, and AGENTS.md its repo-map row.
- `CHANGELOG.md` is not edited (AGENTS.md section 8). The analysis bullet is ticked *Skip* with the history of 2.12;
  the 3.0.0 entry, built from the changesets and the release notes, describes the current harness. Alternative: one
  sentence in this plan's changeset under *Notes* ("the repository again has a vitest unit layer and the
  `pack-test.sh` harness, which the 2.0.0 entry lists as removed"), which puts contributor history into a consumer
  changelog.
- The unit-test bullet is ticked *Fix*: done by plan 1.1-1.2 with vitest (DECISIONS.md, 2026-10-06).
- The `stripInternal` bullet stays open for plan 7.

---

## 4. Implementation steps

### 4.1 Package

- [package.json](../package.json): `license` (L16); `repository.url` (L7); `main`, `types`, `exports`, no `module`
  (L17-19); `engines`; `build` (L27) becomes `tsup index.ts --format cjs --dts && node scripts/write-esm-entry.mjs`;
  `@playwright/test` `1.64.0` in `devDependencies`; `lint`, `format` (L29-30), `pack-test` (L31), `harness:install`,
  `typecheck`.
- New `scripts/write-esm-entry.mjs` (the prototype of P3d): reads the built CommonJS module's keys and writes
  `dist/index.mjs` and `dist/index.d.mts`; fails if `dist/index.js` exports nothing.
- `.npmignore` deleted; `pnpm-lock.yaml` updated by `pnpm add -D -E @playwright/test@1.64.0`.

### 4.2 Harness and config

- [pack-build.sh](../pack-build.sh): after the move (L25-26), extract into `.pack/pomwright`.
- [pack-test.sh](../pack-test.sh): the shape of 3.4, arguments passed through, the `POMWRIGHT_TARBALL`,
  `PLAYWRIGHT_VERSION` and `PLAYWRIGHT_INSTALL_ARGS` switches.
- [test/package.json](../test/package.json): `pomwright` (L16) to `file:../.pack/pomwright`; the postinstall (L8)
  removed; `test/pnpm-lock.yaml` regenerated with one non-frozen install.
- [.gitignore](../.gitignore): `.pack/`.
- [test/server.js](../test/server.js): JSDoc types on L328, L334, L440.
- [playwright.base.ts](../playwright.base.ts): 3.9.
- New spec, 5.2.

### 4.3 Lint

[biome.json](../biome.json): migrate, the two excludes; `@biomejs/biome` `^2.5.6`; `pnpm format`, then the hand fixes
of 3.8.

### 4.4 CI

As in 3.6: new `.github/workflows/checks.yaml` (`workflow_call`; the jobs `changes`, `lint`, `package`, `harness`)
and `.github/workflows/pr.yaml` (`pull_request`; calls it, then the gate job `build`);
[main.yaml](../.github/workflows/main.yaml) keeps `name: CI`, its trigger becomes `push` to `main`, and its jobs become
the call of `checks.yaml` and the gate job `build`, which replaces today's `build` job and keeps the required status
check; [test.yaml](../.github/workflows/test.yaml) deleted;
[publish.yaml](../.github/workflows/publish.yaml) keeps its trigger and gets the guard condition in place of
[L16](../.github/workflows/publish.yaml#L16).

### 4.5 Docs (`docs/v3` only)

[overview.md](../docs/v3/overview.md): a short *Requirements* paragraph near the top: Node 20 or later (Playwright's
own floor), `@playwright/test` 1.64 or later below 2.0, CommonJS and ESM projects, imports from the package root only.
README stays for plan 10.

### 4.6 Changeset

`.changeset/package-exports-and-engines.md`, `"pomwright": major`, under *Breaking changes*:

- The package has an `exports` map: import from `"pomwright"` only. Deep imports such as `pomwright/dist/index.js`
  fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`; `pomwright/package.json` stays available. ESM projects load an ESM entry
  that re-exports the CommonJS build, so `import` and `require` share one copy; TypeScript gets ESM declarations for
  `import`. The `module` field and the separate ESM build are gone. Migration: replace deep imports with imports from
  `"pomwright"`.
- `engines.node` is `>=20`, Playwright 1.64's own requirement; npm warns on older Node, where Playwright already
  refuses to start.

Under *Fixes*: the licence is the SPDX id `Apache-2.0`. Tooling, CI and the harness are not consumer-facing and go to
the release notes only.

### 4.7 Analysis, release notes, decisions, AGENTS.md, PLANS.md

At agreement (2026-10-14, done with this revision): [DECISIONS.md](DECISIONS.md) gets this plan's section, including
the dev dependency line (7.5); [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md) gets, marked *planned*: a breaking
item for the `exports` map and `engines`, the Node 20 requirement, a fix line for the licence, tooling lines (harness,
browsers, Playwright floor and latest, `tsc`, lint, CI gate, retries), and an upgrade checklist item for deep imports;
[PLANS.md](PLANS.md) row 6 reads "written 2026-10-14, decisions taken, awaiting implementation".

At execution (the last step): tick section 4 (*Fix* on every bullet except `stripInternal`, left to plan 7, and the
`CHANGELOG.md` note, *Skip* per 3.10, and the unit-test bullet, *Fix* by plan 1.1-1.2) with the two corrections of
2.1 and 2.6, and the three section 2 bullets; flip the release-note items to *done*; append execution-time decisions.
[AGENTS.md](../AGENTS.md): the revision line; section 1 (the `exports` map closes the public surface; Node 20);
section 2 (repo map: `scripts/`, `.pack/`, the workflows row with `checks.yaml`, `pr.yaml`, `main.yaml` and the publish
guard, no `src/dist` row, no `test.yaml`); section 3 (the commands of 1.1, the sudo-free setup, `typecheck`, lint
scope, no "no `tsc` step yet", no `pnpm add` workaround; the `pack-test.sh` switches, with `PLAYWRIGHT_VERSION`
swapping the root and `test/` together; the rule that the peer floor, the root dev pin and the harness pin move
together and that `engines` follows Playwright's); section 4 (the dependency on `.pack/pomwright`, the new spec, the
spec count; the typecheck probe file now runs; the harness runs on three browsers at the floor and at the latest 1.x
against one packed tarball per run, and only lint runs for `.md`-only changes; new specs prefer DOM assertions over
rendered locator strings, and an existing string assertion is converted when a newer Playwright renders it
differently; a real browser difference uses the `browserName` fixture); section 7 (publish waits for `CI`, which runs
only on pushes to `main` and includes the harness; pull requests run `PR`; CI runs only for pull requests and `main`;
the gate job `build` is `main`'s required status check; the sixth pending changeset); section 8 (never let `CI` run on
pull requests or remove the publish guard; never rename the gate job `build` without changing the branch-protection
rule with it, or every pull request is blocked for non-admins; the `pnpm install` pitfall line replaced by "do not
reintroduce a `file:` tarball dependency or sudo in the harness scripts").
[PLANS.md](PLANS.md) row 6 to executed.

---

## 5. Tests

### 5.1 Unit tests

None new: nothing in `src` changes. `pnpm test:unit` must stay green with `@playwright/test` declared (P14: 262
passed).

### 5.2 Harness

- New `test/tests/packaging/esmEntry.spec.mts`, ESM inside the CommonJS harness (P5c):
  - the ESM namespace of `"pomwright"` has exactly the keys of `createRequire(import.meta.url)("pomwright")`;
  - `PageObject`, `test` and `SessionStorage` are the same objects through both;
  - `require.resolve("pomwright/dist/index.js")` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`;
  - `require("pomwright/package.json")` has `engines.node` `>=20` and `license` `Apache-2.0`.
  Red against today's package (a `default` key in the namespace, P5c, and an open deep import), green after 4.1.
- Every existing spec stays unchanged and green on chromium, firefox and webkit.
- `pnpm typecheck` clean, with the probe file's directives consumed.

### 5.3 Packaging probes at execution

Rerun against the final tarball, in the scratchpad, as P17 did for the prototype: P2 (the file list: `index.js` and
`index.d.ts` from tsup, `index.mjs` and `index.d.mts` from the generator, nothing else in `dist`), P3a and P3b (Node
20 and 24, the four TypeScript modes), P3c (attw), P5a and P5b (runner, CommonJS and ESM, mixed `require`), the
Node 18 install warning (P4). Recorded in the execution note, not added to CI (7.18).

---

## 6. Versioning

`major` changeset, riding 3.0.0. Breaking by the book: deep imports stop resolving (none in the survey); an ESM
project now loads a different file (the same implementation); `engines` adds an install warning on Node below 20,
where Playwright 1.64 already exits. The licence and `repository.url` are metadata fixes. Everything else (harness,
CI, lint, `tsc`, retries, `.npmignore`, `src/dist`) is repository tooling with no effect on the published package
beyond the file list of 4.1.

---

## 7. Decisions

Taken with the user on 2026-10-14; the chosen option is stated first in each. Every recommendation of the first draft
was accepted; 7.6 and 7.10 were amended in review.

- [x] 7.1 `license: "Apache-2.0"` and `repository.url: "git+https://github.com/DyHex/POMWright.git"`.
- [x] 7.2 Package shape D: one CommonJS build; `exports` with `import` (`index.d.mts`, `index.mjs`) and `require`
  (`index.d.ts`, `index.js`), plus `"./package.json"`; `index.mjs` and `index.d.mts` written by
  `scripts/write-esm-entry.mjs` as named re-exports of the CommonJS build; `main` and `types` kept, `module` dropped.
  Alternatives: B (CommonJS only behind `exports`); C (dual builds, rejected: two copies, P5b); A (no `exports`).
- [x] 7.3 `engines: { node: ">=20" }`, following Playwright's `engines`; re-read whenever the peer floor moves.
- [x] 7.4 No `sideEffects` (no effect, P10).
- [x] 7.5 `@playwright/test` `1.64.0` (exact) in the root `devDependencies`; the peer floor, the root dev pin and the
  harness pin move together. A new dev dependency, recorded in DECISIONS.md. Rejected: `^1.64.0`; leaving it to
  `autoInstallPeers`.
- [x] 7.6 CI runs the harness at the pin (1.64.0) and at the latest `>=1.64.0 <2.0.0`, each on chromium, firefox and
  webkit, both gating; a latest job ends green at once while latest equals the pin. A difference the latest jobs find
  is fixed when it appears: a rendered-string difference (Playwright-version dependent, P16) preferably by asserting
  against the DOM, a real browser difference with the `browserName` fixture; the existing string assertions stay as
  they are, and new specs prefer DOM assertions. Accepted cost: a Playwright release alone can turn CI red. Amended in
  review from "latest on chromium only". Rejected: no latest job; a latest job that does not gate. Left for after
  3.0.0: a scheduled watcher that tests the latest release against each new Playwright release; converting the
  existing string assertions.
- [x] 7.7 The harness depends on `file:../.pack/pomwright`, the extracted tarball, installed with a frozen lockfile;
  `pack-build.sh` extracts. Rejected: 3.4's table.
- [x] 7.8 The harness postinstall is removed (`install-deps` and `only-allow`); no script calls sudo; CI passes
  `--with-deps`. Rejected: keeping `only-allow` as a `preinstall`.
- [x] 7.9 `pnpm pack-test` runs the build, the pack, the frozen install, `typecheck`, the browser download and every
  project, with arguments passed to `playwright test`; `PLAYWRIGHT_VERSION` (CI's latest jobs) swaps Playwright at the
  root and in `test/` together after the frozen install, before the type check and the browser download, so the type
  check runs on one version (P20); `PLAYWRIGHT_INSTALL_ARGS` (CI's `--with-deps <browser>`); `POMWRIGHT_TARBALL` (CI's
  harness jobs) installs the root dependencies and tests a given tarball instead of building; `harness:install` and
  `typecheck` as separate scripts. Rejected: chromium as the local default; swapping `test/` alone (40 type errors from
  mixed versions, P20). The version switch was added in the second review, the tarball switch in the third, the root
  swap in the final review.
- [x] 7.10 CI: the jobs live once in a reusable `checks.yaml`: `changes` (whether anything other than `*.md` changed),
  `lint` (always), `package` (unit tests, build, pack, the tarball uploaded as a run artifact) and `harness` (per
  browser at the pin and at the latest 1.x, each testing the downloaded tarball), the last two skipped for `.md`-only
  changes. `pr.yaml` (`PR`) calls it for every pull request, draft or not, on the default `pull_request` types;
  `main.yaml` keeps `name: CI` and calls it for every push to `main` only; each caller ends with a gate job named
  `build`, the existing required status check, that fails unless the reusable workflow succeeded; `test.yaml` is
  deleted; branches without a pull request get no CI. `publish.yaml` keeps `workflow_run` on `CI` and its job condition
  requires `conclusion == 'success'`, `event == 'push'`, `head_branch == 'main'` and this repository. Report artefacts
  are named by browser, Playwright row and run, no branch name in a script. If the first push shows that a called
  workflow's failing or skipped jobs do not reach the gate as expected, the jobs are written out in both callers.
  Amended in the second review from "one `CI` workflow on every push and on pull requests" (which let a fork's branch
  named `main` start Publish and needed a skip rule that also skipped the Version Packages pull request, P18), and in
  the third review with the `.md` skip, the single build per run and the gate (P19). Rejected: that layout;
  `test.yaml` as a second workflow listed in `publish.yaml`; chaining through `workflow_run`; the jobs written out in
  both callers; a publish job inside `CI`; path filters on the triggers (a pending required check, no Publish after a
  changeset-only merge); a build per harness job; a new required check name. Left for after 3.0.0: publishing the
  tarball CI tested instead of the rebuild in `publish.yaml`.
- [x] 7.11 `pnpm typecheck` (`tsc --noEmit -p test`) in `pack-test` and CI; `server.js` gets JSDoc types. Rejected:
  `checkJs: false` for `test/`.
- [x] 7.12 Lint and format the whole repository; exclude `test/test-data` and `.pack`; `biome migrate`; `@biomejs/biome`
  `^2.5.6`; fix the findings.
- [x] 7.13 `retries: process.env.CI ? 1 : 0`, `failOnFlakyTests: !!process.env.CI`, `video: "on-first-retry"`.
  Rejected: 3.9's alternatives.
- [x] 7.14 `.npmignore` deleted.
- [x] 7.15 `src/dist` deleted locally; the `tsconfig.vitest.json` exclude and the AGENTS.md row removed.
- [x] 7.16 `CHANGELOG.md` not edited; the analysis bullet ticked *Skip* with 2.12 as the note. Rejected: a *Notes*
  sentence in the changeset.
- [x] 7.17 The unit-test bullet ticked *Fix* (plan 1.1-1.2); `stripInternal` left to plan 7.
- [x] 7.18 Harness: new `packaging/esmEntry.spec.mts`; the packaging probes of 5.3 run at execution and before the
  release, not in CI. Rejected: attw in CI through `npx` (unpinned) or as a dev dependency.
- [x] 7.19 One `major` changeset, `package-exports-and-engines`; tooling in the release notes only.
- [x] 7.20 Docs: a *Requirements* paragraph in `docs/v3/overview.md`; AGENTS.md per 4.7; README left to plan 10.

> Notes:

---

## 8. Execution order

1. Harness: `pack-build.sh` extraction, `file:` directory, regenerated `test/pnpm-lock.yaml`, no postinstall,
   `pack-test.sh`, `.gitignore`, the `harness:install` and `typecheck` scripts, `server.js` JSDoc, `playwright.base.ts`;
   `pnpm pack-test` green on all three browsers against today's package shape; typecheck clean.
2. Package: `package.json` fields, `scripts/write-esm-entry.mjs`, the root dev dependency, `.npmignore` deleted;
   `esmEntry.spec.mts` first (red against step 1's package), then green; `pnpm build`, `pnpm test:unit`,
   `pnpm pack-test`.
3. Lint scope: `biome.json`, the scripts, the biome specifier, `pnpm format`, the hand fixes; `pnpm lint` clean.
4. CI: `checks.yaml` (`changes`, `lint`, `package`, the harness matrix of three browsers by pin and latest), `pr.yaml`
   and `main.yaml` (`main` only) each with the gate `build`, the `publish.yaml` guard, `test.yaml` deleted; actionlint
   clean; each job's commands run locally: the `changes` decision for an `.md`-only and a mixed diff,
   `POMWRIGHT_TARBALL` with a packed tarball, the latest row's resolve-and-skip step, and `PLAYWRIGHT_VERSION` (with an
   older version, since latest equals the pin today: the type check clean and the suite green with the root and
   `test/` swapped together; both `package.json` files and both lockfiles are restored afterwards).
5. Docs in `docs/v3`.
6. Changeset.
7. Full run: `pnpm format`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `pnpm pack-test` (three browsers), the
   probes of 5.3 against the final tarball; fix anything red.
8. Ledgers: analysis ticks and notes, `DECISIONS.md`, `RELEASE-NOTES-3.0.0.md`, `AGENTS.md`, `PLANS.md`; delete the
   local `src/dist` (nothing to commit for it).

The new workflows first run when the user pushes the branch: `PR` on pull request #46, reporting `build`; then two
scratch pull requests (3.6): one with a deliberately failing commit, where the gate `build` must fail, and one
changing only an `.md` file, where lint runs, `package` and `harness` are skipped and `build` passes. `CI` and the
Publish guard first run on the merge to `main`. A fix found there is a follow-up commit named after this plan.
