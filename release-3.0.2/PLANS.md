# 3.0.2 — plans and ledger

Branch `fix/review-3.0.2`, from `main` at `8daa652` (= `v3.0.1`). Started 2026-10-22.

This folder is temporary (`AGENTS.md` section 6). It holds the plans for every defect found in 3.0.1, the README and docs
work, and the intake of the findings from two independent reviews ([REVIEW-PROMPT.md](REVIEW-PROMPT.md)). Decisions in
force are in [DECISIONS.md](DECISIONS.md), the consumer-facing summary in [RELEASE-NOTES.md](RELEASE-NOTES.md).

## Version

The target is a patch, 3.0.2. Every confirmed finding records the bump its fix needs, using the rules below. Findings
that need a minor are fixed on this branch (the release becomes 3.1.0); findings that need a major are deferred
([DECISIONS.md](DECISIONS.md)).

- **patch**: behaviour brought in line with what the docs, the doc comments or `AGENTS.md` already promise; input that
  never produced working code is now rejected at the boundary; docs, tests and tooling.
- **minor**: a new export, member, option or accepted input; a documented behaviour widened without breaking code
  written against 3.0.1.
- **major**: code written against the 3.0.1 docs stops compiling, or behaves differently in a way it could have relied on.

## How a finding moves through this folder

1. **Intake.** A finding from a review (or found here) gets an ID in the ledger: `D` for a defect, `R` for README and
   docs. The reviewers' own IDs are kept in the intake table.
2. **Reproduce.** A probe against the build: a temporary spec under `test/tests/` (deleted after the run) or a Node
   script in the scratchpad, as `AGENTS.md` section 3 describes. The probe's command and output go into the finding's
   plan.
3. **Verdict.** `confirmed`, `rejected` (with the reason: works as documented, decided design, cannot reproduce),
   `duplicate of …`, or `design question` (a disagreement with a decided contract; a decision for the user, never a
   silent change).
4. **Plan.** A confirmed finding gets a plan (tightly coupled findings share one) with its bump. Plans are agreed in
   batches.
5. **Execute** the ticked decisions only. **One commit per defect**: code, unit tests, harness specs, doc comments, site
   pages and its changeset together, the ID in the message. Then the ledger row turns `done` with the commit.

## Ledger

