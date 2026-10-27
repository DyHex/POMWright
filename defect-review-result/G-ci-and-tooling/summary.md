# Scope G: CI, scripts and tooling — summary

> Saved by the orchestrating session from the agent's final report, with the user's approval: the agent's own write of this file was refused by a harness rule ("Subagents should return findings as text, not write report files").

- **Scope**: segment G of the final whole-project review, reviewed as an *area*: the workflows, the CI and pack scripts, the doc checks, the benchmark, the configs, and the pages and AGENTS.md sections that describe them ([brief.md](brief.md)).
- **Commit**: `54cdada` (worktree `/home/magdys/workspace/dyhex/POMWright-final-review`, detached).
- **Reviewer**: G. **Date**: 2026-10-23.
- **Probes and notes**: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/`.

## What I read

- The skill, scopes.md, inventory.md (the G lines in full, the rest as far as it touches G), baseline.md, the brief, and AGENTS.md at `54cdada` in full. Only its §2 `skills/` row differs from the user's checkout.
- Issue drafts 01, 03 and 04 (`git show 2f06702:release-3.0.2/issues/…`).
- `.github/workflows/{checks,pr,main,publish,pages}.yaml` and `.github/dependabot.yml`.
- `scripts/{ci-changes,ci-last-green,ci-playwright-version,pack-version}.sh`, `scripts/{check-doc-snippets,check-api-coverage,benchmark}.mjs`, and `pack-{build,extract,test}.sh`.
- The configs: `playwright.base.ts`, the three `test/playwright*.config.ts`, `vitest.config.ts`, `tsconfig*.json` (root, vitest, `test/`, declarations, legacyDecorators), `biome.json`, `.editorconfig`, `pnpm-workspace.yaml`, `.changeset/config.json`, the `scripts` of the three `package.json` files, `test/server.js` (as infrastructure), `test/step-locations/` and `website/{astro.config.mjs,plugins/expressive-code-cut.mjs}`.
- Docs: `internal/tests-and-checks.md`, `internal/documentation.md`, `internal/performance.md`, and AGENTS.md §2 (CI rows), §3, §4, §7 (CI and release) and §9 (the checks).

## Decisions taken without asking

- **The note from an earlier scope** (tsup without `--clean`): I made it a finding in this scope (G-4, Low). The published package is unaffected, because Publish builds on a fresh checkout. But AGENTS.md §3 calls `pack-test` "the authoritative integration run", and a source sketch showed it passing on a build that no longer emits declarations, which CI rejects. No stale file was left behind; `dist/` was compared byte for byte with the 54cdada tarball, then rebuilt with `pnpm harness:install`.
- **Evidence from the live repository and the registry**: `gh` is logged out, so I used GitHub's public REST API without a token, plus `git ls-remote` and the public npm registry, all read-only. Responses are saved in `probes/G/github/` and `probes/G/npm/`. This gave real results for the gate, Dependabot, branch protection, the Pages environment, run timings and provenance.
- **The "latest" harness row**: run in a throwaway clone of `54cdada` (since removed), with browsers downloaded to `probes/G/browsers`, so neither the worktree nor the user's browser cache changed.
- **`pnpm bench`**: run once, because the baseline had not run it.
- **Stub tools**: a stub `gh` for `ci-last-green.sh`, and stub `pnpm`/`node` for `pack-test.sh`.
- **actionlint 1.7.12 and shellcheck 0.11.0**: downloaded to `probes/G/tools/`.

## Inventory lines reviewed

- **Fully:** every G line of inventory.md §9 (scripts, workflows, configs), §4 (the CI lifecycle), the site config line shared with H (`astro.config.mjs` link check, the cut plugin), and the three Internal pages.
- **Partly:** `scripts/write-esm-entry.mjs` (scope F; read only as part of `pnpm build`), `test/server.js` (port and start only; its routes belong to the scopes that use them), and the changesets' text (scope F).

**Not run:**
- The workflows on GitHub (nothing may be pushed or re-run).
- The Publish run logs (they need a token; they would settle G-10's cause).
- The harness at Playwright latest on firefox and webkit (chromium only).
- Node 22.
- A real `pnpm publish` with provenance.

## Test gaps (most important first)

1. Nothing checks that a release reached npm with provenance, and a green Publish run says nothing about npm: changesets/action v1.9.0 runs the publish script with `ignoreReturnCode: true` (G-10).
2. `publish.yaml` and `pages.yaml` never run before a merge, and CI does not run actionlint. A change to either (PR #47) passes every PR check (G-3).
3. `ci-changes.sh` and `ci-last-green.sh` have no tests. The rename case (G-1) and the merge-commit case (G-2) were found only by the scratch-repository probes.
4. The step-location reporter does not require every `// LOCATION` marker to be checked. With the goto probe's label renamed, it reports "6 checked, all where they were called" and exits 0 (`probes/G/steps/`).
5. `check-doc-snippets.mjs` skips `~~~ts` fences and `tsx` blocks, and keeps `nocheck` on *Upgrading from 2.x* only by listing it. A planted page with all three passes; only the control block fails (`probes/G/snippets/planted.out`). None of the three occurs in the docs today.
6. `check-api-coverage.mjs` does not check a `@see`'s target. It matches member headings across the whole page, and it accepts a rest parameter when any `@param` exists (G-7). The scans found no real miss: every `@see` points at its own heading, every overload's hover has its `@param`s, and every undocumented rest parameter is a tuple-typed `...args`.
7. Local builds keep stale `dist/` files (G-4).

