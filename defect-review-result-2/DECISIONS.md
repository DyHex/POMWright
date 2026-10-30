# Decisions of the second review's triage

The decisions landed in the triage of [report.md](report.md) by the maintainer and Claude (Opus 5.5), from 2026-10-28,
in the order they were taken. Numbers continue the first review's `defect-review-result/DECISIONS.md` (#1 to #78), so
a number names one decision across both folders. Nothing here is implemented yet; the plans are written from these
entries after the triage, and where an entry differs from a finding's recommended fix or fix sketch, the entry applies.

## How an item is presented

The header gives the item's number out of the total, a link to its finding, its severity and kind, and a link to every
finding decided with it. Then:

1. **How it works now**: what the code, docs or workflow do today, with links to the lines.
2. **What's wrong**: what goes wrong, and the evidence. The finding is re-checked first (its reproduction re-run or the
   code re-read); disagreement with it is said, on severity or on whether it is a defect at all. "No change" is a valid
   outcome.
3. **Why it matters for POMWright**: against what the project promises: documented behavior, the design rules (mirror
   Playwright, validate at runtime, no guards that only excuse mistakes), the tests and checks, the release.
4. **Fixes**: the options and what each costs, then the recommended one and why.
5. **What the fix could break**: the lines of this checklist that apply, each marked ✔ (checked, and how) or ~
   (reasoned, not checked): other code paths and callers of what changes; messages, the *Error messages* page and its
   check; pages, doc comments and snippets that describe the old behavior; types (the declaration output, API
   coverage, compile errors the docs quote); tests (one that fails before the fix and passes after, and existing tests
   that change); release (changeset, semver, workflows); other ledger items that touch the same lines.
6. **To decide**: numbered questions, each with a default answer, so "agreed" settles them all.

A defect fits on about one screen; an item that needs more says so. Docs findings come in batches by page: a table of
each finding, its fix in one line and the recommendation; the maintainer approves the batch or pulls items out. Docs
findings that need a real decision get the full format.

The approved fix sketches are evidence for a cause, not the fixes: each passed one gate, written on its own against
`d850405`, and step 5 was never run on them.

A problem found in step 5 gets an ID `2R-n`, is reproduced like any finding, and is added to the ledger.

No code or docs change during the triage, and the maintainer says when to move on. Probes run in the second review's
worktree, restored afterwards.

When an item is decided: an entry below (number, date, the items it settles, what was decided, why, what it depends
on); a **Status** line in each finding file it settles; its row in report.md's ledger.

## Order

| Item | Findings | Kind |
| --- | --- | --- |
| 1 | 2G-1 with 2G-2 | defects (Medium, Low) |
| 2 | 2A-9 | defect (Medium) |
| 3 | 2A-1 | defect (Medium) |
| 4 | 2I-2 with 2I-1 and 2I-8 | docs (Medium, Low) |
| 5 | 2A-2 with 2A-10 | defects |
| 6 | 2A-3 | defect |
| 7 | 2A-4 | defect |
| 8 | 2A-8 | design |
| 9 | 2B-1 | defect |
| 10 | 2B-4 | design |
| 11 | 2D-1 | defect |
| 12 | 2D-2 | defect |
| 13 | 2D-4 | design |
| 14 | 2C-3 | design |
| 15 | 2E-1 | defect |
| 16 | 2T-1 | defect |
| 17 | 2T-2 with 2T-9 (the snippet check) | defects |
| 18 | 2T-3 | defect |
| 19 | 2T-4 | defect |
| 20 | 2T-5 | defect |
| 21 | 2T-7 | defect |
| 22 | *Upgrading from 2.x*: 2E-4, 2H-4, 2H-5, 2H-7 | docs batch |
| 23 | Session storage pages: 2A-5, 2A-6, 2H-6, 2Z-2 | docs batch |
| 24 | Locator pages: 2B-2, 2B-3, 2C-1, 2C-2 | docs batch |
| 25 | Page objects and URLs: 2D-3, 2D-5, 2Z-1 | docs batch |
| 26 | Steps: 2E-2, 2E-3 | docs batch |
| 27 | Packaging and versioning: 2F-1, 2F-2, 2F-4 | docs batch |
| 28 | CI pages: 2G-3, 2G-4, 2G-5, 2H-1 | docs batch |
| 29 | README and wording: 2H-2, 2H-3 | docs batch |
| 30 | Contributor guide: 2I-3, 2I-6, 2I-7, 2I-9, 2T-8, 2F-3 | docs batch |
| 31 | 2I-5 | docs |
| 32 | 2Z-3 | docs |
| 33 | Closing: items met outside the segments and filed by none (report §9), the notes outside the findings | checklist |

## Building the plans (agreed 2026-10-29)

The triage is finished before the plans are built, except for an item that needs the maintainer's action on GitHub or
the release path (item 1, decision 79, built at once). A plan is written as soon as its area's items are decided; an
area's docs batch joins its plan, so each page is edited once. Then the plans are built in this order, with commits per
plan, and the maintainer pushes after each plan or group so CI checks them:

1. The checks (2T, items 16 to 21), which guard every later change.
2. The code areas, each with its docs batch: session storage (`PLAN-2A-session-storage.md`, with item 23), locators
   (2B-1, 2B-4, 2C-3, with item 24), page objects and URLs (2D-1, 2D-2, 2D-4, with item 25), steps and logging (2E-1,
   with item 26), packaging (item 27); then *Upgrading from 2.x* (item 22), which quotes the messages they change.
3. The CI pages and the contributor guide (decision 82 with items 28, 30, 31 and 32), which describe the result.
4. The benchmarks (decision 107): reviewed, fixed, rerun, and *Internal → Performance* rewritten from them, on the final
   code.
5. The closing checklist (item 33), then the cleanup that removes both review folders.

## Decisions

## 79. The release window: pull requests held while a release publishes, and Publish judges `main` (2026-10-28)

**Settles**: [2G-1](G-ci-release-publishing/defect-2G-1-publish-guard-judges-the-tested-commit.md),
[2G-2](G-ci-release-publishing/defect-2G-2-publish-rerun-goes-on-after-main-moved.md); item 1.

**The case**: a version on `main` that npm does not have while changesets are pending is never published:
changesets/action publishes only when no changeset is pending, and its next Version Packages pull request bumps past
that version. `main` gets there when something with a changeset lands between merging the Version Packages pull request
and its publish (6½ minutes for 3.0.1, 11 for 3.0.0), or when a Version Packages pull request that has not caught up
with `main` is merged. Decision 4's guard judged the tested commit, so it missed a release commit whose own run never
came and the stale Version Packages pull request, failed a release that the next run publishes, and let a re-run go on
after `main` moved.

**Decided**:

1. **A `release` job in `pr.yaml`**, part of the gate `build`, judges the pull request's merge commit: it passes when
   that commit's version is on npm, or when the pull request sets the version with no changeset pending (the Version
   Packages pull request); it holds the pull request, up to 30 minutes, while `main`'s version is not on npm (a release
   is publishing); it fails at once a pull request that sets the version while changesets are pending (a Version
   Packages pull request brought up to date with `main` after a changeset landed).
2. **Two rulesets replace `main`'s branch protection rule**, set up by the maintainer (the plan's guide): `main: review`
   (a pull request, one approval, Code Owners, conversations resolved), which repository admins may bypass for pull
   requests only, since the only maintainer cannot approve their own pull requests; and `main: checks` (`build`, up to
   date, no deletion, no force push), which nobody may bypass, so the hold binds every merge. GitHub's docs give each
   ruleset its own bypass list ("the rules in the ruleset") and aggregate the rules of all rulesets. Confirmed on
   PR #60 on 2026-10-28: while `build` ran, the merge box offered no way past it; once it was green, it offered the
   bypass of the review rules (on a pull request that is not a draft).
3. **Publish's guard is the safety net**: it reads `main`'s tip from GitHub (a re-run keeps its old checkout); while the
   tip's version is not on npm and changesets are pending there, it reads npm once more after 5½ minutes (npm's list can
   be five minutes old after a publish), then fails and says to revert the Version Packages pull request that set the
   version; it goes on only when the tested commit, `main`'s tip and the checkout are one commit, and otherwise stops
   quietly. No exception for re-runs: deployments follow commit order, re-runs included.
4. **npm is the source of truth**, not the tags: changesets/action pushes a tag only after the publish, so a missing
   tag can follow a published release.
5. **One script for both checks** (`scripts/release-check.sh`), with a test that simulates every path in throwaway
   repositories with a fake npm, run by the `lint` job, and ShellCheck over both scripts there.
6. **`docs/releases.md`** describes the hold and the **Update branch** trap in place of the rule "merge nothing with a
   changeset until that version is on npm".
7. **Not adopted**: GitHub's merge queue (GitHub's docs: "available in any public repository owned by an organization,
   or in private repositories owned by organizations using GitHub Enterprise Cloud"; this one belongs to a personal
   account); publishing as `CI`'s last job (a larger change of the release path before its first Trusted Publishing
   release, and a failed publish would turn `CI` red and hold back the site); a pull-request check without the
   up-to-date rule (it judges the base its run saw); required reviewers on the `npm` environment (every Publish run
   would wait, and the window would grow); a pull-request check in place of the guard (it neither sees a merge made
   while a ruleset is disabled nor stops a stale re-run).
8. **Replaces decision 4's points 2 and 4** (the check on the tested release commit; "the gap is accepted"). Its
   recovery by revert stays.

**Why**: the window closes where it opens, at the merge, for every pull request, the maintainer's own included; Publish
keeps the design of decisions 72 and 74; the guard reports a merge made while a ruleset is disabled, and stops a stale
re-run.

**Depends on / affects**: decision 4; item 28 (2G-5, 2H-1) edits the same section of *Tests and checks*. Plan:
[PLAN-2G-1-2G-2-release-window.md](PLAN-2G-1-2G-2-release-window.md).

## 80. A waiting call of a helper without an origin stays with the origin it was made on (2026-10-29)

**Settles**: [2A-9](A-session-storage/defect-2A-9-unbound-waiting-call-acts-on-other-origin.md); item 2.

**The case**: `set`, `get` and `clear` take their turn on the chain of the origin the page is on at the call. When the
turn starts, a helper with an origin checks that the page is still on it; a helper without one checks nothing, so a call
that waited while the page moved writes into, reads or clears the new origin's storage (reproduced again on
2026-10-29). The docs, the guide and the changeset of the turns, which are new in 3.0.2 (`34c2ec0`, not in v3.0.1),
promise that every call that waited checks the origin again.

**Decided**:

1. **When its turn starts, a call of a helper without an origin compares the page with what it joined**: the origin; on
   a page-wide turn (a URL without an origin), the URL whole, as `guarded` compares it during a call. When they differ,
   the call fails and does nothing. Not the review sketch's narrow form, which leaves a page-wide call unchecked (an
   `about:blank` popup that inherited one origin and then commits on another); the accepted cost is a popup that waited
   on `about:blank` and then commits on the origin it inherited, which fails though its storage is the same, as a call
   in flight already does in `guarded`.
2. **The message**: `<label>.SessionStorage.<method>: the page left <origin or URL> for <origin or URL> while
   <method>() waited for its turn; the call did nothing`, listed on *Error messages*, in the *Throws* of `set`, `get`
   and `clear` and in their `@throws`; *Session storage* says that a call that waited stays with the origin it was made
   on, under the helper without an origin. Re-joining the new origin's chain was rejected: the call would act on an
   origin it was not called on.
3. **No new changeset**: the turns are unreleased, so `.changeset/storage-calls-take-turns.md` is corrected (it promises
   "the usual origin message", which a helper without an origin does not throw).
4. **Planned with the other session storage items** (2A-1, 2A-2 with 2A-10, 2A-3, 2A-4, 2A-8) as one plan once item 8 is
   decided: one harness run, one docs pass, and 2A-3, which changes the start of the same three methods, in the same
   place.

**Why**: the documented turn-start check holds for every helper, and a wrong-origin write, read or clear is silent.

**Depends on / affects**: 2A-3 (item 6), same methods. Tests: unit (`sessionStorage.test.ts`, fake page: the waiting
call fails and does nothing, origin and page-wide, a bound control) and harness (`sessionStorage.spec.ts`, *the page
commits on the other origin between two calls that both succeed*: `set`, `get` and `clear`, the other origin's storage
untouched, and a control that a helper without an origin still follows the page between awaited calls).