| ID | Summary | Sources | Sev. | Bump | Plan | Status | Commit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | `seed` on the origin: overlapping multi-key calls interleave, an earlier call can win | first review, codex-D1 | medium | patch | [PLAN-D1](PLAN-D1-session-storage-call-order.md) | done | `34c2ec0` |
| D2 | A `__proto__` key is dropped by `set` and `seed` without an error | first review, opus-D4, codex-D5 | low | patch | [PLAN-D2](PLAN-D2-proto-key.md) | done | `7131d3d` |
| D3 | A `urlPath` with `\`, a tab or a newline after the `/`, or a `baseUrl` ending in a bare `?` or `#`, is accepted and changes the page's URL | first review, opus-D5, codex-D3 | low | patch | [PLAN-D3](PLAN-D3-url-path-host.md) | done | `c9c8f34`, `18634ce` |
| D4 | A retained `update()`/`replace()` builder commits on a segment skipped after the call | first review, codex-D2 | low | patch | [PLAN-D4](PLAN-D4-builder-after-skip.md) | done | `b1ee8dc` |
| D5 | `@step({ box: true })` reports no location, or one frame too far out, and drops its error's stack | opus-D2 | medium | patch | [PLAN-D5-D7](PLAN-D5-D7-step.md) | done | `333a928` |
| D6 | `@step` throws a `TypeError` on a call without a receiver, even with its own title | opus-D9 | low | patch | [PLAN-D5-D7](PLAN-D5-D7-step.md) | done | `d807acb` |
| D7 | Bare `@step` does not compile with `experimentalDecorators` | codex-D4 | medium | patch | [PLAN-D5-D7](PLAN-D5-D7-step.md) | done | `4f80b37`, `d91fa33` |
| D8 | A page object that declares `storage` without passing its schema compiles, and its keys are stored and read raw | opus-D1 | medium | patch | [PLAN-D8](PLAN-D8-storage-schema.md) | done | `adffd1e` |
| D9 | On Chromium, a string `urlPath` with `\|` never matches, and `expectAnotherPage` passes on the page | opus-D3 | low | patch | [PLAN-D9-D10](PLAN-D9-D10-navigation.md) | done | `d710c12` |
| D10 | From JavaScript, `goto(new URL(…))` navigates to the page object's own URL | opus-D6 | low | patch | [PLAN-D9-D10](PLAN-D9-D10-navigation.md) | done | `fa424ad`, `6fc3c68` |
| D11 | A registry call inside an `add` chain's arguments ends that registration, and the error tells the user to do what they did | opus-D7 | low | patch | [PLAN-D11](PLAN-D11-ended-registration.md) | done | `2accf34`, `61e266c` |
| D12 | A subclass constructor that throws after `super()` still gets `defineLocators()` run, as a second, uncaught error | opus-D8 | low | none (docs) | [PLAN-R2](PLAN-R2-docs.md) | done | `24fd838` |
| D13 | Explicit `undefined` as the primary of `update` and of a seeded override works at runtime but does not compile | codex-D7 | low | patch | [PLAN-D13](PLAN-D13-undefined-primary.md) | done | `db26390` |
| D14 | Options read through a prototype (a getter on a class) are dropped by the copy | codex-D6 | low | patch | [PLAN-D14](PLAN-D14-inherited-options.md) | done | `9dc8048`, `61e266c` |
| D15 | `publish.yaml` checks out the newest commit on `main`, not the commit `CI` tested | opus-S1 | medium | none (CI) | [PLAN-D15-D16](PLAN-D15-D16-release-and-exports.md) | done | `e856a80` |
| D16 | The `exports` map has no `default` condition, which `@playwright/test`'s has | opus-Q3 | low | patch | [PLAN-D15-D16](PLAN-D15-D16-release-and-exports.md) | done | `2bab383` |
| D17 | An empty `?` or `#` counts as the same page, unlike Playwright's `toHaveURL` and the docs | codex-M2 | low | patch | [PLAN-R2](PLAN-R2-docs.md) (item 5) | done | `c75ab43` |
| D18 | A failed navigation to a seeded origin uses up the seed: on Chromium the retry loads the app without the entries, silently; on Firefox a refused connection fails with a refused-write message | T3 | medium | patch | [PLAN-D18-D19-D28](PLAN-D18-D19-D28-seed-registration.md) | done | `a23aa0d`, `b583c1b` |
| D19 | With Playwright's step overlay (`video.show.test`), a `seed` raced by the hop resolves without its entries | T1 | low | patch | [PLAN-D18-D19-D28](PLAN-D18-D19-D28-seed-registration.md) | done | `5ceb13c` |
| D20 | The *What `seed` cannot do* row "already loading … `seed` fails" is wrong: after the commit, `seed` writes at once and resolves, after the app's first script | T2 | low | none | [PLAN-D20-D29](PLAN-D20-D29-seed-docs.md) | done | `3045656` |
| D21 | On an `about:blank` page that inherited an origin, a helper bound to another origin writes there, and a `seed` made there is lost on Firefox | T5 | low | patch | [PLAN-D21-D23-D27](PLAN-D21-D23-D27-origin-checks.md) | done | `d4cffbb` |
| D22 | An app's own global `navigation` makes `seed` report that the browser has no Navigation API | T4 | low | patch | [PLAN-D22](PLAN-D22-navigation-api-check.md) | done | `bfbc00f` |
| D23 | `chrome-extension://…/`, `app://…/` and `file://host/` are accepted as the origin `"null"`; a page object with one fails with a misleading "names a host" message | T6 | low | patch | [PLAN-D21-D23-D27](PLAN-D21-D23-D27-origin-checks.md) | done | `0028097` |
| D24 | `seed({})` registers an empty seed and fails a passing test with "(keys: )" | T7 | low | patch | [PLAN-D24](PLAN-D24-empty-seed.md) | done | `a6ecacf` |
| D25 | With a key that is not a literal, `get` is typed `string \| null` but returns the decoded value, and `set` encodes a plain string | T8 | low | patch ([decision 30](DECISIONS.md)) | [PLAN-D25-D26](PLAN-D25-D26-storage-types.md) | done | `64cd0b7` |
| D26 | Six session storage types used in public signatures are not exported | T9 | low | patch | [PLAN-D25-D26](PLAN-D25-D26-storage-types.md) | done | `7447754` |
| D27 | A CSP-sandboxed document gets "the page has no origin yet … or use seed()" (Chromium, WebKit) or the browser's raw error (Firefox) | T10 | low | patch | [PLAN-D21-D23-D27](PLAN-D21-D23-D27-origin-checks.md) | done | `17426a5` |
| D28 | When the page closes while `seed` registers, the failure is Playwright's raw error, without the label or the call site | T11 | low | patch | [PLAN-D18-D19-D28](PLAN-D18-D19-D28-seed-registration.md) | done | `d12966a` |
| D29 | `seed`'s documented errors leave out the encoding errors it throws | T12 | low | none | [PLAN-D20-D29](PLAN-D20-D29-seed-docs.md) | done | `c7db10b` |
| D30 | POMWright's errors thrown from page listeners stop the page's later listeners for that event | T13 | low | patch | [PLAN-D30](PLAN-D30-listener-errors.md) | done | `819c477` |
| D31 | A navigation during a multi-key `set` leaves part of the batch written and fails with Playwright's raw error, without the label | T14 | low | patch | [PLAN-D31-D32](PLAN-D31-D32-storage-messages.md) | done | `e8831b8` |
| D32 | A decode error: the codec's reason and the value's length in the message, the whole value last and quoted | T15 | low | patch | [PLAN-D31-D32](PLAN-D31-D32-storage-messages.md) | done | `ea330ef` |
| R1 | README answers what problem POMWright solves, what using it looks like, how much a project needs | first review | — | none | [PLAN-R1](PLAN-R1-readme.md) | done | `0a98954`, `1436d8c` |
| R2 | Site corrections: seven wrong or overbroad statements, one missing error message, D12's note | opus-DOC3–5, codex-M1–3, codex-M5, opus-D8 | low | none | [PLAN-R2](PLAN-R2-docs.md) | done | `ffcc23f`, `24fd838` (D12), `c75ab43` (D17) |
| R3 | `AGENTS.md`: release state, counts, and two rules the code does not follow as written | opus-DOC1, opus-DOC2, codex-M4 | low | none | [PLAN-R3](PLAN-R3-agents.md) | done | `e852e85` |
| R4 | Docs: how little it takes to follow a change of the page's structure (paths when the page changes) | user | — | none | [PLAN-R4](PLAN-R4-paths-when-the-page-changes.md) | done | `bb03471` |
| R5 | Changelog entries: `Contributor: @user` on the bullet line, the changeset's text on its own line | user | — | none | [PLAN-R5](PLAN-R5-changelog-contributor.md) | done | `bd9b115` |

