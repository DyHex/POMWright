# The last plan: before the merge of 3.0.0

Working document, kept in `release-3.0.0/` beside the plans it closes. It turns step C8 of
[PLAN-5-DOCS.md](PLAN-5-DOCS.md) (plan 13's pre-merge step, decision 7.27) into a plan of its own, so that it is not
forgotten while other work comes first. File links are relative to this folder.

Written 2026-10-19. **Awaiting review.** Runs last: after the improvements to the documentation site, which are made
one at a time as the user names them, without a plan; after every fix that the 3.0.0 test on one 2.1.0 consumer project
brings up, each through a plan of its own numbered before this one in [PLANS.md](PLANS.md); and only when the user says
the branch is ready for `main`.

Every claim below was checked on 2026-10-19 against HEAD 4d125f1 plus the uncommitted `docs:*` scripts: the inventory of
references with `grep` over the working tree, the switched `pages.yaml` with actionlint 1.7.12 (downloaded to the
scratchpad, release checksum verified) on a scratchpad copy, the vault folder with `ls`.

---

## 1. Why a separate plan

C8 is short, but four things in it are easy to miss and costly when missed:

- the site keeps deploying from the 3.0.0 branch, so a later push to it overwrites what `main` deployed;
- the pre-release banner and `noindex` ship to the released site, and search engines never list the docs;
- `release-3.0.0/`, which AGENTS.md cites on sixteen lines, disappears, leaving rules that point at nothing;
- the branch stays allowed in the `github-pages` environment.

## 2. Preconditions

All of these hold before step 1 starts:

1. The documentation site improvements the user asked for are done, and every plan before this one in
   [PLANS.md](PLANS.md) is executed, including every plan the consumer project's migration produces.
2. The 3.0.0 test on the consumer project is done and the user is satisfied with it. Its findings are fixed through
   their own plans; this plan adds nothing to the library.
3. The user says the branch is ready for `main`.
4. Draft PR #46 is green on its last push, and the working tree is clean apart from this plan's own changes.

## 3. Current state (verified 2026-10-19)

| item | where | state |
| --- | --- | --- |
| deploy trigger | [pages.yaml](../.github/workflows/pages.yaml) | `push` to `chore/bugfixes-quality-improvements-and-docs`, plus `workflow_dispatch`; the `workflow_run` trigger commented out |
| banner | [Banner.astro](../website/src/components/Banner.astro), its `components.Banner` entry in [astro.config.mjs](../website/astro.config.mjs) | on every page |
| `noindex` | the `head` entry in [astro.config.mjs](../website/astro.config.mjs) | on every page |
| pages that describe the deployment | [internal/documentation.md](../website/src/content/docs/internal/documentation.md) (already describes it as it runs after the merge), [internal/tests-and-checks.md](../website/src/content/docs/internal/tests-and-checks.md) | to re-read |
| `release-3.0.0/` | this folder: 15 Markdown files tracked plus this plan, `PLAN-5-DOCS-samples/` (11 files, tracked), `handover-plan-10/` and `handover-plan-11/` (untracked) | to move |
| the vault | `/home/magdys/jottacloud/knowledgeVault/POMWright/` | exists, holds `Docs/`, `Specs 2.0/` and a drafts note; no `release-3.0.0/` yet |
| AGENTS.md's references to the folder | the repository map's `release-3.0.0/` row; the dev-dependency rule in section 5; all of section 6; the do-not that cites `RELEASE-NOTES-3.0.0.md`; section 9's first bullet, the page-shapes bullet (`PLAN-5-DOCS.md` section 2.4) and the pre-merge checklist; the revision line | to rewrite |
| the environment | GitHub, `github-pages` environment, deployment branches | `main` and the 3.0.0 branch |

No file outside `AGENTS.md` and `release-3.0.0/` names the folder: the site's pages, the scripts and the workflows do
not.

## 4. Steps

### Step 1. `pages.yaml` deploys from `main`

Replace the `push` trigger with `workflow_run`, guard the build job as `publish.yaml` guards its own job, and check out
the commit CI tested. On `workflow_run` the default checkout is the default branch's newest commit, which may be newer
than the one whose checks passed; a manual run builds the commit it was started on. The trigger part and the build job's
head become:

```yaml
on:
  workflow_run:
    workflows: [CI]
    branches: [main]
    types: [completed]
  workflow_dispatch:
```

```yaml
  build:
    name: Build the site
    # as publish.yaml guards itself: a successful CI run of a push to main in this repository, or a manual run
    if: >-
      github.event_name == 'workflow_dispatch' || (
      github.event.workflow_run.conclusion == 'success' &&
      github.event.workflow_run.event == 'push' &&
      github.event.workflow_run.head_branch == 'main' &&
      github.event.workflow_run.head_repository.full_name == github.repository)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          # the commit CI tested; a manual run builds the commit it was started on
          ref: ${{ github.event.workflow_run.head_sha || github.sha }}
```

The header comment loses its pre-release sentences. This exact variant passes actionlint 1.7.12 (2026-10-19).

### Step 2. The banner and `noindex` go

Delete `website/src/components/Banner.astro`; remove the `Banner` entry of `components` and the `head` entry, with their
pre-release comments, from `astro.config.mjs`. Build with `pnpm docs:build` and confirm that no page of `website/dist`
contains `class="prerelease"` or `name="robots"`.

### Step 3. The pages that describe the deployment

Re-read [internal/documentation.md](../website/src/content/docs/internal/documentation.md) and
[internal/tests-and-checks.md](../website/src/content/docs/internal/tests-and-checks.md) against the switched workflow
and change what no longer holds; search `website/` and the README for "pre-release", "banner", "noindex" and the
branch name.

### Step 4. The verification

`pnpm format`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `pnpm pack-test --reporter=line` on chromium, firefox and
webkit (a pull request runs chromium only; firefox and webkit would otherwise first run in `CI` after the merge),
`pnpm docs:build`, and actionlint over every workflow. A fix found here is a commit of this step.

### Step 5. The ledgers, for the last time

PLANS.md, this plan's execution note and DECISIONS.md record steps 1 to 4, and the release notes drop their status
markers and their working-draft note, so the copy in the vault is the finished text. This commit is the last one that
touches `release-3.0.0/` before step 6 removes it.

### Step 6. `release-3.0.0/` moves to the vault

1. Copy every Markdown file of `release-3.0.0/`, except `handover-plan-*/` and `PLAN-5-DOCS-samples/`, to
   `/home/magdys/jottacloud/knowledgeVault/POMWright/release-3.0.0/`, keeping the folder's layout; compare the file
   list and the checksums of the copy with the source. Links between the copied files keep working; links to `../src`
   and other repository paths do not, and are left as they are.
2. Delete `release-3.0.0/` from the repository with `git rm -r`. The untracked handover folders go with it: they were
   never committed, so ask before deleting them, or move them out of the working tree first.

### Step 7. AGENTS.md without the folder

Rewrite every reference from section 3's table so that each rule still holds on its own:

- the repository map loses the `release-3.0.0/` row;
- section 5's dev-dependency rule names where a new dev dependency is recorded instead of `DECISIONS.md` (decision 8.2);
- section 6, *The 3.0.0 workflow*, becomes the workflow for future work (decision 8.1);
- the do-not that cites `RELEASE-NOTES-3.0.0.md` keeps its list of removed behaviour, which already names every item,
  and drops the citation;
- section 9 drops `release-3.0.0/PLAN-5-DOCS.md` and states the page shapes of its section 2.4 itself (they are already
  summarised there), and loses the pre-merge checklist, which this plan has carried out;
- the revision line names this plan's execution.

A final `grep` for `release-3.0.0`, `PLAN-`, `DECISIONS.md` and `RELEASE-NOTES` over the repository, `docs/` excluded
(frozen), finds nothing.

### Step 8. Memory and hand-over

The assistant's memory notes on the 3.0.0 workflow and the docs site are updated to say that 3.0.0's working folder is
in the vault and the plan sequence is closed. No commit.

## 5. After the steps: the merge and the release (yours)

1. Push the branch on your word; PR #46 out of draft once it is green.
2. Merge PR #46. `CI` runs on `main` with all three browsers; when it succeeds, `pages.yaml` deploys the site from that
   commit and `publish.yaml` opens the *Version Packages* pull request.
3. Check the site: no banner, no `noindex`, the edit links reach `main`. The assistant can check it on request, as in
   plan 13's step C3.
4. Merge *Version Packages*: Publish releases 3.0.0 to npm with provenance; the changelog entry starts with
   `documentation-site-and-upgrade-guide`. Until then the site documents a version npm does not serve yet, which the
   merge order keeps to the time between the two merges.
5. Remove the 3.0.0 branch from the `github-pages` environment's deployment branches.

## 6. Versioning

No changeset: nothing a consumer installs changes. The banner and `noindex` were never part of a release.

## 7. Decisions

- [ ] 8.1 **Section 6 after 3.0.0.** (a) **Recommended:** keep the workflow for future work, in general terms: a
  `release-<version>/` working folder while a release is planned, plan first and one item at a time, the ledgers, the
  folder moved to the vault before the merge. (b) Drop section 6; keep only "commits only when asked" and "verified
  claims only" in section 5. (c) Something else you describe.
- [ ] 8.2 **Where a new dev dependency is recorded.** (a) **Recommended:** in the plan or the commit that adds it, with
  its reason, and in the working folder's decisions log while one exists. (b) In a `DEPENDENCIES.md` of its own at the
  root.
- [ ] 8.3 **The untracked handover folders.** (a) **Recommended:** you move them where you keep them before step 6;
  the assistant only checks that they are gone. (b) The assistant copies them to the vault too. (c) They are deleted.
- [ ] 8.4 **The release notes' last state.** (a) **Recommended:** step 5 removes the status markers and the
  working-draft note, so the vault keeps a finished text you can reuse for an announcement. (b) The vault keeps them as
  they are.
- [ ] 8.5 **Firefox and webkit before the merge.** (a) **Recommended:** step 4 runs all three locally, as above. (b)
  Rely on `CI` after the merge, which blocks Publish, not the merge.

## 8. Execution order

One commit per step that changes the repository (1 to 7), the message style of `git log`, the body ending with
"Plan: release-3.0.0/PLAN-PRE-MERGE.md, execution step N." and the `Co-Authored-By` trailer; steps 6 and 7 name the
plan as it was, since the file is gone by then. Step 8 has no commit. Nothing is pushed without your word.
