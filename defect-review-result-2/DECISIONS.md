# Decisions of the second review's triage

The decisions landed in the triage of [report.md](report.md) by the maintainer and Claude (Opus 5.5), from 2026-10-28,
in the order they were taken. Numbers continue the first review's `defect-review-result/DECISIONS.md` (#1 to #78), so
a number names one decision across both folders. Nothing here is implemented yet; the plans are written from these
entries after the triage, and where an entry differs from a finding's recommended fix or fix sketch, the entry applies.

## How an item is presented

The header gives the item's number out of the total, a link to its finding, its severity and kind, and a link to every
finding decided with it. Then:

1. **How it works now**: what the code, docs or workflow do today, with links to the lines.
2. **What's wrong**: what goes wrong, and the evidence. The finding is re-checked first (its reproduction re-run or the
   code re-read); disagreement with it is said, on severity or on whether it is a defect at all. "No change" is a valid
   outcome.
3. **Why it matters for POMWright**: against what the project promises: documented behavior, the design rules (mirror
   Playwright, validate at runtime, no guards that only excuse mistakes), the tests and checks, the release.
4. **Fixes**: the options and what each costs, then the recommended one and why.
5. **What the fix could break**: the lines of this checklist that apply, each marked ✔ (checked, and how) or ~
   (reasoned, not checked): other code paths and callers of what changes; messages, the *Error messages* page and its
   check; pages, doc comments and snippets that describe the old behavior; types (the declaration output, API
   coverage, compile errors the docs quote); tests (one that fails before the fix and passes after, and existing tests
   that change); release (changeset, semver, workflows); other ledger items that touch the same lines.
6. **To decide**: numbered questions, each with a default answer, so "agreed" settles them all.

A defect fits on about one screen; an item that needs more says so. Docs findings come in batches by page: a table of
each finding, its fix in one line and the recommendation; the maintainer approves the batch or pulls items out. Docs
findings that need a real decision get the full format.

The approved fix sketches are evidence for a cause, not the fixes: each passed one gate, written on its own against
`d850405`, and step 5 was never run on them.

A problem found in step 5 gets an ID `2R-n`, is reproduced like any finding, and is added to the ledger.

No code or docs change during the triage, and the maintainer says when to move on. Probes run in the second review's
worktree, restored afterwards.

When an item is decided: an entry below (number, date, the items it settles, what was decided, why, what it depends
on); a **Status** line in each finding file it settles; its row in report.md's ledger.

## Order

| Item | Findings | Kind |
| --- | --- | --- |
| 1 | 2G-1 with 2G-2 | defects (Medium, Low) |
| 2 | 2A-9 | defect (Medium) |
| 3 | 2A-1 | defect (Medium) |
| 4 | 2I-2 | docs (Medium) |
| 5 | 2A-2 with 2A-10 | defects |
| 6 | 2A-3 | defect |
| 7 | 2A-4 | defect |
| 8 | 2A-8 | design |
| 9 | 2B-1 | defect |
| 10 | 2B-4 | design |
| 11 | 2D-1 | defect |
| 12 | 2D-2 | defect |
| 13 | 2D-4 | design |
| 14 | 2C-3 | design |
| 15 | 2E-1 | defect |
| 16 | 2T-1 | defect |
| 17 | 2T-2 with 2T-9 (the snippet check) | defects |
| 18 | 2T-3 | defect |
| 19 | 2T-4 | defect |
| 20 | 2T-5 | defect |
| 21 | 2T-7 | defect |
| 22 | *Upgrading from 2.x*: 2E-4, 2H-4, 2H-5, 2H-7 | docs batch |
| 23 | Session storage pages: 2A-5, 2A-6, 2H-6, 2Z-2 | docs batch |
| 24 | Locator pages: 2B-2, 2B-3, 2C-1, 2C-2 | docs batch |
| 25 | Page objects and URLs: 2D-3, 2D-5, 2Z-1 | docs batch |
| 26 | Steps: 2E-2, 2E-3 | docs batch |
| 27 | Packaging and versioning: 2F-1, 2F-2, 2F-4 | docs batch |
| 28 | CI pages: 2G-3, 2G-4, 2G-5, 2H-1 | docs batch |
| 29 | README and wording: 2H-2, 2H-3 | docs batch |
| 30 | Contributor guide: 2I-1, 2I-3, 2I-6, 2I-7, 2I-8, 2I-9, 2T-8, 2F-3 | docs batch |
| 31 | 2I-5 | docs |
| 32 | 2Z-3 | docs |
| 33 | Closing: items met outside the segments and filed by none (report §9), the notes outside the findings | checklist |

