---
"pomwright": patch
---

`@step` compiles on generic `async` methods, with standard decorators and with `experimentalDecorators`, and the method keeps its type parameters; before, TypeScript refused them, and under `experimentalDecorators` asked to make the already `async` method `async`. A generic method that does not return a Promise is still refused with `@step decorates methods that return a Promise: make the method async`.
