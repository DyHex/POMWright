# Scopes

The final review of POMWright before the 3.0.2 (or 3.1.0) release: the whole repository at `54cdada` on
`fix/review-3-0-2`, split into eight scopes, each reviewed in a session of its own with the defect-review skill. The
map is [inventory.md](inventory.md), the checks at the start are in [baseline.md](baseline.md).

## Order and status

Riskiest first: concurrency and ordering, then input validation and copies, lifecycle and URLs, types and packaging,
CI, and the documentation as a whole.

| Scope | Brief | Source (lines) | Status | Findings |
| --- | --- | --- | --- | --- |
| A | [Session storage](A-session-storage/brief.md) | ~1,120 | done | 5 defects, 3 docs, 0 suspected, 0 design |
| B | [Registration and resolution](B-registration-and-resolution/brief.md) | ~2,900 | done | 5 defects, 2 docs, 0 suspected, 0 design |
| C | [Queries](C-queries/brief.md) | ~950 | done | 5 defects, 2 docs, 0 suspected, 0 design |
| D | [Page objects, URLs and navigation](D-page-objects-urls-navigation/brief.md) | ~940 | done | 3 defects, 2 docs, 0 suspected, 0 design |
| E | [Logging, `@step` and the fixture](E-logging-step-fixture/brief.md) | ~550 | done | 3 defects, 2 docs, 0 suspected, 0 design |
| F | [Packaging, public types and changesets](F-packaging-types-changesets/brief.md) | `index.ts`, manifest, build | done | 2 defects, 2 docs, 0 suspected, 1 design |
| G | [CI, scripts and tooling](G-ci-and-tooling/brief.md) | workflows, scripts, configs | done | 7 defects, 3 docs, 1 suspected, 0 design |
| H | [The documentation as a whole, README and AGENTS.md](H-docs-readme-agents/brief.md) | none | done | 0 defects, 8 docs, 0 suspected, 1 design |
| — | Consolidation: [report.md](report.md) | | done | after merging: 30 defects, 19 docs, 1 suspected, 3 design |

A session updates its own row (status: in progress, done; findings: the count per kind) when it ends.

## Running a scope

One session at a time: the harness's test server has a fixed port (9000, reused when it is already up), and the
worktree's `dist/`, `.pack/` and `test/.doc-snippets/` are shared by every run in it.

```sh
cd /home/magdys/workspace/dyhex/POMWright-final-review
claude --add-dir /home/magdys/workspace/dyhex/POMWright/defect-review-result \
       --add-dir /home/magdys/workspace/dyhex/POMWright-final-review-probes
```

Then, for scope A (the others alike, with their letter and folder):

> Use the defect-review skill for scope A of the final review. Your brief is
> /home/magdys/workspace/dyhex/POMWright/defect-review-result/A-session-storage/brief.md. Read it first and follow it.

The worktree is detached at `54cdada` and stays there until every scope is done, so every scope reviews the same code.
Nothing is fixed until the consolidation is done and the findings are triaged.

## Common to every scope

### Where things are

- The code under review: the worktree `/home/magdys/workspace/dyhex/POMWright-final-review` (`54cdada`). Read it there,
  never in `/home/magdys/workspace/dyhex/POMWright`, which is the user's checkout and will move on.
- Results: `/home/magdys/workspace/dyhex/POMWright/defect-review-result/<scope folder>/`.
- Probes and notes: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/<scope letter>/`, outside both
  checkouts (a `.ts` probe inside the repository would be linted by `pnpm lint`). Every probe a finding relies on stays
  there.
- Read [inventory.md](inventory.md), [baseline.md](baseline.md) and your brief. Do not read the other scopes' folders,
  `/home/magdys/workspace/dyhex/POMWright-reviews/`, or the `release-3.0.*` folders in git history (earlier findings
  bias the search); the commits since `v3.0.1`, their diffs and the changesets are fair game and are part of the work.
  The one exception: the backlog issue drafts named in your brief (`git show 2f06702:release-3.0.2/issues/<file>`).

### Probing in the worktree

The worktree is installed and built: `dist/`, `.pack/pomwright`, `test/node_modules` and `website/node_modules` are
current for `54cdada`, and chromium, firefox and webkit are installed for Playwright 1.64.0.

- **A temporary spec**: write it to `test/tests/zz-probe-<id>.spec.ts`, run it with
  `pnpm -C test exec playwright test tests/zz-probe-<id>.spec.ts --project=chromium --reporter=line` (the config starts
  `test/server.js` on port 9000 or reuses it), then delete it. Import from `pomwright` to test the packed package, or
  from `../../src/...` for source. Fixtures: `test/fixtures/testApp.fixtures.ts`.
- **A Node script**: import the build by absolute path (`.../POMWright-final-review/dist/index.mjs` or `index.js`) and
  load chromium from the root package with `createRequire(".../POMWright-final-review/package.json")`, otherwise
  Playwright throws "Requiring @playwright/test second time" (AGENTS.md §3). `test.step`-wrapped helpers cannot be
  driven outside the runner: use a temporary spec for those.
- **A type probe**: write it to `test/tests/zz-probe-<id>.typecheck.ts`, run `pnpm exec tsc --noEmit -p test` from the
  worktree root (the first step of `pnpm typecheck`), then delete it. Use `// @ts-expect-error` to assert a rejection;
  the exit code decides.
- **A unit probe against source**: `src/zz-probe-<id>.test.ts`, `pnpm vitest run src/zz-probe-<id>.test.ts`, then
  delete it. Only to explain a defect already shown through the public API.