## Decisions

## 79. The release window: pull requests held while a release publishes, and Publish judges `main` (2026-10-28)

**Settles**: [2G-1](G-ci-release-publishing/defect-2G-1-publish-guard-judges-the-tested-commit.md),
[2G-2](G-ci-release-publishing/defect-2G-2-publish-rerun-goes-on-after-main-moved.md); item 1.

**The case**: a version on `main` that npm does not have while changesets are pending is never published:
changesets/action publishes only when no changeset is pending, and its next Version Packages pull request bumps past
that version. `main` gets there when something with a changeset lands between merging the Version Packages pull request
and its publish (6½ minutes for 3.0.1, 11 for 3.0.0), or when a Version Packages pull request that has not caught up
with `main` is merged. Decision 4's guard judged the tested commit, so it missed a release commit whose own run never
came and the stale Version Packages pull request, failed a release that the next run publishes, and let a re-run go on
after `main` moved.

**Decided**:

1. **A `release` job in `pr.yaml`**, part of the gate `build`, judges the pull request's merge commit: it passes when
   that commit's version is on npm, or when the pull request sets the version with no changeset pending (the Version
   Packages pull request); it holds the pull request, up to 30 minutes, while `main`'s version is not on npm (a release
   is publishing); it fails at once a pull request that sets the version while changesets are pending (a Version
   Packages pull request brought up to date with `main` after a changeset landed).
2. **Two rulesets replace `main`'s branch protection rule**, set up by the maintainer (the plan's guide): `main: review`
   (a pull request, one approval, Code Owners, conversations resolved), which repository admins may bypass for pull
   requests only, since the only maintainer cannot approve their own pull requests; and `main: checks` (`build`, up to
   date, no deletion, no force push), which nobody may bypass, so the hold binds every merge. Confirmed on PR #60.
3. **Publish's guard is the safety net**: it reads `main`'s tip from GitHub (a re-run keeps its old checkout); while the
   tip's version is not on npm and changesets are pending there, it reads npm once more after 5½ minutes (npm's list can
   be five minutes old after a publish), then fails and says to revert the Version Packages pull request that set the
   version; it goes on only when the tested commit, `main`'s tip and the checkout are one commit, and otherwise stops
   quietly. No exception for re-runs: deployments follow commit order, re-runs included.
4. **npm is the source of truth**, not the tags: changesets/action pushes a tag only after the publish, so a missing
   tag can follow a published release.
5. **One script for both checks** (`scripts/release-check.sh`), with a test that simulates every path in throwaway
   repositories with a fake npm, run by the `lint` job, and ShellCheck over both scripts there.
6. **`docs/releases.md`** describes the hold and the **Update branch** trap in place of the rule "merge nothing with a
   changeset until that version is on npm".
7. **Not adopted**: GitHub's merge queue (not offered for this repository, as far as known, since it belongs to a
   personal account); publishing as `CI`'s last job (a larger change of the release path before its first Trusted
   Publishing release, and a failed publish would turn `CI` red and hold back the site); a pull-request check without
   the up-to-date rule (it judges the base its run saw); required reviewers on the `npm` environment (every Publish run
   would wait, and the window would grow); a pull-request check in place of the guard (a ruleset edit or a re-run gets
   past it).
8. **Replaces decision 4's points 2 and 4** (the check on the tested release commit; "the gap is accepted"). Its
   recovery by revert stays.

**Why**: the window closes where it opens, at the merge, for every pull request, the maintainer's own included; Publish
keeps the design of decisions 72 and 74; the guard catches what a ruleset edit or a re-run lets through.

**Depends on / affects**: decision 4; item 28 (2G-5, 2H-1) edits the same section of *Tests and checks*. Plan:
[PLAN-2G-1-2G-2-release-window.md](PLAN-2G-1-2G-2-release-window.md).