## 81. `seed`'s Navigation API check waits out a chain of redirects, up to 20 documents (2026-10-29)

**Settles**: [2A-1](A-session-storage/defect-2A-1-seed-fails-during-redirect-chain.md); item 3.

**The case**: a page's first `seed` evaluates once in the current document to check the Navigation API, and tries once
more when a navigation destroys the evaluation. On Chromium, a page that replaces its document twice or more during the
check (an app's chain of script redirects on load) fails every such seed with Playwright's "Execution context was
destroyed" (reproduced again on 2026-10-29: 2, 3 and 5 redirects, 15 of 15 seeds each; one redirect, none). Shipped in
v3.0.1 (`7ad64e2`).

**Decided**:

1. **The evaluation is repeated while it fails because the document was replaced and the page is open, up to 20
   times**; any other error is tried once more, as now. The error is told apart by Playwright's text, as `guarded`
   already does; CI's harness at the latest Playwright 1.x would show a change of that text. Each failed try is one
   replacement (Playwright evaluates in the new document once it exists), so 20 bounds replacements, not time; it
   follows the default of Playwright's `maxRedirects` (20, API requests' own HTTP redirects), a convention rather than
   a limit: browsers set none on script redirects, and HTTP redirects commit one document, which never needed more than
   the one retry. The code's comment says so. Without the bound, as the review's sketch had it, an app stuck in a
   redirect loop would keep `seed` retrying until the test's timeout. Amended by decision 121 (2026-10-30): one
   replacement can fail several tries, so the bound counts retries, and each retry follows Playwright's pause before
   its actions' retries.
2. **No new message**: past the bound, Playwright's error goes through with the label, which *Error messages* covers
   ("Any other error from Playwright gets the label in front of its message and is the `cause`").
3. **A patch changeset**: `seed` no longer fails on Chromium when the page replaces its document more than once during
   its first seed's check.
4. **In the session storage plan** (decision 80, point 4).

Rejected: a document of POMWright's own for the check (`src/helpers/AGENTS.md` rules out a page of its own for `seed`);
the browser's name and version (a version table instead of the browser).

**Why**: seeding the next origin while the app redirects itself is the pattern *Seeding session storage* teaches, and on
Chromium it failed every time with a message that names no cause.

**Depends on / affects**: nothing else changes `assertNavigationApi`. Tests: unit (`sessionStorageSeed.test.ts`: an
evaluation destroyed 3 times then answering registers; destroyed 21 times fails with Playwright's message; another
error twice fails, as now) and harness (`sessionStorage.spec.ts`: chains of 2, 3 and 5 redirects on all three
browsers). Docs: *Internal → Seed registry*, *The checks in `seed`*.

## 82. The guide routes every task to the rules it triggers (2026-10-29)

**Settles**: [2I-2](I-contributor-guide/defect-2I-2-rules-their-trigger-does-not-reach.md),
[2I-1](I-contributor-guide/defect-2I-1-dev-dependency-rule-in-src.md),
[2I-8](I-contributor-guide/defect-2I-8-subfolder-files-do-not-point-to-src.md); item 4.

**The case**: the guide's own placement rule (`docs/repository.md`: a rule goes "in the file that loads for every
change that can trigger it", or the trigger's file points to it) fails for rules the split left where their trigger
does not lead: the page updates after a change of mechanism or design (`website/AGENTS.md`, reached only for a doc
comment, a message, a chain or a rendering, and not at all from `.github/`, whose commits left three Internal pages
stale in this review: 2H-1, 2G-3, 2G-5); what moves with the Node floor (only in `.github/AGENTS.md`); three of the
Playwright floor's eight places listed; the benchmark rerun; a split *Do not* item; the dependency rules (only in
`src/AGENTS.md` and `website/AGENTS.md`); and, for a client that loads no folder file, the `src/` subfolder files'
silence about `src/AGENTS.md`. Re-checked at the branch on 2026-10-29.

**Decided**:

1. **Routing where it always loads**: the root index's `website/AGENTS.md` row also names "changing anything a page or
   doc comment describes: behavior, a message, chain or rendering, a mechanism or a design (most changes under `src/`
   and `.github/`)"; `src/AGENTS.md` *Rules held elsewhere* says the same; `.github/AGENTS.md` points to the CI pages
   (*Internal → Tests and checks*, *Internal → Documentation*) and the rule that a change updates them.
2. **The gaps**: a Node-floor bullet in `docs/versioning.md` (`engines`, what moves with it, the manual `EBADENGINE`
   check before the release); its Playwright bullet lists all eight places; `src/locators/AGENTS.md` points to the
   benchmark rerun; `test/AGENTS.md` *Do not* has the whole item again (a second build in a harness job,
   `POMWRIGHT_TARBALL`); both dependency rules move to `docs/repository.md` *Toolchain*, with a pointer left in
   `src/AGENTS.md`; the root's fallback reads "the folder's file and those of the folders above it", and the intros of
   `src/locators/AGENTS.md` and `src/helpers/AGENTS.md` name `src/AGENTS.md`.
3. **The root keeps its Playwright floor with the reasons** (1.59, 1.61, 1.63, 1.64), listed among the eight places.
4. **One contributor-guide plan** with items 28, 30 and 31, which edit the same files, once they are decided.

Rejected: coarse rows ("any change under `src/`" reads `website/AGENTS.md`), which make every task read more; the
widened row gets most of their reach.

**Why**: the guide is how agents and contributors find the rules, and this review shows the cost of a rule its trigger
does not reach.

**Depends on / affects**: items 28, 30, 31. No tests and no changeset; checked by tracing three tasks through the index
and the pointers after the edit (a mechanism change in `src/helpers/`, moving the Node floor, a workflow change).

## 83. A failed storage call is explained from `document.domain` (2026-10-29)

**Settles**: [2A-2](A-session-storage/defect-2A-2-no-origin-message-on-inherited-or-closed-popup.md),
[2A-10](A-session-storage/defect-2A-10-opaque-check-reads-shadowable-origin.md); item 5.

**The case**: `access()` says "the page has no origin yet" for any failure on a URL without an origin, also on an
`about:blank` popup that inherited its opener's origin (a quota error) and on a closed page; and it tells an opaque
origin from `self.origin`, which a page's own `var origin = …` replaces, so a sandboxed document with such a script gets
the browser's wording instead of the opaque message.

**Decided**:

1. **One evaluation on failure, judged by `document.domain`**, which the HTML spec makes `""` exactly for an opaque
   origin and which no global of the page replaces. Probed on 2026-10-29 on chromium, firefox and webkit
   (the probe `A/triage/domain.spec.ts` in the second review's probes folder): `""` on sandboxed documents, with
   or without `var origin` or `var domain`, and on a new page's `about:blank`; the host on an ordinary document and on
   an `about:blank` popup that inherited its origin. A URL without an origin and `""`: "the page has no origin yet",
   unchanged; a URL without an origin and a host (an inherited popup), or an evaluation that fails (a closed page):
   Playwright's error, labeled; a URL with an origin and `""`: the opaque message; otherwise Playwright's error,
   labeled. Not the review's sketches: 2A-2's still reads `self.origin`, and 2A-10's takes a throwing or missing
   `sessionStorage` getter for an opaque origin, which a browser with storage turned off also has (Firefox's
   `dom.storage.enabled=false` makes it `null`).
2. **`self.origin` stays where the origin itself is needed** (`assertInheritedOrigin`, `seed` on a popup):
   `document.domain` is a host, not an origin.
3. **No new changeset and no new message**: `.changeset/sandboxed-document-message.md` (the opaque message is
   unreleased, `17426a5`) gains the popup and the closed page; "the page has no origin yet" shipped in v3.0.1.
4. **In the session storage plan** (decision 80, point 4).

**Why**: the explanation is promised on every browser, and a wrong one ("navigate first") sends the reader the wrong
way.

**Depends on / affects**: Firefox's error page is not in the probe (its failed navigation left no error page at the
URL): the harness's *a document with an opaque origin › after a failed navigation to the origin* must stay green on all
three browsers. Tests: unit (`sessionStorage.test.ts`, *a refused storage call*: an inherited popup, a closed page, an
opaque document, an ordinary one) and harness (`sessionStorage.spec.ts`, all three browsers: a sandboxed document with
`var origin` gets the opaque message; a 6 MiB write on an inherited popup and a call after `popup.close()` get
Playwright's errors, labeled).

## 84. A storage call takes its arguments at the call (2026-10-29)

**Settles**: [2A-3](A-session-storage/defect-2A-3-inputs-read-after-the-call.md); item 6.

**The case**: `set` and `seed` read their entries (and `seed` its `options.origin`) inside the step's body, which can
start after the call returned, and `get` and `clear` read their key lists in the turn, which can wait behind other
calls. A caller who changes what it passed while the call is pending changes what the call does (reproduced again on
2026-10-29: `set` and an on-origin `seed` stored the mutated value; `get(["k"])` returned `k` and the key added later).
Playwright's calls take their arguments at the call (the review's probe p05: `page.evaluate` saw them as passed).

**Decided**:

1. **Every argument is taken at the call, before the step**: the values are encoded then (the codec runs at the call;
   its error is held and thrown inside the step after the origin check, so the step, the message, the line and the
   order of errors stay as they are); the key lists of `get` and `clear` are copied; `seed` reads `options.origin`
   (normalised in the step, as now). As `seed` already takes its snapshot of the page "before the step". Not the
   finding's shallow copies with the encoding documented: a change inside an object value would still reach the call.
2. **No new changeset**: `.changeset/storage-calls-take-turns.md` (unreleased) says that a call takes its arguments at
   the call, as Playwright's do; the turns are what made a call read them late.
3. **In the session storage plan** (decision 80, point 4).

**Why**: overlapping calls are to end exactly as awaited ones do, and POMWright mirrors Playwright.

