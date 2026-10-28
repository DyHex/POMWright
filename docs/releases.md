# Releases

How a release is planned, with a working folder of plans and decisions, and how it is carried out. Read it before
planning or carrying out a release, writing a plan, or working from a release's working folder. Part of the contributor
guide that the root [AGENTS.md](../AGENTS.md) indexes; its rules apply here too.

## Planning

3.0.0 was prepared this way; its working folder was removed before the
merge, and git history keeps it (`git show 08bdcac^:release-3.0.0/DECISIONS.md`, and the analysis, plans and release
notes beside it), for the rare question that the code, the tests, the site and the contributor guide do not answer.

While a release is planned, its working documents live in a `release-<version>/` folder at the root: the findings it
works from when there are any (an analysis, a review), one plan per item or tightly coupled pair
(`PLAN-<items>-<slug>.md`), `PLANS.md` (the ordered plans and their status), `DECISIONS.md` (the decisions in force,
each with date and reason; a reversed one is replaced, and open questions are at the bottom) and the release notes
(consumer-facing, only what is done or committed to by a plan, each item marked *planned* or *done*). The folder is
temporary.

Rules:

1. **Plan first, one item at a time.** Before touching code for an item, write the plan file and stop for review.
   Execute only after explicit confirmation, and only the ticked decisions. A plan has the intended contract, the
   verified current behavior with file and line references, options with a recommendation, implementation steps,
   tests, docs, changeset, versioning, a decisions checklist and the execution order.
2. **Verified claims only.** Every runtime or type claim in a plan is backed by a probe or a test run (see [test/AGENTS.md](../test/AGENTS.md#probing)) and
   cites the exact file and line.
3. **Keep the ledgers current.** When a plan is agreed: add its decisions to the decisions log and its consumer-facing
   items to the release notes as *planned*. When it is executed: flip them to *done* and append any execution-time
   decisions.
4. **Docs are written in `website/src/content/docs/`** (see [website/AGENTS.md](../website/AGENTS.md)).
5. **Links inside the working folder are relative to it**, for example `../src/locators/utils.ts#L64`, so they stay
   clickable in VS Code.
6. **Breaking changes ride one major.** There are no intermediate releases of a major's work. Each consumer-facing
   change still gets its own changeset (`major` for breaking, `minor` or `patch` otherwise), which the release
   collapses into one changelog entry; the changesets, not the release notes, are what consumers read.
7. **Nothing of the folder is kept.** Before the merge, an audit reads every file of the folder and moves what a later
   reader needs into the code, its tests, the doc comments, the site (the reasons behind a design on the Internal
   pages), the changesets or the contributor guide, and work left for later into a GitHub issue (*Backlog* below); no reference to the
   folder, a plan, a finding or a decision number stays outside it. Then the folder is deleted.

Rules 8 and 9, on commits, are in the root AGENTS.md (*How to work*): they hold for every commit.

## Carrying out a release

How Publish and Pages run is in [.github/AGENTS.md](../.github/AGENTS.md).

- After merging the Version Packages pull request, merge nothing with a changeset until that version is on npm: a
  commit with a changeset merged while the release commit's `CI` runs, or before its Publish run, makes that run stop,
  and the version is never published. If it
  happens, revert the release commit before merging the next Version Packages pull request; that restores its
  changesets, and the next release includes them.
- Releases are published with npm Trusted Publishing: npmjs.com trusts `publish.yaml` of this repository, `pnpm
  publish` exchanges the workflow's OIDC token, no npm token is stored, and npm records provenance. The Trusted
  Publisher allows `npm publish`, so a release goes live when Publish runs, and merging the Version Packages pull
  request is the human gate. A stage-only publisher, which holds each version until a maintainer approves it with 2FA,
  was considered and not adopted: `changeset publish` runs `pnpm publish` and cannot stage, so it would need a publish
  script of its own that also writes the tag and the GitHub release the action creates. npm expires a new Trusted
  Publisher whose first publish has not succeeded within 2 days, so one is set up, or set up again, right before the
  release it is for. After a release, check its attestation (`npm view pomwright@<version> dist --json`, or
  `https://registry.npmjs.org/-/npm/v1/attestations/pomwright@<version>`); the workflow warns when it finds none.

## Backlog

- Work planned for later is tracked as open GitHub issues labeled `backlog` (`gh issue list --label backlog`), not in
  the contributor guide: read them before planning a release, and turn a working folder's deferred items into issues
  before the folder is deleted. A breaking item also carries `breaking`.
