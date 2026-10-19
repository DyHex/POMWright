# Plan 14: dependencies and tooling brought up to date

Working document, kept in `release-3.0.0/`. It moves the repository's tools, dev dependencies and GitHub Actions to
their latest versions before 3.0.0 ships, says which upgrades break something and what each needs, and leaves out what
should not move. No analysis items; nothing a consumer installs changes. File links are relative to this folder.

Written 2026-10-19. **Reviewed 2026-10-19: every decision taken as recommended (option a).**

**Executed 2026-10-19**, one commit per step: 386a7c0 (1, pnpm 12.14.0, `pnpm-workspace.yaml`, the lockfiles,
`pnpm/action-setup` v6.1.0), d62b6fc (2, TypeScript 6.0.3 with `"types": ["node"]`, tsup 9, biome 2.5.15, vitest 5.0.5,
`@types/node` 24.19.2, `changelog-github` 0.7.0, `test/`'s dotenv 18 and express 5.3), ad98afd (3, checkout v7.0.1,
setup-node v7.1.0, upload-artifact v7.0.2, download-artifact v8.0.2; Dependabot for `/` and `/test`), and the ledger
commit for step 4 that carries this note. Checks: lint clean, 670 unit tests with no type errors, pack-test 1317 passed
on chromium, firefox and webkit with both type checks, the snippet check (191) and the coverage check (0 problems),
the site build with every link valid, actionlint on every workflow; `dist/index.js` byte-identical to before. The new
action majors run on GitHub at the next push, on your word.

