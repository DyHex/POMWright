---
"pomwright": patch
---

A page object whose `defineLocators()` returns a Promise, as an `async` one does, fails with a labeled error saying it must register synchronously; before, it was verified before the rest of its definition ran, and an error after its first `await` escaped unlabeled. Move awaited work into the fixture and pass the result to the constructor.
