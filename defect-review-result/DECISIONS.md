# Decisions

The decisions landed in the walkthrough of [report.md](report.md), in the order they were taken. Each entry names the
items it settles, what was decided, why, and what it depends on. The finding files carry the same decision under
**Status** and in their ticked boxes, and report.md's ledger shows each item's status.

Nothing here is implemented yet, except the README's example (decision 59, point 6). The implementation plan is
written from these entries; where an entry differs from an option report.md marks [rec], the entry applies.

## 1. Dependabot, the release tooling and the open dependency PRs (2026-10-26)

**Settles**: [G-3](G-ci-and-tooling/defect-G-3-dependabot-proposes-deferred-majors.md); *Act before the next merge* #1.

**Decided**:

- **Backlog issue 01 is done in this branch**: `@changesets/cli` 3, `@changesets/changelog-github` 1,
  `changesets/action` v2, and npm Trusted Publishing for `publish.yaml`. What it changes:
  - root `package.json` and lockfile (the two changesets packages);
  - `.changeset/config.json`: the `$schema` URL only (`disableThanks` is still an option of `changelog-github` 1.0.1;
    the removed `prettier` option is not used). The 29 pending changeset files keep their format;
  - `publish.yaml`: `publish:` becomes `publish-script:`; the token goes through `github-token`; npm authentication by
    Trusted Publishing (OIDC), so `NPM_TOKEN` and `NPM_CONFIG_PROVENANCE` go; v2 fails the run when the publish command
    fails (v1.9.0 ignored its exit code);
  - AGENTS.md §2, §3 and §7, which name the action, the token and `NPM_CONFIG_PROVENANCE`.
- **`.github/dependabot.yml`**: every group takes minor and patch updates only, so each major arrives as a pull request
  of its own and a failing major never blocks the routine updates. `ignore` the majors of `typescript` (issue 02) and
  `@types/node` (issue 03), each with a comment naming its issue. Update the comment at the top of the file and AGENTS.md
  §2 to say which majors are held and where they are tracked.
- **PR #47** (`changesets/action` v2 alone) and **PR #49** (changesets 3, TypeScript 7, `@types/node` 26) are closed.
- **PR #48's change is done in this branch**: Mermaid 12 together with `astro-mermaid` 2.2.0. The maintainer checks
  every Mermaid diagram on the built site by hand before the merge. **PR #48 is closed** (added and done by the maintainer 2026-10-27: it bumps
  `mermaid` alone, which `astro-mermaid` 2.1.0's peer range `^10 || ^11` does not accept).

**Why**:

- #47 is green and mergeable but would fail every Publish run (v2 refuses changesets CLI 2 and the `publish` input), and
  #49 holds the root group red. Doing issue 01 now removes both, closes issue 01, and is the likely fix for G-10 (no
  provenance on 3.0.0 and 3.0.1, publish failures not shown): Trusted Publishing gives provenance, and v2 fails loudly.
  Issue 01 itself says the move "is proven on a patch release".
