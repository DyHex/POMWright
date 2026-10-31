---
"pomwright": patch
---

Bare `@step` compiles with `experimentalDecorators: true`, as `@step()` already did and as the docs promised. Before, it
failed with TS1241 and TS1270, although it worked at runtime. A method that does not return a Promise still gets the
readable error, `@step decorates methods that return a Promise: make the method async`, in both decorator modes.