## Intake

Two reviews of `v3.0.1`, each in its own worktree, run one at a time on 2026-10-22: Opus 5.5 at Extra High
(`../../POMWright-reviews/opus.md`) and Codex 6 Astra (`../../POMWright-reviews/GPT-6 Astra.md`). Every finding was
reproduced here on 2026-10-22 against the packed build of this branch (identical `src/` to `v3.0.1`): temporary specs on
chromium, firefox and webkit, a reporter that prints step and error locations, `tsc` 6.0.3 projects in a temporary
folder under `test/`, and Node scripts. All probes were deleted.

| Finding | Verdict | Into |
| --- | --- | --- |
| opus-D1 storage type without schema | confirmed: compiles; `set("token","abc")` stores `abc`; `get("user")` returns a string | D8 |
| opus-D2 `@step({ box: true })` location | confirmed: no location from a test, line 22 instead of 15 from a helper, error without frames; a hand-written boxed step in an `async` method reports 16 and 11 | D5 |
| opus-D3 `\|` in `urlPath` on Chromium | confirmed: Chromium reports `%7C`, `expectAnotherPage` passes on the page; Firefox and WebKit correct | D9 |
| opus-D4 `__proto__` key | duplicate | D2 |
| opus-D5 `/\host` path, bare `?` base | confirmed; `http://localhost:9000?` gives `fullUrl` `http://localhost:9000/?` | D3 |
| opus-D6 `goto(new URL(…))` | confirmed: lands on `fullUrl`; Playwright's `page.goto(new URL(…))` throws `url: expected string, got object` | D10 |
| opus-D7 `getLocator` inside `add(…).filter(…)` | confirmed: the "registration has ended" message | D11 |
| opus-D8 constructor throws after `super()` | confirmed: `Fragile: defineLocators() failed: Cannot read properties of undefined (reading 'label')` fails the test | D12 |
| opus-D9 unbound `@step` | confirmed: `TypeError Cannot read properties of undefined (reading 'constructor')` | D6 |
| opus-DOC1 `AGENTS.md` release state | confirmed | R3 |
| opus-DOC2 two `AGENTS.md` rules | confirmed: `callSite.ts` filters the bundle's own frames by path; `goto`, `expectThisPage`, `expectAnotherPage` are `async` | R3 |
| opus-DOC3 duplicate with `{ reuse }` throws at `add` | confirmed | R2 |
| opus-DOC4 *Error messages* lacks `Invalid reuse path configuration` | confirmed | R2 |
| opus-DOC5 "every rule its types state is also checked at runtime" | confirmed (D10, `nth`) | R2 |
| opus-S1 `publish.yaml` checkout | confirmed by reading: no `ref`, and a `workflow_run` run's default ref is the newest commit on the default branch; `pages.yaml` already pins `head_sha` | D15 |
| opus-S2 bundle-frame filter could drop a consumer frame | rejected: the pattern matches only `/pomwright/dist/index.(js\|mjs\|cjs)`, POMWright's own published bundle; R3 states the exception | R3 |
| opus-Q1 end a registration only at calls that can read it | design question; not adopted, D11 keeps the rule and fixes the message (decided) | D11 |
| opus-Q2 validate `nth`'s index | design question; no change (decided), see *Not planned* | — |
| opus-Q3 `default` export condition | confirmed: Playwright's root entry ends with `"default": "./index.js"` | D16 |
| codex-D1 overlapping seeds on the origin | duplicate | D1 |
| codex-D2 retained builder after `skip` | duplicate | D4 |
| codex-D3 host-changing path | duplicate | D3 |
| codex-D4 bare `@step`, legacy decorators | confirmed: TS1241 and TS1270; `@step()` compiles | D7 |
| codex-D5 `__proto__` key | duplicate | D2 |
| codex-D6 prototype-getter options | confirmed: Playwright 1 match, POMWright 2 | D14 |
| codex-D7 explicit `undefined` primary | confirmed: TS2345 on `update().getByRole(undefined, …)`, `update().getByText(undefined)`, a `role \| undefined` variable, and the seeded override | D13 |
| codex-M1 TypeScript defaults | confirmed: with TypeScript 6 and no `types`, 100 errors, all in Playwright's own declarations; `types: ["node"]` compiles | R2 |
| codex-M2 "exact URL" vs empty `?`/`#` | confirmed: on `/testnav?` and `/testnav#`, `expectThisPage` passes and Playwright's `toHaveURL(fullUrl)` fails, so "identical to Playwright's `toHaveURL`" is wrong | R2 item 5, D17 if option B |
| codex-M3 seeded override "as the first call" | confirmed | R2 |
| codex-M4 `AGENTS.md` release state | duplicate | R3 |
| codex-M5 performance conclusion | confirmed: the page's own table gives about 1 ms for 100 paths, more than the 950 µs round trip it says a few hundred paths beat | R2 |
| codex-S1 origin change between a call's writes | not reproduced (by the reviewer either); D1 re-checks the origin when a call's turn starts; no further action | — |
| codex-Q1 publish the tested tarball | already listed in `AGENTS.md` section 7; no action here | — |