- Groups by update type stop one failing major from holding every routine update (the #49 problem with any package).
- TypeScript 7 cannot be used yet: in 7.0.2, `require("typescript")` returns only `{ version, versionMajorMinor }`, and
  the API is `typescript/unstable/*`; tsup's declaration build and both doc checks need the classic compiler API.
  Consumers are not affected (scope F compiled consumers on TypeScript 5.0 to 7.0.2).
- `@types/node` follows the Node version contributors and CI run (24) until issue 03.
- Mermaid 12 needs `astro-mermaid` 2.2.0 (2.1.0's peer range is `^10 || ^11`); CI cannot see a diagram that fails to
  render (AGENTS.md §9), hence the manual check.

**Prerequisite outside the repository**: the maintainer adds the Trusted Publisher for `pomwright` on npmjs.com
(repository `DyHex/POMWright`, workflow `publish.yaml`) before PR #60 is merged.

**Risk accepted**: the new publish flow cannot be tried before the merge; the release itself proves it. A
misconfiguration makes Publish fail loudly and is fixed on `main`; the release waits until then.

**Depends on / affects**: G-10 and G-5 (both edit `publish.yaml`; G-10's decision builds on this one); backlog issue 01
is closed once the release has published; issues 02 and 03 keep their `ignore` entries until they are done.

**Evidence (decision 1)**: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/R/walkthrough/` (PR states on 2026-10-26, the
changesets changelogs, `changelog-github` 1.0.1's source) and `…/G/github/` (`changesets/action` v1.9.0 and v2.1.2
sources and `action.yml`); TypeScript 7.0.2 in `…/F/ts-versions/node_modules/ts70`; `astro-mermaid` from the npm
registry; pnpm 12.14.0's changelog for trusted publishing.

## 2. PR #60 is held as a draft until the release is ready (2026-10-26)

**Settles**: *Act before the next merge* #2.

**Decided**:

- PR #60 (`fix/review-3-0-2` into `main`) is a draft. Done by the maintainer on 2026-10-26; the public API shows
  `draft: true` at `3960900`. A draft cannot be merged, so no release can start by accident; CI keeps running on it.
- Every fix decided in this walkthrough lands on this branch, in PR #60. A finding whose only fix is breaking becomes a
  GitHub issue instead (none so far).
- Gate for marking PR #60 ready (confirmed by the maintainer on 2026-10-26):
  1. F-5 and H-8 are decided.
  2. Every decided fix has landed with its tests and docs; `pnpm pack-test` is green on chromium, firefox and webkit,
     the Node 20 floor run is green, and the harness at the latest Playwright 1.x is green on all three browsers
     (`PLAYWRIGHT_VERSION=<latest> bash pack-test.sh`, manifests and lockfiles restored after; added by decision 8).
  3. Every pending changeset is re-read against the final code: `boxed-step-location.md` (E-1),
     `batch-navigation-message.md` (A-1), `export-storage-types.md` (F-1, F-5), the changesets that quote a message a fix
     changes (`sandboxed-document-message.md` for A-5, and `ended-registration-message.md` if B-5 changes its text), and
     a new changeset for every new consumer-facing fix.
  4. Decision 1's prerequisites: the Trusted Publisher is set up on npmjs.com, and every Mermaid diagram is checked by
     hand on the built site.
  5. AGENTS.md §7's pre-release packaging probes are re-run on the final tarball (scope F ran them at `54cdada`).
  6. *Act before the next merge* #3 to #5 are handled: the Publish logs (G-10), the merge rule after the release (G-5),
     and the review folder audited and removed (AGENTS.md §6 rule 7).

**Why**: merging now would release 29 changesets, three of which describe more than the code does (E-1, A-1, F-1/F-5),
and none of the fixes found by the review.

## 3. Provenance: Trusted Publishing, approval kept, a warning check (2026-10-26)

**Settles**: [G-10](G-ci-and-tooling/defect-G-10-no-provenance-on-3x-releases.md); *Act before the next merge* #3.

**Decided**:

- **The two Publish logs are not read.** The maintainer approved the 3.0.0 and 3.0.1 publishes on npmjs.com after their
  runs (manual 2FA approval). That explains why each version went live minutes after its run ended, and the attestation
  was most likely lost on that path.
- **The fix is Trusted Publishing** (decision 1): npm issues the credential from the workflow's OIDC token, and provenance
  comes from the same identity, so no `NPM_CONFIG_PROVENANCE` setting can be dropped on the way.
- **Manual 2FA approval on npmjs.com stays on** with Trusted Publishing (the maintainer's choice). Whether the
  attestation survives approval on the Trusted Publishing path is not yet known; the first release shows it.
- **A verification step after the changesets action**: when it published, poll each published version's attestation
  endpoint (`https://registry.npmjs.org/-/npm/v1/attestations/pomwright@<version>`) for a while, and **warn** (not fail)
  when there is none, naming the command to check it by hand. A warning, because the wait for the maintainer's approval
  can outlast any polling window.
- **After approving a release, the maintainer checks its attestation by hand** (the endpoint above, or
  `npm view pomwright@<version> dist --json` and its `attestations`).
- **A changeset note in this release** corrects the record: releases are published with Trusted Publishing and npm
  provenance, and 3.0.0 and 3.0.1 were published without an attestation although the 3.0.0 entry said otherwise
  (`CHANGELOG.md` itself cannot be edited, AGENTS.md §8).
- AGENTS.md §2 and §7 and the comments in `publish.yaml` are corrected with decision 1's docs work.

**Why**: the 3.0.0 changelog promises provenance and `npm audit signatures`; no 3.x version has an attestation (the
attestation endpoint answers 404 for both). Trusted Publishing removes the setting that could be lost; the check turns
the promise into something seen on every release.

**Depends on / affects**: decision 1 (the fix path); G-5 (also edits `publish.yaml`); gate 6 of decision 2 (met by this
decision).

## 4. A release skipped by the publish guard: a rule, a failing check, the truth in the docs (2026-10-26)

**Settles**: [G-5](G-ci-and-tooling/defect-G-5-release-skipped-when-main-moves.md) (reclassified from defect to
documentation: the false promise); *Act before the next merge* #4.

**The case**: you merge the Version Packages pull request (commit V, version bumped, changesets deleted); `CI` runs on V
for about five minutes; if a pull request with a changeset is merged in those minutes (commit W), Publish for V finds
`main` at W and stops, so nothing is uploaded, and Publish for W sees W's changeset and opens a new Version Packages pull
request instead of publishing. V's version is never published, although it has a changelog entry. The same holds for
changesets CLI 2 with `changesets/action` v1.9.0 and for CLI 3 with v2: both publish only when no changeset is pending,
and `changeset version` bumps from `package.json`.

**Decided**:

1. **The rule, in AGENTS.md §7**: after merging the Version Packages pull request, merge nothing with a changeset until
   that version is on npm (with manual 2FA approval, until it is approved there).
2. **A safety-net check in `publish.yaml`'s guard**: when the guard stops because `main` has moved on, the tested commit
   is a release commit (its `package.json` version differs from its first parent's) and that version is not on npm,
   fail the Publish run with an error naming the version and the commit and saying "revert `<commit>` before merging the
   next Version Packages pull request". Any other commit stops quietly, as today. (Refined 2026-10-27 at the maintainer's
   choice, option B: without the release-commit condition, an ordinary commit merged while a release waits for approval
   on npm, or after a skipped release, also has an unpublished version, and the check would fail it with an instruction
   to revert a commit that is not the release. A release commit that never gets a `CI` run, because GitHub drops its
   waiting run when a newer push arrives, has no Publish run to check; rule 1 covers it.)
3. **The false promise corrected** in the guard's message, AGENTS.md §2 and *Internal → Tests and checks* ("CI"): the
   newer commit's run continues the release, and publishes only when no changeset is pending.
4. **Recovery**: revert the release commit V. That restores its changesets, the previous version and the changelog, and
   the next Publish run updates the Version Packages pull request so that every pending changeset lands in that
   version. If the next Version Packages pull request has already been merged, the gap is accepted.

**Not adopted**: publishing the tested commit itself (G-5's second option). The revert recovers the case, and it would be
a second untried change to `publish.yaml` in the release that moves to `changesets/action` v2.

**Why**: the maintainer's process already avoids the window; the check makes a slip visible while the revert is still
easy, and the docs stop promising what the workflow does not do.

**Depends on / affects**: decisions 1 and 3 (same file, `publish.yaml`); gate 6 of decision 2 (met by this decision).

## 5. The review folder: working folder now, committed on this branch, removed before the merge (2026-10-26, revised 2026-10-27)

**Settles**: *Act before the next merge* #5 (AGENTS.md §6 rule 7).

**Decided**:

1. **History, as for 3.0.0 and 3.0.2**: `defect-review-result/` is committed on this branch now, with the walkthrough's
   decisions; `PLANS.md` is committed once written; the folder's files change in the commits of the fix work. After
   every fix has landed, been pushed and been verified, and after the audit, one commit removes the folder, so
   `git show <commit>:defect-review-result/…` can answer a later question (PR #60 merges with a merge commit, so the
   history is reachable from `main`) and PR #60's net diff is zero. (Revised 2026-10-27 at the maintainer's request:
   it was untracked until the audit, then added and removed in two commits.)
2. **`defect-review-result/` is the working folder of the implementation** (AGENTS.md §6), under this name. `PLANS.md`
   (the ordered plans and their status) is added when the implementation plan is written; `DECISIONS.md` is this file;
   the plans are files of their own, one per item or group of items worked on together (revised 2026-10-27, decision
   62: it was "each finding file is its item's plan").
3. **The review worktree `../POMWright-final-review` and the probes folder `../POMWright-final-review-probes/` stay until
   every fix has landed and been verified** (the finding files cite the probes for every reproduction), and are removed
   in the same audit step as the folder.
4. **The implementation plan states §6 rule 7 at the start**: no finding ID (`A-1` …), decision number or reference to
   this folder in code, tests, docs, changesets or AGENTS.md; reasons that must outlive the review go on the Internal
   pages, work left for later into GitHub issues.

**Why**: AGENTS.md §6 rule 7 (nothing of the folder is kept in the repository); the history copy follows the 3.0.0
and 3.0.2 practice (`2f06702`, `09082b1`).

**Depends on / affects**: gate 6 of decision 2 (met by this decision for the folder; the audit itself runs last).

## 6. The release is 3.0.2: documented-but-missing exports are patches (2026-10-26)

**Settles**: [F-5](F-packaging-types-changesets/defect-F-5-storage-option-types-bump.md) (design question); gate 1 of
decision 2 (with H-8).

**Decided**:

- **Every pending changeset stays `patch`, and the release is 3.0.2.** Exporting `AllEntries`, `Decoded`, `SeedOptions`
  and `SessionStorageOptions` brings the package in line with what the 3.0.1 docs already promised:
  - `api/types.md`: "The types a project names when its own code holds what POMWright hands out or forwards its
    options. Every type is imported from `pomwright` with `import type`."
  - `docs/typescript.md`: "Every type is imported from `pomwright`."
  - `docs/installation.md`: "POMWright's types are [nameable], except in one pattern".
  That is §7's first rule ("behaviour brought in line with what the docs … already promise is a patch").
- **AGENTS.md §7 says so explicitly.** Its bump rule cites the API reference's promise next to §5's return-type promise,
  and adds: providing what a released version's docs or doc comments promise but the package lacks is a patch, unless
  it breaks code written against those docs (a major); utility types that only shape parameters (`EntriesFor`,
  `NonEmpty`, `KeyOnly`, `GotoTarget`) are outside the promise. §5 is unchanged.
- **`.changeset/export-storage-types.md`** keeps `patch`; its "as every other public signature already allows" (untrue:
  F-1, and the parameter types above) is replaced by the promise it fulfils.

**Why**: the maintainer's reading, confirmed against the 3.0.1 site: the types were part of the documented API; the
names were in the published declarations but could not be imported. 3.0.0 and 3.0.1 are recent, and nothing new
becomes possible.

- **Every exported type is listed in the docs.** On this branch the four already have their sections on
  `api/class-sessionstorage.md` and rows in `api/index.md` (`7447754`), and AGENTS.md §1 lists them; the table under
  *The types* in `docs/typescript.md` does not (F-4, decided with its own item). F-1's and F-2's new types get the same
  three places.

**Depends on / affects**: F-1 (`StepDecoratorFactory`) and F-2 (the factory type) are patches under the same promise;
H-8 ("Added in" markers) is decided next; the §7 wording is part of the implementation's AGENTS.md edits.

## 7. "Added in" markers mark new names, whatever their bump (2026-10-26)

**Settles**: [H-8](H-docs-readme-agents/defect-H-8-no-added-in-markers-for-3-0-2-exports.md) (design question); gate 1
of decision 2 (with decision 6, now met).

**Decided**:

1. **A new export, member or option carries an "Added in" marker, whatever its bump.** A fix that makes an
   already-documented form work (for example `update()`'s `undefined` first argument, `db26390`, or this release's type
   fixes) carries none; the changelog says so.
2. **The form**: playwright.dev's `Added in: v3.0.2`, a line directly under the item's heading on its API page only; the
   `api/index.md` rows link there. In this release: `## AllEntries`, `## Decoded`, `## SeedOptions` and
   `## SessionStorageOptions` on `api/class-sessionstorage.md`, and F-1's and F-2's new types if they are adopted.
3. **AGENTS.md §9 reads**: "No "Added in" markers on 3.0.0 pages. From the first 3.x addition on, a new export, member
   or option carries one (`Added in: v3.x.y` under its heading), whatever its bump. A fix that makes an
   already-documented form work carries none; the changelog says so."

**Why**: the site deploys from `main`, so users of every 3.x version read the same pages; a 3.0.1 user importing
`SeedOptions` gets "has no exported member" with nothing on the page saying it needs 3.0.2. Marking new *names* is the
clear line: exactly what a reader looks up and imports. Marking every newly accepted form would put a marker on most of
this release's type fixes.

**Depends on / affects**: decision 6 (the version, v3.0.2); F-1 and F-2 (new names); F-4 (the TypeScript guide's table,
no markers there).

## 8. What nobody ran: two additions, the rest accepted (2026-10-26)

**Settles**: report.md Summary, §1 Baseline, §2 Inventory, §3 coverage and §10 *What is sound* (acknowledged as they
are); test gap #3's actionlint part (with G-3 and G-10); [R-3](report.md#r-3-inventorymd-counts-31-pending-changesets).

**Decided**:

1. The sections are acknowledged as they are; nothing in them needs a change.
2. **Gate 2 of decision 2 also requires the harness at the latest Playwright 1.x on chromium, firefox and webkit, run
   locally** before PR #60 is marked ready (pull requests run chromium only; `CI` on `main` would find a firefox or
   webkit failure only after the merge, leaving `main` red and Publish blocked).
3. **Node 22: no action.** Node 20 (the floor job) and 24 bracket it, and the one Node-specific URL difference (`^`)
   behaves the same on 20 and 22.
4. **actionlint in CI's `lint` job**, pinned like every other tool, so a workflow change (this release rewrites
   `publish.yaml`, decisions 1, 3 and 4) is syntax- and expression-checked on the pull request. Scope G ran actionlint
   1.7.12 clean on all five workflows.
5. **R-3 is closed with no action**: it concerns the review's own inventory, which is removed with the folder
   (decision 5).
6. The GitHub workflows themselves and a real publish stay untried before the merge (accepted in decision 1).

## 9. Session storage calls check the origin before and after every call (2026-10-26)

**Settles**: [A-1](A-session-storage/defect-A-1-batch-lands-on-other-origin.md) (Medium); test gap #2.

**Decided**:

1. **Option 1**: every storage call of every helper (with or without `origin`) checks the page's origin before and
   after it, and fails with the navigation message when the origin moved, whether or not the call threw. It covers
   batches (`set`, `clear(keys)`, an on-origin `seed`), single calls (a one-key `set`, `get`, `clear()`) and the parallel
   reads of `get(keys)` (a read that came from the new origin fails instead of returning its values). Option 2 (a
   guarded evaluation in the page) is rejected: it leaves `page.sessionStorage`, which the helper mirrors, and runs in
   the page's main world.
2. **The message names the keys done and the key in flight**, which may have reached the new document; the final wording
   is set in the plan, after R-4 (punctuation).
3. **A single call is detected, not prevented**: a call in flight when the page leaves may act on the new document; it
   then fails, saying so, and the docs state it.
4. **Tests** (closing test gap #2): a harness spec on chromium, firefox and webkit that forces the commit between two
   calls (wrapping `page.sessionStorage`'s methods, as the probe does) for `set`, `clear(keys)`, `clear()`, `get(keys)`
   and an on-origin `seed`, reading the other origin's live storage afterwards; the existing spec
   (`sessionStorage.spec.ts:78-102`) asserts the other origin's live storage instead of its render-time snapshot; a
   unit test with a fake page whose URL changes between two calls that both resolve.
5. **The pending `.changeset/batch-navigation-message.md` is amended** (its "now fails" claim and its quoted message)
   rather than followed by a new changeset, so the 3.0.2 changelog describes the final behaviour once.
6. **Docs**: *Session storage* (*The methods*), `api/class-sessionstorage.md` (`set`, `clear`, `get`, `seed`),
   `api/errors.md` (*Session storage*), and the `@throws` of each method.

**Performance** (the maintainer's question): the check costs no round trip. `page.url()` reads a field that
Playwright's client keeps current from the "navigated" event (playwright-core 1.64.0 `coreBundle.js:61819-61820`); each
key still costs one round trip (`page.sessionStorage.setItem`), as today; `seed` away from the origin writes from the
init script in one go and is untouched. Option 2 per key would cost the same; only a bulk evaluation would be faster,
and that is a separate design question (it leaves `page.sessionStorage`).

**Why**: the helper silently wrote into, or removed from, another origin's storage on all three browsers, against
AGENTS.md §5, the docs, the API page, `errors.md` and a pending changeset.

**Depends on / affects**: before A-5 (a neighbouring message in the same code path); A-2 and A-3 (origin checks in the
same file); B-7 (the storage error lists); R-2 and R-4 (message wording); gate 3 of decision 2 (the changeset).

## 10. The `log` fixture validates `locale` and `timezoneId` at setup (2026-10-26)

**Settles**: [E-2](E-logging-step-fixture/defect-E-2-locale-playwright-accepts-fails-log-fixture.md) (Medium); test
gap #4.

**Decided** (option 4, from the walkthrough; options 1 and 2, normalising or falling back, are dropped):

1. **The `log` fixture checks `locale` and `timezoneId` when it is set up**, with Node's `Intl`
   (`new Intl.DateTimeFormat(locale, { timeZone })`). `""` and `undefined` mean no locale, as for Playwright, and use the
   default.
2. **An invalid value fails the test at once**, with a message naming the option and the value, and a hint to write it
   with hyphens when it contains `_`. For example `log fixture: locale "en_US" is not a BCP 47 language tag; write it
   with hyphens, such as "en-US"` and `log fixture: timezoneId "Invalid/Zone" is not a time zone Node's Intl knows`;
   the final wording in the plan, after R-4.
3. **`attachLogsToTest` called directly** checks the same and gives the same message instead of the raw `RangeError`.
4. **No list of locales is kept**: Node's `Intl` is the validator.
5. **Tests** (closing test gap #4): unit tests for well-formed, `""`, underscore, malformed and invalid time zone values;
   a harness spec where `locale: "en_US"` with `log` fails at setup with the message, and `""` and `EN-us` pass.
6. **Docs**: *Names in your locale* (`docs/logging.md`: the value is a BCP 47 tag), the two messages on `api/errors.md`,
   `attachLogsToTest`'s doc comment and API **Throws**.
7. **Changeset**, patch: the `log` fixture checks Playwright's `locale` and `timezoneId` when a test starts and fails with
   a message naming the value, instead of a `RangeError` at teardown once something was logged.

**Why**: Playwright neither validates nor normalises `locale`; it passes the string to the browser
(`playwright/lib/index.js:321-322`). Probed on all three browsers
(`/home/magdys/workspace/dyhex/POMWright-final-review-probes/R/walkthrough/locale/locales.out`): underscore forms work in
Chromium only (its ICU); Firefox formats `en_US` and `nb_NO` as en-GB, WebKit `nb_NO` as en-US; Chromium fails `newPage`
on `"en US"`, `"enUS"` and `"garbage!!"`, which Firefox and WebKit ignore. Node's `Intl` accepts exactly the well-formed
BCP 47 tags, which work everywhere. A value outside them is the user's mistake, so POMWright reports it clearly and
early (AGENTS.md §5, validate at the boundary) instead of guessing; today it fails late, only when something was
logged, sometimes only on a retry. Only tests that request `log` are affected (it is not an auto fixture).

**Trade-off accepted**: a test that requests `log`, never logs, and has `locale: "en_US"` passes today and fails after
the fix.

**Depends on / affects**: before E-4's code option, if chosen (it also edits `attachLogsToTest`); R-4 (wording).

## 11. `@step` types take the method's own type, so generic methods compile (2026-10-26)

**Settles**: [E-5](E-logging-step-fixture/defect-E-5-step-rejects-generic-async-methods.md) (Medium); test gap #5's
`@step` part.

**Decided**:

1. **Option 1**: the decorator's types take the method's own type as the type parameter,
   `M extends (this: This, ...args: any) => Promise<unknown>` (constrained the way TypeScript's
   `ClassMethodDecoratorContext` constrains a method), and return `M` unchanged, in the standard and the
   `experimentalDecorators` overloads and in `StepDecoratorFactory`; the message overloads stay. The `any` sits behind a
   `// biome-ignore` whose one-line reason is that `ClassMethodDecoratorContext` uses `any` there, as an `unknown[]`
   parameter list rejects methods with typed parameters. The implementation signature is unchanged.
2. **Tests**: a generic method in `src/helpers/stepDecorator.test-d.ts`, with `expectTypeOf` that a call keeps its type
   argument; the same under `experimentalDecorators` in `test/tests/packaging/stepLegacyDecorators.typecheck.ts`;
   `publicTypes.typecheck.ts` and `publicTypes.emit.ts` where they cover `step`'s signature.
3. **Docs**: a generic method in the `docs/test-steps.md` example, so the snippet check keeps it compiling.
4. **Changeset**, patch: `@step` compiles on generic `async` methods, with standard decorators and with
   `experimentalDecorators`; before, TypeScript refused them, and under `experimentalDecorators` asked to make the
   already `async` method `async`.

**Why**: the docs promise `@step` on every method that returns a Promise; a generic page-object method was refused in
both modes (also in 2.1.0 and 3.0.1), with a misleading hint in legacy mode. Scope E's sketch compiles the generic
methods in both modes, keeps every rejection (getter, setter, field, `PromiseLike`, `Promise | number`, non-Promise
methods) with the readable message, and passes the repository's own type tests.

**Depends on / affects**: before F-1, which exports `StepDecoratorFactory` (its type is final first); independent of
E-1.

## 12. Boxed steps pass an explicit `location`, so nesting does not move them into the bundle (2026-10-26)

**Settles**: [E-1](E-logging-step-fixture/defect-E-1-boxed-step-inside-boxed-step-located-in-bundle.md) (Medium; for
`@step` a regression of `333a928`); test gap #1.

**Decided**:

1. **Option 1**: the boxed `@step` wrapper keeps being `async` (it gives a top-level boxed error its stack) and also
   passes `test.step` a `location`: the caller's frame, found by cutting the stack at POMWright's own wrapper
   (`Error.captureStackTrace(holder, wrapper)`, a boundary, never a file name, AGENTS.md §5), unless the caller passed
   `options.location`. With a `location`, Playwright uses it whatever the ancestor steps are, and errors keep its
   boxed-error rule (the outermost boxed call site). The parse accepts `file://` URLs and skips frames without a file.
2. **The navigation and session storage helpers get the same `location` in the same change**, through one
   `callerLocation(boundary)` in `src/helpers/callSite.ts`; done together with D-4's code option if it is chosen (both
   change how a call site is captured).
3. **A boxed method whose Promise a helper returns without `await`** now reports the helper's line where Playwright
   reports none; accepted, and noted on *Internal → Call sites*.
4. **Test gap #1**: `test/step-locations/stepLocations.spec.ts` gains a boxed `@step` calling a boxed `@step`, a boxed
   `@step` calling `navigation.goto()` and `sessionStorage.set()`, both inside a test's own boxed `test.step`, and an
   error in a nested boxed step (keeps the outer call site), each marked `// LOCATION <id>`; the location reporter fails
   when a marker is never checked (today a probe that stops reporting stays green); a unit test of `callerLocation`.
5. **The pending `.changeset/boxed-step-location.md` is amended** to cover nested boxed steps and the two helpers,
   rather than a new changeset.
6. **Docs**: *Internal → Call sites* (*Steps at the test's line*: the one-frame rule holds only without a boxed ancestor,
   and the `location`; *Alternatives weighed*: the "computed location" entry rewritten, its premise disproved); AGENTS.md
   §5's `@step` bullet.

**Why**: Playwright's `_addStep` drops a step's first frame only when no ancestor step is boxed, so one fixed POMWright
frame cannot be right both at the top level and inside a boxed step. Scope E's sketch puts every nested step at its
calling line, keeps error locations, and passes the step-location check.

**Depends on / affects**: D-4 (one change to `callSite.ts`); E-3 (the meaning of `box` on `api/step.md`, after this);
A-1, A-5, D-1, D-3 (other edits to the helpers' files, ordered in the plan); gate 3 of decision 2 (the changeset).

## 13. A page-wide barrier for storage calls on a page without a URL origin (2026-10-26)

**Settles**: [A-2](A-session-storage/defect-A-2-about-blank-popup-two-chains.md) (Low).

**Decided**:

1. **Option 3**: a `SessionStorage` call (from any helper, `seed` included once A-3 makes it write at once) on a page
   whose URL has no origin, such as an `about:blank` popup that inherited one, takes its turn after every earlier call on
   that page, whatever their origin, and every later call on the page waits for it. Pages with a URL origin keep their
   per-origin chains, so seeds for several origins still register side by side. The inherited origin, which cannot be
   read synchronously, never decides a chain. `takeTurn` (`src/helpers/storageTurns.ts`) gains the page-wide key;
   `inTurn` (`src/helpers/sessionStorage.ts`) and the seed registry pass it when `originOf(page.url())` is `undefined`.
2. **Tests**: a harness spec on chromium, firefox and webkit (two overlapping `set` calls on such a popup from a bound
   and an unbound helper end with the later value); unit tests in `src/helpers/storageTurns.test.ts` for the barrier.
3. **Docs**: one sentence on pages without a URL origin in *Internal → The seed registry* (*Overlapping calls*) and in
   `storageTurns.ts`'s module comment.
4. **Changeset**, patch: overlapping session storage calls on an `about:blank` page that inherited an origin, from a page
   object's helper and a standalone one, act in the order they were made.

**Why**: the documented order across helpers broke on such a page, deterministically on all three browsers, because
the bound helper queued on the origin's chain and the unbound one on `""`. Option 1 (key by the page's URL origin) would
leave `seed` on a different chain once A-3 is fixed; option 2 (one chain per page) would make calls for different
origins wait for each other, against *Seeding session storage*.

**Depends on / affects**: before A-3 (which relies on it); A-1 (the before/after origin check in the same code must
compare like with like for a call that starts on `about:blank`, a detail for the plan); A-5 (same file).

## 14. `seed` writes at once on a page whose document inherited the origin (2026-10-26)

**Settles**: [A-3](A-session-storage/defect-A-3-seed-on-inherited-origin-popup.md) (Low). Reverses the decision in
`d4cffbb`'s commit message ("seed is not taught about inherited origins").

**Decided**:

1. **Option 1**: when the page has no URL origin (an `about:blank` popup), `seed` asks the document for its origin in its
   turn, as `set` does (`assertInheritedOrigin`), and writes at once when it is the seeded origin; otherwise it
   registers as today. The commit watch still runs from the call.
2. **The "return" message** (`notAppliedError`) stops presuming a failed navigation: it names the general cause (the
   arriving document's previous one was already on the origin), with a failed navigation as one example. Wording in the
   plan, after R-4.
3. **Tests**: the `test.fail` at `test/tests/testApp/sessionStorage.spec.ts:55-65` becomes a pass on chromium, firefox
   and webkit; a spec of `seed` then `set` on such a popup, asserting the app starts with `set`; a unit test with a fake
   `about:blank` page whose document reports the seeded origin.
4. **Docs**: *Seeding session storage* (*How it works*: "on the origin" includes a document that inherited it), *Internal
   → The seed registry*, `api/class-sessionstorage.md` (`seed()`), `api/errors.md` (*seed*) for the message, and
   AGENTS.md §5's sentence on when `seed` writes at once.
5. **Changeset**, patch: `seed` on a popup at `about:blank` that inherited the seeded origin writes at once, as `set` does
   there; a later `set` is no longer overwritten when the popup navigates to the origin, and Firefox no longer fails the
   test.

**Result, with decision 13**: every call for one origin acts in the order it was made in every page state where it can
act at once; the one deliberate exception is a `seed` made away from the origin, which applies on arrival, before the
app's first script, and no `set` for that origin can come in between, since `set` cannot reach the origin until the
page is there.

**Why**: `d4cffbb` made such a popup count as on the origin for `set`, `get` and `clear`, but not for `seed`, which
registered: on Chromium and WebKit the earlier `seed` overwrote a later `set` at the arrival, and on Firefox the test
failed with a message about a failed navigation that never happened. The docs say `seed` writes at once on the origin.

**Depends on / affects**: after decision 13 (A-2's barrier, which puts `seed` and `set` on that page in one queue); A-1
(the write at once goes through the same per-key loop and its origin checks); R-4 (message wording).

## 15. `readFields` reads own non-enumerable properties too (2026-10-26)

**Settles**: [B-1](B-registration-and-resolution/defect-B-1-own-non-enumerable-option-dropped.md) (Low), merged with
[C-5](C-queries/defect-C-5-own-non-enumerable-option-dropped.md).

**Decided**:

1. **Option 1**: `readFields` (`src/locators/utils.ts`) reads the object's own names with `Object.getOwnPropertyNames`
   and each value by property access, as its prototype walk already does; the fast path stays for a plain object whose
   own properties are all enumerable. Every copy that goes through it follows: `add`'s options, filters, seeds, seeded
   overrides, and a query's `update`, `replace` and `filter`.
2. **Tests**: unit tests in `src/locators/utils.test.ts` beside `9dc8048`'s (an own non-enumerable value and an own
   non-enumerable getter, through `copyFields` and `mergeOptions`); DOM assertions against the packed package for `add`
   (`test/tests/locatorRegistry/add/add.get.clone.spec.ts`) and for a query's `update` (closing C's gap that those paths
   are tested against source only); chromium.
3. **Docs**: the `readFields` doc comment ("own properties"); *Registering locators* may say "every property Playwright
   reads". AGENTS.md §5 already says "own properties".
4. **The pending `.changeset/options-read-like-playwright.md` is amended** to include own non-enumerable properties,
   rather than a new changeset.

**Why**: the copy dropped an own property that is not enumerable (as `Object.defineProperty` makes one), which
Playwright reads by property access, so the registered locator matched more than Playwright's own call with the same
object; a gap in `9dc8048`'s own promise. Scope B's sketch fixes every path with the existing tests green.

**Depends on / affects**: nothing in order; gate 3 of decision 2 (the changeset).

## 16. A Promise from `defineLocators()` fails the page object with a labelled error (2026-10-26)

**Settles**: [D-5](D-page-objects-urls-navigation/defect-D-5-async-definelocators.md) (Low); test gap #11's D-5 part.

**Decided**:

1. **Option 1**: `#defineLocatorsOnce` (`src/pageObject.ts`) checks what `defineLocators()` returned before `verify()`; a
   value with a `then` function fails the page object as any definition error does (labelled, the original as `cause`
   where there is one, kept, thrown by the scheduled check or the first locator call). The returned Promise gets a no-op
   `catch`, so its own rejection does not surface a second, unlabelled error.
2. **The message**: `<label>: defineLocators() must register its locators synchronously; it returned a Promise. Read
   what it needs in the constructor or a fixture, and pass it in.` Final wording in the plan, after R-4.
3. **Tests**: `src/pageObject.test.ts` (an `async` definition fails the check with the labelled message, the error is
   kept, no unhandled rejection); a harness case in `test/tests/pageObject/lifecycle.spec.ts` built in a fixture.
4. **Docs**: *Page objects* (*When `defineLocators()` runs*: it is synchronous), `api/class-pageobject.md`
   (`defineLocators()` **Throws**), `api/errors.md` (*Page objects → Locators*), *Internal → Page object lifecycle*.
5. **Changeset**, patch, with a migration hint: a page object whose `defineLocators()` returns a Promise fails with a
   labelled error saying it must register synchronously; before, it was verified before the rest of its definition
   ran. Move awaited work into the fixture and pass the result to the constructor.

**Rejected**: a return type of `undefined` (the docs write `protected defineLocators(): void {` 45 times; changing it
would stop documented code compiling, a major); awaiting the definition (an asynchronous lifecycle, against "builders
are synchronous").

**Why**: TypeScript accepts a Promise-returning override of a `void` method, and the page object ignored the Promise:
an error after the first `await` escaped unlabelled and unkept, leaving a half-registered page object usable, and
`verify()` reported paths registered a moment later as missing. No registry method is asynchronous or takes a Promise
(checked in `src/locators/`; AGENTS.md §5), so the only code the check rejects marks the method `async` by mistake, and
the fix is to remove that word.

**Depends on / affects**: H-7 (*Principles*: one exception fewer to name); D-4 and E-1 (the same files, one pass).

## 17. A string `fullUrl` writes `^` as `%5E`; `|` is documented; the sweep's sentences corrected (2026-10-26)

**Settles**: [D-2](D-page-objects-urls-navigation/defect-D-2-fullurl-not-browser-form.md) (Low) and
[H-4](H-docs-readme-agents/defect-H-4-agents-urlforms-one-known-difference.md) (Low, documentation); test gap #11's D-2
part.

**Decided**:

1. **Option 1**: a string `fullUrl` writes `^` as `%5E` in its path part (the rewrite the matcher's `comparable`
   already applies, path only), so it is the same on every Node version from 20 and matches every browser. The `|`
   exception is documented: Chromium reports `%7C`, Firefox and WebKit `|`, so for a path with `|` the docs point to
   `expectThisPage()`, which matches on every browser.
2. **Docs**: the `fullUrl` sections of *URLs and navigation*, `api/class-pageobject.md` and *Internal → URL matching*;
   a string `fullUrl` is exact in `toHaveURL` but a glob in `page.waitForURL` and `page.route` (Playwright's reading of a
   string); the `waitForPage` example on *Upgrading from 2.x* uses `toHaveURL`, or takes a `UrlMatcher` only.
3. **Tests**: `src/helpers/url.test.ts` asserts `%5E` in a `^` path's `fullUrl` (as a string, since the unit tests run
   on Node 24 locally); `test/tests/testApp/urlForms.spec.ts` asserts `toHaveURL(fullUrl)` for `^` on every browser and
   for `|` on Firefox and WebKit (Chromium's `|` listed as the known difference); CI's Node 20 job runs it there.
4. **The pending `.changeset/caret-in-url-path.md` is amended** to say `fullUrl` writes `^` as `%5E` too, rather than a new
   changeset; `pipe-in-url-path.md` is unchanged (its claim is about the matcher).
5. **H-4**: AGENTS.md §4 ("with the known differences listed: Chromium's `|` in a path, and, on Node 20 and 22, whose
   `new URL` keeps a `^`, every browser's `%5E`", and the sweep skips `# ? / % \`), *Internal → Tests and checks* ("with
   the known differences listed") and *Internal → URL matching* ("except in the path:" instead of "but one:").

**Rejected**: making a string page's `fullUrl` a `UrlMatcher` (code using it as a string stops compiling, a major); a
browser-dependent `fullUrl` (a page object cannot learn its browser reliably: `browserName` is a fixture,
`test.info().project.use.browserName` is usually unset with `devices[...]`, `page.context().browser()` is `null` for a
persistent context; and `fullUrl` would differ between test projects).

**Why**: the docs promise `fullUrl` is "the form the browser reports" and show `toHaveURL(fullUrl)`; that failed for `^`
on Node 20 and 22 (every browser) and for `|` on Chromium. The WHATWG URL Standard (updated 19 October 2026) puts U+005E
in the path percent-encode set and not in the query set, and does not percent-encode `|`: browsers report `%5E` in a
path; Node 24's parser follows the standard, Node 20 and 22's predates it; Chromium departs from the standard for `|`.
Checked: Node 20.20.2, 22.18.0 and 24.22.0; browsers of Playwright 1.64.0 (all three) and 1.64.1 (chromium); later
versions are covered by CI's latest-1.x harness and the sweep spec.

**Depends on / affects**: independent of D-1; H-5 (the other AGENTS.md §4 edit).

## 18. Storage values are typed per key member: literals exactly, patterns by what they can match, brands widely (2026-10-26)

**Settles**: [A-4](A-session-storage/defect-A-4-non-literal-key-types.md) (Low); test gap #5's storage key part.

**Decided**:

1. **Option 3** (added in the walkthrough): `Decoded<S, K>` is computed per member of `K` (a distributive conditional
   type):
   - a literal gets its codec's type, or `string` when it is not declared (unchanged);
   - `string` and a branded string (`K extends object`, as `string & {…}` is) get `string` or any declared codec's type;
   - a pattern (a template literal type, `Uppercase<string>` …) gets `string` or the codecs of the declared keys it can
     match (`Extract<keyof S, K>`).
   `KeyOnly`, `EntriesFor`, the `get` overloads and `AllEntries` keep today's types for literals, unions of literals,
   `string` and `get()`.
2. **Tests**: an `expectTypeOf` case in `src/helpers/sessionStorage.test.ts` for each key kind (literal, undeclared
   literal, union of literals, `string`, a matching pattern such as `` `u${string}` ``, a namespaced pattern such as
   `` `form:${string}` ``, a branded string, `"cart" | `u${string}``, `Uppercase<string>`); a line in
   `test/tests/packaging/publicTypes.typecheck.ts` against the published declarations.
3. **Docs**: `api/class-sessionstorage.md` (*Decoded*, `get()` *Returns*), *Session storage* (*Codecs for structured
   values*) and `Decoded`'s doc comment: "a key whose type is not a literal: `string`, a branded string, or a pattern,
   which may be any declared key it matches".
4. **The pending `.changeset/storage-string-key-types.md` is amended** to cover these key types, with the migration:
   code that used such a value as a string stops compiling only where the key can match a declared key; narrow it, or
   pass the literal key.

**Why**: `64cd0b7` widened only a key typed `string`, for the reason that it "may be any key"; a pattern or a branded
key may be too, and was typed `string` where the runtime returns a decoded object. Compared with TypeScript 6.0.3
(`/home/magdys/workspace/dyhex/POMWright-final-review-probes/R/walkthrough/a4/`): option 3 is right for every key kind;
the finding's option 1 is over-wide for namespaced patterns (forcing needless narrowing) and, not distributive, missed
a union of a literal and a pattern; option 2 leaves branded keys typed `string`. The extra branch is internal: users pay
nothing for it.

**Depends on / affects**: nothing in order; A-7 is a separate type question; gate 3 of decision 2 (the changeset).

## 19. `NavigationFor` declares `goto` as a property, so a RegExp page's helper is no longer a string page's (2026-10-26)

**Settles**: [D-1](D-page-objects-urls-navigation/defect-D-1-navigationfor-accepts-regexp-helper.md) (Low); test
gap #5's `NavigationFor` part.

**Decided**:

1. **Option 1**: `goto` in `NavigationFor` (`src/helpers/navigation.ts`) is a property of function type, so
   `strictFunctionTypes` checks it strictly, and the `goto()` form without a target is added as an intersection only
   when `FullUrl` is a string (the conditional outside the base object type, as scope D's `sketch2.ts`). A RegExp-base or
   RegExp-path page's `navigation` is then rejected as `NavigationFor<string, string>`; calls on a page object's own
   `navigation` type-check exactly as today.
2. **A string page's `navigation` stays assignable to `NavigationFor<RegExp, UrlMatcher>`**, the type the docs teach for
   a function that takes any page object's helper.
3. **Tests**: `test/tests/packaging/publicTypes.typecheck.ts`, `@ts-expect-error` on assigning a RegExp-base and a
   RegExp-path page's `navigation` to `NavigationFor<string, string>`, and the positive assignment of a string page's to
   `NavigationFor<RegExp, UrlMatcher>`; `publicTypes.emit.ts` if the emitted declaration changes.
4. **Docs**: `api/class-navigation.md` says at the top that `PageObject.navigation` is typed `NavigationFor<BaseUrl,
   FullUrl>` (the type of `baseUrl`, then of `fullUrl`), with the three page kinds and their helper types (string and
   string: `NavigationFor<string, string>`; string base, RegExp path: `NavigationFor<string, UrlMatcher>`; RegExp base:
   `NavigationFor<RegExp, UrlMatcher>`), and which parameter type takes which helpers; `NavigationFor`'s doc comment;
   `### goto()` stays findable by `check-api-coverage.mjs` (with B-7's edits to the page).
5. **Changeset**, patch, with the migration: a RegExp page object's `navigation` is no longer accepted as
   `NavigationFor<string, string>`, so `goto()` without a target is a compile error there too, as the docs say; a
   function that takes any page object's helper types its parameter `NavigationFor<RegExp, UrlMatcher>`.

**Also at implementation**: type-check the two external consumer projects against the fixed build. Neither references
`NavigationFor` or passes or stores a page object's `navigation` (searched on 2026-10-26; one has three RegExp-path
pages, which use their own `navigation`, already typed correctly).

**Why**: TypeScript compares method parameters bivariantly, so a RegExp page's single `goto(target: AbsoluteUrl)`
satisfied a string page's two overloads, and the documented compile error for `goto()` on such a page was lost through
the documented parameter type, with a runtime throw instead. `NavigationFor` stays public: it is the type of the public
`navigation` property (nameable for `declaration: true` and for functions that take a helper), and removing it would be
a major.

**Depends on / affects**: B-7 and D-3 (`api/class-navigation.md`); E-1 (`navigation.ts`, order in the plan).

## 20. Sub-path types per member of the path union; `createRegistryWithAccessors` requires its paths; sub-paths in a generic base (2026-10-26)

**Settles**: [C-1](C-queries/defect-C-1-sub-paths-never-on-wide-paths.md), raised from Low to Medium in the walkthrough
for the generic-base part (a regression since 2.0.0); test gap #5's sub-path part.

**Decided**:

1. **Sub-path types, per member of `Paths`** (`LocatorChainPaths`, so `SkippablePaths`, in `src/locators/types.ts`),
   for `update`, `replace`, `filter`, `nth`, `clearSteps`, `skip` and `unskip`:
   - a literal member is admitted when it is one of the query's segments, exactly as today, so a namespace that is not a
     declared path is never accepted or suggested;
   - a template-literal member admits the query's segments that match it, the query's own path and template ancestors
     included;
   - a `string` member admits any string: nothing is suggested, and the runtime checks the sub-path;
   - `skip` and `unskip` still exclude the query's own path (on `<string>`, the runtime does). Nothing that compiles
     today stops compiling.
2. **`createRegistryWithAccessors` requires `<Paths>` or `<string>`**: its type parameter defaults to a message type,
   and `LocatorSchemaPathArgument` passes that message through, so an untyped registry's first path argument fails with
   `Argument of type '"main"' is not assignable to parameter of type '"createRegistryWithAccessors needs its paths as a
   type argument: createRegistryWithAccessors<Paths>(page)"'`. Generic wrappers that pass their own type parameter keep
   compiling. `PageObject` already requires its type argument (TS2707); no change there.
3. **`<string>` is supported and advised against**: it bypasses every compile-time check POMWright provides
   (suggestions, the path format, undeclared paths, sub-paths); the runtime checks them all. Its two use cases: paths
   known only at run time (locators loaded from JSON), and an incremental migration from untyped code (such as 2.x).
   No full rejection of `<string>`, and no separate item: a constraint that rejects it breaks generic bases that add
   paths (`…-probes/R/walkthrough/c1/constraint.ts`).
4. **Tests**: every row of the variation table in `test/tests/packaging/publicTypes.typecheck.ts` (`@ts-expect-error`
   on the error rows: a namespace rejected, template members, finite template unions with the loop, `<string>` sub-paths
   compiling, an untyped `createRegistryWithAccessors` failing at its first path); the generic-base cases of decision 7,
   both those that compile and those still rejected; a generic wrapper; a vitest `expectTypeOf` for the per-member type;
   the runtime errors on a `<string>` registry; at implementation, the external consumer projects type-check.
5. **Docs**:
   - *Locator paths*, a new section *Paths with a dynamic part*: paths listed in full first, as the recommendation;
     then finite template unions (`` `main.button@${Button}` `` with `Button` from a `const` array, the loop in
     `defineLocators()`, a method over the union); a `:::note` on the trade-off (a full path, as an error message or the
     report shows it, is not found by text search or rename where it is composed; a search for the prefix still works,
     and changing an id in the array updates every composed use; we recommend listing paths in full unless the use case
     is good and the pros and cons are weighed); one sentence on `${string}` members (the same search cost, only the
     prefix suggested, any id compiles, an unregistered id fails at run time).
   - The path type advice: a union of literal paths; `<string>` advised against, with what it bypasses, what the
     runtime still checks and its two use cases; `PageObject` and `createRegistryWithAccessors` require `<Paths>` or
     `<string>`.
   - *Queries*, *Sub-paths*: template members, and `<string>` sub-paths checked at run time.
   - The API page of `createRegistryWithAccessors`: the type argument is required, with its compile error.
   - `api/types.md`'s wide-string sentence, aligned with the advice.
   - `locator-paths.md:208` and `locator-modules.md:328` get `<Paths>`.
   - *Locator modules*, *Locators every page shares, in a base class*: the `ShopPage` example gets a method that uses a
     query with a sub-path on the common locators, so the snippet check keeps it compiling.
6. **Changesets**, two patches:
   - "A query's sub-path arguments accept template-literal members of the path union (the query's own path and
     template ancestors), compile on a registry typed `<string>`, where the runtime checks them, and compile again in a
     generic base class on the paths it adds: this worked in 1.x and broke in 2.0.0, and is now restored." (decisions
     1 and 7)
   - "`createRegistryWithAccessors` requires its paths as a type argument." Migration: pass `<Paths>`, or `<string>` to
     keep paths unchecked.
7. **Sub-paths in a generic base that adds paths** (`ShopPage<Paths> extends PageObject<Paths | CommonPaths>`), fixed
   in this branch: `RegistryPath` applies its path check per member of the union (distributive), and `getLocatorSchema`
   (method and `GetLocatorSchemaAccessor`) types the query's path as `Path & RegistryPath<…>` instead of
   `Extract<Path, RegistryPath<…>>`. In a base method, a sub-path on the common paths then compiles (`filter`, `nth`,
   `skip`, `clearSteps` on an ancestor, the query's own path named), while a path outside the chain, a namespace, a
   descendant and skipping the query's own path stay errors; the page's own paths stay unknown in the base. Probed:
   `…-probes/R/walkthrough/c1/base.ts` (`base.today.out`, `base.after.out` for decisions 1–6 alone, `base.fix.out`),
   `patch3.diff`; `src` type-checks and the 501 locator unit tests pass with type checks. The harness type-check, the
   declaration emit and the snippet check run at implementation.

**Why**: the sub-path types took `Extract<Paths, segments>`, which keeps a member only when it equals a segment: right
for literals, `never` for `string`, and without the query's own path for a template member. The runtime accepts every
one of those sub-paths. Inside a generic base, `RegistryPath<Paths | CommonPaths>` and the query's
`Extract<Path, RegistryPath<…>>` stayed unresolved as a whole, so no sub-path compiled there, the common ones included,
although the docs say the base's "methods work on the common locators". 1.5.1 typed the query's path as given, without
`RegistryPath` (`base.v1.5.1.ts`: the same base compiles, a path outside the chain is rejected); 2.0.0 introduced
`Extract<Path, RegistryPath<…>>`, and 2.1.0 (`base.v2.1.0.ts`), 3.0.0, 3.0.1 and `54cdada` fail. An untyped
`createRegistryWithAccessors(page)` was never an intended form (no example uses it; sub-paths, a core feature, never
compiled on it), so requiring the type argument is a patch.

**Depends on / affects**: B-4 and B-3 (path types in `locatorRegistry.ts` and `types.ts`, order in the plan); the
*Locator paths* and *Locator modules* pages (with any other docs finding on them).

**Also (2026-10-26)**: the generic-base regression is fixed for 2.x separately, outside this branch: a GitHub issue,
"2.x: sub-path arguments do not compile in a generic base class that adds paths (regression from 1.x)", filed by the
maintainer on 2026-10-26 from a draft written here (the fix checked on the 2.0.0 and 2.1.0 sources with TypeScript
5.9.3 and 6.0.3, `…-probes/R/walkthrough/c1-2x/`); the draft was then deleted.

## 21. Reuse by path: the compile-time self-reuse check only for a single literal (2026-10-26)

**Settles**: [B-4](B-registration-and-resolution/defect-B-4-reuse-path-variable-rejected.md) (Low); test gap #5's
reuse part.

**Decided**:

1. **Option 1, refined** (`src/locators/locatorRegistry.ts`): `ReusePathArgument` rejects a reuse at compile time
   only when the registration path is a single string literal and the reuse path is that literal (an
   `IsSingleLiteral` helper: not `string`, not a pattern such as `` `list.item@${string}` `` (`{} extends Record<T,
   unknown>`), not a union); a union, `string` or a pattern is checked at run time. `add`'s rest parameter no longer
   distributes over `Reuse` (`[Reuse] extends [undefined]`, `[Reuse] extends [LocatorSchemaPathType]`), so a
   union-typed `reuse` is checked as one argument. The scope's sketch treated a pattern as a literal (R10 failed);
   the refinement fixes it.
2. **Tests**: rows R1–R11 of `…-probes/R/walkthrough/b4/reuse.ts` in
   `test/tests/locatorRegistry/validation/validation.locatorSchemaPath.typecheck.ts` and
   `test/tests/packaging/publicTypes.typecheck.ts`, `@ts-expect-error` on R2 (`add("a", { reuse: "a" })`), R9 (the same
   on a `<string>` registry) and R11 (a literal matching a template member, reusing itself); a runtime test that a
   self-reuse through a variable throws `Locator reuse path cannot be the same as registration path: "a".`; the paired
   template loop (R4) registering and resolving at run time.
3. **Docs**: *Reusing locators*, *Reuse by path*: a literal self-reuse is a compile error, through a variable `add`
   throws `Locator reuse path cannot be the same as registration path: "a".`; `add`'s doc comment `@throws` and the API
   page's **Throws** gain that message (neither lists it today, and TypeScript code can now reach it); C-1's *Paths with
   a dynamic part* ([#20](#20-sub-path-types-per-member-of-the-path-union-createregistrywithaccessors-requires-its-paths-sub-paths-in-a-generic-base-2026-10-26))
   shows a paired reuse loop, so the snippet check keeps R4 compiling.
4. **Changeset**, patch: "`add(path, { reuse })` compiles when the paths are variables: of the path union, of a
   template union in a loop, or wide strings. A literal path that reuses itself is still a compile error, and any
   self-reuse still throws at the call."

**Why**: `Exclude<ReusePath, Path> extends never` is true whenever the registration path's type covers the reuse
path's, so a variable of the union, `string` or a pattern was refused as "the same as registration path" whatever the
values; and the distributive rest parameter split a union-typed `reuse` into single-member options it matched none of.
The paired loop over a finite template union, which C-1's docs teach, failed today (R4). Probed today, with the sketch,
and refined with C-1's `patch3.diff` applied (`reuse.today.out`, `reuse.sketch.out`, `reuse.sketch-c1.out`,
`reuse.refined.out`, `b4-refined-with-c1.diff`; runtime `runtime.out`): `src` type-checks and the 501 locator unit
tests pass with type checks.

**Depends on / affects**: B-3 and C-1 (`types.ts`, `locatorRegistry.ts`), then the path type probes once; F-2's
`AddAccessor` interface after B-4, since it carries this `add` signature.

## 22. Path rules as pattern checks that report every broken rule, at compile time and at run time (2026-10-26)

**Settles**: [B-3](B-registration-and-resolution/defect-B-3-long-path-literal-ts2589.md) (Low); test gap #5's long-path
and whitespace part.

**Decided**:

1. **Pattern checks, every broken rule reported**: `LocatorSchemaPathFormat` (`src/locators/types.ts`) checks the
   rules with template-literal patterns instead of the per-character walk (`_LocatorSchemaPathFormat` is deleted): an
   empty path is its own error; otherwise four independent checks, in the order whitespace
   (`` `${string}${UnicodeWhitespaceChar}${string}` ``), leading dot, trailing dot, consecutive dots, and every broken
   rule is named, joined by a semicolon and a space in the `LocatorSchemaPathError<Path, Reason>` tuple (its shape unchanged). The
   runtime `validateLocatorSchemaPath` (`src/locators/utils.ts`) collects the broken rules in the same order instead of
   throwing at the first: a path that breaks one rule keeps today's message exactly; one that breaks several gets one
   message naming them all (for example `LocatorSchemaPath string cannot contain whitespace chars and cannot start with a
   dot: .a b`, the path escaped when whitespace is among them; wording from a probe at implementation).
   **An assertion function replaces the seven `path as RegistryPath<…>` casts** in `src/locators/locatorRegistry.ts`
   (TS2352 with the new type; added in the walkthrough): `assertRegistryPath<Paths, P>(path: unknown): asserts path is
   P & RegistryPath<Paths>`, which runs `validateLocatorSchemaPath`, at the start of `add` (after
   `endOpenRegistration`), `getLocatorSchema` and `getLocator` (replacing its separate check); the narrowed path needs no
   cast, so the check and the type cannot be separated by a later change, and no `as unknown as` enters the file. The
   query's own inner path check is dropped, since the assertion at the call does its job. Behaviour change: `add(path)`
   with a path that breaks a rule (from `<string>` or JavaScript; a literal is a compile error) throws at `add`, not at
   its locator method; `getLocatorSchema`, `getLocator`, `getNestedLocator` and reuse already throw at the call
   (`…-probes/R/walkthrough/b3cast/timing.today.out`). The duplicate-path error stays at the locator method, where the
   path is registered.
2. **Tests**: paths of 999 characters and of 2,500 segments compile; each of the 26 characters of
   `LOCATOR_SCHEMA_PATH_WHITESPACE` is rejected at the type level (the type test has only the plain space today);
   U+200B, U+180E and U+2060 compile; a vitest `expectTypeOf` and a runtime unit test on the same multi-rule paths
   (`".a b"`, `".."`, `".a..b c."`, `"a..b."`) assert the same rules in the same order; single-rule messages unchanged;
   `add("main..list")` from a `<string>` registry throws at `add`.
3. **Docs**: *Locator paths*, *The rules of a path*: a path that breaks several rules gets all of them, in that order,
   from TypeScript and at run time alike, with one example message; `api/errors.md`, the multi-rule form;
   `api/types.md` *LocatorSchemaPathFormat*: "a tuple naming the rules it breaks"; the type's doc comment likewise;
   `add`'s doc comment `@throws` and the API page's **Throws**: a path that breaks a rule throws at `add`, the
   duplicate path at the locator method.
4. **Changeset**, patch: "A path literal of any length compiles; one of 999 characters or more failed with TS2589. A
   path that breaks several rules now names all of them, in the same order at compile time and at run time, and
   checking path types is faster." Plus one sentence (added with decision 27): "`add(path)` throws for a path that
   breaks a rule, where its locator method threw before."

**Why**: the walk recursed once per character, so TypeScript's 1,000-level limit refused well-formed paths of 999
characters or more, which the runtime accepts (AGENTS.md §5: the two must agree). The walk also named the first rule
by position in the path while the runtime checks in a fixed order, so they named different rules for 3 of 6 two-rule
paths (`".a b"`, `"a..b c"`, `"a..b."`). Reporting every rule makes them agree by construction. Probed with C-1's and
B-4's patches applied (`…-probes/R/walkthrough/b3/`: `rules.ts` with `rules.today.table` and `rules.c1b4b3.table`,
`runtime.out`, `all-rules.out`, `all-rules.diff`): every case in the decision behaves as stated. Type-checking cost
for 300 paths with `add` and `getNestedLocator` (`cost.*.out`): 422,515 instantiations and 0.50 s today; 51,576 and
0.32 s with first-rule pattern checks; 44,565 and 0.30 s with every rule reported. Today against everything proposed
(C-1, B-4, B-3 with the assertion function; `b3cast/cost.today.out`, `cost.assert.out`, `cost.consumer.*.out`): in a
consumer's project, compiled against the emitted declarations, 407,116 → 33,293 instantiations, 0.29–0.30 s → 0.11 s,
150 MB → 135 MB; in the repo's own build, 422,515 → 51,074, 0.50 s → 0.30–0.33 s, 273 MB → 213 MB. The assertion
function itself leaves the declarations byte-identical to the cast variant (no consumer cost) and adds +0.8%
instantiations to the repo's build; at run time it adds one path check per `add`, 30 ns for a 3-segment path and 90 ns
for 13 segments (`validate-bench.out`), against 0.9–1.8 µs per registered path on *Internal → Performance*.

**Depends on / affects**: C-1 and B-4 (`types.ts`, `locatorRegistry.ts`), then the path type probes once; any docs
finding on *Locator paths* or `api/errors.md`.

## 23. `step()`'s decorator type exported as `StepDecorator` (2026-10-26)

**Settles**: [F-1](F-packaging-types-changesets/defect-F-1-step-factory-type-not-exported.md) (Low); test gap #6's
`@step` part.

**Decided**:

1. **Option 1**: the interface `step(title?, options?)` returns is renamed and exported, `export interface
   StepDecorator` in `src/helpers/stepDecorator.ts` (declared under its public name, AGENTS.md §5), with a doc comment
   (summary, example, `@see https://dyhex.github.io/POMWright/api/step/#stepdecorator`), and exported as a type from
   `index.ts`. `StepDecoratorFactory` was a misnomer: the value is a decorator, `step` is the factory.
2. **Patch**, as an export §5's promise requires ("every public method returns a type a consumer can import from the
   root"; decision 6); an "Added in: v3.0.2" marker under its heading (decision 7).
3. **Tests**: `test/tests/packaging/publicTypes.emit.ts`, `export const boxedStep = step({ box: true })` and a class
   decorated with it; `publicTypes.typecheck.ts`, `const decorator: StepDecorator = step("x")` and `@ts-expect-error`
   that it is not a value; `stepLegacyDecorators.typecheck.ts`, the stored decorator under `experimentalDecorators`.
4. **Docs**: `api/step.md`, a `## StepDecorator` section with the stored-decorator example; `api/index.md`, its row;
   `docs/typescript.md`'s type table (with F-4); `docs/test-steps.md`, a short section on sharing a preconfigured
   decorator from one module; AGENTS.md §1's export list.
5. **Changeset**, patch: "`step()` with a title or options returns a decorator whose type is exported from `pomwright`,
   `StepDecorator`. A module can export a preconfigured decorator, such as `export const boxedStep = step({ box: true
   })`, and still build with `declaration: true`; before, the emit failed with TS4023."

**Why**: the interface had no `export`, and a consumer's declaration emit cannot inline an interface, so exporting
`step({ box: true })` failed with TS4023 ("has or is using name 'StepDecoratorFactory' … but cannot be named");
`ReturnType<typeof step>` gives the last overload's `undefined`, so no annotation helps. The scope's sketch (exported
interface, built and packed) emitted `import("pomwright").StepDecoratorFactory` for the same module; the scope's walk of
`dist/index.d.ts` found no other public return type that is unexported, apart from the registration builders (the
documented exception) and F-2.

**Depends on / affects**: after E-5 (decision 11), which changes this interface's overloads (one probe for both);
before F-3's `declaration: true` docs rewrite, so it lists only the exceptions that remain.

## 24. `AddAccessor` as an interface, `createReusable` typed `ReusableLocatorFactory`; every public member emits (2026-10-26)

**Settles**: [F-2](F-packaging-types-changesets/defect-F-2-registry-values-do-not-emit.md) (Low); test gap #6 (with
decision 23).

**Decided**:

1. **Option A**: `AddAccessor` (`src/locators/locatorRegistry.ts`) becomes an interface with `add`'s call signature
   (as it stands after B-4, C-1 and B-3), so declarations keep its name and never spell out the registration builders;
   `createRegistryWithAccessors` types its `add` with it. `createReusable` is typed by an exported alias,
   `ReusableLocatorFactory`, over the class renamed `ReusableLocatorFactoryInternal`
   (`src/locators/reusableLocatorBuilder.ts`; AGENTS.md §5's `LocatorQueryBuilder` pattern); `src/locators/index.ts`
   and `index.ts` export the type; the unit test that imports the class takes its new name. The registration builders
   stay unexported: a function that returns a registration remains the one documented exception.
2. **Patch**, under decision 6 (the docs' "POMWright's types are [nameable]" promise); an "Added in: v3.0.2" marker for
   `ReusableLocatorFactory`; none for `AddAccessor`, whose name exists already.
3. **Tests**: `test/tests/packaging/publicTypes.emit.ts` becomes an emit check of every public member (the walkthrough's
   34-member probe: the registry and its six members, the factory result, a query and its chain with `update()` and
   `replace()`, seeds with `definition` and `steps`, a page object's members, `SessionStorage`, the logger, `json`,
   `step` and `step(options)`), without the "does not emit (as in 2.x)" exception, so a future unexported type fails
   `pnpm typecheck`; `publicTypes.typecheck.ts`, `ReusableLocatorFactory` and that it is not a value; a vitest type test
   that `AddAccessor<P>` and `LocatorRegistryInternal<P>["add"]` are each assignable to the other, so the duplicated
   signature cannot drift.
4. **Docs**: `api/class-reusablelocator.md`, a `## ReusableLocatorFactory` section (`## createReusable`, which ten doc
   comments link, stays); `api/class-locatorregistry.md`, the `createReusable` property links the new type;
   `api/index.md`; `docs/typescript.md`'s table (with F-4); AGENTS.md §1's export list; `internal/packaging.md`, a
   paragraph on why `AddAccessor` is an interface (an alias of an indexed access type disappears from declarations).
5. **Changeset**, patch: "A function that returns `createRegistryWithAccessors()`'s result, its `add`, a page object's
   `add` or `registry.createReusable` can be exported from a project built with `declaration: true`; before, the emit
   failed with TS4023 and TS4094. `createReusable`'s type is exported as `ReusableLocatorFactory`."

**Why**: `AddAccessor` was `LocatorRegistryInternal<P>["add"]`, an indexed access TypeScript resolves to the method's
type, dropping the name, so `add` taken on its own spelled out the unexported registration builders (TS4023 and 22 ×
TS4094); `createReusable`'s type was an unexported class with a private member (TS4094). Emitting all 34 public members
from a consumer module on today's build (`…-probes/R/walkthrough/f2/all.ts`, `all.today.table`): 29 emit; the five that
fail are `registry.add`, the factory result, a page object's `add` (not in the finding), `createReusable` (all this
decision) and `step(options)` (decision 23). With the fix applied on top of C-1, B-4 and B-3
(`f2-on-combined.diff`), the consumer module emits `AddAccessor<Paths>` and `ReusableLocatorFactory<Paths>`
(`emit.after.d.ts`); the method and the interface are mutually assignable, `src` type-checks and the 782 unit tests
pass; only a function returning a registration still fails, as documented. Under pnpm, a module importing only
`pomwright` has a separate case (TS2883: an extended `test`, `seed.definition`), which F-3 covers.

**Depends on / affects**: after B-4, C-1 and B-3 (the interface copies their `add` signature); before F-3, whose
`declaration: true` paragraphs then name only the registration as an exception; shares the `publicTypes` tests and
AGENTS.md §1 with F-1 (decision 23).

## 25. An ended registration's hint for `locator()` options and for queries (2026-10-26)

**Settles**: [B-5](B-registration-and-resolution/defect-B-5-has-option-ended-message.md) and
[C-2](C-queries/defect-C-2-ended-by-query-message.md) (both Low); test gap #9's ended-registration part.

**Decided**:

1. **Option 1**: `ensureOpen` (`src/locators/locatorRegistrationBuilder.ts`) gives the hint for `filter` and for
   `locator` (the seeded override included), the two methods whose arguments can hold a `Locator`; the other methods
   keep the plain message. `endOpenRegistration` (`src/locators/locatorRegistry.ts`) records the path for
   `getLocatorSchema` and for a query's resolution too, marked as a query, besides `getLocator` and `getNestedLocator`.
   The rule ("a registration ends at the next call on its registry") is unchanged.
2. **Wording** (final text from a probe at implementation), after "…its registration was ended by X.":
   - `filter`, ended by `getLocator`/`getNestedLocator`: unchanged ("If that call is in this filter's arguments, which run
     first, resolve the locator before add(…), or pass a path, which resolves to that path's own locator: filter({ has:
     "badge" }). Otherwise, …");
   - `locator`, ended by `getLocator`/`getNestedLocator`: "If that call is in this locator's options, which run first,
     resolve the locator before add(…), or filter by a path in a step: .filter({ has: "heading" }). Otherwise, …"
     (`locator()`'s `has` takes only a `Locator`; Playwright treats `locator(selector, { has })` and
     `locator(selector).filter({ has })` alike);
   - `filter` or `locator`, ended by a query (`getLocatorSchema(…)` or a query's resolution): "If that query is in this
     filter's arguments (this locator's options), which run first, resolve it before add(…). Otherwise, …", without the
     "pass a path" alternative, which would drop the query's changes.
3. **Tests**: unit cases for the four combinations (`filter`/`locator` × resolving call/query) and the double case
   `locator("x", { has: getLocatorSchema(p).getLocator() })`; a harness case in
   `test/tests/locatorRegistry/add/add.registrationEnds.spec.ts` against the packed package.
4. **Docs**: *Registering locators*, the paragraph "A registry call in a step's own arguments counts too" also names
   `locator()`'s options and queries; *Filters and indices*, *A path, a locator or a chain*, one sentence that a query in
   the arguments ends the registration too; `api/errors.md` *A registration that has ended*, the new texts;
   `api/class-registrationbuilder.md`; AGENTS.md §5, "a `getLocator` in an `add` chain's filter arguments" becomes "a
   resolving call or a query in an `add` chain's `filter` arguments or `locator` options".
5. **Changeset**: the pending, unreleased `.changeset/ended-registration-message.md` is extended to cover `locator()`'s
   options and queries, instead of a new changeset, so 3.0.2's notes describe the final message once.

**Why**: a registry call in a registration's own arguments runs first and ends that registration. `2accf34` gave the
`filter` + `getLocator` form a hint; a `getLocator` in `locator()`'s `has`/`hasNot` option (B-5, `…-probes/B/f5-has-option.out`)
and a query in a filter's arguments (C-2, `…-probes/C/p09-ended-by-query.mjs`) still got "give a registration all its
steps in its add(…) chain, or query the path for one use", which those lines already do. Causes: `ensureOpen` hinted only
for `filter`; `endOpenRegistration` recorded the path only for `getLocator` and `getNestedLocator`.

**Depends on / affects**: after B-2 (the same file, `locatorRegistrationBuilder.ts`).

## 26. The opaque-origin storage message names the browser's error page too (2026-10-26)

**Settles**: [A-5](A-session-storage/defect-A-5-error-page-called-sandboxed.md) (Low).

**Decided**:

1. **Option 1**: the message of `access` (`src/helpers/sessionStorage.ts`) for a document whose own origin is opaque names
   both documents that have one at an origin's URL, worded like `notAppliedError`: "… cannot use sessionStorage: its
   origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy:
   sandbox without allow-same-origin)"; the final text from a probe at implementation, with R-4's punctuation rule.
   Telling the two apart by a property of the error page is not attempted (a browser detail without a guarantee).
2. **Tests**: a harness case on all three browsers (offline, a failed `goto` to the origin, then `set`), asserting each
   browser's outcome with the `browserName` fixture: Firefox the new message, Chromium "the page has no origin yet
   (chrome-error://chromewebdata/)", WebKit still on the previous page; the sandboxed case
   (`test/tests/testApp/sessionStorage.spec.ts:67-76`) and the unit test in `src/helpers/sessionStorage.test.ts` take
   the new text.
3. **Docs**: `docs/session-storage.md` (*Errors* table row, *Through a page object*), `api/class-sessionstorage.md`
   (**Throws**), `api/errors.md` (*Session storage*), the `@throws` of `set`, `get`, `clear` and `seed`; a grep of
   `website/` for "as in a sandboxed document".
4. **Changeset**: the pending, unreleased `.changeset/sandboxed-document-message.md`, which quotes this message, is
   amended instead of a new changeset (as decision 25).

**Why**: Firefox commits its error page after a failed navigation at the origin's URL with an opaque origin, and every
opaque-origin failure was worded as a sandboxed document, so the message sent a tester looking for a CSP header that is
not there (`…-probes/A/out/errorpage.101312.log`).

**Depends on / affects**: A-3 (decision 14; its "return" message also stops presuming one cause); R-4 (punctuation);
before B-7's storage lists.

## 27. A locator method that throws leaves its registration as it was (2026-10-26)

**Settles**: [B-2](B-registration-and-resolution/defect-B-2-failed-locator-method-keeps-definition.md) (Low); test
gap #9's failed-persist part.

**Decided**:

1. **Option 3, persist first and assign after**: `commit` and the any-frame branch of `frameLocator()`
   (`src/locators/locatorRegistrationBuilder.ts`) compute the next definition, call `persist(next)` (which takes the
   definition as an argument), and only then assign `this.definition` and, for a seeded registration, `overrideApplied`.
   A failure in `persist` (the duplicate path today, anything later) leaves the registration as it was, so the same call
   again throws the same error. The path-rule half of the finding is settled by decision 22 (`add` checks the path
   rules, so a registration with a bad path is never created). Not adopted: moving the duplicate check to `add` (the
   duplicate message shows the existing and the attempted locator, and the attempted one is unknown at `add`).
2. **Tests**: unit, a duplicate path called twice through `getByRole` and through `frameLocator()` throws the duplicate
   error both times; a seeded override whose persist fails (a stub registry) still accepts one override; a harness case
   in `test/tests/locatorRegistry/add/add.validation.spec.ts` against the packed package.
3. **Docs**: none; the behaviour now matches *Registering locators* ("A call that throws registers nothing and changes
   nothing that is registered") and `api/errors.md`.
4. **Changeset**, patch: "A locator method that throws because its path is registered already leaves the registration
   as it was, so calling it again reports the same error, not 'has already been provided'."
5. **Decision 22's changeset** gains one sentence on its behaviour change: `add(path)` throws for a path that breaks a
   rule, where its locator method threw before.

**Why**: `commit` assigned the definition (and the seeded override's flag) before `persist`, whose `register` throws for
a duplicate path, so a second call met `ensureDefinitionAllowed` and reported "A locator definition for "main" has
already been provided", for a locator never registered. Probed with decision 22 applied (`…-probes/R/walkthrough/b2/`:
`repro.today.out`, `repro.after.out`, `b2-order.diff`): both routes repeat "A locator schema with the path "main" already
exists."; a bad run-time path throws at `add`; `src` type-checks and the 782 unit tests pass.

**Depends on / affects**: after B-3 (decision 22), which puts the path check in `add`; before B-5 (decision 25), the
same file.

## 28. A query's `describe()` on an any-frame terminal is checked at the call (2026-10-26)

**Settles**: [C-6](C-queries/defect-C-6-query-describe-any-frame-terminal.md) (Low).

**Decided**:

1. **Option 1**: the query's `describe` (`src/locators/locatorQueryBuilder.ts`) calls `ensureStepTarget("describe", …)`
   as `filter` and `nth` do (its method type widened), so it throws at the call with the existing message: `describe()
   cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a
   path inside it.` Only `describe(…)` before `replace()` on an any-frame query stops working, the order the query
   already forbids for `filter` and `nth`; `replace` first.
2. **Tests**: a unit case under *the any-frame form in a query* in `src/locators/locatorQueryBuilder.test.ts`; one line
   in `test/tests/locatorRegistry/add/add.frameLocator.spec.ts` against the packed package.
3. **Docs**: `api/class-locatorquerybuilder.md`, `describe()` **Throws** (with C-4); `api/errors.md` *Queries*, the
   any-frame line gains `describe()`.
4. **Changeset**, patch: "A query's `describe()` on a path registered as `frameLocator()` without a selector throws at
   the call, as its `filter()` and `nth()` do; replace the path first."

**Why**: AGENTS.md §5, "An any-frame `frameLocator()` definition takes no steps or description from any source (checked
at the call)"; the registration's `describe()` and the query's `filter()` and `nth()` follow it, the query's
`describe()` skipped the check, so the query's behaviour depended on call order (`describe` then `replace` worked,
`filter` then `replace` threw; `…-probes/C/p12-misc.mjs`, `p03-anyframe.mjs`).

**Depends on / affects**: C-4 (the same API entry), C-3 and B-7's query entry (docs items).

## 29. A kept query's sub-path error says when the ancestor was registered after it (2026-10-26)

**Settles**: [C-7](C-queries/defect-C-7-kept-query-not-registered-message.md) (Low); test gap #16's kept-query part.

**Decided**:

1. **Option 1**: `ensureSubPath` (`src/locators/locatorQueryBuilder.ts`) keeps today's message when the registry still
   has no record for the segment; when the live registry has one (registered after the query was taken), it says so:
   `"shell.list" is not a valid sub-path of "shell.list.item". It is a segment of that path, and it was registered after
   this query was taken; take a new query with getLocatorSchema("shell.list.item") to use it.` (final text from a probe
   at implementation). The lookup runs only in the failure branch, through a new internal `has(path)` on
   `LocatorRegistryInternal` (a `Map.has`, no clone; not public). The query's behaviour is unchanged: it still throws
   and still does not see later registrations.
2. **Tests**: a unit case under *sub-path errors* in `src/locators/locatorQueryBuilder.test.ts` for both forms (never
   registered: unchanged; registered later: the new form).
3. **Docs**: the new form in `api/errors.md` *Queries* and `api/class-locatorquerybuilder.md` *Errors of every method*;
   `docs/queries.md` *Sub-paths* unchanged.
4. **Changeset**, patch: "A query kept while an ancestor of its path is registered says that the ancestor was registered
   after the query was taken, and how to see it, instead of that it has no locator schema."

**Why**: the check reads the query's own copy, taken at `getLocatorSchema`, but the message spoke of the registry in the
present tense, so after a later registration it said the registry had no record it had
(`…-probes/C/p15-kept-query-message.mjs`).

**Depends on / affects**: independent.

## 30. The never-applied failure for several seeds lists each seed's helper and call (2026-10-26)

**Settles**: [R-2](report.md#r-2-the-never-applied-message-for-several-origins) (Low); test gap #16's never-applied
part.

**Decided**:

1. **Option 3**: `neverAppliedError` (`src/helpers/sessionStorageSeed.ts`) for several pending seeds says "were never
   applied" and lists each seed with its helper's label and the location of its `seed` call (the first non-bundle frame
   of the call site POMWright already captures, the path relative to the working directory), for example `Popup.SessionStorage.seed at fixtures/popup.ts:20:5, for http://localhost:9003 (keys: k)`;
   the error's code frame stays at the first seed's call. Final wording from a probe at implementation, with R-4's
   punctuation rule. The one-origin message is unchanged (`.changeset/empty-seed.md` quotes it). Not adopted: one error
   per seed (Playwright 1.64 records only the first unhandled error of a test, `lib/worker/workerProcessEntry.js:1466-1469`,
   so the others would be lost), and a `cause` chain (Playwright prints it as `[cause]:`, misstating the relation).
2. **Tests**: a unit case in `src/helpers/sessionStorageSeed.test.ts` with two helpers and three pending origins,
   asserting the plural, the labels and the locations; a two-origin case beside the existing never-applied harness spec.
3. **Docs**: the several-seed form on `api/errors.md` (*seed*); one line on *Seeding session storage* where the
   never-applied failure is described.
4. **Changeset**, patch: "When seeds for several origins are never applied, the failure says 'were never applied' and
   lists each seed with its helper and the line that called it; before, it named and pointed at the first seed only."

**Why**: the message joined the seeds with "and … was never applied" and took the first seed's title and call site, so
with seeds from two helpers it named and pointed at only the first (`…-probes/R/r2-never-applied.out`).

**Depends on / affects**: A-1 and A-5 (decisions 9 and 26; the session storage messages), R-4 (punctuation); before
B-7's storage lists.

## 31. CI runs every job on every run: the docs-only skip is dropped (2026-10-26)

**Settles**: [G-2](G-ci-and-tooling/defect-G-2-pr-skip-ignores-merge-commit.md) (Low); G-1 too (decision 32).

**Decided**:

1. **Drop the skip** (chosen in the walkthrough over the finding's options): delete `scripts/ci-changes.sh` and
   `scripts/ci-last-green.sh`; remove the `changes` job and every `needs.changes` condition from
   `.github/workflows/checks.yaml` (package, harness, harness on Node 20, site); remove `actions: read` and its comment
   from `checks.yaml`, `pr.yaml` and `main.yaml`. Every job runs on every run; the harness step's own skip of a latest
   1.x equal to the pin (`ci-playwright-version.sh`) stays.
2. **Branch protection's "require branches to be up to date"**: not needed; the maintainer's setting either way.
3. **Tests**: none for deleted scripts; test gap #12 loses its part on the two scripts and keeps its other parts (the
   snippet check skipping `~~~ts` and `tsx` fences; G-7's unchecked `@see` targets). (Corrected with decision 32.)
4. **Docs**: AGENTS.md §2, the `.github/workflows/` row loses the `changes` description (and the statements built on
   it: `package` on either, `harness` on `code`, `site` on `site`) and the `scripts/` row the two scripts; `checks.yaml`'s
   header comment; *Internal → Tests and checks*, the `changes` bullet goes, with one sentence on why there is no skip.
5. **Changeset**: none (CI only).

**Why**: on a pull request the jobs test GitHub's merge commit while the skip compared the PR head with its last green
commit, so after `main` moved a docs-only push skipped the harness on an untested merge (`…-probes/G/ci-changes/probe.sh`,
case 13). The skip only ever saves time on docs-only pushes (the harness: about 10 s on chromium and 1.8 min on three
browsers locally, plus installs in CI, in parallel; a docs-only merge reaches the site a few minutes later); runners are
free for a public repository. Always testing what a run reports on, with two fewer scripts and no runs-API lookup,
outweighs that. Not adopted: comparing with the PR base only (keeps both scripts and G-1's separate bug), testing the
PR head with up-to-date branches required (stops testing the merge result), a merge-aware last green commit (unverified
API data, more complexity), documenting the gap.

**Depends on / affects**: G-1 (the same scripts).

## 32. G-1 is settled by dropping the CI skip (2026-10-26)

**Settles**: [G-1](G-ci-and-tooling/defect-G-1-rename-hides-old-path.md) (Low).

**Decided**:

1. **Settled by decision 31**: the bug (a rename listed under its new path only, so a move into `website/` or to a
   `*.md` name skipped the jobs its old path needs) lives entirely in `scripts/ci-changes.sh`, which decision 31
   deletes with the skip it fed; with every job on every run a rename cannot skip anything. No `--no-renames`, no tests,
   no docs, no changeset.
2. Decision 31's test line is corrected: test gap #12 loses the two scripts' part and keeps the snippet-fence and G-7
   parts.

**Why**: nothing else in the repository uses `ci-changes.sh`.

## 33. Every build starts from an empty `dist/`, and the packed file list is asserted; first in the plan (2026-10-26)

**Settles**: [G-4](G-ci-and-tooling/defect-G-4-build-keeps-stale-dist.md) (Low); test gap #14's packed-file-list part.

**Decided**:

1. **Option 1**: `package.json`'s `build` becomes `tsup index.ts --format cjs --dts --clean && node
   scripts/write-esm-entry.mjs` (tsup's `--clean` is off by default; `write-esm-entry.mjs` runs after it and writes its
   two files again). It covers every build, a bare `pnpm build` included.
2. **Tests**: the finding's two probe steps at implementation (a planted `dist/old-chunk.js` is gone from the packs; a
   build without `--dts` fails locally as from an empty `dist/`); **a packaging spec** in `test/tests/packaging/`
   (beside `esmEntry.spec.mts`) asserting the installed package's exact file list: `package.json`, `README.md`,
   `LICENSE`, `CHANGELOG.md`, `dist/index.js`, `dist/index.d.ts`, `dist/index.mjs`, `dist/index.d.mts`. It runs in every
   harness job, locally and in CI.
3. **Docs**: AGENTS.md §3, the `pnpm build` line gets `--clean`; AGENTS.md §7, the packed file list leaves the manual
   pre-release probes (the harness asserts it); *Internal → Packaging*, if it shows the build command.
4. **Changeset**: none.

**Execution order: first in the plan** (the maintainer's decision): every later fix is verified with a local
`pack-test`, which a stale `dist/` could let pass where CI fails; the file-list spec lands in the same step.

**Why**: nothing emptied `dist/`, so local packs shipped files the source no longer produces, and with `--dts` removed
the "authoritative" local run passed on declarations an earlier build left, where a build from an empty `dist/` fails
with 1,000 errors (`…-probes/G/stale-dist/`). CI and Publish build on a fresh checkout, so no release was affected.

## 34. `.editorconfig` uses spaces for YAML and Markdown (2026-10-26)

**Settles**: [G-9](G-ci-and-tooling/defect-G-9-editorconfig-tabs-everywhere.md) (Low).

**Decided**:

1. **Option 1**: `.editorconfig` gains `[*.{yml,yaml}]` and `[*.{md,mdx}]` sections, each `indent_style = space` and
   `indent_size = 2`; `[*]` keeps tabs (biome's style for code). No file changes.
2. **Tests**: none (an editor setting); actionlint in the CI lint job (decision 8) fails a tab-indented workflow from
   then on.
3. **Docs**: none.
4. **Changeset**: none.

**Why**: the single `[*]` section asked for tabs everywhere, while every YAML and Markdown file in the repository is
indented with spaces, a tab cannot indent YAML (actionlint: "found character that cannot start any token"), and
AGENTS.md §9 asks for two-space doc examples (`…-probes/G/editorconfig/`).

## 35. The VS Code snippets file is deleted (2026-10-26)

**Settles**: [R-1](report.md#r-1-the-pw-step-snippet-inserts-v1s-pocname) (Low).

**Decided**:

1. **Delete the whole file** `.vscode/playwright-snippets.code-snippets` (the maintainer's decision, over replacing
   `pocName` with `label`); the maintainer writes new snippets later; no GitHub issue for it.
2. **AGENTS.md §2** gains a row for `.vscode/` (contributor editor settings and recommended extensions,
   `settings.json` and `extensions.json`), so a later review sees it as part of the repository.
3. **Tests, docs, changeset**: none.

**Why**: the snippet generated `${x.pocName}`, v1's page object name, which no page object has had since 2.0 (`label`
replaced it); its output is a compile error on 3.x (`…-probes/R/r1-pocName.out`).

## 36. Complete error lists, a labelled `Cannot resolve` message, and a message-coverage check (2026-10-26)

**Settles**: [B-7](B-registration-and-resolution/defect-B-7-errors-page-gaps.md) with
[A-6](A-session-storage/defect-A-6-on-origin-seed-errors-unlisted.md),
[C-4](C-queries/defect-C-4-api-throws-incomplete.md),
[D-3](D-page-objects-urls-navigation/defect-D-3-navigation-messages-docs.md) and
[H-2](H-docs-readme-agents/defect-H-2-errors-page-misses-two-messages.md) (all Low).

**Decided**:

1. **Every docs correction, each finding's option 1**: B-7, *Reusing* on `api/errors.md` lists the hand-made seed's
   `reuse requires a role value / non-empty selector / non-empty id for "…".` and the any-frame step message after reuse
   by path, and `add`'s `@throws` and API **Throws** gain them; A-6, `seed`'s full list (the two on-origin write
   failures) in its doc comment, `api/class-sessionstorage.md`, `api/errors.md` *seed* and *Seeding session storage*
   (the count sentence corrected), and the opaque-origin message in `get`'s and `clear`'s; C-4, the query's
   `describe()` **Throws** (with decision 28's any-frame error) and the skipped-segment clause on
   `api/class-locatorupdatebuilder.md` and the ten `@throws` of `LocatorUpdateBuilderInternal`; D-3, `goto()`'s
   URL-object message on `errors.md` *Navigation*, `Cannot resolve …` on `goto()`'s **Throws** and `@throws`,
   `UrlMatcher.toString()` "used in error messages" (not step titles), and the three `@param options` saying
   `waitUntil` and `timeout` default to `navOptions` and `runPostNavigationActions` to `true`.
2. **D-3's option 2**: the `Cannot resolve` message names the page object, as every other navigation message does, for
   example `LoginPage: goto("http://") cannot be resolved against baseUrl "https://shop.example"` (final text from a
   probe, with R-4's rule); a unit test (`src/helpers/url.test.ts`) and a `testNav.spec.ts` assertion; a patch
   changeset: "`goto(target)` names the page object when the target cannot be resolved against its `baseUrl`."
3. **A message-coverage check** (H-2's option, in this branch; no backlog issue): `scripts/check-error-messages.mjs`,
   run by `pnpm typecheck` beside `check-api-coverage.mjs`, reads every `new Error(…)` in `src/` (81 sites in 12 files at
   `54cdada`), turns each template into a pattern (`${…}` parts as wildcards, ternaries as alternatives), and fails
   when one matches no line of `api/errors.md`'s message blocks; internal invariant errors no user can reach are listed
   in the script, each with its reason. AGENTS.md §3 (what `pnpm typecheck` runs) and §9 (the check beside the API
   coverage check), and *Internal → Tests and checks*, describe it.
4. **Order: one docs pass, late in the plan**, after every decision that changes or adds a message (A-1, A-3, A-5, E-2,
   D-5, B-3, B-2, B-4, B-5/C-2, C-6, C-7, R-2; decisions 9, 14, 26, 10, 16, 22, 27, 21, 25, 28, 29, 30) and after R-4's
   punctuation rule, so each list is written once against the final texts and the new check verifies it.
5. **Changesets**: none for the docs; one patch for decision 2.

**Why**: *Error messages* says it lists every message and AGENTS.md §9 wants every member's errors on its API page and
doc comment; five scopes found messages missing from those lists, and two navigation doc comments state what is not so
(`…-probes/B/f7-errors-gaps.mjs` and the merged findings' probes). The lists drifted because nothing checks them.

**Depends on / affects**: after the decisions in item 4 and R-4; with C-3 (the same pages as C-4); D-3 edits
`api/class-navigation.md` with D-1's and D-2's docs (decisions 19, 17).

## 37. A page object's failed check points at the `new` line (2026-10-26, revised 2026-10-27)

**Settles**: [D-4](D-page-objects-urls-navigation/defect-D-4-check-points-at-base-super.md) and
[H-9](H-docs-readme-agents/defect-H-9-report-points-at-super-not-new.md) (both Low).

**Decided**:

1. **Option 2**: `captureCallSite(new.target)` in place of `captureCallSite(PageObject)` (`src/pageObject.ts`), so the
   labelled error's code frame is the `new` expression that created the page object, in every layout (with a site base
   class it was the base class's `super(…)`, the same line for every page object). The `[cause]:` block, the original
   error with its full stack, is unchanged.
2. **Tests** (extended in the walkthrough): a harness spec in `test/tests/pageObject/callSite/` against the packed
   package (the bundle's frames are what count), catching each error synchronously after `new` (AGENTS.md §3) and
   asserting on `error.stack` and `error.cause.stack`:
   - an `add` mistake directly in `defineLocators()`: first frame the `new` line; the cause has the `add` line;
   - the same with a site base class: first frame the `new` line, not the base class's `super(…)`;
   - `add` lines in a locator module: the cause has the module's `add` line and the page object's call line;
   - composed modules, two levels: the cause has the `add` line, the composing call and the page object's call line;
   - a path-rule mistake in a module (thrown at `add`, decision 22): the cause has that `add` line;
   - a mistake only `verify()` finds: first frame the `new` line; the message names both paths;
   - a standalone registry: an `add` mistake's first frame is the `add` line; a verify-only mistake's the `verify()` line;
   The existing file-name case keeps its point (the consumer's `new` in the file named `pageObject.ts`). (Revised
   2026-10-27 at the maintainer's request: the frame budget, at most 4 bundle frames above the first consumer frame, and
   the assertion that `Error.stackTraceLimit` is 10, are dropped. Playwright's runner raises the limit to 200 whenever it
   loads a config or a test file (`installSourceMapSupport`, through `requireOrImport`), so internal frames cannot push a
   consumer's line out of a stack there; the count would fail on harmless refactors; and the assertions above on the
   cause's lines already fail if consumer lines go missing. Asserting 200 instead would test Playwright's choice, not
   POMWright.)
3. **Docs**: *Page objects in tests* (*When a page object has a mistake*) says "the line that created the page object",
   as *Page objects*, *Verifying registries*, `api/errors.md` and *Internal → Page object lifecycle* do; *Internal →
   Call sites*: the page object's boundary is the class the code constructed, and why no frame budget is tested;
   AGENTS.md §5, if its call-site sentence names `PageObject` as the boundary.
4. **Changeset**, patch: "A page object's failed locator check points the report at the line that created the page
   object, also when it extends a base class of your own."

**Why**: the check cut the stack at `PageObject`'s constructor, leaving every subclass constructor's frame on top, so the
report's code frame was the first `super(…)` of the class chain, which pages described in two different ways and which,
with the documented base class, identified no page object (`…-probes/D/zz-probe-D-base/`; the scope's sketch with
`new.target` passed the 48 `pageObject` unit tests). The walkthrough's probes (`…-probes/R/walkthrough/d4/report.out`,
`report-modules.out`) showed where each kind of mistake points today: an `add` chain's mistake has the `add` line in the
cause (the 5th frame, after 4 of POMWright's), through locator modules and compositions, and a verify-only mistake has no
`add` line (the message names the paths). Capturing a stack at every `add` is not adopted (a cost on every registration, for
mistakes that typed paths mostly catch at compile time).

**Depends on / affects**: E-1 (decision 12; *Internal → Call sites* and `callSite.ts`'s docs, written once); B-3
(decision 22: the path-rule mistake is thrown at `add`).

## 38. A schema's type and value must agree: a value without its type, an explicit type without its value, and a declared key without its codec are compile errors (2026-10-26)

**Settles**: [A-7](A-session-storage/defect-A-7-schema-value-without-type.md) (Low; option 2, chosen in the walkthrough
over the report's docs-only recommendation, after probes showed the documented base classes unaffected), widened in the
walkthrough to the standalone helper (C9) and to optional keys.

**Decided**:

1. **A page object's schema option is keyed by the declared schema type's keys**:
   `PageObjectOptions["sessionStorage"]["schema"]` (`src/pageObject.ts`) is `SchemaOptionFor<StorageTypeFromOptions<Options>>`:
   with no declared keys, `Record<string, SchemaNeedsStorageType>`, a message type, so a codec is rejected
   ("Type 'Codec<…>' is not assignable to type '"declare the schema's type in the page object's type options:
   PageObject<Paths, { storage: typeof schema }>"'"; final wording at implementation); with keys, `Required<S>`, so the
   value holds a codec for every declared key, optional ones included. Keyed by keys, not by whether `storage` is
   declared: the documented generic base class always declares `storage` (an empty type for a subclass without one), and
   a presence-based check lets a value through it (case G2). The constructor's internal hand-off to `SessionStorage`
   takes an assertion function, or a cast with its reason beside it.
2. **C9, a standalone helper with an explicit type requires its value**: `SessionStorage`'s constructor
   (`src/helpers/sessionStorage.ts`) takes `options` with `schema: Required<S>` when `S` has keys, so
   `new SessionStorage<typeof schema>(page)` and `{ label }` without `schema` fail; `new SessionStorage(page, { schema })`
   infers its type as today. `PageObject`'s own construction stays allowed without a value (the page object's
   type-without-value case stays with #58).
3. **Tests**: every case of `…-probes/R/walkthrough/a7/cases.ts` in `test/tests/packaging/publicTypes.typecheck.ts`,
   `@ts-expect-error` on P4, B1, G2 (value without type), S4, S5 (explicit type without value), P10, S7 (optional key
   without its codec) and the existing P6, P7, P9; the rest compile (type and value, neither, an empty schema, inference,
   both documented base classes, a site-wide schema, and P5, G4, P8, S6 until #58); `corrected.ts`'s forms compile; a
   unit test beside "the schema value must match the declared storage type"; the docs' examples kept compiling by the
   snippet check.
4. **Docs**: correct examples only, as the pages already have (no gallery of mistakes, AGENTS.md §9); one sentence of
   the rule on *Session storage*, *Through a page object*: take the schema type from the value (`storage: typeof
   schema`) and pass that value; the note kept for the one remaining trap (a type without its value compiles, the
   helper has no codecs, only a non-string write fails; #58 linked); the new compile error once on `api/errors.md` (as
   `@step`'s compile error is) and in the API sections (`api/types.md` `PageObjectOptions`, `api/class-sessionstorage.md`
   constructor and its doc comment).
5. **Changeset**, patch, one: "A page object that passes `sessionStorage.schema` must declare its type, a
   `SessionStorage` given an explicit schema type must be given the schema value, and the value must hold a codec for
   every declared key, as the docs say. Before, each compiled and the helper's types and codecs disagreed. Take the type
   from the value: `{ storage: typeof schema }`."
6. **The earlier 3.0.2 fix stays** (the runtime hint for a non-string value without a codec); its pending changeset
   `.changeset/storage-schema-hint.md`'s "Nothing checks that both are there" is amended to match.
7. **#58**: the maintainer posts the comment drafted in the walkthrough after 3.0.2 is released (the two new compile
   errors; what remains, a page object's type without its value and a separately written type with an extra codec in a
   variable; the design note that a site base class generic in its schema, made by a function, fails declaration
   emit). No additive 3.x route; #58 stays for the next major.

**Why**: the schema is written twice (type and value) and only partly checked: a value without its type, an explicit
type without its value and an optional key without its codec compiled, and the helper then decoded with codecs its types
did not know, or the reverse (`get` typed `string | null` returned an object; `…-probes/A/out/schemanotype.101958.log`).
The earlier 3.0.2 work handled only the type-without-value direction (a runtime hint, issue #58) after making the value
required broke the generic base class; this fix narrows the option's type instead and adds no conditional parameter to
`PageObject`. Evidence (`…-probes/R/walkthrough/a7/`): `cases.today.json`, `cases.keys.json`, `cases.presence.json`,
`cases.required.out`, `corrected.out` (0 errors), `keys-c9-required.diff`; `src` type-checks and the 782 unit tests
pass; every docs example compiles with the fix (the snippet check, exit 0); an external consumer project type-checks
with the same 5 errors as today, none from this (its base class pairs the type and value of a site-wide schema).

**Depends on / affects**: H-7 (the *Principles* rewrite names this pairing among the rules only TypeScript checks);
decision 36's message-coverage check (the new message is a compile error, not thrown: listed as `@step`'s is).

## 39. The `declaration: true` docs name the two remaining exceptions and their fixes (2026-10-26)

**Settles**: [F-3](F-packaging-types-changesets/defect-F-3-declaration-true-docs-pnpm.md) (Low).

**Decided**:

1. **Option A, docs only**: *TypeScript*, `declaration: true`, lists the two exceptions that remain once F-1 and F-2
   (decisions 23, 24) are done (the 34-member emit probe found no others), each with its fix:
   - **a registration**: "`add(path)`'s registration isn't exported, by design: it ends at the next registry call. Don't
     return one: give a function that registers a block body or `: void` (*Locator modules*), and share a locator by
     reuse by path or reuse by seed instead (*Reusing locators*)." Both are valid ways to share; the paragraph does not
     rank them, and *Reusing locators* says when each fits.
   - **under pnpm, a module that imports only from `pomwright`** and exports a value holding Playwright's types (an
     extended `test`, a seed's `definition`): TS2883; import from `@playwright/test` in that module, as the fixture
     examples do with `expect`, or annotate (`ReusableLocator<Paths>["definition"]`); under npm the emit otherwise names
     `playwright/test` and `playwright-core`.
   *Installation*'s `declaration: true` bullet links there instead of restating it ("except in one pattern" goes); the
   fixture examples (*Page objects in tests*, `api/fixtures.md`) say in one sentence that the `expect` re-export also
   lets the module's declarations name Playwright's types.
2. **Not option B** (exporting the definition types): it would fix only the `seed.definition` case; an extended `test`
   holds Playwright's `TestType` whatever POMWright exports.
3. **Tests**: a docs example of the import pattern (a module with `import type { … } from "@playwright/test"` that exports
   a value holding Playwright's types), so the snippet check, which compiles every page with `declaration: true` under
   pnpm, keeps it emitting; decision 24's emit test covers the rest.
4. **Docs**: also *Internal → Packaging*, one paragraph on TypeScript's portability rule (a type is named through a module
   the file imports; pnpm does not expose Playwright's internal packages).
5. **Changeset**: none.

**Why**: the docs said POMWright's types are nameable "except in one pattern", while under pnpm a module importing only
`pomwright` fails with TS2883 for an extended `test` and a seed's `definition` (`…-probes/F/emit-pnpm/`, `d/` and `a/`;
the same with `export { expect } from "@playwright/test"` emits), and F-1 and F-2 were two more cases (now fixed).

**Depends on / affects**: after F-1 and F-2 (decisions 23, 24); written in decision 36's late docs pass.

## 40. `@step` checks its Promise rule at run time too; *Principles* names the type-only rules (2026-10-26)

**Settles**: [H-7](H-docs-readme-agents/defect-H-7-principles-every-rule-at-runtime.md) (Low).

**Decided**:

1. **Option 1, a runtime check**: `@step`'s wrapper (`src/helpers/stepDecorator.ts`) checks, in the step's body, what the
   method returned; a value that is not a Promise or thenable throws `TypeError: @step decorates methods that return a
   Promise: make the method async`, the compile error's text. The principle then holds for `@step`, as decision 16 made
   it hold for `defineLocators()`. With E-1's and E-5's changes to the same file (decisions 12, 11).
2. **Tests**: a harness spec where a decorated method returning a plain value rejects with the message (the decoration
   carries `@ts-expect-error`, standing in for JavaScript, as the finding's probe does); a unit test of the wrapper;
   decision 36's message-coverage check picks up the new thrown message.
3. **Docs**: *Principles*, *Check at runtime; types where they cost nothing*: "Every rule about a value is checked at
   runtime …", then one sentence for the rules about types themselves, which TypeScript alone checks since types do not
   exist at run time: a storage schema's type and value agree (decision 38), and `createRegistryWithAccessors` takes its
   paths as a type argument (decision 20); *Test steps*, *Only methods that return a Promise*: at compile time and at
   run time; `api/errors.md` *`@step`*: the runtime form; `step`'s doc comment `@throws`.
4. **Changeset**, patch: "`@step` on a method that returns a plain value now throws at run time too (from JavaScript),
   with the compile error's message; before, the method silently returned a Promise."

**Why**: *Principles* says "Every rule is checked at runtime", while `@step`'s Promise rule was TypeScript's alone, and
from JavaScript a decorated method returning a plain value silently returned a Promise
(`…-probes/H/principles/zz-probe-H-step-sync.spec.ts`). Of the report's three exceptions, D-5 now has a runtime check
(decision 16) and this one gets one; the storage pairing and the factory's type argument are type-only by nature.

**Depends on / affects**: E-1 and E-5 (decisions 12, 11: the same file); written in decision 36's late docs pass.

## 41. `attachLogsToTest` and the `log` fixture documented; an outcome-based fixture shown; the redesign filed (2026-10-26)

**Settles**: [E-4](E-logging-step-fixture/defect-E-4-attachlogstotest-lifecycle-undocumented.md) (Low).

**Decided**:

1. **Docs only, behaviour unchanged** (option 1, revised in the walkthrough): `attachLogsToTest` is for a `log` fixture of
   your own, which replaces POMWright's (*Your own fixture* starts "To use the logger with Playwright's own `test`").
   - **`attachLogsToTest`'s API entry and doc comment**: "Attaches every recorded entry, a child logger's included, one
     attachment per entry in call order. Call it once, at the end of the test, in your own `log` fixture, which replaces
     POMWright's. With POMWright's `test`, the `log` fixture calls it; don't call it yourself, or every entry is
     attached twice."
   - ***Logging to the report*, *Your own fixture***: why to write one (with Playwright's own `test`, or **to decide which
     levels are recorded and attached**), with **two examples** (added at the maintainer's request): the retry-based
     fixture, which does what POMWright's `log` fixture does (`testInfo.retry === 0 ? "warn" : "debug"`, the section's
     current example), and the outcome-based fixture verified in the walkthrough
     (`…-probes/R/walkthrough/e4/own-fixture.spec.ts`: record every level; when `testInfo.status ===
     testInfo.expectedStatus` keep `warn` and `error`, otherwise attach every level, so a first failure's `debug` and
     `info` reach the report even when the retry passes); one sentence that such a fixture is the only caller.
   - **The teardown rule**: "An entry logged after the `log` fixture has attached the entries is not attached: a
     fixture that logs in its teardown depends on `log`, so Playwright tears it down first."
   - ***Child loggers***: its entries are attached with the test's.
2. **Not attach-once, not throwing on a second call**: either would excuse a misuse; the docs remove its cause.
3. **The built-in fixture's default stays** (record `warn` and `error` on the first attempt, every level on a retry), so
   the release stays 3.0.2. The redesign (record every level, attach every level when the test did not go as expected)
   is breaking (`isLogLevelEnabled` loses its use; "levels that rise on a retry" is replaced): GitHub issue
   [#62](https://github.com/DyHex/POMWright/issues/62), "`log` fixture: record every level, and attach every level when a
   test does not go as expected (breaking)",
   labelled `backlog` and `breaking`, filed by the maintainer on 2026-10-26 from a draft written here (then deleted).
4. **Tests**: a harness case in `test/tests/logging/logging.spec.ts` for the teardown rule (a fixture that depends on
   `log` has its teardown entry attached); both fixture examples compiled by the snippet check.
5. **Changeset**: none.

**Why**: two behaviours were undocumented: a second call attaches every entry again, which only happens when a test
calls it while also using POMWright's `log` fixture, a misuse the short API sentence "call it in a fixture of your own"
invited; and an entry logged after the fixture's teardown is dropped (`…-probes/E/logger/logger.out`). The walkthrough
verified what a fixture's teardown sees for each outcome (`…-probes/R/walkthrough/e4/status.out`) and that an
outcome-based fixture works with today's API (`own-fixture.json`).

**Depends on / affects**: E-2 (decision 10, the same doc comment); written in decision 36's late docs pass.

## 42. The `step` API page describes `box` as Playwright does (2026-10-26)

**Settles**: [E-3](E-logging-step-fixture/defect-E-3-step-api-page-misdescribes-box.md) (Low).

**Decided**:

1. **Reword `api/step.md`'s `options` line**: "`test.step()`'s options, such as `box` (an error inside the method points
   at the line that called it, not at the line inside the method; the step is reported at the calling line either way)
   and `timeout`." Final text in decision 36's late docs pass.
2. **Tests**: none; `pnpm docs:build`. `test/step-locations` already checks where steps and errors are reported (decision
   12 extends it).
3. **Docs**: `api/step.md` only; `step`'s doc comment ("`test.step`'s options, such as `box` and `timeout`") stays.
4. **Changeset**: none.

**Why**: the page gave `box` the effect "report the step at the line that called the method", while every `@step` step is
reported there and `box` moves where an error inside points (`…-probes/E/steps/forms.out`), as Playwright's own docs and
*Test steps* say.

**Depends on / affects**: E-1 (decision 12; the same pages).

## 43. Renaming a path: one find and replace for the path and every path below it; the editor's rename with its limits (2026-10-27)

**Settles**: [B-6](B-registration-and-resolution/defect-B-6-rename-skips-has-paths.md) (Low).

**Decided**:

1. ***Locator paths*, *One path gets a new name*** leads with a find and replace that renames a path and every path
   below it, with regular expressions on: ``(["'`])main\.list(["'`.])`` replaced with `$1main.items$2` (without regex,
   two replacements: `"main.list"` → `"main.items"`, then `"main.list.` → `"main.items.`). It reaches the `Paths` members
   (a template member with a literal prefix too), resolutions, sub-paths, `reuse`, `has` and `hasNot` paths, in any
   quotes, and leaves siblings (`main.listArchive`, `main.list@open`) and other paths containing the text
   (`shell.main.list`) alone; a path composed from a variable is not found and TypeScript flags it once `Paths` changes
   (the page's existing note). A `:::note` for the trap: renaming only the exact path of a path with descendants leaves
   them on the old segment, where they still compile (the segment is then a namespace) and resolve without its
   locator; only `strictChains: true` reports it.
2. **The editor's rename (F2)** stays as an alternative for a path with no paths below it, in three steps: from a use
   (resolutions, sub-paths, `reuse`), from a `has`/`hasNot` path, then the member; TypeScript then flags anything left.
   For a path with descendants it renames only the exact path, so the find and replace is the tool.
3. ***A wrapper is removed*** keeps its prefix replace (consistent with this). ***Internal → Builders***, *Path parameters
   are generic*: the rename groups (a `has` value's contextual type includes `Locator`, so its literals form a group of
   their own) and that a type change cannot merge them (probed).
4. **Tests, changeset**: none (docs).

**Why**: the page said a rename from a use reaches every use, and `has`/`hasNot` paths are a separate rename group
(`…-probes/B/p11-rename.out`). Typing `has` by its own literal does not merge the groups and splits a `has` written
beside a `hasNot` (`…-probes/R/walkthrough/b6/rename.today.out`, `rename.generic.out`). A quoted find and replace of one
path misses its descendants (the maintainer's point); the regex covers the path and every path below it
(`…-probes/R/walkthrough/b6/regex.out`).

**Depends on / affects**: written in decision 36's late docs pass; C-1's *Paths with a dynamic part* (decision 20) for
composed paths.

## 44. *Queries* explains the any-frame form in a query (2026-10-27)

**Settles**: [C-3](C-queries/defect-C-3-queries-page-no-any-frame.md) (Low).

**Decided**:

1. **Option 1**: a section on *Queries*, "The any-frame form in a query", after *A new definition: `replace`*: the
   example `skip("main").replace("main.frame@payment").frameLocator()` and its chain, and the rules with their messages
   (copied from a probe at implementation): registered ancestors must be skipped; the query's own path cannot be
   replaced; a segment with steps needs `clearSteps` first; afterwards `filter`, `nth` and `describe` (decision 28)
   reject it. *Frames* (*Any frame*) and `api/class-locatorupdatebuilder.md` *frameLocator()* link the section's anchor.
2. **Tests**: the snippet check compiles the example; `pnpm docs:build` checks the anchors.
3. **Changeset**: none.

**Why**: *Frames* sent readers to *Queries* for `replace(subPath).frameLocator()`, and *Queries* never mentions frames;
the rules were only on the API pages and `api/errors.md` (`…-probes/C/p03-anyframe.mjs`). AGENTS.md §9: one home per
fact, on the concept page.

**Depends on / affects**: C-6 and C-4 (decisions 28, 36; the same query pages); written in decision 36's late docs pass.

## 45. *Upgrading from 2.x* names `getById` among the methods that reject an empty first argument (2026-10-27)

**Settles**: [H-1](H-docs-readme-agents/defect-H-1-upgrade-first-argument-omits-getbyid.md) (Low).

**Decided**:

1. **Option 1**: *Upgrading from 2.x*, *Every strategy method needs its first argument*: "…an empty string for `locator`,
   `frameLocator`, `getByRole` and `getById`, which Playwright cannot use…", and the `getById` message in the example
   block (copied from a probe at implementation), so the one sentence covers `add`, `update` and a seeded `add` for all
   four, as AGENTS.md §5, `api/errors.md` and *Registering locators* state the rule.
2. **Tests**: none (a `text` block). **Changeset**: none.

**Why**: the sentence named three methods; `update().getById("")`, which 2.x accepted (stored `id: ""`, resolved to `#`),
throws at the call in 3.x and was in no section (`…-probes/H/firstarg/`).

**Depends on / affects**: written in decision 36's late docs pass.

## 46. *Upgrading from 2.x* describes 3.x, and every item that needs a change gives its search (2026-10-27)

**Settles**: [H-3](H-docs-readme-agents/defect-H-3-upgrade-how-to-names-3-0-0.md) (Low).

**Decided**:

1. **3.x throughout the page** (the examples included, at the maintainer's request): step 1 "`pomwright` to the latest
   3.x"; the 13 example titles `title="3.0.0"` become `title="3.x"`; example comments `// 3.0.0: …` become `// 3.x: …`;
   prose that describes how 3 behaves ("In 3.0.0 …", "3.0.0 matches …") says 3.x; the introduction "POMWright 3 is a
   major release"; the page's `description` and the README's link text ("every change in 3.x a 2.x project meets").
   The Internal pages' mentions of 3.0.0 (*Seed registry*, *Packaging*) record when something was introduced and stay.
2. **Step 3**: "Each item that needs a change gives the search, run from the project's root; the others say they need
   none." The four items without one: *`defineLocators()` runs after the constructor* gains
   `grep -rn "expect(() => new" --include=*.ts --exclude-dir=node_modules .` (a test that expects `new` to throw);
   *`pageActionsToPerformAfterNavigation()` is optional* gains
   `grep -rn "pageActionsToPerformAfterNavigation" --include=*.ts --exclude-dir=node_modules .` (implementations to
   delete); *`get` returns `null` for a missing key* gains a search for the `get` calls whose checks to review; *Waits end
   at the navigation timeout* says it needs no change. Each search run against a sample project at implementation, so
   it finds what it claims.
3. **Tests**: none. **Changeset**: none.

**Why**: step 1 named 3.0.0 while the page states rules added in 3.0.1 and 3.0.2 (a string `urlPath` stays on the
base's origin, `c9c8f34`), and step 3 promised a search for every **Compiles** item where four had none
(`…-probes/H/upgrade-searches.txt`).

**Depends on / affects**: H-1 (decision 45, the same page); written in decision 36's late docs pass.

## 47. AGENTS.md §4 lists every test server route (2026-10-27)

**Settles**: [H-5](H-docs-readme-agents/defect-H-5-agents-server-routes-incomplete.md) and [A-8](A-session-storage/defect-A-8-agents-teststorage-routes.md) (both Low).

**Decided**:

1. **AGENTS.md §4** adds `/teststorage/sandboxed` (a document sandboxed by its Content-Security-Policy: on the origin by
   URL, with an opaque origin) and `/teststorage/shadowed-navigation` (an app whose global `navigation` shadows
   `window.navigation`) to the `/teststorage` list, with a few words each as the other routes have.
2. **The plan's AGENTS.md pass** also lists any route or fixture page this branch's fixes add (for example for A-1's tests
   or A-5's three-browser error-page case), so §4 is complete at the merge.
3. **Tests, docs, changeset**: none beyond AGENTS.md.

**Why**: both routes came with the earlier 3.0.2 fixes (`17426a5`, `bfbc00f`) and are used by `sessionStorage.spec.ts`;
neither name was in AGENTS.md.

**Depends on / affects**: the plan's AGENTS.md updates.

## 48. The *TypeScript* page lists every exported type, checked; *Packaging* names every check of the packed package (2026-10-27)

**Settles**: [F-4](F-packaging-types-changesets/defect-F-4-typescript-page-type-table.md) (Low); the table rows that
decisions 6, 23 and 24 deferred to this item.

**Decided**:

1. ***TypeScript*, *The types***: the storage row gains `SessionStorageOptions`, `SeedOptions`, `Decoded` and `AllEntries`
   (decision 6), and the table gains `StepDecorator` (decision 23) and `ReusableLocatorFactory` (decision 24), each linked
   to its API section.
2. ***Internal → Packaging*** names every check of the packed package: the three compile-only files
   (`publicTypes.typecheck.ts`, `publicTypes.emit.ts`, `stepLegacyDecorators.typecheck.ts`, the last under
   `experimentalDecorators`), decision 24's emit test of every public member and decision 33's packed-file-list spec;
   AGENTS.md §4's `packaging/` list aligned.
3. **`scripts/check-api-coverage.mjs`** also fails when an exported type is missing from the *TypeScript* page's table,
   so a new export cannot be left out there; AGENTS.md §9 and *Internal → Tests and checks* describe it.
4. **Tests**: the extended check runs in `pnpm typecheck`; `pnpm docs:build` for the links.
5. **Changeset**: none.

**Why**: the table lacked the four storage types exported in 3.0.2, and *Packaging* (and AGENTS.md §4) counted two
compile-only files where there are three; nothing checked the table against the exports.

**Depends on / affects**: after F-1 and F-2 (decisions 23, 24); with decision 33 (*Packaging*); written in decision 36's
late docs pass.

## 49. The API coverage check requires each `@see` to link its own heading, in its own section (2026-10-27)

**Settles**: [G-7](G-ci-and-tooling/defect-G-7-api-coverage-see-target-unchecked.md) (Low).

**Decided**:

1. **Option 1, the stricter check** (`scripts/check-api-coverage.mjs`): a method's or class property's `@see` must be its
   owner's API page with its own anchor (the slug of its heading, a repeated heading's `-1` suffix allowed); an export's,
   its page or its page with its own anchor; the known exception stays, `createReusable`'s methods linking
   `#createreusable` (their one heading, decision 24). `…-probes/G/apicov/see-scan.mjs` is the starting point; today's
   declarations pass it.
2. **Headings scoped**: a member's `### heading` must be in its own type's `## Name` section on a page with several.
3. **Tests**: the probe's planted cases (`plant.sh`: a `@see` to another member's heading, a `@see` without a URL, a
   heading present only in another type's section) fail; the repository stays at 0 problems. AGENTS.md §9's description
   of the script, *Internal → Tests and checks* and *Internal → Documentation* say what it checks.
4. **Changeset**: none.

**Why**: the two Internal pages promised a `@see` to the member's own heading, so that an editor's hover always links
its API entry, while the script accepted any `@see` and looked headings up on the whole page (`plant.out`). This
branch adds exports and members (decisions 23, 24) whose hover links the check keeps right.

**Depends on / affects**: decision 48 (the same script); decisions 23 and 24 (new members).

## 50. *Performance* states each column's call count, and its numbers are refreshed after the registry changes (2026-10-27)

**Settles**: [G-6](G-ci-and-tooling/defect-G-6-performance-call-count.md) (Low).

**Decided**:

1. **The wording** of *Internal → Performance*, *Basis for testing*: "each measurement runs its call 20,000 times
   (registration, which builds a fresh registry for each call, 2,000 times), after a warm-up run of the same size, …".
2. **A fresh `pnpm bench` run** after the changes that touch the registry and resolution (decisions 22, 27, 29, 37), as
   AGENTS.md §3 requires: the page's tables, charts and machine line updated; a noticeable change (for example
   registration after decision 22's extra path check, estimated at 30–90 ns per path) is said on the page.
3. **Tests, changeset**: none.

**Why**: the page said every per-call measurement runs 20,000 calls; `scripts/benchmark.mjs` runs registration 2,000
times per run and the other columns 20,000; the rest of the method matched.

**Depends on / affects**: after decisions 22, 27, 29 and 37; written in decision 36's late docs pass.

## 51. Tooling comments describe the current tooling (2026-10-27)

**Settles**: [G-11](G-ci-and-tooling/defect-G-11-stale-tooling-comments.md) (Low).

**Decided**:

1. **The three comments rewritten**: `vitest.config.ts` ("nothing else runs tsc over these unit-test files", or no
   parenthesis); `scripts/check-api-coverage.mjs`'s header (CI passes no argument and reads the default
   `.pack/pomwright/dist/index.d.ts`, the extracted tarball), with decisions 48 and 49's new checks;
   `playwright.base.ts` (the shared options of `test/playwright.config.ts`, kept at the root as plain data so the root
   can import its type without loading `@playwright/test` twice).
2. **The plan's final pass** rereads the header comments of every tooling file this branch changes or adds
   (`checks.yaml` after decision 31, `pack-build.sh`, `check-api-coverage.mjs`, `check-error-messages.mjs` of decision
   36, the new packaging specs of decisions 24 and 33) so they describe the result.
3. **Tests, changeset**: none.

**Why**: the three comments described the repository before the type checks and the extra Playwright configs were
added.

**Depends on / affects**: decisions 48, 49 (the same script), 31 (`checks.yaml`).

## 52. American spelling throughout; *Organizing a project* at a new address (2026-10-27)

**Settles**: [H-6](H-docs-readme-agents/defect-H-6-british-spellings.md) (Low).

**Decided**:

1. **American spelling** in the 15 files (organizing, organizes, behavior, labeled, honors, recognize, synthesized,
   serializes), `package.json`'s description included, and in any text this branch writes; applied last in decision
   36's late docs pass, after the other decisions have edited these pages.
2. **The page renamed**: `docs/organising-a-project.md` becomes `docs/organizing-a-project.md`, titled *Organizing a
   project*, **without a redirect** (the maintainer's decision); the old address stops working. Every internal link
   (four pages and the sidebar) and the README's link text updated; the build's link check finds any left.
3. **No spelling check** (the maintainer's decision): excessive for a style rule; AGENTS.md §9 stays the guard.
4. **Tests**: `pnpm docs:build` (the link check). **Changeset**: none (`package.json`'s description is metadata).

**Why**: AGENTS.md §9 requires American spelling; 21 British spellings in 15 files, one of them a page's title and URL.

**Depends on / affects**: last in decision 36's late docs pass.

## 53. Pages deploys a commit only while it is `main`'s tip (2026-10-27)

**Settles**: [G-8](G-ci-and-tooling/defect-G-8-pages-rerun-deploys-older-site.md) (Low; suspected, not reproduced: it
needs a re-run on GitHub).

**Decided**:

1. **The guard `publish.yaml` has**, in `pages.yaml`'s build job: fetch `main` and continue only when its tip equals
   `github.event.workflow_run.head_sha`, the commit the `CI` run tested (the commit `pages.yaml` checks out); otherwise
   skip, since the newer commit's own run deploys a site that already contains the older one's changes. A
   `workflow_dispatch` keeps building the commit it was started on. Same step shape as decision 4's changes to the
   publish guard. Not adopted: building `main`'s tip (it could deploy a commit whose own checks failed or are still
   running), and `run_attempt == 1` (it would skip a re-run of the newest commit, which should deploy).
2. **Docs**: `main.yaml`'s concurrency comment, *Internal → Documentation* (*Building and publishing*) and AGENTS.md §2:
   deployments follow commit order, re-runs included, because Pages skips a commit `main` has moved past.
3. **Tests**: none locally; the plan notes a manual check after the merge (re-run an older green run: its deploy is
   skipped).
4. **Changeset**: none.

**Why**: a re-run keeps the original commit (GitHub: "the same `GITHUB_SHA`"), and `workflow_run` excludes only
`requested` from re-runs, so a passing re-run of an older `CI` run would make Pages build and deploy that older commit
over a newer site; `main.yaml`'s concurrency orders first attempts only.

**Depends on / affects**: decisions 1 and 4 (the publish workflow and its guard).

## 54. No punctuation convention for messages (2026-10-27)

**Settles**: [R-4](report.md#r-4-message-punctuation) (design question).

**Decided**:

1. **Leave it (option 3)**: no convention and no enforcement; the practical value is negligible (a message reads the same
   with or without a final period, and nothing depends on it), and either convention would change about two dozen
   messages for no reader's benefit.
2. **"R-4's rule" in earlier decisions** (22, 26, 30, 36) means: no rule. Each new or changed message is punctuated as
   reads best for that message (the maintainer's decision), for example no period right after a value that ends it,
   where a period could be read as part of the value.
3. **Tests, docs, changeset**: none.

**Why**: two styles exist by area (`…-probes/R/r4-punctuation.out`), but no contract states one and no use depends on
it.

## 55. Every source-level locator spec gets a twin through the packed package; source specs are evaluated only after (2026-10-27)

**Settles**: test gap #10 (source-only coverage), a gap with no finding of its own.

**Decided** (the maintainer's combination of the options):

1. **Phase 1, in this branch**: the 26 spec files that import `LocatorRegistryInternal` from `src/locators` stay as they
   are, and each gets a twin that runs the same scenarios through `pomwright`'s public API (`createRegistryWithAccessors`,
   `PageObject`) against the packed package, asserting against the DOM first (AGENTS.md §4). What the source specs read
   from internal records (`registry.get`, about 80 uses; `getIfExists`) is observed indirectly where the public API
   allows: a caller's object changed after registration and the resolved locator unchanged (copies), the resolved chain
   and the locator's description (steps, descriptions), `getLocatorSchema`, `verify` and the errors (presence). What
   cannot be observed publicly is listed in the plan, assertion by assertion, with its reason, and stays source-only by
   nature. The packed twins cover at least the features of gap #10: reuse, frames, `getById`, cycles, `verify`,
   `update`'s merge patch, the query's `describe`, the any-frame query.
2. **Phase 2, after phase 1 is complete**: each source spec is evaluated against its twin. One whose twin covers the same
   scenarios and assertions with equal or greater value may be removed; one that adds value (for example precision on
   what is stored) stays. Nothing is removed before full packed coverage exists; each removal is a recorded decision.
3. **When**: after the locator fixes (decisions 20 to 29), so the twins are written against the final behaviour and
   messages.
4. **AGENTS.md §4** ("Know what each spec exercises") describes the twins and the role of the remaining source specs.
5. **Changeset**: none.

**Why**: 26 spec files, most of `add.*` and `getLocatorSchema.*`, run only against `src/`; AGENTS.md §4: "A green
source-level spec says nothing about a stale tarball install", and a bundling problem would go unnoticed for these
features.

**Depends on / affects**: after decisions 20 to 29; G-4 (decision 33) first, as for every test.

## 56. The snippet check fails on the blocks it would silently skip (2026-10-27)

**Settles**: test gap #12's snippet part (no finding of its own; the CI-script and `@see` parts are decisions 31, 32, 49).

**Decided**:

1. **Option 1** (`scripts/check-doc-snippets.mjs`): a TypeScript block the check cannot compile fails with a message that
   names the fix: a `~~~` fence (`a TypeScript block in a ~~~ fence is not compiled; write it as a ```ts block`), a
   `tsx`, `mts` or `cts` block (`write the example as a ```ts block`), and `nocheck` anywhere but *Upgrading from 2.x*
   (`nocheck is only for 2.x code on Upgrading from 2.x; make the example compile: // ---cut--- hides the setup lines
   it needs, and // @ts-expect-error marks a deliberate compile error`); final wording at implementation. `js`, `sh`
   and `text` blocks stay outside the check. A future legitimate `tsx` example (Playwright's component testing, none
   planned) would extend the check (JSX settings, React's and the component-testing package's types) as part of writing
   it.
2. **Tests**: scope G's planted page (`…-probes/G/snippets/`) fails with the three messages; the real docs stay at 0
   problems.
3. **Docs**: AGENTS.md §9 and *Internal → Tests and checks* say what the check rejects.
4. **Changeset**: none.

**Why**: the check compiled only backtick fences labelled `ts` or `typescript` and only listed `nocheck` blocks, so a
`~~~ts` or `tsx` example, or a failing one marked `nocheck`, would ship uncompiled (`planted.out`); none occur today.
Enforced rather than written down, as decisions 36 and 48 chose.

**Depends on / affects**: decisions 36, 48 and 49 (the other doc and API checks).

## 57. `@step`'s legacy decorator path is tested with real `tsc` output (2026-10-27)

**Settles**: test gap #13's legacy-decorator part (no finding of its own; the logger part is decision 41).

**Decided**:

1. **Option 1**: the `tsc -p test/tsconfig.legacyDecorators.json` run of `pnpm typecheck` also emits a small decorated
   module (`experimentalDecorators`) into a gitignored folder; a harness spec runs it, as scope E's probe did
   (`…-probes/E/steps/legacy.spec.ts`): bare, called, boxed, titled and boxed, static, detached, and a method that
   throws; its steps join `test/step-locations`, so the calling line is asserted under decision 12's location rules;
   decision 40's runtime Promise check gets a legacy case. The unit test with a hand-made descriptor stays.
2. **Docs**: AGENTS.md §3 (what `pnpm typecheck` emits) and §4 (the spec); *Internal → Tests and checks*; `.gitignore`
   for the emitted folder.
3. **Changeset**: none.

**Why**: the legacy `(target, key, descriptor)` call runs when decorated code reaches the runner compiled by `tsc` with
`experimentalDecorators` (for example a page-object package), and only a hand-made call tested it; scope E's run of real
legacy output was correct (`legacy.out`). This branch changes `@step`'s runtime wrapper twice (decisions 12, 40).

**Depends on / affects**: after decisions 12 and 40.

## 58. A `consumer` job checks the package as consumers install it, TypeScript 5.0 to latest included (2026-10-27)

**Settles**: test gap #14's remaining parts (the §7 probes are manual; consumers' TypeScript versions are unchecked; the
file-list part is decision 33).

**Decided**:

1. **Option 1, one job `consumer` in the reusable `.github/workflows/checks.yaml`** (no new workflow file; runs for every
   pull request and push to `main` through `pr.yaml` and `main.yaml`): it downloads the tarball the `package` job builds
   and, on Node 24, runs the §7 probes (TypeScript under `node10`, `node16`, `nodenext` and `bundler` resolution
   compiling a consumer file; attw downloaded at a pinned version, never a dependency; Playwright's runner in a CommonJS
   and a `"type": "module"` project) and a TypeScript version loop inside the job (5.0 with `skipLibCheck`, the latest
   5.x, the latest 6.x, the latest release) compiling a consumer fixture under both decorator modes; then, on Node 20
   (`setup-node` again), the `require` and `import` loading probe with one shared `PageObject`. The gate job `build`
   adds `consumer` to its `needs`. `EBADENGINE` stays manual (it only matters when `engines` changes).
2. **Docs**: *Installation*, *TypeScript settings*: "POMWright's declarations compile with TypeScript 5.0 and later; 5.0
   needs `skipLibCheck` for Playwright's own declarations"; a **README badge** beside the Playwright and Node ones
   (added at the maintainer's request), static since TypeScript is not in the package metadata:
   `[![TypeScript](https://img.shields.io/badge/TypeScript-%E2%89%A55.0-3178c6)](https://dyhex.github.io/POMWright/docs/installation/#typescript-settings)`;
   AGENTS.md §2 (the job), §3 or §7 (the TypeScript floor lives in three places that move together: the badge,
   *Installation*'s sentence and the oldest version of the `consumer` job's loop, as the Playwright peer floor and its
   pins do), and §7 (the manual pre-release list shrinks to `EBADENGINE`); *Internal → Tests and checks*.
3. **Changeset**: none (the supported range states what already holds).

**Why**: AGENTS.md §7's pre-release probes depended on someone running a list by hand, and no supported TypeScript range
was stated or tested; scope F's one-off check found TypeScript 5.0.4 to 7.0.2 compiling a consumer, 5.0 with
`skipLibCheck` for Playwright's and `@types/node`'s declarations (`…-probes/F/ts-versions/`). Enforced rather than
remembered, as decision 56.

**Depends on / affects**: decision 31 (`checks.yaml` without the skip), decision 8 (actionlint in the lint job),
decision 33 (the file-list spec covers one §7 probe).

## 59. The README's examples, the messages, the chains and the diagrams are checked (2026-10-27)

**Settles**: test gap #15 (no finding of its own).

**Decided**:

1. **The README's `ts` blocks join the snippet check** (`scripts/check-doc-snippets.mjs`, one more project, the same rules
   as the site's pages, decision 56's included); AGENTS.md §9's "compiled by hand when they change" goes.
2. **The reverse message check**, in decision 36's `check-error-messages.mjs`: every message line on *Error messages*
   must match something the code throws, so a stale or renamed message is caught as well as a missing one.
3. **Chains, option (a): a docs-chains harness spec**: the rendered chains the pages show are its data; it rebuilds each
   example through the packed package and compares the rendered chain, so a change to a chain fails until the spec and
   the page are updated together. Shaped like decision 55's packed specs.
4. **A Mermaid render check in the `site` job**: the built site served, each page with a diagram opened in Chromium (the
   Playwright the job installs for `test/`), and each diagram asserted to have rendered an SVG without Mermaid's error
   marker; the site's dependencies stay out of the root `package.json`, and no harness job builds the site. How a
   diagram looks stays a matter of eye.
5. **Docs**: AGENTS.md §9 and *Internal → Tests and checks* describe the new checks. **Changeset**: none.
6. **The README's example rewritten: done, not part of the plan.** Rewritten in the working tree on 2026-10-27 at the
   maintainer's request (uncommitted): the page object declares a session storage schema (`{ orders: json<Order[]>() }`,
   type and value from one constant, as decision 38 enforces) and an `OrderStatus` union with `(string & {})`, which
   keeps the known statuses as suggestions and accepts any other string (a plain `| string` collapses the union and
   loses them, `…-probes/R/walkthrough/readme/complete.out`); `cancel(options)` and `expectStatus(options)` take option
   objects, named, with the values destructured on the method's first line (the maintainer's preference); the test
   seeds the orders (`const orders: [Order, Order]`, a tuple so `orders[0].id` compiles under `noUncheckedIndexedAccess`),
   logs them with `log.info`, opens the page, checks the table with `getNestedLocator` (one element, no strict-mode
   error, `visible.out`), checks `orders[0]` is `Open`, cancels it and checks `Cancelled`; the second test went; the prose
   explains `getNestedLocator`, `getLocatorSchema`, `seed` and `log`. Both blocks compile against today's packed build.
   The plan only adds the README to the snippet check (item 1); the README's other pending edits belong to decisions 46
   (link text), 52 (spelling and the renamed page's link) and 58 (the TypeScript badge).

**Why**: the README's examples were compiled by hand, nothing re-probed the chains and messages pages show, and the 17
Mermaid diagrams on 13 pages were checked by eye (they render in the browser, so the build does not catch them).

**Depends on / affects**: decisions 36 (the message script), 56 (the snippet check), 1 (Mermaid 12), 55 (the shape of
packed specs).

## 60. The smaller untested behaviours get harness specs; the back/forward-cache case is named (2026-10-27)

**Settles**: test gap #16's unfiled parts (no finding of their own; its C-7 and R-2 parts are decisions 29 and 30).

**Decided**:

1. **Harness specs, from D's probes**, all test code (no change under `src/`, `server.js` or the published package):
   - a page object whose `pageActionsToPerformAfterNavigation()` rejects: the error propagates and the later actions do
     not run;
   - *How a mistake is reported*'s `beforeAll` rows (serial and not) and its worker-scoped fixture row, beside
     `pageObject/lifecycle.spec.ts`, which covers only test-scoped fixtures and `beforeEach`, from
     `…-probes/D/workerfixture/`; a failing test's result is handed over through a file (AGENTS.md §3);
   - the project's `navigationTimeout` as the fallback when neither `navOptions` nor the call sets a `timeout`
     (`test.use({ navigationTimeout })`, the `/testnav` delayed navigation), bounding `goto()` and `expectThisPage`;
   - host forms in a browser (IDN, IPv6, default ports, credentials, upper case), from `…-probes/D/zz-probe-D-hosts.spec.ts`,
     every request fulfilled by `page.route`, so no route, DNS or IPv6 listener is added.
2. **`expectThisPage` and `expectAnotherPage` join `test/step-locations`**, `// LOCATION` cases beside `goto`'s.
3. **The back/forward-cache restore of a seeded origin: no test, one sentence on *Internal → The seed registry***
   naming the case and its effect: a restored document would take the seed out of pending at `framenavigated` with no
   document to write or report. Not testable reproducibly: Playwright disables the cache in Chromium, Firefox and
   WebKit did not restore on a cross-origin back, and every `/teststorage` route sends `no-store`; a back navigation to
   a seeded, cacheable page is a fresh load and is seeded on 3 browsers (`…-probes/A/out/bfcache.095919.log`).
4. **Docs**: AGENTS.md §4 lists the new specs. **Changeset**: none.

**Why**: every part was confirmed by a probe and none is tested; parts guard what the docs promise (the lifecycle
table, the fallback timeout) or code this branch changes (step locations, URL matching).

**Depends on / affects**: the step-location cases after decision 12 (E-1); the host-forms spec after decision 17
(D-2); the lifecycle specs with decision 37 (D-4), in the same `pageObject/` area.

## 61. The walkthrough is closed; the plan is written from this file (2026-10-27)

**Settles**: report.md §11 *Decisions for the maintainer* and *Act before the next merge* as a whole (the closing
checklist).

**Decided**:

1. **Every question has a decision.** §11's 39: 1–9 by #6, #7, #54, #1, #4, #3, #31, #53, #49; 10–14 by #9, #13, #14,
   #18, #38; 15–23 by #15, #27, #22, #21, #25, #43, #20, #28, #29; 24–28 by #19, #17, #37, #16, #36; 29–32 by #12, #10,
   #41, #11; 33–39 by #23, #24, #39, #36, #52, #40, #35. *Act before the next merge* 1–5 by #1–#5. The 16 test gaps by
   their findings' decisions, #8 and #55–#60. The ledger's 53 rows: 52 decided, R-3 closed (#8).
2. **Where a decision differs from §11's [rec], the decision applies**: E-2 validates at setup and fails (#10); G-2's
   skip goes entirely (#31); G-10's logs are not read (#3); A-7 takes the code option (#38); D-4 captures at
   `new.target` (#37); H-6 renames the page without a redirect (#52); R-4 sets no convention (#54); R-1 deletes the
   snippets file (#35); C-1 grew to the required `<Paths>` and the generic-base regression (#20).
3. **report.md is annotated**: test gaps 1–9 and 11 name their decisions, as 10 and 12–16 do, and §11 and *Act before
   the next merge* carry a status line. This file's header names the one thing done (the README's example).
4. **The maintainer's actions outside the plan** (gates of decision 2 or steps of their decisions):
   - PRs #47, #48 and #49: **closed** by the maintainer on 2026-10-27 (decision 1; #48's change, with `astro-mermaid`
     2.2.0, lands in this branch);
   - the Trusted Publisher on npmjs.com: set up by the maintainer before PR #60 is merged (gate 4);
   - the Mermaid diagrams: checked by hand by the maintainer on the site built locally before the merge, and on the live
     site after it (gate 4);
   - after the release: approve it and check its attestation (#3), merge nothing with a changeset until Publish has run
     for the release commit (#4), post the drafted comment on #58 (#38).
5. **Next**: `PLANS.md`, the ordered plans and their status, in this folder (decision 5); the plans are files of their own
   (decision 62). Fixed order: G-4 first (#33); the locator fixes
   (#20–#29) before the packed twins (#55); every message-changing fix before the one late docs pass (#36); the bench
   rerun (#50) after the registry changes; AGENTS.md and the final tooling-comment pass (#51) near the end; the folder
   audit last (#5).

**Why**: the plan needs one source; DECISIONS.md is it.

**Depends on / affects**: every entry above.

## 62. The plans: one overview, one file per item or group, the changesets as the release notes (2026-10-27)

**Settles**: how the implementation plan is written (revises decision 5, point 2).

**Decided**:

1. **`PLANS.md`, the overview**: the base (no code change since `54cdada`, so the findings' file and line references
   hold), the target (3.0.2, decision 6), AGENTS.md §6 rule 7 up front (decision 5, point 4), the ordered table of plans
   (each plan's decisions, findings, bump, status and commits), the gates of decision 2, the maintainer's actions
   (decision 61, point 4), and the folder audit as the last step.
2. **One `PLAN-<IDs>-<slug>.md` per item or group of items worked on together**, as for 3.0.2 (`2f06702`): findings that
   are fixed together share a plan; a plan without a finding is named after its test gap (`PLAN-T<n>-<slug>.md`). A
   plan links its finding files and decisions rather than copying them, and adds the decided contract in one paragraph,
   the implementation steps file by file, the tests, the docs pages, the changeset text, the commands that verify it,
   and a proposed commit message with the `Co-Authored-By:` trailer (AGENTS.md §6 rule 9). A finding file's *Fix plan*
   is superseded where its decision differs.
3. **The changesets table in `PLANS.md` replaces a release-notes file** (AGENTS.md §6 rule 3): the pending changesets
   to amend and the new ones, each *planned* or *done*. The changesets are what consumers read (§6 rule 6), and several
   pending ones change with the fixes (decision 2, gate 3).
4. **Review**: `PLANS.md` and every plan file are written together, reviewed by the maintainer, then committed and
   pushed (decision 5, point 1); execution follows decision 63. (Revised 2026-10-27 at the maintainer's request: it was
   `PLANS.md` first, then the plan files in batches by area.)

**Why**: many decisions went beyond their finding's *Fix plan* (C-1, B-3, A-7, D-4 among them), so executing from the
finding files would mislead; a plan file per step is one source to execute from, and lets findings fixed together share
it.

**Depends on / affects**: decisions 2, 5, 61.

## 63. Execution: one plan at a time, committed by the agent, pushed by the maintainer (2026-10-27)

**Settles**: how the agreed plans are carried out (with decision 62, point 4).

**Decided**:

1. **One plan at a time**, in `PLANS.md`'s order, only once the plans are agreed.
2. **The agent commits**: one commit per plan, or one per step of a plan, each message ending with the
   `Co-Authored-By:` trailer (AGENTS.md §6 rule 9). **The maintainer pushes**, most likely all commits together at the
   end; the agent never pushes. So CI sees none of the commits until then, and the local checks are each commit's
   gate: `pnpm lint`, `pnpm test:unit`, the full `pnpm pack-test` at the end of every plan (chromium, firefox and webkit,
   with the typecheck, snippet, API and step-location checks; runs during a plan use `--project=chromium` to save time,
   and a firefox or webkit failure in the final run is fixed before the plan is done), `pnpm docs:build` when a plan touches `website/`, and actionlint when it
   touches a workflow. A failure outside the plan is rerun once; one that persists stops the plan with a question.
3. **Nothing unexpected**: once a plan is implemented, verified and committed, the agent goes on to the next plan
   without waiting.
4. **Something unexpected** (a deviation from the plan, work the plan does not cover, a result it did not predict, big
   or small): the agent finishes the plan, commits it, then stops and reports before the next plan; the maintainer and
   the agent decide together. Only a question the plan cannot be finished without is asked during the plan.
5. **A plan that changes CI stops after its commit** (a change under `.github/`, or to a script only a workflow runs):
   the agent notifies the maintainer, who pushes, and the next plan starts once the run on PR #60 has validated it.
   `publish.yaml` and `pages.yaml` run only on `main`, so for them the PR run validates the lint (actionlint, once its
   plan has landed) and nothing else; their real run comes after the merge (decision 8, point 6).
6. **The ledgers move with the work**: each plan's commit updates its `PLANS.md` row (status, commit) and appends any
   execution-time decision here (AGENTS.md §6 rule 3).

**Why**: the maintainer's request; the decisions are taken, so an agreed plan that runs as written needs no stop.

**Depends on / affects**: decisions 5, 62.

## 64. Workflow steps with pipes run under `pipefail` (2026-10-27, during plan 4)

**Settles**: an execution-time finding of plan 4 (the PR run's log).

**Decided**: the steps plan 4 added with pipes (the publish guard, the attestation check, the Pages tip check) and the
actionlint step set `shell: bash`, which GitHub runs as `bash --noprofile --norc -eo pipefail {0}`, so a failed command
anywhere in a pipe fails the step. A separate commit under plan 4, before plan 5's.

**Why**: without `shell:`, GitHub runs a step as `bash -e {0}`, where only a pipe's last command counts: a failed `git
show` read as an empty version (the guard stopped quietly), and a failed `git ls-remote` read as a moved `main` (Pages
skipped the deploy with a misleading message). The local probes had run with `pipefail`. Agreed by the maintainer.

## 65. The actionlint step says what it checked (2026-10-27, after plan 5)

**Settles**: an execution-time finding from plan 5's PR run (the maintainer: the step's log "doesn't really tell me
much").

**Decided**: after actionlint passes, the lint job's step prints the workflow files it checked and whether shellcheck
checked their `run:` scripts (`run: scripts checked with ShellCheck <version>`, or `run: scripts not checked: shellcheck
is not installed`), since actionlint prints nothing when it finds nothing and silently skips the scripts without
shellcheck. A separate commit before plan 6's, so one push validates both. Agreed by the maintainer.

## 66. biome skips pnpm's local store (2026-10-27, after plan 5)

**Settles**: an execution-time finding from plan 5's PR run (CI's lint checked 162 files, local lint 164).

**Decided**: `biome.json` excludes `**/.pnpm-store`, beside the other ignored build and cache folders. A local
`.pnpm-store/` at the repository root (pnpm's cache of third-party package files, gitignored, absent from CI's checkout)
made local lint also check two of pnpm's index files. Local lint now checks the same 162 files as CI. Agreed by the
maintainer.

## 67. ShellCheck pinned in the lint job, 0.11.0 (2026-10-27, after plan 5)

**Settles**: a question from the PR run after decision 65 (the runner's ShellCheck was 0.9.0, the local runs 0.11.0).

**Decided**: the lint job's actionlint step downloads ShellCheck 0.11.0 (the latest release) by version and SHA-256, as it
does actionlint, and puts it first on `PATH` for actionlint; the summary prints its version. ShellCheck's releases
publish no checksum file, so the SHA-256 (`8c3be12b…7198`) was computed from two downloads of the release archive. CI and
a local run use the same versions, and a runner image update cannot change the result. Committed separately, pushed with
plan 6. Agreed by the maintainer.

**Why**: actionlint uses whichever `shellcheck` is on `PATH`; GitHub's image had 0.9.0, older than the version the local
checks used, and would change with the image.

## 68. The lifecycle table's outcomes are tested by a run of their own (2026-10-28, during plan 28)

**Settles**: decision 60, point 1, the `beforeAll` and worker-scoped rows, which planned failing tests marked
`test.fail()` handing their result over through a file.

**Decided**: `pageObject/lifecycle.outcomes.spec.ts` starts `test/lifecycle-outcomes/` (a page object with a `has` typo
built in a test-scoped and a worker-scoped fixture, `beforeEach`, `beforeAll`, and `beforeAll` in a serial group) as a
Playwright run of its own on the project's browser, and compares its JSON report with the table: the status of each
test, how far each body got (annotations), and that every error is the labelled message. Taken during execution;
reported to the maintainer at plan 28's stop.

**Why**: the serial row says the later tests do not run, and Playwright skips the rest of a serial group only after an
unexpected failure: with the first test marked `test.fail()`, the second ran (probe). Which tests fail, how far their
bodies get and which do not run are outcomes of the run, which no test sees of itself.
