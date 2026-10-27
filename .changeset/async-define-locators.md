---
"pomwright": patch
---

A page object whose `defineLocators()` returns a Promise, as an `async` one does, fails with a labelled error saying it must register synchronously; before, it was verified before the rest of its definition ran, and an error after its first `await` escaped unlabelled. Move awaited work into the fixture and pass the result to the constructor.
