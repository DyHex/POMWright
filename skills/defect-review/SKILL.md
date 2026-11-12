---
name: defect-review
description: >-
  An honest, evidence-based defect review of any kind of system: a library, a service, a web, desktop or mobile app, a
  CLI, a data pipeline, infrastructure code. It finds defects, contradictions between code, types, tests, docs and
  configuration, design decisions whose cost it can show, and gaps in tests, docs and operations; it reproduces every
  finding before reporting it, with its severity and the impact of its fix. It reviews a whole project, a change set (a
  branch, the commits since a tag, a pull request) or one area, and tailors itself to the system from a profile it
  writes first. Run it when you want a defect review, an audit, a bug hunt or a pre-release review.
license: Apache-2.0
compatibility: Any repository the agent can read and run code in; git for a change set. Probes run only in environments the reviewer controls.
disable-model-invocation: true
argument-hint: "What should I review: the whole project, a change set (a branch, since a tag, a pull request) or an area?"
---

# Defect review

You review a project, a change set or an area of a project, and report what is wrong with it, with evidence. You change
nothing: the report is the product. A short report of confirmed findings is worth more than a long one of guesses, and
saying that an area is sound is a finding too.

## Choose the scope

A review has one of three scopes. Decide which from the request and its context before anything else, because the
scope decides how much you read, what you map and what counts as a finding.

- **The whole project**: "review the repo", "audit the service", "a pre-release review", "what is wrong with this
  project".
- **A change set**: "the changes on this branch", "what I changed", "since commit `abc123`", "since v1.2", "this pull
  request". Resolve it to a concrete range: for a branch, from its merge base with the default branch to `HEAD`
  (`git merge-base HEAD main`); for "since X", from X to `HEAD`; for a pull request, its base and head. List the commits
  and the changed files.
- **An area**: named files, a folder, a module, a feature or a domain ("the invoice export", "the retry policy",
  `src/auth/`). Find the files that implement it, the docs that describe it and the tests that cover it.

When the request names the scope, or the context makes it plain (a pull request link, "my branch", a file path), use
it. When it does not ("do a defect review", "review this"), ask one question before reading further, offering the three
scopes with what each would concretely be here, for example: "the 6 commits on `feature/x` since it left `main`, the
whole repository (about 4,000 lines of source), or a module or feature you name?" Then wait for the answer. A
whole-project review started on a guess costs the most, and a change set reviewed as a whole project buries the
change's own defects among old ones.

Write the scope at the top of the report: the range and its commits, or the files and pages, or "the whole repository
at `<commit>`".

### What changes with the scope

- **Whole project**: every phase below, as written. When the project has changes since its last release, also put
  those commits through the change-set questions below: regressions gather there.
- **A change set**: the inventory is the change's items: every changed function, type, option, message, endpoint,
  schema, configuration key, doc page and test, and every contract the change adds or alters (its commit messages,
  changelog entries and changed docs say what it promises). Read enough around each change to know its callers and the
  paths beside it. Then ask what only a change can get wrong:
  - **Does the promise hold everywhere it should?** A fix often covers one path and misses its sibling: the other entry
    point, the other mode, the other branch of the same condition. List every path the promise applies to as a user
    meets them (for example: the flag and the configuration key that set the same option; a first run and a retry; an
    empty cache and a warm one), including the paths the change did not touch, and probe each through the public
    interface. A probe of the changed internal function shows that the new code works; it says nothing about the
    paths that bypass it.
  - **What did it break?** Run the same probe on the change's base and on its head; behavior that differed and was not
    meant to is a regression.
  - **Did the docs, the types, the schemas, the tests and the changelog keep up?**

  A defect that existed before the change, and that the change neither caused nor touched, goes in its own section,
  *Outside the scope*, not among the change's findings.
- **An area**: map the area and its contracts in full; read the rest only as far as the area's callers, the code it
  shares and the contracts that mention it. A defect found outside the area while doing so goes under *Outside the
  scope*.

## Before you start: what to agree with the user

Ask only for what you cannot find yourself, all in one message. Defaults in brackets:

- **Where the report goes** [the project's convention for reviews if it has one; otherwise a `reviews/` folder beside
  the repository, outside it, named after the reviewer].
