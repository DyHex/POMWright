---
"pomwright": patch
---

`@step` on a method that returns a plain value now throws at run time too (from JavaScript), with the compile error's message, `@step decorates methods that return a Promise: make the method async`; before, the method silently returned a Promise.
