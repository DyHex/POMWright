---
"pomwright": patch
---

`@step({ box: true })` reports the step, and an error thrown inside it, at the line that called the method, as the docs
said. Before, a boxed step called from a test had no location and its error lost every stack frame, and one called from
another method was reported one frame too far out. `@step` without `box` was right and is unchanged, and so is how
`@step` is written.
