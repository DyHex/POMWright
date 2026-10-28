# Plan: the release window (2G-1 with 2G-2)

- **Decision**: [79](DECISIONS.md) (2026-10-28)
- **Findings**: [2G-1](G-ci-release-publishing/defect-2G-1-publish-guard-judges-the-tested-commit.md) (Medium),
  [2G-2](G-ci-release-publishing/defect-2G-2-publish-rerun-goes-on-after-main-moved.md) (Low)
- **Bump**: none (CI and the contributor guide; nothing published changes), so no changeset
- **Stop**: **yes**, after the commit: the maintainer pushes, and PR #60's run checks the workflows, runs the new test
  and runs the `release` job for real; the maintainer then sets up the rulesets (the guide below) and confirms them on
  PR #60. The guard's real run comes with the first Publish run after the merge.
- **Depends on**: nothing; item 28 (2G-5, 2H-1) edits the same section of *Tests and checks* later

## Contract

A version on `main` that npm does not have while changesets are pending is never published: changesets/action
publishes only when no changeset is pending, and its next Version Packages pull request bumps past that version. After
this plan, `main` cannot get there through a pull request, and Publish reports it if it gets there another way.

1. **Every pull request into `main` is held while a release publishes.** The gate `build` of `pr.yaml` needs a new job,
   `release`, which judges the pull request's merge commit (its first parent is `main`'s tip):
   - its version is on npm: passes (every pull request between releases, and the revert of a release);
   - the pull request sets the version and no changeset is pending: passes (the Version Packages pull request);
   - the pull request sets the version while changesets are pending: fails at once, "wait for Publish to rebuild it"
     (a Version Packages pull request brought up to date with `main` after a changeset landed: GitHub's
     **Update branch** merges `main` in without running `changeset version`);
   - otherwise `main`'s version is not on npm, so a release is publishing: it reads npm every 30 seconds and passes when
     the version is there; after 30 minutes it fails, "check its Publish run; if it cannot publish, revert the Version
     Packages pull request".
2. **The hold binds every merge.** `main`'s branch protection rule becomes two rulesets: `main: review` keeps today's
   review rules, and repository admins may bypass it when merging a pull request, because the only maintainer cannot
   approve their own; `main: checks` requires `build` and an up-to-date branch, blocks deletion and force pushes, and
   nobody may bypass it. Up to date matters: a pull request whose `build` passed before the Version Packages pull
   request was merged is out of date after it, and must be updated, which runs `release` again.
3. **Publish judges `main`'s tip, not the tested commit.** The guard step of `publish.yaml`:
   - reads `main`'s tip from GitHub (`git fetch origin refs/heads/main`), not from the checkout, which a re-run keeps
     from its first start;
   - fails while the tip's version is not on npm and changesets are pending there, after reading npm once more 5½
     minutes later (npm serves its list with `max-age=300`, so it can be five minutes old right after a publish), and
     says to revert the Version Packages pull request that set the version;
   - goes on (`current=true`) only when the tested commit, the tip and the checkout are one commit; otherwise it stops
     quietly, and the newer commit's own run continues the release.
4. Both checks read npm with an assignment, so a failed `npm view` fails the step with npm's error, never with a revert
   instruction.

## Current behavior (at `d850405`)

- [publish.yaml:45-67](../.github/workflows/publish.yaml#L45-L67): goes on when the checkout is the tested commit, and
  fails only when `main` moved past a tested release commit whose version is not on npm (decision 4, point 2). The
  three paths of 2G-1 and the re-run of 2G-2 are reproduced by `G/guard/sim.sh` and `G/guard/rerun.sh` in the second
  review's probes folder (re-run 2026-10-28 in the triage, output identical to the review's).
