---
title: Call sites
description: "How a deferred error points at the consumer's line, why frames are never filtered by file name, and how the helpers' steps report the test's line."
---

A test's report is only as useful as the line it points at. This page explains how an error raised after the call that
caused it still points at the test's line, and how the helpers' report steps do the same.

## Errors raised later

Two errors are raised after the call that caused them: the page object's scheduled check, after its constructor
returned, and a seed's failure, when the app's document loads or when the page closes. Thrown with their own stack,
they would point at a microtask or a Playwright event handler, not at the test. `src/helpers/callSite.ts` gives them the stack of the
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

The report shows a step at a location Playwright takes from the async stack when the step opens, after an internal
`await`: only `async` functions that are waiting are on it, not plain ones. An unboxed step is shown at the first frame;
a boxed step (`{ box: true }`) at the frame after it, since the first is taken for the helper that opened the step. So a
boxed step is shown at the line that called the helper exactly when one `async` POMWright frame sits between the caller
and `test.step`:

- **`@step`**: the method is replaced by a wrapper that opens the step. Without `box`, the wrapper is a plain function,
  so the first frame is the caller's. With `box`, it is `async` and awaits the step, so its own frame is the one left
  out. A plain wrapper with `box` would leave out the caller's frame: a method called from a test showed no location,
  and its error lost its stack.
- **The navigation helper**: `goto`, `expectThisPage` and `expectAnotherPage` are `async` and open their boxed steps
  themselves.
- **`SessionStorage`**: its methods are `async` and open their step through one helper, which is not `async` (it would
  be a second frame), and which each method `await`s; `get` writes `return await`, since returning the helper's Promise
  without awaiting it cuts the async stack, and the step shows no location.

`test/step-locations/` checks the result where only the runner can: a spec marks each probed call with
`// LOCATION <id>`, and a reporter fails the run when a step or an error with that id is reported on another line. It
covers `@step` with and without `box`, from a test and from another method, a boxed step that throws, `goto` and
`set`. It runs without a browser, from `test/playwright.steps.config.ts`, which `pack-test.sh` runs after the harness,
so a `--reporter` given to the harness cannot switch it off; CI runs it at the Playwright pin and at the latest 1.x.
The unit tests in `src/helpers/stepLocations.test.ts` check the option and the titles.

## Alternatives weighed

- **Dropping stack frames by file name.** An earlier version of these helpers dropped every frame of a file named like
  POMWright's own, so a consumer's `pageObject.ts` or `sessionStorage.ts` lost its frame and the report pointed at the
  caller's caller.
- **A step `location` computed from the call site.** `{ box: true }` gives the same report location without parsing a
  stack, and keeps the steps inside the helper's step.
