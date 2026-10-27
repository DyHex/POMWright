# Plan 22: the opaque-origin message; the never-applied message for several seeds

- **Decisions**: [DECISIONS.md](DECISIONS.md) #26, #30
- **Findings**: [A-5](A-session-storage/defect-A-5-error-page-called-sandboxed.md),
  [R-2](report.md#r-2-the-never-applied-message-for-several-origins); test gap #16's never-applied part
- **Bump**: patch (the pending `sandboxed-document-message.md` amended; one new changeset)
- **Stop**: no
- **Depends on**: plans 20 and 21 (the same files and messages)

## Contract

- A storage call on a document whose own origin is opaque fails with a message naming both documents that have one at
  an origin's URL: `… cannot use sessionStorage: its origin is opaque (the browser's error page after a failed
  navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)` (final text from a
  probe), worded like `notAppliedError`'s opaque case. The two are not told apart.
- When seeds for several origins are never applied, the failure says "were never applied" and lists each seed with its
  helper's label and the location of its `seed` call (the first non-bundle frame of the site already captured, the path
  relative to the working directory), for example `Popup.SessionStorage.seed at fixtures/popup.ts:20:5, for
  http://localhost:9003 (keys: k)`; the error's code frame stays at the first seed's call. The one-origin message is
  unchanged (`.changeset/empty-seed.md` quotes it).

## Current behaviour

- `src/helpers/sessionStorage.ts:313-319` (`access`): every opaque-origin failure says "as in a sandboxed document", while
  Firefox commits its error page after a failed navigation at the origin's URL with an opaque origin
  (`…-probes/A/out/errorpage.101312.log`).
- `src/helpers/sessionStorageSeed.ts:162-175` `neverAppliedError` joins the seeds with "and … was never applied" and
  takes the first seed's title and call site (`…-probes/R/r2-never-applied.out`).

## Steps

### Step 1: A-5

1. `access`: the new text. Grep `website/`, the doc comments and `.changeset/` for "as in a sandboxed document" and
   update each.
