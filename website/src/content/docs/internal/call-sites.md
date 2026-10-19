---
title: Call sites
description: "How a deferred error points at the consumer's line, why frames are never filtered by file name, and how the helpers' steps report the test's line."
---

## Errors raised later

Two errors are raised after the call that caused them: the page object's scheduled check, after its constructor
returned, and a seed's failure, when the app's document loads or when the page closes. Thrown with their own stack, they would point
at a microtask or a Playwright event handler, not at the test. `src/helpers/callSite.ts` gives them the stack of the
call instead:

- `captureCallSite(boundary)` creates an `Error` at the call and lets V8's `Error.captureStackTrace` cut its stack at
  `boundary`, a function: the `PageObject` constructor, or `SessionStorage.prototype.seed`. V8 leaves out that function's
  frame and every frame above it, so the stack starts in the code that called it, whatever its file is named. The stack
  is only formatted when it is used.
- `atCallSite(error, site)` gives the later error the captured frames, without the frames of POMWright's published
  bundle (`pomwright/dist/index.js` and its ESM entry), so the report's code frame is the consumer's line.

A consumer's file may be named `pageObject.ts` or `sessionStorage.ts`, like POMWright's own sources, so frames are
never filtered by a consumer-side file name; the boundary decides where the stack starts. The harness checks this with
consumer files of those names.

## Steps at the test's line

The report shows a step at a location Playwright takes from the stack. A `@step` row shows the line that called the
method. The helpers' steps (`LoginPage: Navigate to this Page`, `Shop.SessionStorage.set:`) pass `{ box: true }` to
`test.step`, which makes Playwright report them at the line that called the helper too: the location of a boxed step
is taken from the async stack after its first frame. Two things keep that frame chain intact in `SessionStorage`, whose
methods open their step through one helper:

- the helper that calls `test.step` is not `async`, since an `async` helper would itself be that first frame;
- each method `await`s it, and `get` writes `return await`: returning the helper's Promise without awaiting it cuts
  the async stack, and the step shows no location.

The unit tests in `src/helpers/stepLocations.test.ts` check the option, the titles and the non-async helper.
