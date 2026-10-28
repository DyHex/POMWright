# Plan 41: release gates and the folder audit

- **Decisions**: [DECISIONS.md](DECISIONS.md) #2 (the gates), #5 (the folder), #8 (the latest Playwright run)
- **Findings**: none
- **Bump**: none
- **Stop**: **yes**, twice: after the gates are checked (the maintainer pushes and verifies), and before the folder is
  removed (the maintainer says when)
- **Depends on**: every other plan

## Contract

PR #60 is marked ready only when decision 2's gates hold; the working folder leaves the repository in one commit after
an audit, so the branch's history keeps it and PR #60's net diff has none of it.

## Steps

### Part 1: the gates

1. **Every plan done**: every row of PLANS.md is `done` with its commits, or decided otherwise.
2. **The full harness**: `pnpm pack-test --reporter=line` on chromium, firefox and webkit; the Node 20 floor (`nvm use 20`
   then `pnpm pack-test --project=chromium --reporter=line`, as the floor job does); the harness at the latest Playwright
   1.x on all three browsers: `PLAYWRIGHT_VERSION=<latest 1.x> bash pack-test.sh --reporter=line`, then restore the
   root and `test/` manifests and lockfiles (`git checkout -- package.json pnpm-lock.yaml test/package.json
   test/pnpm-lock.yaml`, then `pnpm install --frozen-lockfile` and `pnpm harness:install`). Outputs in *Execution notes*.
3. **The changesets**: every pending changeset re-read against the final code and the probes: the amended ones and the
   new ones (PLANS.md's tables); each starts with a sentence (AGENTS.md §7); every message it quotes matches the build;
   `pnpm changeset status` lists them all as `patch`. Corrections committed.
4. **The packaging probes**: the `consumer` job and the file-list spec are green on the last CI run; `EBADENGINE` is not
   needed (`engines` unchanged).
5. **Report and stop**: the gates' state, with what is left to the maintainer: the Trusted Publisher on npmjs.com, every
   Mermaid diagram checked by hand on the site built locally (`pnpm docs:preview`), and pushing.

### Part 2: the audit (after the maintainer has pushed and verified, and says so)

1. Read every file of `defect-review-result/` and list, in *Execution notes*, anything a later reader needs that is not
   yet in the code, its tests, the doc comments, the site (the reasons behind a design on the Internal pages), the
   changesets or AGENTS.md, or in a GitHub issue; propose where each goes. Work left for later becomes a GitHub issue
   draft for the maintainer to file (`backlog`, and `breaking` where it is).
2. **Stop and report** the list; move what the maintainer agrees to, in its own commit.
3. When the maintainer says so: one commit removes `defect-review-result/`; the maintainer pushes. Then, after asking:
   `git worktree remove ../POMWright-final-review` and the probes folder `../POMWright-final-review-probes/` (outside the
   repository; deleted only on the maintainer's explicit go-ahead).
4. Memory: the walkthrough and execution memories marked done.

## Commits

```text
chore: remove the 3.0.2 defect review's working folder

The review, its decisions and the plans stay in this branch's history
(git show <commit>^:defect-review-result/...).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

### Part 1, 2026-10-28

1. **Every plan done**: every row of PLANS.md is `done` (41 is this one), with its commits; the changeset tables'
   statuses set to `done`.
2. **The full harness**, on the tree of `1b15aff`:
   - three browsers at the pin (1.64.0): `pnpm pack-test --reporter=line` exit 0, 1,746 passed, 3 skipped (plan 40's
     run, on the same tree);
   - the Node 20 floor: Node v20.20.2, `POMWRIGHT_TARBALL=pomwright-test-build.tgz bash pack-test.sh
     --project=chromium --reporter=line` exit 0, 583 passed, as the floor job runs it;
   - the latest Playwright 1.x, 1.64.1 (`scripts/ci-playwright-version.sh latest`), on three browsers:
     `PLAYWRIGHT_VERSION=1.64.1 bash pack-test.sh --reporter=line` exit 0, 1,746 passed, 3 skipped; then
     `git checkout -- package.json pnpm-lock.yaml test/package.json test/pnpm-lock.yaml`, `pnpm install
     --frozen-lockfile` and `pnpm harness:install` (both exit 0; `test/` back on 1.64.0; the tree clean).
   Each run's typecheck: doc snippets 226, api coverage 0 problems, error messages 0 problems; step locations 31.
3. **The changesets**: 50 pending, all read against the final code: the 30 of PLANS.md's tables and 20 from this
   branch's fixes before the review (2026-10-22 and 23). Each starts with a sentence and declares `patch`; every message
   one quotes in a `text` block or a code span matches a message of the code (the error-message check's matcher run over
   `.changeset/`: what it did not match is code, Playwright's own messages quoted as the behaviour before a fix, and the
   never-applied list's continuation line); no claim contradicts a later plan. No correction. `pnpm changeset status`:
   `pomwright` patch.
4. **The packaging probes**: `bash scripts/consumer-check.sh pomwright-test-build.tgz` exit 0 (TypeScript 6.0.3 under
   node10, node16 and nodenext in CommonJS and ESM, and bundler; TypeScript 5.0.4, 5.9.3, 6.0.3 and 7.0.2 in both
   decorator modes; attw 0.18.5; the runner in a CommonJS and a `"type": "module"` project); the file-list spec is part
   of the harness runs above. `engines` is `>=20`, as on `main`, so `EBADENGINE` is not needed.
5. **Stop.** Left to the maintainer: the Trusted Publisher on npmjs.com; every Mermaid diagram checked by hand on the
   site built locally (`pnpm docs:preview`); pushing, and CI's run on PR #60.
