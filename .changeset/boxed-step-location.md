---
"pomwright": patch
---

`@step({ box: true })` reports the step, and an error thrown inside it, at the line that called the method, as the docs
said. Before, a boxed step called from a test had no location and its error lost every stack frame, and one called from
another method was reported one frame too far out. A boxed step inside another boxed step, a boxed `@step` or
a test's own boxed `test.step`, was reported inside POMWright's bundle; boxed `@step` methods and the navigation and
session storage helpers now pass `test.step` the line that called them as its `location`, so they are reported there
however they are nested. An error in a nested boxed step keeps Playwright's rule: it is reported at the outermost boxed
call. `@step` without `box` was right and is unchanged, and so is how `@step` is written.
