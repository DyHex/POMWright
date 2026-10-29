# Plan: session storage (2T-3, 2A-9, 2A-1, 2A-2 with 2A-10, 2A-3, 2A-4, 2A-8; docs: 2A-5, 2A-6, 2H-6, 2Z-2, 2F-4)

- **Decisions**: [80, 81, 83, 84, 85, 86, 97, 102, 106 (point 3)](DECISIONS.md) (2026-10-29)
- **Findings**: [2A-9](A-session-storage/defect-2A-9-unbound-waiting-call-acts-on-other-origin.md) (Medium),
  [2A-1](A-session-storage/defect-2A-1-seed-fails-during-redirect-chain.md) (Medium),
  [2A-2](A-session-storage/defect-2A-2-no-origin-message-on-inherited-or-closed-popup.md),
  [2A-10](A-session-storage/defect-2A-10-opaque-check-reads-shadowable-origin.md),
  [2A-3](A-session-storage/defect-2A-3-inputs-read-after-the-call.md),
  [2A-4](A-session-storage/defect-2A-4-keys-unquoted-in-messages.md) (Low),
  [2A-8](A-session-storage/defect-2A-8-same-origin-navigation-stops-a-batch.md) (design),
  [2T-3](T-tests-and-checks/defect-2T-3-test-fail-hides-assertions.md) (a test gap)
- **Bump**: patch. Two new changesets (decision 81; decision 85's released seed messages); six pending ones corrected
- **Stop**: after this plan is written, for the maintainer's review; after the commits, nothing (no CI change), unless
  something unexpected comes up
- **Depends on**: nothing; decision 79's commits are pushed

## Contract

1. **A waiting call stays with what it joined (decision 80).** When its turn starts, a call of a helper without an
   origin compares the page with what it joined: the origin, or on a page-wide turn (a URL without an origin) the URL
   whole. When they differ it fails and does nothing: `<label>.SessionStorage.<method>: the page left <origin or URL>
   for <origin or URL> while <method>() waited for its turn; the call did nothing`. A bound helper's check is unchanged
   and runs first.
2. **`seed`'s Navigation API check waits out redirects (decision 81).** The evaluation is repeated while it fails with
   Playwright's "Execution context was destroyed" and the page is open, up to 20 times (the default of Playwright's
   `maxRedirects`, a convention, which the comment says); any other error is tried once more, as now; past the bound,
   Playwright's error goes through with the label.
3. **A failed call is explained from `document.domain` (decision 83).** One evaluation on failure: a URL without an
   origin and `""` gives "the page has no origin yet"; a URL without an origin and a host (an inherited popup), or an
   evaluation that fails (a closed page), gives Playwright's error, labeled; a URL with an origin and `""` gives the
   opaque message; otherwise Playwright's error, labeled. `self.origin` stays where the origin itself is needed
   (`assertInheritedOrigin`, `seed` on a popup).
4. **Arguments are taken at the call (decision 84).** Before the step: the values are encoded (the codec's error is
   held and thrown inside the step after the origin check), the key lists of `get` and `clear` copied, `seed`'s
   `options.origin` read. The step, the messages, the reported line and the order of errors stay.
5. **Keys are quoted (decision 85)** with `JSON.stringify` in every message that names them (`eachKey`,
   `describeKeys`).
6. **A navigation within the origin still stops a call (decision 86)**, and the navigation messages name where the page
   went: its origin and path, no query or fragment (the whole URL when it has no origin), read when the message is made:
   `Shop.SessionStorage.set: the page navigated to https://shop.example/home while set() was writing to
   https://shop.example; 2 of 60 keys were written ("k0", "k1"); "k2" was being written and may have reached the new
   document`.

## Current behavior (re-checked 2026-10-29, at the branch, whose `src/` and `test/` equal `d850405`)

