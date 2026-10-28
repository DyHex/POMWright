# Release planning

How a release is planned and carried out, with a working folder of plans and decisions. Read it before planning a
release, writing a plan, or working from a release's working folder. Part of the contributor guide that
[AGENTS.md](../AGENTS.md) indexes; AGENTS.md's rules apply here too.

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
2. **Verified claims only.** Every runtime or type claim in a plan is backed by a probe or a test run (see [testing](testing.md)) and
   cites the exact file and line.
3. **Keep the ledgers current.** When a plan is agreed: add its decisions to the decisions log and its consumer-facing
   items to the release notes as *planned*. When it is executed: flip them to *done* and append any execution-time
   decisions.
4. **Docs are written in `website/src/content/docs/`** (see [documentation](documentation.md)).
5. **Links inside the working folder are relative to it**, for example `../src/locators/utils.ts#L64`, so they stay
   clickable in VS Code.
6. **Breaking changes ride one major.** There are no intermediate releases of a major's work. Each consumer-facing
   change still gets its own changeset (`major` for breaking, `minor` or `patch` otherwise), which the release
   collapses into one changelog entry; the changesets, not the release notes, are what consumers read.
7. **Nothing of the folder is kept.** Before the merge, an audit reads every file of the folder and moves what a later
   reader needs into the code, its tests, the doc comments, the site (the reasons behind a design on the Internal
   pages), the changesets or the contributor guide, and work left for later into a GitHub issue (below); no reference to the
   folder, a plan, a finding or a decision number stays outside it. Then the folder is deleted.

Rules 8 and 9, on commits, are in AGENTS.md (*How to work*): they hold for every commit.

## Backlog

- Work planned for later is tracked as open GitHub issues labeled `backlog` (`gh issue list --label backlog`), not in
  the contributor guide: read them before planning a release, and turn a working folder's deferred items into issues
  before the folder is deleted. A breaking item also carries `breaking`.
