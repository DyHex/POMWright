---
title: The seed registry
description: "How seed() stores entries before the app's first script: one registry per page, an init script per origin written only on the first arrival and removed at the commit, and the failures."
---

`seed()` stores session storage entries for an origin the page is not on yet, so the app finds them when it starts
there. This page explains how it does that without touching the navigation, and when it fails. How to use it is on
[Seeding session storage](/POMWright/docs/seeding-session-storage/).

## The problem

An app that reads session storage as it starts must find the entries there before its first script runs. Writing
after the load is too late, and writing from a `framenavigated` listener races the app's first script and loses.
Playwright's `addInitScript` runs before the first script of every new document, so it is the place to write, and since
Playwright 1.59 it returns a `Disposable` that removes it. Two things are left to solve: when to remove it, and what it
must not do in the documents that run it before then.

## One registry per page

`SessionStorage.seed()` hands the entries to the page's `SeedRegistry` (`src/helpers/sessionStorageSeed.ts`), created
on first use and kept in a `WeakMap` keyed by the page, so every `SessionStorage` on the page shares it. In the call's
turn, the registry writes the entries at once when the page is on the origin, and otherwise registers them. It keeps
one pending seed per origin; a second `seed` for the same origin registers a script with the merged entries, later
values winning, then disposes of the previous one. Calls for one origin take turns with every session storage call for
that origin on the page, in the order they were made (see
[overlapping calls](/POMWright/internal/seed-registry/#overlapping-calls)).

The first pending seed registers four listeners: `framenavigated`, `domcontentloaded`, `console` and `close`. When
nothing is pending and no applied document can still report a failure, all four are removed: a page that never seeds,
or has applied its seeds, runs exactly as without POMWright.

The seed for one origin goes through these states:

```mermaid
stateDiagram-v2
  [*] --> pending: seed, away from the origin
  pending --> pending: another seed merges its entries
  pending --> confirming: the main frame commits on the origin
  confirming --> [*]: DOMContentLoaded, or the next commit
  confirming --> failed: the script reports a refused write
  pending --> failed: the page closes after a passing test
```

## The script

`seedScript` is a plain function that Playwright serializes, so it refers to nothing outside its body. It runs in every
new document of the page, in every frame, and writes only when all three hold:

- **the main frame**: `window === window.top`, so an iframe on the seeded origin inside another page, and the
  `srcdoc` or `about:blank` frames that inherit its origin, are left alone;
- **the origin**: `location.origin` is the seeded one, and so is the document's own origin, `self.origin`. The error
  page a browser shows for a failed navigation has the URL's origin but an opaque one of its own (Firefox commits it at
  the origin's URL), and so does a sandboxed document;
- **the first arrival**: `navigation.activation.from` is `null`, so the previous document of the main frame was on
  another origin, or there was none.

The third condition is what makes disposal at the commit enough. Disposal reaches the browser a few milliseconds after
the app's first document on the origin commits, up to a few hundred under load. Without the condition, an app whose
first script writes a seeded key and reloads, or moves to another page on the origin, within that time would have the
key overwritten again: about once in a hundred such rounds on every engine. With it, a reload or a hop within the
origin has `activation.from` set and is skipped: no overwrite in 300 rounds per engine.

A write the browser refuses (the storage quota) is caught and logged with `console.error` under a prefix of
POMWright's own, with the origin and the browser's error. A document on the origin's URL that the script skips, an
opaque one or a return, is logged under the same prefix with `console.debug`, so that a test watching the console for
errors is not disturbed.

A skip matters only for the document that took the seed out of pending. After a navigation to the origin that
fails, Chromium and Firefox present the error page's history entry as the next document's `activation.from`, so the
retry looks like a return; Firefox also commits its error page at the origin's URL. Making the retry apply the seed
would mean treating some commits as error pages and accepting that entry as `from`, which rests on browser behavior
without a guarantee. So the registry does not try: such a seed fails the test, and never passes silently.

## A seeded navigation

```mermaid
sequenceDiagram
  participant Test
  participant Registry as the seed registry
  participant Browser
  participant App as the app
  Test->>Registry: seed(entries), away from the origin
  Registry->>Browser: page.evaluate, the Navigation API check, once per page
  Registry->>Browser: page.addInitScript(seedScript, the origin and the entries)
  Test->>Browser: any navigation that reaches the origin
  Browser->>App: the request, untouched
  Note over Browser: a new document - the script writes before the first script
  Browser-->>Registry: framenavigated, the main frame on the origin
  Registry->>Browser: dispose of the script
  Note over Registry: confirming until the document's DOMContentLoaded or the next commit
```

- **The commit.** When `framenavigated` reports the main frame on a pending origin, that document has already run the
  script. The registry removes the seed from the pending ones and disposes of its script without waiting for the
  browser's answer.
- **The confirming window.** A refused write reaches Node as a console message after the commit. The script runs
  before the document parses, so the message arrives before that document's `domcontentloaded` and before the next
  main-frame commit, on every engine. Until one of those, the applied seed is kept as confirming. A prefixed message
  for it fails the test from the `console` listener: a refused write, or a skip. Later messages are ignored.

## The checks in `seed`

- **The Navigation API**, once per page, by `page.evaluate` in the current document (which works on `about:blank`):
  without `navigation.activation` the script could not tell a first arrival from a reload, so `seed` throws before
  anything is registered. The check tests the `NavigationActivation` interface, not `navigation.activation`: an app's
  own global `navigation` (`var navigation = …`) shadows the latter in its document, which would make `seed` report a
  browser without the API. The script is not affected, since it runs before the document's first script. A
  navigation that replaces the document destroys the evaluation, and the next one runs in the new document; an app
  that redirects itself on load (`/` to `/login` to `/login/start`) replaces it several times, and `seed` is called
  while it does. So the evaluation is repeated while Playwright's error says the context was destroyed and the page is
  open, up to 20 times; past that, Playwright's error goes through, labeled, so an app stuck in a redirect loop fails
  the call instead of keeping it until the test's timeout. 20 follows the default of Playwright's `maxRedirects`, the
  HTTP redirects an API request follows: a convention rather than a limit, since browsers set none on script
  redirects. An HTTP redirect chain commits one document, and so needed one retry at most. Any other error is tried
  once more. Rejected: a document of POMWright's own for the check (`seed` has none), and deciding from the browser's
  name and version, which would need a table of versions instead of asking the browser.
- **A commit during registration.** A temporary `framenavigated` listener watches the main frame from the moment
  `seed` is called until its turn ends, so the wait for earlier calls and the Navigation API check are covered too.
  `seed` also reads whether the page is on the origin at that moment. Both happen before its report step's body runs,
  because Playwright may await work of its own first: with `video: { show: { test } }`, `test.step` updates an overlay
  in every page, a round trip to the browser, and a navigation can commit in that gap. Read inside the body, such a
  commit made the page look as if it had been on the origin all along, and `seed` wrote after the app's first script. If the page commits a document on the origin in that time, it is unknown whether that document ran the
  script: on Chromium, `addInitScript` resolved after such a commit whether or not the document had run it. A call
  that sees the commit before registering throws without registering; one that sees it while `addInitScript` is
  pending disposes of the new script and throws.

## Overlapping calls

A call's turn reads the pending seed, registers a script with the merged entries, stores it as the pending seed and
disposes of the previous script, with two `await`s in between. Each origin has a chain of turns
(`src/helpers/storageTurns.ts`), kept per page and shared by `set`, `get`, `clear` and `seed`: a call joins it
synchronously when it starts, and its turn starts once the previous one has settled, whether it succeeded or failed. So
calls that overlap, in a `Promise.all` or without `await`, end exactly as if each had been awaited in turn, and a call
that fails leaves the pending seed as it was. Chains are per origin, so calls for different origins never wait for each
other.

A page whose URL has no origin, such as an `about:blank` popup that inherited its opener's origin, cannot say
synchronously which origin a `set`, `get` or `clear` touches: its document may have inherited one. Such a call takes a
page-wide turn instead, after every earlier call on the page, and every later call on the page waits for it. A `seed`
there stays on its origin's chain, which the page-wide turns order it against, so seeds for different origins on a page
not yet navigated still register side by side.

A `seed` on the origin writes key by key, one round trip each, as `set` does, so two overlapping calls without the
chain would interleave and an earlier value could win. The registry therefore decides in the call's turn, not at the
call, whether to write at once or register: if the page was on the origin at the call and still is, it writes; if it has
left, it registers. On a page whose URL has no origin, at the call and in the turn, the helper asks the document, which
may have inherited the origin, as an `about:blank` popup does: it writes when it has, as `set` does there, and registers
otherwise. Registering there would let the earlier `seed` overwrite a later `set` on arrival, and Firefox counts that
arrival as a return. A navigation within the origin while the call waits is not an arrival. A call made away from the
origin keeps its commit watch from the call on, so a page that arrives while the call waits fails the call, as before.

Without the chain, two calls that overlap read the same pending seed. Each merges only that seed with its own entries,
so one call's keys are lost; the second stored record replaces the first, whose script stays registered and
untracked; and both dispose of the same previous script, the second time with Playwright's "disposed more than once"
error. The untracked script is the worst of it: since a return from another origin is a first arrival again, it writes
the seeded values after every such return, over what the app has stored. A commit watch that started only at
`addInitScript` would miss a commit during the Navigation API check: a `seed` not awaited before a `goto` on a fresh
page would resolve on Chromium without its entries.

Rejected:

- **A lock taken inside the turn**, after the Navigation API check: it orders the calls by who finished the check
  first, not by the order they were made.
- **Throwing on an overlap**: a `Promise.all` of seeds is a reasonable thing to write.
- **One browser call per `seed` on the origin** (`page.evaluate` writing every entry): it leaves `page.sessionStorage`,
  which the helper mirrors, and still relies on the order of messages rather than a rule. The chain orders every call,
  `set`, `get` and `clear` included.
- **Coalescing**, one registration of everything merged so far: the commit check would no longer belong to the call
  that made it.

## The origin around every call

`set`, `get`, `clear` and a `seed` that writes at once read the page's origin before and after each storage call they
make, each key of a batch and each read of `get(keys)` included, and fail with the navigation message when it moved,
whether or not the call threw. The read is `page.url()`, which Playwright's client keeps current from the browser's
navigation events, so it costs no round trip; each key still costs one, as Playwright's `setItem` takes one key. The
check detects a navigation and cannot prevent one: a call already sent when the page commits on another origin may act
on the new document, and the message names that key as the one in flight (see
[the methods](/POMWright/docs/session-storage/#the-methods)).

The URL cannot see a reload or a redirect within the origin, which replace the document and leave the origin as it
was. So each call also takes a handle to the page's document before its first storage call
(`page.evaluateHandle(() => document)`), evaluates it after each, and disposes of it when the call ends. Playwright
disposes of a handle when its frame navigates to a new document ("JSHandles are auto-disposed when their origin frame
gets navigated or the parent context gets destroyed"), and evaluating it then throws "Execution context was
destroyed", which the call reads as a navigation: a reload that lands between two keys of a batch stops it as one that
destroys a key in flight does. A same-document navigation (`pushState`, a hash change) and a navigation that commits no
document (a 204) leave the handle alive. `test/tests/testApp/documentHandle.spec.ts` pins this for every kind of
navigation on three browsers. The handle costs a round trip after each storage call and two per call, which roughly
doubles a batch of short values.

The message names where the page went. When only the URL moved, that is `page.url()`. When the call's document went
away, `page.url()` can still name the page the call started on: it changes when Playwright's client hears of the new
document's commit, and Chromium reports the old document's destruction first. So the call then asks the page's current
document for its `location.href`, after the failure. Playwright runs an evaluation in the frame's next document once it
exists, and the first one after the failure can still reach the old document, so the question is asked again while a
navigation destroys it, through up to 20 replacements, as `seed`'s Navigation API check is; past that, or on a closed
page, the message names `page.url()` as it is. The storage call itself is never repeated. `location.href` agreed with
`page.url()` on every page probed on three browsers, each browser's error page included, and a page cannot redefine it; `document.URL`
would not do, being `about:neterror?…` on Firefox's error page, whose `location.href` is the URL that failed.

Rejected for the destination: **waiting for the new document, then reading `page.url()`**, which passed the same probes
but relies on Playwright's client hearing of the commit before the new document answers an evaluation, which Playwright
does not promise.

Rejected: **a guarded write in the page**, one `page.evaluate` that compares `location.origin` and writes. It would
leave `page.sessionStorage`, which the helper mirrors, and run in the page's main world, among the app's own scripts.
Rejected for the document: **`performance.timeOrigin`** as its marker, since WebKit computes it on every read from two
clocks, rounded to a millisecond, so it can change within one document (it failed a call under load); and **looking
only after `framenavigated`**, which costs almost nothing but relies on two more behaviors of Playwright: an event for
every new document of the main frame, and that event delivered before the result of a call that ran in the new
document, which Playwright does not promise.

A call that fails for another reason is explained by one evaluation, `document.domain`, which the HTML standard makes
`""` exactly when the document's origin is opaque. `""` on a URL without an origin is a page with no origin yet; `""`
on a URL with one is a document whose own origin is opaque, a sandboxed one or a browser's error page; anything else,
an `about:blank` popup that inherited its opener's origin, or a closed page that cannot answer, is Playwright's error
with the label. `self.origin` would tell the same apart, but an app's own `var origin` replaces it in its document,
and nothing of the page replaces `document.domain`. Rejected: taking a missing or throwing `sessionStorage` for an
opaque origin, which a browser with storage turned off also has.

## Failures

Every failure carries the line of the `seed` call, captured when it was called (see
[call sites](/POMWright/internal/call-sites/)):

- **No Navigation API** and **a commit during registration** are thrown by the `seed` call itself.
- **A refused write**, and **a seed the arriving document skipped** (an opaque document, or a return), fail the test
  from the `console` listener at once.
- **Never applied.** When the page closes after a test that has passed so far, a seed still waiting fails it, naming
  the origin and the keys.

The listeners do not throw: Playwright's emitter calls a page's listeners in turn, without a `try`, so a throw would
skip the page's later listeners for that event, the test's own included. The error is rethrown from a microtask
instead, which fails the running test at once all the same.

## Limits

- **A popup** is another page, which does not run the page's init scripts, so a hop that opens a new tab leaves the
  seed waiting, and the page's close fails the test. Seeding every page of the context would also seed pages the test
  did not mean to.
- **A quick return.** The first-arrival condition cannot help when the app's first document on the origin writes a
  seeded key, leaves for a document that commits on another origin, and that document sends the browser straight back,
  all before the disposal arrives: the return is a first arrival again. Forced on localhost with a page that bounces
  back as its first script runs, it never happened: no overwrite in 350 rounds per engine, 300 of them with six parallel
  workers.
- **A back/forward-cache restore.** A document restored from the cache runs no script, so a back navigation that
  restored one on a seeded origin would take the seed out of pending at `framenavigated` with no document to write or
  report. It is untested, since no browser Playwright drives restores one reproducibly: Playwright turns the cache off
  in Chromium, and in Firefox and WebKit a back navigation to a seeded page that could be cached was a fresh load,
  and was seeded.

## Why not a route

An earlier design of 3.0.0, never released, had `seed` answer the navigation with a document of POMWright's own that
wrote the entries and then continued the navigation, through a `page.route`. It was chosen when `addInitScript` could
not be removed. A route sees
only what Playwright intercepts, so it needed a proxy for server redirects, synthesized `Sec-Fetch-*` headers, a
re-submitted form for POSTs (multipart and `text/plain` could not be), a fragment carried over by hand, and a detour so
that WebKit's `goto` waited for the app. Service workers and the test's own mocks bypassed it, and the app saw a
different request than without a seed. An init script runs in whatever document commits, however it was answered, and
leaves the navigation alone.