- **After a source sketch** (to show a fix makes a probe pass): `pnpm harness:install` rebuilds the tarball; then
  restore the file with `git checkout -- <file>` and run `pnpm harness:install` again before the next probe.
- **Other browsers and runtimes**: `--project=firefox` / `--project=webkit`; Node 20 at
  `/home/magdys/.nvm/versions/node/v20.20.2/bin`, Node 22 at `/home/magdys/.nvm/versions/node/v22.18.0/bin` (prepend to
  `PATH`).
- **Pitfalls** (AGENTS.md §3): a page object defines and verifies its registry in a microtask right after construction,
  so a probe that builds a broken page object on purpose must use it synchronously after `new` or capture the check;
  a test that fails, even under `test.fail()`, has its worker replaced; the local html reporter opens on failure and
  blocks, so always pass `--reporter=line`.
- **Budget**: chromium by default; firefox and webkit when the behaviour is browser behaviour (storage, navigation,
  URLs, frames) or a finding depends on it; Node 20 and 22 for anything that goes through `new URL`.
- Keep the worktree clean between probes. At the end, `git -C /home/magdys/workspace/dyhex/POMWright-final-review status --porcelain`
  prints nothing, and `--ignored` lists only what [baseline.md](baseline.md) lists.

### What to write

In the scope's folder:

- `summary.md`, written as you go: the scope and what you read; the inventory lines you reviewed fully, partly or not,
  and what you did not run; the **test gaps**, most important first; **what is sound** (one line each, naming the path
  probed); **outside the scope** (defects met in other scopes' code, briefly, with evidence, for the consolidation); and
  an index of the scope's finding files (ID, kind, severity, semver, one line).
- One file per finding: `defect-<scope>-<n>-<slug>.md` (`defect-A-1-proto-key-in-get.md`), for every kind: a confirmed
  defect, a documentation finding, a suspected defect, a design question. The format is below.
- Your row in this file's table.

### A finding's file

IDs are `<scope>-<n>` (`A-1`), numbered in the order found. Classification follows the skill, with AGENTS.md §7's
semver rules: behaviour brought in line with what the docs, the doc comments or AGENTS.md already promise is a
**patch**, so is an export such a promise requires, and a type corrected to what the docs promise and the runtime does;
a new export, member, option or accepted input is a **minor**; code written against the docs that stops compiling for
any other reason, or documented behaviour removed, is a **major**. A docs-only fix is **none**. When the full fix is
breaking and a narrower one is not, give both, as options.

```markdown
# <ID>: <one sentence>

- **Kind**: defect | documentation | suspected | design question
- **Area**: <inventory item>
- **Severity**: High | Medium | Low (<reason>)
- **Semver of the fix**: none | patch | minor | major (<reason, by AGENTS.md §7>)
- **Reviewed**: `54cdada`, <date from `date`>, <reviewer>
- **Status**: open

## Contract

What is promised, with file and line, page and heading, or the AGENTS.md rule. For a hole where no contract exists,
say so.

## Reproduction

The probe (inline when short, otherwise its path in the probes folder, with what it needs beside it), the exact
command from the worktree root, its exit code. For a documentation finding: the page and its text, plus the probe and
its output where the page shows behaviour. For a suspected defect: what was tried and why it did not settle it.

## Observed / expected

The output, copied, and what the contract says it should be.

## Cause

File and line, and why.

## Fix plan

Per AGENTS.md §6, to be confirmed before any code changes.

- **Intended contract**: what holds after the fix.
- **Options**: each with its cost and what it could break; the recommendation marked. Where the fix is breaking and a
  narrower one is not, both.
- **Implementation steps**: files and functions.
- **Tests**: unit, harness spec (which browsers), type probe; against the packed package where it matters.
- **Docs**: pages, headings, doc comments, `errors.md`, Internal pages, AGENTS.md lines that change.
- **Changeset**: bump and its first line (a sentence, never a heading), with a migration hint if a user's code changes.
- **Decisions to tick**:
  - [ ] <decision>
- **Execution order**: where it sits relative to other findings it touches.
```

For a **design question**, *Reproduction* shows the decided behaviour, *Observed / expected* becomes *Argument* (what
you would change, and its cost), and *Fix plan* lists the options if it were adopted.

For a finding whose only fix is **major**, the file is the GitHub issue as well: put the issue draft first, in the
format of the 3.0.2 drafts, and the sections above after it:

```markdown
**Title:** <title> (breaking)

**Labels:** backlog, breaking

---

<the body: what happens, a minimal reproduction, the contract, the proposed change and the migration>

---

<the finding's sections, as above>
```

### Finishing a scope

Remove every probe from the worktree and confirm it is clean (above), update your row in this table, and end with the
paths of `summary.md` and the finding files and one line per kind with its count.

## Consolidation (Phase 4)

After scope H, a last session, started like the others:

> Use the defect-review skill for the consolidation of the final review (Phase 4). Read
> /home/magdys/workspace/dyhex/POMWright/defect-review-result/scopes.md, inventory.md, baseline.md and every scope's
> summary.md and finding files, then write report.md there.

It merges duplicates (keeping the strongest evidence, and noting the merged IDs in both files), looks across scopes for
contracts two areas disagree about, re-checks every confirmed finding whose evidence is thin, and writes `report.md` in
the skill's report format: the baseline, the inventory, the scopes and their coverage with the test gaps, then every
finding ranked by severity with its kind, semver and file, the documentation findings, the suspected ones, the design
questions, what is sound, and a closing table that is the ledger for the fix work (ID, kind, severity, semver, the
proposed route: fix in this branch or GitHub issue, status).
