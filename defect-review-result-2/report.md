<!-- Saved by the orchestrator from the consolidation agent's final message: the agent's own write of this file was
refused by the harness rule "Subagents should return findings as text, not write report files". The text below is the
agent's, unchanged. -->

# Second defect review of POMWright at `d850405`: consolidated report

- **Scope**: the whole repository at `d850405` (`fix/review-3-0-2`, "ci: the chromium harness on every LTS Node line
  below the default"), read in the detached worktree `/home/magdys/workspace/dyhex/POMWright-second-review`, with the
  commits since `v3.0.1` as a change set and those after `54cdada` (the first review's commit) first. Exclusions are in
  section 3.
- **Commit**: `d850405`.
- **Reviewer**: Opus 5.5, second review, consolidation. The ten segments (2A to 2I) were Opus 5.5 sessions, one per
  segment, run one at a time by the orchestrator (the maintainer's session).
- **Date**: 2026-10-28 20:33 CET (read with `date`).
- **Sources**: [segments.md](segments.md), [baseline.md](baseline.md), [orchestrator-notes.md](orchestrator-notes.md),
  each segment folder beside this file (`summary.md`, `first-review.md`, the two inventories, the finding files,
  `log.md`), and the first review's `report.md` and `DECISIONS.md` (`defect-review-result/` in the worktree).
- **Probes**: `P=/home/magdys/workspace/dyhex/POMWright-second-review-probes` below. Each segment's are in `$P/<letter>/`,
  the consolidation's in `$P/Z/` (`z1-example/`, `z2-storage-regexp-and-nav-steps/`, `z3-token-steps/`, `recheck/`).
  Unless a command says otherwise, it runs from the worktree root, and a probe copied into `test/` is removed after the
  run.

Each finding file holds the contract, the reproduction with its command and exit code, the observed and expected output,
the cause and a fix plan, and, where the orchestrator gated a source sketch, its result. This report ranks them, merges
the duplicates, adds what only a view across the segments shows, and ends with the ledger.

## Summary

After merging, there are **60 entries**: **19 confirmed defects** (3 Medium, 16 Low; 10 patch, 9 none),
**37 documentation findings** (1 Medium, 36 Low; all none), **0 suspected** and **4 design questions**. Three merges
fold four findings into others (2A-7, 2H-8, 2T-6, 2I-4). Three findings (2Z-1 to 2Z-3) come from items the segments met
outside their areas and did not file. No fix is major-only, so there is no GitHub issue draft. Every recommended fix is
a patch or none, so the release stays 3.0.2 by `docs/versioning.md`.

The first review's 61 findings (53 entries and 8 merged ones) stand at `d850405` as follows: 47 fixed, 7 fixed
differently, 3 fixed incompletely, 1 fixed differently with a part missed and a part regressed (G-5), 1 regressed in
part (G-11), and 2 still present as decided (R-3, R-4). None is "not fixed". Each incomplete or regressed one has a
finding here (section 10).

What matters most:

- **The release path** (2G-1, Medium): Publish's guard judges the commit CI tested, not `main`'s tip. A Version
  Packages pull request merged before Publish refreshed it, after a changeset was merged, skips its version and no run
  fails. A commit without a changeset merged during the release commit's CI turns that Publish run red with an
  instruction to revert a release that the next run publishes. 2G-2 (Low) is the re-run variant in the same step.
- **Session storage**: a standalone helper's call that waited for its turn acts on the origin the page moved to, silently
  (2A-9, Medium). A page's first `seed` fails on Chromium while the page redirects itself twice or more on another origin
  (2A-1, Medium).
- **Before the folder is deleted**: decision 72's after-release steps (revoke the old npm token, delete the `NPM_TOKEN`
  secret, disallow tokens on npmjs.com) live only in `defect-review-result/`, which rule 7 deletes before the merge,
  while the guide and a changeset already say no npm token is stored (2Z-3).
- **Patterns across segments**: the Internal pages went stale after CI changes because no rule reaches the trigger
  (2I-2, with 2H-1, 2G-3, 2G-5). *Upgrading from 2.x* falls short of its "lists everything" promise in four ways (2H-4,
  2H-5, 2H-7, 2E-4). Two docs checks compare the code with their own copies of the pages, not with the pages (2T-1), and
  no check reads compiler output or messages quoted outside *Error messages* (how 2H-4 went stale).

## 1. Baseline

From [baseline.md](baseline.md), at `d850405`, 2026-10-28 13:41 to 13:45, Node 24.22.0 (20.20.2 and 22.18.0 for the
older lines), pnpm 12.14.0, `@playwright/test` 1.64.0. Logs: `$P/phase0/`.

| Step | Command | Exit | Result |
| --- | --- | --- | --- |
| install | `pnpm install --frozen-lockfile` | 0 | |
| lint | `pnpm lint` | 0 | |
| unit | `pnpm test:unit` | 0 | 33 files, 904 tests; no type errors |
| pack-test | `pnpm pack-test --reporter=line` | 0 | typecheck (tsc, declaration emit, both legacy-decorator configs; doc snippets 226 checked, 12 `nocheck`, example app 5 files; API coverage 40 exports, 108 members, 134 site links, 0 problems; error messages 77 thrown and 9 compile-error messages, 108 page lines, 9 internal, 3 passed through); harness on chromium, firefox, webkit: 1,746 passed, 3 skipped (browser-specific); step locations 11 tests, 31 locations; test-server check 26 passed |
| node20 | `pack-test.sh --project=chromium` with the same tarball | 0 | 583 passed; step locations 11; test-server 26 |
| node22 | the same on Node 22 | 0 | the same |
| reinstall | `pnpm harness:install` | 0 | |
| docs-diagrams | `pnpm docs:diagrams` | 0 | 17 diagrams on 13 pages, light and dark, 0 problems; warnings: a chunk over 500 kB, the empty `i18n` collection, `docs → 404` |
| status | `git status --porcelain --ignored` | 0 | clean; ignored build and install output only |

CI on `d850405`: PR #60's run 40687553108, every check green (lint; unit tests and package; harness chromium at the pin
and at the latest 1.x; harness chromium on Node 20 and 22; test server; consumer installs; documentation and site; the
gate `build`).

The baseline is green, so every finding below is a gap the existing checks do not see. The consolidation's own runs
are in section 9 (*Re-checks*).

## 2. Inventory

No single inventory was written. Each segment wrote a blind map and a reconciled one (the union with the first review's
`inventory.md` lines for its area, each line marked *both*, *blind only* or *first only*, with the depth of probing in
each review):

| Segment | Blind | Reconciled |
| --- | --- | --- |
| 2A Session storage | [inventory-blind.md](A-session-storage/inventory-blind.md) | [inventory-reconciled.md](A-session-storage/inventory-reconciled.md) |
| 2B Registration and resolution | [inventory-blind.md](B-registration-and-resolution/inventory-blind.md) | [inventory-reconciled.md](B-registration-and-resolution/inventory-reconciled.md) |
| 2C Queries | [inventory-blind.md](C-queries/inventory-blind.md) | [inventory-reconciled.md](C-queries/inventory-reconciled.md) |
| 2D Page objects, URLs, navigation | [inventory-blind.md](D-page-objects-urls-navigation/inventory-blind.md) | [inventory-reconciled.md](D-page-objects-urls-navigation/inventory-reconciled.md) |
| 2E Logging, `@step`, fixture | [inventory-blind.md](E-logging-step-fixture/inventory-blind.md) | [inventory-reconciled.md](E-logging-step-fixture/inventory-reconciled.md) |
| 2F Packaging, public types, changesets | [inventory-blind.md](F-packaging-types-changesets/inventory-blind.md) | [inventory-reconciled.md](F-packaging-types-changesets/inventory-reconciled.md) |
| 2G CI, release, publishing | [inventory-blind.md](G-ci-release-publishing/inventory-blind.md) | [inventory-reconciled.md](G-ci-release-publishing/inventory-reconciled.md) |
| 2T Tests and checks | [inventory-blind.md](T-tests-and-checks/inventory-blind.md) | [inventory-reconciled.md](T-tests-and-checks/inventory-reconciled.md) |
| 2H Documentation as a whole, README | [inventory-blind.md](H-docs-site-readme/inventory-blind.md) | [inventory-reconciled.md](H-docs-site-readme/inventory-reconciled.md) |
| 2I Contributor guide | [inventory-blind.md](I-contributor-guide/inventory-blind.md) | [inventory-reconciled.md](I-contributor-guide/inventory-reconciled.md) |

## 3. Scope, segments and coverage

**Scope**: the whole repository at `d850405`, with `v3.0.1..d850405` as a change set (the commits after `54cdada`
first, since no review had seen them). Ten segments, run one at a time ([segments.md](segments.md)), each in four
passes: blind, then the first review's findings re-run, then a reconciliation of both maps, then a second hunt.

| Segment | Reviewed fully | Reviewed partly | Not run by the segment |
| --- | --- | --- | --- |
| [2A](A-session-storage/summary.md) Session storage | exports and members; values, codecs, keys; the origin option and checks; turns; `seed` at the call, registration, the init script, lifetimes, later failures; messages; step locations; types; pages and changesets | frames, COOP/COEP, service workers (harness green, not probed beyond); the counterfactual rate on *The seed registry*; "a failing call leaves the pending seed as it was" (not reachable through the API) | latest 1.x; Node 26; a `v3.0.1` worktree (git dates each cause) |
| [2B](B-registration-and-resolution/summary.md) Registration and resolution | paths and their types; registration and its end; copies; `STRATEGIES`; `getById`; reuse and seeds; resolution, frames, `verify`, `strictChains`; the page object's check; messages; the change set; every doc-comment `@example` of the area | the docs' chains (spot-checked; the spec rebuilds them); the type-probe files (2F's); *Performance* (skimmed) | full suites; Node 20/22 (no URL code); `pnpm bench` |
| [2C](C-queries/summary.md) Queries | `getLocatorSchema` and its methods; the update builder in both modes; copies; steps; descriptions; any-frame in a query; `skip`/`unskip`; kept queries and builders; messages; types; the change set | odd `nth` values (read; decided not validated); the guide's query lines (2I's) | firefox/webkit (nothing browser-specific); Node 20/22; latest 1.x |
| [2D](D-page-objects-urls-navigation/summary.md) Page objects, URLs, navigation | constructor and URL validation (Node 20/22/24); `fullUrl` and string matching (29 forms × 3 browsers × 3 Node lines); `UrlMatcher`; credentials (real Basic auth); navigation methods; lifecycle; the check's call site; the outcomes table; types | the Internal pages' runtime claims (one probed, 2D-5); storage through a page object (2A's) | full `pack-test`; latest 1.x; firefox/webkit for p03 and p04; a `v3.0.1` comparison |
| [2E](E-logging-step-fixture/summary.md) Logging, `@step`, fixture | every export and member; `step` titles; logger contracts; the locale check; `@step` in both decorator modes and at run time; lifecycle; types; docs; the change set | packaging of the area (2F's) | location probes on firefox/webkit (no browser needed); latest 1.x |
| [2F](F-packaging-types-changesets/summary.md) Packaging, types, changesets | the 40 exports; declarations and emit of 161 generated members (npm and pnpm, TS 5.0 to 7.0.2); module systems, attw, the runner; the TypeScript floor; the build; the 50 changesets (bump, first lines, rendering, coverage, type-level claims, compile breaks) | the changesets' runtime claims (the area segments'); the peer range's top (CI only) | `changeset version`; a publish; Yarn; `EBADENGINE`; Node 26 |
| [2G](G-ci-release-publishing/summary.md) CI, release, publishing | the five workflows, Dependabot, pins, actionlint; the publish guard, Pages' tip step and re-runs, simulated with the steps' own scripts; changesets/action v2.1.2 and CLI 3.0.3; provenance; `pnpm bench` | the consumer job (2F's script); `CODEOWNERS` (access not public); the Trusted Publisher's settings (not visible) | the workflows on GitHub; a real publish; Node 26 |
| [2T](T-tests-and-checks/summary.md) Tests and checks | the packed install; configs; the steps run and its reporter; the test-server check; the docs-chains spec; the four docs checks; vitest typecheck mode; `tsc` over `test/`; false passes across specs | `pack-test.sh` (read); the outcomes run (read, compared by eye); spec contents (sampled) | `pack-version.sh`, `benchmark.mjs`; latest 1.x. Ran beyond the baseline: the whole harness on firefox and webkit under Node 20 (1,163 passed, 3 skipped) and the URL specs under Node 22 |
| [2H](H-docs-site-readme/summary.md) Documentation, README | README (run end to end); the unowned pages; *Upgrading from 2.x* (2.x statements against a built v2.1.0, completeness by compiling a 2.x consumer against 2.x, 3.0.1 and `d850405`); shared contracts; language rules on 52 pages; links; rendering at 390/1440 px, light and dark; 96 doc-comment examples compiled | `api/errors.md` as a whole (pass 2 only); doc comments (examples only) | firefox/webkit; Node 20/22; the README on npmjs.com |
| [2I](I-contributor-guide/summary.md) Contributor guide | every statement of the ten files against the repository; the index; loading in Claude Code and Codex (against their docs); placement and reach; the split (336 sentences); configs; the guide's commands; practice (trailers, *Do not*, rule 7) | — | `pnpm bench`, `docs:dev`, `docs:preview`; a Claude Code or Codex session (ruled out by the brief) |

### The blind passes

From [orchestrator-notes.md](orchestrator-notes.md): the orchestrator checked each segment's transcript twice (the tool
calls before its `PASS 1 DONE` marker, and the tool results before it). Every segment saw its own `segments.md` and brief
(which name the first review's folder) and commit messages whose `Plan:` lines name plan files; neither is the first
review's content.

| Segment | Blind pass | Notes |
| --- | --- | --- |
| 2A, 2B, 2C, 2D, 2E, 2F, 2T, 2H, 2I | held | 2D ran one `diff` of the root `AGENTS.md` against the maintainer's checkout (identical; not the first review). 2F's one `git show --stat` without the pathspec listed two file names of the folder, no content. 2H's and 2I's commands named the folder only to exclude it. |
| 2G | **breached once**, at 18:07 | a recursive grep for "Node 20" filtered the folder with a `grep -v` that did not match; 28 lines of `report.md`, `inventory.md`, `PLANS.md` and five plans reached it (listed in its `log.md`). 2G-1 to 2G-3 were written before it, 2G-5's observation was made before it, 2G-4 is unrelated. 2G marked the topic (the Node matrix, Node 20's end of life, the consumer job) *not blind*. |

No segment read the memory folder. **Every agent received the orchestrator's memory index in its context**: one-line
summaries that name the first review's finding counts and "the ^ fix". It is a small, unavoidable hint, and it reached
the consolidation too.

### Slips

- Log times estimated instead of read from `date`, then corrected and logged: 2A, 2F, 2T.
- 2H's `rm -rf *` inside its own probes subfolder was blocked by a safety check; nothing was deleted and it was not
  worked around.
- Every segment's own write of `summary.md` was refused by the harness rule "Subagents should return findings as text,
  not write report files", except 2B's; the orchestrator saved each from the agent's text, unchanged, with a note at its
  top. 2A's summary carries one sentence the orchestrator updated at the agent's request (marked). 2H's carries two
  corrections its agent's message named (marked). The consolidation's own write of this report was refused by the same
  rule; its text was returned in the consolidation's final message.
- The orchestrator deleted 2A's `sketch/scratch/` (a 186 MB copy of the source) after the gate run; it held 2A's
  pre-check logs, so only the lint result of 2A's sketches is lost (the gate's logs cover the reproductions and unit
  tests).
- The consolidation's re-runs of 2T-2, 2T-5 and 2T-9 regenerated generated files inside 2T's probes folder (the two
  mirrors' `test/.doc-snippets/` and the seven mutated declaration copies `mutate.mjs` writes), from the same sources;
  no probe source changed.

### Fix sketches (gated by the orchestrator)

Each sketch was reviewed, then run in the worktree between segments: its run script at `d850405`, the diff applied and
the package rebuilt, the run script again, the unit tests and the area's specs on chromium (a workflow sketch: actionlint
and the step's own script only), then the worktree restored and the package checked byte for byte.

| Sketch | Result |
| --- | --- |
| 2A-1, 2A-2, 2A-9, 2B-1, 2D-1, 2D-2, 2E-1, 2G-1, 2G-2 | fails at `d850405`, passes with the sketch; unit tests and area specs pass |
| 2A-10 | the opaque message holds on three browsers with the sketch; the one failure left is the probe's own Firefox control (it expects `QuotaExceededError` in the text), which failed at `d850405` too |
| 2T-1, 2T-7 | demonstrations (they break what a check guards): the checks stay green with the break applied, so each finding is confirmed |

### Not run

Anywhere: the workflows on GitHub; a publish; Node 26 (issue #55); any operating system but Linux; the harness at the
latest Playwright 1.x locally (CI ran it on chromium at `d850405`). By the segments, as listed in the table above. By
the consolidation: no full suite (the baseline's stands), no gated sketch again, and of the browser probes only those
named in section 9.

### Excluded

`defect-review-result/` as a reviewed object (read as a source; it is removed before the merge, except where 2Z-3 reads
it for what rule 7 must move out of it); `skills/defect-review/` (the review's method); `CHANGELOG.md` (tool-written;
2F checked only the format the next release adds); the lockfiles; `test/test-data/` beyond 2T's check that it loads
nothing from another host.

### Known issues met

[#53](https://github.com/DyHex/POMWright/issues/53) (the release tooling, closed after the release: 2Z-3),
[#55](https://github.com/DyHex/POMWright/issues/55) (Node 26: not run), [#56](https://github.com/DyHex/POMWright/issues/56)
(publish the tested tarball: 2G's note on the publish job's privileges is a second argument for it),
[#58](https://github.com/DyHex/POMWright/issues/58) (the schema written once would close 2A-6 too),
[#59](https://github.com/DyHex/POMWright/issues/59) (an empty `?` or `#`: the decided exact-URL rule holds),
[#62](https://github.com/DyHex/POMWright/issues/62) (the `log` fixture's levels: its migration list should name the
README, 2H-3). No finding duplicates an issue.

### Test gaps, most important first

2T's list first (its items 7 to 9 are filed or known), then the other segments', merged; the finding each gap would
have caught is in brackets.

1. **The documentation's chains and the outcomes table against the pages**: `docsChains.spec.ts` and
   `lifecycle.outcomes.spec.ts` compare the code with their own copies, so a page edited alone passes [2T-1]; and no
   check reads compiler output or messages quoted on pages other than *Error messages* [2H-4/2A-7].
2. **Assertions under `test.fail(true)`**: "a new tab has its own storage" and "the app starts without a refused entry"
   are asserted only where they cannot fail [2T-3]; the never-applied message at a fixture's close is unit-tested only.
3. **Firefox and WebKit on Node 20 and 22**: no CI job runs them (2T ran them here: they pass); pull requests run
   chromium only (documented).
4. **Other operating systems**: every CI job runs on `ubuntu-latest`; call sites, step locations and packaging never
   meet Windows or macOS paths.
5. **Overlapping and moving storage calls**: a helper without an origin whose call waits behind one the page leaves
   [2A-9]; a page's first `seed` during a redirect chain [2A-1]; inputs changed before a call settles [2A-3]; a refused
   call on an inherited or closed popup [2A-2]; the opaque message with a page global `origin` [2A-10]; messages naming
   an empty key or one with ", " [2A-4]; a pending seed whose arrival is sandboxed [2A-5].
6. **Release decision logic**: Publish's guard and Pages' tip step are shell inside YAML, seen by actionlint only;
   2G's simulations (`$P/G/guard/sim.sh`, `rerun.sh`, `$P/G/pages/sim.sh`) would catch 2G-1 and 2G-2 if a job ran them;
   nothing checks that a Version Packages pull request holds every pending changeset [2G-1, 2G-2].
7. **The `log` fixture's level on a retry** through the real runner (`initialLogLevel` is unit-tested; the spec's retry
   branch needs a failure, which `failOnFlakyTests` forbids) [2T, 2E].
8. **Where a step is reported** in the shapes 2E-2 lists (awaited later, a multi-line `Promise.all`, through a non-async
   function or a wrapping decorator); `@step` in fixtures and `beforeAll`; `get`, `clear` and `seed` among the storage
   methods in `test/step-locations` [2E-2, 2A].
9. **The checks' own blind spots**: static members [2T-5]; a WebSocket or protocol-relative URL on a test-server page
   [2T-7]; a fence written `` ``` ts`` [2T-2]; a `tsc` failing on stderr [2T-9]; a focused test in `step-locations/`
   [2T-4]; a route mounted through `express.Router()` (none exists).
10. **Doc-comment `@example` blocks** are compiled by no check (95 of 96 compile) [2Z-1]; the emit check covers 35
    expressions of about 160 public members [2F-2].
11. **Navigation**: a wait that times out on the load state of the right URL [2D-1]; `goto(target)`'s type on a RegExp
    base for a relative target with a colon [2D-2]; a broken page object built in the test body [2D-3]; a `UrlMatcher`
    in `page.route()`; overlapping navigation calls; a real HTTP authentication challenge; non-ASCII `urlPath` forms in
    query and fragment (all probed sound here except the three findings).
12. **Registration**: a `u`/`v` RegExp in a browser [2B-1]; a `<string>` registry's format check [2B-2]; a template
    value with a dot [2B-3]; an `add` left without its method [2B-4]; TypeScript's rename groups (the first review's gap
    7, still open).
13. **Queries**: a kept query across later registrations (unit-tested only); a `has` path in a query resolving from the
    registry; copies through a query's `filter` and `replace` on a DOM; the type forms 2C's T1 and T3 add.
14. **Logging and steps**: the locale hint for POSIX names [2E-1]; inherited and `super` titles [2E-3]; `afterEach`,
    `beforeAll` and post-timeout entries; a second `attachLogsToTest` (documented, untested); `tsc`'s standard-decorator
    output at run time.
15. **Types and packaging**: TypeScript 5.1 to 5.8 [2F-1]; emit under npm's layout; a changeset's migration hint
    against every code shape its change breaks [2F-4]; a module importing only `pomwright` under pnpm (by decision #70).
16. **Docs**: *Upgrading from 2.x* against its completeness promise (a 2.x consumer compiled against the build would
    list them) [2H-5, 2H-7, 2E-4]; the README's run-time claims [2H-3]; the bench's round-trip line [2G-4].
17. **The guide**: where a rule sits against its trigger [2I-1, 2I-2, 2I-8]; rule 7 (a `git grep` for plan references
    and a scan for work left in the folder) [2I-6, 2Z-3]; the guide's links (all 55 resolve today, unchecked in CI);
    the guide's lists against the tree [2I-7]; no local actionlint command.
18. **Node 26** (issue #55, known).

## 4. Confirmed defects

Most severe first. Every one names its contract; the full fix plan is in the finding's file.

### 2G-1: Publish's guard judges the commit CI tested, not what `main`'s tip will do

- **Area**: `publish.yaml`'s step "Continue only on the commit CI tested" (lines 41 to 67).
- **Contract**: `.github/AGENTS.md` *The workflows* (lines 31 to 34) and *Publish and Pages* (47 to 51): a run `main`
  moved past goes no further, and "if the tested commit is a release commit whose version is not on npm, that version
  would never be published, so the run fails and names the commit"; `internal/tests-and-checks.md` *CI* (100 to 104);
  `docs/releases.md` *Carrying out a release* (merge nothing with a changeset after the Version Packages pull request
  until that version is on npm).
- **Reproduction**: `bash $P/G/guard/sim.sh` (exit 0; output `$P/G/guard/sim.out`): throwaway repositories, the guard's
  `run:` script taken verbatim from the worktree's workflow and run as GitHub runs `shell: bash`, the real registry
  (read-only), and changesets' own libraries for what the action then does.
- **Observed / expected**: path (c), no rule broken: a changeset C merged, then the Version Packages pull request made
  before C, merged before Publish refreshed it: CI(C)'s run stops (`current=false`), CI(V)'s run opens a pull request
  `3.0.2 -> 3.0.3`: "3.0.2 is skipped … never published", and no run fails. Path (a), allowed by the rule: a docs-only
  commit after the release commit B: B's run fails with `::error::Version 3.0.2 of commit … was not published … Revert …`,
  then C's run publishes 3.0.2. Path (b)'s cancelled-run case is decided (#4). Expected: a failure that names the commit
  that set an unpublished version whenever a pending changeset would skip it, and no failure when the newer run
  publishes it.
- **Severity**: Medium: the release path; a sequence the guide does not forbid skips a version silently while the
  changelog says it was released, and another gives a false instruction to revert a published release.
- **Fix**: judge `main`'s tip (its version not on npm, changesets pending: fail and name the commit that set the version,
  `git log -1 --first-parent -G'"version":' -- package.json`); otherwise stop quietly on a moved-on run. Combine with
  2G-2 (same step; read the remote's tip). Option 4, a pull-request check, complements it. Gated (workflow mode):
  `2G-1.run.sh` exit 1 at `d850405` (three `FAIL` lines), exit 0 with the sketch. Docs: `.github/AGENTS.md`,
  `tests-and-checks.md`, `docs/releases.md`.
- **Semver**: none (a workflow and the guide; nothing published changes).

### 2A-9: a waiting call of a helper without an origin acts on the origin the page moved to

- **Area**: turns: the origin check when a waiting call's turn starts (`SessionStorage.inTurn`).
- **Contract**: `docs/session-storage.md` *The methods*: "A call that waited checks the origin again when its turn comes,
  since the page may have left it meanwhile"; `src/helpers/AGENTS.md` *Session storage*; `.changeset/storage-calls-take-turns.md`;
  the comment at `src/helpers/sessionStorage.ts:448-453`.
- **Reproduction**: `cp $P/A/p09-unbound-waiting.spec.ts test/tests/zz-probe-A-p09-unbound-waiting.spec.ts && pnpm -C test exec playwright test tests/zz-probe-A-p09-unbound-waiting.spec.ts --project=chromium --reporter=line`
  (exit 0; the probe prints). The page commits on B after the third `setItem`; a four-key `set` and a second call of the
  same helper run in one `Promise.all`.
- **Observed / expected**: a bound helper's waiting call fails with the origin message; the unbound one resolves and B's
  storage is `{"late":"meant for A"}`; a waiting `get()` returns `{"b-own":"B's own"}` as A's; a waiting `clear()` empties
  B. Expected: the waiting call compares the origin whose chain it joined and fails; nothing reaches B.
- **Severity**: Medium: overlapping calls and a navigation are a plausible edge case, and the wrong-origin write, read
  or clear is silent.
- **Fix**: in `inTurn`, keep the joined origin and fail the unbound helper's call when the page left it (a new message,
  which *Error messages* must list for `check-error-messages.mjs`). Gated: exit 1 at `d850405`, 0 with the sketch; unit
  904, storage specs 88.
- **Semver**: patch (the documented turn-start check).

### 2A-1: on Chromium, a page's first `seed` fails while the page goes through two or more script redirects on another origin

- **Area**: `seed`, the Navigation API check (`SeedRegistry.assertNavigationApi`, `src/helpers/sessionStorageSeed.ts:356-376`).
- **Contract**: `src/helpers/AGENTS.md` *Session storage* and `seed()`'s *Throws* and `@throws`
  (`sessionStorage.ts:633-646`) list the failures at the call; a navigation within another origin is none of them;
  *Seeding session storage*, *Two patterns*, seeds the next origin before the hop; the code's comment at line 369
  intends to survive a navigation during the check.
- **Reproduction**: `cp $P/A/p02-chain-lengths.spec.ts test/tests/zz-probe-A-p02-chain-lengths.spec.ts && pnpm -C test exec playwright test tests/zz-probe-A-p02-chain-lengths.spec.ts --project=chromium --workers=1 --reporter=line`
  (exit 0; the probe prints), and the same with `--project=firefox` and `--project=webkit`.
- **Observed / expected**: chromium, 2, 3 and 5 hops: "15 of 15 seeds failed
  [`P18.SessionStorage.seed: page.evaluate: Execution context was destroyed, most likely because of a navigation`]"; one
  hop, Firefox and WebKit: 0 of 15. Expected: the seed registers.
- **Severity**: Medium: an app that redirects itself twice while it loads, and a test that seeds the next origin
  meanwhile; it fails every time on Chromium, with a message that names no cause.
- **Fix**: retry the evaluation while a navigation destroys it and the page is open, bounded (the gate's note: the
  sketch's loop is unbounded, and matching Playwright's message text is fragile across versions). Gated: exit 1 at
  `d850405` (the chromium rounds), 0 with the sketch on three browsers.
- **Semver**: patch.

### 2A-2: on an `about:blank` page, any failed storage call says "the page has no origin yet"

- **Area**: `SessionStorage.access`, the failure of `set`, `get`, `clear` and an on-origin `seed`.
- **Contract**: *Session storage*, *Through a page object*: the origin check holds on an `about:blank` popup that
  inherited the origin; the "no origin yet" message is documented for a page without an origin; `set()`: any other
  Playwright error is labeled and the `cause`.
- **Reproduction**: `$P/A/p01-batch1.spec.ts` (`-g P3`, a 6 MiB write on an inherited popup) and `$P/A/p03-batch2.spec.ts`
  (`-g P3b`, a call after `popup.close()`), each copied to `test/tests/zz-probe-A-*.spec.ts` and run with
  `pnpm -C test exec playwright test tests/<file> --project=chromium --reporter=line -g <name>`; exit 0 (they print).
- **Observed / expected**: `Popup.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()`
  for the refused write and for the closed popup, where the page on the origin gets `QuotaExceededError` and "Target
  page, context or browser has been closed". Expected: Playwright's error, labeled.
- **Severity**: Low: a misleading message in a rare case.
- **Fix**: ask the document's own origin once when the URL has none; fold with 2A-10 (same lines). Gated: exit 1 at
  `d850405`, 0 with the sketch; unit 906 (its new case included).
- **Semver**: patch.

### 2A-3: `set`, `seed`, `get` and `clear` read their input after the call returns

- **Area**: turns and overlapping calls: when a call reads its entries, values and key lists.
- **Contract**: `src/helpers/AGENTS.md` *Session storage*: overlapping calls "end exactly as awaited ones";
  `internal/seed-registry.md` *Overlapping calls*. Playwright's own calls take their arguments at the call
  (`$P/A/p05-pw-arg-snapshot.spec.ts`: `page.evaluate saw: as passed`).
- **Reproduction**: `cp $P/A/p01-batch1.spec.ts test/tests/zz-probe-A-p01-batch1.spec.ts && pnpm -C test exec playwright test tests/zz-probe-A-p01-batch1.spec.ts --project=chromium --reporter=line -g P1`
  (exit 0; re-run by the consolidation, `$P/Z/recheck/a-p01.out`). The probe changes `entries.k` after the call and
  before awaiting it.
- **Observed / expected**: `P1 set stored: mutated after the call`, the same for an on-origin `seed`, and
  `get(keys) returned: {"k":"mutated after the call","s":"mutated after the call"}`. Expected: `as passed`, and `{ k }`
  only.
- **Severity**: Low: only a caller who changes what it passed while the call is pending.
- **Fix**: copy what the call reads at the call (`Object.entries` pairs, `[...keys]`, `options.origin`), before the step;
  document when a codec value is encoded.
- **Semver**: patch.

### 2A-4: batch and seed messages print keys unquoted

- **Area**: the navigation message of a batch, and the seed messages that list keys (`eachKey`, `describeKeys`).
- **Contract**: *Error messages*: "Every message names what it is about"; *The methods*: the call fails "naming the keys
  done, which stay, and the one in flight"; `get`'s and the encoding messages quote the key.
- **Reproduction**: the same probe with `-g P2` (re-run by the consolidation): keys `""`, `"a, b"` and `c`, the page
  committing on B after the second `setItem`.
- **Observed / expected**: `… 1 of 3 keys were written (); a, b was being written and may have reached the new document`.
  Expected: `("")` and `"a, b"`, as `get` writes them; the seed messages print `(keys: )` for an empty key.
- **Severity**: Low.
- **Fix**: `JSON.stringify` each key. Every page and `@throws` that shows these messages changes, and four pending
  changesets quote them (`batch-navigation-message.md`, `empty-seed.md`, `never-applied-several-seeds.md`,
  `seed-closed-page-message.md`).
- **Semver**: patch.

### 2A-10: the opaque-origin message is lost when a sandboxed document's script declares a global `origin`

- **Area**: `SessionStorage.access`, the opaque-origin explanation.
- **Contract**: `.changeset/sandboxed-document-message.md`: the message "on every browser"; *Session storage*, *Through a
  page object*; the precedent of `bfbc00f`, which made the Navigation API check immune to a page's own `navigation`
  global.
- **Reproduction**: `$P/A/p13-shadowed-origin.spec.ts` (a route with `Content-Security-Policy: sandbox allow-scripts`,
  its script empty or `var origin = location.origin;`), copied to `test/tests/` and run on chromium, firefox and webkit;
  exit 0 each.
- **Observed / expected**: with the global, the browsers' own wording (Chromium's SecurityError, Firefox's "Forbidden in
  a sandboxed document", WebKit's "The operation is insecure."); without it, the opaque message everywhere. Expected:
  the opaque message either way (`self.origin` is `[Replaceable]`, and `page.evaluate` runs in the page's world).
- **Severity**: Low: needs a sandboxed document with scripts and such a global.
- **Fix**: a check a page cannot shadow (the sketch treats a throwing `sessionStorage` getter as opaque); the gate's
  note: a getter can throw for other reasons (storage disabled by policy), so the fix needs a test that tells them apart.
  Fold with 2A-2.
- **Semver**: patch.

### 2B-1: a `u`- or `v`-flag RegExp with a quote, a backtick or `>>` fails at the first action once POMWright resolves it

- **Area**: `getById`, the `STRATEGIES` table against Playwright, the terminal's `describe`.
- **Contract**: *Locating by id*, *A RegExp* and *Flags* ("Every flag goes to Playwright unchanged"; "never rejected or
  rewritten"); `src/locators/AGENTS.md` (`internal:attr=[id=/source/flags]`, every flag passed); *Registering
  locators* ("A registration resolves to what Playwright's method returns").
- **Reproduction**: `node $P/B/p02/2B-1.mjs chromium` (also `firefox`, `webkit`); exit 1.
- **Observed / expected**: `getById(/a"b/u)`, `/it's/v` and `/a>>b/u` fail with `InvalidSelectorError` at
  `[id=/a"b/u] >> internal:describe=…`; `getByRole("button", { name: /don't save/iu })` fails through POMWright and
  through Playwright's own `.first()`, while a bare `page.getByRole` works. Expected: `getById` finds its element, as
  without `u`.
- **Severity**: Low: a rare input, loud failure.
- **Fix**: in unicode mode, write `"`, `'`, `` ` `` and the second `>` of `>>` as hex escapes in `getById`'s selector;
  for the strategies Playwright builds, document the limitation and report it upstream (a decision). Gated for
  `getById`: exit 1 at `d850405`, 0 with the sketch on three browsers; the `getByRole` row still fails, as the finding
  says.
- **Semver**: patch for `getById`; none for the others.

### 2D-1: on the right URL with a late load state, `expectThisPage()` says it expected that URL and found it

- **Area**: `Navigation.waitForUrl` (`src/helpers/navigation.ts:195-205`), the wait messages.
- **Contract**: *URLs and navigation*, *Options and timeouts*: a wait that times out "names the page object, what it
  expected and the URL found"; *Navigating*: `waitForURL` returns after the requested load state when the URL is
  already right, so it can time out on that state.
- **Reproduction**: `cp $P/D/p03-load-state-message/zz-probe-d03.spec.ts test/tests/ && pnpm -C test exec playwright test tests/zz-probe-d03.spec.ts --project=chromium --reporter=line`
  (exit 0; an image request that never answers holds `load`).
- **Observed / expected**: `ItemPage: expected URL "http://localhost:9000/testnav/item/7"; found "http://localhost:9000/testnav/item/7" (page.waitForURL: Timeout 1000ms exceeded.)`,
  and `expectAnotherPage()`: "expected to have left …/7; found …/8". Expected: a message that says the URL was reached
  and the load state was not.
- **Severity**: Low: a self-contradicting message in ordinary use (a slow `load`).
- **Fix**: on a `TimeoutError` with the URL passing the predicate, the load-state message (new; *Error messages* lists
  it). Gated: exit 1 at `d850405` (6 failed on three browsers), 0 with the sketch.
- **Semver**: patch.

### 2D-2: on a RegExp `baseUrl`, `goto(target)` compiles for a relative target with a colon, which the runtime always rejects

- **Area**: `NavigationFor<RegExp, …>`'s `goto(target)` (`AbsoluteUrl`, `src/helpers/navigation.ts:14`).
- **Contract**: `api/class-navigation.md` (a RegExp base takes `goto(absoluteUrl)`; the relative-target message comes
  "from JavaScript"), `api/errors.md` *Navigation* and `goto`'s `@throws` (the same); `publicTypes.typecheck.ts:733-734`
  rejects `goto("/orders")`.
- **Reproduction**: types: `cp $P/D/p05-types/zz-probe-d05.typecheck.ts test/tests/ && pnpm exec tsc --noEmit -p test`
  (exit 0: every relative target compiles); runtime: `node $P/D/p05-types/runtime.mjs` (exit 0; re-run by the
  consolidation).
- **Observed / expected**: `"/orders?at=12:00"`, `"/orders/a:b"`, `"?at=12:00"` and `"1:2"` compile and each throws
  `RegExpBase: goto("…") needs an absolute URL because baseUrl is a RegExp.` Expected: a compile error, as for
  `"/orders"`.
- **Severity**: Low.
- **Fix**: `AbsoluteUrl` starting with a letter (`a/b:c` still passes, as its doc comment would say). Gated: four unused
  `@ts-expect-error` at `d850405`, `tsc` over `test/` exit 0 with the sketch.
- **Semver**: patch (a type corrected to what the docs promise; only code that always threw stops compiling).

### 2E-1: for a POSIX locale name such as `en_US.UTF-8`, the locale check's hint names a value the same check rejects

- **Area**: `checkDateFormat` (`src/helpers/playwrightReportLogger.ts:349-351`), the `log` fixture's and
  `attachLogsToTest`'s locale check.
- **Contract**: *Error messages*: every message says "what to change"; *Logging*: "write the tag with hyphens".
- **Reproduction**: `node $P/E/2E-1/check-hint.mjs` (exit 1; re-run by the consolidation, `$P/Z/recheck/e-2E-1.out`).
- **Observed / expected**: `"en_US.UTF-8": … such as "en-US.UTF-8"` → `HINT REJECTED`, and the same for `nb_NO.utf8` and
  `de_DE@euro`; `en_US` and `zh_Hant_TW` get accepted hints. Expected: a hint the check accepts (`en-US`), or none.
- **Severity**: Low.
- **Fix**: derive the tag from the language and territory, and hint only a value that passes `Intl.getCanonicalLocales`.
  Gated: exit 1 at `d850405`, 0 with the sketch; the logger's unit tests and `logging.spec.ts` pass.
- **Semver**: patch.

### 2G-2: a re-run of a Publish run goes on after `main` moved past the commit CI tested

- **Area**: `publish.yaml`'s guard on a re-run (line 51, `git rev-parse HEAD`).
- **Contract**: `.github/AGENTS.md` (31 to 33, 47 to 49): Publish goes no further when `main` has moved on;
  `main.yaml:16-17`: "publish.yaml goes on only on it: deployments follow commit order, re-runs included";
  `tests-and-checks.md` *CI*. GitHub's docs: a re-run keeps the original `GITHUB_SHA`.
- **Reproduction**: `bash $P/G/guard/rerun.sh` (exit 0; output `rerun.out`): a bare origin and a runner checkout, the
  guard's script verbatim.
- **Observed / expected**: the re-run of P's run after C was pushed prints `current=true` and rebuilds the Version
  Packages pull request from P (without C's changeset; changesets/action force-pushes the branch to `GITHUB_SHA`);
  merged as it stands, it leads to 2G-1's path (c). Expected: the re-run stops; a re-run of a release commit whose
  publish failed still publishes it.
- **Severity**: Low: needs a failed Publish run re-run after a later merge.
- **Fix**: read the tip with `git ls-remote`, as `pages.yaml` does, keeping the failed-release exception; combine with
  2G-1. Gated (workflow mode): exit 1 at `d850405`, 0 with the sketch.
- **Semver**: none.

### 2T-1: the docs-chains spec and the lifecycle-outcomes spec compare the code with copies of the pages

- **Area**: `test/tests/docs/docsChains.spec.ts`, `test/tests/pageObject/lifecycle.outcomes.spec.ts`.
- **Contract**: `internal/tests-and-checks.md` *The harness*: "a chain that a change to the code or to the page made
  stale names its page", and the outcomes "compared with the table in Page objects"; the spec's own header ("fails here
  until the page and this spec change together"); `test/AGENTS.md`.
- **Reproduction**: `grep -nE "node:fs|readFile|import " test/tests/docs/docsChains.spec.ts test/tests/pageObject/lifecycle.outcomes.spec.ts`
  (no file read); `node $P/T/docs-chains/spec-vs-pages.mjs /home/magdys/workspace/dyhex/POMWright-second-review`
  (`found 114, missing 1, non-literal 7`: the copies agree today). Gated demonstration: `$P/T/sketch/2T-1.diff` changes
  a chain on *Queries* (`.first()` to `.last()`) and the outcomes table's `beforeEach` row; both specs still pass.
- **Observed / expected**: a page edited alone passes every check. Expected, by the pages: it fails.
- **Severity**: Low: nothing is stale today.
- **Fix**: make the specs read the pages (each literal also found on its page; the table's rows parsed), or say they hold
  copies kept by hand (decision 59's wording).
- **Semver**: none.

### 2T-2: the snippet check neither compiles nor rejects a TypeScript block whose fence has a space before `ts`

- **Area**: `scripts/check-doc-snippets.mjs` (the fence regex, line 28).
- **Contract**: the script's header (lines 15 and 16) and `website/AGENTS.md`: a TypeScript block it would not compile
  fails it with the fix; *Internal → Documentation*: "Nothing is skipped silently".
- **Reproduction**: `cd $P/T/snippets-mirror && node scripts/check-doc-snippets.mjs` (the script byte-identical to the
  worktree's; a page with a control block, a `` ``` ts`` block and a `` ```TS`` block, each assigning a string to a
  number); exit 1 with one error only (re-run by the consolidation). `node $P/T/fence-lang.mjs …` shows the site's
  Markdown parser reads `` ``` ts`` as `ts`.
- **Observed / expected**: the spaced block is neither compiled nor listed. Expected: compiled, or rejected with the fix.
- **Severity**: Low: no such block today.
- **Fix**: read the language as CommonMark does and reject labels other than exactly `ts` or `typescript`.
- **Semver**: none.

### 2T-3: two `test.fail(true)` session storage tests hold an assertion that cannot fail them

- **Area**: `test/tests/testApp/sessionStorage.spec.ts:749-762` and `:1340-1346`.
- **Contract**: the first test's title ("the popup has its own storage and the seed stays pending") and
  *Seeding session storage* line 142 ("a new tab has its own session storage and does not run the page's init
  scripts"); the second's `startup` assertion after a refused write.
- **Reproduction**: `$P/T/popup/zz-probe-T-popup.spec.ts` and `zz-probe-T-refused.spec.ts` (each runs the test as
  written and with its assertion inverted, under the same `test.fail`), copied to `test/tests/` and run with
  `--project=chromium --reporter=json`; exit 0.
- **Observed / expected**: both variants "failed, expected failed"; stats `{"expected":2,"unexpected":0}` for each file.
  Expected: an assertion that decides the result.
- **Severity**: Low: the library behaves as documented today; the spec cannot see it stop.
- **Fix**: split each test (the claim in a test without `test.fail`, the failure in one that checks its message).
- **Semver**: none.

### 2T-4: the step-location run accepts a stray `test.only` in CI, then checks only that file and passes

- **Area**: `test/playwright.steps.config.ts`, `test/step-locations/locationReporter.ts`.
- **Contract**: `test/AGENTS.md`: the reporter fails "when … a marked line is never reported", and the run cannot be
  switched off; `locationReporter.ts:16-17`; the harness's own `forbidOnly: !!process.env.CI` (`playwright.base.ts:13`),
  which the steps config does not spread.
- **Reproduction**: `cp $P/T/steps/zz-probe-T-only.spec.ts test/step-locations/ && CI=1 pnpm -C test exec playwright test -c playwright.steps.config.ts; rm test/step-locations/zz-probe-T-only.spec.ts`
  (re-run by the consolidation, `$P/Z/recheck/t-2T-4.out`).
- **Observed / expected**: exit 0, `step locations: 1 checked, all where they were called` (the baseline checks 31).
  Expected: Playwright's `forbidOnly` error in CI, as under the harness config.
- **Severity**: Low: needs a committed `test.only`.
- **Fix**: `forbidOnly: !!process.env.CI` in the steps config (with 2T-8).
- **Semver**: none.

### 2T-5: the API coverage check never walks static members, and walks fewer members silently when `@playwright/test` does not resolve

- **Area**: `scripts/check-api-coverage.mjs` (lines 112 to 151, and the program at line 40).
- **Contract**: the script's header (every public or protected member has a summary, a `@see` and a heading);
  `website/AGENTS.md`.
- **Reproduction**: `node $P/T/api-coverage/mutate.mjs /home/magdys/workspace/dyhex/POMWright-second-review $P/T/api-coverage`
  and `node scripts/check-api-coverage.mjs $P/T/api-coverage/unresolved.d.ts` (re-run by the consolidation).
- **Observed / expected**: an undocumented public static method or static property passes (exit 0, 0 problems) where an
  instance method fails; the unresolved copy reports 105 members, the installed package 108 (`FilterDefinition`'s three
  fields), both with 0 problems. Expected: statics checked; an unresolved import fails the check.
- **Severity**: Low: no static member is public today, and CI resolves the import.
- **Fix**: walk the static side too (`getTypeOfSymbol`, skipping `prototype`); fail on an import that does not resolve.
- **Semver**: none.

### 2T-7: the test-server check does not see a WebSocket to another host, nor a protocol-relative URL loaded on a click or timer

- **Area**: `test/test-server/externalRequests.spec.ts` (the listener at line 54, the scan at line 69).
- **Contract**: the spec's header ("every request that context reports is checked"; the scan covers "anything a page
  would load only on a click or a timer"); `test/AGENTS.md`.
- **Reproduction**: `node $P/T/test-server/scan-replica.mjs /home/magdys/workspace/dyhex/POMWright-second-review` (the
  spec's own regex and host test; re-run by the consolidation): protocol-relative URLs and a WebSocket are not flagged.
  Gated demonstration: `$P/T/sketch/2T-7.diff` adds a load-time `wss://` WebSocket and a click-time `//cdn.example`
  fetch to `/testnav`; `test-server-check.sh` still passes 26.
- **Observed / expected**: both reach another host unseen. Expected: the check fails.
- **Severity**: Low: no page does either today.
- **Fix**: `page.on("websocket")`; a scan for `wss?://` and a `//host` that starts a host name.
- **Semver**: none.

### 2T-9: the snippet check judges `tsc` by its stdout, so a `tsc` that fails on stderr only passes it

- **Area**: `scripts/check-doc-snippets.mjs:119-134`.
- **Contract**: the script's header (type-checks every block); "Nothing is skipped silently"; a run is judged by its exit
  code.
- **Reproduction**: `cd $P/T/snippets-stderr && node scripts/check-doc-snippets.mjs`: the script unchanged, one page with
  a block that does not compile, and `node_modules/.bin/tsc` replaced by a stand-in that writes to stderr and exits 134
  (re-run by the consolidation).
- **Observed / expected**: exit 0, `doc snippets: 1 checked, 0 skipped (nocheck)`. Expected: a non-zero `tsc` fails it.
- **Severity**: Low: needs `tsc` itself to fail (a crash, an out-of-memory abort).
- **Fix**: in the `catch`, fail with stderr when stdout is empty (with 2T-2).
- **Semver**: none.

## 5. Documentation findings

All semver *none* (docs, doc comments, comments, the guide), unless a code option says otherwise. Medium first.

### 2I-2 (Medium): rules whose trigger is in one area sit in another area's file, and neither the trigger's file nor the index leads there

- **Page and text**: `docs/repository.md:45-48`: a rule goes "in the file that loads for every change that can trigger
  it", or the trigger's file points to it. (a) `website/AGENTS.md` lines 52 and 57 to 58 (a change of design or of a
  mechanism updates the Internal and Docs pages) are reached from `src/AGENTS.md`'s pointer (lines 59 to 61) and the
  index row only for "a doc comment, a message, chain or rendering"; (b) what moves with the Node floor is only in
  `.github/AGENTS.md`, whose row is read first only for CI scripts; (c) the bench rerun after a registry change; (b′) the
  Playwright floor's places on the pages; (c′) a split *Do not* item.
- **Consolidation's addition**: `.github/AGENTS.md` has no pointer to the page rule either (`grep -n -i "website\|internal"
  .github/AGENTS.md` names neither `website/AGENTS.md` nor an Internal page), and three findings of this review are
  Internal pages left stale by CI commits: 2H-1 (`f866325`, `429f2c2`), 2G-3 (`3284aa4`) and 2G-5 (`0905892`,
  `d850405`). So trigger (a) holds for `.github/` as well as `src/`.
- **Severity**: Medium, kept from 2I: the guide's own placement contract fails for common tasks, and this review shows
  its effect.
- **Fix**: name website's triggers in full in `src/AGENTS.md`'s pointer and in the index row; give `.github/AGENTS.md`
  the same pointer for the CI pages (*Tests and checks*, *Documentation*); a Node-floor bullet in `docs/versioning.md`;
  the bench pointer in `src/locators/AGENTS.md`; the Playwright floor's pages in `docs/versioning.md`; the split *Do not*
  item restored in `test/AGENTS.md`. Fix with 2I-1 and 2I-8.

### 2A-5: *What `seed` cannot do*, which the API page says "lists every such case", leaves out an arrival on a sandboxed document

- **Page and text**: `api/class-sessionstorage.md`, `seed()`: "[What `seed` cannot do] lists every such case"; the table
  in *Seeding session storage* has no row for a `Content-Security-Policy: sandbox` arrival; `seed`'s `@throws`
  (`sessionStorage.ts:644-645`) names only a failed navigation.
- **Probe**: `$P/A/p04-sandboxed-arrival.spec.ts` (a seed, then `goto("/teststorage/sandboxed")`), exit 1 on three
  browsers with the opaque "was not applied" message: the behaviour is right, the list is incomplete.
- **Fix**: the row, and "(a failed navigation there, or a sandboxed document)" on the API page and in `@throws`.

### 2A-6: the docs say one schema mismatch still compiles; a schema variable with a codec the type does not declare compiles too

- **Page and text**: *Session storage*, *Through a page object* (line 165): "One case still compiles: a page object that
  declares `storage` but passes no `sessionStorage.schema`"; `src/helpers/AGENTS.md` says the same;
  `.changeset/schema-type-and-value.md` says the disagreement is gone.
- **Probe**: `$P/A/t01-types.typecheck.ts` (compiles: re-run by the consolidation) and `$P/A/p06-batch3.spec.ts -g T1`:
  `get("count")` typed `string | null` returns the number `42`. `publicTypes.typecheck.ts:531-537` knows the case.
- **Fix**: name both cases (a value passed through a variable is not checked for extra keys); the code cannot reject it
  (no constructor type parameter; issue #58 would close it). Touches the same changeset as 2F-4.

### 2B-2: the docs say a registry typed `<string>` gives up the compile-time check of a path's format; a malformed literal is still a compile error

- **Page and text**: `docs/locator-paths.md:332-334`, `api/class-locatorregistry.md:298`, `api/types.md:196-197`,
  `api/errors.md:48`, the doc comments at `locatorRegistry.ts:44` and `:783-785`, and
  `.changeset/registry-requires-paths.md:13`.
- **Probe**: `$P/B/t01/zz-probe-B-t01.typecheck.ts` in `test/tests/`, `pnpm exec tsc --noEmit -p test` (re-run by the
  consolidation, `$P/Z/z1-example/tsc.out`): `add("main..list")`, `getNestedLocator(".main list")`, `getLocator("main.")`
  on a `<string>` registry and `this.add("main..list")` in a `PageObject<string>` are TS2345 with the path error.
- **Fix**: say `<string>` gives up completions, the union check and sub-paths; a literal is still checked. Add a
  `@ts-expect-error` line to the path typecheck file.

### 2B-3: an open template part "accepts any value", but a value with a dot adds segments and chains a registered prefix

- **Page and text**: *Locator paths*, *Paths with a dynamic part* (lines 125 to 127).
- **Probe**: `node $P/B/p04/dotted-value.mjs` (re-run): `files.link@report.pdf` resolves as
  `…getByRole('link', { name: 'report', exact: true }).getByRole('link', { name: 'report.pdf', … })`, count 0;
  `strictChains` fails every dotted value.
- **Fix**: one sentence (a dot adds segments; keep dots out of an open part).

### 2C-1: the docs say `replace`'s first argument is always required and every method throws without it; `replace(…).frameLocator()` takes none

- **Page and text**: `api/class-locatorupdatebuilder.md:15-16` and `:63-64`, `docs/queries.md:135-136`,
  `internal/builders.md:89-90`, the type's doc comment (`locatorUpdateBuilder.ts:124-125`),
  `.changeset/undefined-first-argument.md`, and the guide's `src/locators/AGENTS.md:68` (2C's note, folded here).
- **Probe**: `node $P/C/p5-broad-claims.mjs` part (1) (re-run): nine methods throw, `frameLocator` resolves to
  `frameLocator().locator('ul').locator('li')`.
- **Fix**: name the exception in each sentence. Related: 2C-3.

### 2C-2: *Error messages* lists the unregistered-path message under the resolving calls; `getLocatorSchema` throws it at its call

- **Page and text**: `api/errors.md:178`: "Thrown by `getNestedLocator`, `getLocator`, a query's resolving methods, and
  `verify()`".
- **Probe**: `node $P/C/p5-broad-claims.mjs` part (2) (re-run): `getLocatorSchema("main.nothing") throws at the call`.
- **Fix**: add `getLocatorSchema` to the list.

### 2D-3: the table of where a broken page object is built has no row for the test body, where the docs' first example builds it

- **Page and text**: *Page objects*, *How a mistake is reported* (three rows); *Your first page object* builds it in the
  body.
- **Probe**: `$P/D/p04-outcomes/zz-probe-d04.spec.ts`, `--reporter=json` (exit 1 by design): built in the body or a
  `test.step`, the test fails at the `new` line and the body runs on past it, sometimes adding
  `page.waitForTimeout: Test ended.`
- **Fix**: the row, a sentence on *Internal → Page object lifecycle*, and a case in `test/lifecycle-outcomes/` with the
  spec's table (see 2T-1: the spec holds a copy).

### 2D-5: *Internal → URL matching* says Playwright never runs a `RegExp` subclass's own matching; `page.waitForURL` does

- **Page and text**: `internal/url-matching.md:73`.
- **Probe**: `$P/D/p12-regexp-subclass/zz-probe-d12.spec.ts`, three browsers: `waitForURL` ran the subclass's `test()`;
  `page.route` and `toHaveURL` used its source.
- **Fix**: state it call by call; the conclusion stands.

### 2E-2: the pages say a `@step` step is reported at the line that called the method, boxed or not; where the call is not awaited on its own line, it is not

- **Page and text**: `api/step.md:64-65` ("the step is reported at the calling line either way", from `f8ca42a`);
  `docs/test-steps.md:36`, `:55`, `:102`.
- **Probe**: `$P/E/locations/zz-probe-E-loc.spec.ts` with `$P/E/locations/printReporter.ts`: an unboxed step awaited
  later has no location; in a multi-line `Promise.all` it is at the `await` line; a boxed step under a wrapping
  decorator is at the decorator's line, its error at the awaiting line. Playwright's own `test.step` places unboxed steps
  the same way.
- **Consolidation**: the navigation helpers' sentence ("shown at the line that called it", *URLs and navigation*
  lines 109 to 110) holds: `$P/Z/z2-storage-regexp-and-nav-steps/` puts each step at the line that called the method
  (awaited later: line 44; in a multi-line `Promise.all`: 48; through a non-async helper: the helper's `goto()` line).
- **Fix**: docs only (where an unboxed and a boxed step and its error are placed).

### 2E-3: no page says a step's title names the class of the object the method runs on; a `super` call shows two steps with one title

- **Page and text**: the `step` doc comment (`stepDecorator.ts:163-164`), `api/step.md`, `docs/test-steps.md`.
- **Probe**: the same run as 2E-2: `Widget.inherited` for a method `Base` declares; `Widget.overridden` inside
  `Widget.overridden`.
- **Fix**: say so; a unit test pins the rule.

### 2E-4 (merged with 2H-8): *Upgrading from 2.x* does not say that a `locale` `Intl` rejects (`en_US`), which 2.x ignored, fails every test that requests `log`

- **Page and text**: *Upgrading from 2.x*, *Reports → Log attachments keep what was logged* (lines 662 to 673), marked
  **Compiles**, while the page "lists everything that does not [keep working]".
- **Probe**: 2.x: `$P/E/upgrade/v210-attach.cjs` (`pomwright@2.1.0` from npm attaches with `en_US`, exit 0); 3.x: the
  first review's E-2 probe re-run (`$P/E/run1/E-2/locale.spec.ts`, three browsers) and 2H's
  `$P/H/locale/zz-probe-H-locale.spec.ts` (Playwright alone and POMWright's `test` without `log` pass with `en_US`; the
  test that requests `log` fails with `log fixture: locale "en_US" is not a BCP 47 language tag; write it with hyphens, such as "en-US"`).
- **Fix**: mark the item **fails at run time** for such a locale, with the message, a search and a link to *Names in
  your locale*. With 2H-4, 2H-5 and 2H-7: one pass over the page.

### 2F-1: *Installation* says TypeScript 5.0 needs `skipLibCheck` for Playwright's declarations; it is 5.0 and 5.1, by `@types/node` version, for Node's declarations too

- **Page and text**: `docs/installation.md:55-56`; `scripts/consumer-check.sh:9`.
- **Probe**: `bash $P/F/floor/run.sh` (exit 0): TypeScript 5.1.6 with `@types/node` 24 fails in `playwright-core` (24) and
  `@types/node` (57); 5.0.4 with `@types/node` 22 fails in `@types/node` only; nothing fails with `@types/node` 20;
  POMWright's own declarations never.
- **Fix**: reword (below 5.2, depending on `@types/node`); optionally add 5.1 to the consumer loop.

### 2F-2: the declaration emit check is said to return every public member; it returns 35 expressions

- **Page and text**: `test/AGENTS.md:96`, `internal/packaging.md:68`, `test/tsconfig.declarations.json`, the file's header.
- **Probe**: `$P/F/emit/gen-members.mjs` generates 161 members, which all emit on TypeScript 5.0, 5.4, 5.9, 6.0.3, 7.0.2
  (npm) and 6.0.3 (pnpm); `emit/coverage-vs-emit-check.txt` lists the 116 the harness never returns on its own.
- **Fix**: generate the list in `pnpm typecheck`, or narrow the claim.

### 2F-3: the changeset rule asks for a migration hint when code "a 2.x user wrote" stops working

- **Page and text**: `docs/versioning.md:22-23`.
- **Probe**: `$P/F/breaks/breaks.ts` against `pomwright@3.0.1` (exit 0) and the tarball (exit 2): the four announced
  breaks are 3.0.1 code.
- **Fix**: "code written against the previous release". Note: 2H-5 cites this sentence for the 2.x upgrade page; the
  page's own promise carries that case after the reword.

### 2F-4: `schema-type-and-value`'s migration, and its compile message, do not cover a subclass of the forwarding base class *Organizing a project* shows first

- **Page and text**: `.changeset/schema-type-and-value.md`; `SchemaNeedsStorageType` (`src/pageObject.ts:81-82`).
- **Probe**: `$P/F/breaks/forwarding.ts` against 3.0.1 (exit 0) and the tarball (exit 2, TS2322 with the advice that
  cannot be followed in a subclass of `ShopPage<Paths>`).
- **Fix**: a changeset sentence (the generic base class), optionally the message. Touches the same changeset as 2A-6.

### 2G-3: the guide says every merge updates the site once its checks pass; a green commit `main` moved past is not deployed when the newer commit's CI fails

- **Page and text**: `.github/AGENTS.md:52-54`; `pages.yaml:40-41` and its message at line 57; also `main.yaml:13-14`
  ("an older commit's run can never finish after a newer one's"; GitHub's docs: ordering "is not guaranteed") and
  `internal/documentation.md:63` ("never shows a commit whose checks failed", while a manual run builds `main`'s tip).
- **Probe**: `bash $P/G/pages/sim.sh` (exit 0): B green, C red: B's run `deploy=false`; C's job condition is false; the
  site stays at A.
- **Fix**: describe the tip rule as it is.

### 2G-4: *Performance*'s round-trip comparison comes from no script, and a re-measurement does not support "under 5%"

- **Page and text**: `internal/performance.md:162-165`; `test/AGENTS.md` (rerun `pnpm bench` and update the page).
- **Probe**: `grep -rn "count()" scripts test/benchmarks` finds nothing (re-checked); `node $P/G/bench/count.mjs` five
  times: medians 194 to 741 µs against the page's 370 to 710; at the low end the longest chain is 8.6%. Also lines 41 to
  43's "no column moved more than 19%" against +24% and −49% cells.
- **Fix**: add the round trip to `scripts/benchmark.mjs`, or keep only the order of magnitude.

### 2G-5: *Tests and checks* lists no test-server job, and `pr.yaml`'s header names Node 20 only

- **Page and text**: `internal/tests-and-checks.md` *CI* (lines 76 to 96); `.github/workflows/pr.yaml:3-4` (2I's note,
  folded here).
- **Probe** (re-checked): `grep -c -i "test-server\|test server\|another host" …/tests-and-checks.md` prints 0;
  `checks.yaml:158` is `node: ["20", "22"]`.
- **Fix**: add the job; "Node 20 and 22".

### 2H-1 (merged with 2T-6 and 2I-4): *Internal → Documentation* says CI's site job runs all three checks on changes that touch code or the pages, and the harness two

- **Page and text**: `internal/documentation.md:44-45`.
- **Probe** (re-checked): the site job runs `check-doc-snippets.mjs` and `check-api-coverage.mjs` (`checks.yaml`, site
  job), builds the site and renders the diagrams, on every run; `pack-test.sh:44-46` runs all three scripts. History
  (2I-4): the sentence is from `84a550f`, true then; `f866325` (every job on every run) and `429f2c2` (the error-message
  check, harness only) made it stale. 2T-6 records the two readings of "all three" (the scripts, or the three bullets
  of 2026-10-17).
- **Fix**: name each check per job; optionally run `check-error-messages.mjs` in the site job too (2G's call; 2T and 2H
  noted it).

### 2H-2: "misspelt" on four pages and in a doc comment, and "initialiser" on an Internal page, against the American spelling rule

- **Page and text**: `website/AGENTS.md` *Rules*: "American spelling". `verifying-registries.md:10`, `typescript.md:73`,
  `principles.md:46`, `filters-and-indices.md:67`, and `LocatorSchemaPathArgument`'s doc comment
  (`locatorRegistry.ts:52`, in the published declarations); **and** `internal/page-object-lifecycle.md:29`,
  "initialiser" (since `5ab09ea`, at `54cdada`), which 2I found and 2H's sweep missed.
- **Probe**: `grep -rn misspelt README.md website/src/content/docs src`; the consolidation's sweep of `-ise`, `-iser`,
  `-our`, `-lled`, `-yse`, `-ogue` and `-spelt` forms over the pages, the README and the non-test sources finds these
  six and the README's `"Cancelled"` (the example app's data, not prose).
- **Fix**: "misspelled", "initializer"; last, after the other page edits.

### 2H-3: the README's example "logs the orders to the report" with `log.info`, which a first run does not record

- **Page and text**: `README.md:74-75` and line 96; the fixture records `warn` and `error` on a first run (its doc
  comment; *Logging*, *Levels*; *Page objects in tests* says so for the same kind of line).
- **Probe**: `$P/H/readme/zz-probe-H-readme.spec.ts` (the README's test verbatim against a routed app), JSON report: the
  test passes with no attachment; the `log.warn` control attaches one.
- **Fix**: `log.warn`, or say the entry shows on a retry. Issue #62's migration list should name the README.

### 2H-4 (merged with 2A-7): *Upgrading from 2.x* quotes a TS2339 message that 3.0.2's types no longer produce

- **Page and text**: `upgrading-from-2x.md:579-586`: `Property 'user' does not exist on type 'string | null'`.
- **Probe**: the page's `AccountPage` and its two 2.x lines compiled against the tarball, 3.0.1, `54cdada`, `f422b77~1`
  and `f422b77` (`$P/H/upgrade/v3b/`, `v301b/`, `src-*`): since `f422b77` the type is
  `'string | { name: string; age: number; } | null'`. 2A-7's `$P/A/t01-types.typecheck.ts` gives the same (re-run by
  the consolidation), and its `$P/A/t03/` shows why (`Decoded` of an object key type).
- **Fix**: replace the line; list the three in the order `tsc` prints them.

### 2H-5: *Upgrading from 2.x* misses `createRegistryWithAccessors`'s required type argument, and marks the storage item **Compiles** though structured values without a codec do not compile

- **Page and text**: the page's front matter and *Introduction* ("this page lists everything that does not"); steps 2 and
  3; `README.md:165-166`. 2F's note on the same omission is folded here.
- **Probe**: `$P/H/upgrade/consumer.ts`, a 2.x consumer, compiled against v2.1.0 (exit 0), 3.0.1 (20 errors) and
  `d850405` (22): the two left are `createRegistryWithAccessors(page)` then `add("main")` (TS2345, "needs its paths as
  a type argument") and `set({ user: { … } })` on a helper without a schema (TS2322). The 2.x side needs the v2.1.0
  worktree recreated (commands in the finding).
- **Fix**: a **compile error** item for the registry, and "**Compiles** for strings; **compile error** for structured
  values" on the storage item; drop `first()` and `last()` from the frame item's search (no registration has them).

### 2H-6: *Installation* says session storage values are checked at runtime as the types check them; a codec key's value is not

- **Page and text**: `docs/installation.md:25-28`; *Session storage* (lines 68 to 69) and *Principles* say otherwise.
- **Probe**: `$P/H/install/types.typecheck.ts` (the types reject four values) and `zz-probe-H-install.spec.ts` (at run
  time `user=42` is stored and read back as `42`; only the undeclared `token=7` throws).
- **Fix**: list the codec key's value as an exception beside `nth`.

### 2H-7: *Upgrading from 2.x*'s JavaScript item (`describe` and `nth`) asks for a change and gives no search

- **Page and text**: step 3 (lines 18 to 21): each item that needs a change gives the search, the others say they need
  none; the item at lines 306 to 312 does neither.
- **Probe**: H-3's `awk` count with a 40-character cut (in the finding); `node $P/H/nthnull/nthnull.mjs`: `nth(null)`
  and `nth(undefined)` match nothing, as the item says.
- **Fix**: a search for JavaScript files, or a sentence on why none.

### 2I-1: the dev-dependency rule, and the site-dependency rule, sit in folder files a dependency change does not reach

- **Page and text**: `src/AGENTS.md:42-43` and `website/AGENTS.md:125-126, 135`; the index sends "a dependency" to
  `docs/repository.md`, which states neither.
- **Probe**: `grep -n -i dependenc` over the ten files (in the finding; re-checked).
- **Fix**: move both to `docs/repository.md` *Toolchain*, a pointer in `src/AGENTS.md`.

### 2I-3: the guide says Claude Code loads a folder's `AGENTS.md` when a file there "is read"; its documentation says when a file is opened with the Read tool, under the working directory

- **Page and text**: `AGENTS.md:88-91` and the index's "Loads by itself" column; `docs/repository.md:35-36`.
- **Evidence**: Claude Code's *How Claude remembers your project* (fetched 2026-10-28, `$P/I/web/claude-code-memory.md`).
  The consolidation adds one observation: this session (Claude Code, started outside the worktree) opened
  `src/helpers/url.ts` of the worktree with the Read tool and no `AGENTS.md` loaded, while the root `AGENTS.md` above
  its working directory loaded at the start; consistent with the working-directory condition.
- **Fix**: state the trigger as documented and widen the fallback.

### 2I-5: `docs/releases.md` describes `release-<version>/` and one plan per item; the 3.0.2 work used `defect-review-result/` and grouped plans, by decision, and the audit did not update the guide

- **Page and text**: `docs/releases.md:13-18`; decisions 5 and 62 (the first review's `DECISIONS.md`).
- **Probe**: `git log` of the working folder and the `Plan:` lines (44 plan files; groups of three and four items; four
  plans with no item).
- **Fix**: amend *Planning* from decisions 5 and 62.

### 2I-6: a spec still cites "the plan's section 1.9" as its contract

- **Page and text**: `test/tests/locatorRegistry/registry/registry.verify.spec.ts:7` (re-checked), against rule 7.
- **Probe**: the `git grep` in the finding finds only this line outside the guide's own description of the rule; it is
  in `v3.0.1` and `54cdada` too.
- **Fix**: point the comment at *Verifying registries* and *Internal → Resolution*; optionally make the `git grep` a
  step of the rule 7 audit.

### 2I-7: twelve small statements of the guide, its index and the README do not match the repository

- **Page and text**, one line each (re-checked where marked ✓): (1) *Do not* sections promised for every indexed file;
  the three `docs/` files have none ✓; (2) "beyond the ones below" for *Commands* above the index ✓; (3) `vitest.config.ts`
  sent to `test/AGENTS.md`, which does not cover it; (4) `test-server-check.sh` in no row; (5) "its versions and
  releases: docs/versioning.md" ✓; (6) "Rules 8 and 9" ✓; (7) `.changeset/` "config only" ✓; (8) the map's missing
  rows and `CODEOWNERS`; (9) the page-object layout; (10) the README's list of four folder files ✓ (2H read it as "in
  `src/` and below" and did not file it; kept here: the list names folders, and two of six are missing); (11) "CI" in
  two senses in `.github/AGENTS.md`; (12) two of three compile-only probes named.
- **Fix**: one pass over the text, item by item as the finding lists.

### 2I-8: with another client, the guide says to read "the folder's file"; the `src/` subfolder files never point to `src/AGENTS.md`

- **Page and text**: `AGENTS.md:88-91`; the intros of `src/locators/AGENTS.md` and `src/helpers/AGENTS.md` (`grep -c
  src/AGENTS` prints 0 for both, re-checked).
- **Fix**: "the folder's file and those above it"; the subfolder intros name `src/AGENTS.md`.

### 2I-9: `.editorconfig` gives `.mdx` two-space indentation "as every such file here is"; the one `.mdx` page uses tabs

- **Page and text**: `.editorconfig` lines 1 to 2 and `[*.{md,mdx}]`; `website/src/content/docs/index.mdx` lines 25 to 29.
- **Probe**: `bash $P/I/run1/G-9/run.sh` (re-run): `mdx: 1 files, 1 with tab-indented lines`.
- **Fix**: reindent the page's JSX, or a section of its own.

### 2T-8: `playwright.base.ts` says it holds `test/playwright.config.ts`'s options; the test-server config spreads it too

- **Page and text**: `playwright.base.ts:1-3` (re-checked); `test/playwright.test-server.config.ts` imports it.
- **Fix**: name both, and the configs that do not take it (with 2T-4).

### 2Z-1: `PageObjectTypeOptions`' doc-comment example does not compile

- **Area**: the doc comment of `PageObjectTypeOptions` (`src/pageObject.ts:22-26`), which reaches the published
  declarations (`.pack/pomwright/dist/index.d.ts:2579`), so the editor shows it on hover.
- **Contract**: `website/AGENTS.md` *Rules*: the doc comments are "the API reference in the editor", each export with
  an `@example`; examples compile (the site's examples are checked; the doc comments' are not).
- **Reproduction**: `$P/Z/z1-example/zz-probe-Z-z1.typecheck.ts` (the example verbatim with its imports and
  `type Paths = "main"`, and the same class marked `abstract`), copied to `test/tests/`, then
  `pnpm exec tsc --noEmit -p test --pretty false`, then removed; exit 2. Output (`$P/Z/z1-example/tsc.out`):
  `zz-probe-Z-z1.typecheck.ts(9,8): error TS2515: Non-abstract class 'OrderPage' does not implement inherited abstract member defineLocators from class 'PageObject<"main", { urlPathType: RegExp; storage: { cart: Codec<{ items: string[]; }>; }; }>'.`
  The `abstract` variant has no error. The API page's own example (`api/types.md`, *PageObjectTypeOptions*) defines
  `defineLocators()` and compiles (the snippet check).
- **Observed / expected**: a copied example that does not compile; expected one that does. Found by 2H (95 of 96
  examples compile), in 2D's area; filed by neither.
- **Severity**: Low.
- **Fix**: `abstract class OrderPage …`, or the API page's full class. A check that compiles the doc comments' examples
  (2H's `$P/H/examples/build.mjs` is a start) would have caught it.
- **Semver**: none (a doc comment).

### 2Z-2: the API page says a page object's `sessionStorage` is "the session storage helper for the page object's origin"; with a RegExp `baseUrl` it has none

- **Area**: `api/class-pageobject.md`, *sessionStorage* (line 350).
- **Contract**: the API page states each member's contract (`website/AGENTS.md`); the doc comment (`src/pageObject.ts:202-203`:
  "With a string `baseUrl` it touches only that origin's storage, and `seed()` needs no origin") and *Session storage*
  ("belongs to the origin of its string `baseUrl`") imply a RegExp base differs; the code passes no origin then
  (`src/pageObject.ts:340`).
- **Reproduction**: `$P/Z/z2-storage-regexp-and-nav-steps/zz-probe-Z-z2.spec.ts`, copied to `test/tests/`, then
  `pnpm -C test exec playwright test tests/zz-probe-Z-z2.spec.ts --project=chromium --workers=1 --reporter=line,$P/E/locations/printReporter.ts`;
  exit 0 (`run.out`). A page object with `baseUrl` `/^http:\/\/(localhost|127\.0\.0\.1):9000$/`.
- **Observed / expected**: `set on http://localhost:9000: stored "http://localhost:9000"`, `set on http://127.0.0.1:9000: stored "http://127.0.0.1:9000"`,
  and `seed()` throws `AnyHost.SessionStorage.seed: an origin is required; pass { origin } or construct the helper with one`.
  Expected on the API page: that a RegExp base gives a helper without an origin, which works on the page's origin
  and needs `{ origin }` for `seed`. From 2A's notes; filed by no segment.
- **Severity**: Low.
- **Fix**: one sentence on the API page (and the doc comment can say the RegExp case outright).
- **Semver**: none.

### 2Z-3: decision 72's after-release steps live only in the working folder that rule 7 deletes before the merge, while the guide already says no npm token is stored

- **Area**: `docs/releases.md` rule 7 and *Carrying out a release*; `.github/AGENTS.md:34`; `publish.yaml:5`;
  `.changeset/trusted-publishing.md`.
- **Contract**: rule 7 (`docs/releases.md:37-40`): before the merge, the audit moves "what a later reader needs into …
  the contributor guide, and work left for later into a GitHub issue", then deletes the folder. The guide, the workflow
  comment and the changeset say "no npm token is stored".
- **Reproduction**: `$P/Z/z3-token-steps/out.txt`, from the worktree root: `git grep -n -i "NPM_TOKEN\|disallow tokens\|revoked" -- . ':!defect-review-result' ':!CHANGELOG.md'`
  prints nothing (exit 1); `grep -n NPM_TOKEN defect-review-result/DECISIONS.md defect-review-result/PLANS.md` finds
  `DECISIONS.md:2110-2111` ("**After the release** (the maintainer): Publishing access set to 'Require two-factor
  authentication and disallow tokens', the old npm token revoked, and the repository's `NPM_TOKEN` secret deleted") and
  `PLANS.md:171-172`; issue #53's body names none of the steps; `npm view pomwright versions` ends at 3.0.1.
- **Observed / expected**: by the project's own record the secret is stored until after the release, and the steps that
  remove it, with the other after-merge and after-release actions of `PLANS.md` (lines 160 to 173), exist only in the
  folder; the 3.0.2 audit (`01d1096`) left them there. Expected: before the folder goes, the lasting rule (publishing
  access disallows tokens) in `docs/releases.md` *Carrying out a release*, and the one-time steps in an issue (or #53's
  closing checklist). The secret itself is not visible without credentials; the claim rests on decision 72.
- **Severity**: Low (process); but if the steps are lost, a valid npm token stays stored and token publishing stays
  allowed, which is what decision 72 sets out to end. From 2G's note on the changeset and 2I's rule 7 review; filed by
  neither.
- **Fix**: move them before deleting `defect-review-result/`.
- **Semver**: none.

## 6. Suspected

None. Every finding was reproduced; the one claim resting on a record rather than a probe (the stored `NPM_TOKEN`, 2Z-3)
is stated as such.

## 7. Design questions

### 2A-8: a navigation within the origin stops a batch and fails the call, although the storage written is the same

- **Decided behaviour**: `guarded` (`sessionStorage.ts:347-380`) and `src/helpers/AGENTS.md` fail the call when the
  document went away, "whether or not it threw". `$P/A/p06-batch3.spec.ts -g SAMEORIGIN`: a reload to `?again=<n>` 5 ms
  into a 60-key `set` fails 6 of 6 rounds on three browsers, with "may have reached the new document".
- **Argument**: the origin never moved and `setItem` is idempotent; repeat the interrupted key while the origin is
  unchanged. Cost: a loop, and the helper no longer mirrors `page.sessionStorage`. If not adopted, document it and word
  the message for the same-origin case.
- **Semver if adopted**: patch.

### 2B-4: an `add(path)` left without its locator method registers nothing and passes `verify()`

- **Decided behaviour**: *Internal → Registry records*: "A registration that never reaches a locator method registers
  nothing"; unregistered segments group paths. `node $P/B/p10/dangling-add.mjs` (re-run): `verify passed; chain:
  locator('main').getByRole('button', { name: 'Log in' })`, the form segment lost.
- **Argument**: the registry knows it at `endOpenRegistration`; `verify()` could report it, as *Verifying a registry*
  promises to find the mistakes that are not compile errors "all at once". Cost: a registry that passes today fails.
- **Semver if adopted**: patch (option 1, reporting in `verify()`), none (docs only); a decision on whether a passing
  registry may fail in a patch.

### 2C-3: `replace().frameLocator()` without a selector on the query's own path compiles, though it always throws

- **Decided behaviour**: the runtime throws at the call (`src/locators/AGENTS.md`); `skip` of the same path is a compile
  error. `publicTypes.typecheck.ts:91` compiles the call.
- **Argument**: a conditional parameter list would catch it; the runtime error is immediate and names the fix. Risk:
  a deferred conditional in a generic base class could stop `replace(ancestor).frameLocator()` compiling there.
- **Semver if adopted**: patch.

### 2D-4: the navigation helper's methods fail with an internal `TypeError` when called detached

- **Decided behaviour**: none stated; the page object's accessors are bound; Playwright's methods are not; `goto` is a
  function-valued property since `8c8d8fb`. `node $P/D/p08-detached/detached.mjs` (re-run):
  `goto() -> TypeError: Cannot read properties of undefined (reading 'fullUrl')`, and `label` for the `expect*` methods.
- **Argument**: bind them (keeping each method's frame as its `callerLocation` boundary), or say they are not bound.
- **Semver if adopted**: patch.

## 8. What is sound

Each line names the path probed; the evidence is in the segment's summary and probes folder.

- **Session storage**: listener lifetimes after every outcome; script disposal after 20 merged seeds and a round trip;
  turns with four helpers and mixed calls while the page stays on the origin, with and without the step overlay; keys
  `__proto__`, `constructor`, empty, unicode, newline, 10,000 characters through every method on three browsers; codecs
  and `json` edge values; the `origin` option on Node 20, 22, 24; seeds for host forms on three browsers; step locations
  of every method; the API page's `Decoded`/`AllEntries` examples; the after-click row of *What `seed` cannot do*; two
  pages of one context; a sandboxed arrival fails the test; a seed on a shared page fails, never silently; one module
  copy for ESM and CommonJS; the measured claims of *The seed registry* (300 and 350 rounds per engine) [2A].
- **Registration and resolution**: path rules agree at run time and in the types (20,000-character literals, 5,000
  segments, 3,000-member unions); prototype names and unusual characters as segments; every `STRATEGIES` row renders as
  Playwright's own call (30 comparisons); `getById` with 17 strings and 13 RegExps on three browsers, both modes, shadow
  roots, frames (except 2B-1); frames and the any-frame form mixed on three browsers; Playwright's strict-mode texts;
  reuse and seed types; every doc-comment `@example` of the area; the rename groups; the page object's check message
  by message; the change set's promises on every path [2B].
- **Queries**: independence and copies on a DOM; step order; filters with every RegExp flag against Playwright's own
  call; `update`'s merge patch; `replace`'s argument lists; the any-frame form in a query; `skip`/`unskip`; descriptions
  where Playwright 1.64 shows them; kept queries; 40 messages exact; sub-path types on every path-type form;
  `exactOptionalPropertyTypes` as Playwright's [2C].
- **Page objects, URLs, navigation**: 29 `urlPath` forms beyond ASCII through `fullUrl`, `goto`, both `expect*` methods
  and `toHaveURL` on 3 browsers × 3 Node lines; the 27 validation forms; every URL and `goto` message; a base with
  credentials through real Basic auth; `UrlMatcher` in `page.route`, `waitForURL`, `toHaveURL` with a `g` flag;
  overlapping navigation calls; the check's call site for a class without its own constructor and through the runner;
  a constructor error located at `super(…)` [2D]. The navigation steps' location in 2E-2's shapes [consolidation, Z2].
- **Logging, `@step`, fixture**: unboxed and boxed steps at the calling line in fixtures, `beforeAll` and nested boxed
  steps; Playwright's own placement for unboxed steps; ESM specs; private methods, recursion, `super`; every refused
  form's message in both modes; the run-time Promise check; `debug` on a retry; late entries; a project's own `log`;
  `test.use({ timezoneId: undefined })`; `mergeTests` sharing one `log` [2E].
- **Packaging and types**: the 8 packed files; a clean build; `import`/`require` sharing one copy on Node 20, 22, 24; deep
  imports closed; every module resolution and attw clean; the runner in CommonJS, ESM and legacy-decorator projects;
  TypeScript 5.0 to 7.0.2 for POMWright's declarations; consumer strict flags; emit of 161 members under npm and pnpm;
  v3.0.1's 209 doc snippets and harness compile against 3.0.2; the four announced breaks each rest on the 3.0.1 docs;
  the 50 changesets (all patch, rendered as one `### Patch Changes` list, no rewrite by `changelog-github`) [2F].
- **CI and release**: the 8 action pins are their tags' latest; actionlint and ShellCheck pinned by checksum and clean;
  `ci-playwright-version.sh`; the gate and branch protection; Publish's trigger keeps forks and branches out; the guard
  on its normal paths; the `npm` environment (`main` only, no admin bypass); changesets/action v2.1.2 with CLI 3.0.3;
  the attestation check; Pages' tip step on first runs and re-runs; Dependabot's groups and holds; `pnpm bench` within
  10–25% with every ratio holding [2G].
- **Tests and checks**: the packed package reaches the harness by hard link; no spec imports `src/`; the ESM spec is real
  ESM; vitest's type-check mode fails on a false assertion; the step reporter fails on a wrong line and an unreported
  marker; the error-message check both ways; the API check on `@see`, `@param`, headings and instance members; the
  diagram check; the snippet check for the fences it parses; no un-awaited assertion; a7d5ba7 lost no title; the whole
  harness on firefox and webkit under Node 20 [2T].
- **Documentation and README**: the README example run end to end; *Your first page object* with the trace viewer;
  *Organizing a project*'s base classes; every 2.x statement of the upgrade page against a built v2.1.0; every 3.x
  message and chain it shows but one; messages on pages other than *Error messages*; the deep-import statement; U+FEFF;
  the API index and the *TypeScript* table; the six "Added in" markers; language rules on 52 pages; every link and
  playwright.dev anchor; 52 pages rendered light and dark at 390 and 1440 px; the lifecycle across pages [2H].
- **The contributor guide**: the split lost no sentence (336 compared); the API list names all 40 exports; 35
  identifiers exist; every command as written; toolchain versions; biome skips `.md`; all 27 routes listed; Codex's
  loading and size limit; no `CLAUDE.md`; the 2.x docs at the tag; every commit since the rule carries its trailer; no
  `CHANGELOG.md` or version edit; 55 relative links resolve [2I].

## 9. Across the segments

### Merges

| Kept | Merged | Why, and the evidence kept |
| --- | --- | --- |
| 2H-1 | 2T-6, 2I-4 | One sentence of `internal/documentation.md` (lines 44 to 45). 2H-1 keeps the `checks.yaml`, `package.json` and `pack-test.sh` output; 2I-4 adds the history (`84a550f`, made stale by `f866325` and `429f2c2`); 2T-6 adds the two readings of "all three". Kept under 2H, whose segment owns the Internal pages. |
| 2H-4 | 2A-7 | One stale TS2339 line on *Upgrading from 2.x*. 2H-4 keeps the bisect across 3.0.1, `54cdada`, `f422b77~1` and `f422b77` and the order note; 2A-7 adds why (`Decoded` of an object key type, `$P/A/t03/`). |
| 2E-4 | 2H-8 | One missing item on *Upgrading from 2.x* (the `log` fixture's locale check). 2E-4 keeps the 2.x side run (`pomwright@2.1.0` from npm attaching with `en_US`); 2H-8 adds the Playwright-alone control and the item's text. On provenance the two disagreed (new since `54cdada`, or missed): see below. |

Folded without a finding file of their own: 2I's note on `pr.yaml`'s header (into 2G-5); 2F's note on
`createRegistryWithAccessors` on *Upgrading from 2.x* (into 2H-5); 2C's note on `src/locators/AGENTS.md`'s "first
argument required" (into 2C-1, whose steps already list it); 2I's "initialiser" (into 2H-2); 2T's and 2H's notes on the
site job not running `check-error-messages.mjs` (into 2H-1's option); the consolidation's check of `.github/AGENTS.md`
(into 2I-2).

### Contracts that two areas state differently

1. **Where the docs checks run**: *Internal → Documentation* against `checks.yaml` and `pack-test.sh` (2H-1).
2. **Whether the docs checks catch a page-side change**: *Tests and checks* ("a change … to the page") and
   `website/AGENTS.md` (the spec changes with the page, by hand) against the specs, which hold copies (2T-1); 2D-3's new
   row must change the outcomes spec's copy with it.
3. **What a `<string>` registry checks**: five pages, two doc comments and a changeset against the types (2B-2).
4. **`replace`'s first argument**: the update builder's pages, *Queries*, *Builders*, a doc comment, a changeset and the
   guide against the `frameLocator()` sections of the same pages (2C-1, with 2C-3's types).
5. **What JavaScript callers get checked**: *Installation* against *Session storage* and *Principles* (2H-6).
6. **A schema's type and value**: *Session storage*'s "one case" and the guide against `publicTypes.typecheck.ts`, which
   knows a second (2A-6); the same change's changeset against *Organizing a project*'s first base class (2F-4).
7. **Where a step is reported**: `api/step.md` against the runner (2E-2); *URLs and navigation*'s sentence holds (Z2).
8. **A page object's storage helper**: the API page's "for the page object's origin" against the doc comment, the
   concept page and the code for a RegExp base (2Z-2).
9. **Publish and Pages**: `.github/AGENTS.md`, `tests-and-checks.md` and `main.yaml`'s comments against the guard and the
   tip step (2G-1, 2G-2, 2G-3).
10. **"No npm token is stored"**: the guide, `publish.yaml` and a changeset against decision 72's after-release steps,
    which rule 7 would delete (2Z-3).
11. **The upgrade page's completeness**: the page and the README ("every change") against four gaps (2H-4, 2H-5, 2H-7,
    2E-4); and `docs/versioning.md`'s "a 2.x user wrote" (2F-3), which 2H-5 cites and 2F-3 would reword.
12. **Where a rule sits**: `docs/repository.md`'s placement rule against the guide's files (2I-1, 2I-2, 2I-8), shown in
    practice by the Internal pages that CI commits left stale (2H-1, 2G-3, 2G-5).

### Items met outside a segment

Filed by the consolidation, each with its own reproduction:

- `PageObjectTypeOptions`' `@example` does not compile (2H's note, 2D's area): **2Z-1**.
- `api/class-pageobject.md`'s `sessionStorage` property and a RegExp base (2A's note): **2Z-2**.
- `.changeset/trusted-publishing.md`'s "no npm token is stored" (2G's note), read with rule 7 (2I's area): **2Z-3**.

Folded into a finding: listed under *Merges*.

Considered and not filed:

- **The step-location claim for navigation calls** (2E's note, 2D's area): it holds. Z2 puts each navigation step at
  the line that called the method in the three shapes where 2E-2 found boxed `@step` steps placed otherwise.
- **The publish job builds with publishing credentials in reach** (2G): no document promises otherwise; a second
  argument for issue #56 (publish the tested tarball), to add there.
- **The Version Packages pull request's run waits for approval** (2G): confirmed from the saved API data
  (`$P/G/api/run-39586762544-attempt1.json`: `action_required` on attempt 1 by `github-actions[bot]`; attempt 2 run by
  the maintainer). Process knowledge, no contract; one sentence in `docs/releases.md` when 2G-1's docs are written.
- **The harness fixture page's `Object.entries(sessionStorage)` snapshot** (2A): leaves out keys named like `Storage`
  members; no spec relies on it.
- **The first review's `p12` calling `describe` on an any-frame registration** (2C): the registration returns nothing,
  as documented.
- ***Locator paths*' quoted TypeScript message** (2C): accurate as an instance.
- **Babel's decorators on symbol-named methods, `exactOptionalPropertyTypes` on the own-fixture call, a static method
  with a polymorphic `this`** (2E): Playwright's or TypeScript's.
- **`internal/packaging.md`'s `3.0.0-rc.1` example version** (2F): harmless.
- **`playwright.base.ts`'s five-minute `globalTimeout`** (2G): CI's harness steps take 120 to 148 s (2T).
- **A route mounted through `express.Router()`** (2T): none exists; a test gap.
- **`.changeset/registry-requires-paths.md` as a patch** (2B): holds by `docs/versioning.md`.
- **British spellings in specs, unit tests and `normaliseOrigin`** (2A, 2T, 2H, 2I agree): the spelling rule is the
  pages'.

### Disagreements resolved

- **G-11's outcome**: 2I says fixed (the three stale phrases are gone); 2T says regressed (the header names one config,
  and since `0905892` two spread it). 2T is right (re-checked: `grep -ln playwright.base test/*.ts` lists both configs):
  G-11 regressed in part, 2T-8 stands.
- **The README's folder list**: 2H read "in `src/`" as covering its subfolders and did not file it; 2I filed it as 2I-7
  item 10. Kept: the sentence lists folders by name and leaves out two of six.
- **2E-4/2H-8's provenance**: 2E said new since `54cdada` (`b28686b`), 2H missed. At `54cdada` a 2.x project with
  `en_US` already failed once something was logged (the first review's E-2 said so), and the page did not list it;
  decision #10's docs list left the page out, and `b28686b` widened the failure to every test that requests `log`.
  Recorded as missed by the first review, widened since.
- **2H-2's sweep**: 2H found no British form beyond "misspelt"; 2I found "initialiser" on an Internal page. 2I is right
  (re-checked); 2H-2 now holds both.
- **H-8's outcome**: 2H "fixed (decision 7 adopted)", 2F and 2I "fixed differently". The decision took the recommended
  option; counted as fixed.
- **2D-2**: the first review considered it and did not file it ("the runtime throws the documented message"); 2D files
  it because three places say that message comes only "from JavaScript". Kept as a defect.
- **2I-2's severity**: Medium kept, with the consolidation's evidence (above), while every other guide finding is Low.

### Re-checks by the consolidation

Outputs in `$P/Z/`. Port 9000 was free before each harness run; the worktree was clean after each, with only the
baseline's ignored entries.

| What | Command (from the worktree root unless noted) | Exit | Result |
| --- | --- | --- | --- |
| 2Z-1, 2B-2, 2A-7/2H-4 | the three type probes in `test/tests/`, `pnpm exec tsc --noEmit -p test --pretty false` (`z1-example/tsc.out`) | 2 | TS2515 on the example, none on its `abstract` form; 2B-2's four TS2345 lines; TS2339 with the new type |
| 2Z-2, and the navigation steps | `zz-probe-Z-z2.spec.ts`, chromium, 2E's print reporter (`z2-…/run.out`) | 0 | as in 2Z-2; navigation steps at lines 44, 48 and 23 |
| 2Z-3 | `git grep`, `grep`, `curl` of issue #53, `npm view` (`z3-token-steps/out.txt`) | — | as in 2Z-3 |
| 2C-1, 2C-2, 2C-3 | `node $P/C/p5-broad-claims.mjs` (`recheck/c-p5.out`) | 0 | as filed |
| 2D-4 | `node $P/D/p08-detached/detached.mjs` | 1 | as filed (the script's last line throws by design) |
| 2D-2 (runtime) | `node $P/D/p05-types/runtime.mjs` | 0 | as filed |
| 2B-3, 2B-4 | `node $P/B/p04/dotted-value.mjs`, `node $P/B/p10/dangling-add.mjs` | 0, 0 | as filed |
| 2E-1 | `node $P/E/2E-1/check-hint.mjs` | 1 | as filed |
| 2A-3, 2A-4 | `p01-batch1.spec.ts -g "P1\|P2"`, chromium (`recheck/a-p01.out`) | 0 | as filed |
| 2T-2, 2T-9 | the two mirrors (scripts byte-identical to the worktree's) | 1, 0 | as filed |
| 2T-4 | the focused probe, `CI=1`, steps config | 0 | `1 checked`, as filed |
| 2T-5 | `mutate.mjs`; the unresolved copy and the installed package | 0 | statics pass; 105 against 108 members |
| 2T-7 | `scan-replica.mjs` | 0 | as filed |
| 2I-9 | `bash $P/I/run1/G-9/run.sh` | 0 | as filed |
| Docs findings | the quoted lines read at `d850405` (2H-1, 2T-8, 2G-5, 2I-6, 2F-3, 2I-7 items 1, 2, 5, 6, 7, 10, 2E-2, 2H-3, 2H-6, 2F-1, 2G-3, 2G-4, 2D-5, 2B-2, 2C-1, 2C-2, 2A-6, 2I-8, 2I-1) | — | each as quoted |
| 2I-3 | one Read of the worktree's `src/helpers/url.ts` from this session | — | no `AGENTS.md` loaded (see 2I-3) |

Not re-run: the gated sketches (their gate logs are in each finding), and the other browser probes of 2A, 2D, 2E and
2H, whose outputs and exit codes their files cite. Nothing re-checked differed from its segment's file except 2H-2's
"no other British form" (one more, now in 2H-2) and the G-11 outcome (above). One finding was found to cover more than
it says: 2I-2's trigger (a) holds for `.github/` as well as `src/`.

### Fixes that touch each other

- **Session storage**: 2A-2 and 2A-10 change the same lines of `access`: one evaluation. 2A-9 and 2A-3 change the same
  methods. 2A-9 and 2D-1 add messages that *Error messages* must list, or `check-error-messages.mjs` fails
  `pnpm typecheck`. 2A-4 changes messages that four pending changesets quote. 2A-6 and 2F-4 edit
  `.changeset/schema-type-and-value.md`.
- **Locators**: 2B-2 edits `api/errors.md`, `api/types.md` and `.changeset/registry-requires-paths.md`; 2C-1 edits
  `.changeset/undefined-first-argument.md` and `src/locators/AGENTS.md`, with 2C-3 if adopted.
- **Release**: 2G-1 and 2G-2 change the same step; the combination needs `sim.sh` and `rerun.sh` run on it. 2G-3 and
  2G-5 edit the same guide sentences and `tests-and-checks.md`; 2H-1's option touches the site job (2G's).
- **Tests and checks**: 2T-4 with 2T-8 (`playwright.base.ts`); 2T-2 with 2T-9 (one script); 2T-1 with 2D-3 (the outcomes
  table and its copy).
- **One pass over *Upgrading from 2.x***: 2H-4, 2H-5, 2H-7, 2E-4; 2E-1's hint leaves the page's `en_US` example as it is.
- **The guide**: 2I-1, 2I-2 and 2I-8 (placement and reach) together; 2F-3 rewords a sentence 2H-5 cites; 2I-7 item 12
  and 2F-2 edit neighbouring lines of `test/AGENTS.md`.
- **Spelling last**: 2H-2 after the other page edits.
- **Before the folder is deleted**: 2Z-3 (and rule 7's audit could add 2I-6's `git grep`).

## 10. The first review's findings at `d850405`

From every segment's `first-review.md`; "fixed differently" means a decision chose another contract, which the code
keeps. The first review's files are in `defect-review-result/` of the worktree.

| First review | Then | Outcome at `d850405` | Checked by | This review |
| --- | --- | --- | --- | --- |
| A-1 | defect, Medium | fixed (#9, `56229e2`) | 2A: `A1-deterministic.spec.ts`, three browsers; 40 natural rounds per browser | 2A-9 beside it |
| A-2 | defect, Low | fixed (#13, `e231dc2`) | 2A: `popupchains.spec.ts`, three browsers | |
| A-3 | defect, Low | fixed (#14, `52f2d4c`) | 2A: `popuporder`, `popupseed`, three browsers | |
| A-4 | defect, Low | fixed (#18, `f422b77`) | 2A: `keys.typecheck.ts`; `t01` | 2A-7/2H-4 follow from it |
| A-5 | defect, Low | fixed (#26, `186bc5f`) | 2A: `errorpage.spec.ts`, three browsers | |
| A-6 (in B-7) | documentation, Low | fixed (#36, `429f2c2`) | 2A: grep of four pages and `@throws` | |
| A-7 | documentation, Low | fixed, option 2 (#38, `e05b84d`) | 2A: `schema-without-type.typecheck.ts` | 2A-6 beside it |
| A-8 (in H-5) | documentation, Low | fixed (#47, `1b15aff`) | 2A, 2I: all 27 routes listed | |
| B-1 (with C-5) | defect, Low | fixed (#15, `b990969`) | 2B: `f1-nonenumerable.mjs`; 2C: `p13`, unit probe | |
| B-2 | defect, Low | fixed; the path half fixed differently (#22, `f46b982`) | 2B: `f2-failed-persist.mjs` | |
| B-3 | defect, Low | fixed (#22, `2d2c504`) | 2B: `f3-long-path.sh` | |
| B-4 | defect, Low | fixed (#21, `ff6495e`) | 2B: `f4-reuse-union.sh` | |
| B-5 (with C-2) | defect, Low | fixed (#25, `890dbd8`) | 2B: `f5-has-option.mjs`; 2C: `p09` | |
| B-6 | documentation, Low | fixed (#43, `8f185be`) | 2B: `p11-rename.cjs` | |
| B-7 (with A-6, C-4, D-3, H-2) | documentation, Low | fixed (#36, `429f2c2`) | 2B: `f7-errors-gaps.mjs`; the message check | |
| C-1 | defect, Medium | fixed for `PageObject<string>` and the template member; fixed differently for the untyped registry (#20, `49454c6`) | 2C: `p06-types-wide.typecheck.ts`, runtime probes | 2B-2, 2B-3, 2H-5 follow from `49454c6` |
| C-2 (in B-5) | defect, Low | fixed | 2C: `p09-ended-by-query.mjs` | |
| C-3 | documentation, Low | fixed (#44) | 2C: grep; `p03-anyframe.mjs` | |
| C-4 (in B-7) | documentation, Low | fixed | 2C: `docs.out`, `p11` | |
| C-5 (in B-1) | defect, Low | fixed | 2C: `p13-readfields.mjs`, unit probe | |
| C-6 | defect, Low | fixed (#28, `8bdcd35`) | 2C: `p12-misc.mjs`, `p03` | |
| C-7 | defect, Low | fixed (#29, `9bcf72e`) | 2C: `p15-kept-query-message.mjs` | |
| D-1 | defect, Low | fixed (#19, `8c8d8fb`) | 2D: `tsc` with the navfor and types probes | 2D-4's type side follows from `8c8d8fb` |
| D-2 | defect, Low | fixed (`^`); fixed differently (`\|` documented, #17) | 2D: `fullurl` spec, 3 browsers × Node 20, 22, 24 | |
| D-3 (in B-7) | documentation, Low | fixed (#36) | 2D: `goto-throws.cjs`, step titles | |
| D-4 (with H-9) | documentation, Low | fixed, the code option (#37, `445fc71`) | 2D: base-class spec | |
| D-5 | defect, Low | fixed (#16, `80cb5ea`) | 2D: `zz-probe-D-asyncdefine.spec.ts` | |
| E-1 | defect, Medium | fixed (#12, `b19de77`); the storage part too | 2E: `nested.spec.ts`; 2A: `p11` | |
| E-2 | defect, Medium | fixed differently (#10, `b28686b`: check at setup) | 2E: `locale.spec.ts` on three browsers, `timezone.spec.ts` | 2E-1 in its message; 2E-4 on the upgrade page |
| E-3 | documentation, Low | fixed (#42, `f8ca42a`) | 2E: `forms.spec.ts` | 2E-2: the new wording claims more |
| E-4 | documentation, Low | fixed, docs only (#41) | 2E: `logger.spec.ts` | |
| E-5 | defect, Medium | fixed (#11, `ea94410`) | 2E: `run-generic.sh`, both modes | |
| F-1 | defect, Low | fixed (#23, `b4fee4a`) | 2E, 2F: `stepFactory.ts` emits | |
| F-2 | defect, Low | fixed (#24, `7f90436`) | 2F: `patterns.ts`; 161 generated members | 2F-2: its test is narrower than said |
| F-3 | documentation, Low | fixed (#39, #70, `f8ca42a`) | 2F: the three TS2883 probes | |
| F-4 | documentation, Low | fixed (#48, `8eda398`) | 2F, 2I: the table; `test/AGENTS.md:95` | 2I-7 item 12: another sentence |
| F-5 | design question | fixed differently (#6: patch, 3.0.2) | 2F: `changeset status` | |
| G-1 | defect, Low | fixed differently (#31, #32: the script deleted) | 2G: no `changes` job; PR #60 ran nine jobs | |
| G-2 | defect, Low | fixed differently (#31, `f866325`) | 2G: every job on every run | 2H-1 follows from `f866325` |
| G-3 | defect, Medium | fixed (#1) | 2G: PRs closed, `dependabot.yml` | |
| G-4 | defect, Low | fixed (#33, `ee00af7`) | 2F, 2T: planted stale file gone; `packageFiles.spec.ts` | |
| G-5 | documentation (was defect), Low | fixed differently (#4), and fixed incompletely, a part regressed by its fix (`3284aa4`) | 2G: `run1/G-5/probe.sh`; `sim.sh` | **2G-1** |
| G-6 | documentation, Low | fixed (#50) | 2G, 2T: the page and the script agree | 2G-4 on the same page |
| G-7 | documentation, Low | fixed (#49, `8eda398`) | 2T: `plant.sh`, 5 of 5 | |
| G-8 | suspected, Low | fixed (#53, `3284aa4`) | 2G: `rerun.sh` of the tip step | 2G-3: the wording overstates it |
| G-9 | defect, Low | fixed incompletely (#34, `1717edb`) | 2I: `run.sh` with `mdx` | **2I-9** |
| G-10 | defect, Medium | fixed differently (#3, #72, #74: Trusted Publishing); unproven until a release | 2G: 404s for 3.0.0 and 3.0.1; the workflow | 2Z-3 |
| G-11 | documentation, Low | two comments fixed; one regressed (`0905892`) | 2T (2I said fixed; resolved above) | **2T-8** |
| H-1 | documentation, Low | fixed (#45) | 2H: `zz-probe-H-firstarg.spec.ts` | |
| H-2 (in B-7) | documentation, Low | fixed | 2H: `zz-probe-H-errors.spec.ts` | |
| H-3 | documentation, Low | fixed incompletely (#46, `e571381`) | 2H: the `awk` count, 40 characters | **2H-7** |
| H-4 | documentation, Low | fixed (#17, `3bf7a19`) | 2H (site), 2I (guide) | |
| H-5 (with A-8) | documentation, Low | fixed (#47) | 2I: `run1/H-5` | |
| H-6 | documentation, Low | fixed incompletely (#52, `3e37c74`) | 2H: grep; 2I: "initialiser" | **2H-2** |
| H-7 | documentation, Low | fixed differently (#40, `2e15291`: a run-time check) | 2E, 2H: `zz-probe-H-step-sync.spec.ts` | 2H-6: the same claim on *Installation* |
| H-8 | design question | fixed as recommended (#7, `2449c6a`) | 2F, 2H, 2I: six markers | |
| H-9 (in D-4) | documentation, Low | fixed differently (#37) | 2H: `zz-probe-H-callsite` | |
| R-1 | defect, Low | fixed (#35, `1717edb`) | 2I: `run1/R-1` | |
| R-2 | defect, Low | fixed (#30, `c35eae4`) | 2A: `lifetimes.spec.ts`, three browsers | |
| R-3 | documentation, Low | still present, decided (#8: review notes only) | 2F | |
| R-4 | design question | still present, decided (#54: no convention) | 2I: `src/AGENTS.md:44` | |

Totals: 61 findings: **47 fixed**, **7 fixed differently**, **3 fixed incompletely** (G-9, H-3, H-6), **1 fixed
differently with a part missed and a part regressed** (G-5), **1 regressed in part** (G-11), **2 still present as
decided** (R-3, R-4); none not fixed; none that could not be re-run (G-1's and G-2's probes test a deleted script, so
the contract they stood for was checked instead).

The first review's other claims, in short (each segment's `first-review.md` has the rows):

- **What is sound**: holds, except the upgrade guide's compiler errors (now 2H-4), "no reference to a plan outside the
  folder" (wrong at `54cdada` too: 2I-6), the `getById` line (2B-1), the emit check covering "every public member"
  (2F-2) and the `skipLibCheck` floor (2F-1); its counts of the guide no longer apply (the split dropped them).
- **Considered and not filed**: A's three (the closed-page message, `set({})` on `about:blank`, a shared page) agreed
  and not filed, the shared page probed; D's three: one filed (2D-2), two agreed; E's getter under
  `experimentalDecorators` not filed.
- **Test gaps**: of report.md's 16, 15 closed (gap 3, releases, closed in part: actionlint runs; the workflows still run
  only on `main`, accepted by #8), with residuals filed (2T-1, 2T-2, 2T-4) or listed in section 3; the scopes' own
  lists are closed or partly closed, except TypeScript's rename groups (B's gap 7), a module importing only `pomwright`
  under pnpm (#70), `EBADENGINE` (#58) and the back/forward cache (#60), each open by decision or noted.

## 11. Found by this review and not by the first

"New" means the cause is a commit after `54cdada`, named; "missed" means it was present at `54cdada`.

| ID | Why the first review did not report it |
| --- | --- |
| 2A-1 | missed: the single retry is unchanged since v3.0.1; the first review raced a navigation *to* the origin, not a page navigating elsewhere during the first seed's check |
| 2A-2 | missed: the branch is present since v3.0.1; its closed-page probe used a page with a URL origin |
| 2A-3 | missed: present since v3.0.1; the first inventory had input mutation for builders only |
| 2A-4 | missed: the key list since v3.0.1; the in-flight key new with `56229e2` (A-1's fix) |
| 2A-5 | missed: the table and the message are older than `54cdada` |
| 2A-6 | new: `e05b84d` (A-7's fix); decision 38 knew the case, the docs' note did not |
| 2A-8 | missed (not discussed): since `e8831b8`, kept by `56229e2` |
| 2A-9 | missed: present since `34c2ec0`; A-1's fix (`56229e2`) covers calls in flight, not a waiting call of a helper without an origin |
| 2A-10 | missed: present since `17426a5` |
| 2B-1 | missed: its `p16` tried a RegExp with two quotes, which parse; the unit test pins the unescaped output |
| 2B-2, 2B-3 | new: `49454c6` |
| 2B-4 | missed: its `p05` ended registrations of every kind but checked only that later calls throw |
| 2C-1 | missed: every statement but one was at `54cdada`; C-4 quoted the same sentence for another clause |
| 2C-2 | missed: the list stood at `54cdada`; the first review checked that messages are listed, not by which calls |
| 2C-3 | missed: the compiling call was in `publicTypes.typecheck.ts` at `54cdada` |
| 2D-1 | missed: present since v3.0.0 (`4bdc347`); D probed wait messages for a wrong URL only |
| 2D-2 | considered and not filed by the first review ("the runtime throws the documented message"); filed here because the docs say that message comes only "from JavaScript" |
| 2D-3 | missed: the table has had three rows since v3.0.1 |
| 2D-4 | missed: the methods are unbound since v3.0.0; `goto` became a property in `8c8d8fb` (D-1's fix) |
| 2D-5 | missed: the sentence is from `7015668`, before `54cdada` |
| 2E-1 | new: `b28686b` (E-2's fix) |
| 2E-2 | new: `f8ca42a` wrote "either way" (decision 42); the unboxed half was the first review's open test gap 7 |
| 2E-3 | missed: titles were probed for instance, static and detached calls, not inherited or `super` calls |
| 2E-4 (+2H-8) | missed: at `54cdada` a 2.x project with `en_US` already failed once something was logged; decision 10's docs list left the page out, and `b28686b` widened the failure |
| 2F-1 | new: `612a62a` (the sentence, from a probe that never compiled 5.1) |
| 2F-2 | new: `7f90436` (F-2's fix added the claim) |
| 2F-3 | missed: the sentence dates from `81f122f` |
| 2F-4 | new: `e05b84d` |
| 2G-1 | G-5 fixed incompletely (path c existed at `54cdada`) and regressed in part (path a, `3284aa4`) |
| 2G-2 | missed: the guard's comparison with `HEAD` dates from `e856a80`; the first review considered re-runs of `CI`, not of Publish |
| 2G-3 | new: `3284aa4` made the older promise (`4d125f1`) untrue |
| 2G-4 | new: `f3a058a` |
| 2G-5 | new: `0905892`, `d850405` |
| 2H-1 (+2T-6, 2I-4) | new: `f866325`, `429f2c2` (true at `54cdada`) |
| 2H-2 | H-6 fixed incompletely: "misspelt" and "initialiser" were at `54cdada`, outside its search |
| 2H-3 | new: `a49709d` |
| 2H-4 (+2A-7) | new: `f422b77` (A-4's fix); held at `54cdada` |
| 2H-5 | the registry gap new (`49454c6`, then `e571381`); the storage marker missed (H read that section for consistency only) |
| 2H-6 | missed: at `54cdada` (`ffcc23f`); *Installation* was scope F's page, and decision 40 rewrote the same claim on *Principles* only |
| 2H-7 | H-3 fixed incompletely: its `awk` cut the marker line at 16 characters |
| 2I-1, 2I-2, 2I-3, 2I-8 | new: the guide's split (`9923a9f`, `6d1de0e`) |
| 2I-5 | new: the practice changed with `a49709d` (decisions 5 and 62); the audit did not update the guide |
| 2I-6 | missed: in `v3.0.1` and `54cdada`; the first review's *What is sound* said there was none |
| 2I-7 | items 1 to 6 and 10 new (the split, `0905892`); items 7, 8, 9, 11, 12 missed |
| 2I-9 | G-9 fixed incompletely (decision 34 took in `mdx` without counting the one page) |
| 2T-1 | new: `6c53973`, `3be8ca9`, `ce6291d` |
| 2T-2 | missed: the same fence regex at `54cdada`; G planted `~~~ts`, `tsx`, `nocheck`, not a spaced fence |
| 2T-3 | missed: both tests at `54cdada` |
| 2T-4 | new: `b19de77`, `69bc09a` |
| 2T-5 | missed: the same walk and program at `54cdada` |
| 2T-7 | new: `0905892`, `ac0832c` |
| 2T-8 | G-11 regressed: `0905892` |
| 2T-9 | missed: the same `catch` at `54cdada` |
| 2Z-1 | missed: the example dates from `17f566d` (2026-10-17); no check compiles doc-comment examples |
| 2Z-2 | missed: the sentence dates from `b17b9c8` (2026-10-20) |
| 2Z-3 | new: decision 72 and the audit `01d1096` (2026-10-28) |

Of the 60: 23 new since `54cdada`, 29 missed by the first review, 6 from a first-review fix that was incomplete or
regressed or from an item it considered and did not file (2G-1, 2H-2, 2H-7, 2I-9, 2T-8, 2D-2), and 2 mixed (2H-5,
2I-7). Most of the new ones follow from the first review's own fixes or from the guide's split, which came after it.

## Ledger

Route: "this branch" means `fix/review-3-0-2`, before PR #60 is merged. No fix is major-only, so no row goes to a
GitHub issue. A design question goes to this branch only if the maintainer adopts it. Every recommended fix is a patch
or none: the release stays 3.0.2.

| ID | Merged IDs | Kind | Severity | Semver | Route | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [2G-1](G-ci-release-publishing/defect-2G-1-publish-guard-judges-the-tested-commit.md) | | defect | Medium | none | this branch: pull requests held while a release publishes, two rulesets, the guard judges `main`'s tip; with 2G-2 | done (#79: 5c3930e, ae297fa) |
| [2A-9](A-session-storage/defect-2A-9-unbound-waiting-call-acts-on-other-origin.md) | | defect | Medium | patch | this branch: the joined origin (or URL) checked at the turn; new message listed; changeset corrected | done (#80: 287a8a7) |
| [2A-1](A-session-storage/defect-2A-1-seed-fails-during-redirect-chain.md) | | defect | Medium | patch | this branch: a bounded retry of the Navigation API check (20); a changeset | done (#81: 53f571f) |
| [2A-2](A-session-storage/defect-2A-2-no-origin-message-on-inherited-or-closed-popup.md) | | defect | Low | patch | this branch: one evaluation of `document.domain`; with 2A-10 | done (#83: 277adc6) |
| [2A-3](A-session-storage/defect-2A-3-inputs-read-after-the-call.md) | | defect | Low | patch | this branch: take the input at the call (encoded then) | done (#84: ac9046f) |
| [2A-4](A-session-storage/defect-2A-4-keys-unquoted-in-messages.md) | | defect | Low | patch | this branch: quote keys; pages, four changesets and a new one | done (#85: e37a039) |
| [2A-10](A-session-storage/defect-2A-10-opaque-check-reads-shadowable-origin.md) | | defect | Low | patch | this branch: `document.domain`, which a page cannot shadow; with 2A-2 | done (#83: 277adc6) |
| [2B-1](B-registration-and-resolution/defect-2B-1-unicode-regexp-quote.md) | | defect | Low | patch (`getById`); none (others) | this branch: hex escapes in `getById`; document the rest, link #40446 | decided (#87) |
| [2D-1](D-page-objects-urls-navigation/defect-2D-1-load-state-timeout-message.md) | | defect | Low | patch | this branch: the load-state message ("reached …"); listed; a changeset | decided (#89) |
| [2D-2](D-page-objects-urls-navigation/defect-2D-2-absolute-url-type.md) | | defect | Low | patch | this branch: `AbsoluteUrl` starts with a letter; docs exact; a changeset | decided (#90) |
| [2E-1](E-logging-step-fixture/defect-2E-1-locale-hint-names-rejected-tag.md) | | defect | Low | patch | this branch: the codeset dropped, no hint for a modifier; changeset corrected | decided (#94) |
| [2G-2](G-ci-release-publishing/defect-2G-2-publish-rerun-goes-on-after-main-moved.md) | | defect | Low | none | this branch: the guard reads `main`'s tip from GitHub; with 2G-1 | done (#79: 5c3930e, ae297fa) |
| [2T-1](T-tests-and-checks/defect-2T-1-docs-checks-compare-copies.md) | | defect | Low | none | this branch: both specs read their pages (checks plan) | done (#95: da019d6) |
| [2T-2](T-tests-and-checks/defect-2T-2-snippet-check-misses-spaced-fence.md) | | defect | Low | none | this branch: the language read as CommonMark does; odd spellings rejected (checks plan) | done (#96: b6f141d) |
| [2T-3](T-tests-and-checks/defect-2T-3-test-fail-hides-assertions.md) | | defect | Low | none | this branch: restructured, every claim can fail (session storage plan) | done (#97: 56a8e3d) |
| [2T-4](T-tests-and-checks/defect-2T-4-steps-config-allows-only.md) | | defect | Low | none | this branch: `forbidOnly` in the steps and outcomes configs (checks plan) | done (#98: 3553e60) |
| [2T-5](T-tests-and-checks/defect-2T-5-api-coverage-skips-members.md) | | defect | Low | none | this branch: statics walked; an unresolved import fails (checks plan) | done (#99: ac614fe) |
| [2T-7](T-tests-and-checks/defect-2T-7-test-server-check-blind-spots.md) | | defect | Low | none | this branch: WebSockets, `wss`, `//host`, routers' routes (checks plan) | done (#100: dfbc812) |
| [2T-9](T-tests-and-checks/defect-2T-9-snippet-check-ignores-tsc-exit-code.md) | | defect | Low | none | this branch: `tsc` judged by its exit code (checks plan) | done (#96: b6f141d) |
| [2I-2](I-contributor-guide/defect-2I-2-rules-their-trigger-does-not-reach.md) | | documentation | Medium | none | this branch: pointers and index rows from the triggers, `.github/` included | decided (#82) |
| [2A-5](A-session-storage/defect-2A-5-sandboxed-arrival-not-listed.md) | | documentation | Low | none | this branch: session storage plan (docs) | done (#102: 1817e47) |
| [2A-6](A-session-storage/defect-2A-6-schema-extra-codec-compiles.md) | | documentation | Low | none | this branch: session storage plan (docs) | done (#102: 1817e47) |
| [2B-2](B-registration-and-resolution/defect-2B-2-string-registry-format-check.md) | | documentation | Low | none | this branch: locators plan (docs) | decided (#103) |
| [2B-3](B-registration-and-resolution/defect-2B-3-template-value-with-dot.md) | | documentation | Low | none | this branch: locators plan (docs) | decided (#103) |
| [2C-1](C-queries/defect-2C-1-replace-first-argument-required.md) | | documentation | Low | none | this branch: locators plan (docs) | decided (#103) |
| [2C-2](C-queries/defect-2C-2-errors-page-getlocatorschema.md) | | documentation | Low | none | this branch: locators plan (docs) | decided (#103) |
| [2D-3](D-page-objects-urls-navigation/defect-2D-3-outcomes-table-test-body.md) | | documentation | Low | none | this branch: page objects and URLs plan (docs) | decided (#104) |
| [2D-5](D-page-objects-urls-navigation/defect-2D-5-regexp-subclass-rationale.md) | | documentation | Low | none | this branch: page objects and URLs plan (docs) | decided (#104) |
| [2E-2](E-logging-step-fixture/defect-2E-2-where-a-step-is-reported.md) | | documentation | Low | none | this branch: steps and logging plan (docs) | decided (#105) |
| [2E-3](E-logging-step-fixture/defect-2E-3-step-title-names-the-receivers-class.md) | | documentation | Low | none | this branch: steps and logging plan (docs) | decided (#105) |
| [2E-4](E-logging-step-fixture/defect-2E-4-upgrade-page-omits-locale-check.md) | 2H-8 | documentation | Low | none | this branch: the upgrade guide's docs plan, after the code areas | decided (#101) |
| [2F-1](F-packaging-types-changesets/defect-2F-1-skiplibcheck-floor-sentence.md) | | documentation | Low | none | this branch: packaging plan | decided (#106) |
| [2F-2](F-packaging-types-changesets/defect-2F-2-emit-check-not-every-member.md) | | documentation | Low | none | this branch: packaging plan | decided (#106) |
| [2F-3](F-packaging-types-changesets/defect-2F-3-migration-hint-rule-names-2x.md) | | documentation | Low | none | this branch: contributor guide plan | decided (#109) |
| [2F-4](F-packaging-types-changesets/defect-2F-4-schema-migration-misses-base-class.md) | | documentation | Low | none | this branch: session storage plan | done (#106: e551ead) |
| [2G-3](G-ci-release-publishing/defect-2G-3-pages-every-merge-claim.md) | | documentation | Low | none | this branch: contributor guide plan | decided (#107) |
| [2G-4](G-ci-release-publishing/defect-2G-4-performance-scale-line-not-reproducible.md) | | documentation | Low | none | this branch: benchmarks plan, at the end | decided (#107) |
| [2G-5](G-ci-release-publishing/defect-2G-5-ci-descriptions-lag-the-jobs.md) | (2I's `pr.yaml` note) | documentation | Low | none | this branch: contributor guide plan | decided (#107) |
| [2H-1](H-docs-site-readme/defect-2H-1-documentation-page-ci-sentence.md) | 2T-6, 2I-4 | documentation | Low | none | this branch: contributor guide plan | decided (#107) |
| [2H-2](H-docs-site-readme/defect-2H-2-misspelt-british-spelling.md) | (2I's "initialiser" note) | documentation | Low | none | this branch: contributor guide plan, final pass | decided (#108) |
| [2H-3](H-docs-site-readme/defect-2H-3-readme-log-info-not-attached.md) | | documentation | Low | none | not adopted (maintainer); the README stays; #62's list at the cleanup | decided (#108) |
| [2H-4](H-docs-site-readme/defect-2H-4-upgrade-guide-stale-ts2339.md) | 2A-7 | documentation | Low | none | this branch: the upgrade guide's docs plan, after the code areas | decided (#101) |
| [2H-5](H-docs-site-readme/defect-2H-5-upgrade-guide-two-compile-errors.md) | (2F's note) | documentation | Low | none | this branch: the upgrade guide's docs plan, after the code areas | decided (#101) |
| [2H-6](H-docs-site-readme/defect-2H-6-installation-storage-values-runtime-claim.md) | | documentation | Low | none | this branch: session storage plan (docs) | done (#102: 1817e47) |
| [2H-7](H-docs-site-readme/defect-2H-7-upgrade-javascript-item-no-search.md) | | documentation | Low | none | this branch: the upgrade guide's docs plan, after the code areas | decided (#101) |
| [2I-1](I-contributor-guide/defect-2I-1-dev-dependency-rule-in-src.md) | | documentation | Low | none | this branch: `docs/repository.md` *Toolchain* | decided (#82) |
| [2I-3](I-contributor-guide/defect-2I-3-claude-code-loading-claim.md) | | documentation | Low | none | this branch: contributor guide plan | decided (#109) |
| [2I-5](I-contributor-guide/defect-2I-5-working-folder-rules-vs-practice.md) | | documentation | Low | none | this branch: contributor guide plan | decided (#110) |
| [2I-6](I-contributor-guide/defect-2I-6-plan-reference-left-in-a-spec.md) | | documentation | Low | none | this branch: contributor guide plan | decided (#109) |
| [2I-7](I-contributor-guide/defect-2I-7-guide-statements-that-do-not-match.md) | | documentation | Low | none | this branch: contributor guide plan | decided (#109) |
| [2I-8](I-contributor-guide/defect-2I-8-subfolder-files-do-not-point-to-src.md) | | documentation | Low | none | this branch: the fallback and the subfolder intros | decided (#82) |
| [2I-9](I-contributor-guide/defect-2I-9-editorconfig-mdx.md) | | documentation | Low | none | this branch: contributor guide plan | decided (#109) |
| [2T-8](T-tests-and-checks/defect-2T-8-base-config-comment-stale-again.md) | | documentation | Low | none | this branch: contributor guide plan | decided (#109) |
| 2Z-1 (section 5) | | documentation | Low | none | this branch: the example fixed with a check of the doc examples (checks plan) | done (#104: 9557f58) |
| 2Z-2 (section 5) | | documentation | Low | none | this branch: session storage plan (docs) | done (#102: 1817e47) |
| 2Z-3 (section 5) | | documentation | Low | none | this branch: the rule in the guide; wording; an issue filed by the maintainer | decided (#111) |
| [2A-8](A-session-storage/defect-2A-8-same-origin-navigation-stops-a-batch.md) | | design question | Low | none (behavior kept) | this branch: keep failing; the messages name the destination; docs | done (#86: e37a039) |
| [2B-4](B-registration-and-resolution/defect-2B-4-add-without-locator-method.md) | | design question | Low | patch | this branch: `verify()` reports it; a changeset | decided (#88) |
| [2C-3](C-queries/defect-2C-3-replace-any-frame-terminal-compiles.md) | | design question | Low | none | this branch: docs clause (item 24) and a probe comment; no type change | decided (#92) |
| [2R-1](R-triage/defect-2R-1-query-default-path-test-gaps.md) | | test gap | Low | none | this branch: tests only (locators plan); found in the triage | decided (#93) |
| [2R-2](R-triage/defect-2R-2-navigation-message-names-the-start-page.md) | | defect | Low | patch (unreleased) | this branch: the destination from the new document's `location.href`; found in CI after the session storage plan | done (#118: fc6ce43, f816c2e) |
| [2R-3](R-triage/defect-2R-3-opaque-origin-test-wait-under-load.md) | | test defect | Low | none | this branch: the test's wait; found probing 2R-2 under load | done (#119: 751fe70, fdc7918) |
| [2R-4](R-triage/defect-2R-4-domain-lookup-after-a-replaced-document.md) | | debt | Low | none | this branch: `access` skips `document.domain` after a replaced document; found building 2R-2 | done (#120: 908c816) |
| [2R-5](R-triage/defect-2R-5-seed-check-counts-the-lag-as-replacements.md) | | defect | Medium | patch (unreleased) | this branch: found by the first `test:constrained` after 2R-4; pre-existing (fails at `9a437a3` too) | done (#121: 2b9a7d8) |
| [2R-6](R-triage/defect-2R-6-outcomes-spec-timeout-under-load.md) | | test defect | Low | none | this branch: found by the same run | done (#122: f4f4fe0) |
| [2R-7](R-triage/defect-2R-7-seed-writes-into-an-arrived-document.md) | | defect | Medium | patch | this branch: found by the full harness after 2R-5; pre-existing (fails at `908c816` too); Firefox, with the step overlay | planned |
| [2D-4](D-page-objects-urls-navigation/defect-2D-4-detached-navigation-methods.md) | | design question | Low | none | not adopted (unbound, as Playwright's); reconsidered on request | decided (#91) |

The merged files keep their own reproductions: [2A-7](A-session-storage/defect-2A-7-upgrading-ts2339-text-stale.md),
[2H-8](H-docs-site-readme/defect-2H-8-upgrade-guide-log-locale-check.md),
[2T-6](T-tests-and-checks/defect-2T-6-documentation-page-ci-sentence.md),
[2I-4](I-contributor-guide/defect-2I-4-internal-documentation-ci-paragraph.md).