2. **Tests**: a harness case on chromium, firefox and webkit (offline, a failed `goto` to the origin, then `set`),
   asserting each browser's outcome with the `browserName` fixture: Firefox the new message; Chromium "the page has no
   origin yet (chrome-error://chromewebdata/)"; WebKit still on the previous page. The sandboxed case
   (`sessionStorage.spec.ts:67-76`) and the unit test in `src/helpers/sessionStorage.test.ts` take the new text.
3. **Docs**: *Session storage* (*Errors* table row, *Through a page object*); `api/class-sessionstorage.md` (**Throws**);
   `api/errors.md` (*Session storage*); the `@throws` of `set`, `get`, `clear` and `seed`.
4. **Changeset**: amend `.changeset/sandboxed-document-message.md` (unreleased) to quote the new text and name the error
   page.

### Step 2: R-2

1. `neverAppliedError`: for one pending seed, today's text; for several, "were never applied" and one line per seed
   (label, `seed at <file>:<line>:<column>` from the seed's captured site, relative to `process.cwd()`, the origin and its
   keys). Wording from a probe.
2. **Tests**: a unit case in `src/helpers/sessionStorageSeed.test.ts` with two helpers and three pending origins,
   asserting the plural, the labels and the locations; a two-origin case beside the existing never-applied harness spec.
3. **Docs**: the several-seed form on `api/errors.md` (*seed*); one line on *Seeding session storage* where the
   never-applied failure is described.
4. **Changeset** `never-applied-several-seeds.md` (`patch`): "When seeds for several origins are never applied, the
   failure says 'were never applied' and lists each seed with its helper and the line that called it; before, it named
   and pointed at the first seed only."

## Verify

The standard checks (PLANS.md, rule 5) after each step; `pnpm docs:build`.

## Commit

```text
fix: the opaque-origin storage message names the browser's error page too

Plan: defect-review-result/PLAN-A-5-R-2-storage-messages.md (step 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

```text
fix: the never-applied failure for several seeds lists each seed and its call

Plan: defect-review-result/PLAN-A-5-R-2-storage-messages.md (step 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27.

**Step 1 (A-5).**

- `access`: `… the document at <url> cannot use sessionStorage: its origin is opaque (the browser's error page after a
  failed navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)`, with a comment
  that nothing guaranteed tells the two apart; the method's own comment and `set`'s `@throws` say "a document with an
  opaque origin".
- Probe (a temporary spec, deleted after the run, three repeats per browser): after `context.setOffline(true)` and a
  failed `goto` to A from a page on B, a `set` from a helper bound to A, once the error page has committed: Firefox
  `url=http://localhost:9000/teststorage` and the new message; Chromium `url=chrome-error://chromewebdata/` and
  `… the page has no origin yet (chrome-error://chromewebdata/); navigate to the origin first or use seed()`; WebKit stays
  on B and gives the origin message. A first run without waiting for the commit gave the origin message on all three:
  Chromium and Firefox commit their error page a moment after `goto` rejects, so the spec waits for it
  (`waitForURL(…, { waitUntil: "commit" })`) on those two.
- Tests: harness (`sessionStorage.spec.ts`, three browsers), the describe renamed *a document with an opaque origin*:
  the new case, each browser's message through the `browserName` fixture; the sandboxed case (renamed *a sandboxed
  document: …*) and the unit test take the new text.
- Docs: *Session storage* (*Through a page object*, both documents and why the message names both; the *Errors* row,
  "a document with an opaque origin"); `api/class-sessionstorage.md`, `set()` **Throws**; `api/errors.md`, *Session
  storage*. `.changeset/sandboxed-document-message.md` amended (the error page, the new text).
- Checks: `pnpm lint` 0; `pnpm test:unit` 886 passed; `pnpm pack-test --reporter=line` exit 0 (1,596 passed, 3
  skipped; doc snippets 221; api coverage 0 problems; step locations 29); `pnpm docs:build` 0.

**Step 2 (R-2).**

- `callSite.ts`: `siteText(site)`, a captured site's first frame outside POMWright's bundle as `file:line:column`, the
  path relative to the working directory when the file is inside it and as it is otherwise (a path outside would read
  `../../…`).
- `neverAppliedError`: one pending seed, today's text; several: `<first seed's title>: <n> seeds were never applied: the
  page closed without navigating to their origins; remove the seed calls, or navigate to the origins before the test
  ends:` and one indented line per seed, `<title> at <file:line:column>, for <origin> (keys: …)` (the `at` part left out
  when the site has no frame); the error's call site stays the first seed's. Message from the build (chromium):
  `TestStorageSecond.SessionStorage.seed: 2 seeds were never applied: …:` /
  `  TestStorageSecond.SessionStorage.seed at tests/testApp/sessionStorage.spec.ts:1005:42, for http://127.0.0.1:9000 (keys: a)` /
  `  Pay.SessionStorage.seed at tests/testApp/sessionStorage.spec.ts:1006:83, for https://pay.example (keys: orderId)`
  (the harness's working directory is `test/`).
- Tests: unit (`sessionStorageSeed.test.ts`): the old two-origin case becomes two helpers and three origins, a site
  inside the working directory (relative) and one outside (as it is), the stack at the first seed's call;
  `callSite.test.ts`, `siteText` (a bundle frame skipped; relative and absolute; no frame). Harness
  (`sessionStorage.spec.ts`, *overlapping seeds that are never applied*): seeds for two origins from two helpers, the
  error handed over through the describe's file, the whole message matched with each call's `file:line:column`.
- Docs: `api/errors.md`, *seed* (the several-seed form); *Seeding session storage*, *Errors* (one sentence). Changeset
  `never-applied-several-seeds.md`.
- Checks: `pnpm lint` 0; `pnpm test:unit` 890 passed; `pnpm pack-test --reporter=line` exit 0 (1,602 passed, 3
  skipped; doc snippets 221; api coverage 0 problems; step locations 29); `pnpm docs:build` 0.
