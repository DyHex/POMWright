# PLAN-D18-D19-D28 — when a seed counts as applied, and failures while it registers

Three findings of [PLAN-T](PLAN-T-candidates-triage.md) in the seed registry's timing, and T16's comment. One plan,
because they change the same two files and the same Internal page; three commits, one per defect.

## Intended contract

- **D18** (narrowed, [DECISIONS.md](DECISIONS.md) 31 and 33). A seed is never skipped silently: if the main-frame
  document that takes a seed out of pending does not write it, the test fails at the `seed` line, saying why. The script
  never writes into the browser's error page. A navigation to a seeded origin that fails therefore fails the test on
  Chromium (at the retry) and Firefox (at its error page); the docs say so and give no recipe for retrying, since keeping
  a test going is not `seed`'s business.
- **D19.** `seed` decides from the page *at the call* whether it is on the origin, and watches for a commit on the origin
  from the call on, whatever Playwright does before the step's body runs.
- **D28.** Every `seed` failure names the call (`Shop.SessionStorage.seed:`) and points at its line, also when the page
  closes while the seed registers.

## Verified current behaviour

All on the packed build of `8ccfbd4`, Playwright 1.64.0, three browsers (PLAN-T *Results*, and the event probe below).

**D18.** The script tests `location.origin` ([../src/helpers/sessionStorageSeed.ts#L91](../src/helpers/sessionStorageSeed.ts#L91))
and skips, without a word, any document whose `navigation.activation.from` is set
([#L94](../src/helpers/sessionStorageSeed.ts#L94)). The registry takes a seed out of pending at any main-frame commit
whose URL is on the origin ([#L290-L305](../src/helpers/sessionStorageSeed.ts#L290-L305)). The events of a failed
navigation to B followed by a retry, recorded with Playwright alone (an init script logging each document, and the
page's events):

| | Chromium | Firefox, refused or offline | Firefox, `route.abort("failed")` | WebKit |
| --- | --- | --- | --- | --- |
| order | `requestfailed` → `goto` rejects → `framenavigated chrome-error://chromewebdata/` | `requestfailed` → `goto` rejects → `framenavigated B/` | `requestfailed` → `goto` rejects; nothing commits | no `requestfailed`; `goto` rejects; nothing commits |
| error document | `location.origin` `null` | `location.origin` B, **`self.origin` `null`**, `documentURI` `about:neterror?…` | — | — |
| retry's document | `activation.from` = `B/` (the error entry), `navigationType` `replace` | `from` = `B/` (the error entry) | `from` `null` | `from` `null` |

So on Chromium the retry's script sees a set `from` and skips; the registry takes the seed out at the retry's commit; the
app starts with `{}` and the test passes. On Firefox the error document commits at B's URL, takes the seed out, runs the
script (whose `setItem` throws `NS_ERROR_NOT_AVAILABLE` on the opaque document), and the test fails with
`could not write sessionStorage … the app loaded without the entries`, though no app loaded.

**D19.** `seed` computes "on the origin at the call" and starts the commit watch inside the step's body
([../src/helpers/sessionStorage.ts#L466-L478](../src/helpers/sessionStorage.ts#L466-L478),
[../src/helpers/sessionStorageSeed.ts#L187-L195](../src/helpers/sessionStorageSeed.ts#L187-L195)). Playwright 1.64's
`test.step` first awaits `testInfo._onUserStepBegin` (`playwright/lib/common/index.js:2410`), which with
`video: { show: { test } }` updates the overlay in every page of the context (`lib/index.js:754-791`). A commit on the
origin during that wait makes the body see the page on the origin: `seed` writes at once, after the app's first
script. With the overlay on, Firefox and WebKit resolved without the entries 10/10 in both racing scenarios; with it
off, every browser threw the in-flight error.

**D28.** The registry's calls into the page are not wrapped: the Navigation API check's `evaluate`
([#L246-L266](../src/helpers/sessionStorageSeed.ts#L246-L266)), `addInitScript` ([#L226](../src/helpers/sessionStorageSeed.ts#L226))
and the disposals. `void seed(); await page.close()` fails the right test with
`Error: page.evaluate: Target page, context or browser has been closed` and no further frame, against
[seeding-session-storage.md](../website/src/content/docs/docs/seeding-session-storage.md) ("Every one of these failures
points at the line that called `seed`").

**T16.** `register` stores the new pending seed before it awaits the previous script's disposal
([#L235-L242](../src/helpers/sessionStorageSeed.ts#L235-L242)); a rejected disposal then fails the call with the merged
entries pending, against the doc comment at [#L173](../src/helpers/sessionStorageSeed.ts#L173). Playwright rejects a
disposal only after the page has closed, so no test can observe it (unit probe).

## Options for D18

- **A. Docs only.** A row in *What `seed` cannot do*. The silent loss on Chromium stays.
- **B. Never silent (decided, with the `self.origin` test):**
  1. The script tests `self.origin` instead of `location.origin` before it writes. A browser's error page has an opaque
     origin (Chromium's `chrome-error://` page and Firefox's `about:neterror` document, table above): a browser cannot
     give an error page the origin's storage or cookies without a security hole, so this holds across versions. On every
     other document the two are equal.
  2. The script reports when it does not write in the main frame on its origin's URL: `error-page` (`location.origin` is
     the origin, `self.origin` is not) or `not-first-arrival` (`from` is set). If that document is the one that took the
     seed out of pending, the registry fails the test at the `seed` line with `notAppliedError`. Any document that takes
     a pending seed and does not write it fails the test, whatever a browser does in a later version.
- **C. Make the retry apply the seed.** The registry would listen to `request` and `requestfailed`, treat the commit
  after a failed navigation as the error page, and re-register the script so that it accepts the error page's history
  entry as `from`. It rests on browser behaviour without a guarantee (that the error entry is the retry's `from`, that
  Firefox commits its error page at the origin's URL, the order of the events, Playwright's error texts for aborted
  requests), and a change there could misread a real arrival. Not adopted, and not filed as an issue either
  ([DECISIONS.md](DECISIONS.md) 34); the draft is kept in
  [issues/08-seed-after-failed-navigation.md](issues/08-seed-after-failed-navigation.md).

## D19 and D28

- **D19, one option.** `seed()` reads the main frame's URL and starts a commit watch synchronously, before
  `this.step(...)`, and hands both to the registry: `add(origin, entries, title, site, writeOnOrigin, atCall)`, where
  `atCall` carries the origin at the call and "has the main frame committed on X since the call". The watch stops when
  the call settles. The turn's other checks stay as they are.
- **D28, one option.** The registry wraps every error from its own calls into the page: when the page has closed
  (`SeedPage` gains `isClosed()`, which `Page` has), `Shop.SessionStorage.seed: the page closed while seed() was
  registering the seed for <origin> (keys: …); await seed() before the test ends`; otherwise the label in front of
  Playwright's message. Both with `atCallSite(…, site)` and the original as `cause`. The overlay's own
  `Execution context was destroyed`, raised by Playwright's `test.step` before the body runs, is Playwright's and stays
  as it is.
- **T16.** The comment says what holds: a call that fails before its script is registered leaves the pending seed as
  it was.

## Implementation steps

1. **The retry the docs would show** (done 2026-10-23, 3 repeats, current build): a hop to `about:blank` before the
   retry, `seed` again, or both. None applies the seed on every browser: on Firefox, a refused or offline navigation
   commits its error page at the origin's URL, and that page takes the seed. So the docs give no retry; they state that
   such a navigation fails the test ([DECISIONS.md](DECISIONS.md) 33).
2. **D28** (`sessionStorageSeed.ts`): `isClosed()` on `SeedPage`; the wrapper around the evaluation, `addInitScript` and
   the disposals; the comment of T16.
3. **D19** (`sessionStorage.ts`, `sessionStorageSeed.ts`): the call-time snapshot and watch in `seed()`; `add()` uses
   them.
4. **D18** (`sessionStorageSeed.ts`): the `self.origin` test and the two skip reports in `seedScript`; the report's
   handling in `onConsole` and `notAppliedError`, one message per reason, for example
   `Shop.SessionStorage.seed: the seed for <origin> (keys: …) was not applied: a navigation to <origin> failed, and the browser counts the next arrival as a return there; …`.
   The exact texts are fixed by the unit tests and copied from the build into the docs.

## Tests

- Unit (`sessionStorageSeed.test.ts`): `seedScript` skips a document whose `self.origin` differs from its
  `location.origin` and reports `error-page`; reports `not-first-arrival` when `from` is set; the registry fails with
  `notAppliedError` when the document that took the seed reports a skip, and ignores a skip report for an origin it has
  no applied seed for; wraps a closed page's error with the label and the call site; uses the call-time origin and
  watch.
- Harness (`sessionStorage.spec.ts`): a pending seed, a first `goto` that fails (`route.abort("failed")`,
  `route.abort("connectionrefused")`, offline), a retry: on Chromium and Firefox the test fails with the not-applied
  message at the `seed` line (`test.fail()`, the message read as the call-site specs do); on WebKit the seed applies.
- Harness: every existing hop scenario (link, 302, chain, POST 303/307/308, meta refresh, `top.location` from a frame,
  service workers, the popup, `/teststorage/race`) stays green: none may trip the new failure.
- Harness, a file with `test.use({ video: { mode: "on", show: { test: {} } } })`: an un-awaited `seed` raced by `goto`
  on five fresh pages throws the in-flight error, never resolves without the entries.
- Harness: `const seeding = seed(…); await page.close();` rejects with the closed-page message and a stack that starts
  at the spec's line.

## Docs

- *Seeding session storage*: *What `seed` cannot do* gains a row for a navigation to the origin that fails (the test
  fails); *Errors* gains the not-applied and closed-page messages (copied from probes).
- *Internal → The seed registry*: the `self.origin` test, the skip reports and the failure they raise, the call-time
  snapshot; why the retry is not made to apply (option C and its reasons).
- API page and doc comment of `seed`, *Error messages*: the new messages.
- `AGENTS.md` section 5 (the seed paragraph: the script's origin test and its reports, the call-time decision) and the
  `sessionStorageSeed.ts` entry of section 2.

## Changesets

Three, `patch`:

- D18: a seed that the document arriving at its origin does not write now fails the test instead of passing silently
  (Chromium, after a failed navigation there), and Firefox no longer blames a refused write on its error page.
- D19: with Playwright's step overlay, a racing `seed` fails instead of resolving without its entries.
- D28: a page that closes while `seed` registers fails with the label and the call site.

## Decisions

- [x] D18, option B with the `self.origin` test; option C not adopted and not filed (2026-10-23, [DECISIONS.md](DECISIONS.md) 31).
- [x] D19 and D28 as described; the overlay's own error stays Playwright's (2026-10-23).
- [x] Order: step 1, then D28, D19, D18 (each its own commit).
