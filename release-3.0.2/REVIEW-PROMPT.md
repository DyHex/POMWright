# Review prompt

Paste the text below into each review session. Replace `<REVIEWER>` with `opus` or `codex`, and `<WORKTREE>` with the
session's checkout. The sessions run one at a time, each in its own worktree at `v3.0.1`; setup is at the end of this
file.

---

You are reviewing POMWright 3.0.1: a TypeScript companion library for `@playwright/test`, published to npm as
`pomwright`. Your job is an honest, objective and thorough review of the whole library and repository. Find defects,
inconsistencies between code, types, tests and docs, and holes in the documentation. You report; you fix nothing.

The repository is checked out at `<WORKTREE>`, at the tag `v3.0.1`. Review that checkout only. Do not look at other
branches, worktrees or stashes, or at earlier reviews of POMWright.

## Ground rules

- **Read-only.** Do not modify tracked files, commit, push, open issues or pull requests, publish, or add dependencies.
  The only files you create are temporary probes, which you delete after use, and your report.
- `AGENTS.md` is the contributor guide. Read all of it: its facts about the repository and its decided contracts
  (sections 5 and 8) are your reference. Its workflow rules for changes (plans, release folders, commits) do not apply
  to you, since you change nothing.
- **Decided design is not a defect.** Where the code does what `AGENTS.md`, the docs and the doc comments decide, a
  disagreement is a *design question*: reported separately, with your argument. A defect is a gap between a stated
  contract and the behaviour, a contract that contradicts itself, behaviour that no reasonable contract would choose
  (silent data loss, a self-contradictory error message, a crash), or a hole where a contract should exist.
- **Evidence, not suspicion.** A defect is reported as confirmed only when you have reproduced it, and you say how: a
  real browser through the harness, a vitest run, a Node script against the build, or the compiler. Anything you could
  not reproduce goes under *Suspected*, labelled with what you tried. Do not pad the report. A short report with
  confirmed findings is worth more than a long one with guesses. If an area is sound, say so.
- Mirror the project's own standard: a claim cites the file and line, and a runtime claim comes from a probe.

## Setup and baseline

From `<WORKTREE>`, with Node 24 and pnpm (the version in `packageManager`):

1. `pnpm install --frozen-lockfile`
2. `pnpm test:unit` and record the result.
3. `pnpm harness:install`, then `pnpm -C test exec playwright test --project=chromium --reporter=line` and record the
   result. Use the line reporter; the html reporter blocks. The harness starts its own server on port 9000.
4. Probing (`AGENTS.md` section 3): a temporary spec under `test/tests/` (named `zzProbe-<topic>.spec.ts`, deleted
   after the run), run with `pnpm -C test exec playwright test tests/zzProbe-<topic>.spec.ts --project=chromium
   --reporter=line` after `pnpm harness:install`; or a Node script in a scratch directory outside the repository. Read
   the four probing pitfalls at the end of section 3 first. Run firefox and webkit when a finding may depend on the
   browser.

## Method

Work in two phases. Do not start hunting before phase 1 is written down.

### Phase 1: the inventory

Read `index.ts`, every file under `src/`, `AGENTS.md`, the README, and the site under `website/src/content/docs/` (Docs,
API, Internal). Skim the tests to learn what is covered. Then write the inventory into your report: every feature,
concept, public member and contract POMWright has, one line each, with the files that implement it and the pages that
document it. Start from this list and extend it; it is not complete:

1. Packaging: the CommonJS build and ESM entry, the `exports` map, declarations, the peer range, `engines`
2. Locator paths: format rules at run time and at compile time, the whitespace list, path types and forwarding
3. Registration: `add(path)` with every strategy (including `getById`, `frameLocator(selector)` and
   `frameLocator()`), steps at registration, reuse by path and by seed, a registration ending at the next call,
   input copying, the primary-argument checks
4. Resolution: `getLocator`, `getNestedLocator`, unregistered segments, frames and `contentFrame()`, the any-frame
   locator, descriptions
5. Filters: `has`/`hasNot` with paths, cycle detection, `visible`, text options
6. Queries: `getLocatorSchema` with `filter`, `nth`, `clearSteps`, `skip`/`unskip`, `describe`, `update` (JSON Merge
   Patch, `null`), `replace`; isolation from the registry
7. Reusable locators: `createReusable`, the immutability of seeds
8. `verify()` and `strictChains`
9. `PageObject`: constructor validation, the deferred `defineLocators()`/`verify()`, labelled errors and call sites,
   options, the actions hook
