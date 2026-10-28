# Segments

The second defect review of POMWright before the 3.0.2 release: the whole repository at `d850405` on
`fix/review-3-0-2`, with the defect-review skill (the repository's copy, `skills/defect-review/SKILL.md`), split into ten
segments that run one at a time, then a consolidation. The checks at the start are in [baseline.md](baseline.md).

A first review ran at `54cdada` (2026-10-23). Its results, the fixes made since and the decisions taken are in
`defect-review-result/` of the commit under review. This review does not trust them: each segment reviews its area
blind first, then reads the first review and checks every claim in it itself (see *The four passes*).

## Order and status

Riskiest first: concurrency and ordering, then input validation and copies, lifecycle and URLs, steps, types and
packaging, release and CI, the tests and checks, then the documentation and the contributor guide as a whole. The size
is a relative weight for the time estimates.

| Segment | Brief | Size | Status | Findings |
| --- | --- | --- | --- | --- |
| 2A | [Session storage](A-session-storage/brief.md) | 1.2 | done | 6 defects, 3 docs, 0 suspected, 1 design |
| 2B | [Registration and resolution](B-registration-and-resolution/brief.md) | 1.7 | done | 1 defect, 2 docs, 0 suspected, 1 design |
| 2C | [Queries](C-queries/brief.md) | 1.0 | done | 0 defects, 2 docs, 0 suspected, 1 design |
| 2D | [Page objects, URLs and navigation](D-page-objects-urls-navigation/brief.md) | 1.2 | done | 2 defects, 2 docs, 0 suspected, 1 design |
| 2E | [Logging, `@step` and the fixture](E-logging-step-fixture/brief.md) | 0.8 | done | 1 defect, 3 docs, 0 suspected, 0 design |
| 2F | [Packaging, public types and changesets](F-packaging-types-changesets/brief.md) | 1.1 | done | 0 defects, 4 docs, 0 suspected, 0 design |
| 2G | [CI, release and publishing](G-ci-release-publishing/brief.md) | 1.0 | done | 2 defects, 3 docs, 0 suspected, 0 design |
| 2T | [The tests and the checks](T-tests-and-checks/brief.md) | 1.3 | done | 7 defects, 2 docs, 0 suspected, 0 design |
| 2H | [The documentation as a whole and the README](H-docs-site-readme/brief.md) | 1.1 | done | 0 defects, 8 docs, 0 suspected, 0 design |
| 2I | [The contributor guide](I-contributor-guide/brief.md) | 0.7 | done | 0 defects, 9 docs, 0 suspected, 0 design |
| — | Consolidation: [report.md](report.md) | 0.9 | done | after merging: 19 defects, 37 docs, 0 suspected, 4 design |

The orchestrator keeps this table current. A segment does not edit it.

### Changes from the first review's segments

The first review's segments A to H still fit the runtime's areas, so 2A to 2F keep them. Three changed:

- **2T is new.** The test suite became an area of its own: the specs that test the packed package, the
  documentation-chain spec, the lifecycle-outcomes run, the step-location check, the test server with its static page
  and its external-request check, and the four documentation checks in `scripts/`. In the first review these were
  spread over the scopes and over its CI scope.
- **2G** keeps CI, release and publishing; the tests and the checks moved to 2T.
- **The first review's H is split** into **2H** (the site, the README and the documentation as a whole) and **2I** (the
  contributor guide: the root `AGENTS.md`, the six folder `AGENTS.md` files and `docs/`, laid out this way on
  2026-10-28).

## Where things are

