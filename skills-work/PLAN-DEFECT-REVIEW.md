# PLAN-DEFECT-REVIEW: make `defect-review` a true generalist

Status: **done 2026-11-12** (the maintainer's go, 2026-11-12; see *Execution notes*): steps 1 and 2 built (da4bd1b,
0f7b964); step 3's calibration **dropped by the maintainer** (2026-11-12: "We won't run defect-review calibrations"; its
eval plan deleted); step 4 is PLAN-7 (d7f52dc). **Agreed 2026-11-10** with the maintainer's changes (user-invoked only; standards mapped from context and
divergence asked about; calibration from `v3.0.0`; runs last). The decisions in force are R1-R8 in
[DECISIONS.md](DECISIONS.md); where this plan's text below differs, the ledger wins. The maintainer's item (2026-11-10): `defect-review` is listed on the
site's SKILLS tab, after it is polished into a general skill that finds defects in any system, with no bias toward
POMWright's implementation or toward web applications, highly effective at finding defects, questionable design
decisions, and gaps in tests, docs and configuration, and tailoring itself to the context it is used in.

Reviewed: [skills/defect-review/SKILL.md](../skills/defect-review/SKILL.md) (358 lines, read in full) and the header
of [scripts/review-status.mjs](../skills/defect-review/scripts/review-status.mjs) (300 lines) at 7aebcb1.

## What stays: the method is already general

These parts are the skill's strength and carry over unchanged in substance:

- three scopes (whole project, change set, area), chosen from the request, one question when unclear, and what each
  scope changes, including "does the promise hold on every path" and base-vs-head probes for a change set (L20-65);
- read-only, evidence before claims, a defect breaks a stated contract, decided design is a design question, cite
  everything, judge by exit code (L84-104);
- orient on the project's own guide and its contract sources, known issues, a recorded baseline, supported-range
  runs (L106-127);
- an inventory before hunting, segments sized for one context and ordered by risk, written to files (L129-175);
- probe through the public entry point, minimal reproductions, claim only what was probed (L276-289);
- consolidation, severity, the report's sections, *What is sound*, *Suspected*, *Design questions*, calibration
  (L293-358).

## Where it is biased (to generalize)

| lines | bias | change |
| --- | --- | --- |
| L31, L288-289 | examples from POMWright's own code ("the session storage helper", "away from the origin, overlapping calls merge in order") | neutral examples, a different domain each time |
| L73-74, L90, L278-279 | "every browser or only one", "a real browser or device", "a real browser for browser behavior" | "the real environment the behavior lives in" (a browser, a device, an OS, a database, a network, a GPU, a cluster), picked by the profile (below) |
| L137-147, L279-281 | the inventory and the packaging probes assume a published library ("every public export", "module system and resolution", "the packed artifact installed into a scratch project") | inventory items and packaging checks per kind of system (a library, a service, an application, a CLI, a pipeline, infrastructure): moved to a reference |
| L251-262 | the boundary checklist is JavaScript and browser specific (`__proto__`, URL normalization with tabs and credentials, RegExp `lastIndex`, `Promise.all`, navigation, a method called detached) | a catalog of boundary and failure classes by domain, language-neutral, with language and platform notes; the reviewer picks the sections the profile selects |
| L263-264 | "decorator forms, module resolutions" | "every documented configuration or build mode" |
| L306-314 | semver as the only impact scheme | impact by kind: semver for published packages; for services, applications and data, the compatibility of the interface the fix changes (wire API, CLI flags, file formats, schemas, configuration keys), migrations, deployment risk |
| L71 | default report folder "a `reviews/` folder beside the repository" | keep, but say where when the project has a convention |
| L199-244 | the status table and caps read Claude Code's transcript files and `review-status.mjs` | keep, as the Claude Code way, in a reference; for other agents, the same table from what their harness reports, or progress without cost when it reports nothing |

## Gaps against the brief

