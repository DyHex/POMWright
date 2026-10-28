# Orchestrator's notes for the consolidation

What the segment agents could not know or did not record themselves, from the orchestrator of the second review
(Opus 5.5, the maintainer's session), 2026-10-28. Facts here were checked by the orchestrator; the hints in the last
section are not findings and must be verified like any other claim.

## The blind passes

Each segment's transcript was checked twice: the tool calls before its `PASS 1 DONE` marker (paths read, commands run,
with the text a command writes and the folder's exclusions removed), and the tool results before it (lines of the first
review's files that came back). Every segment saw two expected things before its marker: its own `segments.md` and
brief, which name the first review's folder, and commit messages of the change set, whose `Plan:` line names a plan
file under `defect-review-result/`. Neither is the first review's content.

| Segment | Blind pass | Notes |
| --- | --- | --- |
| 2A, 2B, 2C, 2D, 2E, 2F, 2T, 2H, 2I | held | 2D ran one `diff` of the root `AGENTS.md` against the maintainer's checkout's (identical at `d850405`; not the first review). 2F's one `git show --stat` without the pathspec listed two file names of the folder, no content. 2H's and 2I's commands named the folder only to exclude it or as a search pattern with the pathspec. |
| 2G | **breached once, at 18:07** | A recursive grep for "Node 20" filtered the folder with a `| grep -v` that did not match; 28 lines of `report.md`, `inventory.md`, `PLANS.md`, `PLAN-release-gates-and-audit.md`, `PLAN-publish-environment-node-lines.md`, `PLAN-G-2-G-1-checks-workflow.md`, `PLAN-T14-consumer-job.md` and `PLAN-D-2-H-4-fullurl.md` reached it (its `log.md` lists them). 2G-1 to 2G-3 were written before; 2G-5's observation was made before; 2G-4 is unrelated. 2G marked the topic (the Node matrix, Node 20's end of life, the consumer job) *not blind*. |

No segment read the memory folder (the check covers it). Every agent did receive the orchestrator's memory index in its
context: one-line summaries that name the first review's finding counts and "the ^ fix". That is a small, unavoidable
hint; record it in the coverage section.

## Slips the agents reported

- Log times estimated instead of read from `date`, then corrected and logged: 2A, 2F, 2T.
- 2H's `rm -rf *` inside its own probes subfolder was blocked by a safety check; nothing was deleted, and it was not
  worked around.
- Every segment's own write of `summary.md` was refused by the harness rule "Subagents should return findings as text,
  not write report files", except 2B's; the orchestrator saved each from the agent's returned text, unchanged, with a
  note at its top. 2A's summary also carries one sentence the orchestrator updated at the agent's request (marked).

## Fix sketches

The maintainer allowed source sketches with the orchestrator as their gate (after 2A started). Every sketch was reviewed,
then run in the review worktree between segments: its run script at `d850405`, the diff applied and the package
rebuilt, the run script again, the unit tests and the area's specs on chromium (a workflow sketch: actionlint and the
step's script only, no rebuild); then the worktree restored and the baseline package checked byte for byte. Each
finding carries the result in a section *Fix sketch*, with the log's path.

| Sketch | Result |
| --- | --- |
| 2A-1, 2A-9, 2A-2, 2B-1, 2D-1, 2D-2, 2E-1, 2G-1, 2G-2 | fails at `d850405`, passes with the sketch; unit tests and area specs pass |
| 2A-10 | the opaque message holds on three browsers with the sketch; one failure left is the probe's own control on Firefox (it expects `QuotaExceededError` in the text; Firefox words the refusal "The quota has been exceeded."), which failed at `d850405` too |
| 2T-1, 2T-7 | demonstrations (they break what a check guards): the checks stay green with the break applied, so each finding is confirmed |

The reviewer's notes on each sketch (an unbounded loop in 2A-1's, the new messages *Error messages* must list in 2A-9's
and 2D-1's, 2A-2 and 2A-10 touching the same lines, 2G-1 and 2G-2 touching the same step) are in the findings.

The orchestrator deleted 2A's `sketch/scratch/` folder (a 186 MB copy of the source) after the gate run; it also held
2A's own pre-check logs (biome and unit runs on each sketch, the unit probes' outputs). The gate's logs cover the
reproductions and the unit tests with each sketch applied; only the lint result of 2A's sketches is lost.

## Not run anywhere

The workflows themselves on GitHub; a publish; Node 26; any operating system but Linux; the harness at the latest
Playwright 1.x locally (CI ran it on chromium at `d850405`).

## Hints for the merge (verify each)

Noticed while saving the summaries; not checked beyond reading them.

- The *Internal → Documentation* CI sentence: 2T-6, 2H-1 and 2I-4.
- The upgrade guide's stale TS2339 text: 2A-7 and 2H-4.
- The upgrade guide and the `log` fixture's locale check: 2E-4 and 2H-8.
- `pr.yaml`'s header naming Node 20 only: 2G-5, and 2I's *Outside the segment*.
- `createRegistryWithAccessors` without its type argument on *Upgrading from 2.x*: 2H-5, and 2F's *Outside the segment*.
- Items met outside a segment and filed by none (decide each): `PageObjectTypeOptions`' `@example` does not compile
  (2H's notes, 2D's area); "initialiser" on *Internal → Page object lifecycle* (2I's notes, 2H's area); the step
  location claim for navigation calls in `urls-and-navigation.md` (2E's notes, 2D's area); `api/class-pageobject.md`'s
  `sessionStorage` property and a RegExp base (2A's notes); the publish job building with publishing credentials, the
  Version Packages pull request's approval-gated run, and `trusted-publishing.md`'s "no npm token is stored" (2G's
  notes); the others in each summary's *Outside the segment*.