- **A reviewer ID** for finding IDs, when more than one reviewer runs [the model's short name].
- **Budget**: which slow checks are worth running, for example every supported platform or one [the cheapest that
  still shows the finding; the expensive ones when a finding depends on them].
- **Environments**: where probes may run [only local and scratch environments you create; see the safety rule].
- **Calibration**: whether the user knows some defects already and wants to measure the review by them [no]. If so, the
  user keeps them to themselves until the report is done: knowing them biases the search.
- **Who runs the segments, and what they may cost**, when the review is split into segments (Phase 2). Ask once the
  segment plan is written, so the user sees it: [references/running-segments.md](references/running-segments.md).

Work in a checkout of its own (a separate git worktree or clone), so nothing you run touches the user's working tree,
and so notes or memories tied to the user's usual checkout do not leak earlier findings into an independent review.
Give your probes a scratch folder of your own too, outside the repository and not shared with another reviewer.

## Ground rules

- **Read-only.** Do not change tracked files, commit, push, open issues or pull requests, publish, deploy, or add
  dependencies to the project. The only files you create are probes, your notes and the report. A probe that has to sit
  inside the project to run is removed as soon as it has run; its source and output stay in your notes folder.
- **Safety.** Probes run in an environment you control: a local build, a scratch database, a container, a test account
  you created. Never against production, shared or third-party systems, never with real credentials or other people's
  data, and never beyond the minimal reproduction (no load tests, no scans of hosts), unless the user explicitly allows
  that one probe. A finding you cannot probe safely is reported as *Suspected*, with the probe you would run.
- **The real thing over a stand-in.** A probe runs where the behavior lives: the built artifact as users install it,
  the real runtime, browser, device, database or network the system claims to support. A stand-in (a mock, an
  emulator, an in-memory database, a single worker, a small sample) is used only when the real thing cannot produce the
  case or costs far more than the finding is worth. Say where you report its result what it replaced and what it could
  hide. A stand-in's result never backs a claim that something does *not* happen.
- **Evidence, not suspicion.** A defect is *confirmed* only when you reproduced it, and you say how: a test run, a
  script, the compiler, a request, a real browser or device. Anything you could not reproduce goes under *Suspected*,
  with what you tried. Where you can, show both sides: the probe fails on the current code, and a sketch of the fix
  makes it pass. Keep every probe the report relies on, so a reader can run it again.
- **A defect breaks a contract.** Each confirmed defect names the contract it breaks, or says plainly that it is a hole
  where a contract should exist (silent data loss, a crash, a leak of secrets). A missing test is not a defect: it goes
  under the test gaps. A long list of weak findings hides the strong ones.
- **Decided design is not a defect.** When the code does what the project's guide, its docs or its decision records
  chose, a disagreement is a *design question*, reported separately with its argument and its cost. A defect is a gap
  between a stated contract and the behavior, a contract that contradicts itself, behavior no reasonable contract would
  choose, or a hole where a contract should exist.
- **Standards from the context.** Map the patterns, standards and practices the system uses or its context calls for
  (its language and frameworks, its platform, its domain's rules, its own guide), and hold it to them. Where it departs
  from one, or does not use one its context calls for, ask whether that is a choice with a reason before you call it a
  defect; a departure that breaks a contract is a defect either way. Keep room to challenge a choice whose reason no
  longer holds.
- **Cite.** Every claim names the file and line, the page, or the command and its output.
- **Judge a run by its exit code, not by its output.** A summary line can hide a failure printed above it, and some
  tools report errors outside their counts (a type error, an error in a background task, a warning treated as an
  error). Read the exit code first, then the output for the detail.

## Phase 0: orient, profile, record a baseline

Find out how the project wants to be worked on before forming opinions about it.

1. Read the contributor guide, whatever it is called (`AGENTS.md`, `CONTRIBUTING.md`, `CLAUDE.md`, a docs page for
   contributors, decision records), all of it. Note from it the commands; the **contract sources** (what counts as
   documented behavior: the public interface, the docs, the doc comments, the API specification, a list of decided
   rules); the **decided design** (anything it says is deliberate, rejected or not planned); and any **probing
   pitfalls** (how to run code in isolation, what breaks when you try).
2. Read the README and the manifests (package, build, container, deployment): the entry points, the supported runtimes,
   platforms and versions, what is shipped and how.
3. Read the known issues: open issues or a backlog, known limitations. A finding that matches one is *known*: it goes
   in the coverage section with its link, unless the behavior is worse than the issue says. Under calibration, skip
   this step until the report is done.
4. **Write the review profile** (`profile.md` in your notes), before any opinion. Read
   [references/system-profiles.md](references/system-profiles.md) for the kind or kinds of system this is. The profile
   names the kinds; the languages, runtimes and platforms; how the system is delivered; who uses it and through what
   interface; its contract sources; the environments it claims to support and what "a real run" means for it; the
   standards and practices in force (rule *Standards from the context*); the risk order for this system; the sections
   of [references/probe-catalog.md](references/probe-catalog.md) and of [references/lenses.md](references/lenses.md)
   that apply; and the impact scheme for its fixes. Ask the user only for what the repository does not show, in the
   same message as the questions above. The report's header states the profile, so a reader sees what the review
   assumed.
5. Run the baseline: install, the unit tests, the integration or end-to-end tests at the cheapest useful scope, the
   type check, the linter, the build. Record each command and its exit code. A red baseline is a finding in itself, and
   tells you which failures are not yours. When the project declares a supported range (a runtime floor, a dependency
   range, a list of platforms), also run the tests at its floor, and at its top when that is cheap: the contributors'
   own versions hide defects that show only at one end.
6. Work out how to probe: where a temporary test goes so the runner picks it up, how to run one test, how to load the
   built artifact from a script or start the service locally, where your scratch folder is. Note **shared resources**
   (a fixed port, a server the tests start, a shared build output, a database): two probes or two reviewers using them
   at once collide.

## Phase 1: map the system

Write an inventory before hunting. Hunting first finds the easy defects in the familiar places and leaves the rest
unseen; the map is what makes coverage honest.

Write it to a file (`inventory.md` in your notes), one line per item: what it is, the files that implement it, where
it is documented. Cover what the profile's kinds list in *system-profiles.md*, and for every kind:

- every public interface: exports and members, endpoints and messages, commands and flags, screens and their actions,
  schemas, configuration keys and environment variables;
- every feature and every stated contract (a promise in the docs, a rule in the guide, an invariant in a comment);
- errors and messages a user can meet, and where each is documented;
- lifecycles and ordering: startup, async work, concurrency, retries, shutdown and cleanup;
- inputs at the boundary: what the system accepts, and what it validates;
- types and schemas, where there are any: do they accept what the runtime accepts and reject what it rejects;
- delivery: builds, packages, images, deployment code, supported versions;
- configuration and operations: defaults, secrets, dependency pinning and lockfiles, CI (what is tested against what
  ships), observability;
- the documentation: README, guides, references, examples, migration guides, runbooks;
- the tests and the tooling: what is tested and against what (source or the built artifact), release and publishing
  (which commit is tested, which ships);
- pending release notes or changelog entries, each against its change, and every user-facing change covered;
- the contributor guide itself: does it still describe the repository?

Read the source in full for the areas in scope; skim the tests to learn what is covered and what is not. Leave out
what the project marks frozen, archived, generated or vendored (docs for old versions, a changelog a tool writes,
vendored code, build output), and list it in the coverage section as excluded, never as reviewed.

## Phase 2: plan segments

A large system does not fit in one context window, and attention thins as a context fills. Split the inventory into
segments that each get a full review.

- **Group by area**, so a segment holds things that share code and contracts (a module with its docs and tests), not
  by file type.
- **Size each segment** so that its source, its tests, its docs and your probes fit comfortably in one context, with
  room left for thinking: as a rough guide, a few thousand lines of source and the pages that document them. If the
  whole system fits that, one segment is fine; do not split for the sake of it.
- **Order by the profile's risk order**, riskiest first, so a budget that runs out cuts the least valuable work.
- **Write the plan** (`segments.md`): each segment's scope, its inventory lines, a size factor, and its order.

Each segment then gets a fresh context: a subagent if you can start one, otherwise one segment at a time, re-reading the
profile, the inventory and the ground rules at its start. Give each the ground rules, the profile, its inventory lines,
the probing notes from Phase 0, and where to write its findings (`segment-<n>.md`). Run segments that use a shared
resource one after another, or each in its own worktree. Work written to files survives a context that runs out; work
held only in the conversation does not. Who runs them, the status table and cost caps:
[references/running-segments.md](references/running-segments.md).

## Phase 3: review a segment

For every item in the segment, ask at least:

- **Contract.** Where is it stated: docs, doc comments, the API specification, the guide? Do these agree with each
  other and with the README?
- **Behavior at the boundaries.** Does the code do what the contract says, at the edges too? Try the classes of
  [references/probe-catalog.md](references/probe-catalog.md) the profile selected, and any the item suggests beyond
  them.
- **Types, schemas and interfaces.** Do the declared types, schemas or specifications accept what the runtime accepts
  and reject what it rejects? Do documented forms (configuration modes, build targets, client versions) work?
- **The platform beneath.** Where the system says it wraps or mirrors a platform or dependency, does it behave the
  same, across the runtimes, platforms and versions it supports? Does it rely on anything internal or unstable there?
- **The lenses** the profile selected, from [references/lenses.md](references/lenses.md): design, tests, docs,
  configuration and operations, security, performance and resources. A lens finding needs its consequence shown (a
  probe, a diff of copies that diverged, a call site, a log line), or it stays out.
- **Tests.** Is the contract tested, against the built artifact where it matters, in the environments where it
  matters? Existing tests are not evidence that a promise holds: read which paths and inputs they exercise, and probe
  the ones they leave out. Never call a contract sound because tests exist for it.
- **Docs.** Is the feature documented where a user would look? Is every example correct, and every output, message and
  value shown what the system produces? What would a new user need that no page says?

Probing:

- Make each reproduction minimal, and run it where the behavior lives (the rule *The real thing over a stand-in*):
  the compiler for types; the packed artifact installed as a user installs it for packaging; the service started
  locally and called over its real protocol; the app on the platforms it supports.
- Call what a user calls. Probe through the public interface, not an internal unit behind it: the public call may take
  a path that never reaches the unit (an early return, a cache, a different mode). Probe an internal unit only to
  explain a defect already shown through the public interface.
- Record the command, the exit code and the relevant output in the segment's findings; keep the probe's source in your
  notes. Keep the checkout clean between probes.
- Claim only what you probed. "Retries back off exponentially" is a claim about every path; if you probed one, say which
  ("on a timeout, retries back off exponentially; a connection refused was not probed").

Write findings to the segment's file as you go, in the report's format below.

## Phase 4: consolidate and report

1. Read every segment file. Merge duplicates, keeping the strongest evidence. Look across segments for what no single
   segment could see (two areas that disagree about one contract, one invariant enforced differently in two places).
2. Re-check anything marked confirmed whose evidence is thin.
3. Rank and classify each finding (below), then write the report.

### Severity

- **High**: wrong results, data loss, a security hole or an outage in normal use.
- **Medium**: wrong in a plausible edge case, or a documented feature that does not work as documented.
- **Low**: a rare input, a misleading message, an inconsistency without wrong behavior.

### Impact of the fix

Use the project's own rules if its guide has them; otherwise the profile's impact scheme
([references/system-profiles.md](references/system-profiles.md#impact-of-a-fix)): semantic versioning for a published
package; for a service, an application or data, what the fix changes for the interface's users (a wire format, a flag,
a file format, a schema, a configuration key), whether it needs a migration, and its deployment risk. Note when a fix
you would suggest is breaking but a narrower one is not; that is often the useful finding.

### Report

One Markdown file. Its header gives the scope, the commit reviewed, the reviewer, the date (read it from the system,
for example with `date`, not from memory) and the profile in brief. Then these sections:

1. **Baseline**: the commands, their exit codes and results.
2. **Profile and inventory**: the profile, and the map from Phase 1 or a link to it.
3. **Scope, segments and coverage**: the scope, each segment, and for each inventory group whether it was reviewed
   fully, partly or not at all, and what was not run. Be honest; it decides what gets a second look. List what was
   excluded, the stand-ins used and what each could hide, and the known issues met, each with its link. End it with the
   **test gaps**: contracts no test covers, most important first.
4. **Confirmed defects**, most severe first. Each with:
   - **ID**: `<reviewer>-D<n>`; **Area**: the inventory item; **Summary**: one sentence;
   - **Contract**: what is promised, with file and line or page;
   - **Reproduction**: the minimal probe (inline when short, otherwise its path in the notes) and the exact command
     that ran it. It runs as written: from the project root, or after setup commands given verbatim before it;
   - **Observed / expected**: the output the command printed, copied, and what the contract says it should be;
   - **Suggested fix**: a sketch, and what it could break. Suggest the fix that makes the code keep its stated contract.
     A fix that adds a capability to make the failing case pass (a retry, a fallback, a new option) is a design
     question: report it as one;
   - **Severity** and **Impact**, each with a reason.
5. **Documentation findings**: wrong, contradictory, missing or unclear; the same fields, with *Reproduction* replaced
   by the page and its text, plus the probe and its output where the page shows behavior. A fix to the docs alone has
   the impact *none*.
6. **Suspected**: what you could not confirm or could not probe safely, and what you tried.
7. **Design questions**: decided behavior and departures from a standard that you would argue against, with the
   argument, the consequence you showed, its cost, and the user's answer where you asked.
8. **What is sound**: areas checked and found correct, one line each, naming the path you probed; an area is sound only
   as far as the probes reached.
9. **Outside the scope** (a change set or an area only): defects met on the way that the scope did not cause or
   include, briefly, with their evidence.
10. **Calibration** (only if the user gave known defects afterwards): which you found, which you missed, and why.

### Finishing

- Remove every probe from the checkout, stop every process you started, and confirm the checkout is clean, ignored
  files included (`git status --porcelain --ignored`). The probes in your notes folder stay.
- End your last message with the report's absolute path and one line per section giving its number of entries.
