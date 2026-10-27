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
  `boundary`, a function: the class the code constructed (`new.target` in `PageObject`'s constructor), or
  `SessionStorage.prototype.seed`. V8 leaves out that function's frame and every frame above it, so the stack starts in
  the code that called it, whatever its file is named. The stack is only formatted when it is used. Cut at `PageObject`
  itself, the stack would start at the first `super(…)` of the class chain: with a base class the project's page
  objects share, the same line for every page object.
- `atCallSite(error, site)` gives the later error the captured frames, without the frames of POMWright's published
  bundle (`pomwright/dist/index.js` and its ESM entry), so the report's code frame is the consumer's line.

A consumer's file may be named `pageObject.ts` or `sessionStorage.ts`, like POMWright's own sources, so frames are
never filtered by a consumer-side file name; the boundary decides where the stack starts. The harness checks this with
consumer files of those names.

The labelled error keeps the original as `cause`, with its own stack: for a mistake in an `add` chain, POMWright's own
frames, then the `add` line and the lines that called it (a locator module, the module that composed it, the page
object's `defineLocators()`). `test/tests/pageObject/callSite/checkSite.spec.ts` checks the `new` line and these lines
against the packed package.

## Steps at the test's line

The report shows a step at a location Playwright takes from the async stack when the step opens, after an internal
`await`: only `async` functions that are waiting are on it, not plain ones. An unboxed step is shown at the first frame.
A boxed step (`{ box: true }`) is shown at the frame after it, the first being taken for the helper that opened the
step, but only when no ancestor step is boxed: inside a boxed step, Playwright leaves out no frame. So no fixed number of
POMWright frames is right both at the top level and inside a boxed step, and a boxed step inside a boxed `@step` or a
test's own boxed `test.step` was shown inside POMWright's bundle.

POMWright therefore passes every boxed step a `location`, which Playwright uses whatever the ancestors are:
`callerLocation(boundary)` in `src/helpers/callSite.ts` captures the stack cut at the method the consumer called, as
`captureCallSite` does, and takes its first frame that names a file (a `file://` URL becomes a path; frames such as
`native` or `<anonymous>` are skipped). A `location` the caller passes to `@step` wins.

A boxed step's error keeps Playwright's own rule: at the top level its stack is the async stack after the first frame,
and inside a boxed step it is the outermost boxed step's. So exactly one `async` POMWright frame still sits between the
caller and `test.step`:

- **`@step`**: the method is replaced by a wrapper that opens the step. Without `box`, the wrapper is a plain function,
  so the first frame is the caller's. With `box`, it is `async`, awaits the step, and passes the location cut at
  itself; its own frame is the one an error's stack leaves out.
- **The navigation helper**: `goto`, `expectThisPage` and `expectAnotherPage` are `async`, take the location cut at
  themselves before their first `await`, and open their boxed steps themselves.
- **`SessionStorage`**: its methods are `async`, take the location cut at themselves (`seed` from the call site it
  captures anyway), and open their step through one helper, which is not `async` (it would be a second frame), and
  which each method `await`s; `get` writes `return await`, since returning the helper's Promise without awaiting it
  cuts the async stack.

`test/step-locations/` checks the result where only the runner can: a spec marks each probed call with
`// LOCATION <id>`, and a reporter fails the run when a step or an error with that id is reported on another line, or
when a marked line is never reported. It covers `@step` with and without `box`, from a test and from another method, a
boxed step that throws, `goto` and `set`, and the same boxed steps inside a boxed `@step` and inside a test's own boxed
step, with an error in a nested boxed step reported at the outermost boxed call. It runs without a browser, from `test/playwright.steps.config.ts`, which `pack-test.sh` runs after the harness,
so a `--reporter` given to the harness cannot switch it off; CI runs it at the Playwright pin and at the latest 1.x.
The unit tests in `src/helpers/stepLocations.test.ts` check the option and the titles.

## Alternatives weighed

- **Dropping stack frames by file name.** An earlier version of these helpers dropped every frame of a file named like
  POMWright's own, so a consumer's `pageObject.ts` or `sessionStorage.ts` lost its frame and the report pointed at the
  caller's caller.
- **`{ box: true }` alone, without a `location`.** It gives the right line only when no ancestor step is boxed;
  inside one, Playwright leaves out no frame and the step is shown inside POMWright's bundle. A computed `location`
  costs one captured stack per boxed call, cut at a boundary and never filtered by file name.
- **A budget of POMWright frames above the consumer's line.** V8 keeps 10 frames by default, so internal frames could
  push a consumer's line out of a stack. Playwright's runner raises `Error.stackTraceLimit` to 200 whenever it loads a
  config or a test file, so they cannot there; a fixed count would fail on harmless refactors, and the spec's
  assertions on the consumer's lines fail if those lines go missing.
- **A boxed method whose Promise a helper returns without `await`.** Playwright shows such a step at no line; with the
  computed `location` it is shown at the helper's line, the frame below the method. Accepted: it is the line that
  called the method.
