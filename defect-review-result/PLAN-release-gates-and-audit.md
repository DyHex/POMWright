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

(filled in at execution)
