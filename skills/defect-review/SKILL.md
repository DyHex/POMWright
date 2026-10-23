---
name: defect-review
description: >-
  An honest, evidence-based defect review that finds defects, inconsistencies between code, types, tests and docs,
  and holes in the documentation, with every finding reproduced before it is reported and classified by severity and
  semver impact. It works at three scopes: a whole project (a library, an application, a tool), a change set (a branch,
  the commits since a tag or commit, a pull request), or one area (files, a module, a feature, a domain); it picks the
  scope from the request and asks when it cannot tell. Use it whenever the user asks for a defect review, a thorough or
  independent review, an audit, a bug hunt, a pre-release review, "find what is wrong with X", "review what changed
  since v1.2", "review this branch for bugs", or a second opinion on a project's quality, even when they do not say
  "defect".
---

# Defect review

You review a project, a change set or an area of a project, and report what is wrong with it, with evidence. You change
nothing: the report is the product. A short report of confirmed findings is worth more than a long one of guesses, and
saying that an area is sound is a finding too.

## Choose the scope

A review has one of three scopes. Decide which from the request and its context before anything else, because the
scope decides how much you read, what you map and what counts as a finding.

- **The whole project**: "review the repo", "audit the library", "a pre-release review", "what is wrong with this
  project".
- **A change set**: "the changes on this branch", "what I changed", "since commit `abc123`", "since v1.2", "this pull
  request". Resolve it to a concrete range: for a branch, from its merge base with the default branch to `HEAD`
  (`git merge-base HEAD main`); for "since X", from X to `HEAD`; for a pull request, its base and head. List the commits
  and the changed files.
- **An area**: named files, a folder, a module, a feature or a domain ("the session storage helper", "billing",
  `src/auth/`). Find the files that implement it, the docs that describe it and the tests that cover it.

When the request names the scope, or the context makes it plain (a pull request link, "my branch", a file path), use
it. When it does not ("do a defect review", "review this"), ask one question before reading further, offering the three
scopes with what each would concretely be here, for example: "the 6 commits on `feature/x` since it left `main`, the
whole repository (about 4,000 lines of source), or a module or feature you name?" Then wait for the answer. Starting a
whole-project review on a guess costs the most of the three, and a change set reviewed as a whole project buries the
change's own defects among old ones.

Write the scope at the top of the report: the range and its commits, or the files and pages, or "the whole repository
at `<commit>`".

### What changes with the scope

- **Whole project**: every phase below, as written.
- **A change set**: the inventory is the change's items: every changed function, type, option, message, doc page and
  test, and every contract the change adds or alters (read its commit messages, changelog entries and changed docs:
  they say what it promises). Read enough around each change to know its callers and the paths beside it. Then ask what
  only a change can get wrong:
  - **Does the promise hold everywhere it should?** A fix often covers one path and misses its sibling: the other entry
    point, the other mode, the other branch of the same `if`. List every path the promise applies to as the user meets
    them (for example: awaited and overlapping calls, with the state already reached and not yet reached), including the
    paths the change did not touch, and probe each through the public API. A probe of the changed internal function
    shows that the new code works; it says nothing about the promise on the paths that bypass it.
  - **What did it break?** Run the same probe on the change's base and on its head; behaviour that differed and was not
    meant to is a regression.
  - **Did the docs, the types, the tests and the changelog keep up?**

  A defect that existed before the change, and that the change neither caused nor touched, goes in its own section,
  *Outside the change set*, not among the change's findings.
- **An area**: map the area and its contracts in full; read the rest only as far as the area's callers, the helpers it
  shares and the contracts that mention it. A defect found outside the area while doing so goes under *Outside the
  scope*.

## Before you start: what to agree with the user

Ask only for what you cannot find yourself. Defaults in brackets:

