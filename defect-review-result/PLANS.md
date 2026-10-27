# 3.0.2 fix work: plans and ledger

Branch `fix/review-3-0-2`, PR #60 (a draft until decision 2's gates are met). The review read `54cdada`; nothing under
`src/`, `test/`, `website/`, `scripts/` or `.github/` has changed since (checked at `6333fa4`), so the finding files' file
and line references hold. The release is a patch, **3.0.2** ([DECISIONS.md](DECISIONS.md) #6).

This folder is temporary (AGENTS.md §6). [DECISIONS.md](DECISIONS.md) holds the decisions in force; [report.md](report.md)
and the finding files hold the evidence. Each plan below links its findings and decisions instead of copying them, and
where a decision differs from a finding's *Fix plan*, the decision applies.

## Rules for every plan

1. **Nothing of this folder enters the repository** (AGENTS.md §6 rule 7, decision 5): no finding ID (`A-1` …), decision
   number, plan name or link to this folder in code, tests, docs, changesets or AGENTS.md. A reason that must outlive the
   review goes on an Internal page; work left for later goes into a GitHub issue. Commit messages may name the plan.
2. **One plan at a time, in the order below** (decision 63). The agent commits, one commit per plan or one per step of a
   plan, each message ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (AGENTS.md §6 rule 9). The
   maintainer pushes; the agent never pushes.
3. **When a plan runs as written**, the agent commits it, updates its row here in the same commit, and starts the next.
   **When anything unexpected happens** (a deviation, work the plan does not cover, a result it did not predict, big or
   small), the agent finishes the plan, commits it, records what happened under the plan's *Execution notes*, then
   stops and reports. Only a question the plan cannot be finished without is asked during the plan.
4. **A plan marked "stop" changes CI** (a change under `.github/`, or to a script only a workflow runs). After its commit
   the agent stops; the maintainer pushes, and the next plan starts once the run on PR #60 has validated it.
5. **Checks.** While working: `pnpm lint`, `pnpm test:unit`, and `pnpm pack-test --project=chromium --reporter=line`.
   Before the commit, every plan:
   - `pnpm lint` and `pnpm test:unit`;
   - `pnpm pack-test --reporter=line` on chromium, firefox and webkit (it runs `pnpm typecheck`, so the snippet, API
     and step-location checks too); a firefox or webkit failure is fixed before the plan is done;
   - `pnpm docs:build` when the plan touches `website/`;
   - actionlint (the version plan 3 pins, downloaded to the scratchpad) when the plan touches `.github/workflows/`;
   - from plan 5 on, `bash scripts/consumer-check.sh pomwright-test-build.tgz` when the plan changes a public type
     (plans 7, 8, 9, 13, 14, 15, 18, 23, 24, 26), so TypeScript 5.0 to latest sees each change before the final push.

   A failure outside the plan is rerun once; one that persists stops the plan with a question. A run is judged by its
   exit code first.
6. **Messages and pages.** Every message, chain and description a page or a changeset shows is copied from a probe
   against the build (AGENTS.md §9). A changed message is searched for in `website/`, the doc comments and
   `.changeset/`, and updated everywhere it appears. A message is punctuated as reads best for it (decision 54). Every
   new text uses American spelling (decision 52).
7. **Probes** run as AGENTS.md §3 describes: a temporary spec in `test/tests/`, deleted after the run, or a Node script
   in the scratchpad; their output goes into the plan's *Execution notes* when it decides a wording.

## Plans

| # | Plan | Decisions | Bump | Stop | Status | Commits |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [Every build from an empty `dist/`; the packed file list asserted](PLAN-G-4-clean-build.md) | 33 | none | | done | `ee00af7` |
| 2 | [`.editorconfig` for YAML and Markdown; the VS Code snippets file deleted](PLAN-G-9-R-1-repository-hygiene.md) | 34, 35 | none | | done | `1717edb` |
| 3 | [CI without the docs-only skip; actionlint in the lint job](PLAN-G-2-G-1-checks-workflow.md) | 31, 32, 8 | none | stop | done, PR run green | `f866325` |
| 4 | [Release tooling: changesets 3, action v2, Trusted Publishing, the publish and Pages guards, Dependabot](PLAN-G-3-G-10-G-5-G-8-release-workflows.md) | 1, 3, 4, 53 | patch (note) | stop | done, PR run green | `3284aa4`, `8beb9d0` |
| 5 | [A `consumer` job: the packaging probes and TypeScript 5.0 to latest](PLAN-T14-consumer-job.md) | 58 | none | stop | done, PR run green | `612a62a` |
| 6 | [Mermaid 12, and a render check of every diagram in the site job](PLAN-G-3-T15-mermaid.md) | 1, 59 | none | stop | done, PR run green | `54cf090`; follow-ups `2607cf7`, `fd0db4c`, `b47a255` |
| 7 | [Sub-path types per member of the path union; the required type argument; generic bases](PLAN-C-1-sub-path-types.md) | 20 | patch | | done | `49454c6` |
| 8 | [Reuse by path: the self-reuse check for a single literal only](PLAN-B-4-reuse-by-path-types.md) | 21 | patch | | done | `ff6495e` |
| 9 | [Path rules as pattern checks reporting every rule; a locator method that throws changes nothing](PLAN-B-3-B-2-path-rules-and-persist.md) | 22, 27 | patch | | step 1 done | (filled by the next commit) |
| 10 | [An ended registration's hint for `locator()` options and for queries](PLAN-B-5-C-2-ended-registration.md) | 25 | patch | | planned | |
| 11 | [Own non-enumerable options are read](PLAN-B-1-C-5-own-non-enumerable.md) | 15 | patch | | planned | |
| 12 | [A query's `describe()` on an any-frame terminal; a kept query's sub-path message](PLAN-C-6-C-7-query-checks.md) | 28, 29 | patch | | planned | |
| 13 | [`AddAccessor` as an interface, `ReusableLocatorFactory`; every public member emits](PLAN-F-2-emit-every-member.md) | 24 | patch | | planned | |
| 14 | [`@step` on generic methods](PLAN-E-5-generic-step.md) | 11 | patch | | planned | |
| 15 | [`StepDecorator` exported](PLAN-F-1-step-decorator-type.md) | 23 | patch | | planned | |
| 16 | [Boxed steps with a computed `location`; a page object's check points at `new`](PLAN-E-1-D-4-call-sites.md) | 12, 37 | patch | | planned | |
| 17 | [A Promise from `defineLocators()` fails the page object](PLAN-D-5-async-definelocators.md) | 16 | patch | | planned | |
| 18 | [`@step`'s Promise rule at run time; legacy decorators run for real](PLAN-H-7-T13-step-runtime.md) | 40, 57 | patch | | planned | |
| 19 | [The `log` fixture validates `locale` and `timezoneId`](PLAN-E-2-log-locale.md) | 10 | patch | | planned | |
| 20 | [Session storage calls check the origin before and after every call](PLAN-A-1-origin-checks.md) | 9 | patch | | planned | |
| 21 | [A page-wide turn on pages without a URL origin; `seed` writes at once on an inherited origin](PLAN-A-2-A-3-inherited-origin.md) | 13, 14 | patch | | planned | |
| 22 | [The opaque-origin message; the never-applied message for several seeds](PLAN-A-5-R-2-storage-messages.md) | 26, 30 | patch | | planned | |
| 23 | [Storage values typed per key member](PLAN-A-4-key-types.md) | 18 | patch | | planned | |
| 24 | [A schema's type and value must agree](PLAN-A-7-schema-agreement.md) | 38 | patch | | planned | |
| 25 | [A string `fullUrl` writes `^` as `%5E`; `\|` documented](PLAN-D-2-H-4-fullurl.md) | 17 | patch | | planned | |
| 26 | [`NavigationFor` declares `goto` as a property; the labelled `Cannot resolve` message](PLAN-D-1-D-3-navigation.md) | 19, 36 (point 2) | patch | | planned | |
| 27 | [Packed twins of the source-level locator specs](PLAN-T10-packed-twins.md) | 55 (phase 1) | none | | planned | |
| 28 | [The smaller untested behaviours](PLAN-T16-smaller-specs.md) | 60 | none | | planned | |
| 29 | [The snippet check rejects what it would skip, and compiles the README](PLAN-T12-T15-snippet-check.md) | 56, 59 (point 1) | none | | planned | |
| 30 | [Complete error lists and the message-coverage check](PLAN-B-7-error-lists.md) | 36, 59 (point 2) | none | | planned | |
| 31 | [A docs-chains spec](PLAN-T15-docs-chains.md) | 59 (point 3) | none | | planned | |
| 32 | [The API coverage check: own `@see` headings, the *TypeScript* table](PLAN-G-7-F-4-api-coverage.md) | 49, 48 | none | | planned | |
| 33 | [Versioning rules: patch-level exports, "Added in" markers](PLAN-F-5-H-8-versioning.md) | 6, 7 | none | | planned | |
| 34 | [Docs: `declaration: true`, the `log` fixture, `box`](PLAN-F-3-E-4-E-3-docs.md) | 39, 41, 42 | none | | planned | |
| 35 | [Docs: renaming a path; the any-frame form in a query](PLAN-B-6-C-3-docs.md) | 43, 44 | none | | planned | |
| 36 | [Docs: *Upgrading from 2.x*](PLAN-H-1-H-3-upgrade-page.md) | 45, 46 | none | | planned | |
| 37 | [*Performance*: the call counts, and a fresh benchmark](PLAN-G-6-benchmark.md) | 50 | none | | planned | |
| 38 | [American spelling; *Organizing a project*](PLAN-H-6-spelling.md) | 52 | none | | planned | |
| 39 | [The source-level specs evaluated against their twins](PLAN-T10-source-specs-evaluated.md) | 55 (phase 2) | none | stop | planned | |
| 40 | [AGENTS.md complete; tooling comments current](PLAN-H-5-A-8-G-11-agents-and-tooling.md) | 47, 51 | none | if CI | planned | |
| 41 | [Release gates and the folder audit](PLAN-release-gates-and-audit.md) | 2, 5, 8 | none | stop | planned | |

The order follows the decisions' dependencies: the clean build first (decision 33); CI early, so its stops come
before the long run of code plans and every later push is linted and checked against TypeScript 5.0; C-1, B-4 and B-3
in the order they were probed together; the locator fixes before their packed twins (decision 55); E-5 before F-1
(decision 11); E-1 and D-4 together, D-5 after (decision 16); A-1 before A-2 and A-3, both before A-5 (decisions 9, 13);
every message change before the error lists (decision 36, point 4); F-1 and F-2 before the *TypeScript* table and the
`declaration: true` docs (decisions 39, 48); the registry changes before the benchmark (decision 50); spelling last
among the pages (decision 52). Plan 39 stops because each removal of a source spec is a decision (decision 55).

## Changesets

The changesets are the release notes (decision 62, point 3). Every pending changeset is re-read against the final code
in plan 41 (decision 2, gate 3).

### Pending changesets amended

| Changeset | Plan | What changes | Status |
| --- | --- | --- | --- |
| `batch-navigation-message.md` | 20 | every call checked before and after, the keys done and in flight, the final message | planned |
| `boxed-step-location.md` | 16 | nested boxed steps and the navigation and storage helpers | planned |
| `options-read-like-playwright.md` | 11 | own non-enumerable properties | planned |
| `ended-registration-message.md` | 10 | `locator()`'s options and queries | planned |
| `sandboxed-document-message.md` | 22 | the message names the error page too | planned |
| `storage-string-key-types.md` | 23 | patterns and branded keys, with the migration | planned |
| `storage-schema-hint.md` | 24 | "Nothing checks that both are there" corrected | planned |
| `caret-in-url-path.md` | 25 | `fullUrl` writes `^` as `%5E` | planned |
| `export-storage-types.md` | 33 | the promise it fulfils, instead of "as every other public signature already allows" | planned |

### New changesets (all `patch`)

| Changeset | Plan | Says | Status |
| --- | --- | --- | --- |
| `trusted-publishing.md` | 4 | releases use Trusted Publishing and provenance; 3.0.0 and 3.0.1 have no attestation | done |
| `sub-path-template-members.md` | 7 | sub-paths on template members, on `<string>`, and in a generic base (restored from 1.x) | done |
| `registry-requires-paths.md` | 7 | `createRegistryWithAccessors` requires its paths as a type argument | done |
| `reuse-path-variables.md` | 8 | `reuse` compiles with path variables | done |
| `long-path-literals.md` | 9 | any length compiles; every broken rule named; `add` throws for a bad path | done |
| `failed-locator-method-unchanged.md` | 9 | a locator method that throws leaves the registration as it was | planned |
| `query-describe-any-frame.md` | 12 | a query's `describe()` on an any-frame terminal throws at the call | planned |
| `kept-query-sub-path-message.md` | 12 | a kept query's sub-path message | planned |
| `declaration-emit-registry.md` | 13 | the registry's values emit; `ReusableLocatorFactory` exported | planned |
| `step-generic-methods.md` | 14 | `@step` on generic methods | planned |
| `step-decorator-type.md` | 15 | `StepDecorator` exported | planned |
| `page-object-check-at-new.md` | 16 | a page object's failed check points at the `new` line | planned |
| `async-define-locators.md` | 17 | a Promise from `defineLocators()` fails with a labelled error | planned |
| `step-promise-at-runtime.md` | 18 | `@step` on a method returning a plain value throws at run time | planned |
| `log-locale-check.md` | 19 | the `log` fixture checks `locale` and `timezoneId` at setup | planned |
| `about-blank-storage-order.md` | 21 | overlapping calls on an `about:blank` page keep their order | planned |
| `seed-inherited-origin.md` | 21 | `seed` writes at once on a popup that inherited the origin | planned |
| `never-applied-several-seeds.md` | 22 | the never-applied failure lists every seed | planned |
| `schema-type-and-value.md` | 24 | a schema's type and value must agree | planned |
| `navigation-for-goto.md` | 26 | a RegExp page's `navigation` is not a string page's | planned |
| `cannot-resolve-label.md` | 26 | `goto(target)`'s `Cannot resolve` message names the page object | planned |

## Before PR #60 is marked ready

Decision 2's gates, as they stand after decisions 8, 33 and 58; plan 41 works through them.

1. F-5 and H-8 are decided (done: decisions 6 and 7).
2. Every plan is done; `pnpm pack-test` is green on chromium, firefox and webkit, the Node 20 floor run is green, and the
   harness at the latest Playwright 1.x is green on all three browsers (decision 8).
3. Every pending changeset is re-read against the final code (the tables above).
4. The Trusted Publisher is set up on npmjs.com, and every Mermaid diagram is checked by hand on the site built locally
   (the maintainer).
5. The packaging probes ran on the final tarball: the `consumer` job (plan 5) and the file-list spec (plan 1) do it on
   every run; `EBADENGINE` stays manual and matters only when `engines` changes.
6. The Publish logs (decision 3: not read), the merge rule after the release (plan 4) and the folder audit (plan 41).

## The maintainer's actions outside the plans

- Before the merge: set up the Trusted Publisher for `pomwright` on npmjs.com (repository `DyHex/POMWright`, workflow
  `publish.yaml`); check every Mermaid diagram by hand on the site built locally.
- After the merge: check the diagrams on the live site; re-run an older green `CI` run once to see Pages skip its deploy
  (plan 4).
- After the release: approve it on npmjs.com and check its attestation; merge nothing with a changeset until Publish has
  run for the release commit; close issue #53 (the release tooling, done in plan 4) once the release has published;
  post the drafted comment on issue #58.
