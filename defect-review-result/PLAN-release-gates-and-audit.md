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

### Between the parts, 2026-10-28

- The maintainer pushed `6c53973` to `299abdb`; every check on PR #60 passed, the `consumer` job and the file-list spec
  among them (gate 4). The maintainer checked every Mermaid diagram on `pnpm docs:preview`.
- **The Trusted Publisher allows `npm publish`** (the maintainer, after npm's current docs were read): with a
  stage-only publisher, npm's default for one created after 3 September 2026, a version waits for approval with 2FA, but
  `changeset publish` runs `pnpm publish` (`@changesets/cli` 3.0.3, `getPublishPlan.mjs:349`) and has no staging; a
  stage-only setup needs a publish script of its own (`pnpm stage publish`, the `CHANGESETS_OUTPUT` file the action reads
  for the tag and the GitHub release, staging only on the release commit, since CI cannot list staged versions), and
  npm's docs leave the attestation after approval unknown. So a release goes live when Publish runs, with provenance; the
  human gate is merging the Version Packages pull request. Reverses decision 3's "manual 2FA approval on npmjs.com stays
  on". The publisher is set up right before PR #60 is merged: npm expires one whose first publish does not succeed
  within 2 days. Environment: none, unless the maintainer finds that anyone else can push.
- **The folder stays for a second defect review** of this branch, which reads it as a reference (the findings, their
  reproductions, the fixes and the issues) and confirms everything itself. Step 3's removal waits until that review is
  done and the maintainer says so; the audit's moves (step 2) go ahead.
- Issues: #53 (release tooling) is done here and closed once 3.0.2 is published; #61's 3.x half is done here
  (`49454c6`), its 2.x release is the maintainer's decision; #54, #55, #56, #57, #59 and #62 untouched; #58's body
  already holds the comment decision 38 drafted. #54's body names `check-doc-snippets.mjs` as a compiler-API user (it
  runs `tsc`), as AGENTS.md §3 does.

### Part 2, 2026-10-28

**Read.** In full: report.md, PLANS.md, DECISIONS.md, the eight summaries' test gaps, *Outside the scope*, *Considered
and not filed* and *Decisions taken without asking*, and every plan's *Execution notes*. Searched (deferred or
breaking-only work, issues, rejected alternatives): the 56 finding files, the eight briefs, the plans' other sections,
scopes.md, inventory.md and baseline.md; their fix options and reasons are superseded by the decisions. Each decision's
reasons and rejected options checked against the Internal pages, AGENTS.md and the code comments.