1. **No step that tailors the review.** Proposed: Phase 0 writes a **review profile** (`profile.md`) before any
   opinion: the kind(s) of system; languages, runtimes and platforms; how it is delivered (a published package, a
   deployed service, an installed application, an internal tool, infrastructure code); who uses it and through what
   interface; its contract sources; the environments it claims to support; what "a real run" means here; the risk
   ranking for this system; which catalog sections and lenses apply; which impact scheme applies. The report's header
   states the profile, so a reader sees what the review assumed. The user is asked only for what the repository does
   not show.
2. **Design decisions are only reported when they contradict a contract.** Keep that rule, and add a **design lens**
   with evidence: invariants enforced in more than one place (and disagreeing), duplicated logic that has already
   diverged, error handling that swallows or loses information, coupling that makes a stated contract impossible to keep,
   an abstraction whose callers all work around it. Each such item needs a concrete consequence shown (a probe, a
   diff of the diverged copies, a call site), or it stays out.
3. **Configuration and operations are thin.** Add to the inventory and the catalog: configuration files, defaults,
   environment variables and their documentation; secrets handling; dependency pinning and lockfiles; build and CI
   configuration (what is tested versus what ships); deployment and infrastructure code; observability (are errors
   logged with what is needed to act on them).
4. **Security, performance and resource use are absent.** Add them as lenses, kept to defects with evidence, not a
   penetration test or a benchmark campaign: input that reaches an interpreter, a shell, a query or a file path
   unescaped; authorization checked on one path and not its sibling; secrets in logs, errors or the repository;
   unbounded growth (memory, files, connections, retries); work that grows faster than its input where the contract
   implies otherwise; leaks on error paths. A **safety rule** joins the ground rules: probes run in a local or scratch
   environment the reviewer controls; never against production, shared or third-party systems, and never beyond the
   minimal reproduction, without the user's explicit permission.
5. **The real thing over a stand-in**, a principle the POMWright review relied on, is only implicit. Make it a ground
   rule: a probe runs where the behavior lives; a stand-in (a mock, an emulator, a single worker, a tiny sample) is
   used only when the real thing cannot produce the case, is disclosed with what it could hide, and never backs a
   claim that something does not happen.

## Proposed structure

`SKILL.md` stays the method, shorter (target ≤ 300 lines), and loads what the profile selects:

```text
skills/defect-review/
  SKILL.md                 scopes, ground rules (with safety and stand-ins), phases 0-4, severity, report format
  references/
    system-profiles.md     per kind of system: contract sources, inventory items, risk order, where behavior lives
                           (how to probe for real), impact scheme. Kinds: library or package, web or HTTP service,
                           web front end, desktop or mobile app, CLI or developer tool, data or ML pipeline,
                           infrastructure as code, embedded or systems code; a system can be several
    probe-catalog.md       boundary and failure classes by domain: values and types, text and encodings, numbers,
                           time and time zones, collections, identity and equality, state and lifecycle, concurrency
                           and ordering, I/O and filesystems, networks and partial failure, persistence and
                           migrations, configuration and environment, packaging and distribution, user interfaces
                           and accessibility; each with what to try and how to reproduce it
    lenses.md              design, tests, docs, configuration and operations, security, performance and resources:
                           what counts as a finding in each and what evidence it needs
    running-segments.md    segments with subagents or separate sessions, the status table, caps; the Claude Code
                           specifics (transcripts, review-status.mjs) in their own section
  scripts/review-status.mjs  unchanged, documented as Claude Code's
```

Every reference has a table of contents (each is over 100 lines). References are one level deep from `SKILL.md`.

## Making it effective, measurably

The skill already has a calibration mode (known defects held back until the report is done); it becomes the eval:

1. **POMWright itself**: review the `v3.0.0` tag (9e5c43e) and compare with every defect fixed in 3.0.1 and 3.0.2
   (their changelog entries). This measures recall on a real system; improvements from it must stay general (R7).
