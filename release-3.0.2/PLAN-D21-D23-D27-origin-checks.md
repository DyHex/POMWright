# PLAN-D21-D23-D27 — what origin the page is on, and what counts as an origin

Three findings of [PLAN-T](PLAN-T-candidates-triage.md) (T5, T6, T10) in how `SessionStorage` and `PageObject` decide
which origin a page or a value is. Three commits.

## Intended contract

- **D21** (narrowed, [DECISIONS.md](DECISIONS.md) 33). A helper with an origin touches only that origin's storage, also
  on a document whose URL has no origin but which inherited one (an `about:blank` popup from `window.open()`). `seed` is
  not taught about inherited origins: a seed lost there (Firefox) fails the test through PLAN-D18's backstop.
- **D23.** An origin, for `SessionStorage`'s `origin` option, `seed`'s `{ origin }` and `PageObject`'s `baseUrl`, is a
  URL with an origin in the URL standard. `chrome-extension://…/`, `app://…/` and `file://…/` have none (`new URL(…).origin`
  is `"null"`) and are rejected with the origin message, not accepted as `"null"` or rejected with a message about the
  path.
- **D27.** When the browser refuses storage on a document that has a URL origin but an opaque document origin (a
  sandboxed document), the error says so, with the helper's label, on every browser.

## Verified current behaviour

PLAN-T, packed build of `8ccfbd4`, three browsers.

**D21.** `assertOnOrigin` returns when `originOf(page.url())` is `undefined`
([../src/helpers/sessionStorage.ts#L268-L280](../src/helpers/sessionStorage.ts#L268-L280)), and `seed` decides "on
the origin" from the main frame's URL ([../src/helpers/sessionStorageSeed.ts#L187](../src/helpers/sessionStorageSeed.ts#L187)).
A popup from `window.open()` on a page at A is at `about:blank` with `self.origin` A. On it, a helper bound to B wrote
into A's storage (`set` resolved; after `goto(A)` the key was there), every browser. A `seed` for A made on the popup
registered a script; it applied on Chromium and WebKit, and on Firefox the A document's first script saw no entries and
the test passed (Firefox reports `activation.from` as the `about:blank` entry, which shares A's origin).

**D23.** `describeOrigin` returns `url.origin` whenever the host is not empty
([#L107-L115](../src/helpers/sessionStorage.ts#L107-L115)), so `chrome-extension://abcdef/`, `app://foo/`, `file://host/`
and `file://host` are accepted as the origin `"null"`; the origin check then never matches (`originOf` maps `"null"` to
`undefined`), and a seed for it never applies. `isOrigin` in [../src/helpers/url.ts#L52-L64](../src/helpers/url.ts#L52-L64)
accepts the same bases, and `assertUrlPath` then fails on the `"null"` origin with
`urlPath must be a path on the page object's origin; received "/", which names a host instead…` (D3's message,
new on this branch). Without a trailing slash, `chrome-extension://abcdef` and `app://foo` are rejected by both, with
the origin message. `ftp://host` and `ws://host` have real URL origins and are accepted.

**D27.** `access()` explains a refusal as "no origin yet" when the message matches `isNoOriginError`
([#L194-L195](../src/helpers/sessionStorage.ts#L194-L195), [#L253-L265](../src/helpers/sessionStorage.ts#L253-L265)).
On a document served with `Content-Security-Policy: sandbox allow-scripts`, Chromium and WebKit got
`Shop.SessionStorage.set: the page has no origin yet (http://localhost:9000/t10); navigate to the origin first or use seed()`
for `set`, `get` and `seed` (the page has a URL origin, and `seed` is told to use `seed()`); Firefox got the browser's
`webStorage.setItem: Window.sessionStorage getter: Forbidden in a sandboxed document …`, without the label.

## Options and recommendation

- **D21.** One option: the helper's idea of "the origin the page is on" becomes `originOf(page.url())`, or, when the URL
  has none, the main frame's `self.origin` read with one `page.evaluate` (only then, so a page on a normal URL costs
  nothing more). `assertOnOrigin` becomes `async`; its message names the URL when it differs from the origin
  (`the page (about:blank) is on http://localhost:9000, not on this page object's origin …`). `seed` is unchanged (the
  part that would have written at once on an inherited origin was dropped as a new capability, decision 33).
- **D23.** One option: both checks also require `url.origin !== "null"`. The messages stay the origin messages, with a
  clause for this case: `…; received "chrome-extension://abcdef/", whose scheme has no origin a URL can express`.
  Supporting extension pages in page objects would be a new feature (a minor); a GitHub issue (`backlog`) can carry it
  if you want it.
- **D27.** One option: on a failed storage call, `access()` reads `self.origin` (only on failure). If the URL has an
  origin and `self.origin` is `"null"`: `Shop.SessionStorage.set: the document at <url> cannot use sessionStorage: its
  origin is opaque, as in a sandboxed document (Content-Security-Policy: sandbox without allow-same-origin)`, with the
  browser's error as `cause`. If the URL has no origin: today's message, without "or use seed()" when the method is
  `seed`. Anything else: the label in front of Playwright's message, with `cause` (shared with PLAN-D31). The text
  match is no longer needed to tell the cases apart. Whether `page.evaluate` works in a document sandboxed without
  `allow-scripts` is checked in step 1; if not, the message is chosen from the URL alone.

## Implementation steps

1. Probe `page.evaluate(() => self.origin)` in a document served with plain `Content-Security-Policy: sandbox`, every
   browser.
2. D23: `url.ts` `isOrigin` and `sessionStorage.ts` `describeOrigin`; the clause in both messages.
3. D21: the current-origin read and `async` `assertOnOrigin` (its callers in `set`, `get`, `clear`, `inTurn`).
4. D27: `access()`.

## Tests

- Unit: `describeOrigin`/`normaliseOrigin` and `assertBaseUrl` reject the three schemes with and without a trailing slash;
  `ftp://host` stays accepted. `access()` chooses the three messages (a fake page whose `evaluate` returns `"null"` or an
  origin).
- Harness (`sessionStorage.spec.ts`, every browser): the popup case (a B helper's `set` on the popup throws the
  other-origin error; on Firefox a `seed` for A made on the popup fails the test through PLAN-D18's backstop); a page object with a
  `chrome-extension://abcdef/` base fails at construction with the origin message (`pageObject/` specs).
- Harness: a fixture route `/teststorage/sandboxed`, served with `Content-Security-Policy: sandbox allow-scripts`, in
  `server.js`; `set`, `get` and `seed` there fail with the opaque-origin message on every browser.

## Docs

*Session storage* (the origin check and its errors; the opaque-origin message), *URLs and navigation* (the `baseUrl`
rule names the schemes without an origin), the API pages' **Throws** of the constructor and the methods, *Error
messages*, and the doc comments; `AGENTS.md` section 5's URL and session storage paragraphs. Every message copied from a
probe of the build.

## Changesets

Three, `patch`: D21 (a helper on an inherited `about:blank` keeps to its origin), D23
(origins without a URL origin are rejected), D27 (a sandboxed document's refusal is explained).

## Decisions

- [x] D21, D23 and D27 as described (2026-10-23).
- [x] D23: no issue for page objects on extension pages (2026-10-23).
- [x] Order: D23, D27, then D21 after PLAN-D18 (2026-10-23).