**Depends on / affects**: decision 80 changes the same methods. Docs: *Session storage*, *The methods* (one sentence).
Tests: unit (`sessionStorage.test.ts`: arguments changed after the call, for `set` with a codec value object, `get`,
`clear` and `seed` with `options.origin`, act as passed; a codec error still comes inside the step after the origin
check) and harness (`sessionStorage.spec.ts`: the review's probe P1).

## 85. Storage messages quote the keys they name (2026-10-29)

**Settles**: [2A-4](A-session-storage/defect-2A-4-keys-unquoted-in-messages.md); item 7.

**The case**: the message of a batch a navigation stops (`eachKey`) and the seed messages (`describeKeys`) list keys
bare, joined by `", "`, so an empty key disappears (`()`, `(keys: )`) and a key holding `", "` reads as two, while the
messages of `get` and of the encoding quote their key.

**Decided**:

1. **Every key a message names is quoted with `JSON.stringify`**, as `get`'s messages do: `("k0", "k1")`, `"k2" was
   being written`, `(keys: "orderId")`. Not quoting only unusual keys: a harder rule, and messages unlike `get`'s.
2. **Changesets**: the batch messages are new in 3.0.2 (`e8831b8`, `56229e2`); the four pending changesets that quote
   these messages (`batch-navigation-message.md`, `empty-seed.md`, `never-applied-several-seeds.md`,
   `seed-closed-page-message.md`) get the new form. Two seed messages shipped in v3.0.1 (`could not write
   sessionStorage for … (keys: …)` and `the seed for … (keys: …)`), so a new patch changeset says that storage messages
   quote the keys they name.
3. **In the session storage plan** (decision 80, point 4).

**Why**: a message is to name what it is about, and the batch message exists to name the keys done and the one in
flight.

**Depends on / affects**: every page and `@throws` that shows these messages (*Session storage*, *Seeding session
storage*, the API page's `set`, `clear` and `seed`, *Error messages*, which `check-error-messages.mjs` compares with the
source) and the harness specs that assert them. Tests: unit (an empty key and one holding `", "`, in
`sessionStorage.test.ts`, *a batch the page leaves*, and `sessionStorageSeed.test.ts`, the message builders).

## 86. A navigation within the origin still stops a call, and the message says where the page went (2026-10-29)

**Settles**: [2A-8](A-session-storage/defect-2A-8-same-origin-navigation-stops-a-batch.md) (design); item 8.

**The case**: a storage call fails when the document goes away during it, also on a reload or a redirect within the
origin (the review's probe: a reload 5 ms into a 60-key `set` fails every round on three browsers). The origin's storage
is the same, so the review asked whether the interrupted key should be repeated and the batch finished.

**Decided**:

1. **The call keeps failing**: no repeat. Writing storage while the app reloads or redirects itself is a race; the new
   document's scripts can read storage before repeated keys land, so a silent repeat would turn a failure at its cause
   into a flaky test later, and Playwright's own `page.sessionStorage` fails here too. A call that finished before the
   reload is not affected (the harness: values set before a reload survive it; a seed on the origin is seen after a
   reload; a seed is not written again when the app reloads or replaces itself).
2. **The navigation messages name where the page went**, its origin and path, without query or fragment, so that a
   redirect's tokens do not reach the report: `… the page navigated to https://shop.example/home while set() was
   writing to https://shop.example; …`, for `set`, `get`, `clear` and the on-origin writes of `seed`; a destination
   without an origin prints the whole URL, as `guarded` compares it; the destination is the page's URL when the message
   is made. Amended by decision 118 (2026-10-30): once the call's document went away, it is the URL the page's current
   document reports, since `page.url()` can still name the start page then.
3. **The docs say it**: *Session storage*, *The methods*: a navigation within the origin stops a call too, since the
   call was in flight in a document that went away; await the navigation first, or seed before it.
4. **In the session storage plan, no new changeset**: these messages are new in 3.0.2 (`e8831b8`); the examples in
   `.changeset/batch-navigation-message.md` change, with decision 85's quoting.

Rejected: repeating the interrupted key while the origin is unchanged (a loop in `guarded`, a helper unlike
Playwright's, and the race hidden).

**Why**: the failure shows a test's race where it happens, and the destination answers the finding's point that the
message sent the tester looking for a move to another origin.

**Depends on / affects**: decision 85 (the same messages). Tests: unit (the destination with origin and path, a query
and a fragment dropped, a destination without an origin) and the harness's existing navigation tests, whose assertions
follow.

## 87. `getById` handles a unicode-mode RegExp; the strategies Playwright builds are documented (2026-10-29)

**Settles**: [2B-1](B-registration-and-resolution/defect-2B-1-unicode-regexp-quote.md); item 9.

**The case**: `getById(RegExp)` passes a `u` or `v` RegExp into `internal:attr=[id=/…/flags]` unescaped, as Playwright's
own escaper does (1.64.0's `escapeRegexForSelector`), so a quote, a backtick or `>>` in it breaks Playwright's selector
parser (reproduced again on 2026-10-29: `/a"b/u`, `/it's/v`, `/a>>b/u`). The strategies Playwright builds
(`getByRole`'s `name`, the text strategies, `getByTestId`, `filter({ hasText })`) fail the same way once anything is
chained, and POMWright always chains (`describe`): Playwright's bare `page.getByRole("button", { name: /don't save/iu
})`
works, its `.first()` and POMWright's resolution fail. Upstream,
[#40446](https://github.com/microsoft/playwright/issues/40446) was closed on 2026-04-28 as not planned, without "a
proper product need". Shipped in v3.0.1.

**Decided**:

1. **`getById` writes, in unicode mode, `"`, `'` and `` ` `` as `\x22`, `\x27`, `\x60` and the second `>` of `>>` as
   `\x3e`**: exact, since unicode mode cannot backslash-escape a quote, and rewriting the second `>` keeps a named
   group's closing one. Only the selector text changes, not the RegExp.
2. **The strategies Playwright builds are documented** on *Registering locators*: the limitation, that POMWright's chain
   makes it apply where a bare Playwright locator works, the workaround (write the character as `\x27` and the like, or
   drop `u`), and a link to #40446. Not rewriting every RegExp POMWright hands to Playwright: code at every place a
   RegExp reaches Playwright, a rendering unlike what was written, for a Low item upstream declined.
3. **A new patch changeset** for `getById`, which links #40446 for the limitation that remains. No comment on #40446.
4. **In the locators plan**, with item 24's docs batch.

**Why**: *Locating by id* promises that every flag goes to Playwright unchanged and a RegExp is never rejected;
`getById` is POMWright's own selector.

**Depends on / affects**: tests: unit (`utils.test.ts`: the case pinning the unescaped output replaced; a character
class, a `v`-mode `\q{…}`, a named group before `>>`, `>>>`) and harness (`add.getById.spec.ts`, `testIds.spec.ts`:
the three cases on all three browsers).

## 88. `verify()` reports an `add(path)` that never got a locator method (2026-10-29)

**Settles**: [2B-4](B-registration-and-resolution/defect-2B-4-add-without-locator-method.md) (design); item 10.

**The case**: `this.add("main.form@login");` as a statement registers nothing; the next registry call drops it, and
every chain below that path leaves the segment out, while `verify()` passes (the review's probe:
`locator('main').getByRole('button', { name: 'Log in' })`, the form lost). TypeScript accepts the statement, and
`strictChains: true`, which reports the missing ancestor, is opt-in. *Verifying a registry* promises that the mistakes
that are not compile errors are found "all at once".

**Decided**:

1. **`verify()` reports every `add(path)` that ended without a locator method**, unless its path is registered later.
   The registry remembers them in `endOpenRegistration`, which already records the call that ended a registration;
   `verify()` ends the open registration first, so the last one is covered. Not a throw at the call that ends it (an
   error from an unrelated, later call), and not docs only (the wrong chain stays silent).
2. **A registry that passes today may fail `verify()` in a patch**: such an `add` has no use and is always a mistake,
   and `docs/versioning.md` makes behavior brought in line with what the docs promise a patch. Checked on 2026-10-29:
   the two external consumer projects hold no such statement (0 among the 682 `add(` calls in their files that use
   POMWright; the search covers the one-line form biome writes).
3. **The message**, in `verify()`'s format: `"main.form@login": add("main.form@login") ended without a locator method
   (at add("main.form@login.button@login")); give it one or remove it`; listed on *Error messages* (*Resolving and
   verifying*), in `verify()`'s `@throws`, on *Verifying a registry* (*What it finds*) and *Internal → Resolution*
   (*What it reports*). In a page object it comes at the first use, labeled, as every registry mistake does.
4. **A new patch changeset** (released behavior), saying that a registry with such an `add` now fails `verify()` and how
   to fix it; **in the locators plan**.

**Why**: the check exists to find the mistakes the compiler cannot, and this one silently changes chains.

**Depends on / affects**: tests: unit (`locatorRegistry.test.ts`: a stray ancestor, a stray leaf, one ended by
`verify()`, one whose path is registered later and is not reported) and harness (`registry.verify.spec.ts`: the
review's probe).

## 89. A navigation wait that times out on the load state of the right URL says so (2026-10-29)

**Settles**: [2D-1](D-page-objects-urls-navigation/defect-2D-1-load-state-timeout-message.md); item 11.

**The case**: `expectThisPage()` and `expectAnotherPage()` wait with `page.waitForURL`, which also waits for the load
state; when the URL is right and the state is late, the message names the URL found as the one not expected
(reproduced again on 2026-10-29: `ItemPage: expected URL "…/item/7"; found "…/item/7" (page.waitForURL: Timeout 1000ms
exceeded.)`). The message shipped in v3.0.1.

**Decided**:

1. **On a `TimeoutError` whose URL found passes the wait's own predicate, the message says the URL was reached and the
   load state was not**, naming the requested state (`load` when none): `ItemPage: reached "…/item/7", but its "load"
   state did not come in time (page.waitForURL: Timeout 1000ms exceeded.)`, and for `expectAnotherPage()`
   `ItemPage: left "…/item/7" for "…/item/8", but its "load" state did not come in time (…)`. As the review's sketch,
   with "reached" for its "on" and the parse of `page.url()` guarded so that it cannot hide Playwright's error. Other
   errors (a closed page, an invalid `waitUntil` from JavaScript) keep today's message. Not docs only: the message
   would still contradict itself.
2. **Both messages are listed** on *Error messages* (*Navigation*), in the *Throws* of both methods on
   `api/class-navigation.md`, in their `@throws`, and on *URLs and navigation* (*Options and timeouts*).
3. **A new patch changeset**; **in the page objects and URLs plan**, with item 25's docs batch.

**Why**: the wait's message is to say what failed, and here it named the right URL as the wrong one.

**Depends on / affects**: tests: unit (`navigation.test.ts`: a stub page whose `waitForURL` rejects with a
`TimeoutError` while `url()` matches, and a control that does not match) and harness (`testNav.spec.ts`: both methods,
on the held-image route the spec already builds). The review's gate: 6 failed at `d850405` on three browsers, 9 of 9
with the sketch, the mismatch cases unchanged.

## 90. On a RegExp `baseUrl`, `goto`'s target type requires a scheme that starts with a letter (2026-10-29)

**Settles**: [2D-2](D-page-objects-urls-navigation/defect-2D-2-absolute-url-type.md); item 12.

**The case**: `AbsoluteUrl` is `` `${string}:${string}` ``, so on a RegExp `baseUrl` a relative target holding a colon
(`"/orders?at=12:00"`, `"?at=12:00"`, `"1:2"`) compiles, and the runtime always rejects it; the docs say that message
comes "from JavaScript".

**Decided**:

1. **`` type AbsoluteUrl = `${Letter}${string}:${string}` ``**, `Letter` the 52 ASCII letters: every target that starts
   with `/`, `?`, `#`, `.` or a digit is a compile error. A relative path that starts with a letter and holds a colon
   (`a/b:c`) still compiles, as no template type can say more; its doc comment says so, and the docs' "from JavaScript"
   becomes "from JavaScript, or for a relative path the type cannot tell apart (one that starts with a letter and holds
   a colon, `a/b:c`)" in `api/class-navigation.md`, *Error messages* and `goto`'s `@throws`. Not docs only: the type
   would keep letting an ordinary mistake through.
2. **The target type stays unexported**; *URLs and navigation* (*Pages whose URL varies*) shows the narrowing of a
   `string` with `` url as `https://${string}` ``. Exporting it would be a minor and a separate decision.
3. **A new patch changeset** (only code that always threw stops compiling; `docs/versioning.md` puts `GotoTarget`
   outside
   the type promise); **in the page objects and URLs plan**.

**Why**: the type is to reject what the runtime always rejects, as far as a template type can.

**Depends on / affects**: tests: `test/tests/packaging/publicTypes.typecheck.ts`, *navigationCalls*: `@ts-expect-error`
for the three relative forms on a RegExp-base page object and through `NavigationFor<RegExp, UrlMatcher>`; accepted
`"HTTPS://shop.example/x"` and `` `https://${host}/x` ``. The review's gate: its four directives unused at `d850405`,
used with the sketch.

## 91. The navigation methods stay unbound (2026-10-29)

**Settles**: [2D-4](D-page-objects-urls-navigation/defect-2D-4-detached-navigation-methods.md) (design); item 13.

**The case**: `goto`, `expectThisPage` and `expectAnotherPage` are methods of the navigation helper; taken off it
(`const { goto } = loginPage.navigation; await goto()`) they fail with JavaScript's own `TypeError: Cannot read
properties of undefined (reading 'fullUrl')`, at the calling line. No page or doc comment says they can be taken off.
`loginPage.navigation.goto()` is not in question: the grouping under `navigation` stays.

**Decided**: **not adopted**, and no backlog issue: it is a design choice, not a defect; Playwright's own methods are
not
bound either; the failure is immediate. Binding them would be safe (bound once per page object; the step location's
boundary is the method's own frame; to be shown by a unit test and a step-location case), but it is a new way of
calling them that nothing promises, which `docs/versioning.md` makes a minor, so it never belonged in 3.0.2. It is
reconsidered if someone asks for it.

**Why**: an API promise for a convenience nobody has asked for, against the rule of mirroring Playwright.

## 92. `replace().frameLocator()` on the query's own path stays a runtime check; the docs say so (2026-10-29)

**Settles**: [2C-3](C-queries/defect-2C-3-replace-any-frame-terminal-compiles.md) (design); item 14.

**The case**: `replace().frameLocator()` without a selector on the query's own path always throws, at the call, with a
message that names the fix; it compiles (`publicTypes.typecheck.ts:91` compiles one), while `skip` of that path does
not.

**Decided**:

1. **No type change**: a conditional parameter list would risk a generic base class that adds paths, where the
   condition can stay deferred and `replace(ancestor).frameLocator()`, which compiles today (decision 20), could stop
   compiling; it would add to an intricate type layer, and a template or union path would keep the runtime check.
2. **One clause on *Queries*** (*The any-frame form in a query*): the types do not catch it, and it throws at the call,
   unlike `skip`, which TypeScript does not offer; in item 24's docs batch, with 2C-1.
3. **A one-line comment at `publicTypes.typecheck.ts:91`**: the call compiles and throws at run time.

**Why**: the error is immediate and names the fix; the type change's risk outweighs its benefit.

## 93. The query builder's path-less forms and `unskip`'s types get the tests they lack (2026-10-29)

**Settles**: [2R-1](R-triage/defect-2R-1-query-default-path-test-gaps.md) (a test gap found in the triage, item 14).

**The case**: the maintainer's statement of the contract checks out in the code: without a path, `update`, `replace`,
`nth`, `filter` and `clearSteps` act on the query's own path, as with that path written out; `skip` and `unskip` always
take an ancestor; `describe` takes no path and applies to the query's own. Two tests are missing: `update()`,
`replace()` and `clearSteps()` are never compared with their explicit form, and nothing shows that `unskip()` and
`unskip(ownPath)` do not compile.

**Decided**: **cover both gaps**, tests only, in the locators plan: the three side-by-side comparisons in
`getLocatorSchema.clearSteps.spec.ts`, and `@ts-expect-error` for `unskip()` and `unskip(ownPath)`.

**Why**: the equivalence is a documented contract, and only a test keeps a later change from breaking it unnoticed.

## 94. The locale hint drops a POSIX codeset and gives none for a modifier (2026-10-29)

**Settles**: [2E-1](E-logging-step-fixture/defect-2E-1-locale-hint-names-rejected-tag.md); item 15.

**The case**: the locale check hints the value with hyphens, so a POSIX name as `LANG` holds it gets a hint the same
check rejects (reproduced again on 2026-10-29: `en_US.UTF-8` → `en-US.UTF-8`, `nb_NO.utf8` → `nb-NO.utf8`). The hint
is new in 3.0.2 (`b28686b`).

**Decided**:

1. **The hint drops the codeset (`.…`), hyphenates, and is given only when `Intl.getCanonicalLocales` accepts it; a
   value with a modifier (`@…`) gets no hint**: `en_US.UTF-8` → `en-US`, `nb_NO.utf8` → `nb-NO`, `zh_Hant_TW` →
   `zh-Hant-TW`; `sr_RS@latin` and `de_DE@euro` no hint. Not the review's sketch, which dropped the modifier too: a
   modifier can change the script (`sr_RS@latin` is BCP 47 `sr-Latn-RS`; the sketch's `sr-RS` formats January as
   `јануар` instead of `januar`, checked with Node on 2026-10-29), so the hint would be valid and wrong. The codeset is
   only an encoding, which a tag has no place for.
2. **Docs and changeset**: *Logging* says that a POSIX name such as `en_US.UTF-8` is not a tag (write `en-US`);
   `.changeset/log-locale-check.md` (unreleased) gets the POSIX case; no new changeset. The message's wording is
   unchanged.
3. **In the steps and logging plan**, with item 26.

**Why**: a message is to say what to change, and a hint the check rejects says the wrong thing.

**Depends on / affects**: 2E-4 (item 22, the upgrade guide). Tests: unit (the values above, `C.UTF-8` without a hint,
and every hint given accepted by `Intl.getCanonicalLocales`).

## 95. The docs-chains and outcomes specs read the pages (2026-10-29)

**Settles**: [2T-1](T-tests-and-checks/defect-2T-1-docs-checks-compare-copies.md); item 16.

**The case**: `docsChains.spec.ts` and `lifecycle.outcomes.spec.ts` compare the code with copies of the pages held in
the specs, so a page edited alone passes (the review's gated demonstration: a chain on *Queries* and a row of the
outcomes table changed, both specs green). Decision 59 promised that "a change to a chain fails until the spec and the
page are updated together", and *Tests and checks* that a stale chain "names its page".

**Decided**:

1. **Both specs read their pages**: `docsChains.spec.ts` reads each test's page once and asserts that the page holds
   every chain it compares, the seven rendered at run time included; whitespace and comment markers are normalised on
   both sides, so a chain wrapped over comment lines is still found; Firefox's `"    ..."` line, which the page leaves
   out on purpose, is a named exception. `lifecycle.outcomes.spec.ts` parses the rows under *How a mistake is
   reported* and compares them with what it asserts. Not docs only: the drift would stay possible.
2. **The review's demonstration, inverted, is the regression check**: with *Queries*' `.first()` changed to `.last()`
   and an outcomes row edited, both specs fail; run once in the plan, then reverted.
3. **In the checks plan**, built first; tests only, no changeset.

**Why**: the pages' chains and outcomes are to come from the code, and only a check that reads both sides keeps them so.

**Depends on / affects**: 2T-2 and 2T-9 (item 17, the snippet check), 2H-1 (item 28, *Tests and checks*).

## 96. The snippet check reads a fence's language as CommonMark does and judges `tsc` by its exit code (2026-10-29)

**Settles**: [2T-2](T-tests-and-checks/defect-2T-2-snippet-check-misses-spaced-fence.md),
[2T-9](T-tests-and-checks/defect-2T-9-snippet-check-ignores-tsc-exit-code.md); item 17.

**The case**: `scripts/check-doc-snippets.mjs` reads the language right after the backticks (`(\w*)`), so a fence
"```` ts```` " has none and "````TS````" is not `ts`: the site renders both as TypeScript, and the check neither
compiles
nor reports them. It judges `tsc` by the type errors on its stdout, so a `tsc` that fails on stderr only passes, and a
missing one fails with the message `undefined`. No page uses those fences today (2026-10-29: `ts` 238, `text`,
`mermaid`, `sh`, `html`, `bash`, `js`).

**Decided**:

1. **The language is the fence's first word after optional spaces**, as CommonMark reads it; one that is `ts` or
   `typescript` lowercased but not written exactly so is rejected with the fix "write it as ```ts".
2. **A `tsc` that exits non-zero without type errors on stdout fails the check**, with its stderr, or the error's own
   message when it could not start.
3. **Verified with the review's two mirrors, run once in the plan** (the spaced and the upper-case block reported; the
   stand-in `tsc` that fails on stderr failing the check); no committed test of the check script, which runs on every
   CI run against the real pages. Not the site's Markdown library: it would need the site's install where the harness
   has none.
