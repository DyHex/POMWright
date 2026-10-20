# The last plan: before the merge of 3.0.0

Working document, kept in `release-3.0.0/` beside the plans it closes. It turns step C8 of
[PLAN-5-DOCS.md](PLAN-5-DOCS.md) (plan 13's pre-merge step, decision 7.27) into a plan of its own, so that it is not
forgotten while other work comes first. File links are relative to this folder.

Written 2026-10-19, revised 2026-10-20: nothing in `release-3.0.0/` is kept, so the folder is deleted instead of moved
to the vault, after an audit (section 3) moved what was recorded only there into the repository. **Agreed 2026-10-20**, every
decision as recommended; not executed.
Runs last: after the improvements to the documentation site, which are made one at a time as the user names them,
without a plan; after every fix that the 3.0.0 test on one 2.1.0 consumer project brings up, each through a plan of its
own numbered before this one in [PLANS.md](PLANS.md); and only when the user says the branch is ready for `main`.

The claims of section 4 were checked on 2026-10-20 against HEAD b97f62f plus the audit's uncommitted changes: the
inventory with `grep` over the working tree, the workflow and the site configuration by reading them. The `pages.yaml`
variant of step 1 passed actionlint 1.7.12 on 2026-10-19 with `actions/checkout` v4.4.0; plan 14 has since moved every
workflow to v7.0.1, so step 1 runs actionlint again.

---

## 1. Why a separate plan

C8 is short, but four things in it are easy to miss and costly when missed:

- the site keeps deploying from the 3.0.0 branch, so a later push to it overwrites what `main` deployed;
- the pre-release banner and `noindex` ship to the released site, and search engines never list the docs;
- `release-3.0.0/`, which AGENTS.md cites throughout, disappears, leaving rules that point at nothing;
- the branch stays allowed in the `github-pages` environment.

## 2. Preconditions

All of these hold before step 1 starts:

1. The documentation site improvements the user asked for are done, and every plan before this one in
   [PLANS.md](PLANS.md) is executed, including every plan the consumer project's migration produces.
2. The 3.0.0 test on the consumer project is done and the user is satisfied with it. Its findings are fixed through
   their own plans; this plan adds nothing to the library.
3. Section 3's audit is repeated for whatever was added to `release-3.0.0/` after 2026-10-20 (a plan of the consumer
   test, a decision row): anything a later reader needs is moved to the code, its tests, the doc comments, the site,
   the changesets or AGENTS.md before step 5 deletes the folder's other files.
4. The user says the branch is ready for `main`.
5. Draft PR #46 is green on its last push, and the working tree is clean apart from this plan's own changes.

## 3. The audit of `release-3.0.0/` (2026-10-20)

Every file of the folder was read against the repository, so that deleting it loses nothing a reader needs:

