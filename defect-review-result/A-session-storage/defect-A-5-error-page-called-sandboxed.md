# A-5: On Firefox's error page after a failed navigation to the origin, `set`, `get` and `seed` say the document is sandboxed

- **Kind**: defect
- **Area**: Session storage: errors of `set`, `get`, `clear` and an on-origin `seed` on a document with an opaque origin
  (`17426a5`)
- **Severity**: Low (a misleading message: Firefox only, after a navigation to the helper's origin that failed; the call
  fails as it should, but the message names a cause, sandboxing, that is not the one)
- **Semver of the fix**: patch (a message corrected; AGENTS.md §7)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer A (Claude Opus 5.5)
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #26](../DECISIONS.md))

## Contract

- The project's rule for messages: "Error messages name the registry path … and the DSL method the user called"
  (AGENTS.md §5), and the skill's check that a message names the actual cause and the fix.
- The registry already knows the case: `notAppliedError` says "the document that arrived on … has an opaque origin (the
  browser's error page after a failed navigation, or a sandboxed document)" (`src/helpers/sessionStorageSeed.ts:149-160`;
  `api/errors.md`, *seed*), and *Internal → The seed registry*, *The script*, says "Firefox commits [its error page] at
  the origin's URL".
- `.changeset/sandboxed-document-message.md` and `docs/session-storage.md` (*Through a page object*) describe the
  opaque-origin message for "a document whose own origin is opaque, such as one served with
  `Content-Security-Policy: sandbox`".

## Reproduction

Probe `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/errorpage.spec.ts`: the page on the second
origin, `context.setOffline(true)`, `page.goto("http://localhost:9000/teststorage")` (fails), then `set`, `get` and
`seed` from `new SessionStorage(page, { label: "Shop", origin: "http://localhost:9000" })`.

```sh
# from the worktree root
cp /home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/errorpage.spec.ts test/tests/zz-probe-errorpage.spec.ts
pnpm -C test exec playwright test tests/zz-probe-errorpage.spec.ts --reporter=line --project=firefox
rm test/tests/zz-probe-errorpage.spec.ts
```

Run on all three browsers: exit code 1 (chromium and webkit end with a never-applied seed, which is that probe's own
doing). Log: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/out/errorpage.101312.log`.

## Observed / expected

Firefox:

```text
url http://localhost:9000/teststorage, self.origin null
set: Shop.SessionStorage.set: the document at http://localhost:9000/teststorage cannot use sessionStorage: its origin is opaque, as in a sandboxed document (Content-Security-Policy: sandbox without allow-same-origin)
get: Shop.SessionStorage.get: the document at http://localhost:9000/teststorage cannot use sessionStorage: its origin is opaque, as in a sandboxed document (Content-Security-Policy: sandbox without allow-same-origin)
seed: Shop.SessionStorage.seed: the document at http://localhost:9000/teststorage cannot use sessionStorage: its origin is opaque, as in a sandboxed document (Content-Security-Policy: sandbox without allow-same-origin)
```

For comparison, Chromium on its error page: `Shop.SessionStorage.set: the page has no origin yet
(chrome-error://chromewebdata/); navigate to the origin first or use seed()`, and WebKit stays on the previous page.

Expected: a message that covers the case, as the not-applied failure already does, for example "… its origin is
opaque: the browser's error page after a failed navigation, or a sandboxed document (Content-Security-Policy: sandbox
without allow-same-origin)". A tester reading the current text looks for a CSP header that is not there.

## Cause

`src/helpers/sessionStorage.ts:313-320` (`access`): any failure on a document whose `self.origin` is `"null"` is worded
as a sandboxed document.

## Fix plan

- **Intended contract**: the opaque-origin message names both documents that have one at an origin's URL.
- **Options**:
  1. **Reword the message** to name the error page and the sandboxed document, as `notAppliedError` does.
     **Recommended**: one string.
  2. Tell the two apart by some property of the browser's error page (not probed here). Precise, but it would rest on
     a browser detail without a guarantee, which *Internal → The seed registry* avoids elsewhere.
- **Implementation steps**: the message in `access`; the matching unit test in `src/helpers/sessionStorage.test.ts`
  ("a refused storage call", "on a sandboxed document says its origin is opaque").
- **Tests**: a Firefox harness case: offline, a failed `goto` to the origin, then `set` rejects with the new message;
  the sandboxed case in `test/tests/testApp/sessionStorage.spec.ts:67-76` updated.
- **Docs**: `docs/session-storage.md` (*Through a page object* and *Errors*), `api/class-sessionstorage.md` (`set()`),
  `api/errors.md` (*Session storage*), the `@throws` of `set`; grep `website/` for "as in a sandboxed document".
- **Changeset**: patch. "On a document with an opaque origin, the session storage message now names the browser's error
  page after a failed navigation as well as a sandboxed document."
- **Decisions to tick**:
  - [x] Option 1
  - [x] (added) Tests on all three browsers with the `browserName` fixture (each browser's outcome); docs as listed; the
    pending `.changeset/sandboxed-document-message.md` amended instead of a new changeset ([DECISIONS.md #26](../DECISIONS.md))
- **Execution order**: with A-3 if its message changes too (both are the wording of an opaque or skipped document).
