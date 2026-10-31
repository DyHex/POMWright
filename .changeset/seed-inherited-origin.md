---
"pomwright": patch
---

`seed` on a popup at `about:blank` that inherited the seeded origin writes at once, as `set` does there; a later `set` is no longer overwritten when the popup navigates to the origin, and Firefox no longer fails the test. When a seed is not applied because the browser counted the arrival as a return, the message now says why: `… (navigation.activation.from is set): the document before it was already on the origin, as after a failed navigation to it`.