- **Covered already.** Every analysis item is ticked *Fix* or *Skip*; every item of the release notes is *done*, none
  *planned* or *roadmap*; the decisions log has no open question; every plan but this one is executed. About 45
  behaviours, limitations and rejected alternatives that the decisions and plans call documented were looked up on the
  site and found (among them the WebKit iframe storage, the `seed` failures and their messages, the `beforeAll` modes,
  `noImplicitOverride`, the query as part of a page's identity, no shared definition between instances). The reasons
  behind the design are on the Internal pages. Consumer-facing changes are in the changesets, which become the 3.0.0
  changelog entry and its GitHub release; the release notes' tooling, CI and test items are repository work, embodied
  in the code.
- **Moved into the repository** (uncommitted on 2026-10-20, committed before this plan runs):
  - AGENTS.md section 7: the packaging probes run before a release (from plan 4, decision 7.18), and the work left for
    after 3.0.0 (the changesets 3 and action v2 upgrade with npm Trusted Publishing, from plan 14 section 5; TypeScript
    7; Node 26; publishing the tested tarball; a context-wide `seed` option for new tabs; what was considered and not
    planned);
  - AGENTS.md section 9: the docs' principles, page shapes, diagram rules and example rules of `PLAN-5-DOCS.md`
    sections 2.2, 2.4 and 2.12, the "Added in" rule included, so section 9 no longer cites the plan for them;
  - AGENTS.md section 6 and the section 9 checklist: the folder is deleted, not copied to the vault.
- **References that would have dangled, removed:** the citations of analysis items in nine changesets, which would have
  reached the public changelog; "Up to plan 15" on the Internal page *The seed registry*; plan and review ids in nine
  code and test comments and one test title. npm provenance, missing from every changeset, is a line in
  `package-exports-and-engines.md`.
- **Nothing to keep:** `handover-plan-10/` and `handover-plan-11/` are empty and untracked; `PLAN-5-DOCS-samples/` was
  the prototype of pages that now exist.

## 4. Current state (verified 2026-10-20)

| item | where | state |
| --- | --- | --- |
| deploy trigger | [pages.yaml](../.github/workflows/pages.yaml) | `push` to `chore/bugfixes-quality-improvements-and-docs`, plus `workflow_dispatch`; the `workflow_run` trigger commented out; pre-release sentences in the header comment |
| banner | [Banner.astro](../website/src/components/Banner.astro), its `components.Banner` entry in [astro.config.mjs](../website/astro.config.mjs) | on every page |
| `noindex` | the `head` entry in [astro.config.mjs](../website/astro.config.mjs) | on every page |
| pages that describe the deployment | [internal/documentation.md](../website/src/content/docs/internal/documentation.md), [internal/tests-and-checks.md](../website/src/content/docs/internal/tests-and-checks.md) | to re-read |
| `release-3.0.0/` | this folder: the Markdown files and `PLAN-5-DOCS-samples/`, tracked; `handover-plan-10/` and `handover-plan-11/`, empty and untracked | to delete |
| AGENTS.md's references to the folder | the revision line; the repository map's `release-3.0.0/` row; "every claim in the analysis" in section 3; "(plan 16)" in section 5; the dev-dependency rule in section 5; all of section 6; the "(see *After 3.0.0*)" and C8 wording of section 7; the do-nots that cite `RELEASE-NOTES-3.0.0.md`, the analysis and C8; section 9's first bullet (`release-3.0.0/PLAN-5-DOCS.md`) and the pre-merge checklist | to rewrite |
| references outside AGENTS.md | none: a `grep` for `release-3.0.0`, `PLAN-`, `DECISIONS`, `RELEASE-NOTES`, `plan <n>`, `analysis <n>` and review ids such as `R7` over `src`, `test`, `scripts`, `website`, `.github`, `.changeset`, the README and `index.ts` finds nothing | kept so |
| the environment | GitHub, `github-pages` environment, deployment branches | `main` and the 3.0.0 branch |

## 5. Steps

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
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          # the commit CI tested; a manual run builds the commit it was started on
          ref: ${{ github.event.workflow_run.head_sha || github.sha }}
```

The header comment loses its pre-release sentences. actionlint (downloaded to the scratchpad with its release checksum
verified, never a dependency) reports nothing. `actions/checkout` v7 refuses a fork's pull request under
`workflow_run`; the guard admits only this repository's `main`, so it does not apply.

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
`pnpm docs:build`, actionlint over every workflow, and the packaging probes of AGENTS.md section 7 against the packed
tarball in a scratchpad project (the file list, Node 20 and 24 with one shared copy, the four TypeScript resolution
modes, attw, the runner in CommonJS and ESM projects, the Node 18 warning). A fix found here is a commit of this step.

### Step 5. `release-3.0.0/` is deleted, all but this plan

1. Repeat the audit of precondition 3 one last time over the folder as it stands.
2. `git rm -r` every tracked file of `release-3.0.0/` except this plan, `PLAN-PRE-MERGE.md`, and delete the two empty
   untracked handover folders (decision 8.3). Nothing is copied anywhere; git history keeps every file.
3. This plan stays: the user deletes it, and with it the folder, before the merge (decision 8.5).

No ledger is updated before the deletion: PLANS.md, DECISIONS.md and the release notes go with the folder, and this
plan's execution is recorded in its commits and, for each step, in a line of section 10 below.

### Step 6. AGENTS.md without the folder

Rewrite every reference of section 4's table so that each rule still holds on its own:

- the revision line names this plan's execution;
- the repository map loses the `release-3.0.0/` row;
- section 3's "every claim in the analysis was verified that way" becomes a statement of the standard itself, and
  section 5's "(plan 16)" goes;
- section 5's dev-dependency rule names where a new dev dependency is recorded instead of `DECISIONS.md` (decision 8.2);
- section 6, *The 3.0.0 workflow*, becomes the workflow for future work (decision 8.1);
- section 7 loses the C8 wording of the `pages.yaml` bullet; the pending-changesets bullet stays (it is true until the
  Version Packages pull request consumes them), and so do the packaging probes and *After 3.0.0*;
- the do-not that cites `RELEASE-NOTES-3.0.0.md` keeps its list of removed behaviour, which already names every item,
  and drops the citation; the do-not on re-deriving the analysis's findings goes; the do-not on merging with the banner
  becomes a rule on the deployment itself;
- section 9 drops `release-3.0.0/PLAN-5-DOCS.md` from its first bullet and loses the pre-merge checklist, which this
  plan has carried out.

A final `grep` for `release-3.0.0`, `PLAN-`, `DECISIONS`, `RELEASE-NOTES`, `C8`, `plan <n>`, `analysis <n>` and review
ids such as `R7` over the repository, `docs/` and `CHANGELOG.md` excluded (frozen) and this plan excluded (the user
deletes it), finds nothing.

### Step 7. Memory and hand-over

The assistant's memory notes on the 3.0.0 workflow and the docs site are updated to say that the plan sequence is
closed and `release-3.0.0/` is gone, kept nowhere; the notes that point at the vault are corrected. No commit.

## 6. After the steps: the merge and the release (yours)

1. Delete `release-3.0.0/PLAN-PRE-MERGE.md`, and with it the folder, yourself (8.5), and commit that.
2. Push the branch on your word; PR #46 out of draft once it is green.
3. Merge PR #46. `CI` runs on `main` with all three browsers; when it succeeds, `pages.yaml` deploys the site from that
   commit and `publish.yaml` opens the *Version Packages* pull request.
4. Check the site: no banner, no `noindex`, the edit links reach `main`. The assistant can check it on request, as in
   plan 13's step C3.
5. Merge *Version Packages*: Publish releases 3.0.0 to npm with provenance; the changelog entry starts with
   `documentation-site-and-upgrade-guide`. Until then the site documents a version npm does not serve yet, which the
   merge order keeps to the time between the two merges.
6. Remove the 3.0.0 branch from the `github-pages` environment's deployment branches.
7. Then the work of AGENTS.md section 7's *After 3.0.0*, starting with the release tooling on the first patch release.

## 7. Versioning

No changeset: nothing a consumer installs changes. The banner and `noindex` were never part of a release.

## 8. Decisions

- [x] 8.1 **Section 6 after 3.0.0.** (a) **Recommended:** keep the workflow for future work, in general terms: a
  `release-<version>/` working folder while a release is planned, plan first and one item at a time, a decisions log
  and release notes in that folder while it exists, an audit like section 3 and the folder deleted before the merge.
  (b) Drop section 6; keep only "commits only when asked" and "verified claims only" in section 5. (c) Something else
  you describe. Agreed 2026-10-20: (a).
- [x] 8.2 **Where a new dev dependency is recorded.** (a) **Recommended:** in the plan or the commit that adds it, with
  its reason, and in the working folder's decisions log while one exists. (b) In a `DEPENDENCIES.md` of its own at the
  root. Agreed 2026-10-20: (a).
- [x] 8.3 **The untracked handover folders.** (a) **Recommended:** deleted with the folder in step 5; both are empty.
  (b) You remove them yourself before step 5. Agreed 2026-10-20: (a).
- [x] 8.4 **Firefox and webkit before the merge.** (a) **Recommended:** step 4 runs all three locally, as above. (b)
  Rely on `CI` after the merge, which blocks Publish, not the merge. Agreed 2026-10-20: (a).
- [x] 8.5 **This plan's own file.** The assistant does not delete `PLAN-PRE-MERGE.md`; step 5 leaves it, and the user
  deletes it, and the then-empty `release-3.0.0/`, before the merge. The user's instruction, 2026-10-20.

## 9. Execution order

One commit per step that changes the repository (1 to 6), the message style of `git log`, the body ending with
"Plan: release-3.0.0/PLAN-PRE-MERGE.md, execution step N." and the `Co-Authored-By` trailer. Step 7 has no commit.
Nothing is pushed without your word. The file is never deleted by the assistant (8.5).

## 10. Execution note

Executed 2026-10-20, one commit per step, each naming the plan and the step in its message (`git log --grep
PLAN-PRE-MERGE`); a commit before step 1 recorded the agreement and decision 8.5. Preconditions: PR #46 green on its
last push (a909cbb, every check); nothing added to the folder since the audit.

- Step 1: `pages.yaml` runs on `workflow_run` after `CI` on `main` plus `workflow_dispatch`, its build job guarded as
  `publish.yaml`'s and checking out the CI run's `head_sha`; the header comment states it. actionlint 1.7.12 (release
  checksum verified, in the scratchpad) reports nothing over every workflow.
- Step 2: `Banner.astro` deleted, its `components` entry and the `noindex` `head` entry removed from `astro.config.mjs`
  with their comments; `pnpm docs:build` passes with every link valid, and none of the 53 pages of `website/dist` holds
  `class="prerelease"` or `name="robots"`.