4. **In the checks plan**: the script's header and `website/AGENTS.md` name the rejection; no changeset.

**Why**: "Nothing is skipped silently" (*Internal → Documentation*), and the examples' compiling keeps the docs true to
the types.

## 97. The session storage tests under `test.fail` get assertions that can fail them (2026-10-29)

**Settles**: [2T-3](T-tests-and-checks/defect-2T-3-test-fail-hides-assertions.md); item 18.

**The case**: under `test.fail(true)`, a failing `expect` counts as the expected failure, so the popup test's
`startup(popup)` is `{}` and the refused write's `startup(page)` is `{}` can never fail the run (the review ran each as
written and inverted: all four "failed, expected failed"). The never-applied seed at the page's own close at the end of
the test is checked to fail, never for its message.

**Decided**:

1. **The popup test drops `test.fail`**: it asserts the popup's storage is `{}`, then sends the original page to the
   seeded origin and asserts the seed arrives there, so both halves of its title are checked and it ends cleanly.
2. **The refused write becomes a serial pair**: the `test.fail` test writes what `startup` read to the hand-over file,
   and the next test asserts `{}`; its message stays checked in `callSite.spec.ts`.
3. **The never-applied seed at the page's own close becomes a serial pair that checks its message**, as the explicit-
   close groups (*overlapping seeds that are never applied*) do.
4. **Each new assertion is inverted once in the build** to see it fail, on all three browsers; test files only, no
   changeset; **built in the session storage plan, as its first step** (the same spec file). Not annotations asserted
   elsewhere: more machinery for the same check.

**Why**: an assertion that cannot fail its test gives false confidence, and the popup test is the only check of "a new
tab has its own session storage".

## 98. The step-location and outcomes runs forbid `test.only` in CI (2026-10-29)

**Settles**: [2T-4](T-tests-and-checks/defect-2T-4-steps-config-allows-only.md); item 19.

**The case**: `test/playwright.steps.config.ts` does not build on `playwright.base.ts`, whose `forbidOnly:
!!process.env.CI` stops a committed `test.only` in the harness; with `CI=1`, a stray `test.only` in
`test/step-locations/` checks one file and passes (the review: 1 checked against the baseline's 31).
`test/lifecycle-outcomes/playwright.config.ts` lacks it too. No `.only` is committed (2026-10-29).

**Decided**:

1. **`forbidOnly: !!process.env.CI` in `test/playwright.steps.config.ts` and
   `test/lifecycle-outcomes/playwright.config.ts`**;
   the bench config, never run in CI, stays as it is. Not a reporter that requires every marker of the folder: it would
   fail a filter given on purpose in a local run.
2. **Verified with the review's probe, run once with `CI=1`**: it exits 1 with Playwright's `forbidOnly` error.
3. **In the checks plan**; config only, no docs, no changeset.

**Why**: `test/AGENTS.md` says the step-location run cannot be switched off, and a forgotten `test.only` switched off
nearly all of it.

**Depends on / affects**: 2T-8 (item 30), `playwright.base.ts`'s header on the configs that build on it.

## 99. The API coverage check walks static members and fails on an unresolved import (2026-10-29)

**Settles**: [2T-5](T-tests-and-checks/defect-2T-5-api-coverage-skips-members.md); item 20.

**The case**: `scripts/check-api-coverage.mjs` walks only a class's instance side, so an undocumented public static
member passes (the review's mutation); and when the declarations' `@playwright/test` import does not resolve, it walks
fewer members silently (105 against 108, `FilterDefinition`'s three fields gone) and still reports no problem. No
public static exists, and CI installs the root.

**Decided**:

1. **A class's static side is walked too** (its constructor type, without `prototype`), under the same rules and
   headings.
2. **An import of the declarations that does not resolve fails the check**, found from TypeScript's own diagnostics for
   an unresolved module (TS2307), with "cannot resolve @playwright/test from <path>; install the root first"; the
   declarations' other diagnostics do not start failing it. Not refusing a path outside the repository (statics would
   stay unchecked).
3. **Verified with the review's setups, run once in the plan** (the static rows of `mutate.mjs` fail; the unresolved
   copy fails with the message); the check stays at 108 members and no problem; **in the checks plan**; the script's
   header says so; no changeset.

**Why**: the check promises every public or protected member, and one that covers less than it says is the kind of gap
2T-1 and 2T-9 are.

## 100. The test-server check sees WebSockets, protocol-relative URLs and routers' routes (2026-10-29)

**Settles**: [2T-7](T-tests-and-checks/defect-2T-7-test-server-check-blind-spots.md); item 21.

**The case**: `test/test-server/externalRequests.spec.ts` learns of requests from the context's request events, which do
not report a WebSocket, and scans the server's source for `https?://`, which misses `wss://` and a protocol-relative
`//host`; the review's gated demonstration (a load-time `wss://` WebSocket and a click-time `//cdn.example` fetch on
`/testnav`) passed 26 of 26. Its route walk also lists only routes mounted on the app itself, not through an
`express.Router()`. No page does any of these today.

**Decided**:

1. **`page.on("websocket")` too**, its host checked like a request's.
2. **The scan also finds `wss?://` and a `//` that starts a dotted host name with no word character or colon before
   it**, so a path's `//` and a comment's `// text` stay out; the new scan is run over the current files first, which
   must stay clean.
3. **The route walk descends into routers.**
4. **Verified with the review's demonstration, run once in the plan**: applied, the check fails; the unchanged server
   passes 26. Not docs only (the gaps would stay). **In the checks plan**; `test/AGENTS.md` says what the scan covers;
   no changeset.

**Why**: the check exists so that the harness neither depends on nor leaks to another host, and its header promises
every request.

## 101. *Upgrading from 2.x* corrected, and it says a project meets only some of its items (2026-10-29)

**Settles**: [2E-4](E-logging-step-fixture/defect-2E-4-upgrade-page-omits-locale-check.md) (with 2H-8),
[2H-4](H-docs-site-readme/defect-2H-4-upgrade-guide-stale-ts2339.md) (with 2A-7),
[2H-5](H-docs-site-readme/defect-2H-5-upgrade-guide-two-compile-errors.md),
[2H-7](H-docs-site-readme/defect-2H-7-upgrade-javascript-item-no-search.md); item 22.