2. **Four public repositories of other kinds**, each at a commit just before a bug-fix commit whose issue describes
   the defect: a library in another language (Python or Go), an HTTP service, a front-end application, an
   infrastructure-as-code repository. Area or change-set scope around the buggy code, so a run stays affordable.
   Measured: known defects found, false confirmed findings, and whether the profile and checklists fit (no browser
   questions for a CLI, no semver for a service).
3. Runs on Claude and, where available, a Codex model. Results in this folder; changes to the skill follow from them.

Each run is a cost; the plan for the runs (repositories, commits, scopes, an estimated cost) is written and agreed
before any run.

## Decisions

- [x] **1.** Keep the name; **user-invoked only** (`disable-model-invocation: true`, Codex `allow_implicit_invocation:
  false`), no keyword triggering; drop the POMWright-flavored examples; the description says "any kind of system" and
  "design, tests, docs and configuration".
- [x] **2.** The review profile in Phase 0, stated in the report's header.
- [x] **3.** The four references above; `SKILL.md` at most about 300 lines.
- [x] **4.** The design, configuration and operations, security, and performance lenses, evidence required, with the
  safety rule.
- [x] **5.** Impact by kind of system (semver only for published packages).
- [x] **6.** Calibration: POMWright at `v3.0.0` (9e5c43e) against every defect the 3.0.1 and 3.0.2 changelog entries
  record as fixed; improvements must be general, never POMWright-specific (R7). Other repositories optional, planned
  and agreed first.
- [x] **7.** When: last of the skill work (S9).
- [x] **8.** Standards from context (R6): the review maps the patterns, standards and practices its subject uses or its
  context calls for, holds the subject to them, and asks whether a divergence is a design choice with a reason.

## Execution order

1. Rewrite `SKILL.md` (structure, profile, ground rules, neutral examples, impact) and write the four references.
2. Run the checks of PLAN-1 on it (frontmatter, sizes, links).
3. Write the eval plan (repositories, commits, scopes, cost estimate) and stop for agreement; run; record; adjust.
4. List it on the SKILLS tab (PLAN-7) apart from the POMWright skills.

No changeset: the skill is not in the npm package. `docs/repository.md`'s `skills/` row is updated to say what the skill
covers.

## Execution notes (2026-11-12)

- Steps 1 and 2: `SKILL.md` rewritten (300 lines: the cap), with `references/system-profiles.md` (the profile, eight
  kinds, the impact schemes), `probe-catalog.md` (14 domains and language notes), `lenses.md` (design, tests, docs,
  configuration and operations, security, performance and resources, standards and practices) and
  `running-segments.md` (who runs them, the brief, the status table, caps, Claude Code, other agents);
  `agents/openai.yaml`; `license: Apache-2.0`, `disable-model-invocation: true`, `argument-hint`. The skill is no
  longer exempt in `scripts/check-skills.mjs` (`EXEMPT` is empty); `pnpm lint:skills`, `lint:guide`, `lint`, the snippet
  check and the skills chain spec pass. `skills/README.md`'s row and `docs/repository.md`'s `skills/` row say what it
  covers now. No changeset (not in the package).
- Kept from the old skill in substance: the scopes, the ground rules, Phase 0 to 4, segments, severity, the report.
  Added: the profile (Phase 0, step 4), the safety rule, the real thing over a stand-in, standards from the context
  (R6), the lenses, impact by kind (R5), the stand-ins in the coverage section, stopping started processes.
- Nothing POMWright-specific: a grep for POMWright, Playwright, locator, session storage and registry finds only a
  package registry. Corrected 2026-11-12 (0f7b964), when the maintainer asked for the skill to carry nothing of
  POMWright: "registries" among the library kind's shared state became pools and global settings, and "an unhandled
  rejection" in the exit-code rule an error in a background task. The example profile stays a TypeScript library (now one that parses configuration files, with its CLI; 2026-11-12, the maintainer: "improve the TS example to make it general"):
  I had changed it to a Python service, and the maintainer undid that ("unnecessary"; they are its likely main user,
  in TypeScript; a Python example is as specific). The JavaScript notes in the probe catalog stay too.