- **The code under review**: the worktree `/home/magdys/workspace/dyhex/POMWright-second-review`, detached at `d850405`.
  Read it there. Never read code in `/home/magdys/workspace/dyhex/POMWright` (the maintainer's checkout, which may move on)
  except this folder.
- **Results**: `/home/magdys/workspace/dyhex/POMWright/defect-review-result-2/<segment folder>/`.
- **Probes and notes**: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/<segment letter>/`, outside both
  checkouts (a `.ts` probe inside the repository would be linted). Every probe a finding relies on stays there.
- **The first review** (pass 2 on, never before): `defect-review-result/` in the worktree, and its probes in
  `/home/magdys/workspace/dyhex/POMWright-final-review-probes/`. Read them; never write to them, and never run anything in the
  first review's worktree (`/home/magdys/workspace/dyhex/POMWright-final-review`, at `54cdada`).
- **Never read**: the memory folder under `~/.claude/` (the one-line memory index already in your context is the
  orchestrator's, not evidence, and says nothing about the code), `/home/magdys/workspace/dyhex/POMWright-reviews/`, the other
  segments' folders in this folder (the consolidation reads them all), and any `release-3.0.*` folder in git history.

## The four passes

Every segment works in four passes, in this order, and writes a marker line to its `log.md` when each one ends:
`PASS 1 DONE <date -Iseconds>` and so on. The transcripts show the order of reads and writes, so the blind pass can be
checked.

1. **Blind.** Map the area and review it as the skill's Phases 1 and 3 say, without opening anything of the first
   review (above). Write the map to `inventory-blind.md` and each finding to its file as it is confirmed. The changes
   since `v3.0.1` are part of the work: treat them as a change set too (the skill's change-set questions: does the
   promise hold on every path it applies to, including the ones the change did not touch; what did it break; did the
   docs, types, tests and changeset keep up). Look hardest at the commits after `54cdada`: that code no review has
   seen. Exclude `defect-review-result/` from every `git log` and `git diff` in this pass (pathspec
   `':!defect-review-result'`): its history is the first review. `inventory-blind.md` is not edited after this pass.
2. **The first review.** Read what the brief names: the first review's scope folder or folders for this area (their
   `brief.md`, `summary.md` and finding files), the lines of `report.md` and its ledger whose area is yours, their
   entries in `DECISIONS.md`, their plans (`PLANS.md` names each plan's file; a plan's *Execution notes* say what was
   done), and the items `PLAN-release-gates-and-audit.md` leaves *for the second review*. For every first-review finding
   in the area, re-run its reproduction at `d850405`: copy its probe from the first review's probes folder into
   `<your probes>/run1/<ID>/`, point it at this worktree, run it, and record the outcome in `first-review.md`, one row
   per finding:
   - **fixed**: the reproduction now shows the contract holding (say what you ran and what it printed);
   - **fixed differently**: the decision chose another contract, and the code keeps that one;
   - **still present**: already filed as an issue (*known*, with its link) or decided not to fix (*decided*, with the
     decision's number), and the behaviour is no worse than the issue or decision says;
   - **not fixed**, **fixed incompletely**, or **regressed**: each of these is a finding of this review, with its own
     file and the first review's ID in it;
   - **cannot re-run**: why, and what was checked instead.

   Check the claims the first review made beyond its findings too: its *what is sound* lines and its test gaps for the
   area (closed by a test since, or still open), each with a short note.
3. **Reconcile.** Compare `inventory-blind.md` with the first review's `inventory.md` lines for the area, both ways:
   what the blind map has that the first did not, and the reverse. Compare the findings both ways too: a first-review
   finding that the blind pass would have met but did not is a blind spot of this pass, and a blind finding the first
   review did not report is either new since `54cdada` or a miss of the first review; say which, with the commit when
   it is new. Write `inventory-reconciled.md`: the union, each line marked *both*, *blind only* or *first only*, and how
   deeply each was probed in either review.
4. **Hunt again.** Where the two reviews disagree, and on the lines of the reconciled map that neither probed deeply,
   probe again. Then ask what both maps leave out (the skill's Phase 1 list, item by item), add it, and probe it.
   Findings of this pass go in the same files, numbered on.

## Running tests

The baseline ran everything once ([baseline.md](baseline.md)). Run tests again only where they add something: the specs
and browsers that cover what you are checking, a probe, a re-run of a first-review reproduction. Do not run the full
`pnpm pack-test` or `pnpm test` to "make sure" unless your finding depends on it. Do not skip a run that would settle a
claim either: a contract is sound only as far as a probe reached it.

## Probing in the worktree

The worktree is installed and built: `dist/`, `.pack/pomwright`, `test/node_modules` and `website/node_modules` are
current for `d850405`, and chromium, firefox and webkit are installed for Playwright 1.64.0. Read
[test/AGENTS.md](../test/AGENTS.md)'s *Probing* first; its pitfalls hold here.

- **A temporary spec**: `test/tests/zz-probe-<id>.spec.ts`, run with
  `pnpm -C test exec playwright test tests/zz-probe-<id>.spec.ts --project=chromium --reporter=line` (the config starts
  `test/server.js` on port 9000 or reuses it), then delete it. Import from `pomwright` to test the packed package.
  Fixtures: `test/fixtures/testApp.fixtures.ts`.
- **A Node script**: in your probes folder; import the build by absolute path
  (`/home/magdys/workspace/dyhex/POMWright-second-review/dist/index.mjs` or `index.js`) and load chromium from the root package
  with `createRequire("/home/magdys/workspace/dyhex/POMWright-second-review/package.json")`.
- **A type probe**: `test/tests/zz-probe-<id>.typecheck.ts`, then `pnpm exec tsc --noEmit -p test` from the worktree
  root, then delete it. `// @ts-expect-error` asserts a rejection; the exit code decides.
- **A unit probe against source**: `src/zz-probe-<id>.test.ts`, `pnpm vitest run src/zz-probe-<id>.test.ts`, then
  delete it. Only to explain a defect already shown through the public API.
- **A source sketch** (a fix that makes the reproduction pass) is run by the orchestrator, between segments, never by
  you: it changes tracked files of the shared worktree, and the maintainer made the orchestrator its gate. Never edit a
  tracked file yourself. Propose one where it settles something (the cause, or that a narrow fix suffices), in
  `<your probes>/sketch/`:
  - `<ID>.diff`: a unified diff against `d850405` that `git apply` takes from the worktree root, touching only `src/`
    (or `index.ts`) and only what the fix needs;
  - `<ID>.run.sh`: the commands, from the worktree root, that run the reproduction on the browsers it needs and exit 0
    when the contract holds (and non-zero now, at `d850405`; say so in the finding).

  Say in the finding's *Fix plan* that a sketch is proposed. The orchestrator reviews it, applies it, rebuilds
  (`pnpm harness:install`), runs it with the unit tests and the area's specs, restores the worktree, and adds the result
  to the finding as a section *Fix sketch*.
- **Base and head**: for a possible regression, run the same probe on `v3.0.1` (or `54cdada`) in a second worktree in
  your probes folder (`git -C /home/magdys/workspace/dyhex/POMWright-second-review worktree add --detach <probes>/<rev> <rev>`,
  then install and build there), never at the same time as a run in the review worktree (port 9000), and remove it with
  `git worktree remove` at the end.
- **Other browsers and runtimes**: `--project=firefox` / `--project=webkit`; Node 20 at
  `/home/magdys/.nvm/versions/node/v20.20.2/bin`, Node 22 at `/home/magdys/.nvm/versions/node/v22.18.0/bin` (prepend to `PATH`).
  The default is Node 24.22.0.
- **Budget**: chromium by default; firefox and webkit when the behaviour is browser behaviour (storage, navigation,
  URLs, frames) or a finding depends on it; Node 20 and 22 for anything that goes through `new URL` or a Node API.
- **Network**: GitHub's public API (`https://api.github.com/repos/DyHex/POMWright/...`) and npm's registry can be read
  with `curl`. `gh` is logged out on this machine. Never post, comment, open or change anything there.
- **Shared resources**: port 9000, the worktree's `dist/`, `.pack/`, `test/.doc-snippets/` and `test/test-results/`. Only
  one segment runs at a time, so they are yours while you run.
- Keep the worktree clean between probes. At the end, `git -C /home/magdys/workspace/dyhex/POMWright-second-review status --porcelain`
  prints nothing, and `--ignored` lists only what [baseline.md](baseline.md) lists.

## What to write

In the segment's folder, as you go (work held only in the conversation is lost if the context runs out):

- `log.md`: a running log, a line per step that matters (what you read, ran, concluded), and the pass markers. Take
  every time in it from `date` when you write the line; never estimate one.
- `inventory-blind.md` (pass 1) and `inventory-reconciled.md` (pass 3).
- `first-review.md` (pass 2): the table of the first review's findings, claims and test gaps, and their outcome.
- One file per finding: `defect-2<letter>-<n>-<slug>.md` (`defect-2A-1-proto-key-in-get.md`), for every kind.
- `summary.md`, at the end: what you read; the inventory lines reviewed fully, partly or not, and what you did not run;
  the **test gaps**, most important first; **what is sound** (one line each, naming the path probed); **outside the
  segment** (defects met in another segment's area, briefly, with evidence); the outcome counts of pass 2; what passes 3
  and 4 changed; and an index of the finding files (ID, kind, severity, semver, pass, first review, one line).

Only finding files hold a `**Kind**:` line (the status table counts them). If a write is refused, do not work around
it: put the file's full text in your final message instead, under its file name, and the orchestrator saves it.

### A finding's file

IDs are `2<letter>-<n>` (`2A-1`), numbered in the order found. Classification follows the skill, with the bump rules
of [docs/versioning.md](../docs/versioning.md): behaviour brought in line with what the docs, the doc
comments or the contributor guide already promise is a **patch**, so is an export such a promise requires, and a type
corrected to what the docs promise and the runtime does; a new export, member, option or accepted input is a
**minor**; code written against the docs that stops compiling for any other reason, or documented behaviour removed, is a
**major**. A docs-only fix is **none**. When the full fix is breaking and a narrower one is not, give both.

```markdown
# <ID>: <one sentence>

- **Kind**: defect | documentation | suspected | design question
- **Area**: <inventory item>
- **Severity**: High | Medium | Low (<reason>)
- **Semver of the fix**: none | patch | minor | major (<reason, by docs/versioning.md>)
- **Pass**: 1 | 2 | 4
- **First review**: new since 54cdada (<commit>) | missed by the first review | <first-review ID>: not fixed | fixed
  incompletely | regressed
- **Reviewed**: `d850405`, <date from `date`>, <reviewer>

## Contract

What is promised, with file and line, page and heading, or the guide's rule (file and heading). For a hole where no
contract exists, say so.

## Reproduction

The probe (inline when short, otherwise its path in the probes folder, with what it needs beside it), the exact command
from the worktree root, its exit code. For a documentation finding: the page and its text, plus the probe and its
output where the page shows behaviour. For a suspected defect: what was tried and why it did not settle it.

## Observed / expected

The output, copied, and what the contract says it should be.

## Cause

File and line, and why.

## Fix plan

In the shape of a plan ([docs/releases.md](../docs/releases.md), *Planning*, rule 1), to be confirmed
before any code changes: the intended contract; options with their cost and what they could break, the recommendation
marked (where the fix is breaking and a narrower one is not, both); implementation steps (files and functions); tests
(unit, harness spec and browsers, type probe; against the packed package where it matters); docs (pages, headings, doc
comments, *Error messages*, Internal pages, guide lines); the changeset (bump and first line, a sentence); decisions to
tick; where it sits relative to other findings it touches.
```

For a **design question**, *Reproduction* shows the decided behaviour, *Observed / expected* becomes *Argument* (what
you would change, and its cost), and *Fix plan* lists the options if it were adopted. A finding whose only fix is
**major** starts with an issue draft (`**Title:** … (breaking)`, `**Labels:** backlog, breaking`, `---`, the body,
`---`), then the sections above.

### Known and decided

- **Known**: the open issues (listed in [baseline.md](baseline.md)). A finding that matches one goes in `summary.md`'s
  coverage with its link, not in a finding file, unless the behaviour is worse than the issue says.
- **Decided design**: what the contributor guide, the docs and the doc comments state as deliberate, rejected or not
  planned (in pass 1), and the first review's `DECISIONS.md` (from pass 2 on). Code that does what was decided is not a
  defect; a disagreement is a design question.

## Finishing a segment

Remove every probe from the worktree and confirm it is clean (above), remove any second worktree you added, and end your
final message with: the paths of `summary.md` and the finding files; one line per kind with its count; one line per
finding (ID, kind, severity, one sentence); and the pass-2 outcome counts.

## Consolidation

After 2I, a last agent reads this file, [baseline.md](baseline.md), every segment's files, the guide's files (all of
them, up front) and the first review's `report.md`, and writes `report.md` here in the skill's report format. It merges
duplicates across segments (keeping the strongest evidence and noting the merged IDs), looks across segments for
contracts two areas disagree about, re-checks every confirmed finding whose evidence is thin, and adds two sections: the
first review's findings and their outcomes at `d850405` (one table), and what the second review found that the first
did not, with the reason (new code, or missed). It ends with the ledger: ID, kind, severity, semver, the proposed route
(fix in this branch, or a GitHub issue), status.