## What is sound (path probed)

- **`ci-changes.sh`** (`probes/G/ci-changes/probe.sh`, `probe.out`): first push; website-only change; `*.md` outside `website/`; code change; docs-only push after a red run, compared with the last green commit (`code=true`); deleted file; merge of `main` into a branch; all-zero and unknown bases; empty diff after a revert; several bases.
- **`ci-last-green.sh`** (stub `gh`, `probes/G/ci-last-green/`): skips the head itself, rebased-away commits, missing commits and other repositories; picks the newest ancestor; a `gh` failure or unreadable output prints nothing and exits 0; wrong usage exits 2.
- **`ci-playwright-version.sh`**: `pin` gives an empty version; `latest` gives 1.64.1 with `skip=false`; an unknown row exits 1.
- **`PLAYWRIGHT_VERSION=1.64.1`** in a clone (`latest-row.log`): root and `test/` both at 1.64.1; `tsc`, the doc checks, a harness spec and the step-location run all pass; exit 0.
- **`pack-test.sh`** (stub probe, `probes/G/packtest/`): a failing harness exits 1 and the step-location run does not start; a failing step-location run exits 1; `POMWRIGHT_TARBALL`, `PLAYWRIGHT_VERSION` and `PLAYWRIGHT_INSTALL_ARGS` act as AGENTS.md §3 says; arguments reach the harness only.
- **`test/` frozen install**: a re-extracted `.pack/pomwright` is hard-linked again, so the marker probe shows up in `test/node_modules` (`probes/G/inject/`).
- **The gate `build`**, from live PR runs: #49's package failure gives `build` failure; #48's skipped harness gives `build` success; #47 is all green.
- **Settings and pins**:
  - Branch protection requires `build` for non-admins.
  - The `github-pages` environment allows only `main`, so a manual Pages run on another branch cannot deploy.
  - All 8 action pins match their tags (`git ls-remote`).
  - Dependabot leaves `@playwright/test` (and `pomwright` in `test/`) alone.
- **Workflow conditions**: Publish and Pages require success, `push`, `main` and this repository, so fork and branch runs cannot reach them. Permissions and concurrency are as documented. The publish guard's own logic is replayed in `probes/G/publish-guard/`.
- **Linters**: actionlint is clean on all five workflows. shellcheck is clean apart from one intentional SC2016 info in `pack-version.sh`. `bash -n` is clean.
- **Site build**: fails on a missing page and on a missing anchor (planted copy, `probes/G/site/build-planted.log`).
- **Doc checks on the real docs**: all 227 `ts` fences are checked (215) or listed (12 `nocheck`, all on *Upgrading from 2.x*). Errors are mapped to page lines. A wrong heading level is caught.
- **Configs**:
  - `tsc -p test` leaves out `test/.doc-snippets`.
  - vitest discovers only `src/**/*.test.ts`, plus `*.test-d.ts` for typecheck.
  - biome's scope matches §3.
  - The Playwright configs (local reuse of the server, CI retry with `failOnFlakyTests`, reporters) match §3 and §4.
  - AGENTS.md §4's harness count is right (55 spec files, 8,407 lines).