**The case**: the page promises to list everything that does not keep working, each item marked and, where a change is
needed, with a search. Checked on 2026-10-29 at the branch: *Log attachments keep what was logged* is marked
**Compiles**, though a `locale` `Intl` rejects (`en_US`), which 2.x ignored, fails every test that requests `log`; the
quoted `TS2339 … on type 'string | null'` is 3.0.1's (since `f422b77`: `'string | { name: string; age: number; } |
null'`); no item says `createRegistryWithAccessors(page)` needs its paths as a type argument (TS2345); the storage item
is marked **Compiles**, though a structured value without a codec does not compile (TS2322); the frame item's search
holds `first()` and `last()`, which no registration has (and the README's mirror, `README.md` lines 165-166); the
JavaScript item (`describe` and `nth`) gives no search.

**Decided**:

1. **The four fixes**: the log item marked **fails at run time** for such a locale, with the message, a search for
   `locale:` in the configs and a link to *Names in your locale*; the TS2339 line replaced, the three errors in `tsc`'s
   order; a **compile error** item for the registry's type argument with its search; the storage item "**compiles** for
   strings; **compile error** for structured values without a codec"; `first()` and `last()` dropped from the frame
   item's search, on the page and in the README; a search for the JavaScript item. Every quoted message and type error
   copied from a probe against the build (the review's probes; 2H-5's 2.x side needs a v2.1.0 worktree recreated, as
   its finding says), since the snippet check skips this page.
2. **The maintainer's addition**, in the *Introduction*, after "grouped by area": "A project meets only some of these
   items, since each concerns one feature or one way of using it: `tsc` and the searches in *How to upgrade* show which
   apply to yours, and the rest can be skipped." No number: its only evidence is the external consumer projects,
   which the repository does not name, and the share depends on the project.
3. **Its own docs plan, built after the code areas and before the guide plan**, since the page quotes messages that
   decisions 85, 86, 89 and 94 change; no changeset.

**Why**: the page is how a 2.x project finds its work, and an item marked wrongly or without a search sends the reader
the wrong way.

## 102. The session storage pages: four corrections (2026-10-29)

**Settles**: [2A-5](A-session-storage/defect-2A-5-sandboxed-arrival-not-listed.md),
[2A-6](A-session-storage/defect-2A-6-schema-extra-codec-compiles.md),
[2H-6](H-docs-site-readme/defect-2H-6-installation-storage-values-runtime-claim.md), 2Z-2 (`report.md`, section 5);
item 23. Each claim checked at the branch on 2026-10-29.

**Decided**:

1. **2A-5**: *Seeding session storage*, *What `seed` cannot do*, gains the row for an arrival on a sandboxed document
   (the opaque "was not applied" message, from the review's probe); the API page's `seed()` and its `@throws` say "a
   failed navigation there, or a sandboxed document".
2. **2A-6**: *Session storage*, `src/helpers/AGENTS.md` and `.changeset/schema-type-and-value.md` name the second case
   that compiles: a schema passed through a variable, with a codec the type does not declare (TypeScript does not check
   a variable for extra keys; `get` then returns the decoded value against its type). The code cannot reject it; issue
   #58 would close it.
3. **2H-6**: *Installation* names a codec key's value as an exception to "checked at runtime as the types check them",
   beside `nth`.
4. **2Z-2**: the API page's `sessionStorage` and its doc comment (`src/pageObject.ts`) say that with a RegExp `baseUrl`
   the helper has no origin: it works on the origin the page is on, and `seed` needs `{ origin }`.
5. **In the session storage plan**, one more commit with its docs; no new changeset. 2F-4 (item 27) edits the same
   changeset: both edits are made in that plan, 2F-4's content decided at item 27.

**Why**: these pages state the contract the code keeps; each sentence was wrong for one case.

## 103. The locator pages: four corrections (2026-10-29)

**Settles**: [2B-2](B-registration-and-resolution/defect-2B-2-string-registry-format-check.md),
[2B-3](B-registration-and-resolution/defect-2B-3-template-value-with-dot.md),
[2C-1](C-queries/defect-2C-1-replace-first-argument-required.md),
[2C-2](C-queries/defect-2C-2-errors-page-getlocatorschema.md); item 24. Each claim checked at the branch on 2026-10-29.

**Decided**:

1. **2B-2**: a registry typed `<string>` gives up completions, the union check and sub-paths, and a literal path is
   still checked for the rules of a path; said on *Locator paths*, the registry's API page, *Types*, *Error messages*,
   the two doc comments and `.changeset/registry-requires-paths.md`; a `@ts-expect-error` line in the path type tests.
2. **2B-3**: *Locator paths*, *Paths with a dynamic part*: a dot in an open part's value adds segments, so keep dots out
   of it.
3. **2C-1**: the exception, `replace(…).frameLocator()` without a selector (the any-frame form), named wherever the
   first argument is said to be always required: the update builder's API page, *Queries*, *Internal → Builders*, the
   type's doc comment, `.changeset/undefined-first-argument.md` and `src/locators/AGENTS.md`; written with decision
   92's clause on *Queries*, the same passage.
4. **2C-2**: *Error messages*, *Resolving and verifying*, adds `getLocatorSchema`, which throws the unregistered-path
   message at its call.
5. **In the locators plan**, with decisions 87, 88, 92 and 93; every claim re-probed against the build; the two
   changesets are unreleased and corrected; no new changeset for these.

**Why**: each sentence stated a contract that is wrong for one case.

## 104. Page objects and URLs: three corrections, and a check for the doc comments' examples (2026-10-29)

**Settles**: [2D-3](D-page-objects-urls-navigation/defect-2D-3-outcomes-table-test-body.md),
[2D-5](D-page-objects-urls-navigation/defect-2D-5-regexp-subclass-rationale.md), 2Z-1 (`report.md`, section 5); item 25.

**Decided**:

1. **2D-3**: *Page objects*, *How a mistake is reported*, gains the row for a page object built in the test body (or a
   `test.step`): the test fails at the `new` line and the body goes on past it; a sentence on *Internal → Page object
   lifecycle*; a case in `test/lifecycle-outcomes/`, which the outcomes spec, reading the page's rows (decision 95),
   compares; the case is shown to fail before the row exists.
2. **2D-5**: *Internal → URL matching* states call by call which Playwright call runs a `RegExp` subclass's own
   matching (`page.waitForURL` runs its `test()`; `page.route` and `toHaveURL` use its source), from the review's
   three-browser probe re-run in the plan; the conclusion stands.
3. **2Z-1**: `PageObjectTypeOptions`' doc-comment example gets an empty `protected defineLocators(): void {}`, as the
   API
   page's compiled example has, so it compiles (TS2515 today).
4. **A check for the doc comments' examples**, in the checks plan: the snippet check extended to the `@example` blocks
   of `src/` (97), compiled with shared declarations for the context they assume; an example that cannot stand alone
   carries an explicit opt-out marker, never a silent skip. The review's `H/examples` scripts (95 of 96 compiled) are
   the start. It closes the one kind of example nothing checks.
5. 1 and 2 **in the page objects and URLs plan**, after the checks plan; 3 **with the check, in the checks plan**, whose
   new check fails on that example; no changeset.

**Why**: the doc comments are the API reference in the editor, and their examples, unlike the pages', were never
compiled.

## 105. Steps: where a step is reported, and whose class its title names (2026-10-29)

**Settles**: [2E-2](E-logging-step-fixture/defect-2E-2-where-a-step-is-reported.md),
[2E-3](E-logging-step-fixture/defect-2E-3-step-title-names-the-receivers-class.md); item 26. Checked at the branch on
2026-10-29: `api/step.md` lines 64-65 ("reported at the calling line either way"), *Test steps* lines 36, 55 and 102;
the `step` doc comment ("titled `ClassName.methodName`").

**Decided**:

1. **2E-2**: *Test steps* states the rule: a call awaited where it is made is reported at its line; otherwise the step
   is
   where Playwright places a `test.step` (an unboxed step awaited later has no location; in a multi-line `Promise.all`,
   the `await` line); `api/step.md` and the doc comment say it briefly, and the `box` option's note says that a boxed
   step under a wrapping decorator is at that decorator's line and its error at the awaiting line. Every placement
   copied from the review's probe and print reporter, re-run against the build; the navigation helpers' sentence on
   *URLs and navigation* holds and stays.
2. **2E-3**: *Test steps*, `api/step.md` and the doc comment say that the title names the class of the object the method
   runs on: an inherited method shows the subclass, and a `super` call shows two steps with one title; a unit test pins
   the rule.
3. **In the steps and logging plan**, with decision 94; no changeset.

**Why**: the pages promised a location the runner does not give in two common forms, and the title's class was
unstated.

## 106. Packaging and types: the `skipLibCheck` floor, a generated emit check, the base class's way out (2026-10-29)

**Settles**: [2F-1](F-packaging-types-changesets/defect-2F-1-skiplibcheck-floor-sentence.md),
[2F-2](F-packaging-types-changesets/defect-2F-2-emit-check-not-every-member.md),
[2F-4](F-packaging-types-changesets/defect-2F-4-schema-migration-misses-base-class.md); item 27.

**Decided**:

1. **2F-1**: *Installation* and `scripts/consumer-check.sh`'s header say that below TypeScript 5.2, `skipLibCheck` is
   needed for Playwright's declarations and, depending on `@types/node`, Node's (the review's probe: 5.0 and 5.1),
   never for POMWright's; the consumer check adds `5.1` to its list, with `--skipLibCheck` as for `5.0`.
2. **2F-2**: the declaration-emit check's module is generated from the published declarations in `pnpm typecheck` (the
   review's `gen-members.mjs` as the start: 161 members, all emitting on six TypeScript versions), so it covers every
   public member as the API grows; `test/AGENTS.md`, *Internal → Packaging* and the config's comment say so. Not
   narrowing the claim: a new member that a consumer's declarations cannot name would go unseen.
3. **2F-4**: `.changeset/schema-type-and-value.md` and *Organizing a project* give the way out for a subclass of a
   generic base class that forwards only the paths: the base class takes the options as a type parameter, as the
   page's second base class does, and the subclass declares `{ storage: typeof schema }`; `SchemaNeedsStorageType`'s
   text adds "…, or a base class's options type parameter" (unreleased), with *Types* and *Error messages*, which
   `check-error-messages.mjs` compares; the harness case (`publicTypes.typecheck.ts` lines 578-584) gains the subclass
   form. **In the session storage plan**, which edits that changeset for 2A-6 (decision 102).
4. **2F-1 and 2F-2 in a packaging plan**; no changeset.

**Why**: the floor sentence was wrong for 5.1, the emit check covered a fifth of what it claimed, and the break's
advice could not be followed where the error is reported.

## 107. The CI pages corrected; the benchmarks reviewed in a plan of their own, at the end (2026-10-29)

**Settles**: [2G-3](G-ci-release-publishing/defect-2G-3-pages-every-merge-claim.md),
[2G-4](G-ci-release-publishing/defect-2G-4-performance-scale-line-not-reproducible.md),
[2G-5](G-ci-release-publishing/defect-2G-5-ci-descriptions-lag-the-jobs.md),
[2H-1](H-docs-site-readme/defect-2H-1-documentation-page-ci-sentence.md) (with 2T-6 and 2I-4); item 28. Each claim
checked at the branch after decision 79's commits, on 2026-10-29.

**Decided**:

1. **2G-3**: `.github/AGENTS.md`, *Internal → Documentation* and `pages.yaml`'s comments describe the tip rule as it is:
   the site follows `main`'s tip whenever that tip's `CI` passes, and a green commit `main` moved past is not deployed
   (the review's simulation); a manual run builds the commit it was started on; `main.yaml`'s comment no longer says an
   older run can never finish after a newer one's, but what GitHub's concurrency guarantees.
2. **2G-5**: *Tests and checks* lists the test-server job; `pr.yaml`'s header says Node 20 and 22.
3. **2H-1**: *Internal → Documentation* names each docs check per job as it runs (the site job: snippets and API
   coverage; the harness, through `pack-test.sh`: all three; every run); the error-message check is not added to the
   site job, since the harness runs it in CI.
4. 1 to 3 **in the contributor guide plan** (decision 82), which edits the same files.
5. **2G-4 and the maintainer's addition, a benchmarks plan of its own, built after every code change**: review
   `scripts/benchmark.mjs`, `test/benchmarks/` and `test/playwright.bench.config.ts` for mistakes and for what can be
   improved; report the findings with proposed fixes and stop for the maintainer; then fix, add the `count()` round trip
   to the script (2G-4), rerun `pnpm bench`, and rewrite *Internal → Performance* from its output, thoroughly: every
   number and claim from the run, stated with the run's spread, not as a fixed percentage where the machine's noise is
   larger. It replaces the bench rerun `test/AGENTS.md` asks after decision 88's registry change.

**Why**: the CI pages are to describe the jobs as they run; the performance page's numbers are to come from a script
anyone can rerun, on the code that ships.

## 108. American spelling throughout; the README's `log.info` line stays (2026-10-29)

**Settles**: [2H-2](H-docs-site-readme/defect-2H-2-misspelt-british-spelling.md),
[2H-3](H-docs-site-readme/defect-2H-3-readme-log-info-not-attached.md); item 29.

**Decided**:

1. **2H-2**: "misspelt" becomes "misspelled" on *TypeScript*, *Verifying a registry*, *Principles* and *Filters and
   indices* and in `LocatorSchemaPathArgument`'s doc comment; "initialiser" becomes "initializer" on *Internal → Page
   object lifecycle* and in the test title of `src/pageObject.test.ts` ("a field initialiser"); in the contributor guide
   plan's final pass, after the other page edits.
2. **2H-3: not adopted**, by the maintainer's decision: the README's example and its sentence ("logs them to the
   report", with `log.info`) stay as they are.
3. **Issue #62** (open, `backlog`, `breaking`): the maintainer adds the README's `log.info` example to its migration
   list at the release's cleanup, with the other deferred items.

**Why**: the guide's rule is American spelling; the README's sentence is the maintainer's call.

## 109. The contributor guide: six corrections, and the upgrade page kept to the latest 3.x (2026-10-29)

**Settles**: [2I-3](I-contributor-guide/defect-2I-3-claude-code-loading-claim.md),
[2I-6](I-contributor-guide/defect-2I-6-plan-reference-left-in-a-spec.md),
[2I-7](I-contributor-guide/defect-2I-7-guide-statements-that-do-not-match.md),
[2I-9](I-contributor-guide/defect-2I-9-editorconfig-mdx.md),
[2T-8](T-tests-and-checks/defect-2T-8-base-config-comment-stale-again.md),
[2F-3](F-packaging-types-changesets/defect-2F-3-migration-hint-rule-names-2x.md); item 30. Spot-checked at the branch on
2026-10-29.

**Decided**:

1. **2I-3**: the root guide, its index's "Loads by itself" column and `docs/repository.md` say what Claude Code's docs
   say: a folder's `AGENTS.md` loads when a file in it is opened with the Read tool, under the working directory (this
   session saw both conditions: `.github/AGENTS.md` loaded on reading `pr.yaml` with the Read tool, never on `cat` or
   `grep`); the fallback widens to any other way of reaching a folder (the shell, another client): read its file
   yourself.
2. **2I-6**: `registry.verify.spec.ts`'s comment points to *Verifying a registry* and *Internal → Resolution*; the
   rule-7 audit before the cleanup gains a `git grep` for references to a working folder, a plan or a decision outside
   it.
3. **2I-7**: one pass over the twelve statements, item by item as the finding lists them, each re-checked against the
   files as the plans leave them.
4. **2I-9**: `website/src/content/docs/index.mdx`'s JSX is reindented with two spaces, so `.editorconfig`'s rule holds.
5. **2T-8**: `playwright.base.ts`'s header names the two configs that build on it (`test/playwright.config.ts`,
   `test/playwright.test-server.config.ts`) and the three that do not (steps, outcomes, bench).
6. **2F-3, with the maintainer's addition**: `docs/versioning.md`'s changeset rule asks for a migration hint whenever
   code written against the previous release stops working; and, beside it, *Upgrading from 2.x* always describes the
   upgrade from 2.x to the latest 3.x: a change that alters what a 2.x project must do updates that page in the same
   plan (as decision 101 does for 3.0.2).
7. **In the contributor guide plan** (decision 82), whose tracing check runs after all of these; no changeset.

**Why**: the guide is to match the repository it describes; changesets speak to the last release's users, and the
upgrade page to every 2.x project, whichever 3.x is current.

## 110. *Planning* describes a release prepared from a review's findings (2026-10-29)

**Settles**: [2I-5](I-contributor-guide/defect-2I-5-working-folder-rules-vs-practice.md); item 31.

**The case**: `docs/releases.md` (*Planning*) describes a `release-<version>/` folder, one plan per item or pair, and a
release-notes file; 3.0.2 used the review's folder, grouped plans and the changesets as its notes, by the first review's
decisions 5 and 62, and its audit did not carry that into the guide. This triage's own practice lives only in
`defect-review-result-2/DECISIONS.md`, which rule 7 deletes.

**Decided**:

1. **A subsection of *Planning*, *From a review's findings*** (about fifteen lines): a review's result folder may be the
   working folder; findings are decided item by item, each with what its fix could break checked, and the decisions
   are numbered across folders; one plan per item or group fixed together, `PLAN-T<n>-…` for a test gap and
   `PLAN-<slug>.md` for the maintainer's own items, written as soon as an area's items are decided; the changesets serve
   as the release notes; plans are built checks first, then each code area with its docs, the guide last; the review
   itself is the `defect-review` skill's, linked, not repeated. Written as practice that worked, not as a procedure.
   Not renaming the folder: it is deleted before the merge anyway.
2. **In the contributor guide plan** (decision 82), whose tracing check gains the task "planning a release from a
   review"; no changeset.

**Why**: the guide is to describe how release work is done, and rule 7 removes every other record of it.

## 111. Decision 72's token steps: the lasting rule in the guide, the one-time steps in an issue (2026-10-29)

**Settles**: 2Z-3 (`report.md`, section 5); item 32.

**The case**: npm publishing access set to "Require two-factor authentication and disallow tokens", the old npm token
revoked and the `NPM_TOKEN` secret deleted (decision 72), with the other after-merge and after-release actions, exist
only in `defect-review-result/` (`DECISIONS.md` lines 2110-2111, `PLANS.md` lines 160-173), which rule 7 deletes before
the merge; the guide, `publish.yaml`'s comment and `.changeset/trusted-publishing.md` already say "no npm token is
stored".

**Decided**:

1. **The lasting rule in the guide**: *Carrying out a release* (`docs/releases.md`) says npm publishing access is
   "Require two-factor authentication and disallow tokens", so only the Trusted Publisher can publish.
2. **"No npm token is stored" becomes "the workflow uses no npm token"** in `.github/AGENTS.md`, `publish.yaml`'s
   comment
   and `.changeset/trusted-publishing.md` (unreleased): true whatever the repository still holds.
3. **The one-time steps in an issue**, drafted below, finalized at the rule-7 audit from the first review's records (the
   follow-ups on #54, #58 and #61 need their details from there), and filed by the maintainer before the cleanup.
4. **In the contributor guide plan** (1 and 2); no changeset.

**The issue's draft**: title "3.0.2 release: after the merge".

> Steps left after PR #60, from the 3.0.2 working folders, which were removed before the merge.
>
> Right before the merge
> - [ ] The Trusted Publisher for `pomwright` on npmjs.com: repository `DyHex/POMWright`, workflow `publish.yaml`,
>   environment `npm`, **Allow npm publish**; its first publish must succeed within 2 days.
> - [ ] PR #60 merged with a merge commit (its commits are cited by hash).
>
> After the merge
> - [ ] The first Publish run deploys to the `npm` environment, succeeds and opens the Version Packages pull request.
> - [ ] The diagrams on the live site; an older green `CI` run re-run once: Pages skips its deploy.
> - [ ] Issue #55's body: CI runs every LTS Node line from the floor; 24 joins the matrix when 26 becomes the default.
> - [ ] The Version Packages pull request merged within the Trusted Publisher's 2 days.
>
> After the release
> - [ ] The attestation: `npm view pomwright@3.0.2 dist --json`.
> - [ ] npm publishing access: "Require two-factor authentication and disallow tokens".
> - [ ] The old npm token revoked, and the repository's `NPM_TOKEN` secret deleted.
> - [ ] Issue #53 closed (the release tooling); #54's and #58's bodies and #61's decision as the first review recorded
>   them (to be completed at the audit).
> - [ ] Issue #62's migration list names the README's `log.info` example (decision 108).
> - [ ] Issue #56: a comment that the publish job builds while the publishing credentials are in reach, a second reason
>   to publish the tested tarball (decision 112).

**Why**: rule 7 removes every other record of these steps, and losing them would leave a valid npm token stored and
token publishing allowed.

## 112. The closing checklist: two loose ends, three additions, one backlog issue (2026-10-29)

**Settles**: item 33 (the report's items considered and not filed, its test gaps that no decision covers, and the
triage's records).

**Decided**:

1. **The report's unfiled items**: the publish job building with publishing credentials in reach becomes a comment on
   issue #56 (publish the tested tarball), on the cleanup list of decision 111's issue, posted by the maintainer; the
   Version Packages pull request's checks waiting for the maintainer's approval becomes one sentence in *Carrying out a
   release*, in the contributor guide plan. The rest need nothing (as `report.md` section 9 gives each reason).
2. **Three additions**: `get`, `clear` and `seed` cases in `test/step-locations/` (the steps and logging plan); a check
   of the guide's links, files and anchors, over `AGENTS.md`, the folder files and `docs/*.md` (the checks plan); the
   workflow lint's download and run moved into a script that CI's `lint` job and a new `pnpm lint:workflows` both run,
   with the pinned versions (the checks plan).
3. **One backlog issue for the rest**, drafted below, filed by the maintainer at the cleanup.
4. **Accepted**: compiler output quoted on pages other than *Error messages* (only the upgrade guide, whose 2.x side
   would need 2.x code compiled; decision 101's probes cover 3.0.2); Firefox and WebKit on Node 20 and 22 (decision
   75); the navigation cases the review probed sound; Node 26 (issue #55).
5. **The triage's records are committed** in one commit, `chore: triage of the second defect review`, for the
   maintainer to push.

**The backlog issue's draft**: title "Test coverage beyond 3.0.2", label `backlog`.

> Gaps the second defect review of 3.0.2 found with no defect behind them, left for later.
>
> - [ ] CI on Windows and macOS: call sites, step locations and packaging never meet their paths.
> - [ ] TypeScript 5.2 to 5.8 in the consumer check, between the floor (5.0, 5.1) and the latest 5.x.
> - [ ] The `log` fixture's level on a retry through the real runner (`initialLogLevel` is unit-tested; the harness's
>   `failOnFlakyTests` keeps a retry from happening there).
> - [ ] TypeScript's rename groups across registrations.
> - [ ] Queries: a query kept across later registrations, a `has` path resolved from the registry, copies through a
>   query's `filter` and `replace` on a DOM.
> - [ ] Logging: entries from `afterEach`, `beforeAll` and after a timeout; a second `attachLogsToTest`; `tsc`'s
>   standard-decorator output at run time.

**Why**: the review's purpose is that nothing it found is left without a decision; these are the last of them.

## 113. The real thing over a stand-in: a principle of the root guide (2026-10-29)

**Settles**: raised by the session storage plan's execution (its execution note 1), not a finding.

**The case**: the review's probe for 2A-1 served its redirect chain through `page.route` and concluded that the failure
was Chromium's alone. With the test server's pages the chain failed on Firefox and WebKit too. Before the fix, 30
rounds per cell: Chromium failed every round at 1, 6 and 16 workers however the pages were served; Firefox and WebKit
failed 4 to 12 rounds of 30 with the server's pages, and 0 or 1 through `page.route`, also when the route only
continued the request. The stand-in hid the result, and the probe did not say what it could hide.

**Decided**:

1. **A principle in the root `AGENTS.md`**, under *How to work* beside *Verified claims only*, worded for any work that
   establishes what is true:

   > - **The real thing over a stand-in.** Whatever establishes what is true (a probe, a test at any level, a
   >   reproduction, a benchmark, exploratory testing, a review, a claim in a plan, page or doc comment) is based on what
   >   a user runs: the packed build, Playwright's runner, real browsers and pages, and realistic conditions (all three
   >   browsers, parallel workers, enough rounds to show a race). A stand-in (a mock, a fake page, `page.route`, a
   >   hand-built document, a single worker, a small sample) is used only where the real thing cannot produce the case
   >   or costs far more than the claim is worth. A stand-in's result holds for the stand-in, so a claim that something
   >   does not happen is never made from one. Every stand-in MUST be disclosed where its result is reported (the plan,
   >   finding, report, reply, or the test's own comment): what it replaced, why, and what it could hide. A claim that
   >   only a stand-in backs is a gap.

2. **The folder files add only what is particular to them**, each pointing back to the root rule: `test/AGENTS.md`
   *Probing* (the test server's pages over `page.route`; a navigation timed by wrapping a Playwright call, disclosed;
   rounds and workers); `src/AGENTS.md` (a fake page or a mocked `test.step` in a unit test is a stand-in by design: its
   comment names the harness test that checks the same claim for real); the benchmarks' bullet (running at rest is a
   declared condition, reported with the machine line).
3. **A pass over the tests' stand-ins**: each gets a comment saying what it replaces, why, what it could hide and which
   real test covers it; a claim that only a stand-in backs is listed as a gap.
4. **In the contributor guide plan**, a step of its own. The session storage plan's follow-up discloses its own
   stand-ins.

**Why**: a stand-in changes timing and behavior, and a result that holds only for it must not pass for a fact about the
real thing; the rule applies to every kind of work that establishes what is true, so it belongs where every task reads.

## 114. A call stops when its document is replaced, also between two of its storage calls (2026-10-29)

**Settles**: a gap found while answering the maintainer's questions on decision 86, not a finding of the review.

**The case**: a navigation within the origin is detected only when it destroys a storage call in flight (`guarded`
reads Playwright's "Execution context was destroyed"). One that commits between two of a call's storage calls goes
unseen: the call resolves and writes the rest into the new document, whose first script ran without them (a reload
timed between `set`'s third and fourth `setItem`: 9 of 9 on three browsers; the reloaded document's first script saw
three keys). The docs say that a reload within the origin that interrupts a call stops it. With real timing the gap is
rare: 270 reloads timed by the page itself each destroyed one call in flight.

**Decided**:

1. **A handle to the page's document**, `page.evaluateHandle(() => document)`, taken before a call's first storage
   call, evaluated after each (every key of a batch and every read of `get` included) and disposed when the call ends.
   Playwright documents that "JSHandles are auto-disposed when their origin frame gets navigated or the parent context
   gets destroyed"; evaluating one whose document is gone throws "Execution context was destroyed", which `guarded`
   reads as a navigation, so the call fails with the navigation message, naming the keys done and the one that may have
   reached the new document. A same-document navigation (`pushState`, a hash change) leaves the handle alive, and the
   call goes on.
2. **Not `performance.timeOrigin`**: WebKit computes it on every read from two clocks (`m_timeOrigin -
   MonotonicTime::now() + WallTime::now()`, rounded to 1 ms), so it can change within one document; it gave a false
   failure under load (1 of 48 benchmark copies, WebKit).
3. **Option A, not A2.** A2 (look only after `framenavigated`) costs almost nothing, but depends, besides the handle, on
   two behaviors of Playwright: an event for every new document of the main frame (its code does so; its docs say "a
   different URL") and that event delivered before the result of any call that ran in the new document (half by its
   code, half by the browsers' order of events, promised nowhere). A depends on the handle alone, which is documented.
   Its cost, measured with prototypes of both: one round trip per key and two per call. Median of 32 copies under 16
   workers, `set` of 10 short keys 14 to 16 ms today, 29 to 35 ms with A; 60 keys of 1,000 characters 60 to 82 ms, 123
   to 172 ms with A; A2 matched today. At worst about 10,000 short keys fit a 30-second test timeout, and values of
   1,000 characters or more fill the whole quota (5,242,880 characters per origin) within it.
4. **No option to turn it off**: off by default every call would race silently; on by default, the option would be an
   opt-in to that race.
5. **No new changeset**: the navigation messages and the within-origin stop are new in 3.0.2 (`e8831b8`), and
   `.changeset/batch-navigation-message.md` says that a call checks its document too.
6. **Tests**: unit, with a fake page (a document replaced between two calls stops a batch, a read and `clear()`; a
   same-document navigation goes on; the handle taken once and disposed, also when the call fails; a handle that cannot
   be taken while the document is replaced; a closed page); harness (a reload between keys stops `set`, `get(keys)`,
   `clear(keys)` and a `seed` on the origin; a reload by the page's own timer during a call; `pushState` and a hash
   change between keys do not; a call waiting for its turn through a reload runs in the new document), and a pin of
   the handle: it dies on a reload, `location.replace`, `location.assign`, a link, a form, back and forward, a meta
   refresh and `page.goto`, and survives `pushState` and a hash change, on three browsers.
7. **Docs**: *Session storage* (*The methods*; a section on size and cost; what to do when the app navigates by
   itself: wait for where it ends up, wait for its final state, or seed before the navigation; on WebKit
   `page.goto()` returned before an app's own reload, a sentence later dropped with the maintainer, as Playwright's and
   WebKit's behavior, see the session storage plan's execution note 4), *Error messages*, the API page and the
   `@throws`, *Internal →
   Seed registry* (*The origin around every call*), `src/helpers/AGENTS.md`.
8. **In the session storage plan's follow-up**, with the test gaps the maintainer named (an awaited `clear` then a
   reload, a codec's object changed after the call, the quota) and the comments of that plan's stand-ins.

**Why**: decision 86 keeps a call failing where the race is; whether it does must not depend on the navigation
landing during a storage call or between two.

## 115. The storage calls benchmarked against plain Playwright (2026-10-29)

**Settles**: the maintainer's request while deciding 114.

**Decided**:

1. **A storage benchmark in the benchmarks plan**: `set`, `get`, `clear` and `seed` by key count and value size, on
   three browsers, each against the fewest plain Playwright calls that do the same storage work (`set` of ten entries
   against ten `page.sessionStorage.setItem` calls; `get` and `clear` against `getItem`, `items`, `removeItem` and
   `clear`); `seed` against two hand-written baselines, `page.addInitScript` writing the entries when
   `location.origin` matches (removed through its `Disposable`) and one that also writes only on the first arrival,
   timing the call and the arrival, with what the minimal script does not do listed. The quota is measured too, and
   decision 114's check is shown against a build of the commit before it.
2. **Published on *Internal → Performance***, with the machine line and both conditions: at rest, and under the
   harness's parallel workers.

**Why**: these numbers decided 114, and a reader of the performance page should be able to reproduce them and see them
against what they would write by hand.

## 116. Playwright's own log when probing (2026-10-29)

**Settles**: the maintainer's proposal after the WebKit `goto` finding (the session storage plan's execution note 4),
whose `DEBUG=pw:api` log showed `page.goto` succeed before the reload's commit.

**Decided**:

1. **A bullet in `test/AGENTS.md`, *Probing***, in these words:

   > - **Playwright's own log.** To understand what Playwright did (what a call waited for, which events came in what
   >   order, how a browser was launched), rerun the one test or probe with
   >   `DEBUG="pw:api,pw:browser,pw:client-certificates,pw:webserver"`, and `pw:protocol` when the browser protocol's
   >   own messages are the question. Set it on the command, never in `test/.env`, which every run reads. Run one test
   >   or a few (`-g`, a file, `--project`) with `--workers=1`, write the output to a file, and quote the lines that
   >   decide the question where the result is reported.

2. **In the contributor guide plan, step 7**, beside decision 113's application to *Probing*.

**Why**: Playwright's log shows what it waited for and in what order, which no assertion of a test does; one test on one
worker keeps it readable, and on the command it never switches on for every run.

## 117. Leave the code better than you found it, by this guide's measure (2026-10-29)

**Settles**: the maintainer's sketch of a rule on strategic programming, reworded with Claude for POMWright, whose code
is often shaped by Playwright and the browsers in ways that look odd and are deliberate.

**Decided**:

1. **A principle in the root `AGENTS.md`, *How to work***, after *Mirror Playwright*: work as the code's maintainer a
   year from now; propose a refactor first, in the plan, with what it buys (behavior-preserving, commits of its own;
   the public API a contract change); odd is not necessarily wrong here, so find the reason first (its comment, the
   tests that pin it, the folder's AGENTS.md, the documentation pages, the changelog, a decision, or the commit that
   introduced it); a reason makes code deliberate, not untouchable: propose a change with evidence when the reason no
   longer holds or a better way serves it, and raise code without a reason rather than change it, writing the answer
   down as the reason or a plan; no unexplained special case, duplicated runtime logic or skipped test; tests grow
   where weakly tested code is touched; a deliberate shortcut is named with its follow-up; debt noticed and not fixed
   goes at the end of the task and into the plan's execution notes.
2. **`src/AGENTS.md`, *Conventions***: the kinds of code that look odd and recur (not a complete list): the public API
   in Playwright's shape, depth for the internals; special cases that mirror a browser's or Playwright's behavior,
   with a test; code shaped by how Playwright runs and reports it. Questioning is welcome with evidence; removing it
   without its reason is not.
3. **`test/AGENTS.md`**: tests are not de-duplicated across levels; a spec imports the packed build, not `src/` (a
   `src/` module that imports `@playwright/test` cannot load in a spec: probed, "Requiring @playwright/test second
   time"; a pure module can); an internal is reached through the public API or tested in its unit test; a claim neither
   level covers is a gap, and a spec importing a pure `src/` module is an exception decided with its reason. The
   harness bullet's "never `src/`" is dropped for this one.
4. **Built at once**, with decision 113's root principle (point 1), which point 3 cites; the rest of 113 and decision
   116 stay in the contributor guide plan's step 7.

**Why**: the long-term health of the code matters as much as the task, and in POMWright that health is measured by its
own rules: a generic cleanup would remove deliberate Playwright-shaped code and the special cases that are the product,
while code frozen because it exists would never improve.

## 118. The navigation message names the URL the new document reports (2026-10-30)

**Settles**: [2R-2](R-triage/defect-2R-2-navigation-message-names-the-start-page.md) (defect), found in CI run
40905139313 after the session storage plan; amends decision 86's point 2.

**The case**: a call whose document went away named the page it started on as where the page went (`the page navigated
to http://localhost:9000/teststorage while set() was writing to http://localhost:9000`). `guarded` read `page.url()`
at once, and Chromium reports the old document's destruction before Playwright's client hears of the new one's
commit (Playwright's channel log, `DEBUG=pw:channel`). At rest on one worker, the harness's `set` test failed 125 of
300 times on Chromium (0 of 300 before decision 114's handle moved the first write); with `taskset -c 0-3` and 2
workers, `get(keys)` failed 14 of 300.

**Decided**:

1. **Option B: the new document's `location.href`**, asked after the failure, again while a navigation destroys the
   question and the page is open, through up to `MAX_REPLACEMENTS` (20, decision 81's bound); past that, or on any
   other error (a closed page), `page.url()` as it is. `page.url()` stays the destination when only the URL moved. The
   storage call is never repeated, and a call that succeeds costs nothing more. Amended by decision 121 (2026-10-30):
   up to `MAX_RETRIES` retries, each after Playwright's pause before its actions' retries.
   - `location.href` agreed with `page.url()` on three browsers on a new page, a `data:` URL and each browser's page
     after a failed navigation (Chromium `chrome-error://chromewebdata/`, Firefox the failed URL, WebKit the page it
     stayed on), and a page cannot redefine it (redefining `location`, its `href` or `document.location` throws).
   - Not `document.URL`, which is `about:neterror?…` on Firefox's error page.
   - A closed or crashed page is never read as replaced: Playwright words an evaluation's protocol failure as "Execution
     context was destroyed" only when the evaluated code did not throw and the session is not closed or crashed; the
     question rejects at once on both.
2. **The principles page says which retries POMWright makes**: it retries nothing a test asked it to do; a question of
   its own that a navigation cut off is asked again in the next document, up to 20 times, as Playwright's own waits
   do. The page's "retry anything" had not held since decision 81.
3. **The replaced-document test is shared**: `replacedByNavigation` and `MAX_REPLACEMENTS` are exported from
   `sessionStorageSeed.ts`, beside `originOf` (decision 117).
4. **No new changeset**: the messages are new in 3.0.2, and `.changeset/batch-navigation-message.md` already says the
   message names where the page went.
5. **Tests**: unit, with a fake page standing in for the moment Chromium reports the destruction first (the new URL
   after one destroyed question; a closed page and another error; 20 replacements and past them). No harness case
   reproduces it every time: a call made right after the page starts a navigation named the right page 50 of 50 times
   for `set` and for `get(keys)` without the fix; the existing `set` test named the start page 34 of 50 times. That
   test and `get(keys)`'s parallel reads stay the real-timing checks.
6. **Docs**: *Principles*, *Internal → Seed registry* (*The origin around every call*), the doc comments of `guarded`
   and `currentUrl`, and `src/helpers/AGENTS.md`.

Rejected: **waiting for the new document, then reading `page.url()`** (option A), which passed the same probes but
relies on Playwright's client hearing of the commit before the new document answers, which Playwright does not
promise; **waiting for `framenavigated`**, for the same reason (decision 114's A2); **loosening the tests**, which would
accept a wrong message; **leaving the destination out until it is known**, which changes the message and loses the
reload case.

**Why**: the destination is POMWright's addition to Playwright's error, so making it true is POMWright's job, and the
document that answered is the one source that does not depend on the order of Playwright's events.

## 119. The harness under load (2026-10-30)

**Settles**: the maintainer's three items after 2R-2, and
[2R-3](R-triage/defect-2R-3-opaque-origin-test-wait-under-load.md) (test defect), found probing 2R-2's fix under CI's
shape.

**Decided**:

1. **`globalTimeout` 15 minutes** in `playwright.base.ts`: at 5, a run on one worker stopped after 1,235 of 1,845
   tests; the cap is for a run that hangs, and 15 minutes still stops one long before a CI job's own limit.
2. **`workers: process.env.CI ? "50%" : "50%"`**, with a comment saying CI's is half the runner's threads and the local
   value is to be tuned, so the identical branches are not simplified away.
3. **`pnpm test:constrained`** runs `taskset -c 0-3 pnpm test --workers=8`: `pnpm test` with 8 workers on 4 CPUs, more
   load than CI's 2 workers on its 4 threads. Linux only, run locally, not in CI. On the maintainer's hybrid Intel CPU,
   CPUs 0-3 are two performance cores with two threads each: the runner's shape (2 cores, 4 threads), on faster cores.
4. **`test/AGENTS.md` says when to run it** (before a release, and after a change to storage, navigation or steps) and
   what a failure under it means (a POMWright bug that shows only under load, or a test that relies on timing, each
   fixed at its cause, never by a retry).
5. **Decision 113's realistic conditions** in the root `AGENTS.md` gain a machine about as small as CI's runner.
6. **2R-3**: the Firefox opaque-origin test waits for the error page with `expect.poll` on `page.url()` instead of
   `page.waitForURL`, which rejects when a navigation it waits through ends in an error, as the test's own failed
   `goto` does under load (1 of 60 in CI's shape). POMWright's code does not change.

**Why**: races in POMWright's navigation checks show on a machine as small as CI's runner that a 32-thread laptop hides
(2R-2 passed 900 of 900 runs there with 6 workers, and failed about a third of the time on 4 CPUs with 2); running the
suite in that shape before a release finds them before CI or a user does.

## 120. No `document.domain` question after a replaced document (2026-10-30)

**Settles**: [2R-4](R-triage/defect-2R-4-domain-lookup-after-a-replaced-document.md) (debt), noticed building decision
118.

**The case**: `access` asks the page for `document.domain` after every failed storage call, to explain a refused one.
When the document was replaced, `guarded` throws the navigation message and discards the answer. The question costs a
round trip on a call that already failed, and adds one of POMWright's own evaluations to the user's trace. When it
reaches the document being replaced, it adds a failed one, which has nothing to do with the user's code.

**Decided**:

1. **`access` throws a replaced document with its label, without the question.** Every message stays the same, since
   `guarded`, its one caller, replaces it with the navigation message. After a replaced document, `currentUrl`'s
   `location.href` question is the first evaluation. It may meet Playwright's lag, which spends one of its 20
   replacements.
2. **The case of another error while the URL's origin moved keeps the question** (the maintainer chose this over the
   larger change). `guarded` infers that navigation from `page.url()`, read after the question's round trip, and
   whether that round trip lets `page.url()` catch up (2R-2's lag) has not been probed.
3. **A unit test counts the questions**: none after a replaced document, during the storage call, at the handle check
   or while the handle is taken; one for a refused call and one for the moved origin.
4. ***Internal → Seed registry*** says so, with the larger change rejected and why.
5. **No changeset**: no message changes.

**Why**: `access` explains refused calls and `guarded` reports navigations; asking a question whose answer is never
used costs the user a line in the trace, and costs the next reader the time to find that it is unused.

## 121. POMWright's own questions retry as Playwright's actions do (2026-10-30)

**Settles**: [2R-5](R-triage/defect-2R-5-seed-check-counts-the-lag-as-replacements.md) (defect), found by the first
`pnpm test:constrained` after decision 120; amends decisions 81 and 118, point 1 of each.

**The case**: `seed`'s Navigation API check gave up during a chain of 5 script redirects under load: 4 of 100 runs on
Chromium with `taskset -c 0-3` and 8 workers, 5 of 100 at `9a437a3`. Playwright's log showed 21 failed tries against 2
to 5 commits. Right after a replacement, Playwright's server can still send an evaluation to the old document, which
fails at once, and the loop retried at once and counted each failure as a replacement. `currentUrl` (decision 118)
counts the same way.

**Decided**:

1. **Option A: Playwright's pauses before each retry, the bound kept at 20.** Both loops wait before each retry as
   Playwright waits before each retry of its own actions: 20, 50, 100 and 100 ms, then 500 ms
   (`retryWithProgressAndBackoff` in `playwright-core` 1.64.0, which locator actions and `waitForSelector` use). The
   20 retries span at most 8,270 ms.
   - Probed with a prototype: the 5-redirect test passed 300 of 300 in the failing shape; the 2, 3 and 5 redirect
     tests 450 of 450 on three browsers; the two navigation tests 300 of 300.
   - The cost: a first `seed` during 5 redirects took a median of 234 ms on Firefox (65 today), 31 on Chromium (27) and
     32 on WebKit (19). An app reloading every document at once failed the check on Chromium after 8.3 s instead of
     74 to 88 ms.
2. **`MAX_REPLACEMENTS` is renamed `MAX_RETRIES`**, and the reasoning that each failed try is one replacement is removed
   wherever it was written.
3. **The pauses are fixed, as Playwright's are**; not the intervals of `expect.poll` or `toPass`, which pace a test's
   own retries of its code (the maintainer's question).
4. **Tests**: unit tests with vitest's fake timers (the pauses, no retry before its pause ends, the bound's 8,270 ms),
   in both loops. No harness case for a redirect loop, since the browsers differ there (Firefox and WebKit answered
   between two reloads in the probe); the probe's numbers are in the plan.
5. **Docs**: the pending changeset `seed-redirect-chain.md`, *Internal → Seed registry*, *Principles*, the doc
   comments, `src/helpers/AGENTS.md`. No new changeset: the bounded retry is unreleased.

Rejected: **waiting for Playwright's next commit after a failed try**, which would wait until the test's timeout when
no commit follows a "destroyed", and relies on an event per document (decision 114); **a larger bound, retrying at
once**, a guess at how many failures the lag makes, in a loop that competes for the CPU the navigation needs.

**Why**: POMWright retries no faster than Playwright retries its own actions, and its bound then holds under load.

## 122. The lifecycle outcomes spec gets the time a nested run needs (2026-10-30)

**Settles**: [2R-6](R-triage/defect-2R-6-outcomes-spec-timeout-under-load.md) (test defect), found by the same run.

**Decided**: its one test calls `test.slow()`, which triples the harness's 60-second timeout, with a comment: it starts
a whole Playwright run of its own, 12.5 s at rest and up to about 57 s with 8 copies on 4 CPUs. With 12 copies on 4
CPUs, 12 of 12 timed out before and 12 of 12 passed with it. Rejected: a number of the harness's own
(`test.setTimeout`), and a larger timeout for every test.

**Why**: the test's time is set by the run it starts, which Playwright's own marker for a slow test follows.

## 123. A seed on `about:blank` writes only into the document that inherited the origin (2026-10-30)

**Settles**: [2R-7](R-triage/defect-2R-7-seed-writes-into-an-arrived-document.md) (defect), found by the full harness
after decision 121.

**The case**: on a page whose URL has no origin, `seed` asked `self.origin` of whichever document was current and wrote
into whichever was current next. With the step overlay's delay, the document that arrived on the seeded origin during
the call answered, and the seed wrote into it after its first script had run: the call resolved without its entries
reaching the app (Firefox, 5 of 200 runs). A deterministic case, which commits the page right before the seed's first
evaluation, failed 30 of 30 on three browsers.

**Decided**:

1. **Option A: the call asks through its document handle and decides by the answering document's own URL.** It
   writes through the same handle: an inherited document (a URL without an origin, `self.origin` the seeded origin)
   gets every key. A document that answers from the seeded origin arrived during the call, and the call fails with the
   existing in-flight message. Any other answer registers the seed, as before. A document replaced while asked:
   `currentUrl` says where the page went, the in-flight message on the seeded origin, else it registers. Another error
   of the question registers, as before. A replacement during the write fails with the navigation message.
2. **No new message, no new changeset**: the inherited write is unreleased (`52f2d4c`), and *Internal → Seed registry*
   already promised that a page that arrives while the call waits fails the call.
3. **Tests**: unit (`storageTurns.test.ts`, its fake page answering the question through the handle); a deterministic
   harness case that wraps `page.evaluate` and `page.evaluateHandle`, its stand-in named in its comment; the overlay
   test, which meets the timing for real.
4. **Docs**: *Internal → Seed registry*, the comment of the write-at-once path.

Rejected: **consulting the registry's commit watch** or **reading `page.url()` again**, which rely on Playwright's client
hearing the commit before the new document answers and leave a commit between the question and the write unseen;
**always registering on such a page**, which reverts `52f2d4c`.

**Why**: as with decision 118, the document that answers is the source that does not depend on the order of
Playwright's events, and the handle pins the write to it (decision 114).

## 124. A check that POMWright's retry pauses are Playwright's (2026-10-30)

**Settles**: the maintainer's request after decision 121: pin Playwright's pauses, or import them.

**The case**: decision 121 pauses before each retry as Playwright pauses before retrying its own actions, `[20, 50, 100,
100, 500]`. In `playwright-core` that is a constant local to `retryWithProgressAndBackoff`, a method of the server's
frame class bundled into `lib/coreBundle.js`. No export, public type or option reaches it: `./lib/coreBundle` is
exported, but the constant is not on it, and the getByRole roles come from a type of the public signature, which the
pauses do not have. The unit tests pin POMWright's pauses only.

**Decided**:

1. **`scripts/check-playwright-retries.mjs`**: reads the pauses from the `playwright-core` that `test/` resolves (the
   method's definition and the first array of its body) and compares them with `RETRY_PAUSES`. `pnpm typecheck` runs
   it last; `pack-test.sh`, which runs those steps itself, runs it after `check-error-messages.mjs`, so CI checks the
   pin and the latest 1.x. Probed: it passes at 1.64.0, and its pattern finds the same pauses in 1.64.1, npm's latest.
2. **It fails, not warns**, on a difference, and when it cannot find the method, so a release that moves the code is
   never passed over. Its message says what to update: the constant, its unit tests, the total in `MAX_RETRIES`'s
   comment and *Internal → Seed registry*, or the check.
3. **Docs**: `test/AGENTS.md` (*Commands*: eight checks), `docs/repository.md` (`scripts/`), *Internal → Tests and
   checks* (item 8), the comment of `RETRY_PAUSES`.

Rejected: **a vitest test**, which runs at the root's pin only; **measuring the pauses in a browser**, which is
timing-based and would be flaky on a loaded machine if checked tightly enough to catch a change; **a warning**, which
would leave "as Playwright's actions do" untrue unnoticed.

**Why**: POMWright says it mirrors Playwright here, and a value it cannot import is checked where a new Playwright
first appears.