- [pr.yaml:18-29](../.github/workflows/pr.yaml#L18-L29): the gate `build` needs `checks` only. Nothing in a pull
  request's checks looks at npm.
- `main`'s branch protection rule: a pull request, one approval, Code Owners, conversations resolved, `build`, up to
  date; administrators may bypass all of it. The maintainer's own pull requests merge through that bypass (#44, #46 and
  #51 have no approving review), which skips the checks as well. The Version Packages pull requests are approved, not
  bypassed (#45, #50, #52).
- 3.0.0 reached npm 11 minutes after its Version Packages pull request was merged, 3.0.1 6½ minutes after.

## Verified in the triage

Prototypes in the second review's probes folder, `G/triage/`: `guard.sh` with `sim.sh` (ten paths of Publish), and
`pr-check.sh` with `pr-sim.sh` (ten paths of a pull request), with a fake `npm` and `sleep` on `PATH`. Every path ends
as the contract says; actionlint 1.7.12 and ShellCheck 0.11.0 (the pinned versions) pass on patched copies of
`publish.yaml` and `pr.yaml`. Also checked: PR #60's merge ref has `main`'s tip as its first parent; changesets/action
v2.1.2 neither publishes nor opens a pull request while only empty changesets are pending; `@changesets/read` 1.0.1
ignores dotfiles, `README.md` (any case), `AGENTS.md`, `CLAUDE.md` and `GEMINI.md`; npm's package document is served
from a CDN cache with `max-age=300`; pnpm 12.14.0's provenance records `GITHUB_SHA`. Two flaws of the review's sketches
were corrected: `git log -G'"version":'` named a commit that only changed the version line's formatting, and an npm read
in an `if` condition turned an npm outage into a revert instruction.

From GitHub's docs (their source, `github/docs`, read 2026-10-28): merge queues are "available in any public
repository owned by an organization, or in private repositories owned by organizations using GitHub Enterprise Cloud";
a ruleset lets certain users "bypass the rules in the ruleset", and the rules of all rulesets targeting a branch are
aggregated, the most restrictive version applying, alongside any branch protection rule; *Restrict deletions* and
*Block force pushes* are selected by default; with force pushes blocked, administrators cannot rename the default
branch unless they may bypass the ruleset. A depth-2 fetch of a merge commit reads its first parent's tree (probed).

Not verifiable before the rulesets exist: that the merge box offers no bypass of `main: checks` while it offers one of
`main: review`. Step 4 of the guide checks it: confirmed on 2026-10-28 (execution notes).

## The guide: your steps

Do steps 1 to 4 after this plan's commit is pushed and PR #60's run is green, and before merging PR #60. Nothing in
them depends on the npm Trusted Publisher, which still comes right before the merge.

### 1. Create the ruleset `main: checks`

1. Open `https://github.com/DyHex/POMWright/settings/rules` (**Settings**, then **Rules**, then **Rulesets** in the
   left sidebar).
2. Click **New ruleset**, then **New branch ruleset**.
3. **Ruleset Name**: `main: checks`. **Enforcement status**: **Active**.
4. **Bypass list**: leave it empty.
5. **Target branches**: click **Add target**, then **Include default branch**.
6. **Rules**, under *Branch rules*:
   - **Restrict deletions**: selected (the default).
   - **Block force pushes**: selected (the default).
   - **Require status checks to pass** (GitHub's docs call it *Require status checks to pass before merging*): select
     it. Under it, select **Require branches to be up to date before merging**, leave **Do not require status checks on
     creation** unselected, click **Add checks**, type `build`, and choose `build` with the GitHub Actions icon.
   - Leave every other rule unselected.
7. Click **Create**.

### 2. Create the ruleset `main: review`

1. Again **New ruleset**, then **New branch ruleset**.
2. **Ruleset Name**: `main: review`. **Enforcement status**: **Active**.
3. **Bypass list**: click **Add bypass**, select **Repository admin**, and click **Add selected**. In the dropdown next
   to it, choose **For pull requests only** (you can merge a pull request past these rules, but never push to `main`
   directly).
4. **Target branches**: **Add target**, then **Include default branch**.
5. **Rules**, under *Branch rules*:
   - **Restrict deletions** and **Block force pushes**: leave them as they are; `main: checks` already holds both for
     everyone.
   - **Require a pull request before merging**: select it. Under it: **Required approvals** `1`; select **Require review
     from Code Owners** and **Require conversation resolution before merging**; leave the other options as they are
     (an option GitHub selects by default, such as the extra approval for Copilot's unattributed pull requests, can
     stay); keep every merge method allowed.
   - Leave every other rule unselected.
6. Click **Create**.

### 3. Delete the old branch protection rule

Only after both rulesets show **Active**, so `main` is never unprotected:

1. Open `https://github.com/DyHex/POMWright/settings/branches`.
2. Next to the rule `main`, click **Delete**, and confirm.

### 4. Check them on PR #60

1. Open PR #60, go to **Checks**, and click **Re-run all jobs** on the latest `PR` run.
2. While `build` is still running, look at the merge box at the bottom of the **Conversation** tab: it must say that
   the required status check `build` is expected or in progress, with **no** option to bypass it. If it offers to
   merge anyway (for example **Merge without waiting for requirements to be met (bypass rules)** while `build` runs),
   the bypass of `main: review` reaches `main: checks` too: do not merge, and tell me.
3. When `build` has passed, the merge box should offer to merge through the bypass (you have no approving review): the
   bypass of `main: review` works. Do not merge yet if the Trusted Publisher is not set up.
4. The run's `Release window` job should say `3.0.1 is on npm`.

### 5. Optional: auto-merge

**Settings**, **General**, *Pull Requests*: select **Allow auto-merge**. It merges a pull request once its required
reviews and checks pass, so it works for the pull requests you approve (Dependabot's, the Version Packages pull
request) and not for your own, which need the bypass; for those, merge when `build` turns green.

### When a release is publishing

After you merge the Version Packages pull request, every other pull request's `build` waits (the `Release window` job)
until npm has the version, then passes; update a pull request (**Update branch**) and its `build` holds until then. Do
not use **Update branch** on a Version Packages pull request: `Release window` fails it, and Publish rebuilds it a few
minutes after the merge that made it stale. If a release cannot publish, pull requests fail after 30 minutes; fix the
Publish run, or revert the Version Packages pull request (its revert passes at once).

If `build` itself is broken (a flaky test, an outage) and something must merge, edit `main: checks` (set
**Enforcement status** to **Disabled**), merge (not while a release is publishing), and set it back to **Active**. The
same goes for renaming `main`: GitHub refuses it while a ruleset nobody may bypass blocks force pushes.

## Implementation (Claude)

1. `scripts/release-check.sh`, one script with two modes, `pull-request` and `publish`, holding both checks of the
   contract; shared: the count of pending changesets in a commit (`git ls-tree`, `@changesets/read`'s rule) and the
   npm check. No reference to this folder, a finding or a decision number in it.
2. `scripts/release-check.test.sh`: builds throwaway repositories (a bare origin and runner clones for Publish; GitHub's
   merge commits for pull requests), puts a fake `npm` and `sleep` first on `PATH`, runs every path of the triage's
   simulations against the script, and compares exit code, `current` output and the message with what the contract
   says; it exits 1 on any difference and prints each path.
3. `pr.yaml`: the `release` job (`name: Release window`, only for pull requests into `main`, `fetch-depth: 2`,
   `timeout-minutes: 40`, runs the script's `pull-request` mode); `build` needs `[checks, release]` and accepts a
   skipped `release`; the gate's comment names the ruleset `main: checks` instead of the branch protection rule.
4. `publish.yaml`: the guard step runs the script's `publish` mode; its comments, the checkout's `fetch-depth` comment
   (the guard reads `main`'s history from GitHub) and the header (the human gate) follow the contract.
5. `main.yaml`: the gate's comment names the ruleset.
6. `checks.yaml`, `lint` job: ShellCheck (the pinned one) over both scripts after actionlint, then the test.

## Docs

- `.github/AGENTS.md`: *The workflows* (the guard; the `release` job; the lint job's test), *Publish and Pages*, a
  section on the two rulesets (what each holds, why the review ruleset is bypassable and the checks one is not, the way
  out when `build` is broken), *Do not* (the gate's name and the ruleset; removing the `release` job or the up-to-date
  rule), and the list of scripts only CI runs.
- `docs/releases.md`, *Carrying out a release*: the hold replaces "merge nothing with a changeset"; never **Update
  branch** a Version Packages pull request; recovery by revert.
- *Internal → Tests and checks* (`website/src/content/docs/internal/tests-and-checks.md`), *CI*: the `release` job and
  the guard, why, and the alternatives rejected (decision 79, point 7), without line numbers.
- `docs/repository.md`: the two scripts in the `scripts/` row.

## Verification before the commit

`pnpm lint`; `pnpm test:unit`; actionlint 1.7.12 with ShellCheck 0.11.0 over the workflows, and ShellCheck over the two
scripts; `bash scripts/release-check.test.sh`, which holds every path of the triage's simulations, and its run against
deliberately broken copies of the script (each must fail it); `pnpm docs:build` (a website page changes); the full
`pnpm pack-test --reporter=line` (the execution rule's gate at the end of a plan); the grep for the external consumer
projects' names.

## Decisions checklist

- [x] The `release` job in `pr.yaml` (decision 79, point 1)
- [x] Two rulesets, set up by the maintainer and confirmed on PR #60 (point 2)
- [x] Publish's guard on `main`'s tip, no re-run exception (point 3)
- [x] npm, not tags (point 4)
- [x] One script, its test in the `lint` job, ShellCheck over both (point 5)
- [x] `docs/releases.md` describes the hold (point 6)
- [x] Replaces decision 4's points 2 and 4 (point 8)

## Execution

One commit, `ci: hold pull requests while a release publishes; Publish judges main's tip`, with the decision, the
finding statuses, the ledger rows and this plan in it; the maintainer pushes; then the guide's steps 1 to 4.

### Execution notes

- 2026-10-28, `5c3930e`: as planned. The test caught one weakness of its own before the commit: run against copies of
  the script with a deliberate fault, it missed an npm failure read as an empty list in `pull-request` mode, until the
  npm-down path also failed on any `::error::` line; every other faulty copy failed it.
- 2026-10-28, a review of `5c3930e` at the maintainer's request found wording mistakes, corrected in the next commit:
  `docs/releases.md` implied that auto-merge is allowed and garbled what a stray changeset does; decision 79 and this
  plan's checklist said the rulesets were confirmed on PR #60; *Tests and checks* and decision 79 said the guard
  reports a re-run that "gets past" the window (it stops one); `.github/AGENTS.md` read as if the scripts were pinned
  and as if actionlint ran ShellCheck on them; the guide missed that a ruleset blocking force pushes keeps `main` from
  being renamed; the merge queue's availability, first an assumption, is now quoted from GitHub's docs; lines past
  120 columns were rewrapped. No code changed.
- 2026-10-28, the maintainer, after both commits were pushed and PR #60's run was green (the *Release window* job
  among its checks): the guide's steps 1 to 4. The rules list offered no **Require merge queue**, as GitHub's docs say
  for a repository of a personal account. GitHub confirmed the old branch protection rule was covered by the rulesets
  before it was deleted. On a re-run of PR #60's checks, the merge box offered no way past `build` while it ran, and
  the bypass of `main: review` once it was green (only when the pull request is not a draft); the *Release window*
  job printed `3.0.1 is on npm`. Plan done; the guard's real run comes with the first Publish run after the merge.