- **Where the report goes** [a `reviews/` folder beside the repository, outside it, named after the reviewer].
- **A reviewer ID** for finding IDs, when more than one reviewer runs [the model's short name].
- **Budget**: which slow checks are worth running, for example every browser or only one [the cheapest that still
  shows the finding; the expensive ones when a finding depends on them].
- **Calibration**: whether the user knows some defects already and wants to measure the review by them [no]. If so, the
  user keeps them to themselves until the report is done: knowing them biases the search.

Work in a checkout of its own (a separate git worktree or clone), so nothing you run touches the user's working tree,
and so notes or memories tied to the user's usual checkout do not leak earlier findings into an independent review.
Give your probes a scratch folder of your own too, outside the repository and not shared with another reviewer.

## Ground rules

- **Read-only.** Do not change tracked files, commit, push, open issues or pull requests, publish, or add dependencies.
  The only files you create are probes, your working notes and the report. A probe that has to sit inside the project
  to run is removed from there as soon as it has run; its source and output are kept in your notes folder.
- **Evidence, not suspicion.** A defect is *confirmed* only when you reproduced it, and you say how: a test run, a
  script, the compiler, a real browser or device. Anything you could not reproduce goes under *Suspected*, with what
  you tried. Where you can, show both sides: the probe fails on the current code, and a sketch of the fix makes it pass.
  Keep every probe whose result the report relies on, so a reader can run it again.
- **A defect breaks a contract.** Each confirmed defect names the contract it breaks, or says plainly that it is a hole
  where a contract should exist (silent data loss, a crash). A test that is missing is not a defect: it goes under the
  coverage section's test gaps. Behaviour you would design differently is a design question. A long list of weak
  findings hides the strong ones.
- **Decided design is not a defect.** When the code does what the project's guide, its docs and its doc comments
  decided, a disagreement is a *design question*, reported separately with its argument and cost. A defect is a gap
  between a stated contract and the behaviour, a contract that contradicts itself, behaviour no reasonable contract
  would choose (silent data loss, a crash, a message that contradicts itself), or a hole where a contract should exist.
- **Cite.** Every claim names the file and line, the page, or the command and its output.
- **Judge a run by its exit code, not by reading its output.** A summary line can hide a failure printed above it, and
  some tools report errors outside the per-test counts (a type error in source, an unhandled rejection). Read the exit
  code first, then the output for the detail.

## Phase 0: orient and record a baseline

Find out how the project wants to be worked on before forming opinions about it.

1. Read the contributor guide, whatever it is called (`AGENTS.md`, `CONTRIBUTING.md`, `CLAUDE.md`, a docs page for
   contributors), all of it. Note four things from it: the commands; the **contract sources** (what counts as
   documented behaviour: the public API's entry point, the docs site, the doc comments, a list of decided rules); the
   **decided design** (anything it says is deliberate, rejected, or not planned); and any **probing pitfalls** (how to
   run code in isolation, what breaks when you try).
2. Read the README and the package or build manifest: the public entry points, the supported runtimes and versions,
   what is published.
3. Run the baseline: install, the unit tests, the integration or end-to-end tests at the cheapest useful scope, the
   type check, the linter. Record each command and its exit code. A red baseline is a finding in itself; it also tells
   you which failures are not yours.
4. Work out how to probe: where a temporary test file goes so the runner picks it up, how to run one file, how to load
   the built package from a script, where a scratch folder outside the repository is. Note **shared resources** (a fixed
   port, a server the tests start, a shared build output): two probes or two reviewers using them at once will collide.

## Phase 1: map the project

Write an inventory before hunting. Hunting first finds the easy defects in the familiar places and leaves the rest
unseen; the map is what makes coverage honest.

Write it to a file (`inventory.md` in your notes folder), one line per item: what it is, the files that implement it,
where it is documented. Cover:

- every public export and every public member, option and configuration key;
- every feature and every stated contract (a promise in the docs, a rule in the guide, an invariant in a doc comment);
- errors and messages the user can meet, and where each is documented;
- lifecycles and ordering: initialisation, async work, concurrency, cleanup;
- inputs at the boundary: what the API accepts, and what it validates;
- types, if the language has them: do they accept what the runtime accepts, and reject what it rejects;
- packaging and distribution: entry points, module formats, declarations, the published file list, supported versions;
- the documentation: README, guides, API reference, examples, migration guides;
- the tests and the tooling: what is tested and against what (source or the built package), CI workflows, release and
  publishing (which commit is tested, which is published), scripts;
- the contributor guide itself: does it still describe the repository?

Read the source in full for the areas in scope; skim the tests to learn what is covered and what is not.

## Phase 2: plan segments

A large project does not fit in one context window, and attention thins as a context fills. Split the inventory into
segments that each get a full review.

- **Group by area**, so a segment holds things that share code and contracts (a module and its docs and tests), not
  by file type.
- **Size each segment** so that its source, its tests, its docs and your probes fit comfortably in one context, with
  room left for thinking. As a rough guide: a few thousand lines of source and the pages that document them. If the
  whole project fits that, one segment is fine; do not split for the sake of it.
- **Order by risk**: concurrency and ordering, input validation at boundaries, data that can be lost silently, public
  types, lifecycle and cleanup, packaging, release and CI. Review the riskiest first, so a budget that runs out cuts the
  least valuable work.
- **Write the plan** (`segments.md`): each segment's scope, its inventory lines, and its order.

Each segment then gets a fresh context: a subagent if you can start one, otherwise one segment at a time, re-reading the
inventory and the ground rules at its start. Give each the ground rules, the inventory, its segment's scope, the probing
notes from Phase 0, and where to write its findings (`segment-<n>.md`). Run segments that use a shared resource one
after another, or each in its own worktree. Work written to files survives a context that runs out; work held only in
the conversation does not.

## Phase 3: review a segment

For every item in the segment, ask at least:

- **Contract.** Where is it stated: docs, doc comments, the guide? Do these agree with each other and with the README?
- **Behaviour at the boundaries.** Does the code do what the contract says, at the edges too? Try what applies:
  - empty, null and undefined values; zero, negative and non-integer numbers; NaN;
  - special strings: `__proto__` and other prototype names as keys, unicode, whitespace and control characters,
    very long values;
  - values that normalise: URLs (backslashes, tabs and newlines, empty `?` or `#`, credentials), paths, case, encoding;
  - regular expressions with flags and state (`g`, `y`, `lastIndex`);
  - overlapping or un-awaited async calls, and calls in a `Promise.all`; calls made after the state changed underneath
    (a navigation, a close, a dispose, a timeout);
  - objects the API returned, used again after later calls; inputs the caller mutates after passing them; objects
    passed as class instances or with prototypes rather than plain literals;
  - a constructor or initialiser that fails partway; a method called detached from its object;
  - errors: thrown at the right time, with the documented message, and a message that names the actual cause and fix.
- **Types.** Do the public types accept what the runtime accepts and reject what it rejects? Do overloads and their
  implementation agree? Do documented forms (different config modes, decorator forms, module resolutions) compile?
- **The platform beneath.** Where the project says it mirrors or wraps a platform or dependency, does it behave the
  same, including across the browsers, runtimes or versions it supports? Is it relying on anything internal or
  unstable in that dependency?
- **Tests.** Is the contract tested, against the built artefact where it matters, in the environments where it matters?
  Is anything only "checked by hand"? Existing tests are not evidence that a promise holds: read which paths and inputs
  they actually exercise, and probe the ones they leave out. Never skip probing a contract, or call it sound, because
  tests exist for it.
- **Docs.** Is the feature documented where a user would look? Is every example correct, and every output, message and
  rendered value shown what the code actually produces? What would a new user need that no page says? Does a broad
  claim ("everything is checked", "identical to X") hold against the narrower contracts?

Probing:

- Make each reproduction minimal, and run it where the behaviour lives: a real browser for browser behaviour, the
  built package for packaging, the compiler for types.
- Call what a user calls. Probe through the public entry point, not an internal unit behind it: the public call may take
  a path that never reaches the unit (an early return, a fast path, a different mode). Probe an internal unit only to
  explain a defect already shown through the public API.
- Record the command, the exit code and the relevant output in the segment's findings, and keep the probe's source in
  the notes folder.
- Keep the checkout clean between probes.
- Claim only what you probed. "Overlapping calls merge in order" is a claim about every path; if you probed one, say
  which one ("away from the origin, overlapping calls merge in order").

Write findings to the segment's file as you go, in the report's format below.

## Phase 4: consolidate and report

1. Read every segment file. Merge duplicates, keeping the strongest evidence. Look across segments for issues no
   single segment could see (two areas that disagree about one contract).
2. Re-check anything marked confirmed whose evidence is thin.
3. Rank and classify each finding (below), then write the report.

### Severity

- **High**: wrong results or data loss in normal use.
- **Medium**: wrong in a plausible edge case, or a documented feature that does not work as documented.
- **Low**: a rare input, a misleading message, an inconsistency without wrong behaviour.

### Semver impact of the fix

Use the project's own rules if its guide has them. Otherwise:

- **patch**: brings behaviour in line with a stated contract, or rejects input that never worked;
- **minor**: adds a member, an option or an accepted input without breaking existing code;
- **major**: code written against the current docs stops compiling, or behaves differently in a way it could rely on.

Note when a fix you would suggest is breaking but a narrower one is not; that is often the useful finding.

### Report

One Markdown file. Its header gives the scope, the commit reviewed, the reviewer and the date (read it from the system,
for example with `date`, rather than from memory). Then these sections:

1. **Baseline**: the commands, their exit codes and results.
2. **Inventory**: the map from Phase 1, or a link to it.
3. **Scope, segments and coverage**: the scope (the range and its commits, or the files and pages, or the whole
   repository at a commit), each segment, and for each inventory group whether it was reviewed fully, partly or not at
   all, and what was not run. Be honest; it decides what gets a second look. End it with the **test gaps**: contracts
   no test covers, most important first.
4. **Confirmed defects**, most severe first. Each with:
   - **ID**: `<reviewer>-D<n>`;
   - **Area**: the inventory item;
   - **Summary**: one sentence;
   - **Contract**: what is promised, with file and line or page;
   - **Reproduction**: in the report itself, the minimal probe (inline when short, otherwise its path in the notes)
     and the exact command that ran it. It runs as written: from the project root, or after setup commands given
     verbatim before it. An inline snippet defines every variable it uses, and a probe file in the notes has what it
     needs to run beside it;
   - **Observed / expected**: the output the command printed, copied, and what the contract says it should be;
   - **Severity**, with a reason;
   - **Suggested fix**: a sketch, and anything it could break;
   - **Semver**, with a reason.
5. **Documentation findings**: wrong, contradictory, missing or unclear; the same fields, with *Reproduction* replaced
   by the page and its text, plus the probe and its output where the page shows behaviour. A fix that only changes the
   docs has the semver impact *none*; say so.
6. **Suspected**: what you could not confirm, and what you tried.
7. **Design questions**: decided behaviour you would argue against, with the argument and its cost.
8. **What is sound**: areas checked and found correct, one line each, so they need no second look. Name the path you
   probed; an area is sound only as far as the probes reached.
9. **Outside the scope** (a change set or an area only): defects met on the way that the scope did not cause or
   include, briefly, with their evidence.
10. **Calibration** (only if the user gave known defects afterwards): which you found, which you missed, and why.

### Finishing

- Remove every probe from the checkout, and confirm it is clean, ignored files included
  (`git status --porcelain --ignored`). The probes in your notes folder stay.
- End your last message with the report's absolute path and one line per section giving its number of entries.