- [sessionStorage.ts:454-461](../src/helpers/sessionStorage.ts#L454-L461), `inTurn`: `assertOnOrigin` returns at once
  for a helper without an origin. The review's probe p09, re-run: the waiting `set` wrote into the other origin, `get()`
  read it, `clear()` emptied it.
- [sessionStorageSeed.ts:356-376](../src/helpers/sessionStorageSeed.ts#L356-L376), `assertNavigationApi`: one retry.
  Probe p02, re-run on chromium: 2, 3 and 5 redirects, 15 of 15 seeds failed each; one redirect, none.
- [sessionStorage.ts:317-345](../src/helpers/sessionStorage.ts#L317-L345), `access`: the URL alone decides "no origin
  yet"; `self.origin === "null"` decides the opaque message. Probe `A/triage/domain.spec.ts` (three browsers):
  `document.domain` is `""` on sandboxed documents, with or without `var origin` or `var domain`, and on a new page's
  `about:blank`; the host on an ordinary document and an inherited popup; `var origin` shadows `self.origin`.
- [sessionStorage.ts:500-507](../src/helpers/sessionStorage.ts#L500-L507) and `get`, `clear`, `seed`: arguments read in
  the step or the turn. Probe p01 `-g P1`, re-run: `set` and an on-origin `seed` stored the value changed after the
  call; `get(["k"])` returned the key added later.
- [sessionStorage.ts:411](../src/helpers/sessionStorage.ts#L411) and
  [sessionStorageSeed.ts:117](../src/helpers/sessionStorageSeed.ts#L117): keys joined bare.
- `guarded` ([sessionStorage.ts:347-380](../src/helpers/sessionStorage.ts#L347-L380)) and `navigatedDuring`: the
  messages name the origin left, not where the page went.

The review's sketches for 2A-9, 2A-1, 2A-2 and 2A-10 are evidence for the causes, not the fixes (decisions 80, 81, 83
differ from them).

## Implementation (one commit per step)

0. **The tests under `test.fail`** (decision 97), first, so the plan's new tests sit beside ones that can fail: the
   popup test without `test.fail` (its storage `{}`, then the seed arriving on the original page); the refused write
   and the never-applied seed at the page's own close as serial pairs, the follower asserting `startup` and the
   message; each new assertion inverted once to see it fail, on three browsers.
1. **`access` from `document.domain`** (decision 83). One `page.evaluate(() => document.domain)` on failure, `.catch`
   to "cannot answer"; the branches of the contract; its comment says why `document.domain` (the opaque origin's empty
   string, which no global of the page replaces). Unit tests first (below), then the change.
2. **Messages: quoted keys and the destination** (decisions 85, 86). `describeKeys` and `eachKey` quote each key; a
   small helper renders the destination (origin and path; the whole URL without an origin); `eachKey`'s message and
   `navigatedDuring` say "the page navigated to <destination> while …". Every page, `@throws`, changeset example and
   spec that shows these messages follows, each copied from a test run against the build.
3. **The waiting call of a helper without an origin** (decision 80). `inTurn` keeps what the call joined (the origin, or
   the URL on a page-wide turn) and checks it in the turn after `assertOnOrigin`; the message of the contract.
4. **Arguments at the call** (decision 84). `set` and `seed` encode before the step into either the entries or a held
   error; `get` and `clear` copy their key lists; `seed` reads `options.origin`. The step body throws the held error
   after `assertOnOrigin`.
5. **The bounded retry** (decision 81). `assertNavigationApi` loops while the error is the destroyed-context one, the
   page is open and fewer than 20 tries were made; the comment cites `maxRedirects`'s default as the convention.
6. **The session storage pages** (decision 102, item 23): the sandboxed arrival's row on *Seeding session storage* and
   "a failed navigation there, or a sandboxed document" on the API page and in `seed`'s `@throws`; the second case that
   compiles on *Session storage*, in `src/helpers/AGENTS.md` and in `.changeset/schema-type-and-value.md` (with 2F-4's
   edit of that changeset, item 27); the codec key's value as an exception on *Installation*; the RegExp base's helper
   without an origin on the API page's `sessionStorage` and in its doc comment.
7. **The base class's way out** (decision 106, point 3, item 27): `.changeset/schema-type-and-value.md` and *Organizing
   a project* (a base class that takes the options as a type parameter; the subclass declares `{ storage: typeof
   schema }`); `SchemaNeedsStorageType` (`src/pageObject.ts`) adds "…, or a base class's options type parameter", with
   *Types* and *Error messages*; the harness case at `publicTypes.typecheck.ts` lines 578-584 gains the subclass form.

## Tests

Each test fails before its step and passes after it.

- Unit, `src/helpers/sessionStorage.test.ts`:
  - *a refused storage call*: the fake page answers `document.domain`: an inherited popup (a host on `about:blank`) and
    a closed page (the evaluation throws) give Playwright's error, labeled; an opaque document (`""`) the opaque
    message; `about:blank` with `""` "no origin yet"; an ordinary document Playwright's error.
  - *a batch the page leaves*: an empty key and one holding `", "` quoted; the destination with origin and path, a
    query and a fragment dropped, and a destination without an origin printed whole.
  - a new group, *a call that waited for its turn*: a helper without an origin whose page moved to another origin, and
    a page-wide turn whose URL changed, fail with the message and run nothing; a bound helper keeps its message; a
    helper without an origin still follows the page between awaited calls.
  - *arguments at the call*: `set` (a codec value object changed after the call), `get` and `clear` (key arrays changed
    after the call) and `seed` (entries and `options.origin`) act as passed; a codec error still comes from inside the
    step, after the origin check (a wrong origin and a bad value fail on the origin).
- Unit, `src/helpers/sessionStorageSeed.test.ts`: *error builders* quote keys (an empty key, one holding `", "`);
  *SeedRegistry*: an evaluation destroyed 3 times then answering registers; destroyed 21 times fails with Playwright's
  message; another error twice fails, as now.
- Harness, `test/tests/testApp/sessionStorage.spec.ts`:
  - *a document with an opaque origin*: a sandboxed document whose script declares `var origin` gets the opaque
    message on all three browsers; the existing *after a failed navigation to the origin* stays green (Firefox's error
    page, which the probe did not reach).
  - *a popup on about:blank, which inherits its opener's origin*: a 6 MiB write gets the browser's quota error, labeled;
    a call after `popup.close()` gets Playwright's closed-page error, labeled.
  - *the page commits on the other origin between two calls that both succeed*: the waiting `set`, `get()` and
    `clear()` of a helper without an origin fail with the new message and leave the other origin's storage as it was;
    the controls of the review's sketch (a bound helper; a helper without an origin following the page between awaited
    calls).
  - *seed*: a page's first seed during chains of 2, 3 and 5 script redirects registers, and the arrival has the entry.
  - *set, get and clear*: the review's probe P1 (arguments changed after the call) as a spec.
  - The assertions of the navigation and seed messages follow decisions 85 and 86, here and in
    `test/tests/pageObject/callSite/callSite.spec.ts`.

## Docs

- `website/src/content/docs/docs/session-storage.md`: *The methods* (a navigation within the origin stops a call too,
  and why; a call takes its arguments when it is made, as Playwright's do; the examples quoted and with the
  destination); the helper without an origin (a call that waited stays with the origin it was made on, with the
  message); *Errors*.
- `website/src/content/docs/docs/seeding-session-storage.md`: *Errors* (the seed messages' keys, the navigation
  message).
- `website/src/content/docs/api/class-sessionstorage.md`: the *Throws* of `set`, `get`, `clear` and `seed`.
- `website/src/content/docs/api/errors.md`: *Session storage* and *seed*: decision 80's message, the quoted and
  destination forms (`scripts/check-error-messages.mjs` compares them with the source).
- `website/src/content/docs/internal/seed-registry.md`: *The checks in `seed`* (the bounded retry, why 20); the
  `access` explanation where the page describes it.
- The doc comments: the `@throws` of `set`, `get`, `clear` and `seed`.

## Changesets

- Corrected, unreleased: `storage-calls-take-turns.md` (a waiting call of a helper without an origin fails with its own
  message, not "the usual origin message"; a call takes its arguments at the call, as Playwright's do);
  `sandboxed-document-message.md` (an inherited popup and a closed page give Playwright's error, labeled; the opaque
  message also when the document's script declares a global `origin`); `batch-navigation-message.md`,
  `empty-seed.md`, `never-applied-several-seeds.md`, `seed-closed-page-message.md` (the examples quoted and with the
  destination).
- New, `seed-redirect-chain.md` (patch): "`seed` no longer fails on Chromium when the page replaces its document more
  than once during its first seed's Navigation API check, as an app that redirects itself on load does. Before, every
  such seed failed with Playwright's `Execution context was destroyed`."
- New, `quoted-storage-keys.md` (patch): "Storage messages quote the keys they name, as `get`'s messages always did:
  `(keys: "orderId")` instead of `(keys: orderId)`, so an empty key or one holding `, ` reads as itself."

## Verification

Per step: `pnpm lint`, `pnpm test:unit`, the storage specs on chromium. At the end: `pnpm typecheck` (the snippet, API
and error-message checks), `pnpm docs:build`, the full `pnpm pack-test --reporter=line` on three browsers, the grep for
the external consumer projects' names, and the review's reproductions (p09, p02, p01 `-g P1`, `A/triage/domain.spec.ts`)
re-run against the build.

## Decisions checklist

- [x] Decision 80: the joined origin or URL checked at the turn; the message; the changeset corrected
- [x] Decision 81: the retry bounded at 20; Playwright's error past it; a new changeset
- [x] Decision 83: `document.domain`; `self.origin` kept where the origin is needed; the changeset extended
- [x] Decision 84: every argument at the call, errors in today's order
- [x] Decision 85: keys quoted; four changesets corrected; a new changeset
- [x] Decision 86: the call keeps failing; the destination in the messages; the docs sentence
- [x] Decision 97: the tests under `test.fail` restructured, first
- [x] Decision 102: the four corrections of the session storage pages
- [x] Decision 106, point 3: the base class's way out in the changeset, the page and the message

## Execution

Eight commits, one per step above, each with its tests, docs and changeset text, named
`fix(storage): …` with `Plan: defect-review-result-2/PLAN-2A-session-storage.md` and the `Co-Authored-By:` trailer; the
decisions, finding statuses and ledger rows of items 2 to 8 go in with the first. The maintainer pushes.