A second intake, from four test runs of the `defect-review` skill against `v3.0.1` (2026-10-22/23), had 17
candidates, T1–T17. [PLAN-T](PLAN-T-candidates-triage.md) reproduced them on this branch on 2026-10-23: 14 confirmed
(D18–D31, T11 in a narrower form), T15 decided (D32), T16 rejected (no reachable effect), T17 a duplicate of D8.

Recall on the four defects known before the reviews (D1–D4): Codex 4 of 4, Opus 2 of 4 (D2, D3). Codex 6 Astra is the
model family of the first review, so its recall of those four is the less independent of the two.

## Not planned, and why

Everything from the three reviews that has no plan, with the reason. The intake table above has every reviewer finding
and its verdict; this section collects the ones that lead nowhere.

### Reviewer findings

| Finding | Why no plan |
| --- | --- |
| opus-S2: the bundle-frame filter could drop a consumer's frame | Rejected. The pattern matches only `/pomwright/dist/index.(js\|mjs\|cjs)`, POMWright's own published bundle; a consumer file at that path would be a copy of POMWright. R3 states the exception in `AGENTS.md`. |
| codex-S1: the page may change origin between one call's writes | Not reproduced, by codex (30 attempts on three browsers: the navigation destroyed the context, no write reached the other origin) or here. D1 re-checks the origin when each call's turn starts. |
| codex-Q1: publish the tarball CI tested | Already in `AGENTS.md` section 7 as work for later. D15 closes the related gap (publishing an untested commit). |
| opus-Q1: end a registration only at calls that can read it | Not adopted (decided 2026-10-22): D11 keeps the rule and fixes the message. Adopting it would be a minor. |
| opus-Q2: validate `nth`'s index | No change (decided 2026-10-22). POMWright hands the index to Playwright's `locator.nth` as given ([../src/locators/utils.ts#L246-L254](../src/locators/utils.ts#L246-L254)), so it behaves exactly as Playwright: probe 2026-10-22, `nth(1.5)` gives the second item, `nth(-1)` the last, `nth(NaN)` and `nth(7)` nothing, identical in both. TypeScript's `number` admits all of them, as Playwright's own `nth(index: number)` does. Rejecting `nth(undefined)`, documented as matching nothing, would be a major. |

### Observations of the first review that are not defects

| Observation | Why no plan |
| --- | --- |
| `getLocator` and `getNestedLocator` are easy to confuse | Explained on *Resolving locators*; R1's README shows `getNestedLocator` in use. |
| `expectAnotherPage` proves the browser left, not where it arrived | By design: arrival is the destination page object's `expectThisPage()`. R1's README shows that pairing. |
| The `log` fixture starts at `warn` | Decided; `log.setLogLevel()` changes it per test. |
| `json<T>()` does not validate at runtime | Documented on *Session storage*; a validating codec is the documented answer. |
| `getById` with a RegExp uses Playwright's internal `internal:attr` selector | An accepted dependency; CI runs the harness at the latest Playwright 1.x, so a change shows up before a release. |
| Publish rebuilds instead of publishing the tested tarball | `AGENTS.md` section 7 (see codex-Q1). |
| The path union is a second list to maintain; a learning curve; the lifecycle's timing | Inherent to the design and documented. |
| The performance conclusions | Partly right: R2 item 7. |

### Areas neither review covered fully

From both coverage tables. None has a plan; the first is covered before the merge.

- Packaging: attw, Node 20, the four TypeScript resolutions and both project types were not run. They are the packaging
  probes of `AGENTS.md` section 7, run before the merge (D16 changes the `exports` map anyway).
- `seed` with COOP, service workers and popups on Firefox and WebKit: reviewed by reading only. The harness covers them
  on all three browsers in `pack-test`.
- The CI workflows were read, not run, and the benchmarks were not rerun.
- Public types: not every export and declaration-emit pattern was probed.
- The docs: opus skipped five Internal pages; codex read every page but checked API and Internal pages partly.

## Execution order

1. D3, D2, D16: small and independent.
2. D1: the largest change, in `src/helpers/sessionStorage.ts`, `src/helpers/sessionStorageSeed.ts` and the new turns
   helper.
3. D8 (B): the runtime hint and the docs note.
4. D4, D11, D13, D14: the locator builders.
5. D17, then D9, then D10: navigation (D9's `|` rule applies to the rest D17 computes).
6. D5, D6, D7: `@step`, one commit each.
7. D15: the publish workflow.
8. `pnpm bench`, after every code change (D1, D4, D11 and D14 touch the registry, the queries or the copies): the
   tables of *Internal → Performance* and its machine line, from the new run.
9. The GitHub issues of [ISSUES.md](ISSUES.md): created by the user from [issues/](issues/), before R3.
10. R2 (item 7, the performance conclusion, from the new numbers; D12 as its own commit), R3, then R1 last, so the docs
    and the README describe the code as it is at the end.

## Execution order of D18–D32

Each plan is agreed before it is executed; one commit per defect, its changeset with it.

1. D23, D22, D24: small and independent.
2. D32, then D31, then D27: the messages; D31 and D27 share `access()`'s labelled fallthrough.
3. D28, D19, D18 ([PLAN-D18-D19-D28](PLAN-D18-D19-D28-seed-registration.md)), its step 1 (the race of the
   re-registration) before anything else of D18.
4. D21, on D18's call-time snapshot.
5. D30.
6. D26, then D25.
7. D20 and D29 last, since D18 and D28 add messages and change the seed page.
8. `pnpm lint`, `pnpm test:unit`, `pnpm pack-test --reporter=line` on all three browsers, `pnpm docs:build`.

## Before the merge

- `pnpm lint`, `pnpm test:unit`, `pnpm pack-test --reporter=line` (all three browsers: pull requests run chromium only),
  `pnpm docs:build`, and the packaging probes of `AGENTS.md` section 7 (D16 changes the `exports` map).
- R3 covers `AGENTS.md`: the version line, pending changesets, counts and every fact a fix changed.
- The audit of section 6, rule 7: what a later reader needs moves into the code, tests, site, changesets or `AGENTS.md`;
  then this folder is deleted.