Every claim below was checked on 2026-10-19 against HEAD 4d125f1, in a scratchpad clone (`deps`) upgraded to the
versions of section 2, never in the working tree: npm's registry for versions, engines and peer ranges; GitHub's API for
the actions' releases, release notes and tag commits; and, in the clone, installs with pnpm 12.14.0, `pnpm lint`, `pnpm
test:unit`, `pack-build.sh`, `pnpm typecheck`, `pnpm pack-test --project=chromium` on Node 24, the same harness run
from the packed tarball on Node 20 (the floor job), the site's install and build, `changeset status` and a
`changeset version` dry run, and `pnpm publish --dry-run`.

---

## 1. Summary

Most upgrades are drop-in. Five need more than a version change, and two should not be made now:

| upgrade | what it needs | verdict |
| --- | --- | --- |
| pnpm 9.12.0 → 12.14.0 | build scripts are blocked by default: a root `pnpm-workspace.yaml` with `allowBuilds: { esbuild: true }`; `pnpm/action-setup` v6.1 in every workflow; regenerated lockfiles (format stays `9.0`) | do (decision 9.1) |
| TypeScript 5.9.3 → 6.0.3 | `"types": ["node"]` in the root `tsconfig.json`: TypeScript 6 includes no `@types` package unless listed, and without it vitest's type check misses `Buffer` and `Error.captureStackTrace` | do |
| TypeScript → 7.0.2 | 7.0 ships the `tsc` binary only, no compiler API: tsup's declaration build fails (`rollup-plugin-dts requires the TypeScript compiler API`), and `check-doc-snippets.mjs` and `check-api-coverage.mjs` get `ts.createProgram === undefined` | not now (decision 9.2) |
| `@changesets/cli` 2 → 3, `changelog-github` 0.5 → 1, `changesets/action` v1 → v2 | they move together (action v2 refuses CLI v2); action v2 renames `publish` to `publish-script`, takes the token only as `github-token`, and no longer writes `.npmrc` from `NPM_TOKEN`, which is how `publish.yaml` logs in to npm today: npm auth moves to Trusted Publishing; none of it can be tried without publishing | after 3.0.0 (decision 9.3) |
| `mermaid` 11 → 12 | outside `astro-mermaid` 2.1.0's peer range (`^10 \|\| ^11`), which is the latest | not now |
| `actions/checkout` v4 → v7, `setup-node` v4 → v7, `upload-artifact` v4 → v7, `download-artifact` v4 → v8 | nothing for these workflows (section 4) | do |

What stays by decision: `@playwright/test` at 1.64.0 in the root and in `test/` (the peer floor, AGENTS.md section 3;
CI's "latest" rows already test 1.64.1); Node 20 in the floor job; Node `24.x` everywhere else (Node 26 is not LTS
yet, decision 9.4); `@types/node` on 24.x, the contributors' and CI's Node.

## 2. Versions

### The root `package.json`

| package | now (locked) | latest | proposed | checked in the clone |
| --- | --- | --- | --- | --- |
| `packageManager` pnpm | 9.12.0 | 12.14.0 | 12.14.0 | installs, every script, Node 20 and 24 |
| `@biomejs/biome` | 2.5.6 | 2.5.15 | `^2.5.15`, `biome.json`'s `$schema` with it | `pnpm lint` clean, 141 files |
| `typescript` | 5.9.3 | 7.0.2 | `^6.0.3` (9.2) | build, 670 unit tests, both type checks, both doc checks |
| `tsup` | 8.5.1 | 9.0.0 | `^9.0.0` | `dist/index.js` byte-identical; `dist/index.d.ts` differs only in its last export statement (one list with `type` modifiers becomes a value list and an `export type` list); the public-types probes pass |
| `vitest` | 5.0.3 | 5.0.5 | `5.0.5` (exact, as decided in plan 1.1-1.2) | 670 tests, no type errors |
| `@types/node` | 24.13.3 | 26.6.5 | `^24.19.2` | as above |
| `@changesets/cli` | 2.31.1 | 3.0.3 | `^2.31.1` until after 3.0.0 (9.3) | 3.0.3: `status` and `version` work; `version` gives 3.0.0 with the docs changeset first |
| `@changesets/changelog-github` | 0.5.2 | 1.0.1 | `^0.7.0` until after 3.0.0 (9.3) | 1.0.1 tried with the CLI 3; 0.7.0 is tried in step 2 |
| `@playwright/test` | 1.64.0 | 1.64.1 | 1.64.0 (the floor) | |

### `test/package.json`

| package | now | latest | proposed |
| --- | --- | --- | --- |
| `packageManager` | pnpm 9.12.0 | 12.14.0 | 12.14.0 |
| `dotenv` | 17.3.1 | 18.0.8 | `^18.0.8` |
| `express` | 5.2.1 | 5.3.0 | `^5.3.0` |
| `@types/express` | 5.0.6 | 5.0.6 | unchanged |
| `@types/node` | 24.12.0 | 26.6.5 | `^24.19.2` |
| `@playwright/test` | 1.64.0 | 1.64.1 | 1.64.0 (the floor) |

The harness passed with these: 439 tests on chromium, Node 24 and Node 20.

### `website/package.json`

Every dependency is at its latest except `mermaid` (section 1). Only `packageManager` moves, to pnpm 12.14.0; the site
installs without build approvals and builds 52 pages with every link valid.

### Tools outside the lockfiles

pnpm 12.14.0 runs on Node 20 (the floor job) and Node 24. pnpm 9.7 and later switch to the version a project's
`packageManager` names, so a contributor with pnpm 9 installed gets 12.14.0 in this repository automatically. pnpm 9
itself rejects the new `pnpm-workspace.yaml` (`packages field missing or empty`), so nothing in the repository may run
an older pnpm than the field names.

## 3. pnpm 12 in detail

- **Build scripts.** pnpm 10 and later run no dependency's install script unless it is allowed; pnpm 12 fails the
  install (`ERR_PNPM_IGNORED_BUILDS: Ignored build scripts: esbuild@0.28.2`). `pnpm approve-builds esbuild` writes the
  allowance to a new root `pnpm-workspace.yaml`:

  ```yaml
  allowBuilds:
    esbuild: true
  ```

  esbuild comes in through tsup. `test/` and `website/` need no allowance; they keep their own lockfiles, which pnpm 12
  rewrites in place and treats as projects of their own, as before.
- **CI.** `pnpm/action-setup` v4.3.0 cannot install pnpm 12; v6.1.0 can ("support pnpm v12"). The `version:` input of
  every `pnpm/action-setup` step moves with the `packageManager` field, so the two always name the same pnpm.
- **Supply-chain checks.** pnpm 12 checks the lockfile against its supply-chain policies at install ("Lockfile passes
  supply-chain policies"); nothing was flagged.

## 4. The GitHub Actions

| action | now | proposed | breaking notes, and why they do not touch these workflows |
| --- | --- | --- | --- |
| `actions/checkout` | v4.4.0 | v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1` | v5: Node 24 runtime (GitHub-hosted runners have it); v6: credentials kept in a separate file; v7: refuses to check out a fork's pull request under `pull_request_target` and `workflow_run`. Nothing here checks out a fork under either trigger; the future `pages.yaml` (`PLAN-PRE-MERGE.md`) runs on `workflow_run` only for this repository's `main` |
| `actions/setup-node` | v4.4.0 | v7.1.0 `949feb2413d6458794dcd2491c4babbbce0c15c1` | v5: automatic caching from `packageManager`, which v6 limits to npm; every job here sets `cache: pnpm` itself |
| `actions/upload-artifact` | v4.6.2 | v7.0.2 `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | v5 to v7: Node 24, ESM, an optional unzipped upload; the default stays a zip |
| `actions/download-artifact` | v4.3.0 | v8.0.2 `9000827ccba6bdab643e8b6fd33ac0654aef8333` | v5 changes the path of downloads by ID; these download by name, unchanged. v8 fails on a hash mismatch, which only a corrupt download causes |
| `pnpm/action-setup` | v4.3.0 | v6.1.0 `ea17c68df8912ef543352723c149a84f56e3d413` | pnpm 12 support; Node 24 runtime |
| `actions/upload-pages-artifact`, `actions/deploy-pages` | v5.0.0, v5.0.1 | unchanged | already the latest |
| `changesets/action` | v1.9.0 | v1.9.0 until after 3.0.0; then v2.1.2 `ae32849d5ba541f9ae29e40e22a623bc13562f51` | section 5 |

The SHAs were resolved from the tags on 2026-10-19 and are checked again at execution. Dependabot keeps them current
afterwards.

## 5. The release tooling (decision 9.3)

Changesets 3 and its action v2 are one upgrade, and it changes how `publish.yaml` logs in to npm:

- action v2 refuses `@changesets/cli` 2, and the CLI 3 requires pnpm 10 or later and Node 22.11 or later (both hold
  after this plan);
- the inputs are renamed (`publish` → `publish-script`), and the token is passed as the `github-token` input;
- the action no longer writes `.npmrc` from `NPM_TOKEN`. npm auth moves to Trusted Publishing (OIDC), configured by the
  package owner on npmjs.com for `DyHex/POMWright`'s `publish.yaml`, which also gives provenance without
  `NPM_CONFIG_PROVENANCE`; or to `setup-node`'s `registry-url` with `NODE_AUTH_TOKEN`;
- the CLI 3 itself changes little for this repository: `changeset tag` is now `git-tag` (not used), `changeset version`
  exits 1 when there is nothing to release (the action handles it), the `prettier` option is gone (not used).

None of it can be tried without publishing: the first run would be the 3.0.0 release itself. So the recommendation is
to release 3.0.0 with the machinery that published 2.1.0, at its latest 2.x (`@changesets/cli` 2.31.1, already locked;
`changelog-github` 0.7.0; action v1.9.0), and to make this upgrade right after the release, proven on the next patch
release. pnpm 12 publishes this package (`pnpm publish --dry-run` packs it and stops before the upload, as it should),
and the CLI 2 sets no pnpm version limit.

## 6. Steps

One commit per step; each step runs `pnpm lint`, `pnpm test:unit` and the checks named.

1. **pnpm 12.** `packageManager` 12.14.0 in the three `package.json` files; the root `pnpm-workspace.yaml` with
   `allowBuilds`; the three lockfiles regenerated; `pnpm/action-setup` v6.1.0 with `version: 12.14.0` in every
   workflow, in the same commit, so CI never sees the action and the field name different versions. Checks: frozen installs of the
   three projects, `pnpm pack-test --project=chromium`, `pnpm docs:build`, actionlint.
2. **Dev dependencies.** The versions of section 2: biome and its schema URL, TypeScript 6.0.3 with `"types": ["node"]`,
   tsup 9, vitest 5.0.5, `@types/node`, `changelog-github` 0.7.0, `test/`'s dotenv, express and `@types/node`. Checks:
   `pnpm build` and the comparison of `dist/` with the previous build, `pnpm typecheck` (both doc checks), the full
   `pnpm pack-test --reporter=line` on chromium, firefox and webkit.
3. **The actions.** checkout, setup-node, upload-artifact and download-artifact at the SHAs of section 4, each with its
   version in a comment. Checks: actionlint; the pushed branch's PR run, on your word (the artifact and checkout steps
   only run on GitHub).
4. **Docs and ledgers.** AGENTS.md section 3 (pnpm 12.14.0, the `pnpm-workspace.yaml`, TypeScript 6) and its repository
   map (the new root file); DECISIONS.md: the release tooling deferred, TypeScript 7 deferred, the pins that stay;
   PLANS.md; this plan's execution note. No changeset: nothing published changes.

## 7. Decisions

- [x] 9.1 **pnpm 12.14.0, the latest.** (a) **Recommended:** 12.14.0. (b) 10.34.7, the latest 10.x, the smallest step
  that still needs `allowBuilds`.
- [x] 9.2 **TypeScript.** (a) **Recommended:** 6.0.3 now; 7 later, as its own change, once tsup's declaration build and
  the two doc checks have a way to the compiler API (the `@typescript/typescript6` fallback the error names, or a
  rewrite). (b) 7.0.2 now with that fallback, which this plan has not tried.
- [x] 9.3 **The release tooling.** (a) **Recommended:** release 3.0.0 with changesets 2 and action v1 (latest 2.x),
  upgrade right after, on a patch release, with npm Trusted Publishing. (b) Upgrade now, set up Trusted Publishing on
  npmjs.com, and let the 3.0.0 release be the first run.
- [x] 9.4 **Node 26.** (a) **Recommended:** stay on `24.x`; move when Node 26 is LTS (expected in late October 2026),
  as a change of its own. (b) Move CI and contributors to 26 now.
- [x] 9.5 **Dependabot for npm.** (a) **Recommended:** add monthly, grouped entries for `/` and `/test`, as `/website`
  has, with `@playwright/test` ignored (the floor moves by decision). (b) Keep updating them by hand.
