# 2I-5: `docs/releases.md` says a release's working documents live in `release-<version>/` with one plan per item or coupled pair; the 3.0.2 work lives in `defect-review-result/`, with plans of three and four items

- **Kind**: documentation
- **Area**: the contributor guide: release planning (`docs/releases.md` *Planning*) against how this branch's work is organized
- **Severity**: Low (process text that does not describe the practice; a contributor looking for the release's plans by the rule's name finds none)
- **Semver of the fix**: none (guide text only)
- **Pass**: 1
- **First review**: new since 54cdada (the working folder moved to `defect-review-result/` with a49709d, 2026-10-27)
- **Reviewed**: `d850405`, 2026-10-28 20:03 +0100, Opus 5.5, second review, segment 2I

## Contract

`docs/releases.md` lines 13–18:

> While a release is planned, its working documents live in a `release-<version>/` folder at the root: the findings it
> works from when there are any (an analysis, a review), one plan per item or tightly coupled pair
> (`PLAN-<items>-<slug>.md`), `PLANS.md` (the ordered plans and their status), `DECISIONS.md` (…) and the release notes
> (…). The folder is temporary.

The root (`AGENTS.md` line 33) points there: "docs/releases.md says how plans, decisions and a release's working folder
are kept."

## Reproduction

Pass 1 read only commit messages (the first review's folder is not opened before pass 1 ends). From the worktree root:

```sh
git log --format='%h %ad %s' --date=short v3.0.1..HEAD -- . ':!defect-review-result' | grep -i 'working folder'
git log --format='%b' 54cdada..HEAD -- . ':!defect-review-result' | grep -oE 'defect-review-result/PLAN-[A-Za-z0-9._-]+\.md' | sort -u
```

Output, first command:

```text
01d1096 2026-10-28 chore: the 3.0.2 working folder audited; releases go live without approval on npmjs.com
09082b1 2026-10-23 chore: remove the 3.0.2 working folder
2f06702 2026-10-23 chore: the 3.0.2 working folder
```

`01d1096`'s body: "The folder stays for a second review of this branch: its ledger maps every finding to its plan and
commits, decisions 72 and 73 record today's choices, and plan 42 (a GitHub environment for publishing) is written."
Every commit since `a49709d` names its plan as `Plan: defect-review-result/PLAN-….md`. The second command counts 44 plan
files, among them:

- three or four items in one plan: `PLAN-G-3-G-10-G-5-G-8-release-workflows.md`, `PLAN-H-5-A-8-G-11-agents-and-tooling.md`,
  `PLAN-F-3-E-4-E-3-docs.md`;
- no item at all: `PLAN-agents-split.md`, `PLAN-static-page.md`, `PLAN-publish-environment-node-lines.md`,
  `PLAN-release-gates-and-audit.md`.

The repository root at `d850405` has `defect-review-result/` and no `release-3.0.2/` (non-recursive listing).

## Observed / expected

Observed: the release's working folder is `defect-review-result/` (a review's result folder that took on plans and
decisions; a `release-3.0.2/` folder existed from `2f06702` to `09082b1` and was removed); plans group up to four items,
and four plans carry no item.

Expected: either the practice follows the rule, or the rule says what the practice is (for example: "a review's result
folder may serve as the working folder; a plan may group the items one change fixes, named by their IDs; a plan for work
no finding names is `PLAN-<slug>.md`").

Whether the change of folder was decided cannot be read in pass 1 (it would be in the first review's `DECISIONS.md`);
pass 2 checks it. If it was decided, this becomes a guide that was not updated with a decision.

## Cause

`docs/releases.md` describes 3.0.0's process; the 3.0.2 work grew out of a defect review whose folder kept the role.

## Fix plan

- Intended contract: `docs/releases.md` describes how release work is organized, including a review-driven release.
- Options: (1) **recommended**: amend *Planning* to allow the findings' folder as the working folder and name the plan
  forms in use (items one change fixes; `PLAN-<slug>.md` for unitemized work); (2) rename the folder to
  `release-3.0.2/` before more work lands (it is deleted before the merge anyway, so this buys little).
- Docs: `docs/releases.md` *Planning*; the root's one-line pointer stays.
- Changeset: none.

## Pass 2: what the first review's decisions say

Read 2026-10-28 in `defect-review-result/DECISIONS.md` and the plans' execution notes:

- **Decision 5, point 2**: "`defect-review-result/` is the working folder of the implementation (AGENTS.md §6), under
  this name." **Decision 62, points 2 and 3**: "One `PLAN-<IDs>-<slug>.md` per item or group of items worked on
  together, as for 3.0.2 (`2f06702`) …; a plan without a finding is named after its test gap (`PLAN-T<n>-<slug>.md`)",
  and "The changesets table in `PLANS.md` replaces a release-notes file (AGENTS.md §6 rule 3)".
- So the folder name, the grouped plans and the missing release notes were **decided for this release**: the practice is
  not a slip. What stands is the guide: `PLAN-release-gates-and-audit.md` (plan 41, the audit under rule 7, which moves
  "what a later reader needs into … the contributor guide") did not carry these choices into `docs/releases.md`, which
  still describes `release-<version>/`, "one plan per item or tightly coupled pair" and a release-notes file. A later
  review-driven release finds a guide that its predecessor deliberately did not follow.
- Four plans follow neither the guide's naming nor decision 62's: `PLAN-agents-split.md`, `PLAN-static-page.md`,
  `PLAN-publish-environment-node-lines.md` and `PLAN-release-gates-and-audit.md` (no finding, no `T<n>`); they came from
  the maintainer's requests (plans 41 to 44), which decision 62 did not foresee.
- Classification unchanged (documentation, Low); the fix is option 1, written from decisions 5 and 62: a review's
  result folder may be the working folder; one plan per item or group fixed together; `PLAN-T<n>-…` for a test gap and
  `PLAN-<slug>.md` for the maintainer's own items; the changesets as the release notes.