**Already in place** (nothing to move): the reasons of decisions 4 (*Tests and checks*), 13, 14, 26 and 60 (*The seed
registry*), 16 (*Page object lifecycle*), 19 (`navigation.ts`'s comment on `goto`), 21 (`IsSingleLiteral`), 24 and 39/70
(*Packaging*), 27 (the builder's comment on `persist`), 30 (`sessionStorageSeed.ts`'s comment), 31 (*Tests and checks*),
37 (*Call sites*), 43 (*Builders*), 53 (*Documentation*); every deferred item is an issue (#53 to #59, #61, #62; draft
08, a retry of a seed, is AGENTS.md §5's rule). Outside the folder, no finding ID, plan, decision number or reference to
it: AGENTS.md §6's two lines describe the process.

**To move** (proposed, one commit):

1. AGENTS.md §3: the compiler API is used by tsup's declaration build, `check-api-coverage.mjs` and
   `check-error-messages.mjs`; the snippet check runs `tsc`.
2. The release without approval on npmjs.com: `publish.yaml`'s header comment, the attestation step's comment and its
   warning; AGENTS.md §7 (the merge rule's "with manual approval on npmjs.com, until it is approved there"; the Trusted
   Publishing bullet: the publisher allows `npm publish`, why not stage-only, the 2-day first-publish window);
   *Internal → Tests and checks* ("the version appears once the maintainer approves it on npmjs.com"). The PR run
   validates the workflow's lint.
3. AGENTS.md §2, the `lint` job: ShellCheck pinned beside actionlint (decision 67).
4. AGENTS.md §7, *Considered and not planned*: a punctuation convention for messages (decision 54), a spelling check
   (52), the harness on Node 22, which 20 and 24 bracket (8), and attaching each log entry once or throwing on a second
   `attachLogsToTest` (41). There is no Internal page for logging or for these process choices.
5. *Internal → The seed registry*: the origin check around every storage call (decision 9): `page.url()` before and
   after, no round trip; detected, not prevented; a guarded evaluation in the page rejected (it leaves
   `page.sessionStorage` and runs in the page's main world).
6. *Internal → URL matching*, *Alternatives weighed*: a string page's `fullUrl` as a `UrlMatcher` (a major), and a
   `fullUrl` by browser (a page object cannot learn its browser reliably) (decision 17).
7. *Internal → Builders*: the path format is checked by template-literal patterns, every broken rule in the runtime's
   order, not by a walk per character, which hit TypeScript's 1,000-level limit (TS2589) at 999 characters and cost
   about ten times the instantiations (decision 22).
8. *Internal → Packaging*, *Declarations*: Playwright's types are not re-exported; they come from `@playwright/test`,
   as `expect` does (decision 70).
9. This folder, PLAN-H-5's step 5: the grep pattern spells parts of the external consumer projects' names; worded
   without them.
10. DECISIONS.md 72 and 73 (the two changes above), PLANS.md row 41.

**Issue drafts** for the maintainer to file (`backlog`):

- *Staged publishing: a version waits for approval with 2FA on npmjs.com.* The stage-only publisher, a publish script
  (`pnpm stage publish` on the release commit only; the `CHANGESETS_OUTPUT` events for the tag and the release, or the
  tag only after approval), the attestation and the `latest` tag after approval to be proven by a release.
- *Publish only from `main`: a GitHub environment for the publish job.* Worth it once anyone else can push: npm's
  Trusted Publisher matches the repository and the workflow file name, not the branch, so any branch's `publish.yaml`
  could publish; an environment limited to `main`, named in the publisher (which is deleted and added again).

**Left in the folder for the second review** (not moved; the review decides): report.md §9's *Considered and not
filed* (a `seed` on a closed page, `set({})` on `about:blank`, a seed outliving a test on a shared page, a RegExp base's
`goto` type with a colon, `UrlMatcher.test()` with a relative string, the matcher's RegExp objects, `@step()` on a
getter under `experimentalDecorators`); E's test gap 7 (no page says that returning a decorated method's Promise
without `await` leaves an unboxed step without a location, as Playwright's own); the British spellings left in specs and
unit tests written before this branch, and `normaliseOrigin` (plan 38's notes); R-3.

**For the second review** (the maintainer, 2026-10-28): segments run one at a time on the branch's latest commit;
tests run for the baseline and then only where they add something; each segment maps and reviews its area blind, then
reads the first review (re-running its reproductions), reconciles both mappings both ways, and hunts again where they
disagree; agents write each finding to a file as it is confirmed and end with one line per finding; each segment reads
the guide's files for its scope up front, and each segment's consolidation reads all of them up front (the root index
asks for that when a task spans several areas). Results in `defect-review-result-2/`.

**For the second review**, added to this folder in the same commit: report.md's ledger gains each finding's plan and
commits; the issue drafts' numbers mapped to GitHub (01 to 07 are #53 to #59; #61 and #62 were filed from the
walkthrough).

**The consumer projects' names**: besides item 9, the full names are in `a49709d`'s DECISIONS.md and finding files,
removed by `c1186ed`; the branch's history is kept as it is (the maintainer's rule), so they stay reachable from it.

### Part 2, the moves, 2026-10-28

The maintainer agreed to items 1, 2, 3, 5 and 6 and to the first two parts of item 4; done:

- 1: AGENTS.md §3; `.github/dependabot.yml`'s comment ("two of the doc checks").
- 2: `publish.yaml`'s header comment, the attestation step's comment and its warning (no approval named);
  AGENTS.md §7, the merge rule and the Trusted Publishing bullet (`npm publish` allowed, the stage-only publisher
  considered and not adopted, the 2-day window); *Internal → Tests and checks*.
- 3: AGENTS.md §2, ShellCheck beside actionlint (checked in `checks.yaml`'s lint step: both by version and SHA-256).
- 4: AGENTS.md §7, a punctuation convention and a spelling check (no script or test; §9's rule is kept by review).
  **Attaching each log entry once**: dropped, at the maintainer's question; the behaviour is documented (`attachLogsToTest`'s
  doc comment and API entry, *Your own fixture*), so a review does not meet it as undocumented. **Node 22**: waiting for
  the maintainer. Node's schedule (`nodejs/Release`'s `schedule.json`, read today): Node 20 reached its end of life on
  2026-04-30, Node 22 is in maintenance until 2027-04-30, Node 24 entered maintenance on 2026-10-20, and Node 26 becomes
  LTS on 2026-10-28; Playwright 1.64.0's `engines` is `>=20`, as POMWright's. CI runs 20 (the floor job, chromium) and
  24; 22 and 26 are the supported lines it does not run.
- 5: *The seed registry*, a section *The origin around every call*; *Builders*, the format check's paragraph;
  *Packaging*, why Playwright's types are not re-exported. *URL matching* needed nothing: its `fullUrl` section already
  names both alternatives of decision 17 (the keyword search missed it).
- 6: PLAN-H-5's grep pattern; DECISIONS.md 72 and 73; PLANS.md rows 41 and 42 and the maintainer's actions.
- For the second review: report.md's ledger gains the *Plan* and *Commits* columns, generated from PLANS.md's table and
  the plan file names (merged findings take their keeper's plan; R-3 and R-4 have none), and the issue drafts' numbers
  mapped to GitHub.
- Issue drafts: staged publishing dropped (decision 72). The GitHub environment is done in this branch instead: plan 42,
  whose file holds the maintainer's step-by-step guide.
- Checks: `pnpm lint` 0; `pnpm test:unit` 0; `pnpm docs:build` 0 (53 pages); actionlint 1.7.12 with ShellCheck 0.11.0
  (both checked against `checks.yaml`'s SHA-256 values) 0; `pnpm pack-test --reporter=line` exit 0 (1,746 passed, 3
  skipped; doc snippets 226; api coverage 0 problems; error messages 0 problems; step locations 31).
- **Stop**: the commit changes `publish.yaml` (comments and a warning's text); the maintainer pushes and CI's run checks
  it. Node 22 and plan 42 wait for the maintainer.