10. URLs and navigation: string and RegExp `baseUrl`/`urlPath`, `fullUrl`, `UrlMatcher`, `goto`, `expectThisPage`,
    `expectAnotherPage`, `navOptions`
11. `SessionStorage`: `set`, `get`, `clear`, codecs (`json`, `Codec`), schemas, origin checks
12. `seed`: init scripts, first arrival, frames, disposal, listeners, overlapping calls, refused and never-applied seeds,
    the Navigation API check
13. Logging: `PlaywrightReportLogger`, levels, child loggers, attachments, the `log` fixture
14. `@step`: both decorator forms, boxed steps, titles, return types
15. Call-site capture for deferred errors
16. Public types: every export, inference, compile-time errors, declaration emit
17. Documentation: the README, every site page, the doc comments, the error messages page, *Upgrading from 2.x*
18. Tests and tooling: coverage gaps, the CI workflows, the scripts, the doc checks
19. `AGENTS.md` itself: does it match the repository?

### Phase 2: review each item

For every inventory item, ask at least:

- **Contract.** Where is it stated (docs, doc comment, `AGENTS.md`)? Do these agree with each other?
- **Behaviour.** Does the code do what the contract says, including at the boundaries? Consider:
  - empty, `null` and `undefined` values; special strings (`__proto__`, unicode, whitespace, control characters)
  - URLs that normalize; RegExps with flags and `lastIndex`
  - overlapping or un-awaited calls; calls after the page navigated or closed
  - reuse of returned objects after later calls; mutation of inputs after the call
  - error paths: is every error thrown at the right time, with the documented message?
- **Types.** Do the public types accept what the runtime accepts and reject what it rejects? Compile-time and runtime
  path rules must agree.
- **Playwright.** Does it mirror Playwright where it says it does? Is it exposed to Playwright internals or
  version-specific behaviour within the peer range?
- **Tests.** Is the contract tested, against the packed build where it matters, on the browsers where it matters?
- **Docs.** Is the feature documented where a user would look? Is every example correct, and every shown chain and
  message what the code produces? What would a new user need that no page says?

## Report

Write one Markdown file, `../POMWright-reviews/<REVIEWER>.md` relative to `<WORKTREE>`, with these sections:

1. **Baseline**: commands run and their results.
2. **Inventory**: phase 1.
3. **Coverage**: for each inventory item, reviewed fully, partly or not at all. Be honest; it decides what gets a second
   look.
4. **Confirmed defects**, most severe first. Each one:
   - `ID`: `<REVIEWER>-D<n>`
   - **Area**: the inventory item
   - **Summary**: one sentence
   - **Contract**: what is promised, with file:line or page
   - **Reproduction**: the probe, minimal, and the command that ran it
   - **Observed / expected**
   - **Severity**: high (wrong results or data loss in normal use), medium (wrong in a plausible edge case),
     low (rare input, or a misleading message)
   - **Suggested fix**: a sketch
   - **Semver**: patch, minor or major, with a reason. Here, *patch* brings behaviour in line with a stated contract or
     rejects input that never worked; *minor* adds a member, option or accepted input without breaking 3.0.1 code;
     *major* means code written against the 3.0.1 docs stops compiling or behaves differently in a way it could have
     relied on.
5. **Documentation findings**: wrong, contradictory, missing or unclear. Same fields, with "Reproduction" replaced by
   the page and the text.
6. **Suspected**: what you could not confirm, and what you tried.
7. **Design questions**: decided behaviour you would argue against, with the argument and its cost.
8. **What is sound**: areas you checked and found correct, in one line each, so they need no second look.

Delete every probe file before you finish, and confirm with `git status` that the checkout is clean. End your last
message with the report's absolute path and one line per section giving its number of entries.

---

## Setup for the user

A worktree is a second folder with the repository checked out at another commit. It shares this repository's `.git`,
so nothing is cloned, and this checkout (the branch and its uncommitted `release-3.0.2/`) is not touched. The new folder
has only what is committed at `v3.0.1`. It also has a path of its own, so a Claude session there does not load this
checkout's project memory, which lists the defects already found.

```bash
cd /home/magdys/workspace/dyhex/POMWright
mkdir -p ../POMWright-reviews
git worktree add --detach ../POMWright-review-opus v3.0.1
```

Start the session in `/home/magdys/workspace/dyhex/POMWright-review-opus` (`<WORKTREE>`). When it has finished:

```bash
git worktree remove --force ../POMWright-review-opus   # --force: the folder holds untracked installs and builds
git worktree add --detach ../POMWright-review-codex v3.0.1
```

Then do the same for the Codex session, and remove its worktree after it has finished. The reports stay in
`../POMWright-reviews/`.