- **`pnpm bench`** runs at `54cdada` (exit 0, `probes/G/bench.out`). Its tables agree with *Internal → Performance* within about 25%, which is noise: nothing under `src/locators` changed since the measured commit `61e266c`. The page's charts equal its tables divided by the path counts.

## Outside the scope

- inventory.md §7 says "the 31 pending changesets". `.changeset/` holds 29; its 31 entries include `config.json` and `README.md`. (Scope F / consolidation.)
- The 3.0.0 `CHANGELOG.md` entry "Releases are published with npm provenance ... `npm audit signatures` verifies it" is consumer-facing and does not hold. It is covered by G-10; the text itself is scope F's.

## Finding index

| ID | Kind | Severity | Semver | Summary |
| --- | --- | --- | --- | --- |
| [G-1](defect-G-1-rename-hides-old-path.md) | defect | Low | none | `ci-changes.sh` sees only the new name of a renamed file, so moving a file into `website/` or to a `*.md` name skips the jobs its old path needs. |
| [G-2](defect-G-2-pr-skip-ignores-merge-commit.md) | defect | Low | none | On a pull request the skip is decided on the head commit while the jobs test GitHub's merge commit, so after `main` moves a docs-only push reports green for an untested merge result. |
| [G-3](defect-G-3-dependabot-proposes-deferred-majors.md) | defect | Medium | none | Dependabot proposes the majors the backlog defers; its open `changesets/action` v2 PR is green in every check and would make every Publish run fail. |
| [G-4](defect-G-4-build-keeps-stale-dist.md) | defect | Low | none | `pnpm build` never empties `dist/`, so local packs ship and test files the current source no longer produces. |
| [G-5](defect-G-5-release-skipped-when-main-moves.md) | defect | Low | none | A merged Version Packages commit is never published when a PR with a changeset lands before its CI ends; the guard promises the newer run publishes. |
| [G-6](defect-G-6-performance-call-count.md) | documentation | Low | none | *Internal → Performance* says every per-call measurement runs 20,000 calls; registration runs 2,000. |
| [G-7](defect-G-7-api-coverage-see-target-unchecked.md) | documentation | Low | none | The docs say the API coverage check requires each `@see` to link its own heading; it accepts any `@see`. |
| [G-8](defect-G-8-pages-rerun-deploys-older-site.md) | suspected | Low | none | A re-run of an older green `CI` run would redeploy the older site; `pages.yaml` has no "main moved on" guard. |
| [G-9](defect-G-9-editorconfig-tabs-everywhere.md) | defect | Low | none | `.editorconfig` asks for tabs in YAML and Markdown, where the repository uses spaces and a tab breaks a workflow. |
| [G-10](defect-G-10-no-provenance-on-3x-releases.md) | defect | Medium | none | 3.0.0 and 3.0.1 carry no npm provenance attestation, despite `publish.yaml`'s setup and the 3.0.0 changelog's promise. |
| [G-11](defect-G-11-stale-tooling-comments.md) | documentation | Low | none | Three tooling comments describe the repository as it was. |

## Finishing state

- The worktree is clean. `git status --porcelain` prints nothing, and `--ignored` lists exactly baseline.md's entries.
- It is rebuilt and reinstalled from `54cdada` by `pnpm harness:install` after the G-4 source sketch.
- No server is running on 9000, 4391 or 4392.
- The clone was removed; `git worktree list` shows only the two checkouts.
- In the user's checkout only `defect-review-result/G-ci-and-tooling/` and the G row of scopes.md were touched.
