---
"pomwright": patch
---

`step()` with a title or options returns a decorator whose type is exported from `pomwright`, `StepDecorator`. A module can export a preconfigured decorator, such as `export const boxedStep = step({ box: true })`, and still build with `declaration: true`; before, the emit failed with TS4023.
