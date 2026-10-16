---
"pomwright": patch
---

### Fixes

- The steps of the navigation helper (`LoginPage: Navigate to this Page`, `LoginPage: Expect this Page`, …) and of
  `SessionStorage` (`Auth.SessionStorage.set:`, …) are reported at the line that called them, in the HTML report and
  the trace, as `@step` rows are: they are boxed steps now. They showed a line in POMWright's bundle, and the session
  storage steps no location at all. A failure inside them was, and is, reported at the test's line.
