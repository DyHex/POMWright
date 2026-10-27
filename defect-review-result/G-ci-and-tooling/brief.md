# Scope G: CI, scripts and tooling

Segment G of the final whole-project review at `54cdada`. First read [../scopes.md](../scopes.md) (where things are,
probing, the finding format, finishing), [../inventory.md](../inventory.md) (lines tagged G) and
[../baseline.md](../baseline.md). Probes go to `/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/`.

Review it as an *area* in the skill's terms. The workflows cannot be run from here, and `gh` is logged out on this
machine. So probe what can be probed:

- Run the scripts locally against git histories you build in scratch repositories in your probes folder, with a stub
  `gh` on `PATH` where a script calls it.
- Run the shell scripts with `bash -n` and with shellcheck, and the workflows with actionlint. Download both tools into
  the probes folder; they are never dependencies.
- Reason from GitHub's documented semantics for the rest, and cite the documentation page for every claim about how
  Actions behaves. A claim you could not check goes under *Suspected*.

## What is in scope

- **Workflows**: `.github/workflows/checks.yaml`, `pr.yaml`, `main.yaml`, `publish.yaml`, `pages.yaml`;
  `.github/dependabot.yml`.
- **Scripts**: `scripts/ci-changes.sh`, `ci-last-green.sh`, `ci-playwright-version.sh`, `pack-version.sh`,
  `check-doc-snippets.mjs`, `check-api-coverage.mjs`, `benchmark.mjs`; `pack-build.sh`, `pack-extract.sh`,
  `pack-test.sh`.
- **Config**: `playwright.base.ts`, `test/playwright.config.ts`, `test/playwright.steps.config.ts`,
  `test/playwright.bench.config.ts`, `vitest.config.ts`, `tsconfig.vitest.json`, `biome.json`, `.editorconfig`,
  `pnpm-workspace.yaml`, the `scripts` of the root, `test/` and `website/` `package.json`, `test/server.js` as
  infrastructure (its fixture routes belong to the scopes that use them), `.changeset/config.json`.
- **Docs**: `internal/tests-and-checks.md`, `internal/documentation.md`, `internal/performance.md`; AGENTS.md §3, §4,
  the CI, release and publishing parts of §7, and the checks of §9.

## Changes since v3.0.1 in this scope

```
e856a80 ci: publish only the commit CI tested
ca5b3d1 docs: performance tables from a run of the 3.0.2 code
e852e85 docs: AGENTS.md and Tests and checks for 3.0.2
13017b7 docs: two design reasons from the 3.0.2 work on the Internal pages
ffcc23f docs: correct six statements found by the 3.0.1 reviews
4f80b37 fix: bare @step compiles with experimentalDecorators   (the legacy decorators check)
333a928 fix: a boxed @step is reported at the line that called the method   (the step-locations check)
```

## Known and decided

- Filed issues: 01, release tooling to changesets CLI 3, action v2 and npm Trusted Publishing; 03, Node 26 once it is
  LTS; 04, publish the tarball CI tested instead of rebuilding it.
- Decided, not planned (AGENTS.md §7): a scheduled workflow against new Playwright releases; linting Markdown.
- AGENTS.md §8: `CI` (`main.yaml`) never runs on pull requests; the publish guard stays; the gate job keeps the name
  `build`; no second build in a harness job; no sudo in the harness scripts; the site is never built in a harness
  job; the site is deployed only from a green `CI` run on `main` or a manual run.

## Questions to answer

- **`ci-changes.sh` and `ci-last-green.sh`.** Are the `code` and `site` outputs right in every case? Cover a first push,
  a force push, a docs-only push after a red run, a pull request against its base, merge commits, renamed and deleted
  files, `*.md` outside `website/`, `website/`-only changes, and a branch with no green run yet. AGENTS.md §2 states
  the rule: never the previous push alone.
- **The gate job `build`.** Does it fail when a needed job fails, and pass or fail correctly when a job was skipped by
  `changes`? Can a red harness ever end in a green gate?
- **`publish.yaml` and `pages.yaml`.**
  - Check the `workflow_run` conditions: event, branch, conclusion, repository.
  - Check the guard that `main` has not moved past the tested commit, and which commit is checked out and built.
  - Check permissions and concurrency.
  - What does `pages.yaml` build on `workflow_dispatch`?
  - Can a run from a fork or from another branch reach either?
- **`checks.yaml`.**
  - Check the harness matrix at the pin and at the latest 1.x (`ci-playwright-version.sh`), the Node floor job, and
    the `site` job on Node 24.
  - Is the tarball tested the one built in `package`?
  - Do action pins match their version comments, and does dependabot cover them and leave `@playwright/test` alone?
- **`pack-test.sh` and the pack scripts.**
  - Do exit codes propagate through every stage? Can a failing harness be masked by the `playwright.steps.config.ts`
    run after it, or the reverse?
  - Check `set -e` and pipes.
  - Does each of `POMWRIGHT_TARBALL`, `PLAYWRIGHT_VERSION` and `PLAYWRIGHT_INSTALL_ARGS` do what §3 says?
- **The doc checks.**
  - What can slip past `check-doc-snippets.mjs`: a block that is not `ts`, `ts` with other meta, a `title` clash,
    `// ---cut---` misuse, `nocheck` outside *Upgrading from 2.x*?
  - What can slip past `check-api-coverage.mjs`: members of aliases, overloads, headings with the wrong level, a `@see`
    to the wrong heading?
  - Probe each with a planted page in a copy of the docs, never in the worktree's `website/`.
- **Configs.** Does vitest's discovery match AGENTS.md §2 (never a Playwright spec)? Does biome's scope match §3? Are
  the Playwright configs' `webServer`, retries and reporters what §3 and §4 say?
- **Docs.** Do `internal/tests-and-checks.md` and AGENTS.md §3 and §4 describe these scripts and workflows as they are?

## Neighbours

The package's contents and the changesets' text are scope F. The site's content is scope H. Report what you meet there
under *outside the scope* in `summary.md`.
